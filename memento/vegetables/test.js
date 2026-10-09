// Runs the Vegetables library actions against a stubbed Memento API.
// Usage: node test.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

// A fake Vegetables table: one entry per vegetable, values by field name.
function table(rows) {
  return rows.map((values) => ({
    values: { ...values },
    field(name) { return name in this.values ? this.values[name] : null; },
    set(name, v) { this.values[name] = v; },
  }));
}

function run(file, entries, { history = [], historyMissing = false, failCreateAt = -1 } = {}) {
  const code = fs.readFileSync(path.join(__dirname, file), "utf8");
  const opened = [], messages = [];
  const historyLib = historyMissing ? null : {
    create(values) {
      if (history.length === failCreateAt) return null;
      history.push(values);
      return { values };
    },
  };
  vm.runInNewContext(code, {
    lib: () => ({ entries: () => entries }),
    libByName: (name) => (name === "Vegetable History" ? historyLib : null),
    intent: (action) => {
      assert.strictEqual(action, "android.intent.action.VIEW");
      return { data: (u) => opened.push(u), send: () => {} };
    },
    message: (m) => messages.push(m),
    encodeURIComponent, JSON, Date,
  });
  return { opened, messages, history };
}

function linkRows(url) {
  return JSON.parse(new URLSearchParams(url.split("#")[1]).get("v"));
}

// Memento lists entries newest first, not in table order.
const sample = () => table([
  { Order: 45, Name: "انار", English: "Pomegranate", Group: "پھل", Unit: "کلو", Price: 600, Qty: 1 },
  { Order: 3, Name: "ٹماٹر", English: "Tomato", Group: "سبزی", Unit: "کلو", Price: null, Qty: null },
  { Order: 11, Name: "کڑی پتے", English: "Curry Leaves", Group: "سبزی", Unit: "گڈی", Price: 50, Qty: 4 },
  { Order: 1, Name: "آلو", English: "Potato", Group: "سبزی", Unit: "کلو", Price: 700, Qty: 5 },
  { Order: 4, Name: "ادرک", English: "Ginger", Group: "سبزی", Unit: "کلو", Price: 600, Qty: null },
]);

const cases = [
  ["report: bought rows only, in table order, fruit flagged", () => {
    const { opened } = run("report-action.js", sample());
    assert.strictEqual(opened.length, 1);
    assert.ok(opened[0].startsWith("https://talha131.github.io/hisab-kitab/veg.html#d="));
    assert.match(new URLSearchParams(opened[0].split("#")[1]).get("d"), /^\d{4}-\d{2}-\d{2}$/);
    assert.deepStrictEqual(linkRows(opened[0]), [
      ["s", "آلو", "Potato", 700, 5, "کلو"],
      ["s", "ادرک", "Ginger", 600, 0, "کلو"],
      ["s", "کڑی پتے", "Curry Leaves", 50, 4, "گڈی"],
      ["p", "انار", "Pomegranate", 600, 1, "کلو"],
    ]);
  }],
  ["report: nothing priced shows a message and opens nothing", () => {
    const { opened, messages } = run("report-action.js", table([{ Order: 1, Name: "آلو", Price: null }]));
    assert.strictEqual(opened.length, 0);
    assert.deepStrictEqual(messages, ["No prices entered yet"]);
  }],
  ["settle: copies bought rows with today's date and clears price and qty", () => {
    const entries = sample();
    const { history, messages } = run("settle-action.js", entries);
    assert.deepStrictEqual(history.map((h) => [h.Name, h.Group, h.Price, h.Qty, h.Unit]), [
      ["انار", "پھل", 600, 1, "کلو"],
      ["کڑی پتے", "سبزی", 50, 4, "گڈی"],
      ["آلو", "سبزی", 700, 5, "کلو"],
      ["ادرک", "سبزی", 600, null, "کلو"],
    ]);
    assert.ok(history.every((h) => h.Date instanceof Date));
    for (const e of entries) {
      assert.strictEqual(e.values.Price, null, e.values.Name + " price");
      assert.strictEqual(e.values.Qty, null, e.values.Name + " qty");
      assert.ok(e.values.Unit, e.values.Name + " keeps its unit");
    }
    assert.deepStrictEqual(messages, ["Settled 4 items into Vegetable History"]);
  }],
  ["settle: missing history library clears nothing", () => {
    const entries = sample();
    const { messages } = run("settle-action.js", entries, { historyMissing: true });
    assert.strictEqual(entries.find((e) => e.values.Name === "آلو").values.Price, 700);
    assert.match(messages[0], /not found/);
  }],
  ["settle: a failed save stops before clearing that row", () => {
    const entries = sample();
    const { history, messages } = run("settle-action.js", entries, { failCreateAt: 1 });
    assert.strictEqual(history.length, 1);
    assert.strictEqual(entries[0].values.Price, null, "saved row is cleared");
    assert.strictEqual(entries[2].values.Price, 50, "unsaved row keeps its price");
    assert.match(messages[0], /Could not save/);
  }],
  ["report and settle: hand-typed Group variants", () => {
    // Group is a text field, so a trailing space, a look-alike Arabic heh or
    // English must still land in the right section.
    const groups = [["پھل ", "p"], [" پھل", "p"], ["پهل", "p"], ["Fruit", "p"], ["سبزی", "s"], ["", "s"]];
    const rows = () => table(groups.map(([g], i) => ({ Order: i + 1, Name: "x" + i, Group: g, Price: 10 })));
    assert.deepStrictEqual(linkRows(run("report-action.js", rows()).opened[0]).map((r) => r[0]),
      groups.map(([, want]) => want));
    assert.deepStrictEqual(run("settle-action.js", rows()).history.map((h) => h.Group),
      groups.map(([, want]) => (want === "p" ? "پھل" : "سبزی")));
  }],
  ["settle: nothing priced", () => {
    const { history, messages } = run("settle-action.js", table([{ Order: 1, Name: "آلو", Price: null }]));
    assert.strictEqual(history.length, 0);
    assert.deepStrictEqual(messages, ["Nothing to settle"]);
  }],
];

let failed = 0;
for (const [name, test] of cases) {
  try {
    test();
    console.log("ok   " + name);
  } catch (e) {
    failed++;
    console.log("FAIL " + name + ": " + e.message);
  }
}
console.log(failed ? `\n${failed} failed` : `\nall ${cases.length} passed`);
process.exit(failed ? 1 : 0);
