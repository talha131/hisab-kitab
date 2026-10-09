// Runs the Vegetables 🥕🍆 library actions against a stubbed Memento API.
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

// A fake Memento dialog(): records each dialog shown and taps the button
// labelled `answer` (null leaves it unanswered).
function dialogs(answer) {
  const shown = [];
  const dialog = () => {
    const d = { buttons: {} };
    const api = {
      title(t) { d.title = t; return api; },
      text(t) { d.text = t; return api; },
      positiveButton(label, fn) { d.buttons[label] = fn; return api; },
      negativeButton(label, fn) { d.buttons[label] = fn; return api; },
      show() { shown.push(d); if (answer && d.buttons[answer]) d.buttons[answer](); },
    };
    return api;
  };
  return { dialog, shown };
}

// `current` is the opened entry for entry actions; without it the script runs
// as a library action and entry() is undefined.
function run(file, entries, { history = [], historyMissing = false, failCreateAt = -1, answer = "Settle", current } = {}) {
  const code = fs.readFileSync(path.join(__dirname, file), "utf8");
  const opened = [], messages = [];
  const { dialog, shown } = dialogs(answer);
  const historyLib = historyMissing ? null : {
    create(values) {
      if (history.length === failCreateAt) return null;
      history.push(values);
      return { values };
    },
  };
  const context = {
    lib: () => ({ entries: () => entries }),
    libByName: (name) => (name === "Vegetable History" ? historyLib : null),
    intent: (action) => {
      assert.strictEqual(action, "android.intent.action.VIEW");
      return { data: (u) => opened.push(u), send: () => {} };
    },
    message: (m) => messages.push(m),
    dialog,
    encodeURIComponent, JSON, Date,
  };
  if (current) context.entry = () => current;
  vm.runInNewContext(code, context);
  return { opened, messages, history, dialogs: shown };
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
  ["report: missing Urdu name falls back to English, then ?", () => {
    const { opened } = run("report-action.js", table([
      { Order: 1, Name: "", English: "Iceberg", Group: "سبزی", Price: 150 },
      { Order: 2, Name: null, English: null, Group: "سبزی", Price: 50 },
    ]));
    assert.deepStrictEqual(linkRows(opened[0]).map((r) => [r[1], r[3]]), [["Iceberg", 150], ["?", 50]]);
  }],
  ["settle: nothing priced", () => {
    const { history, messages, dialogs } = run("settle-action.js", table([{ Order: 1, Name: "آلو", Price: null }]));
    assert.strictEqual(history.length, 0);
    assert.deepStrictEqual(messages, ["Nothing to settle"]);
    assert.strictEqual(dialogs.length, 0, "no confirmation when there is nothing to settle");
  }],
  ["settle: asks first, naming how many items", () => {
    const { dialogs } = run("settle-action.js", sample(), { answer: null });
    assert.strictEqual(dialogs.length, 1);
    assert.strictEqual(dialogs[0].title, "Settle?");
    assert.strictEqual(dialogs[0].text, "Save 4 items to Vegetable History and clear their prices?");
    assert.deepStrictEqual(Object.keys(dialogs[0].buttons), ["Settle", "Cancel"]);
    const one = run("settle-action.js", table([{ Order: 1, Name: "آلو", Price: 700 }]), { answer: null });
    assert.strictEqual(one.dialogs[0].text, "Save 1 item to Vegetable History and clear their prices?");
  }],
  ["settle: unanswered dialog saves and clears nothing", () => {
    const entries = sample();
    const { history, messages } = run("settle-action.js", entries, { answer: null });
    assert.strictEqual(history.length, 0);
    assert.deepStrictEqual(entries.map((e) => e.values.Price), [600, null, 50, 700, 600]);
    assert.deepStrictEqual(messages, []);
  }],
  ["settle: Cancel saves and clears nothing", () => {
    const entries = sample();
    const { history, messages } = run("settle-action.js", entries, { answer: "Cancel" });
    assert.strictEqual(history.length, 0);
    assert.deepStrictEqual(entries.map((e) => [e.values.Price, e.values.Qty]),
      [[600, 1], [null, null], [50, 4], [700, 5], [600, null]]);
    assert.deepStrictEqual(messages, ["Cancelled"]);
  }],
  ["settle: missing history library shows no dialog", () => {
    const { dialogs, history } = run("settle-action.js", sample(), { historyMissing: true });
    assert.strictEqual(dialogs.length, 0);
    assert.strictEqual(history.length, 0);
  }],
];

// Vegetable History as Memento lists it: newest first. Two shopping days.
// The report keeps this listing order (see history-report-action.js).
const historySample = () => table([
  { Date: new Date(2026, 9, 9, 21, 40), Name: "آلو", English: "Potato", Group: "سبزی", Unit: "کلو", Price: 150, Qty: 2 },
  { Date: new Date(2026, 9, 8, 23, 59), Name: "پپیتا", English: "Papaya", Group: "پھل", Unit: "عدد", Price: 300, Qty: null },
  { Date: new Date(2026, 9, 8, 18, 5), Name: "", English: "Mint", Group: "سبزی", Unit: "گڈی", Price: 40, Qty: 2 },
  { Date: new Date(2026, 9, 8, 18, 5), Name: "انار", English: "Pomegranate", Group: "پھل ", Unit: "کلو", Price: 600, Qty: 1 },
  { Date: new Date(2026, 9, 8, 0, 1), Name: "آلو", English: "Potato", Group: "سبزی", Unit: "کلو", Price: 700, Qty: 5 },
]);
const linkDate = (url) => new URLSearchParams(url.split("#")[1]).get("d");

cases.push(
  ["history: entry action reports every item of that day, in listing order", () => {
    const entries = historySample();
    const { opened } = run("history-report-action.js", entries, { current: entries[3] });
    assert.strictEqual(opened.length, 1);
    assert.ok(opened[0].startsWith("https://talha131.github.io/hisab-kitab/veg.html#d="));
    assert.strictEqual(linkDate(opened[0]), "2026-10-08", "purchase day, not today");
    assert.deepStrictEqual(linkRows(opened[0]), [
      ["p", "پپیتا", "Papaya", 300, 0, "عدد"],
      ["s", "Mint", "Mint", 40, 2, "گڈی"],
      ["p", "انار", "Pomegranate", 600, 1, "کلو"],
      ["s", "آلو", "Potato", 700, 5, "کلو"],
    ]);
  }],
  ["history: other days are left out", () => {
    const entries = historySample();
    const { opened } = run("history-report-action.js", entries, { current: entries[0] });
    assert.strictEqual(linkDate(opened[0]), "2026-10-09");
    assert.deepStrictEqual(linkRows(opened[0]), [["s", "آلو", "Potato", 150, 2, "کلو"]]);
  }],
  ["history: Date stored as string or number still matches the day", () => {
    const entries = table([
      { Date: new Date(2026, 9, 8, 9, 0).getTime(), Name: "آلو", Group: "سبزی", Price: 700 },
      { Date: new Date(2026, 9, 8, 20, 0).toString(), Name: "پیاز", Group: "سبزی", Price: 800 },
      { Date: new Date(2026, 9, 7, 20, 0).getTime(), Name: "ٹماٹر", Group: "سبزی", Price: 400 },
    ]);
    const { opened } = run("history-report-action.js", entries, { current: entries[0] });
    assert.strictEqual(linkDate(opened[0]), "2026-10-08");
    assert.deepStrictEqual(linkRows(opened[0]).map((r) => r[1]), ["آلو", "پیاز"]);
  }],
  ["history: fruit variants and zero prices", () => {
    const entries = table([
      { Date: new Date(2026, 9, 8), Name: "کیلا", Group: " پهل", Price: 300 },
      { Date: new Date(2026, 9, 8), Name: "سیب", Group: "Fruit", Price: 500 },
      { Date: new Date(2026, 9, 8), Name: "ادرک", Group: "", Price: 0 },
    ]);
    const { opened } = run("history-report-action.js", entries, { current: entries[0] });
    assert.deepStrictEqual(linkRows(opened[0]).map((r) => [r[0], r[1]]), [["p", "کیلا"], ["p", "سیب"]]);
  }],
  ["history: library action reports the most recent day", () => {
    const { opened } = run("history-report-action.js", historySample());
    assert.strictEqual(linkDate(opened[0]), "2026-10-09");
    assert.deepStrictEqual(linkRows(opened[0]).map((r) => r[1]), ["آلو"]);
  }],
  ["history: a day with nothing priced shows a message", () => {
    const entries = table([{ Date: new Date(2026, 9, 8), Name: "آلو", Price: null }]);
    const { opened, messages } = run("history-report-action.js", entries, { current: entries[0] });
    assert.strictEqual(opened.length, 0);
    assert.deepStrictEqual(messages, ["No items for this day"]);
  }],
  ["history: empty library shows a message", () => {
    const { opened, messages } = run("history-report-action.js", []);
    assert.strictEqual(opened.length, 0);
    assert.deepStrictEqual(messages, ["No items for this day"]);
  }],
);

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
