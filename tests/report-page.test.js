// Tests the pure helpers in docs/report.js (shared by the report pages).
// Usage: node tests/report-page.test.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const context = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../docs/report.js"), "utf8") + "\nthis.Report = Report;", context);
const { Report } = context;

const cases = [
  ["humanDate: weekday, short month, two-digit day, year", () => {
    assert.strictEqual(Report.humanDate("2026-10-08"), "Thursday, Oct 08, 2026");
    assert.strictEqual(Report.humanDate("2026-10-09"), "Friday, Oct 09, 2026");
    assert.strictEqual(Report.humanDate("2027-01-01"), "Friday, Jan 01, 2027");
  }],
  ["humanDate: weekday is the local calendar day in any time zone", () => {
    const code = fs.readFileSync(path.join(__dirname, "../docs/report.js"), "utf8") + "\nthis.Report = Report;";
    for (const tz of ["Pacific/Honolulu", "Asia/Karachi", "Pacific/Kiritimati"]) {
      const out = require("child_process").execFileSync(process.execPath, ["-e",
        `const vm=require("vm");const c={};vm.runInNewContext(${JSON.stringify(code)},c);process.stdout.write(c.Report.humanDate("2026-10-08"))`],
        { env: { ...process.env, TZ: tz } }).toString();
      assert.strictEqual(out, "Thursday, Oct 08, 2026", tz);
    }
  }],
  ["humanDate: invalid input gives empty text", () => {
    for (const bad of ["", null, undefined, "2026-13-01", "2026-02-30", "08-10-2026", "2026-10-8", "<b>"]) {
      assert.strictEqual(Report.humanDate(bad), "", String(bad));
    }
  }],
  ["rs: rupees with thousands separators", () => {
    assert.strictEqual(Report.rs(12500), "Rs 12,500");
    assert.strictEqual(Report.rs(50), "Rs 50");
    assert.strictEqual(Report.rs(1234567.4), "Rs 1,234,567");
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
