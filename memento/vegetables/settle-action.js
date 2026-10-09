// Settle · حساب بند — library action for the Vegetables 🥕🍆 library.
// After paying: asks for confirmation, then copies every vegetable with a price
// into the Vegetable History library with today's date and clears Price and Qty
// so the table is ready for the next purchase. Unit is kept as each vegetable's
// usual unit.
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
  return /^\s*(پ|fruit)/i.test(text(e, "Group"));
}

var priced = [];
var entries = lib().entries();
for (var i = 0; i < entries.length; i++) {
  if (num(entries[i], "Price") > 0) priced.push(entries[i]);
}

// Saves each priced row to history, then clears it. Stops at the first row it
// can't save, so nothing is cleared without being saved first.
function settle() {
  var today = new Date();
  var settled = 0;
  for (var i = 0; i < priced.length; i++) {
    var e = priced[i];
    var qty = num(e, "Qty");
    var saved = history.create({
      "Date": today,
      "Name": text(e, "Name"),
      "English": text(e, "English"),
      "Group": isFruit(e) ? "پھل" : "سبزی",
      "Price": Math.round(num(e, "Price")),
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

if (priced.length === 0) {
  message("Nothing to settle");
} else if (!history) {
  // Nothing is cleared unless it can be saved first.
  message("Vegetable History library not found. Allow this script to access it.");
} else {
  // Report and Settle share the same ▶ menu; one wrong tap must not clear prices.
  dialog()
    .title("Settle?")
    .text("Save " + priced.length + (priced.length === 1 ? " item" : " items") +
          " to Vegetable History and clear their prices?")
    .positiveButton("Settle", function () { settle(); })
    .negativeButton("Cancel", function () { message("Cancelled"); })
    .show();
}
