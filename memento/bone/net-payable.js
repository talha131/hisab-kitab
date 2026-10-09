// Net Payable · واجب الادا — JavaScript field, "real time" on.
// Recomputes the grand total itself rather than reading the Grand Total
// field, so it never shows a stale value while editing.
var lines = [
  ["Weight Boneless", "Rate Boneless", "Manual Price Boneless"],
  ["Weight Bone-in", "Rate Bone-in", "Manual Price Bone-in"],
  ["Weight Fatty Trimming", "Rate Fatty Trimming", "Manual Price Fatty Trimming"],
  ["Weight Soup Bones", "Rate Soup Bones", "Manual Price Soup Bones"],
  ["Weight Mince", "Rate Mince", "Manual Price Mince"],
  ["Weight Marrow Bones", "Rate Marrow Bones", "Manual Price Marrow Bones"],
  ["Weight Liver", "Rate Liver", "Manual Price Liver"],
  ["Qty Trotters", "Rate Trotters", "Manual Price Trotters"],
  ["Weight Tripe", "Rate Tripe", "Manual Price Tripe"]
];
var total = 0;
for (var i = 0; i < lines.length; i++) {
  var manual = field(lines[i][2]) || 0;
  total += manual > 0 ? manual : (field(lines[i][0]) || 0) * (field(lines[i][1]) || 0);
}
total - (field("Discount") || 0);
