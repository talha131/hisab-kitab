// Price Trotters — JavaScript field, "real time" on.
var manual = field("Manual Price Trotters") || 0;
var price = manual > 0 ? manual : (field("Qty Trotters") || 0) * (field("Rate Trotters") || 0);
// Empty instead of 0, so the PDF report can hide meats that weren't bought.
price > 0 ? price : null;
