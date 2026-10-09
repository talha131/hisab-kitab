// Runs each Memento field script against a stubbed field() and checks the result.
// Memento uses the value of the script's last expression as the field value.
// Usage: node test.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

function run(file, values) {
  const code = fs.readFileSync(path.join(__dirname, file), "utf8");
  // Empty Memento number fields read as null.
  const field = (name) => (name in values ? values[name] : null);
  return vm.runInNewContext(code, { field });
}

const cases = [
  ["price: weight × rate", "price-boneless.js",
    { "Weight Boneless": 3, "Rate Boneless": 1800 }, 5400],
  ["price: half kilo", "price-boneless.js",
    { "Weight Boneless": 0.5, "Rate Boneless": 1800 }, 900],
  ["price: manual wins over weight × rate", "price-boneless.js",
    { "Weight Boneless": 3, "Rate Boneless": 1800, "Manual Price Boneless": 5000 }, 5000],
  ["price: manual only, no rate", "price-boneless.js",
    { "Manual Price Boneless": 650 }, 650],
  ["price: manual 0 is ignored", "price-boneless.js",
    { "Weight Boneless": 3, "Rate Boneless": 1800, "Manual Price Boneless": 0 }, 5400],
  ["price: all empty is empty", "price-boneless.js", {}, null],
  ["price: weight without rate is empty", "price-boneless.js",
    { "Weight Boneless": 3 }, null],
  ["price: trotters use Qty", "price-trotters.js",
    { "Qty Trotters": 4, "Rate Trotters": 300 }, 1200],
  ["price: tripe field names", "price-tripe.js",
    { "Weight Tripe": 2, "Rate Tripe": 700 }, 1400],

  ["grand total: sample purchase", "grand-total.js",
    { "Weight Boneless": 3, "Rate Boneless": 1800,
      "Weight Bone-in": 5, "Rate Bone-in": 1500 }, 12900],
  ["grand total: mixes manual and computed lines", "grand-total.js",
    { "Weight Boneless": 3, "Rate Boneless": 1800,
      "Manual Price Fatty Trimming": 400,
      "Qty Trotters": 4, "Rate Trotters": 300 }, 7000],
  ["grand total: every meat counted", "grand-total.js",
    Object.fromEntries(["Boneless", "Bone-in", "Fatty Trimming", "Soup Bones",
      "Mince", "Marrow Bones", "Liver", "Trotters", "Tripe"]
      .map((m) => ["Manual Price " + m, 100])), 900],
  ["grand total: empty entry", "grand-total.js", {}, 0],

  ["net payable: total minus discount", "net-payable.js",
    { "Weight Boneless": 3, "Rate Boneless": 1800,
      "Weight Bone-in": 5, "Rate Bone-in": 1500, "Discount": 400 }, 12500],
  ["net payable: no discount", "net-payable.js",
    { "Weight Boneless": 3, "Rate Boneless": 1800 }, 5400],

  // Fractional weights: every line is rounded to whole rupees, as on the page.
  ["price: rounded to whole rupees", "price-boneless.js",
    { "Weight Boneless": 0.25, "Rate Boneless": 1850 }, 463],
  ["grand total: sums rounded lines", "grand-total.js",
    { "Weight Boneless": 0.25, "Rate Boneless": 1850,
      "Weight Bone-in": 0.75, "Rate Bone-in": 1850 }, 1851],
  ["net payable: sums rounded lines", "net-payable.js",
    { "Weight Boneless": 0.25, "Rate Boneless": 1850,
      "Weight Bone-in": 0.75, "Rate Bone-in": 1850, "Discount": 51 }, 1800],
];

let failed = 0;
for (const [name, file, values, expected] of cases) {
  try {
    assert.strictEqual(run(file, values), expected);
    console.log("ok   " + name);
  } catch (e) {
    failed++;
    console.log("FAIL " + name + ": " + e.message);
  }
}

// Runs report-button.js with a stubbed entry() and intent(); returns the URL it opens.
function openedUrl(values) {
  const code = fs.readFileSync(path.join(__dirname, "report-button.js"), "utf8");
  let url = null, sent = false;
  const entry = () => ({ field: (name) => (name in values ? values[name] : null) });
  const intent = (action) => {
    assert.strictEqual(action, "android.intent.action.VIEW");
    return { data: (u) => { url = u; }, send: () => { sent = true; } };
  };
  vm.runInNewContext(code, { entry, intent, encodeURIComponent });
  assert.ok(sent, "intent was not sent");
  return url;
}
function hashParams(url) {
  return Object.fromEntries(new URLSearchParams(url.split("#")[1]));
}

const example = {
  "Date": new Date(2026, 9, 8), "Paid": false,
  "Weight Boneless": 3, "Rate Boneless": 1800,
  "Weight Bone-in": 5, "Rate Bone-in": 1500,
};
const buttonCases = [
  ["button: only bought meats, with date", { ...example },
    { d: "2026-10-08", i: "bl~3~1800~5400_bi~5~1500~7500", disc: "0", paid: "0" }],
  ["button: manual price wins and keeps weight", { ...example, "Weight Fatty Trimming": 0.5, "Manual Price Fatty Trimming": 400 },
    { i: "bl~3~1800~5400_bi~5~1500~7500_ft~0.5~0~400" }],
  ["button: trotters use Qty", { "Qty Trotters": 4, "Rate Trotters": 300 }, { i: "tr~4~300~1200" }],
  ["button: discount and paid", { ...example, "Discount": 400, "Paid": true }, { disc: "400", paid: "1" }],
  ["button: empty purchase", {}, { d: "", i: "", disc: "0", paid: "0" }],
  ["button: lines rounded like the Memento fields", { "Weight Boneless": 0.25, "Rate Boneless": 1850,
    "Weight Bone-in": 0.75, "Rate Bone-in": 1850 }, { i: "bl~0.25~1850~463_bi~0.75~1850~1388" }],
];
for (const [name, values, expected] of buttonCases) {
  try {
    const url = openedUrl(values);
    assert.ok(url.split("#")[0].endsWith("/meat.html"), "page " + url);
    const got = hashParams(url);
    for (const [k, v] of Object.entries(expected)) assert.strictEqual(got[k], v, k);
    console.log("ok   " + name);
  } catch (e) {
    failed++;
    console.log("FAIL " + name + ": " + e.message);
  }
}

// Every per-meat script must be empty (not 0) when nothing was bought, so the
// PDF report's class="v{{Price X}}" becomes "v" and the row is hidden.
for (const f of fs.readdirSync(__dirname).filter((f) => f.startsWith("price-"))) {
  assert.strictEqual(run(f, {}), null, f + " should be empty when nothing was bought");
}

console.log(failed ? `\n${failed} failed` : `\nall ${cases.length + buttonCases.length} passed`);
process.exit(failed ? 1 : 0);
