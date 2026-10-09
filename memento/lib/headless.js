// Previews report pages: serves docs/ locally, opens each page in headless
// Chrome emulating a phone, and writes into <outDir>:
//   <name>.png        what the phone screen shows
//   <name>-share.png  the image "Share image" and "Copy image" produce
//                     (rendered by the page's own Report.renderImage)
//   <name>.pdf        what "Save PDF" (print, A5) produces
// and checks that "Copy image" puts a PNG on the clipboard.
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

// Taps "Copy image" like a user would and returns the size of the PNG on the
// clipboard, or the page's status message if the copy failed.
async function copyImage(cdp) {
  const eval_ = async (expression) => (await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;
  // Long reports push the button below the screen; bring it into view first.
  const box = await eval_("(() => { const b = document.getElementById('copy'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()");
  for (const type of ["mousePressed", "mouseReleased"]) {
    await cdp.send("Input.dispatchMouseEvent", { type, x: box[0], y: box[1], button: "left", clickCount: 1 });
  }
  const status = await eval_(`new Promise((resolve) => {
    const started = Date.now();
    const text = () => document.getElementById('status').textContent;
    const tick = () => {
      if (/copied|Could not|can't/.test(text())) resolve(text());
      else if (Date.now() - started > 15000) resolve("no result after 15 s; status: " + text());
      else setTimeout(tick, 100);
    };
    tick();
  })`);
  if (!/copied/.test(status)) return status;
  return eval_("navigator.clipboard.read().then((items) => items[0].getType('image/png')).then((b) => b.size)");
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
    await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await cdp.send("Browser.grantPermissions", {
      permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"],
      origin: `http://127.0.0.1:${server.address().port}`,
    });
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
        // The page's own renderer, so this is exactly what Share image sends.
        expression: "Report.renderImage().then((blob) => new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob); }))",
        awaitPromise: true, returnByValue: true,
      });
      if (share.exceptionDetails) throw new Error("share image failed: " + JSON.stringify(share.exceptionDetails));
      fs.writeFileSync(path.join(outDir, name + "-share.png"), Buffer.from(share.result.value.split(",")[1], "base64"));
      const copied = await copyImage(cdp);
      if (!(copied > 0)) throw new Error("Copy image put no PNG on the clipboard: " + copied);
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
