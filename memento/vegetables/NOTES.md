# Vegetables 🥕🍆 library — Memento notes

The library was called `Sabzi` when it was set up; the name in Memento can
change freely. `Vegetable History` must keep its exact name: Settle looks it
up by name.

One entry per vegetable; the library's table view is the shopping sheet.
Fill **Price** (the amount paid for that item, not a rate per kg) for what
was bought, optionally **Qty** and **Unit**, then run the actions.

## Files

- `vegetables.csv` — import to create the `Vegetables 🥕🍆` library: Order, Name
  (Urdu), English, Group (سبزی / پھل), Unit, Price, Qty.
- `report-action.js` — library action **Report**: opens
  <https://talha131.github.io/hisab-kitab/veg.html> with every priced row, in
  Order. Vegetables first, then fruit; a کل سبزی subtotal appears when both
  were bought. Group is typed by hand, so anything starting with پ counts as
  fruit and everything else as a vegetable.
- `settle-action.js` — library action **Settle**: first asks "Settle? Save N
  items to Vegetable History and clear their prices?" (Cancel changes
  nothing), then copies priced rows into the `Vegetable History` library with
  today's date (Group saved as پھل or سبزی) and clears Price and Qty.
  With nothing priced, or if the history library can't be reached, it only
  shows a message; it stops at the first row it fails to save.
- `history-report-action.js` — **Report** action for `Vegetable History`:
  re-opens the same report page for a past (paid) shopping day, dated with
  the purchase day. Added as an entry action it reports the day of the opened
  entry; added as a library action it reports the most recent day. It assumes
  Memento lists entries newest first, so items appear in the order Settle
  saved them (the page still puts vegetables before fruit).
- `node test.js` — tests the actions against a stubbed Memento API.
- `node preview.js` — renders sample reports into `preview/`.

## Setup in Memento (as done on the phone, Oct 2026)

1. Add Library → Import from CSV → `vegetables.csv`. On the import screen:
   name the library (`Vegetables 🥕🍆`), set Name's "Display as" to Entry name and
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
   entry name. To see each shopping day collected with its total: library
   menu → Group: by Date; Edit library → Aggregation: Sum of Price.
5. Vegetables 🥕🍆 → Automations → Scripts → + Action (place: Library) for Report and
   Settle. Paste the scripts from GitHub ("Copy" under the code's ⋯ menu,
   which keeps the Urdu intact). Permissions for scripts → Available
   libraries: only `Vegetable History`.
6. Vegetable History → Automations → Scripts → + Action, Place of action:
   Entry, name it `Report`, paste `history-report-action.js`. It needs no
   extra permissions. Optionally add the same script again with Place of
   action: Library, for a one-tap report of the most recent day.

To re-send a past report: open Vegetable History, open any item of that day,
tap the action button (▶ / ⋮) → Report.

The library actions run from the ▶ button in the library's toolbar. Both
libraries are in Memento's cloud, so family members can be invited to share
them.
