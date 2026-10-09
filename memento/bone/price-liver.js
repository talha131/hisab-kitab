// Price Liver — JavaScript field, "real time" on.
var manual = field("Manual Price Liver") || 0;
var price = manual > 0 ? manual : (field("Weight Liver") || 0) * (field("Rate Liver") || 0);
// Empty instead of 0, so the PDF report can hide meats that weren't bought.
price > 0 ? price : null;
