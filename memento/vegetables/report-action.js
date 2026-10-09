// Report · رپورٹ — library action for the Vegetables 🥕🍆 library.
// Opens today's report page with every vegetable that has a price, in table
// order. The list travels in the link after "#", which the browser never
// sends to the server.
var PAGE = "https://talha131.github.io/hisab-kitab/veg.html";

function num(e, name) {
  var v = Number(e.field(name));
  return isNaN(v) ? 0 : v;
}
function text(e, name) {
  var v = e.field(name);
  return v == null ? "" : String(v);
}
// Group is typed by hand: treat anything starting with پ (پھل, "پھل ", پهل...)
// or "fruit" as fruit, everything else as a vegetable.
function isFruit(e) {
  return /^\s*(\u067e|fruit)/i.test(text(e, "Group"));
}
function pad(n) {
  return (n < 10 ? "0" : "") + n;
}

var bought = [];
var entries = lib().entries();
for (var i = 0; i < entries.length; i++) {
  var e = entries[i];
  var price = num(e, "Price");
  if (!(price > 0)) continue;
  bought.push({
    order: num(e, "Order"),
    // An item with no Urdu name still shows (and counts) under its English name.
    row: [isFruit(e) ? "p" : "s", text(e, "Name") || text(e, "English") || "?", text(e, "English"),
          Math.round(price), num(e, "Qty"), text(e, "Unit")]
  });
}
bought.sort(function (a, b) { return a.order - b.order; });

if (bought.length === 0) {
  message("No prices entered yet");
} else {
  var rows = [];
  for (var j = 0; j < bought.length; j++) rows.push(bought[j].row);
  var today = new Date();
  var date = today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());
  var view = intent("android.intent.action.VIEW");
  view.data(PAGE + "#d=" + date + "&v=" + encodeURIComponent(JSON.stringify(rows)));
  view.send();
}
