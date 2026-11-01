// Records the CRYPTEXT demo video for real: drives headless Chrome through the live site with the
// keyboard, shows real curl output and a real MCP client session, narrates each scene with Piper
// (local TTS), and assembles an MP4 with ffmpeg.
//   node scripts/demo/record.mjs [siteUrl]
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = (process.argv[2] || "https://cryptext-nine.vercel.app").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const VOICE = process.env.PIPER_MODEL || "C:/Users/Matthew/hackathons/tts/en_US-ryan-high.onnx";
const OUT = path.join(ROOT, "demo-out", new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19));
const FR = path.join(OUT, "frames");
fs.mkdirSync(FR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SCENES = [
  { k: "open", say: "Teletext was television's original public information service. Ceefax went on air in 1974, and was switched off in 2012. This is CRYPTEXT: teletext, back from the grave, fed by live U.S. public data." },
  { k: "quakes", say: "Type three digits, like on a real set. The page counter searches, and page three hundred lists every earthquake of magnitude two point five or more in the last day, straight from the U.S.G.S." },
  { k: "biggest", say: "The coloured Fastext keys follow links. Here is the biggest quake of the day, and a histogram drawn in teletext mosaic graphics." },
  { k: "space", say: "Space weather from NOAA: the planetary K index, its recent history, and what it means for the aurora." },
  { k: "debt", say: "The national debt to the penny from the Treasury, and the debt clock: how fast it grew over the last thirty days." },
  { k: "recalls", say: "Food recalls from the F.D.A., with Class One in red. Every page names its source on the bottom row. If a feed fails, the page says so, instead of inventing numbers." },
  { k: "curl", say: "Every page also works in a terminal. One curl command, with real colours and real mosaic blocks." },
  { k: "mcp", say: "AI agents read the same pages through an M.C.P. server. This client lists the pages and reads page five hundred as text. There is also a TTI export, so a Raspberry Pi running VBIT2 can broadcast any page to a real analogue television." },
  { k: "kiro", say: "It was built with Kiro. Steering files carry the teletext specification. Five specs, two of them bug fix specs written from code review. Hooks run the tests on every save and lint every page before the agent can stop, and a custom page designer agent previewed its work through the project's own M.C.P. server." },
  { k: "haunt", say: "And then there is page six six six, where the set is haunted. Press reveal, and the hidden line appears." },
  { k: "outro", say: "CRYPTEXT. Open source, live now. The signal never died." },
];

function voice() {
  const dur = {};
  for (const s of SCENES) {
    const f = path.join(OUT, `${s.k}.wav`);
    const r = spawnSync("python", ["-m", "piper", "-m", VOICE, "-f", f, "--length-scale", "0.98", "--sentence-silence", "0.3"], { input: s.say, encoding: "utf8" });
    if (r.status !== 0) throw new Error("piper: " + r.stderr);
    dur[s.k] = Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).stdout.trim());
  }
  return dur;
}

async function captureTerminal() {
  const ansi = await (await fetch(`${SITE}/api/page?n=300&format=ansi&t=${Date.now()}`)).text();
  const mcpOut = spawnSync("node", ["scripts/demo/agent.mjs", "500"], { cwd: ROOT, encoding: "utf8" }).stdout.trimEnd();
  return { ansi, mcpOut };
}

const CAP_CSS = `#cap{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);width:min(1240px,94vw);background:rgba(8,6,10,.88);color:#f4f1ea;
  font:500 18px/1.35 system-ui,sans-serif;padding:9px 16px;border-radius:10px;z-index:99;text-align:center;pointer-events:none;border:1px solid rgba(255,255,255,.08)}`;

async function main() {
  // warm the serverless functions so page loads in the video are real but not cold starts
  await Promise.all([100, 300, 301, 400, 500, 503, 700, 666].map((n) => fetch(`${SITE}/api/page?n=${n}&format=json`).catch(() => {})));
  const { ansi, mcpOut } = await captureTerminal();
  const dur = voice();
  console.log("narration seconds", Object.values(dur).reduce((a, b) => a + b, 0).toFixed(1));
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", defaultViewport: { width: 1536, height: 864, deviceScaleFactor: 1.25 }, args: ["--no-first-run", "--lang=en-US", "--force-color-profile=srgb", "--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage();
  const prep = () => page.evaluate((css) => { if (!document.getElementById("cap")) { const st = document.createElement("style"); st.textContent = css; document.head.append(st); const c = document.createElement("div"); c.id = "cap"; document.body.append(c); } }, CAP_CSS);
  const caption = (t) => page.evaluate((t) => { const c = document.getElementById("cap"); if (c) { c.textContent = t; c.style.display = t ? "block" : "none"; } }, t);
  const keys = async (s, gap = 260) => { for (const ch of s) { await page.keyboard.press(ch); await sleep(gap); } };
  const waitPage = (n) => page.waitForFunction((n) => document.title.startsWith("CRYPTEXT P" + n) && !document.getElementById("screen").classList.contains("searching"), { timeout: 20000 }, n).catch(() => {});

  await page.goto("about:blank");
  const cdp = await page.createCDPSession();
  const frames = []; let n = 0;
  cdp.on("Page.screencastFrame", async (f) => { const file = path.join(FR, `${String(n++).padStart(6, "0")}.jpg`); fs.writeFileSync(file, Buffer.from(f.data, "base64")); frames.push({ file, ts: f.metadata.timestamp }); cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });

  const scenes = [];
  const scene = async (k, fn) => {
    const t = Date.now() / 1000;
    await prep().catch(() => {}); await caption(SCENES.find((s) => s.k === k).say).catch(() => {});
    const end = t + dur[k] + 0.5;
    await fn().catch((e) => console.log("scene", k, e.message));
    await prep().catch(() => {}); await caption(SCENES.find((s) => s.k === k).say).catch(() => {});
    while (Date.now() / 1000 < end) await sleep(100);
    scenes.push({ k, start: t, end: Date.now() / 1000 });
  };

  await scene("open", async () => { await page.goto(`${SITE}/p/100`, { waitUntil: "networkidle0" }); await waitPage(100); });
  await scene("quakes", async () => { await sleep(1200); await keys("300", 450); await waitPage(300); });
  await scene("biggest", async () => { await sleep(900); await page.keyboard.press("g"); await waitPage(301); });
  await scene("space", async () => { await sleep(300); await keys("400"); await waitPage(400); });
  await scene("debt", async () => { await keys("500"); await waitPage(500); await sleep(Math.max(1500, (dur.debt - 4) * 500)); await keys("503"); await waitPage(503); });
  await scene("recalls", async () => { await keys("700"); await waitPage(700); });
  await scene("curl", async () => {
    await page.goto(pathToFileURL(path.join(ROOT, "scripts/demo/term.html")).href, { waitUntil: "networkidle0" });
    await page.evaluate((cmd, out) => window.play(cmd, out, "bash"), `curl "${SITE.replace(/^https?:\/\//, "")}/api/page?n=300&format=ansi"`, ansi);
  });
  await scene("mcp", async () => { await page.evaluate((out) => window.play("node scripts/demo/agent.mjs 500", out, "agent"), mcpOut); });
  await scene("kiro", async () => {
    await page.goto("https://github.com/Mattbusel/cryptext/tree/main/.kiro/specs", { waitUntil: "networkidle2" });
    await sleep(Math.max(2500, dur.kiro * 250));
    await page.goto("https://github.com/Mattbusel/cryptext/blob/main/.kiro/specs/live-feed-fixes/bugfix.md", { waitUntil: "networkidle2" });
    await sleep(Math.max(3000, dur.kiro * 330));
    await page.goto("https://github.com/Mattbusel/cryptext/blob/main/.kiro/hooks/page-lint-on-stop.json", { waitUntil: "networkidle2" });
  });
  await scene("haunt", async () => { await page.goto(`${SITE}/p/100`, { waitUntil: "networkidle0" }); await waitPage(100); await keys("666"); await waitPage(666); await sleep(2200); await page.keyboard.press("?"); await page.waitForFunction(() => document.getElementById("screen").classList.contains("revealed"), { timeout: 5000 }).catch(() => {}); });
  await scene("outro", async () => { await sleep(1200); await keys("100"); await waitPage(100); });

  await cdp.send("Page.stopScreencast"); await browser.close();

  frames.sort((a, b) => a.ts - b.ts);
  const t0 = scenes[0].start, tEnd = scenes.at(-1).end;
  const use = frames.filter((f) => f.ts >= t0 - 0.05 && f.ts <= tEnd);
  const list = [];
  for (let i = 0; i < use.length; i++) { const b = i + 1 < use.length ? use[i + 1].ts : tEnd; list.push(`file '${use[i].file.replace(/\\/g, "/")}'`, `duration ${Math.max(0.001, b - use[i].ts).toFixed(4)}`); }
  list.push(`file '${use.at(-1).file.replace(/\\/g, "/")}'`);
  fs.writeFileSync(path.join(OUT, "frames.txt"), list.join("\n"));
  const args = ["-y", "-f", "concat", "-safe", "0", "-i", path.join(OUT, "frames.txt")];
  scenes.forEach((s) => args.push("-i", path.join(OUT, `${s.k}.wav`)));
  const delays = scenes.map((s, i) => `[${i + 1}:a]adelay=${Math.round((s.start - t0) * 1000)}|${Math.round((s.start - t0) * 1000)}[a${i}]`).join(";");
  const mix = scenes.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${scenes.length}:normalize=0,apad[aout]`;
  args.push("-filter_complex", `${delays};${mix};[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p[vout]`,
    "-map", "[vout]", "-map", "[aout]", "-t", (tEnd - t0).toFixed(2), "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "160k", path.join(OUT, "cryptext-demo.mp4"));
  const r = spawnSync("ffmpeg", args, { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error("ffmpeg: " + r.stderr.slice(-2500));
  console.log("video", path.join(OUT, "cryptext-demo.mp4"), "seconds", (tEnd - t0).toFixed(1), "frames", use.length);
}
main().catch((e) => { console.error(e); process.exit(1); });
