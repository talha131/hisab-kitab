// Price Fatty Trimming — JavaScript field, "real time" on.
var manual = field("Manual Price Fatty Trimming") || 0;
var price = manual > 0 ? manual : (field("Weight Fatty Trimming") || 0) * (field("Rate Fatty Trimming") || 0);
// Empty instead of 0 keeps meats that weren't bought blank on the entry card
// (first added for the PDF template, which was abandoned; see NOTES.md).
price > 0 ? Math.round(price) : null;
