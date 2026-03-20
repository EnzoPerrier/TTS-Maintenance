// Récupère le token stocké après le login
function getToken() {
  return localStorage.getItem("token");
}

// fetch() avec le token automatiquement ajouté
async function apiFetch(url, options = {}) {
  const token = getToken();
  
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });

  // Si le token est expiré, rediriger vers la page de login
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
    return;
  }

  return res;
}