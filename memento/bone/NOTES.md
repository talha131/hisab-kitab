# Beef Meat 🍖 library — Memento notes

The library was called `Bone` when this folder was named; the name in
Memento can change freely, since no script looks it up.

## Files

- `price-*.js`, `grand-total.js`, `net-payable.js` — JavaScript field scripts
  (real-time on). `node test.js` checks them.
- `report-button.js` — the `Report` Button field. Opens the report page with
  only the meats bought; the purchase goes after `#` as
  `d=YYYY-MM-DD&i=<items joined by _>&disc=<rupees>&paid=0|1`, each item
  `code~weight~rate~price`.
- `../../docs/meat.html` — the report page, served by GitHub Pages at
  <https://talha131.github.io/hisab-kitab/meat.html>. Renders the purchase
  from the link fragment (never sent to the server), with "Share image" (PNG
  via the share sheet), "Copy image" (PNG to the clipboard) and "Save PDF"
  (print, A5).
- `node preview.js` — runs the button script on sample entries, opens the
  page in headless Chrome as a phone, and writes the screen, the share image
  and the PDF to `preview/`.

## Setup in Memento

Library `Beef Meat 🍖`, one entry per purchase. The scripts look fields up by these
exact names.

1. `Date` (Date, entry name), `Grand Total` (JavaScript, `grand-total.js`),
   `Discount` (Integer), `Net Payable` (JavaScript, `net-payable.js`),
   `Paid` (Checkbox).
2. For each meat X in Boneless, Bone-in, Fatty Trimming, Soup Bones, Mince,
   Marrow Bones, Liver, Trotters, Tripe: a Subheader with its English and Urdu
   name, then `Weight X` (Real number; `Qty Trotters`, Integer, for
   trotters), `Rate X` (Integer), `Manual Price X` (Real number) and
   `Price X` (JavaScript, `price-<x>.js`). A manual price above 0 wins over
   weight × rate, and each line is rounded to whole rupees.
3. Turn on real-time calculation for every JavaScript field, so totals update
   while typing.
4. `Report` (Button) with `report-button.js` as its script.
5. Paste each script from GitHub (file page → code ⋯ menu → Copy), which
   keeps Urdu text intact.

## Why not a report inside Memento

A JavaScript field with HTML display renders only basic text formatting (no
tables, backgrounds or borders), so the card design is not possible there.

## Why not the PDF export

The PDF template route was abandoned: styling survived some exports and not
others with no reliable cause, and zero rows could not be hidden. Findings, in
case it is revisited:

- Renders with Chromium (`Skia/PDF m153`) but runs no scripts.
- `{{Field Name}}` prints the field's display text: integers without
  decimals, empty for an empty number field, `Paid: Yes` / `Paid: No` for the
  checkbox, `October 8, 2026` for the date. `{{#Field}}`/`{{^Field}}` tags are
  stripped but never hide anything; `{{{triple}}}` does not work.
- The template must contain no HTML comments. Exports whose template began
  with a comment mentioning tags like `<tr>` came out with the whole `<style>`
  block ignored. Keep explanations here instead.
- Keep a `<script>` element in the template. The one export without a script
  also came out unstyled.
- Adding a debug box (CSS `content: attr(class)`) and later a colour probe to
  the working template each broke its styling. Change the template as little
  as possible and re-export after every change.
- Hiding: a class built from an empty field, `class="v{{Weight X}}"`, becomes
  `v` and `.v` matches. A JavaScript field's value does not come through the
  same way (`v{{Price X}}` matched neither `v0` nor `v5400`), and `data-*`
  attribute selectors were unreliable. That is why the Price scripts were
  made to return empty (`null`) instead of 0, and the template's CSS hid `.v`
  on each unused row and its cells.
