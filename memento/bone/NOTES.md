# Bone library — Memento notes

## Files

- `price-*.js`, `grand-total.js`, `net-payable.js` — JavaScript field scripts
  (real-time on). `node test.js` checks them.
- `report-button.js` — the `Report` Button field. Opens
  the hosted `docs/meat.html#…` in the browser with only the meats bought, as
  `code~weight~rate~price` items.
- `../../docs/meat.html` — the report page, served by GitHub Pages at
  https://smtalham.github.io/ghar-hisaab/meat.html: renders the purchase from the
  link fragment (never sent to the server), "Share image" (PNG via the share
  sheet) and "Save PDF" (print, A5).
- `node preview.js` — runs the button script on sample entries, opens the
  page in headless Chrome as a phone, and writes the screen, the share image
  and the PDF to `preview/`.

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
  attribute selectors were unreliable. So the Price scripts return empty
  (`null`) instead of 0, and the CSS hides `.v` on each unused row and its
  cells.
