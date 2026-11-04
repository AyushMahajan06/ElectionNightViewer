/* feed-worker.js — NYT results feeds: fetch + JSON.parse + normalize.
   Loaded twice by index.html: as a classic <script> (gives the page FEED.normalizeOffice / FEED.fetchFeed for DEMO mode and
   for the in-page fallback) and as a Web Worker (new Worker('feed-worker.js')) so the ~7 MB House file is parsed and
   normalized off the main thread. Single source of truth for the per-office normalization. */
(function(root){
'use strict';
const FEED = {};

FEED.withTimeout = ms => { try{ return AbortSignal.timeout(ms); }catch(e){ const c = new AbortController(); setTimeout(()=>c.abort(), ms); return c.signal; } };

/* Conditional fetch of one feed file. `st` persists per file: {etag, updatedAt, noCond, parseMs}.
   Returns {status:'unchanged'} on 304 or when resultsMeta.resultsUpdatedAt is the same as last time, else {status:'changed', json}.
   If-None-Match is not a CORS-safelisted request header (it triggers a preflight): it is only sent once an ETag has been read
   from a response, and if a conditional request fails outright the file is re-fetched without it and conditional requests
   are turned off for that file for good. */
FEED.fetchFeed = async function(url, st, timeoutMs){
  const opts = h => { const o = {cache:'no-cache', signal: FEED.withTimeout(timeoutMs||20000)}; if(h) o.headers = h; return o; };
  let r = null;
  if(st.etag && !st.noCond){
    try{ r = await fetch(url, opts({'If-None-Match': st.etag})); }
    catch(e){ if(e && e.name==='AbortError') throw e; st.noCond = true; r = null; }
  }
  if(!r) r = await fetch(url, opts());
  if(r.status===304) return {status:'unchanged'};
  if(!r.ok) throw new Error(r.status);
  const t0 = (typeof performance!=='undefined' && performance.now) ? performance.now() : 0;
  const j = await r.json();
  st.parseMs = t0 ? performance.now()-t0 : 0;
  let et = null; try{ et = r.headers.get('etag'); }catch(e){}
  st.etag = et || null;
  const ua = (j && j.resultsMeta && j.resultsMeta.resultsUpdatedAt) || null;
  if(ua && st.updatedAt===ua) return {status:'unchanged'};
  st.updatedAt = ua;
  return {status:'changed', json:j};
};

const party = c => { const p = (c?.party_caucus || c?.party?.nyt_id || 'OTH'); return p==='DEM'?'D':p==='GOP'?'R':'O'; };
const PORD = {D:0,R:1,O:2};

/* Normalize one office's raw feed into the page's race records. env = {NAMES, callSeenAt} (callSeenAt persists the first
   time a winner was seen for races the feed gives no winner_accepted_at for). */
FEED.normalizeOffice = function(office, j, env){
  const out = []; if(!j) return out;
  const NAMES = env.NAMES || {}, callSeenAt = env.callSeenAt || {};
  for (const r of j.races||[]){
    const ru = r.top_reporting_unit; if(!ru || !r.candidate_metadata) continue;
    const st = ru.state_postal; if(!st || st==='US') continue;
    const meta = r.candidate_metadata;
    const total = ru.total_votes||0;
    const cands = (ru.candidates||[]).map(c=>{ const m = meta[c.nyt_id]||{}; return {
      id:c.nyt_id, name: m.last_name||'?', first:m.first_name||'', party: party(m), inc: !!m.incumbent, writein: /writein/i.test(c.nyt_id)||/write-?in/i.test(m.last_name||''),
      votes: c.votes?.total||0, pct: total? (c.votes?.total||0)/total*100 : 0, leader: !!c.leader };})
      .filter(c=>c.id!=='total_writeins').sort((a,b)=>b.votes-a.votes || (a.writein-b.writein) || (PORD[a.party]-PORD[b.party]) || (b.inc-a.inc));
    { const seenLast = {}; for (const c of cands) seenLast[c.name] = (seenLast[c.name]||0)+1; for (const c of cands) if(seenLast[c.name]>1 && c.first){ c.name = c.first+' '+c.name; c.first=''; } }
    const won = (r.outcome?.won||[]);
    const winner = won.length ? cands.find(c=>c.id===won[0]) : null;
    const seat = r.seat_number ? String(r.seat_number) : null;
    const district = office==='H' ? (seat || (r.nyt_id.split('-')[3])) : null;
    out.push({
      id: r.nyt_id, office, st, district, label: office==='H' ? `${st}-${district}` : `${NAMES[st]||st}`,
      officeName: office==='S'?'Senate':office==='G'?'Governor':'House',
      special: /-S_W-/.test(r.nyt_id) || /special/i.test(r.seat_description||''),
      rating: r.rating||r.general_rating||null, status: r.race_call_status, called: !!winner, winner, gained: r.outcome?.gained||null,
      calledAt: r.outcome?.winner_accepted_at?.[0] || (winner? (callSeenAt[r.nyt_id] ||= new Date().toISOString()) : null),
      eevp: ru.eevp||0, total, expected: ru.total_expected_vote||0, cands, prev: r.in_party_control, updated: r.updated_at,
      threshold: (t=>t? (t<=1? t*100 : t) : ((st==='GA' && office!=='H') || (st==='LA' && office==='H')? 50 : null))(r.win_threshold),
      runoffDate: st==='GA'? 'Dec 1' : st==='LA'? 'Dec 12' : null, runoff: r.race_call_status==='runoff' || (r.outcome?.advanced_to_runoff||[]).length>0,
      hist: (()=>{ const h = ru.historical_comparison_race_data||{}; const k = Object.keys(h)[0]; if(!k) return null; const m = ru.historical_comparison_race_meta?.[k]; return {label: m?.label||'2024', margin: h[k].margin}; })()
    });
  }
  return out;
};

/* The slices of a raw feed the page reads besides the races (control(), poll closing times, change detection). */
FEED.meta = j => ({ partyControlData: j.partyControlData||null, pollClosingTimes: j.pollClosingTimes||[], resultsMeta: j.resultsMeta||null, slim:true });

root.FEED = FEED;

/* ---- Worker side ---- */
if (typeof WorkerGlobalScope!=='undefined' && typeof root.postMessage==='function' && root instanceof WorkerGlobalScope){
  let NAMES = {}; const callSeenAt = {}; const state = {};
  root.onmessage = async e => {
    const m = e.data||{};
    if(m.type==='init'){ NAMES = m.NAMES||{}; return; }
    if(m.type!=='fetch') return;
    const st = state[m.office] || (state[m.office] = {});
    try{
      const r = await FEED.fetchFeed(m.url, st, m.timeout||20000);
      if(r.status==='unchanged'){ root.postMessage({type:'result', id:m.id, office:m.office, ok:true, changed:false}); return; }
      const t0 = performance.now();
      const races = FEED.normalizeOffice(m.office, r.json, {NAMES, callSeenAt});
      root.postMessage({type:'result', id:m.id, office:m.office, ok:true, changed:true, races, meta: FEED.meta(r.json), workerMs: st.parseMs + (performance.now()-t0)});
    }catch(err){ root.postMessage({type:'result', id:m.id, office:m.office, ok:false, error: String(err && (err.message||err.name) || err)}); }
  };
}
})(typeof self!=='undefined' ? self : this);
