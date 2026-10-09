// Shared helpers for the report pages (meat.html, veg.html).
var Report = (function () {
  function rs(n) {
    return "Rs " + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function amount(n) {
    var v = Number(n);
    return isFinite(v) && v > 0 ? v : 0;
  }
  function date(text) {
    return /^\d{4}-\d{2}-\d{2}$/.test(text || "") ? text : "";
  }
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // "2026-10-08" -> "Thursday, Oct 08, 2026". Read as a local date so the
  // weekday never shifts with the time zone; "" for anything invalid.
  function humanDate(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text || "");
    if (!m) return "";
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return "";
    return DAYS[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + m[3] + ", " + m[1];
  }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  // Isolates an Urdu unit inside left-to-right number text.
  function isolate(text) {
    return "⁨" + text + "⁩";
  }

  // An item row: Urdu name with English below, quantity cell, amount.
  function itemRow(urdu, english, qtyLines, price) {
    var tr = el("tr");
    var name = el("td", "name");
    name.appendChild(el("div", "ur", urdu));
    if (english) name.appendChild(el("div", "en", english));
    var qty = el("td", "qty num");
    qtyLines.forEach(function (line) { if (line) qty.appendChild(el("span", line[0], line[1])); });
    var amt = el("td", "amt");
    amt.appendChild(el("span", "num", rs(price)));
    tr.appendChild(name);
    tr.appendChild(qty);
    tr.appendChild(amt);
    return tr;
  }
  // A totals row: Urdu label with its English term below, and the amount.
  function sumRow(cls, label, english, value) {
    var tr = el("tr", "sum " + cls);
    var l = el("td", "label");
    l.appendChild(el("div", "ur", label));
    l.appendChild(el("div", "en", english));
    l.colSpan = 2;
    tr.appendChild(l);
    var a = el("td", "amt");
    a.appendChild(el("span", "num", value));
    tr.appendChild(a);
    return tr;
  }
  function emptyRow() {
    var tr = el("tr");
    var td = el("td", "empty", "ابھی کوئی چیز درج نہیں");
    td.colSpan = 3;
    tr.appendChild(td);
    return tr;
  }

  // Wires the Share image, Copy image and Save PDF buttons. fileName() names the PNG.
  // The report card as a PNG blob, once the Urdu font has loaded.
  function renderImage() {
    return document.fonts.ready.then(function () {
      return htmlToImage.toBlob(document.getElementById("capture"), { pixelRatio: 3, backgroundColor: "#ffffff" });
    });
  }

  function setupActions(fileName) {
    var status = document.getElementById("status");
    document.getElementById("share").addEventListener("click", function () {
      status.textContent = "Preparing image…";
      renderImage()
        .then(function (blob) {
          var file = new File([blob], fileName(), { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            status.textContent = "";
            return navigator.share({ files: [file] });
          }
          var a = el("a");
          a.href = URL.createObjectURL(blob);
          a.download = file.name;
          a.click();
          status.textContent = "Image downloaded.";
        })
        .catch(function (err) {
          if (err && err.name === "AbortError") { status.textContent = ""; return; }
          status.textContent = "Could not share the image: " + (err && err.message || err);
        });
    });
    document.getElementById("copy").addEventListener("click", function () {
      if (!(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem)) {
        status.textContent = "This browser can't copy images. Use Share image instead.";
        return;
      }
      status.textContent = "Copying image…";
      // Hand ClipboardItem the pending image so the copy still counts as part
      // of the tap while the image renders.
      navigator.clipboard.write([new ClipboardItem({ "image/png": renderImage() })])
        .then(function () { status.textContent = "Image copied. Paste it in WhatsApp."; })
        .catch(function (err) { status.textContent = "Could not copy the image: " + (err && err.message || err); });
    });
    document.getElementById("pdf").addEventListener("click", function () { window.print(); });
  }

  // Renders from the link fragment now and whenever it changes.
  function start(parse, render) {
    render(parse(location.hash));
    window.addEventListener("hashchange", function () { render(parse(location.hash)); });
  }

  return {
    rs: rs, amount: amount, date: date, humanDate: humanDate, el: el, isolate: isolate,
    itemRow: itemRow, sumRow: sumRow, emptyRow: emptyRow,
    setupActions: setupActions, start: start
  };
})();
