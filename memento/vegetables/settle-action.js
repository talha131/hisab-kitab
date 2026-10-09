// Settle · حساب بند — library action for the Sabzi library.
// After paying: copies every vegetable with a price into the Vegetable History
// library with today's date, then clears Price and Qty so the table is ready
// for the next purchase. Unit is kept as each vegetable's usual unit.
var history = libByName("Vegetable History");

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

if (!history) {
  // Nothing is cleared unless it can be saved first.
  message("Vegetable History library not found. Allow this script to access it.");
} else {
  var today = new Date();
  var settled = 0;
  var entries = lib().entries();
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var price = num(e, "Price");
    if (!(price > 0)) continue;
    var qty = num(e, "Qty");
    var saved = history.create({
      "Date": today,
      "Name": text(e, "Name"),
      "English": text(e, "English"),
      "Group": isFruit(e) ? "پھل" : "سبزی",
      "Price": Math.round(price),
      "Qty": qty > 0 ? qty : null,
      "Unit": text(e, "Unit")
    });
    if (!saved) {
      message("Could not save " + text(e, "Name") + ". Stopped; nothing else cleared.");
      break;
    }
    e.set("Price", null);
    e.set("Qty", null);
    settled++;
  }
  message(settled ? "Settled " + settled + " items into Vegetable History" : "Nothing to settle");
}
