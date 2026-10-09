# Hisab-kitab · حساب کتاب · हिसाब-किताब

Household expense reports for purchases recorded in the
[Memento Database](https://mementodatabase.com/) Android app.

A **Report** button or action in Memento opens the purchase as a styled
report card, ready to share or copy as an image, or save as a PDF:
[meat](https://talha131.github.io/hisab-kitab/meat.html) and
[vegetables](https://talha131.github.io/hisab-kitab/veg.html). The purchase
travels in the link after `#`, so it is never sent to the server.

## Layout

- `docs/` — the report pages, served by GitHub Pages.
- `memento/bone/` — meat library (`Beef Meat 🍖`): field and button scripts
  ([notes](memento/bone/NOTES.md)).
- `memento/vegetables/` — vegetables library (`Vegetables 🥕🍆`) and
  `Vegetable History`: CSV and action scripts
  ([notes](memento/vegetables/NOTES.md)).
- `memento/lib/` — shared preview code.
- `tools/phone/` — adb helpers for setting up the phone.

Each library folder has tests (`node test.js`) and a preview tool
(`node preview.js`); `node tests/report-page.test.js` tests the pages' helpers.
Pushing to `master` deploys; Pages serves `docs/` (see
[CLAUDE.md](CLAUDE.md)).
