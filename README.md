# Election Night 2026 — TV viewer

One file, no build step: `index.html`. It polls the AP results feed that The New York Times publishes
(`static01.nyt.com/elections-assets/…/results-senate|house|governor.json`) every 30 s and Polymarket's
public API (`gamma-api.polymarket.com`) every 90 s. All times are Pacific.

## Run it
- **On this PC / an HDMI-connected screen:** `Open on this PC (fullscreen).bat` (Chrome kiosk; Alt+F4 quits).
- **Preview the night with fake results:** `Preview demo night.bat` (same page with `#demo` in the URL).
- **On a TV with a browser (Android/Google TV, Fire TV Silk, LG/Samsung):** run `Serve to TV.bat`, then open
  `http://<PC-IP>:8000/` in the TV browser and put it full screen.
- **Android TV via ADB** (from this PC, with platform-tools installed):
  ```
  adb pair 192.168.8.152:41961 339735
  adb connect 192.168.8.152:<connect-port shown on the TV's Wireless debugging screen>
  adb shell am start -a android.intent.action.VIEW -d "http://<PC-IP>:8000/"
  ```
  (This needs a browser app on the TV; stock Google TV has none, so sideload Chrome or TV Bro first.)

## What's on screen
- Live headline (what each party still needs), Senate and House balance bars (solid = called, hatched = leading).
- Map cycling Senate → Governors → House every 24 s. Solid = called, hatched = leading, grey = polls closed/open.
- Right panel rotates every 20 s between:
  1. **Races to watch** — closest contests with votes in (toss-ups by poll-closing time before then)
  2. **Odds board** — Polymarket chance of Senate/House control, plus key races with live vote % next to market odds
     (▲▼ shows the odds move since the last refresh)
  3. **Poll closings** — the next closing waves in PT and the marquee races in each
  4. **Flips & upsets** — seats that changed hands, and winners who beat their pre-election rating
  5. **Swing vs. 2024** — current margin compared with the 2024 presidential margin in that state
  Panels with nothing to show yet are skipped automatically.
- Latest-calls ticker, next-poll-closing countdown, clock in PT.

## Fun
Every Democratic call fires one of five animations in rotation, with confetti and a screen shake:
bowling strike (googly-eyed ball), the state launching as a firework rocket, a donkey piñata getting whacked,
a slot machine landing D·D·D (jackpot coins), and a boot kicking a field goal. A burst of calls at once becomes
one combined celebration. Republican calls get a quiet corner toast.

## Keys (handy for testing — none needed on the TV)
`T` random celebration · `1`–`5` a specific one · `P` next panel · `M` next map · add `#demo` to the URL for fake results.
Calls already on screen when the page first loads don't re-trigger (remembered in the browser), so refreshing is safe.

## Data notes
- Results and race calls are AP's, as republished by the NYT; "flip" is AP's seat-change flag.
- Polymarket slugs follow `<state>-senate-election-winner` and `<state>-governor-winner-2026`; races without a market
  simply don't appear on the odds board.
