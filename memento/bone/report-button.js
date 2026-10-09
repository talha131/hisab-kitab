// Report · رپورٹ — Button field script.
// Opens this purchase's report page in the browser. The purchase travels in
// the link after "#", which the browser never sends to the server.
var PAGE = "https://talha131.github.io/hisab-kitab/meat.html";

// [code the page knows, quantity field, rate field, manual price field]
var items = [
  ["bl", "Weight Boneless", "Rate Boneless", "Manual Price Boneless"],
  ["bi", "Weight Bone-in", "Rate Bone-in", "Manual Price Bone-in"],
  ["ft", "Weight Fatty Trimming", "Rate Fatty Trimming", "Manual Price Fatty Trimming"],
  ["sb", "Weight Soup Bones", "Rate Soup Bones", "Manual Price Soup Bones"],
  ["mi", "Weight Mince", "Rate Mince", "Manual Price Mince"],
  ["mb", "Weight Marrow Bones", "Rate Marrow Bones", "Manual Price Marrow Bones"],
  ["lv", "Weight Liver", "Rate Liver", "Manual Price Liver"],
  ["tr", "Qty Trotters", "Rate Trotters", "Manual Price Trotters"],
  ["tp", "Weight Tripe", "Rate Tripe", "Manual Price Tripe"]
];

var e = entry();
function num(name) {
  var v = Number(e.field(name));
  return isNaN(v) ? 0 : v;
}
function pad(n) {
  return (n < 10 ? "0" : "") + n;
}

var lines = [];
for (var i = 0; i < items.length; i++) {
  var weight = num(items[i][1]), rate = num(items[i][2]), manual = num(items[i][3]);
  var price = manual > 0 ? manual : weight * rate;
  if (price > 0) lines.push([items[i][0], weight, rate, Math.round(price)].join("~"));
}

var d = e.field("Date");
if (d && typeof d.getFullYear !== "function") d = new Date(d);
var date = d && !isNaN(d.getTime()) ? d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) : "";

var url = PAGE + "#d=" + date +
  "&i=" + encodeURIComponent(lines.join("_")) +
  "&disc=" + Math.round(num("Discount")) +
  "&paid=" + (e.field("Paid") === true ? 1 : 0);

var view = intent("android.intent.action.VIEW");
view.data(url);
view.send();
