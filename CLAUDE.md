# Hisab-kitab — notes for Claude

Household expense reports. Purchases are recorded in the Memento Database
Android app; a Memento script opens a report page (GitHub Pages) that renders
the purchase as a card to share or copy as an image, or save as a PDF. Repo:
`talha131/hisab-kitab`, default branch `master`.

Read `MEMORY.md` first: the state on the phone, why things are built this
way, how work was done, and open ideas.

@MEMORY.md

## Layout

- `docs/` — the report pages, served by GitHub Pages from `master` `/docs`:
  `meat.html`, `veg.html`, shared `report.css` and `report.js`.
- `memento/bone/` — meat library (`Beef Meat 🍖` in Memento): field scripts
  and the Report button script. See its `NOTES.md`.
- `memento/vegetables/` — vegetables library (`Vegetables 🥕🍆` in Memento)
  and `Vegetable History`: CSV import, Report and Settle library actions, and
  a Report action on Vegetable History for past days. See
  its `NOTES.md` for the exact setup steps.
- The folder names predate the library renames (they were `Bone` and
  `Sabzi`). Library names are free to change, except `Vegetable History`:
  Settle looks it up by that exact name. The libraries are in Memento's cloud,
  so family members can be invited to share them.
- `memento/lib/headless.js` — shared preview code (local server + headless
  Chrome emulating a phone).
- `tests/report-page.test.js` — tests for the helpers in `docs/report.js`.

## Test and preview

- `node test.js` in `memento/bone` and `memento/vegetables`; runs the Memento
  scripts against a stubbed Memento API (`field`, `entry`, `lib`,
  `libByName`, `intent`, `message`).
- `node tests/report-page.test.js` from the repo root.
- `node preview.js` in each library folder writes `preview/` (gitignored):
  `<name>.png` (phone view), `<name>-share.png` (what Share image and Copy
  image produce, rendered by the page's own `Report.renderImage`) and
  `<name>.pdf` (Save PDF, A5). It also taps Copy image and fails unless a PNG
  lands on the clipboard. Look at the PNGs after any page change; Urdu
  Nastaliq descenders easily collide with text below them. Needs Google Chrome
  at `/Applications/Google Chrome.app` (macOS) and Node 22+ (built-in
  `WebSocket`).

## Adding a library

1. `docs/<x>.html`: load `report.css` and `report.js`, parse the fragment, and
   build rows with `Report.itemRow` / `Report.sumRow`; wire buttons with
   `Report.setupActions` and render with `Report.start`. Treat every value
   from the fragment as untrusted text.
2. `memento/<x>/`: the Memento script (ES5) that opens
   `https://talha131.github.io/hisab-kitab/<x>.html#…` with the data after
   `#`, via `intent("android.intent.action.VIEW")`.
3. `memento/<x>/test.js`: run the script with `vm` against stubbed Memento
   globals and check the link it builds.
4. `memento/<x>/preview.js`: build sample links and call
   `require("../lib/headless").preview({ name: "<x>.html#…" }, outDir)`.
5. `memento/<x>/NOTES.md`: exact phone setup (field names and types, scripts,
   permissions). List the library in README and in Layout above.

## Deploy

Push to `master`; Pages rebuilds in about a minute. Check
`gh api repos/talha131/hisab-kitab/pages/builds/latest` shows `built` for the
pushed commit, then confirm each live `docs/` file matches the local one
(`curl -s https://talha131.github.io/hisab-kitab/<file> | cmp - docs/<file>`).

## Memento constraints (learned the hard way)

- PDF export templates are unreliable: styling vanished between near-identical
  exports and zero rows could not be hidden. Don't go back to them.
- A JavaScript field with HTML display renders only basic text formatting.
- Reports therefore open in Chrome. The purchase travels in the URL fragment
  (after `#`), which is never sent to the server; the pages treat it as
  untrusted and render it as text only.
- Scripts are pasted on the phone from GitHub (file page → code ⋯ menu →
  Copy), which keeps Urdu string literals intact. `adb shell input text`
  cannot type Urdu. When updating a script, open the file at its commit
  (`…/blob/<sha>/path`): Chrome may show a cached copy of `…/blob/master/…`
  and paste the old version. Check the pasted script before saving.
- When driving the phone over adb, tap menu items by their text (uiautomator
  dump), not by remembered coordinates; menu positions shift.

## Conventions

- One commit per logical change; refactors, behavior changes and tests go in
  separate commits. Let git GPG-sign. Push after committing.
- The user's shell is fish.
- README stays short and in English.
