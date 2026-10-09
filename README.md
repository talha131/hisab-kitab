# Hisab-kitab · حساب کتاب · हिसाब-किताब

Household expense reports for purchases recorded in the
[Memento Database](https://mementodatabase.com/) Android app.

A **Report** button in Memento opens a purchase as a styled report card at
<https://talha131.github.io/hisab-kitab/meat.html>, ready to share as an image
or save as a PDF. The purchase travels in the link after `#`, so it is never
sent to the server.

## Layout

- `docs/` — the report page, served by GitHub Pages.
- `memento/bone/` — field and button scripts for the meat library, with
  tests (`node test.js`), a preview tool (`node preview.js`) and
  [notes](memento/bone/NOTES.md).
