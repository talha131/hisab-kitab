// Price Soup Bones — JavaScript field, "real time" on.
var manual = field("Manual Price Soup Bones") || 0;
var price = manual > 0 ? manual : (field("Weight Soup Bones") || 0) * (field("Rate Soup Bones") || 0);
// Empty instead of 0, so the PDF report can hide meats that weren't bought.
price > 0 ? price : null;
