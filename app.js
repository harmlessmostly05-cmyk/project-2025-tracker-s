/* Project 2025 Tracker — v2 client logic
   Manifesto rules encoded here:
   - Two-tap filtering: agency, stage, status — each a single control.
   - TL;DR-first cards; deep dive expands with strict Plan vs. Now separation.
   - Every card shareable; shared links deep-link straight to the card.
   - Neutral copy only; the data files carry all substance. */

const PHASES = [
  { id: "pre-day1-prep", label: "Pre-Day 1 Preparation" },
  { id: "first-180-days", label: "First 180 Days" },
  { id: "personnel-schedule-f", label: "Personnel & Schedule F" },
  { id: "ongoing-rulemaking", label: "Ongoing Rulemaking & Litigation" },
];

const STATUSES = [
  { id: "proposed", label: "Proposed" },
  { id: "in-progress", label: "In Progress" },
  { id: "implemented", label: "Implemented" },
  { id: "blocked-stalled", label: "Blocked / Stalled" },
];

const THEME_LABELS = {
  "immigration-border": "Immigration & Border",
  "federal-workforce-personnel": "Civil Service",
  "education": "Education",
  "deregulation-environment": "Environment",
  "law-enforcement-doj": "Law Enforcement",
  "executive-power": "Executive Power",
  "health-policy": "Health",
  "economy-trade": "Economy",
  "national-security-defense": "National Security",
  "media-information": "Media & Information",
  "social-policy-family": "Social Policy",
};

const CRED_RANK = { High: 3, Medium: 2, Low: 1 };

const state = {
  recs: [],
  news: [],
  newsByRec: new Map(),
  theme: null,
  agency: "",
  phase: "",
  status: null,
  expanded: new Set(),
  deepLinkId: null,
};

async function loadData() {
  const v = Date.now(); // cache-bust: data updates should be visible immediately
  const [a, b] = await Promise.all([fetch(`data/recommendations.json?v=${v}`), fetch(`data/news.json?v=${v}`)]);
  state.recs = await a.json();
  state.news = await b.json();
  state.news.forEach((n) =>
    n.recommendation_ids.forEach((rid) => {
      if (!state.newsByRec.has(rid)) state.newsByRec.set(rid, []);
      state.newsByRec.get(rid).push(n);
    })
  );
}

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const statusLabel = (id) => (STATUSES.find((s) => s.id === id) || {}).label || id;
const phaseLabel = (id) => (PHASES.find((p) => p.id === id) || {}).label || id;

/* ---------- Theme status board ---------- */
function renderThemeBoard() {
  const board = document.getElementById("theme-board");
  board.innerHTML = "";
  const themes = {};
  state.recs.forEach((r) => r.theme.forEach((t) => (themes[t] = themes[t] || []).push(r)));
  Object.keys(themes)
    .sort((x, y) => themes[y].length - themes[x].length)
    .forEach((t) => {
      const list = themes[t];
      const counts = { implemented: 0, "in-progress": 0, "blocked-stalled": 0, proposed: 0 };
      list.forEach((r) => counts[r.status]++);
      const total = list.length;
      const pct = (k) => (counts[k] / total) * 100;
      const active = counts.implemented + counts["in-progress"];
      const row = document.createElement("button");
      row.className = "theme-row";
      row.type = "button";
      row.setAttribute("aria-pressed", String(state.theme === t));
      row.setAttribute(
        "aria-label",
        `${THEME_LABELS[t] || t}: ${counts.implemented} implemented, ${counts["in-progress"]} in progress, ${counts["blocked-stalled"]} blocked, ${counts.proposed} proposed. Tap to filter.`
      );
      row.innerHTML = `
        <div class="theme-row-top">
          <span class="theme-name">${THEME_LABELS[t] || t}</span>
          <span class="theme-stat">${active}/${total} active</span>
        </div>
        <div class="theme-track" aria-hidden="true">
          <span class="seg seg-implemented" style="width:${pct("implemented")}%"></span>
          <span class="seg seg-inprogress" style="width:${pct("in-progress")}%"></span>
          <span class="seg seg-blocked" style="width:${pct("blocked-stalled")}%"></span>
        </div>`;
      row.addEventListener("click", () => {
        state.theme = state.theme === t ? null : t;
        renderAll();
        if (state.theme) { try { document.getElementById("cards-anchor").scrollIntoView({ block: "start" }); } catch (_) {} }
      });
      board.appendChild(row);
    });
}

/* ---------- Filters ---------- */
function renderFilterControls() {
  const agencySel = document.getElementById("agency-select");
  if (agencySel.options.length <= 1) {
    [...new Set(state.recs.map((r) => r.department))].sort().forEach((d) => {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d.replace("Central Personnel Agencies: Managing the Bureaucracy", "Central Personnel Agencies");
      agencySel.appendChild(o);
    });
    PHASES.forEach((p) => {
      const o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.label;
      document.getElementById("phase-select").appendChild(o);
    });
  }
  const chipWrap = document.getElementById("status-chips");
  chipWrap.innerHTML = "";
  const allChip = document.createElement("button");
  allChip.className = "chip";
  allChip.type = "button";
  allChip.textContent = "All statuses";
  allChip.setAttribute("aria-pressed", String(state.status === null));
  allChip.addEventListener("click", () => { state.status = null; renderAll(); });
  chipWrap.appendChild(allChip);
  STATUSES.forEach((s) => {
    const n = state.recs.filter((r) => r.status === s.id).length;
    const c = document.createElement("button");
    c.className = "chip";
    c.type = "button";
    c.textContent = `${s.label} (${n})`;
    c.setAttribute("aria-pressed", String(state.status === s.id));
    c.addEventListener("click", () => {
      state.status = state.status === s.id ? null : s.id;
      renderAll();
    });
    chipWrap.appendChild(c);
  });
}

function getFiltered() {
  let list = state.recs.slice();
  if (state.theme) list = list.filter((r) => r.theme.includes(state.theme));
  if (state.agency) list = list.filter((r) => r.department === state.agency);
  if (state.phase) list = list.filter((r) => r.phase === state.phase);
  if (state.status) list = list.filter((r) => r.status === state.status);
  list.sort((a, b) => a.page - b.page);
  return list;
}

/* ---------- Cards ---------- */
function bestVerificationLink(items) {
  if (!items.length) return null;
  return items.slice().sort((a, b) => {
    const cr = (CRED_RANK[b.credibility] || 0) - (CRED_RANK[a.credibility] || 0);
    return cr !== 0 ? cr : (a.date < b.date ? 1 : -1);
  })[0];
}

function shareUrl(recId) {
  const u = new URL(window.location.href);
  u.hash = `rec-${recId}`;
  return u.toString();
}

function renderCard(rec) {
  const items = (state.newsByRec.get(rec.id) || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const verify = bestVerificationLink(items);
  const isOpen = state.expanded.has(rec.id);
  const matchCount = Math.min(items.length, 5);

  const card = document.createElement("article");
  card.className = "card";
  card.id = `rec-${rec.id}`;

  const dots = Array.from({ length: 5 }, (_, i) => `<i class="${i < matchCount ? "on" : ""}"></i>`).join("");

  card.innerHTML = `
    <div class="card-top">
      <span class="card-meta">${esc(rec.department.replace("Central Personnel Agencies: Managing the Bureaucracy", "Central Personnel Agencies"))} · ${phaseLabel(rec.phase)}</span>
      <span class="status-pill" data-status="${rec.status}">${statusLabel(rec.status)}</span>
    </div>
    <h3>${esc(rec.title)}</h3>
    <p class="tldr">${esc(rec.summary)}</p>
    <div class="match-line" title="${items.length} linked news report${items.length === 1 ? "" : "s"}">
      <span class="match-dots" aria-hidden="true">${dots}</span>
      <span class="match-caption">${items.length ? `${items.length} linked report${items.length === 1 ? "" : "s"}` : "No linked reporting yet"}</span>
    </div>
    <div class="verify-row">
      ${
        verify
          ? `<a class="verify-link" href="${verify.url}" target="_blank" rel="noopener noreferrer">Verify: ${esc(verify.source)} &nearr;</a>`
          : `<span class="match-caption">Awaiting correlated reporting</span>`
      }
      <div class="card-actions">
        <button class="icon-btn share-btn" type="button" aria-label="Share a link to this update">Share</button>
        <button class="icon-btn expand-btn" type="button" aria-expanded="${isOpen}" aria-controls="deep-${rec.id}">
          Deep dive <i class="chev" aria-hidden="true">&#9662;</i>
        </button>
      </div>
    </div>
    <div class="deep ${isOpen ? "open" : ""}" id="deep-${rec.id}">
      <div>
        <div class="deep-inner">
          <section class="pane pane-plan">
            <p class="pane-label">What the policy plan says</p>
            <blockquote>&ldquo;${esc(rec.quote)}&rdquo;</blockquote>
            <p class="cite">Mandate for Leadership (2023), p. ${rec.page}</p>
            <p class="plan-summary">${esc(rec.summary)}</p>
          </section>
          <section class="pane pane-now">
            <p class="pane-label">What is happening now</p>
            ${rec.status_note ? `<p class="status-note">${esc(rec.status_note)}</p>` : ""}
            ${
              items.length
                ? `<ul class="news-list">${items
                    .map(
                      (n) => `
                  <li class="news-item">
                    <div class="news-item-top">
                      <a class="headline" href="${n.url}" target="_blank" rel="noopener noreferrer">${esc(n.headline)}</a>
                      <span class="cred-badge" data-cred="${n.credibility}" title="${esc(n.credibility_rationale)}">${n.credibility}</span>
                    </div>
                    <div class="news-meta">${esc(n.source)} · ${n.date}</div>
                    <p class="news-summary">${esc(n.summary)}</p>
                  </li>`
                    )
                    .join("")}</ul>`
                : `<p class="no-news">No credible reporting correlated to this recommendation yet. Absence of coverage is not evidence of inaction.</p>`
            }
          </section>
        </div>
      </div>
    </div>`;

  card.querySelector(".expand-btn").addEventListener("click", (e) => {
    const btn = e.currentTarget;
    const deep = card.querySelector(".deep");
    const open = !state.expanded.has(rec.id);
    if (open) state.expanded.add(rec.id);
    else state.expanded.delete(rec.id);
    btn.setAttribute("aria-expanded", String(open));
    deep.classList.toggle("open", open);
  });

  card.querySelector(".share-btn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const url = shareUrl(rec.id);
    const shareData = { title: rec.title, text: `${rec.title} — ${statusLabel(rec.status)}`, url };
    if (navigator.share) {
      try { await navigator.share(shareData); return; } catch (_) { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      btn.textContent = "Link copied";
      btn.classList.add("copied");
      setTimeout(() => { btn.textContent = "Share"; btn.classList.remove("copied"); }, 1800);
    } catch (_) {
      window.prompt("Copy this link:", url);
    }
  });

  return card;
}

function renderCards() {
  const wrap = document.getElementById("card-list");
  const empty = document.getElementById("empty-state");
  const list = getFiltered();
  wrap.innerHTML = "";
  const filters = [];
  if (state.theme) filters.push(THEME_LABELS[state.theme] || state.theme);
  if (state.agency) filters.push("agency");
  if (state.phase) filters.push("stage");
  if (state.status) filters.push(statusLabel(state.status));
  document.getElementById("result-line").innerHTML =
    `<span>Showing <strong>${list.length}</strong> of <strong>${state.recs.length}</strong> tracked items${filters.length ? ` · filtered by ${esc(filters.join(", "))}` : ""}</span>` +
    (filters.length ? `<button class="text-btn" id="reset-inline" type="button">Reset</button>` : "");
  const resetBtn = document.getElementById("reset-inline");
  if (resetBtn) resetBtn.addEventListener("click", clearFilters);

  if (!list.length) {
    wrap.hidden = true;
    empty.hidden = false;
    return;
  }
  wrap.hidden = false;
  empty.hidden = true;
  list.forEach((r) => wrap.appendChild(renderCard(r)));
}

function clearFilters() {
  state.theme = null;
  state.agency = "";
  state.phase = "";
  state.status = null;
  document.getElementById("agency-select").value = "";
  document.getElementById("phase-select").value = "";
  renderAll();
}

function renderAll() {
  renderThemeBoard();
  renderFilterControls();
  renderCards();
}

/* ---------- Deep-linking (Core Loop: land on the card) ---------- */
function handleDeepLink() {
  const m = window.location.hash.match(/^#rec-(.+)$/);
  if (!m) return;
  const rec = state.recs.find((r) => r.id === m[1]);
  if (!rec) return;
  state.deepLinkId = rec.id;
  state.expanded.add(rec.id); // arrive with the deep dive open
  renderCards();
  const banner = document.getElementById("deeplink-banner");
  banner.hidden = false;
  document.getElementById("deeplink-label").textContent = `You're viewing a shared update: ${rec.title}`;
  requestAnimationFrame(() => {
    const el = document.getElementById(`rec-${rec.id}`);
    if (el) {
      el.classList.add("flash");
      setTimeout(() => el.classList.remove("flash"), 3500);
      try { el.scrollIntoView({ block: "start" }); } catch (_) {}
    }
  });
}

/* ---------- Static wiring ---------- */
function wire() {
  document.getElementById("agency-select").addEventListener("change", (e) => { state.agency = e.target.value; renderCards(); });
  document.getElementById("phase-select").addEventListener("change", (e) => { state.phase = e.target.value; renderCards(); });

  document.getElementById("deeplink-clear").addEventListener("click", () => {
    document.getElementById("deeplink-banner").hidden = true;
    history.replaceState(null, "", window.location.pathname + window.location.search);
    window.scrollTo({ top: 0 });
  });
  document.getElementById("empty-clear").addEventListener("click", clearFilters);

  const modal = document.getElementById("methodology-modal");
  const openBtn = document.getElementById("open-methodology");
  const closeBtn = document.getElementById("close-methodology");
  openBtn.addEventListener("click", () => { modal.hidden = false; closeBtn.focus(); });
  const close = () => { modal.hidden = true; openBtn.focus(); };
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) close(); });

  window.addEventListener("hashchange", handleDeepLink);
}

async function init() {
  wire();
  try {
    await loadData();
    renderAll();
    handleDeepLink();
  } catch (err) {
    const empty = document.getElementById("empty-state");
    document.getElementById("card-list").hidden = true;
    empty.hidden = false;
    empty.innerHTML = `<h3>Couldn't load tracker data</h3><p>This page fetches <code>data/*.json</code>, which browsers block over <code>file://</code>. Serve the folder locally (<code>python3 -m http.server</code>) or deploy it, then reload.</p>`;
    console.error(err);
  }
}

init();
