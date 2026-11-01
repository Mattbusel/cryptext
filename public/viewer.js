// CRYPTEXT viewer: renders the JSON page format on a CRT, with a teletext-style remote.
(() => {
  const $ = (s) => document.querySelector(s);
  const grid = $("#grid"), ghost = $("#ghost"), screen = $("#screen"), entry = $("#entry"), power = $("#poweron");
  const HOST = location.origin;
  let pages = [], current = 100, links = {}, digits = "", lastJson = null, busy = false;

  const pageFromUrl = () => {
    const m = location.pathname.match(/^\/p\/(\d{3})$/) || location.search.match(/[?&]n=(\d{3})/);
    return m ? Number(m[1]) : 100;
  };

  function renderCell(c) {
    const el = document.createElement("div");
    el.className = `cell f-${c.fg}` + (c.bg && c.bg !== "black" ? ` b-${c.bg}` : "") + (c.flash ? " flash" : "") + (c.conceal ? " conceal" : "") + (c.doubleHeight ? " dh" : "");
    if (c.mosaic && c.code >= 0x20) {
      const bits = c.sextantBits ?? c.code;
      const m = document.createElement("span");
      m.className = "m";
      for (const b of [0x01, 0x02, 0x04, 0x08, 0x10, 0x40]) {
        const i = document.createElement("i");
        if (bits & b) i.className = "on";
        m.appendChild(i);
      }
      el.appendChild(m);
    } else {
      el.textContent = c.code < 0x20 ? " " : String.fromCharCode(c.code); // the cell code carries concealed text; CSS hides it until Reveal
      el.classList.add("t");
    }
    return el;
  }

  function render(json) {
    const frag = document.createDocumentFragment();
    json.rows.forEach((row, r) => {
      const hidden = r > 0 && json.rows[r - 1].cells.some((c) => c.doubleHeight);
      row.cells.forEach((c) => {
        const el = renderCell(c);
        if (hidden) el.classList.add("row-hidden");
        frag.appendChild(el);
      });
    });
    grid.replaceChildren(frag);
    const echo = grid.cloneNode(true); echo.removeAttribute("id"); ghost.replaceChildren(echo);
    links = json.fastextLinks || {};
    screen.classList.toggle("haunt", json.pageNumber === 666);
    for (const k of ["red", "green", "yellow", "cyan"]) {
      const b = document.querySelector(`.fx.${k}`);
      b.title = links[k] ? `Page ${links[k]}` : "No link";
      b.disabled = !links[k];
    }
  }

  function setHeaderCounter(n) {
    // the first 4 cells of the header show the page being searched for, like a real set
    const s = "P" + String(n).padStart(3, "0");
    [...grid.children].slice(0, 4).forEach((el, i) => { el.textContent = s[i]; el.className = "cell f-white"; });
  }

  async function fetchPage(n) {
    const r = await fetch(`/api/page?n=${n}&format=json`);
    if (!r.ok) throw new Error(r.status === 404 ? "no such page" : `HTTP ${r.status}`);
    return r.json();
  }

  async function go(n, { push = true, animate = false, refresh = false } = {}) {
    if (busy && !refresh) return;
    busy = true;
    entry.textContent = "P" + n;
    let rolling = null;
    if (!refresh && lastJson) {
      screen.classList.add("searching");
      let k = current;
      rolling = setInterval(() => { k = k >= 899 ? 100 : k + 1; setHeaderCounter(k); }, 45);
    }
    try {
      const [json] = await Promise.all([fetchPage(n), refresh ? null : new Promise((r) => setTimeout(r, 600))]);
      clearInterval(rolling);
      current = n; lastJson = json;
      render(json);
      if (animate) { power.classList.remove("on"); void power.offsetWidth; power.classList.add("on"); }
      if (push) history.pushState({ n }, "", `/p/${n}`);
      document.title = `CRYPTEXT P${n} ${json.title || ""}`.trim();
      updatePanel();
    } catch (e) {
      clearInterval(rolling);
      if (lastJson) render(lastJson);
      entry.textContent = `P${n} ${e.message === "no such page" ? "NONE" : "ERR"}`;
    } finally {
      screen.classList.remove("searching");
      busy = false;
    }
  }

  function updatePanel() {
    $("#curlcmd").textContent = `curl "${HOST}/api/page?n=${current}&format=ansi"`;
    $("#textlink").href = `/api/page?n=${current}&format=json`;
    const tti = $("#ttilink");
    tti.href = `/api/page?n=${current}&format=tti`;
    tti.download = `P${current}.tti`;
  }

  function digit(d) {
    digits += d;
    entry.textContent = ("P" + digits).padEnd(4, "_");
    if (digits.length === 3) {
      const n = Number(digits);
      digits = "";
      if (n >= 100 && n <= 899 || n === 666) go(n);
      else entry.textContent = "P" + n + " ?";
    }
  }

  function step(dir) {
    const nums = pages.map((p) => p.n);
    if (!nums.length) return;
    let i = nums.indexOf(current);
    i = i < 0 ? 0 : (i + dir + nums.length) % nums.length;
    go(nums[i]);
  }

  function fastext(k) { if (links[k]) go(links[k]); }
  function reveal() { screen.classList.toggle("revealed"); ghost.classList.toggle("revealed"); }

  // remote
  document.querySelectorAll("[data-d]").forEach((b) => b.addEventListener("click", () => digit(b.dataset.d)));
  document.querySelectorAll("[data-fx]").forEach((b) => b.addEventListener("click", () => fastext(b.dataset.fx)));
  $("#prev").addEventListener("click", () => step(-1));
  $("#next").addEventListener("click", () => step(1));
  $("#index").addEventListener("click", () => go(100));
  $("#reveal").addEventListener("click", reveal);
  $("#k666").addEventListener("click", () => go(666));

  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) digit(e.key);
    else if (e.key === "ArrowUp" || e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") step(-1);
    else if (e.key === "?") reveal();
    else {
      const k = { r: "red", g: "green", y: "yellow", c: "cyan" }[e.key.toLowerCase()];
      if (k) fastext(k); else return;
    }
    e.preventDefault();
  });
  addEventListener("popstate", (e) => go(e.state?.n ?? pageFromUrl(), { push: false }));

  // panel tabs + copy
  document.querySelectorAll("[data-tab]").forEach((t) => t.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    document.querySelectorAll("[data-body]").forEach((b) => (b.hidden = b.dataset.body !== t.dataset.tab));
  }));
  document.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("#" + b.dataset.copy).textContent); b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1200); } catch { /* clipboard blocked */ }
  }));

  // boot
  fetch("/api/pages").then((r) => r.json()).then((p) => (pages = p)).catch(() => {});
  go(pageFromUrl(), { push: false, animate: true });
  setInterval(() => { if (!busy && !digits) go(current, { push: false, refresh: true }); }, 60000);
})();
