const API = "http://localhost:3000"; // adresse du serveur API --> PORT 3000

function showSection(id) {
  document.querySelectorAll("section").forEach(s =>
    s.classList.remove("active")
  );
  document.getElementById(id).classList.add("active");
}

/* ---------- SITES ---------- */
let allSites = []; // stocke tous les sites pour filtrage

// Charger la liste des sites
async function loadSites() {
  const res = await fetch(`${API}/sites`);
  allSites = await res.json();
  renderSites(allSites);
}

// Fonction pour afficher les sites dans la liste
function renderSites(sites) {
  const list = document.getElementById("sitesList");
  list.innerHTML = "";

  sites.forEach(site => {
    const li = document.createElement("li");
    li.textContent = `${site.nom} - ${site.adresse || ""} - ${site.id_site}`;
    
    // Rendre toute la ligne cliquable
    li.addEventListener("click", () => {
      window.location.href = `./SiteDetails/siteDetails.html?id_site=${site.id_site}`;
    });

    li.classList.add("clickable-line");
    list.appendChild(li);
  });
}

// Barre de recherche pour filtrer les sites
const searchInput = document.getElementById("searchSites")
searchInput.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filtered = allSites.filter(site =>
    site.nom.toLowerCase().includes(searchTerm) ||
    (site.adresse && site.adresse.toLowerCase().includes(searchTerm))
  );
  renderSites(filtered);
});

// Ajouter la barre de recherche au-dessus de la liste
const sitesSection = document.getElementById("sites");
sitesSection.insertBefore(searchInput, document.getElementById("sitesList"));

async function addSite(event) {
  event.preventDefault();

  const data = {
    id_client: document.getElementById("siteClientId").value,
    nom: document.getElementById("siteNom").value,
    adresse: document.getElementById("siteAdresse").value,
    gps_lat: document.getElementById("siteLat").value || null,
    gps_lng: document.getElementById("siteLng").value || null
  };

  const res = await fetch(`${API}/sites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (res.ok) {
    hideAddSiteForm();
    loadSites(); // recharge la liste des sites
  } else {
    alert("Erreur lors de l'ajout du site");
  }
}

function showAddSiteForm() {
  document.getElementById("addSiteForm").style.display = "block";
}

function hideAddSiteForm() {
  document.getElementById("addSiteForm").style.display = "none";
}

/* ---------- PRODUITS ---------- */
async function loadProduits() {
  const res = await fetch(`${API}/produits`);
  const produits = await res.json();
  const ul = document.getElementById("produitsList");
  ul.innerHTML = "";

  produits.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${p.nom}</span>
      <button onclick="printQR(${p.id})">QR</button>
    `;
    ul.appendChild(li);
  });
}

async function addProduit(e) {
  e.preventDefault();
  const nom = document.getElementById("produitNom").value;

  await fetch(`${API}/produits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom })
  });

  document.getElementById("produitNom").value = "";
  loadProduits();
}

/* ---------- MAINTENANCES ---------- */
async function loadMaintenances() {
  const res = await fetch(`${API}/maintenances`);
  const maintenances = await res.json();
  const ul = document.getElementById("maintenancesList");
  ul.innerHTML = "";

  maintenances.forEach(m => {
    const li = document.createElement("li");
    li.textContent = `${m.description || "Maintenance"} – ${m.date_maintenance}`;
    ul.appendChild(li);
  });
}

/* ---------- QR CODE ---------- */
function printQR(id) {
  window.open(`${API}/qr/${id}`, "_blank");
}

/* ---------- INIT ---------- */
loadProduits();
loadSites();
loadMaintenances();
