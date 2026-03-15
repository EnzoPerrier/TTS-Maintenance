// =====================================================
//  admin.js  — Frontend du panneau d'administration
// =====================================================

const API = "http://192.168.1.127:3000"; // même adresse que script.js
const ADMIN_TOKEN_KEY = "tts_admin_token";

let allLogs = [];
let currentModalAction = null;
let autoRefreshInterval = null;

// =====================================================
//  AUTHENTIFICATION
// =====================================================

async function doLogin() {
  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value;
  const errEl = document.getElementById("loginError");

  errEl.style.display = "none";

  try {
    const res = await fetch(`${API}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error || "Identifiants incorrects";
      errEl.style.display = "block";
      return;
    }

    localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("app").style.display = "block";
    initApp();

  } catch (e) {
    errEl.textContent = "Serveur inaccessible";
    errEl.style.display = "block";
  }
}

function logout() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  clearInterval(autoRefreshInterval);
  document.getElementById("app").style.display = "none";
  document.getElementById("loginScreen").style.display = "flex";
}

function getToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getToken()}`
  };
}

// Auto-login si token présent
window.addEventListener("DOMContentLoaded", () => {
  const token = getToken();
  if (token) {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("app").style.display = "block";
    initApp();
  }
  startClock();
});

// =====================================================
//  INIT
// =====================================================

function initApp() {
  loadOverview();
  loadSessions();
  loadUsers();
  loadLogs();
  checkGlobalLock();

  // Auto-refresh toutes les 30s
  clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(() => {
    loadOverview();
    loadSessions();
  }, 30000);
}

// =====================================================
//  HORLOGE
// =====================================================

function startClock() {
  function tick() {
    const now = new Date();
    document.getElementById("liveTime").textContent =
      now.toLocaleDateString("fr-FR") + " " + now.toLocaleTimeString("fr-FR");
  }
  tick();
  setInterval(tick, 1000);
}

// =====================================================
//  NAVIGATION
// =====================================================

function switchTab(name) {
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
  document.getElementById(`tab-${name}`).classList.add("active");
  document.querySelectorAll(".nav-tab").forEach(t => {
    if (t.textContent.toLowerCase().includes(tabLabelMap[name])) t.classList.add("active");
  });
  // Reload data on tab switch
  if (name === "sessions") loadSessions();
  if (name === "logs") loadLogs();
  if (name === "users" || name === "access") loadUsers();
}

const tabLabelMap = {
  overview: "vue",
  sessions: "sessions",
  users: "utilisateurs",
  logs: "logs",
  access: "accès"
};

// =====================================================
//  OVERVIEW STATS
// =====================================================

async function loadOverview() {
  try {
    const res = await fetch(`${API}/admin/stats`, { headers: authHeaders() });
    if (res.status === 401) { logout(); return; }
    const data = await res.json();

    document.getElementById("stat-sessions").textContent = data.activeSessions ?? "—";
    document.getElementById("stat-users").textContent = data.totalUsers ?? "—";
    document.getElementById("stat-blocked").textContent = data.blockedUsers ?? "—";
    document.getElementById("stat-mods").textContent = data.mods24h ?? "—";

    // Recent logs
    renderLogsTable("recentLogsTable", (data.recentLogs || []).slice(0, 8));

  } catch (e) {
    console.error("loadOverview:", e);
  }
}

// =====================================================
//  SESSIONS
// =====================================================

async function loadSessions() {
  try {
    const res = await fetch(`${API}/admin/sessions`, { headers: authHeaders() });
    if (res.status === 401) { logout(); return; }
    const sessions = await res.json();
    const tbody = document.getElementById("sessionsTable");

    if (!sessions.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty">Aucune session active</td></tr>`;
      return;
    }

    tbody.innerHTML = sessions.map(s => `
      <tr>
        <td><strong>${esc(s.username)}</strong></td>
        <td>${esc(s.ip_address || "—")}</td>
        <td>${formatDate(s.created_at)}</td>
        <td>${formatDate(s.last_activity)}</td>
        <td><span class="badge online"><span class="pulse-dot" style="width:6px;height:6px;margin:0"></span> En ligne</span></td>
        <td>
          <button class="action-btn kick" onclick="kickSession('${s.session_id}', '${esc(s.username)}')">Déconnecter</button>
        </td>
      </tr>
    `).join("");
  } catch (e) {
    console.error("loadSessions:", e);
  }
}

async function kickSession(sessionId, username) {
  showModal(
    `Déconnecter ${username}`,
    `La session de ${username} sera immédiatement fermée.`,
    async () => {
      const res = await fetch(`${API}/admin/sessions/${sessionId}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      if (res.ok) {
        toast(`Session de ${username} fermée`, "success");
        loadSessions();
      } else {
        toast("Erreur lors de la déconnexion", "error");
      }
    },
    "red"
  );
}

function confirmKickAll() {
  showModal(
    "Déconnecter tout le monde",
    "Toutes les sessions actives seront fermées immédiatement.",
    async () => {
      const res = await fetch(`${API}/admin/sessions`, {
        method: "DELETE",
        headers: authHeaders()
      });
      if (res.ok) {
        toast("Toutes les sessions fermées", "success");
        loadSessions();
      } else {
        toast("Erreur", "error");
      }
    },
    "red"
  );
}

// =====================================================
//  UTILISATEURS
// =====================================================

async function loadUsers() {
  try {
    const res = await fetch(`${API}/admin/users`, { headers: authHeaders() });
    if (res.status === 401) { logout(); return; }
    const users = await res.json();

    renderUsersTable("usersTable", users);
    renderAccessTable(users);
  } catch (e) {
    console.error("loadUsers:", e);
  }
}

function renderUsersTable(tbodyId, users) {
  const tbody = document.getElementById(tbodyId);
  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Aucun utilisateur</td></tr>`;
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${esc(u.username)}</strong></td>
      <td>${esc(u.email || "—")}</td>
      <td><span class="badge info">${esc(u.role || "user")}</span></td>
      <td>${formatDate(u.last_login)}</td>
      <td>${u.is_blocked
        ? `<span class="badge blocked">🔒 Bloqué</span>`
        : `<span class="badge online">✓ Actif</span>`}
      </td>
      <td>
        ${u.is_blocked
          ? `<button class="action-btn unblock" onclick="toggleBlock(${u.id_user}, false, '${esc(u.username)}')">Débloquer</button>`
          : `<button class="action-btn block" onclick="promptBlock(${u.id_user}, '${esc(u.username)}')">Bloquer</button>`}
      </td>
    </tr>
  `).join("");
}

function renderAccessTable(users) {
  const tbody = document.getElementById("accessTable");
  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Aucun utilisateur</td></tr>`;
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${esc(u.username)}</strong></td>
      <td>${esc(u.email || "—")}</td>
      <td><span class="badge info">${esc(u.role || "user")}</span></td>
      <td>${u.is_blocked
        ? `<span class="badge blocked">🔒 Bloqué</span>`
        : `<span class="badge online">✓ Actif</span>`}
      </td>
      <td class="log-delete">${esc(u.block_reason || "—")}</td>
      <td>
        ${u.is_blocked
          ? `<button class="action-btn unblock" onclick="toggleBlock(${u.id_user}, false, '${esc(u.username)}')">Débloquer</button>`
          : `<button class="action-btn block" onclick="promptBlock(${u.id_user}, '${esc(u.username)}')">Bloquer</button>`}
      </td>
    </tr>
  `).join("");
}

function promptBlock(userId, username) {
  const reason = prompt(`Raison du blocage pour "${username}" (optionnel) :`);
  if (reason === null) return; // Annulé
  toggleBlock(userId, true, username, reason);
}

async function toggleBlock(userId, block, username, reason = "") {
  try {
    const res = await fetch(`${API}/admin/users/${userId}/block`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ block, reason })
    });

    if (res.ok) {
      toast(`${username} ${block ? "bloqué" : "débloqué"}`, block ? "error" : "success");
      loadUsers();
      loadOverview();
    } else {
      toast("Erreur lors du changement de statut", "error");
    }
  } catch (e) {
    toast("Erreur réseau", "error");
  }
}

// =====================================================
//  LOGS
// =====================================================

async function loadLogs() {
  try {
    const res = await fetch(`${API}/admin/logs?limit=200`, { headers: authHeaders() });
    if (res.status === 401) { logout(); return; }
    allLogs = await res.json();
    filterLogs();
  } catch (e) {
    console.error("loadLogs:", e);
  }
}

function filterLogs() {
  const search = document.getElementById("logSearch").value.toLowerCase();
  const type = document.getElementById("logType").value;

  const filtered = allLogs.filter(l => {
    const matchType = !type || l.action === type;
    const matchSearch = !search ||
      (l.username || "").toLowerCase().includes(search) ||
      (l.detail || "").toLowerCase().includes(search) ||
      (l.table_name || "").toLowerCase().includes(search);
    return matchType && matchSearch;
  });

  renderLogsTable("logsTable", filtered);
}

function renderLogsTable(tbodyId, logs) {
  const tbody = document.getElementById(tbodyId);
  if (!logs.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Aucun log</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(l => {
    const cls = {
      CREATE: "log-create",
      UPDATE: "log-update",
      DELETE: "log-delete",
      LOGIN: "log-login",
      BLOCK: "log-block"
    }[l.action] || "";

    return `
      <tr>
        <td>${formatDate(l.created_at)}</td>
        <td><strong>${esc(l.username || "—")}</strong></td>
        <td><span class="${cls}" style="font-weight:600">${esc(l.action || "—")}</span></td>
        <td>${esc(l.table_name || "—")}</td>
        <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(l.detail || "")}">${esc(l.detail || "—")}</td>
        <td>${esc(l.ip_address || "—")}</td>
      </tr>
    `;
  }).join("");
}

function confirmClearLogs() {
  showModal(
    "Vider les logs",
    "Tous les logs d'activité seront supprimés définitivement. Cette action est irréversible.",
    async () => {
      const res = await fetch(`${API}/admin/logs`, {
        method: "DELETE",
        headers: authHeaders()
      });
      if (res.ok) {
        allLogs = [];
        filterLogs();
        toast("Logs vidés", "success");
      } else {
        toast("Erreur", "error");
      }
    },
    "red"
  );
}

// =====================================================
//  VERROU GLOBAL
// =====================================================

async function checkGlobalLock() {
  try {
    const res = await fetch(`${API}/admin/lock`, { headers: authHeaders() });
    const data = await res.json();
    const locked = data.locked;

    document.getElementById("globalLockToggle").checked = locked;
    document.getElementById("lockMessageBox").style.display = locked ? "block" : "none";
    if (data.message) document.getElementById("lockMessage").value = data.message;

    const banner = document.getElementById("lockBanner");
    if (locked) {
      banner.classList.remove("hidden");
      banner.style.display = "flex";
    } else {
      banner.classList.add("hidden");
      banner.style.display = "none";
    }
  } catch (e) {
    console.error("checkGlobalLock:", e);
  }
}

async function toggleGlobalLock() {
  const locked = document.getElementById("globalLockToggle").checked;

  if (locked) {
    showModal(
      "Verrouiller l'application",
      "Tous les utilisateurs (sauf admin) seront bloqués immédiatement. Confirmez-vous ?",
      async () => {
        await applyGlobalLock(true);
      },
      "red",
      () => {
        // Annulé : on remet le toggle
        document.getElementById("globalLockToggle").checked = false;
      }
    );
  } else {
    await applyGlobalLock(false);
  }
}

async function applyGlobalLock(locked) {
  try {
    const message = document.getElementById("lockMessage").value;
    const res = await fetch(`${API}/admin/lock`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ locked, message })
    });

    if (res.ok) {
      toast(locked ? "🔒 Application verrouillée" : "🔓 Application déverrouillée", locked ? "error" : "success");
      checkGlobalLock();
      loadOverview();
    } else {
      toast("Erreur", "error");
      document.getElementById("globalLockToggle").checked = !locked;
    }
  } catch (e) {
    toast("Erreur réseau", "error");
  }
}

async function saveLockMessage() {
  const locked = document.getElementById("globalLockToggle").checked;
  const message = document.getElementById("lockMessage").value;
  await applyGlobalLock(locked);
  toast("Message sauvegardé", "info");
}

// =====================================================
//  MODAL
// =====================================================

let cancelCallback = null;

function showModal(title, text, onConfirm, type = "red", onCancel = null) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalText").textContent = text;
  const btn = document.getElementById("modalConfirmBtn");
  btn.className = `btn-confirm ${type}`;
  currentModalAction = onConfirm;
  cancelCallback = onCancel;
  document.getElementById("confirmModal").classList.add("open");
}

function closeModal() {
  document.getElementById("confirmModal").classList.remove("open");
  if (cancelCallback) cancelCallback();
  cancelCallback = null;
}

async function modalAction() {
  closeModal();
  if (currentModalAction) await currentModalAction();
}

// Close modal on overlay click
document.getElementById("confirmModal").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});

// =====================================================
//  TOAST
// =====================================================

let toastTimer = null;

function toast(msg, type = "info") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 3000);
}

// =====================================================
//  UTILS
// =====================================================

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}