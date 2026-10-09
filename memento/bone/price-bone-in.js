// Price Bone-in — JavaScript field, "real time" on.
var manual = field("Manual Price Bone-in") || 0;
var price = manual > 0 ? manual : (field("Weight Bone-in") || 0) * (field("Rate Bone-in") || 0);
// Empty instead of 0, so the PDF report can hide meats that weren't bought.
price > 0 ? Math.round(price) : null;
