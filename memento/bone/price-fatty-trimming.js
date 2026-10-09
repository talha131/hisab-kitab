// Price Fatty Trimming — JavaScript field, "real time" on.
var manual = field("Manual Price Fatty Trimming") || 0;
var price = manual > 0 ? manual : (field("Weight Fatty Trimming") || 0) * (field("Rate Fatty Trimming") || 0);
// Empty instead of 0, so the PDF report can hide meats that weren't bought.
price > 0 ? Math.round(price) : null;
