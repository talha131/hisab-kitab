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

  ["grand total: your meat example", "grand-total.js",
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

// Every per-meat script must be empty (not 0) when nothing was bought, so the
// PDF report's class="v{{Price X}}" becomes "v" and the row is hidden.
for (const f of fs.readdirSync(__dirname).filter((f) => f.startsWith("price-"))) {
  assert.strictEqual(run(f, {}), null, f + " should be empty when nothing was bought");
}

console.log(failed ? `\n${failed} failed` : `\nall ${cases.length} passed`);
process.exit(failed ? 1 : 0);
