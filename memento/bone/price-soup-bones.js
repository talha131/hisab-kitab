// Price Soup Bones — JavaScript field, "real time" on.
var manual = field("Manual Price Soup Bones") || 0;
var price = manual > 0 ? manual : (field("Weight Soup Bones") || 0) * (field("Rate Soup Bones") || 0);
// Empty instead of 0 keeps meats that weren't bought blank on the entry card
// (first added for the PDF template, which was abandoned; see NOTES.md).
price > 0 ? Math.round(price) : null;
