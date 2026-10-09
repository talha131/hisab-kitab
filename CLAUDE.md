# Hisab-kitab — notes for Claude

Household expense reports. Purchases are recorded in the Memento Database
Android app; a Memento script opens a report page (GitHub Pages) that renders
the purchase as a card to share as an image or save as a PDF. Repo:
`talha131/hisab-kitab`, default branch `master`.

## Layout

- `docs/` — the report pages, served by GitHub Pages from `master` `/docs`:
  `meat.html`, `veg.html`, shared `report.css` and `report.js`.
- `memento/bone/` — meat library (`Bone` in Memento): field scripts and the
  Report button script. See its `NOTES.md`.
- `memento/vegetables/` — vegetables library (`Sabzi` in Memento) and
  `Vegetable History`: CSV import, Report and Settle library actions. See its
  `NOTES.md` for the exact setup steps.
- `memento/lib/headless.js` — shared preview code (local server + headless
  Chrome emulating a phone).
- `tests/report-page.test.js` — tests for the helpers in `docs/report.js`.

## Test and preview

- `node test.js` in `memento/bone` and `memento/vegetables`; runs the Memento
  scripts against a stubbed Memento API (`field`, `entry`, `lib`,
  `libByName`, `intent`, `message`).
- `node tests/report-page.test.js` from the repo root.
- `node preview.js` in each library folder writes `preview/` (gitignored):
  `<name>.png` (phone view), `<name>-share.png` (the Share image output) and
  `<name>.pdf` (Save PDF, A5). Look at the PNGs after any page change; Urdu
  Nastaliq descenders easily collide with text below them.

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
  cannot type Urdu.
- When driving the phone over adb, tap menu items by their text (uiautomator
  dump), not by remembered coordinates; menu positions shift.

## Conventions

- One commit per logical change; refactors, behavior changes and tests go in
  separate commits. Let git GPG-sign. Push after committing.
- The user's shell is fish.
- README stays short and in English.
