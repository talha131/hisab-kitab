// Runs report-button.js on sample entries and previews the meat report page
// for each link it builds (see ../lib/headless.js for what gets written).
// Usage: node preview.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { preview } = require("../lib/headless");

const scenarios = {
  // A sample purchase with a manual-price line and a discount, marked paid.
  "discount-paid": {
    "Date": new Date(2026, 9, 8), "Paid": true, "Discount": 500,
    "Weight Boneless": 3, "Rate Boneless": 1800,
    "Weight Bone-in": 5, "Rate Bone-in": 1500,
    "Weight Fatty Trimming": 0.5, "Manual Price Fatty Trimming": 400,
    "Qty Trotters": 4, "Rate Trotters": 300,
  },
  // Plain purchase: no discount, unpaid.
  "plain": {
    "Date": new Date(2026, 9, 8), "Paid": false,
    "Weight Boneless": 3, "Rate Boneless": 1800,
    "Weight Bone-in": 5, "Rate Bone-in": 1500,
  },
};

function buttonHash(values) {
  const code = fs.readFileSync(path.join(__dirname, "report-button.js"), "utf8");
  let url;
  vm.runInNewContext(code, {
    entry: () => ({ field: (n) => (n in values ? values[n] : null) }),
    intent: () => ({ data: (u) => { url = u; }, send: () => {} }),
    encodeURIComponent,
  });
  return url.split("#")[1];
}

const pages = Object.fromEntries(Object.entries(scenarios).map(([name, values]) => [name, "meat.html#" + buttonHash(values)]));
preview(pages, path.join(__dirname, "preview")).catch((e) => { console.error(e); process.exit(1); });
