// =====================================================
//  admin.js — Panneau d'administration TTSmaintenance
// =====================================================

const API = "/api";
let adminToken    = null;
let allUsers      = [];
let allLogs       = [];
let pendingAction = null;

// ── Horloge live ──────────────────────────────────────
setInterval(() => {
  const el = document.getElementById("liveTime");
  if (el) el.textContent = new Date().toLocaleTimeString("fr-FR");
}, 1000);

// =====================================================
//  LOGOUT
// =====================================================
function logout() {
  adminToken = null;
  sessionStorage.removeItem("adminToken");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "../Login/login.html";
}

// =====================================================
//  INIT — vérifie le token au chargement
// =====================================================
window.addEventListener("DOMContentLoaded", () => {
  // Récupérer le token stocké par login.js (sessionStorage ou localStorage)
  const token = sessionStorage.getItem("token")
             || localStorage.getItem("token")
             || sessionStorage.getItem("adminToken");

  const user = JSON.parse(
    sessionStorage.getItem("user") ||
    localStorage.getItem("user") || "null"
  );

  // Si pas de token ou pas admin → rediriger vers login
  if (!token || !user || user.role !== "admin") {
    window.location.href = "../Login/login.html";
    return;
  }

  adminToken = token;
  // Synchroniser sous adminToken pour les appels suivants
  sessionStorage.setItem("adminToken", adminToken);

  initApp();
});

function initApp() {
  loadOverview();
  loadSessions();
  loadUsers();
  loadLogs();
  loadLockStatus();
}

// =====================================================
//  NAVIGATION
// =====================================================
function switchTab(name) {
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(b   => b.classList.remove("active"));
  document.getElementById(`tab-${name}`)?.classList.add("active");
  document.querySelector(`[onclick="switchTab('${name}')"]`)?.classList.add("active");

  if (name === "overview") loadOverview();
  if (name === "sessions") loadSessions();
  if (name === "users")    loadUsers();
  if (name === "logs")     loadLogs();
  if (name === "access")   { loadUsers(); loadLockStatus(); }
}

// =====================================================
//  FETCH AUTHENTIFIÉ
// =====================================================
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
      ...options.headers,
    },
  });
  // Token expiré ou invalide → retour au login
  if (res.status === 401 || res.status === 403) {
    logout();
    return null;
  }
  return res;
}

// =====================================================
//  TOAST
// =====================================================
function showToast(msg, type = "info") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className   = `show ${type}`;
  setTimeout(() => t.classList.remove("show"), 3000);
}

// =====================================================
//  MODAL CONFIRMATION
// =====================================================
function openModal(title, text, color, fn) {
  pendingAction = fn;
  document.getElementById("modalTitle").textContent    = title;
  document.getElementById("modalText").textContent     = text;
  document.getElementById("modalConfirmBtn").className = `btn-confirm ${color}`;
  document.getElementById("confirmModal").classList.add("open");
}
function closeModal()  { document.getElementById("confirmModal").classList.remove("open"); pendingAction = null; }
function modalAction() { if (pendingAction) pendingAction(); closeModal(); }

// =====================================================
//  UTILITAIRES
// =====================================================
function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function formatDateShort(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}
function logClass(action) {
  return { CREATE:"log-create", UPDATE:"log-update", DELETE:"log-delete", LOGIN:"log-login", BLOCK:"log-block" }[action] || "";
}

// =====================================================
//  OVERVIEW
// =====================================================
async function loadOverview() {
  const res = await apiFetch(`${API}/admin/stats`);
  if (!res) return;
  const data = await res.json();

  document.getElementById("stat-sessions").textContent = data.activeSessions ?? "—";
  document.getElementById("stat-users").textContent    = data.totalUsers     ?? "—";
  document.getElementById("stat-blocked").textContent  = data.blockedUsers   ?? "—";
  document.getElementById("stat-mods").textContent     = data.mods24h        ?? "—";

  const lock = await apiFetch(`${API}/admin/lock`);
  if (lock) {
    const d = await lock.json();
    document.getElementById("lockBanner").classList.toggle("hidden", !d.locked);
  }
  renderLogsTable(data.recentLogs || [], "recentLogsTable");
}

// =====================================================
//  SESSIONS
// =====================================================
async function loadSessions() {
  const res = await apiFetch(`${API}/admin/sessions`);
  if (!res) return;
  const sessions = await res.json();
  const tbody = document.getElementById("sessionsTable");

  if (!sessions.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Aucune session active</td></tr>`;
    return;
  }
  tbody.innerHTML = sessions.map(s => `
    <tr>
      <td><strong>${s.username}</strong></td>
      <td><code>${s.ip_address || "—"}</code></td>
      <td>${formatDate(s.created_at)}</td>
      <td>${formatDate(s.last_activity)}</td>
      <td><span class="badge online"><span class="pulse-dot"></span>En ligne</span></td>
      <td><button class="action-btn kick" onclick="kickSession('${s.session_id}','${s.username}')">Kick</button></td>
    </tr>
  `).join("");
}

async function kickSession(sessionId, username) {
  openModal("Déconnecter l'utilisateur", `Forcer la déconnexion de "${username}" ?`, "red", async () => {
    const res = await apiFetch(`${API}/admin/sessions/${sessionId}`, { method: "DELETE" });
    if (res?.ok) { showToast(`${username} déconnecté`, "success"); loadSessions(); loadOverview(); }
    else showToast("Erreur lors du kick", "error");
  });
}
function confirmKickAll() {
  openModal("Déconnecter tout le monde", "Toutes les sessions (hors admin) seront supprimées.", "red", async () => {
    const res = await apiFetch(`${API}/admin/sessions`, { method: "DELETE" });
    if (res?.ok) { showToast("Toutes les sessions supprimées", "success"); loadSessions(); loadOverview(); }
    else showToast("Erreur", "error");
  });
}

// =====================================================
//  UTILISATEURS
// =====================================================
async function loadUsers() {
  const res = await apiFetch(`${API}/admin/users`);
  if (!res) return;
  allUsers = await res.json();
  renderUsersTable();
  renderAccessTable();
}

function renderUsersTable() {
  const tbody = document.getElementById("usersTable");
  if (!allUsers.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Aucun utilisateur</td></tr>`;
    return;
  }
  tbody.innerHTML = allUsers.map(u => `
    <tr>
      <td><strong>${u.username}</strong></td>
      <td>${u.email || "<span style='color:var(--text-dim)'>—</span>"}</td>
      <td><span class="badge ${u.role === 'admin' ? 'warning' : 'info'}">${u.role}</span></td>
      <td>${formatDate(u.last_login)}</td>
      <td><span class="badge ${u.is_blocked ? 'blocked' : 'online'}">${u.is_blocked ? '🔒 Bloqué' : '✓ Actif'}</span></td>
      <td>
        <button class="action-btn unblock" onclick="openUserStats(${u.id_user})" title="Statistiques">📊</button>
      </td>
      <td style="display:flex;gap:0.4rem;flex-wrap:wrap;">
        <button class="action-btn unblock" onclick="openEditUserModal(${u.id_user})">Modifier</button>
        ${u.is_blocked
          ? `<button class="action-btn unblock" onclick="toggleBlock(${u.id_user},false,'')">Débloquer</button>`
          : `<button class="action-btn kick"    onclick="openBlockModal(${u.id_user},'${u.username}')">Bloquer</button>`
        }
        <button class="action-btn block" onclick="confirmDeleteUser(${u.id_user},'${u.username}')">Supprimer</button>
      </td>
    </tr>
  `).join("");
}

// =====================================================
//  STATS UTILISATEUR — drawer latéral
// =====================================================
async function openUserStats(id) {
  const drawer  = document.getElementById("statsDrawer");
  const content = document.getElementById("statsDrawerContent");
  content.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-dim);font-family:var(--mono);font-size:0.8rem;">Chargement…</div>`;
  drawer.classList.add("open");
  document.getElementById("statsOverlay")?.classList.add("open");

  const res = await apiFetch(`${API}/admin/users/${id}/stats`);
  if (!res) { content.innerHTML = `<p style="color:var(--red)">Erreur de chargement</p>`; return; }
  const d = await res.json();

  const u        = d.user;
  const isOnline = d.activeSessions.length > 0;
  const heatmapHtml  = buildHeatmap(d.heatmapRows);
  const hourChartHtml = buildHourBar(d.loginsByHour);
  const sparkHtml    = buildSparkline(d.loginsByDay);
  const totalActions = Object.values(d.crudStats).reduce((a, b) => a + b, 0);
  const crudHtml     = buildCrudBars(d.crudStats, totalActions);

  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border);">
      <div style="width:52px;height:52px;border-radius:50%;background:var(--surface3);border:2px solid var(--border-bright);display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800;color:var(--primary-blue);flex-shrink:0;">
        ${u.username.charAt(0).toUpperCase()}
      </div>
      <div>
        <div style="font-size:1.1rem;font-weight:800;color:var(--text);display:flex;align-items:center;gap:0.6rem;">
          ${u.username}
          <span class="badge ${isOnline ? 'online' : 'offline'}" style="font-size:0.6rem;">
            ${isOnline ? '<span class="pulse-dot"></span>En ligne' : 'Hors ligne'}
          </span>
        </div>
        <div style="font-family:var(--mono);font-size:0.72rem;color:var(--text-dim);margin-top:0.2rem;">
          ${u.email || 'Pas d\'email'} &nbsp;·&nbsp;
          <span class="badge ${u.role === 'admin' ? 'warning' : 'info'}" style="font-size:0.6rem;">${u.role}</span>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.75rem;margin-bottom:1.5rem;">
      ${kpiCard('Connexions', d.totalLogins, '🔑')}
      ${kpiCard('Jours actifs', d.activeDays, '📅')}
      ${kpiCard('Actions totales', totalActions, '⚡')}
      ${kpiCard('Sessions actives', d.activeSessions.length, '🟢')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1.5rem;">
      <div style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-md);padding:1rem;">
        <div style="font-family:var(--mono);font-size:0.65rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-dim);margin-bottom:0.4rem;">Heure de prédilection</div>
        <div style="font-size:1.6rem;font-weight:800;color:var(--primary-blue);text-shadow:0 0 18px var(--glow-blue);">
          ${d.preferredHour !== null ? `${String(d.preferredHour).padStart(2,'0')}h` : '—'}
        </div>
      </div>
      <div style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-md);padding:1rem;">
        <div style="font-family:var(--mono);font-size:0.65rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-dim);margin-bottom:0.4rem;">Première connexion</div>
        <div style="font-size:0.85rem;font-weight:700;color:var(--text);font-family:var(--mono);">${formatDate(d.firstSeen)}</div>
      </div>
    </div>

    <div style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-md);padding:1.1rem;margin-bottom:1rem;">
      <div style="font-family:var(--mono);font-size:0.65rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-dim);margin-bottom:0.85rem;">Activité — 90 derniers jours</div>
      ${heatmapHtml}
    </div>

    <div style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-md);padding:1.1rem;margin-bottom:1rem;">
      <div style="font-family:var(--mono);font-size:0.65rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-dim);margin-bottom:0.85rem;">Connexions — 30 derniers jours</div>
      ${sparkHtml}
    </div>

    <div style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-md);padding:1.1rem;margin-bottom:1rem;">
      <div style="font-family:var(--mono);font-size:0.65rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-dim);margin-bottom:0.85rem;">Répartition par heure</div>
      ${hourChartHtml}
    </div>

    <div style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-md);padding:1.1rem;margin-bottom:1rem;">
      <div style="font-family:var(--mono);font-size:0.65rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-dim);margin-bottom:0.85rem;">Répartition des actions</div>
      ${crudHtml}
    </div>

    ${d.topIPs.length ? `
    <div style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-md);padding:1.1rem;margin-bottom:1rem;">
      <div style="font-family:var(--mono);font-size:0.65rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-dim);margin-bottom:0.85rem;">Adresses IP fréquentes</div>
      ${d.topIPs.map((ip, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.45rem 0;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:0.78rem;">
          <span style="color:${i === 0 ? 'var(--primary-blue)' : 'var(--text-dim)'}">${i === 0 ? '⭐' : '▸'} <code>${ip.ip_address}</code></span>
          <span style="color:var(--text-dim)">${ip.cnt} fois</span>
        </div>
      `).join("")}
    </div>` : ''}

    ${d.activeSessions.length ? `
    <div style="background:var(--surface3);border:1px solid var(--border-bright);border-radius:var(--radius-md);padding:1.1rem;margin-bottom:1rem;">
      <div style="font-family:var(--mono);font-size:0.65rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--green);margin-bottom:0.85rem;"><span class="pulse-dot"></span> Sessions actives</div>
      ${d.activeSessions.map(s => `
        <div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:0.75rem;">
          <code style="color:var(--secondary-blue)">${s.ip_address || '—'}</code>
          <span style="color:var(--text-dim)">${formatDate(s.last_activity)}</span>
        </div>
      `).join("")}
    </div>` : ''}

    <div style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-md);padding:1.1rem;">
      <div style="font-family:var(--mono);font-size:0.65rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-dim);margin-bottom:0.85rem;">Dernières actions</div>
      ${d.recentActions.length ? d.recentActions.map(a => `
        <div style="display:flex;gap:0.75rem;align-items:flex-start;padding:0.5rem 0;border-bottom:1px solid var(--border);">
          <span class="${logClass(a.action)}" style="font-family:var(--mono);font-size:0.68rem;font-weight:700;min-width:55px;">${a.action}</span>
          <span style="font-size:0.78rem;color:var(--text);flex:1;">${a.detail || a.table_name || '—'}</span>
          <span style="font-family:var(--mono);font-size:0.68rem;color:var(--text-dim);white-space:nowrap;">${formatDate(a.created_at)}</span>
        </div>
      `).join("") : `<div style="color:var(--text-dim);font-family:var(--mono);font-size:0.8rem;">Aucune action enregistrée</div>`}
    </div>
  `;
}

function kpiCard(label, value, icon) {
  return `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:1rem;text-align:center;position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--primary-blue),var(--secondary-blue));"></div>
      <div style="font-size:1.4rem;margin-bottom:0.25rem;">${icon}</div>
      <div style="font-size:1.5rem;font-weight:800;color:var(--primary-blue);line-height:1;letter-spacing:-0.03em;text-shadow:0 0 16px var(--glow-blue);">${value ?? '—'}</div>
      <div style="font-family:var(--mono);font-size:0.62rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-dim);margin-top:0.35rem;">${label}</div>
    </div>
  `;
}

function buildHeatmap(rows) {
  const map = {};
  rows.forEach(r => { map[r.day?.slice(0,10) || r.day] = r.cnt; });
  const today = new Date(); today.setHours(0,0,0,0);
  const DAYS=91, W=14, GAP=2, COLS=13;
  const cells = [];
  for (let i = DAYS-1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate()-i);
    const key = d.toISOString().slice(0,10);
    const cnt = map[key] || 0;
    cells.push({ key, cnt, col: Math.floor((DAYS-1-i)/7), row: d.getDay() });
  }
  const maxCnt = Math.max(1, ...cells.map(c => c.cnt));
  const svgW = COLS*(W+GAP), svgH = 7*(W+GAP);
  const rects = cells.map(c => {
    const alpha = c.cnt===0 ? 0.08 : 0.15+0.85*(c.cnt/maxCnt);
    return `<rect x="${c.col*(W+GAP)}" y="${c.row*(W+GAP)}" width="${W}" height="${W}" rx="2" fill="rgba(79,142,247,${alpha})" stroke="rgba(79,142,247,0.06)" stroke-width="0.5"><title>${c.key} : ${c.cnt} action(s)</title></rect>`;
  }).join("");
  return `<svg width="100%" viewBox="0 0 ${svgW} ${svgH}" style="overflow:visible;">${rects}</svg>
  <div style="display:flex;align-items:center;gap:0.4rem;margin-top:0.5rem;font-family:var(--mono);font-size:0.62rem;color:var(--text-muted);">
    <span>Moins</span>${[0.08,0.25,0.5,0.75,1].map(a=>`<span style="width:10px;height:10px;border-radius:2px;background:rgba(79,142,247,${a});display:inline-block;"></span>`).join("")}<span>Plus</span>
  </div>`;
}

function buildSparkline(loginsByDay) {
  if (!loginsByDay.length) return `<div style="color:var(--text-dim);font-family:var(--mono);font-size:0.78rem;">Aucune connexion</div>`;
  const today = new Date(); today.setHours(0,0,0,0);
  const map = {};
  loginsByDay.forEach(r => { map[r.day?.slice(0,10)||r.day] = r.cnt; });
  const points = [];
  for (let i=29;i>=0;i--) {
    const d = new Date(today); d.setDate(today.getDate()-i);
    points.push({ label: formatDateShort(d), cnt: map[d.toISOString().slice(0,10)]||0 });
  }
  const maxY=Math.max(1,...points.map(p=>p.cnt)), W=540, H=60, xStep=W/(points.length-1);
  const pts = points.map((p,i)=>`${i*xStep},${H-(p.cnt/maxY)*H}`).join(" ");
  const fillPts = `0,${H} ${pts} ${(points.length-1)*xStep},${H}`;
  return `<svg width="100%" viewBox="0 0 ${W} ${H+10}" style="overflow:visible;">
    <defs><linearGradient id="spfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(79,142,247,0.3)"/><stop offset="100%" stop-color="rgba(79,142,247,0)"/></linearGradient></defs>
    <polygon points="${fillPts}" fill="url(#spfill)"/>
    <polyline points="${pts}" fill="none" stroke="var(--primary-blue)" stroke-width="1.5" stroke-linejoin="round"/>
    ${points.map((p,i)=>p.cnt>0?`<circle cx="${i*xStep}" cy="${H-(p.cnt/maxY)*H}" r="3" fill="var(--primary-blue)" opacity="0.8"><title>${p.label} : ${p.cnt}</title></circle>`:'').join("")}
  </svg>
  <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:0.6rem;color:var(--text-muted);margin-top:0.25rem;"><span>${points[0].label}</span><span>Aujourd'hui</span></div>`;
}

function buildHourBar(loginsByHour) {
  const map={};
  loginsByHour.forEach(r=>{map[r.hour]=r.cnt;});
  const maxCnt=Math.max(1,...Object.values(map)), W=540, H=48, barW=Math.floor(W/24)-1;
  const bars = Array.from({length:24},(_,h)=>{
    const cnt=map[h]||0, bh=cnt===0?2:Math.max(3,(cnt/maxCnt)*H);
    return `<rect x="${h*(W/24)}" y="${H-bh}" width="${barW}" height="${bh}" rx="2" fill="${cnt===maxCnt&&cnt>0?'var(--accent-orange)':'rgba(79,142,247,0.55)'}"><title>${String(h).padStart(2,'0')}h : ${cnt} connexion(s)</title></rect>`;
  }).join("");
  const labels = [0,6,12,18,23].map(h=>`<text x="${h*(W/24)+barW/2}" y="${H+14}" text-anchor="middle" font-size="9" font-family="JetBrains Mono, monospace" fill="rgba(122,138,176,0.8)">${String(h).padStart(2,'0')}h</text>`).join("");
  return `<svg width="100%" viewBox="0 0 ${W} ${H+20}" style="overflow:visible;">${bars}${labels}</svg>`;
}

function buildCrudBars(stats, total) {
  const items = [
    {key:'LOGIN',label:'Connexions',color:'var(--accent-orange)'},
    {key:'CREATE',label:'Créations',color:'var(--success)'},
    {key:'UPDATE',label:'Modifications',color:'var(--primary-blue)'},
    {key:'DELETE',label:'Suppressions',color:'var(--danger)'},
    {key:'BLOCK',label:'Blocages',color:'#a855f7'},
  ];
  if (total===0) return `<div style="color:var(--text-dim);font-family:var(--mono);font-size:0.78rem;">Aucune action</div>`;
  return items.map(item=>{
    const cnt=stats[item.key]||0, pct=total>0?((cnt/total)*100).toFixed(1):0, fill=total>0?(cnt/total)*100:0;
    return `<div style="margin-bottom:0.6rem;">
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:0.72rem;margin-bottom:0.2rem;">
        <span style="color:var(--text-dim)">${item.label}</span>
        <span style="color:var(--text)">${cnt} <span style="color:var(--text-muted)">(${pct}%)</span></span>
      </div>
      <div style="height:5px;background:var(--surface);border-radius:100px;overflow:hidden;">
        <div style="height:100%;width:${fill}%;background:${item.color};border-radius:100px;transition:width 0.4s;"></div>
      </div>
    </div>`;
  }).join("");
}

function closeStatsDrawer() {
  document.getElementById("statsDrawer").classList.remove("open");
}

// =====================================================
//  MODAL CRÉER / MODIFIER UN UTILISATEUR
// =====================================================
function openCreateUserModal() {
  document.getElementById("userModalTitle").textContent      = "Créer un utilisateur";
  document.getElementById("userModalId").value               = "";
  document.getElementById("userModalName").value             = "";
  document.getElementById("userModalEmail").value            = "";
  document.getElementById("userModalRole").value             = "user";
  document.getElementById("userModalPass").value             = "";
  document.getElementById("userModalPassRow").style.display  = "block";
  document.getElementById("userModalPassHint").style.display = "none";
  document.getElementById("userModal").style.display         = "flex";
}
function openEditUserModal(id) {
  const u = allUsers.find(u => u.id_user === id);
  if (!u) return;
  document.getElementById("userModalTitle").textContent      = `Modifier "${u.username}"`;
  document.getElementById("userModalId").value               = u.id_user;
  document.getElementById("userModalName").value             = u.username;
  document.getElementById("userModalEmail").value            = u.email || "";
  document.getElementById("userModalRole").value             = u.role;
  document.getElementById("userModalPass").value             = "";
  document.getElementById("userModalPassRow").style.display  = "block";
  document.getElementById("userModalPassHint").style.display = "block";
  document.getElementById("userModal").style.display         = "flex";
}
function closeUserModal() { document.getElementById("userModal").style.display = "none"; }

async function submitUserModal() {
  const id       = document.getElementById("userModalId").value;
  const username = document.getElementById("userModalName").value.trim();
  const email    = document.getElementById("userModalEmail").value.trim();
  const role     = document.getElementById("userModalRole").value;
  const password = document.getElementById("userModalPass").value;

  if (!username) { showToast("Le nom d'utilisateur est requis", "error"); return; }
  if (!id && !password) { showToast("Le mot de passe est requis pour la création", "error"); return; }

  const body = { username, email, role };
  if (password) body.password = password;

  const res = await apiFetch(
    id ? `${API}/admin/users/${id}` : `${API}/admin/users`,
    { method: id ? "PUT" : "POST", body: JSON.stringify(body) }
  );
  if (!res) return;
  const data = await res.json();
  if (!res.ok) { showToast(data.error || "Erreur", "error"); return; }

  showToast(id ? `"${username}" mis à jour` : `Utilisateur "${username}" créé`, "success");
  closeUserModal();
  loadUsers();
  loadOverview();
}

// =====================================================
//  BLOQUER
// =====================================================
function openBlockModal(id, username) {
  document.getElementById("blockUserId").value         = id;
  document.getElementById("blockUserName").textContent = username;
  document.getElementById("blockReason").value         = "";
  document.getElementById("blockModal").style.display  = "flex";
}
function closeBlockModal() { document.getElementById("blockModal").style.display = "none"; }
async function submitBlock() {
  const id     = document.getElementById("blockUserId").value;
  const reason = document.getElementById("blockReason").value.trim();
  await toggleBlock(id, true, reason);
  closeBlockModal();
}
async function toggleBlock(id, block, reason) {
  const res = await apiFetch(`${API}/admin/users/${id}/block`, {
    method: "POST",
    body: JSON.stringify({ block, reason }),
  });
  if (!res) return;
  const data = await res.json();
  if (!res.ok) { showToast(data.error || "Erreur", "error"); return; }
  showToast(block ? "Utilisateur bloqué" : "Utilisateur débloqué", "success");
  loadUsers();
  loadOverview();
}

// =====================================================
//  SUPPRIMER UN UTILISATEUR
// =====================================================
function confirmDeleteUser(id, username) {
  openModal("Supprimer l'utilisateur", `Supprimer le compte "${username}" ? Cette action est irréversible.`, "red", async () => {
    const res = await apiFetch(`${API}/admin/users/${id}`, { method: "DELETE" });
    if (!res) return;
    const data = await res.json();
    if (!res.ok) { showToast(data.error || "Erreur", "error"); return; }
    showToast(`"${username}" supprimé`, "success");
    loadUsers();
    loadOverview();
  });
}

// =====================================================
//  TAB ACCESS
// =====================================================
function renderAccessTable() {
  const tbody = document.getElementById("accessTable");
  if (!allUsers.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Aucun utilisateur</td></tr>`;
    return;
  }
  tbody.innerHTML = allUsers.map(u => `
    <tr>
      <td><strong>${u.username}</strong></td>
      <td>${u.email || "—"}</td>
      <td><span class="badge ${u.role === 'admin' ? 'warning' : 'info'}">${u.role}</span></td>
      <td><span class="badge ${u.is_blocked ? 'blocked' : 'online'}">${u.is_blocked ? '🔒 Bloqué' : '✓ Actif'}</span></td>
      <td style="color:var(--text-dim);font-size:0.78rem;">${u.block_reason || "—"}</td>
      <td>
        ${u.is_blocked
          ? `<button class="action-btn unblock" onclick="toggleBlock(${u.id_user},false,'')">Débloquer</button>`
          : `<button class="action-btn block"   onclick="openBlockModal(${u.id_user},'${u.username}')">Bloquer</button>`
        }
      </td>
    </tr>
  `).join("");
}

// =====================================================
//  LOGS
// =====================================================
async function loadLogs() {
  const action = document.getElementById("logType")?.value || "";
  const res    = await apiFetch(`${API}/admin/logs?limit=200${action ? `&action=${action}` : ""}`);
  if (!res) return;
  allLogs = await res.json();
  filterLogs();
}
function filterLogs() {
  const search   = (document.getElementById("logSearch")?.value || "").toLowerCase();
  const type     = document.getElementById("logType")?.value || "";
  const filtered = allLogs.filter(l => {
    const matchType   = !type   || l.action === type;
    const matchSearch = !search ||
      (l.username || "").toLowerCase().includes(search) ||
      (l.detail   || "").toLowerCase().includes(search) ||
      (l.action   || "").toLowerCase().includes(search);
    return matchType && matchSearch;
  });
  renderLogsTable(filtered, "logsTable");
}
function renderLogsTable(logs, tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="${tbodyId === 'logsTable' ? 6 : 5}" class="empty">Aucun log</td></tr>`;
    return;
  }
  tbody.innerHTML = logs.map(l => `
    <tr>
      <td style="font-size:0.75rem;color:var(--text-dim)">${formatDate(l.created_at)}</td>
      <td><strong>${l.username || "—"}</strong></td>
      <td><span class="${logClass(l.action)}">${l.action}</span></td>
      ${tbodyId === "logsTable" ? `<td style="color:var(--text-dim)">${l.table_name || "—"}</td>` : ""}
      <td style="font-size:0.8rem;">${l.detail || "—"}</td>
      <td style="font-size:0.75rem;color:var(--text-dim)">${l.ip_address || "—"}</td>
    </tr>
  `).join("");
}
function confirmClearLogs() {
  openModal("Vider les logs", "Tous les logs seront supprimés. Action irréversible.", "red", async () => {
    const res = await apiFetch(`${API}/admin/logs`, { method: "DELETE" });
    if (res?.ok) { showToast("Logs supprimés", "success"); loadLogs(); }
    else showToast("Erreur", "error");
  });
}

// =====================================================
//  VERROU GLOBAL
// =====================================================
async function loadLockStatus() {
  const res = await apiFetch(`${API}/admin/lock`);
  if (!res) return;
  const data = await res.json();
  document.getElementById("globalLockToggle").checked     = data.locked;
  document.getElementById("lockMessage").value            = data.message || "";
  document.getElementById("lockMessageBox").style.display = data.locked ? "block" : "none";
  document.getElementById("lockBanner").classList.toggle("hidden", !data.locked);
}
async function toggleGlobalLock() {
  const locked  = document.getElementById("globalLockToggle").checked;
  const message = document.getElementById("lockMessage").value;
  document.getElementById("lockMessageBox").style.display = locked ? "block" : "none";
  const res = await apiFetch(`${API}/admin/lock`, {
    method: "POST",
    body: JSON.stringify({ locked, message }),
  });
  if (res?.ok) {
    showToast(locked ? "Application verrouillée" : "Application déverrouillée", locked ? "error" : "success");
    loadOverview();
  } else {
    document.getElementById("globalLockToggle").checked = !locked;
    showToast("Erreur lors du verrouillage", "error");
  }
}
async function saveLockMessage() {
  const locked  = document.getElementById("globalLockToggle").checked;
  const message = document.getElementById("lockMessage").value;
  const res = await apiFetch(`${API}/admin/lock`, {
    method: "POST", body: JSON.stringify({ locked, message }),
  });
  if (res?.ok) showToast("Message sauvegardé", "success");
  else showToast("Erreur", "error");
}