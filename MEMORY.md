# Project memory

What a fresh session needs to resume: the state of things outside the repo
(the phone), why things are the way they are, the user's preferences, and
open ideas. Facts below were true on 2026-10-09; check before relying on them.
This repo is public: keep personal details (names, numbers, email) out.

## Goal

The user buys groceries regularly and sends each vendor a report to pay
against. Three recurring payees: vegetables, meat, and a third person who is
sometimes paid in advance (a running ledger: total spent, paid, balance; not
built yet). Family members enter purchases on their phones. Reports must look
good as a phone screenshot, mostly in Urdu, with colors and readable rows.
Once paid, old lists are kept, not deleted.

The project started as a Google Sheets + Apps Script idea (hence the local
folder name) and moved to the Memento Database Android app plus a static
report page.

## State on the phone (Memento, synced to Memento's cloud)

- **Beef Meat 🍖** (repo: `memento/bone/`): one entry per purchase. Date,
  Grand Total, Discount, Net Payable, Paid; per meat: Weight (Qty for
  Trotters), Rate, Manual Price, Price (JavaScript, real time). Every
  `memento/bone/*.js` field script is installed as of commit 1be0364, with
  each line rounded to whole rupees. Report is a Button field running
  `report-button.js`.
- **Vegetables 🥕🍆** (repo: `memento/vegetables/`, formerly "Sabzi"): one
  entry per vegetable (63 imported from `vegetables.csv`), table view sorted
  by Order. The user reordered the columns to Name, Price, Qty, Unit. Library
  actions: Report and Settle (Settle asks for confirmation).
- **Vegetable History**: one entry per settled item. The list is grouped by
  Date with an aggregation "Sum of Price" (prefix "Rs "), so each shopping day
  shows its total. An Entry action "Report" (entry view card, ▶ top right of
  an opened entry) regenerates that day's report. The name must stay exactly
  "Vegetable History": Settle looks it up by name and has script permission
  for that library only.
- An older, unrelated "Vegetables" library existed before and was left alone;
  the user has since tidied library names themselves.

## Why it is built this way

- **Report pages, not Memento's PDF templates.** Template styling vanished
  between near-identical exports (only a debug probe showed CSS being cut
  off) and zero rows could not be hidden. Abandoned after many attempts.
- **Not an in-Memento HTML field.** JavaScript fields with HTML display only
  render basic text formatting: no tables, backgrounds or borders.
- **Data in the URL fragment.** Memento scripts open
  `talha131.github.io/hisab-kitab/<page>.html#…`; the fragment never reaches
  the server, so nothing is stored or uploaded. Pages treat it as untrusted.
- **Vegetables as a table of entries** (one row per vegetable) because the
  user wanted a spreadsheet-like list of all vegetables with a price cell in
  front of each; Settle archives and clears it after paying.
- **Meat as fixed fields per cut** because the user wanted one entry per
  purchase with every cut on the form, and a live running total while typing
  (JavaScript fields with "real time" on). Manual Price overrides
  weight × rate when the butcher only gives a total.
- **Whole-rupee rounding per meat line** everywhere, so Memento's totals and
  the report always agree (0.25 kg × 1850 used to differ by Rs 1).
- **Group starting with پ counts as fruit**: Group is typed by hand, and
  stray spaces or look-alike Arabic letters used to misfile fruit.

## How work was done (and what to repeat)

- Code changes: tests first-class (`node test.js` per library,
  `node tests/report-page.test.js`), previews in headless Chrome
  (`node preview.js`), deploy by pushing `master` and comparing live files.
- The user often asks for subagents; parallel subagents worked well in
  separate git worktrees with non-overlapping files, merged afterwards.
- Phone work over adb with `tools/phone/ph.sh` (see its header). USB
  debugging must be authorized on the phone (`adb devices` shows `device`).
  While working, `adb shell svc power stayon usb` keeps the screen on; set it
  back with `svc power stayon false` afterwards.
- Scripts reach the phone by copying from GitHub (file page → ⋯ → Copy) and
  pasting into Memento. Pin the commit in the URL when updating, and verify
  the pasted text before saving (`ph.sh fieldscript` does both checks).
- Ask before deleting anything on the phone, and test actions with a
  throwaway value that is removed afterwards (e.g. a price of 1, then Cancel).

## Mistakes worth not repeating

- Tapping menu items by remembered coordinates hit "Delete" once (harmless,
  during an import setup). Always tap by text.
- Assumed Memento's `entries()` order instead of checking it; the history
  report came out reversed. Verify ordering on the device.
- Chrome served a cached GitHub page and the old script got pasted.
- A Vivo floating "Easy Touch" ball sits at the right edge mid-screen and can
  swallow taps on ⋮ buttons there.
- Long Memento commands exceed the 2-minute tool timeout: run them in the
  background.

## Open ideas (not built)

- The third payee: advance/balance ledger report (total spent, paid, balance).
- WhatsApp: a link can open a vendor's chat with text but cannot attach an
  image. Options discussed: keep Share image (Android shows recent chats as
  one-tap targets), add a "send text bill" button, or rely on Copy image and
  paste. The user hasn't chosen; vendor numbers would belong in Memento, not
  in this public repo.
- Quantity cells show the number on the right of an Urdu unit ("کلو 5");
  the user's original sheet had it on the left.
- A small front page at the site root (it currently 404s).
- Report could warn about prices left over from an earlier trip (needs a
  Memento modified-time property, unverified).
