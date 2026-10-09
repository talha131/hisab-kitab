// Runs report-button.js on sample entries and opens each link it builds
// against docs/meat.html (served locally) in headless Chrome emulating a
// phone. Writes into preview/:
//   <scenario>.png        what the phone screen shows
//   <scenario>-share.png  the image the "Share image" button produces
//   <scenario>.pdf        what "Save PDF" (print, A5) produces
// Usage: node preview.js   (serves docs/ itself on a free local port)
const fs = require("fs");
const http = require("http");
const path = require("path");
const vm = require("vm");
const { spawn } = require("child_process");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SITE = path.resolve(__dirname, "../../docs");
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true };

const scenarios = {
  // Your meat example plus a manual-price line and a discount, marked paid.
  "discount-paid": {
    "Date": new Date(2026, 9, 8), "Paid": true, "Discount": 500,
    "Weight Boneless": 3, "Rate Boneless": 1800,
    "Weight Bone-in": 5, "Rate Bone-in": 1500,
    "Weight Fatty Trimming": 0.5, "Manual Price Fatty Trimming": 400,
    "Qty Trotters": 4, "Rate Trotters": 300,
  },
  // Plain purchase: no discount, unpaid.
  "plain": {
    "Date": new Date(2026, 9, 8), "Paid": false,
    "Weight Boneless": 3, "Rate Boneless": 1800,
    "Weight Bone-in": 5, "Rate Bone-in": 1500,
  },
};

function buttonHash(values) {
  const code = fs.readFileSync(path.join(__dirname, "report-button.js"), "utf8");
  let url;
  vm.runInNewContext(code, {
    entry: () => ({ field: (n) => (n in values ? values[n] : null) }),
    intent: () => ({ data: (u) => { url = u; }, send: () => {} }),
    encodeURIComponent,
  });
  return url.split("#")[1];
}

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(SITE, decodeURIComponent(req.url.split("?")[0]));
    if (!file.startsWith(SITE) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function connect(chrome) {
  const port = await new Promise((resolve, reject) => {
    chrome.stderr.on("data", (d) => {
      const m = String(d).match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
      if (m) resolve(m[1]);
    });
    chrome.on("exit", () => reject(new Error("chrome exited")));
  });
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, (msg) => (msg.error ? reject(new Error(method + ": " + msg.error.message)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  return { send, close: () => ws.close() };
}

async function main() {
  const outDir = path.join(__dirname, "preview");
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir);
  const server = await serve();
  const profile = fs.mkdtempSync(path.join(require("os").tmpdir(), "meat-preview-"));
  const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"]);
  try {
    const cdp = await connect(chrome);
    await cdp.send("Emulation.setDeviceMetricsOverride", PHONE);
    for (const [name, values] of Object.entries(scenarios)) {
      const url = `http://127.0.0.1:${server.address().port}/meat.html#${buttonHash(values)}`;
      await cdp.send("Page.navigate", { url });
      await cdp.send("Runtime.evaluate", {
        expression: "new Promise(r => (document.readyState === 'complete' ? r() : addEventListener('load', r))).then(() => document.fonts.ready)",
        awaitPromise: true,
      });
      const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(outDir, name + ".png"), Buffer.from(shot.data, "base64"));
      const share = await cdp.send("Runtime.evaluate", {
        expression: "htmlToImage.toPng(document.getElementById('capture'), { pixelRatio: 2, backgroundColor: '#ffffff' })",
        awaitPromise: true, returnByValue: true,
      });
      if (share.exceptionDetails) throw new Error("share image failed: " + JSON.stringify(share.exceptionDetails));
      fs.writeFileSync(path.join(outDir, name + "-share.png"), Buffer.from(share.result.value.split(",")[1], "base64"));
      const pdf = await cdp.send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true });
      fs.writeFileSync(path.join(outDir, name + ".pdf"), Buffer.from(pdf.data, "base64"));
      console.log(name + ": " + url);
    }
    cdp.close();
  } finally {
    const exited = new Promise((r) => chrome.once("exit", r));
    chrome.kill();
    await exited;
    server.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
