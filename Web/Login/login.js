const API = "/api";

// ── Redirection immédiate si déjà connecté ───────────────────────────────────
const existingToken = localStorage.getItem("token") || sessionStorage.getItem("token");
const existingUser  = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "null");
if (existingToken) {
  if (existingUser?.role === "admin") {
    window.location.href = "../Admin/admin.html";
  } else {
    window.location.href = "../index.html";
  }
}

// ── Ping server status (route publique /) ────────────────────────────────────
async function checkServerStatus() {
  try {
    const res = await fetch(`${API}/`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      document.getElementById("statusText").textContent = "Serveur opérationnel";
      document.querySelector(".status-dot").style.background = "var(--green)";
      document.querySelector(".status-dot").style.animation = "";
    } else {
      throw new Error();
    }
  } catch {
    document.getElementById("statusText").textContent = "Serveur hors ligne";
    document.querySelector(".status-dot").style.background = "var(--red)";
    document.querySelector(".status-dot").style.animation = "none";
  }
}

// ── Load brand stats via endpoint public /stats/public ───────────────────────
async function loadStats() {
  try {
    const res = await fetch(`${API}/stats/public`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return;
    const data = await res.json();
    if (data.sites !== undefined)
      document.getElementById("bs-sites").textContent = data.sites;
    if (data.maintenances !== undefined)
      document.getElementById("bs-maintenances").textContent = data.maintenances;
    if (data.produits !== undefined)
      document.getElementById("bs-produits").textContent = data.produits;
  } catch { /* silently ignore */ }
}

// ── Toggle visibilité du mot de passe ────────────────────────────────────────
function togglePassword() {
  const input = document.getElementById("password");
  const btn   = document.getElementById("togglePw");
  if (input.type === "password") {
    input.type      = "text";
    btn.textContent = "MASQUER";
  } else {
    input.type      = "password";
    btn.textContent = "VOIR";
  }
}

// ── Afficher une erreur ───────────────────────────────────────────────────────
function showError(msg) {
  const el  = document.getElementById("errorMsg");
  const txt = document.getElementById("errorText");
  txt.textContent = msg;
  el.classList.remove("visible");
  void el.offsetWidth;
  el.classList.add("visible");
  ["username", "password"].forEach(id => {
    document.getElementById(id).classList.add("error");
  });
}

// ── Effacer l'erreur ──────────────────────────────────────────────────────────
function clearError() {
  document.getElementById("errorMsg").classList.remove("visible");
  ["username", "password"].forEach(id => {
    document.getElementById(id).classList.remove("error");
  });
}

// ── Soumission du formulaire ──────────────────────────────────────────────────
async function handleLogin(event) {
  event.preventDefault();
  clearError();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const remember = document.getElementById("rememberMe").checked;

  if (!username || !password) {
    showError("Veuillez remplir tous les champs");
    return;
  }

  const btn = document.getElementById("submitBtn");
  btn.classList.add("loading");
  btn.disabled = true;

  try {
    // fetch natif — pas de token pour le login
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.message || data.error || "Identifiants incorrects");
      return;
    }

    // Stocker token + user selon la préférence
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem("token", data.token);
    storage.setItem("user", JSON.stringify(data.user || {}));

    // Animation succès
    btn.style.background = "var(--green)";
    btn.innerHTML = '<span class="btn-text">✓ Connecté</span>';
    await new Promise(r => setTimeout(r, 700));

    // Redirection selon le rôle
    if (data.user?.role === "admin") {
      window.location.href = "../Admin/admin.html";
    } else {
      window.location.href = "../index.html";
    }

  } catch {
    showError("Impossible de joindre le serveur");
  } finally {
    btn.classList.remove("loading");
    btn.disabled = false;
  }
}

// ── Clear erreur à la saisie ──────────────────────────────────────────────────
["username", "password"].forEach(id => {
  document.getElementById(id).addEventListener("input", clearError);
});

// ── Init ──────────────────────────────────────────────────────────────────────
checkServerStatus();
loadStats();