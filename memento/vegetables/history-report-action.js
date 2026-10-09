// Report · رپورٹ — action for the Vegetable History library.
// Re-opens the report page for one past shopping day: every history entry
// dated on the same calendar day, in the same link format as report-action.js,
// with the purchase day as the report date.
// As an entry action it reports the opened entry's day; as a library action
// (no current entry) it reports the most recent day in the history.
var PAGE = "https://talha131.github.io/hisab-kitab/veg.html";

function num(e, name) {
  var v = Number(e.field(name));
  return isNaN(v) ? 0 : v;
}
function text(e, name) {
  var v = e.field(name);
  return v == null ? "" : String(v);
}
// Settle writes پھل / سبزی, but entries can be edited by hand: treat anything
// starting with پ or "fruit" as fruit, as report-action.js does.
function isFruit(e) {
  return /^\s*(پ|fruit)/i.test(text(e, "Group"));
}
function pad(n) {
  return (n < 10 ? "0" : "") + n;
}
// The entry's Date as a local calendar day "YYYY-MM-DD", or "" if missing.
function day(e) {
  var d = e.field("Date");
  if (d == null || d === "") return "";
  if (typeof d.getFullYear !== "function") d = new Date(d);
  if (isNaN(d.getTime())) return "";
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

var current = null;
try { current = entry(); } catch (err) { current = null; }

// Memento lists entries newest first; copy them oldest first (a plain loop, in
// case entries() is not a real JS array) so a day's items come out in the
// order Settle saved them.
var all = lib().entries();
var entries = [];
for (var n = all.length - 1; n >= 0; n--) entries.push(all[n]);

var target = current ? day(current) : "";
if (!current) {
  for (var k = 0; k < entries.length; k++) {
    var dk = day(entries[k]);
    if (dk > target) target = dk;
  }
}

var rows = [];
for (var i = 0; target && i < entries.length; i++) {
  var e = entries[i];
  var price = num(e, "Price");
  if (day(e) !== target || !(price > 0)) continue;
  rows.push([isFruit(e) ? "p" : "s", text(e, "Name") || text(e, "English") || "?", text(e, "English"),
             Math.round(price), num(e, "Qty"), text(e, "Unit")]);
}

if (rows.length === 0) {
  message("No items for this day");
} else {
  var view = intent("android.intent.action.VIEW");
  view.data(PAGE + "#d=" + target + "&v=" + encodeURIComponent(JSON.stringify(rows)));
  view.send();
}
