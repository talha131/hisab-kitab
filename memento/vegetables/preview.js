// Runs report-action.js on sample tables, and history-report-action.js on a
// sample Vegetable History, and previews the vegetable report page for each
// link they build (see ../lib/headless.js for what gets written).
// Usage: node preview.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { preview } = require("../lib/headless");

const row = (Order, Name, English, Group, Unit, Price, Qty) => ({ Order, Name, English, Group, Unit, Price, Qty });
const scenarios = {
  // The 2026-10-08 purchase from the original hand-made report.
  "with-fruit": [
    row(10, "ہری پیاز", "Spring Onion", "سبزی", "پاؤ", 100, 1),
    row(13, "بند گوبھی", "Cabbage", "سبزی", "عدد", 100, 1),
    row(36, "بھٹے", "Corn", "سبزی", "عدد", 100, 3),
    row(4, "ادرک", "Ginger", "سبزی", "کلو", 600, 1),
    row(3, "ٹماٹر", "Tomato", "سبزی", "کلو", 400, 2),
    row(1, "آلو", "Potato", "سبزی", "کلو", 700, 5),
    row(2, "پیاز", "Onion", "سبزی", "کلو", 800, 4),
    row(5, "لہسن", "Garlic", "سبزی", "کلو", 1500, 3),
    row(11, "کڑی پتے", "Curry Leaves", "سبزی", "گڈی", 50, 4),
    row(12, "شملہ مرچ", "Capsicum", "سبزی", "عدد", 150, 3),
    row(37, "کچا پپیتا", "Raw Papaya", "سبزی", "عدد", 50, 1),
    row(18, "چقندر", "Beetroot", "سبزی", "عدد", 100, 3),
    row(26, "میٹھا کدو", "Pumpkin", "سبزی", "کلو", 150, 1),
    row(35, "آئس برگ", "Iceberg Lettuce", "سبزی", "عدد", 150, 1),
    row(24, "ٹنڈے", "Round Gourd", "سبزی", "کلو", 180, 0.5),
    row(45, "انار", "Pomegranate", "پھل", "کلو", 600, null),
    row(46, "پپیتا", "Papaya", "پھل", "عدد", 300, null),
  ],
  // Vegetables only: no subtotal row.
  "vegetables-only": [
    row(1, "آلو", "Potato", "سبزی", "کلو", 150, 2),
    row(22, "لوکی", "Bottle Gourd", "سبزی", "کلو", 80, 0.5),
    row(23, "توری", "Ridge Gourd", "سبزی", "کلو", 80, null),
  ],
};

// `current` makes it an entry action (the opened entry); omit it for library actions.
function actionHash(rows, file = "report-action.js", current = undefined) {
  const code = fs.readFileSync(path.join(__dirname, file), "utf8");
  const entries = rows.map((values) => ({ field: (n) => (n in values ? values[n] : null) }));
  let url;
  const context = {
    lib: () => ({ entries: () => entries }),
    intent: () => ({ data: (u) => { url = u; }, send: () => {} }),
    message: () => {},
    encodeURIComponent, JSON, Date,
  };
  if (current !== undefined) context.entry = () => entries[current];
  vm.runInNewContext(code, context);
  return url.split("#")[1];
}

const pages = Object.fromEntries(Object.entries(scenarios).map(([name, rows]) => [name, "veg.html#" + actionHash(rows)]));

// The same purchase as it lists in Vegetable History on the phone (no Order,
// table order), re-opened from one of its entries a day later.
const history = scenarios["with-fruit"].slice().sort((a, b) => a.Order - b.Order).map(({ Order, ...rest }) =>
  ({ ...rest, Date: new Date(2026, 9, 8, 18, 30) }));
pages["history"] = "veg.html#" + actionHash(history, "history-report-action.js", 0);
preview(pages, path.join(__dirname, "preview")).catch((e) => { console.error(e); process.exit(1); });
