# Sabzi (vegetables) library — Memento notes

One entry per vegetable; the library's table view is the shopping sheet.
Fill **Price** (the amount paid for that item, not a rate per kg) for what
was bought, optionally **Qty** and **Unit**, then run the actions.

## Files

- `vegetables.csv` — import to create the `Sabzi` library: Order, Name
  (Urdu), English, Group (سبزی / پھل), Unit, Price, Qty.
- `report-action.js` — library action **Report**: opens
  <https://talha131.github.io/hisab-kitab/veg.html> with every priced row, in
  Order. Vegetables first, then fruit; a کل سبزی subtotal appears when both
  were bought. Group is typed by hand, so anything starting with پ counts as
  fruit and everything else as a vegetable.
- `settle-action.js` — library action **Settle**: copies priced rows into the
  `Vegetable History` library with today's date (Group saved as پھل or
  سبزی), then clears Price and Qty.
  It clears nothing if the history library can't be reached, and stops at the
  first row it fails to save.
- `node test.js` — tests both actions against a stubbed Memento API.
- `node preview.js` — renders sample reports into `preview/`.

## Setup in Memento (as done on the phone, Oct 2026)

1. Add Library → Import from CSV → `vegetables.csv`. On the import screen:
   name the library `Sabzi`, set Name's "Display as" to Entry name and
   Order's to Regular field, Price → Integer, Qty → Real number. The import
   offers no dropdown types, so Group and Unit come in as Text.
2. Edit library → Unit → Convert data type → Single-choice list. The
   choices (کلو, پاؤ, عدد, گڈی, درجن) are created from the existing values,
   but only show up after the library is saved; delete the "Unit Old" backup
   once the values check out. Group stays Text: it never changes per
   vegetable, and converting it lost its values.
3. Price, Qty, Unit → Direct edit: card entry and table entries. Library
   menu → View: Table, Sort: by Order ASC.
4. New library `Vegetable History`: Date (Date), Name (Text), English, Group,
   Unit (Text), Price (Integer), Qty (Real number). Date and Name are the
   entry name.
5. Sabzi → Automations → Scripts → + Action (place: Library) for Report and
   Settle. Paste the scripts from GitHub ("Copy" under the code's ⋯ menu,
   which keeps the Urdu intact). Permissions for scripts → Available
   libraries: only `Vegetable History`.

The library actions run from the ▶ button in Sabzi's toolbar.
