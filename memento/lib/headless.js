// Previews report pages: serves docs/ locally, opens each page in headless
// Chrome emulating a phone, and writes into <outDir>:
//   <name>.png        what the phone screen shows
//   <name>-share.png  the image the "Share image" button produces
//   <name>.pdf        what "Save PDF" (print, A5) produces
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SITE = path.resolve(__dirname, "../../docs");
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true };
const TYPES = { ".css": "text/css", ".js": "text/javascript" };

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(SITE, decodeURIComponent(req.url.split("?")[0]));
    if (!file.startsWith(SITE) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
    const type = TYPES[path.extname(file)] || "text/html";
    res.writeHead(200, { "content-type": type + "; charset=utf-8" }).end(fs.readFileSync(file));
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

// pages: { name: "page.html#fragment" }
async function preview(pages, outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir);
  const server = await serve();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "report-preview-"));
  const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"]);
  try {
    const cdp = await connect(chrome);
    await cdp.send("Emulation.setDeviceMetricsOverride", PHONE);
    for (const [name, page] of Object.entries(pages)) {
      const url = `http://127.0.0.1:${server.address().port}/${page}`;
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

module.exports = { preview };
