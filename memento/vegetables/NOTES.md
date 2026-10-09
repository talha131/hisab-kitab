# Vegetables library — Memento notes

One entry per vegetable; the library's table view is the shopping sheet.
Fill **Price** (what the vendor says) for what was bought, optionally **Qty**
and **Unit**, then run the actions.

## Files

- `vegetables.csv` — import to create the `Vegetables` library: Order, Name
  (Urdu), English, Group (سبزی / پھل), Unit, Price, Qty.
- `report-action.js` — library action **Report**: opens
  <https://talha131.github.io/hisab-kitab/veg.html> with every priced row, in
  Order. Vegetables first with a کل سبزی subtotal, then fruit.
- `settle-action.js` — library action **Settle**: copies priced rows into the
  `Vegetable History` library with today's date, then clears Price and Qty.
  It clears nothing if the history library can't be reached, and stops at the
  first row it fails to save.
- `node test.js` — tests both actions against a stubbed Memento API.
- `node preview.js` — renders sample reports into `preview/`.

## Setup in Memento

1. Import `vegetables.csv` as a new library named `Vegetables`. Field types:
   Order → Integer, Name → Text (entry title), English → Text,
   Group → Single choice (سبزی, پھل), Unit → Single choice (کلو, پاؤ, عدد,
   گڈی, درجن), Price → Integer, Qty → Real number. Turn on direct edit for
   Price, Qty and Unit, and sort the table view by Order.
2. Create a library `Vegetable History` with fields Date (Date),
   Name, English, Group, Unit (Text), Price (Integer), Qty (Real number).
3. In `Vegetables`, add two library actions with the scripts above. Give the
   Settle script permission to access the `Vegetable History` library.
