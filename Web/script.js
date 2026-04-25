let editingProduitId = null;
let editingClientId  = null;
let allSitesMap      = null;
let allClients       = [];
let allMaintenances  = [];

const API = "/api";

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function logout() {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "./Login/login.html";
}

// Affiche le nom d'utilisateur dans le header
(function initUserDisplay() {
  const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "null");
  if (user && user.username) {
    const el = document.getElementById("headerUsername");
    if (el) el.textContent = "|👤 " + user.username;
  }
})();

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function showSection(id) {
  document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === 'carte') {
    setTimeout(() => {
      if (allSitesMap) allSitesMap.invalidateSize();
      else initAllSitesMap();
    }, 100);
  }
  if (id === 'clients')      loadClients();
  if (id === 'maintenances') loadMaintenances();
}

// ─── CALLBACKS PARTIAL maintenanceForm.js ────────────────────────────────────
window.onMaintenanceCreated = async () => { await loadMaintenances(); };
window.onMaintenanceUpdated = async () => { await loadMaintenances(); };

function editMaintenanceById(id) {
  const m = allMaintenances.find(x => x.id_maintenance == id);
  if (!m) { alert("Maintenance introuvable"); return; }
  showEditMaintenanceForm(m);
}

async function deleteMaintenance(id_maintenance) {
  if (!confirm("Voulez-vous vraiment supprimer cette maintenance ? (CETTE ACTION EST IRREVERSIBLE)")) return;
  try {
    const res = await apiFetch(`${API}/maintenances/${id_maintenance}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression"); return; }
    await loadMaintenances();
    alert("✓ Maintenance supprimée avec succès !");
  } catch (err) { alert("Erreur serveur"); }
}

// ─── CARTE ────────────────────────────────────────────────────────────────────
async function initAllSitesMap() {
  try {
    const res = await apiFetch(`${API}/sites`);
    const sites = await res.json();
    const sitesWithCoords = sites.filter(s => s.gps_lat && s.gps_lng);

    if (sitesWithCoords.length === 0) {
      document.getElementById("allSitesMapContainer").innerHTML =
        '<div style="padding:2rem;text-align:center;color:#6C757D;">📍 Aucun site avec coordonnées GPS disponibles</div>';
      return;
    }

    if (allSitesMap) { allSitesMap.remove(); allSitesMap = null; }
    const mapContainer = document.getElementById('allSitesMap');
    if (!mapContainer) return;

    const avgLat = sitesWithCoords.reduce((sum, s) => sum + parseFloat(s.gps_lat), 0) / sitesWithCoords.length;
    const avgLng = sitesWithCoords.reduce((sum, s) => sum + parseFloat(s.gps_lng), 0) / sitesWithCoords.length;

    allSitesMap = L.map('allSitesMap').setView([avgLat, avgLng], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap contributors'
    }).addTo(allSitesMap);

    sitesWithCoords.forEach(site => {
      const lat = parseFloat(site.gps_lat);
      const lng = parseFloat(site.gps_lng);
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:linear-gradient(135deg,#0066CC 0%,#004A99 100%);width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;">
          <span style="transform:rotate(45deg);font-size:18px;color:white;">📍</span>
        </div>`,
        iconSize: [36,36], iconAnchor: [18,36], popupAnchor: [0,-36]
      });
      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(allSitesMap);
      marker.bindPopup(`
        <div style="font-family:'Segoe UI',sans-serif;min-width:200px;">
          <strong style="color:#0066CC;font-size:1.1em;">${site.nom}</strong><br/>
          <span style="color:#6C757D;">${site.adresse || 'Adresse non spécifiée'}</span><br/>
          <small style="color:#999;">📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}</small><br/>
          <button onclick="goToSiteDetails(${site.id_site})" style="margin-top:0.75rem;background:#0066CC;color:white;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-weight:500;width:100%;">Voir les détails</button>
        </div>
      `);
    });

    if (sitesWithCoords.length > 1) {
      const bounds = L.latLngBounds(sitesWithCoords.map(s => [parseFloat(s.gps_lat), parseFloat(s.gps_lng)]));
      allSitesMap.fitBounds(bounds, { padding: [50, 50] });
    }
  } catch (err) {
    console.error(err);
    document.getElementById("allSitesMapContainer").innerHTML =
      '<div style="padding:2rem;text-align:center;color:#DC3545;">Erreur lors du chargement de la carte</div>';
  }
}

function goToSiteDetails(id_site) {
  window.location.href = `./SiteDetails/siteDetails.html?id_site=${id_site}`;
}

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
let allClientsData = [];

async function loadClients() {
  try {
    const res = await apiFetch(`${API}/clients`);
    allClientsData = await res.json();
    renderClients(allClientsData);
    loadClientsSelect();
  } catch (err) {
    document.getElementById("clientsList").innerHTML = '<li style="color:#DC3545;">Erreur lors du chargement des clients</li>';
  }
}

function renderClients(clients) {
  const list = document.getElementById("clientsList");
  list.innerHTML = "";
  if (clients.length === 0) { list.innerHTML = "<li>Aucun client trouvé</li>"; return; }
  clients.forEach(client => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div style="flex:1;cursor:pointer;" onclick="window.location.href='./ClientDetails/clientDetails.html?id_client=${client.id_client}'">
        <strong>${client.nom}</strong><br/>
        <small style="color:#6C757D;">
          ${client.contact   ? client.contact + ' — ' : ''}
          ${client.telephone ? '📞 ' + client.telephone : ''}
          ${client.email     ? ' — 📧 ' + client.email : ''}
        </small>
      </div>
      <div style="display:flex;gap:0.5rem;">
        <button class="btn-danger" onclick="deleteClient(${client.id_client});event.stopPropagation();">Supprimer</button>
        <button class="btn-edit"   onclick="editClient(${client.id_client});event.stopPropagation();">Modifier</button>
        <button onclick="window.location.href='./ClientDetails/clientDetails.html?id_client=${client.id_client}';event.stopPropagation();" style="background:var(--secondary-blue);">Détails</button>
      </div>
    `;
    list.appendChild(li);
  });
}

document.getElementById("searchClients").addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  renderClients(allClientsData.filter(c =>
    c.nom.toLowerCase().includes(term) ||
    (c.contact   && c.contact.toLowerCase().includes(term)) ||
    (c.email     && c.email.toLowerCase().includes(term)) ||
    (c.telephone && c.telephone.toLowerCase().includes(term))
  ));
});

function showAddClientForm() {
  editingClientId = null;
  document.getElementById("clientFormTitle").textContent = "Ajouter un client";
  document.getElementById("clientSubmitBtn").textContent = "Ajouter";
  document.querySelector("#addClientForm form").reset();
  document.getElementById("addClientForm").style.display = "block";
}

function hideAddClientForm() {
  document.getElementById("addClientForm").style.display = "none";
  editingClientId = null;
  document.querySelector("#addClientForm form").reset();
}

async function addClient(event) {
  event.preventDefault();
  const data = {
    nom:       document.getElementById("clientNom").value,
    contact:   document.getElementById("clientContact").value,
    adresse:   document.getElementById("clientAdresse").value   || null,
    email:     document.getElementById("clientEmail").value     || null,
    telephone: document.getElementById("clientTelephone").value || null
  };
  if (editingClientId !== null) { await updateClient(editingClientId, data); return; }
  try {
    const res = await apiFetch(`${API}/clients`, {
      method: "POST",
      body: JSON.stringify(data)
    });
    if (!res.ok) { alert("Erreur lors de l'ajout du client"); return; }
    hideAddClientForm();
    loadClients();
    alert("✓ Client ajouté avec succès !");
  } catch (err) { alert("Erreur serveur"); }
}

function editClient(id_client) {
  const client = allClientsData.find(c => c.id_client === id_client);
  if (!client) return alert("Client non trouvé");
  editingClientId = id_client;
  document.getElementById("clientNom").value       = client.nom;
  document.getElementById("clientContact").value   = client.contact   || "";
  document.getElementById("clientAdresse").value   = client.adresse   || "";
  document.getElementById("clientEmail").value     = client.email     || "";
  document.getElementById("clientTelephone").value = client.telephone || "";
  document.getElementById("clientFormTitle").textContent = "Modifier un client";
  document.getElementById("clientSubmitBtn").textContent = "Valider";
  document.getElementById("addClientForm").style.display = "block";
}

async function updateClient(id_client, data) {
  if (!confirm("Êtes-vous sûr de vouloir modifier ce client ?")) return;
  try {
    const res = await apiFetch(`${API}/clients/${id_client}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
    if (!res.ok) { alert("Erreur lors de la modification du client"); return; }
    hideAddClientForm();
    loadClients();
    alert("✓ Client modifié avec succès !");
  } catch (err) { alert("Erreur serveur"); }
}

async function deleteClient(id_client) {
  try {
    const resSites = await apiFetch(`${API}/sites`);
    const sitesData = await resSites.json();
    const clientSites = sitesData.filter(site => site.id_client == id_client);
    if (clientSites.length > 0) {
      alert(`❌ Impossible de supprimer ce client.\n\nIl a ${clientSites.length} site(s) associé(s) :\n${clientSites.map(s => '— ' + s.nom).join('\n')}\n\nVeuillez d'abord supprimer ces sites.`);
      return;
    }
    if (!confirm("Voulez-vous vraiment supprimer ce client ? (CETTE ACTION EST IRREVERSIBLE)")) return;
    const res = await apiFetch(`${API}/clients/${id_client}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression du client"); return; }
    loadClients();
    alert("✓ Client supprimé avec succès !");
  } catch (err) { alert("Erreur serveur"); }
}

// ─── SITES ────────────────────────────────────────────────────────────────────
let allSites = [];
let editingSiteId = null;

async function loadClientsSelect() {
  try {
    const res = await apiFetch(`${API}/clients`);
    allClients = await res.json();
    const select = document.getElementById("siteClientId");
    select.innerHTML = '<option value="">-- Sélectionner un client --</option>';
    allClients.forEach(client => {
      const option = document.createElement("option");
      option.value = client.id_client;
      option.textContent = client.nom;
      select.appendChild(option);
    });
  } catch (err) { console.error(err); }
}

async function loadSites() {
  const res = await apiFetch(`${API}/sites`);
  allSites = await res.json();
  renderSites(allSites);
}

function renderSites(sites) {
  const list = document.getElementById("sitesList");
  list.innerHTML = "";
  if (sites.length === 0) { list.innerHTML = "<li>Aucun site trouvé</li>"; return; }
  sites.forEach(site => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div style="flex:1;">
        <strong>${site.nom}</strong><br/>
        <small style="color:#6C757D;">${site.adresse || "Adresse non spécifiée"}</small>
      </div>
      <div style="display:flex;gap:0.5rem;">
        <button class="btn-danger" onclick="deleteSite(${site.id_site})">Supprimer</button>
        <button class="btn-edit"   onclick="editSite(${site.id_site})">Modifier</button>
        <button onclick="window.location.href='./SiteDetails/siteDetails.html?id_site=${site.id_site}'" style="background:var(--secondary-blue);">Détails</button>
      </div>
    `;
    list.appendChild(li);
  });
}

document.getElementById("searchSites").addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  renderSites(allSites.filter(site =>
    site.nom.toLowerCase().includes(term) ||
    (site.adresse && site.adresse.toLowerCase().includes(term))
  ));
});

const sitesSection = document.getElementById("sites");
sitesSection.insertBefore(document.getElementById("searchSites"), document.getElementById("sitesList"));

async function addSite(event) {
  event.preventDefault();
  const data = {
    id_client: document.getElementById("siteClientId").value,
    nom:       document.getElementById("siteNom").value,
    adresse:   document.getElementById("siteAdresse").value,
    gps_lat:   document.getElementById("siteLat").value || null,
    gps_lng:   document.getElementById("siteLng").value || null
  };
  if (editingSiteId !== null) { await updateSite(editingSiteId, data); return; }
  const res = await apiFetch(`${API}/sites`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  if (res.ok) {
    hideAddSiteForm();
    loadSites();
    if (document.getElementById("carte").classList.contains("active")) initAllSitesMap();
    alert("✓ Site ajouté avec succès !");
  } else { alert("Erreur lors de l'ajout du site"); }
}

function showAddSiteForm() {
  editingSiteId = null;
  loadClientsSelect();
  document.getElementById("siteFormTitle").textContent = "Ajouter un site";
  document.getElementById("siteSubmitBtn").textContent = "Ajouter";
  document.querySelector("#addSiteForm form").reset();
  document.getElementById("addSiteForm").style.display = "block";
}

function hideAddSiteForm() {
  document.getElementById("addSiteForm").style.display = "none";
  editingSiteId = null;
  document.querySelector("#addSiteForm form").reset();
}

function editSite(id_site) {
  const site = allSites.find(s => s.id_site === id_site);
  if (!site) return alert("Site non trouvé");
  editingSiteId = id_site;
  loadClientsSelect().then(() => {
    document.getElementById("siteClientId").value = site.id_client;
    document.getElementById("siteNom").value      = site.nom;
    document.getElementById("siteAdresse").value  = site.adresse || "";
    document.getElementById("siteLat").value      = site.gps_lat || "";
    document.getElementById("siteLng").value      = site.gps_lng || "";
    document.getElementById("siteFormTitle").textContent = "Modifier un site";
    document.getElementById("siteSubmitBtn").textContent = "Valider";
    document.getElementById("addSiteForm").style.display = "block";
  });
}

async function updateSite(id_site, data) {
  if (!confirm("Êtes-vous sûr de vouloir modifier ce site ?")) return;
  try {
    const res = await apiFetch(`${API}/sites/${id_site}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
    if (!res.ok) { alert("Erreur lors de la modification du site"); return; }
    hideAddSiteForm();
    loadSites();
    if (document.getElementById("carte").classList.contains("active")) initAllSitesMap();
    alert("✓ Site modifié avec succès !");
  } catch (err) { alert("Erreur serveur"); }
}

async function deleteSite(id_site) {
  try {
    const resProduits = await apiFetch(`${API}/produits/ProduitsBySiteID/${id_site}`);
    const produits = await resProduits.json();
    if (produits.length > 0) {
      alert(`❌ Impossible de supprimer ce site.\n\nIl a ${produits.length} équipement(s) associé(s) :\n${produits.slice(0,5).map(p => '— ' + p.nom).join('\n')}${produits.length > 5 ? '\n...' : ''}\n\nVeuillez d'abord supprimer ces équipements.`);
      return;
    }
    const resMaintenances = await apiFetch(`${API}/maintenances/AllMaintenancesBySiteID/${id_site}`);
    const maintenances = await resMaintenances.json();
    if (maintenances.length > 0) {
      alert(`❌ Impossible de supprimer ce site.\n\nIl a ${maintenances.length} maintenance(s) associée(s).`);
      return;
    }
    if (!confirm("Voulez-vous vraiment supprimer ce site ? (CETTE ACTION EST IRREVERSIBLE)")) return;
    const res = await apiFetch(`${API}/sites/${id_site}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression du site"); return; }
    loadSites();
    if (document.getElementById("carte").classList.contains("active")) initAllSitesMap();
    alert("✓ Site supprimé avec succès !");
  } catch (err) { alert("Erreur serveur"); }
}

// ─── PRODUITS ─────────────────────────────────────────────────────────────────
let allProduits = [];

async function loadProduits() {
  const res = await apiFetch(`${API}/produits`);
  allProduits = await res.json();
  renderProduits(allProduits);
}

function renderProduits(produits) {
  const ul = document.getElementById("produitsList");
  ul.innerHTML = "";
  if (produits.length === 0) { ul.innerHTML = "<li>Aucun produit trouvé</li>"; return; }
  produits.forEach(p => {
    const li = document.createElement("li");
    const etat = (p.etat || "").toLowerCase();
    if (etat === "ok")            li.classList.add("equipement-ok");
    else if (etat === "nok")      li.classList.add("equipement-nok");
    else if (etat === "passable") li.classList.add("equipement-passable");
    else                          li.classList.add("equipement-autre");

    let etatColor = "#6C757D";
    if (etat === "ok")            etatColor = "#28A745";
    else if (etat === "nok")      etatColor = "#DC3545";
    else if (etat === "passable") etatColor = "#FFC107";

    li.innerHTML = `
      <div style="flex:1;">
        <strong>${p.nom}</strong>
        ${p.departement ? " — " + p.departement : ""}
        ${p.etat ? ` — <span style="color:${etatColor};font-weight:600;">${p.etat}</span>` : ""}
        <br/><small style="color:#6C757D;">${p.description || ""}</small>
      </div>
      <div>
        <button class="btn-danger" onclick="deleteProduit(${p.id_produit})">Supprimer</button>
        <button class="btn-edit"   onclick="editProduit(${p.id_produit})">Modifier</button>
        <button class="btn-qr"     onclick="printQR(${p.id_produit})">QR</button>
        <button onclick="window.location.href='./ProduitDetails/produitDetails.html?id_produit=${p.id_produit}'" style="background:var(--secondary-blue);">Détails</button>
      </div>
    `;
    ul.appendChild(li);
  });
}

document.getElementById("searchProduits").addEventListener("input", e => {
  const term = e.target.value.toLowerCase();
  renderProduits(allProduits.filter(p =>
    p.nom.toLowerCase().includes(term) ||
    (p.departement && p.departement.toLowerCase().includes(term)) ||
    (p.etat        && p.etat.toLowerCase().includes(term))
  ));
});

const produitsSection = document.getElementById("produits");
produitsSection.insertBefore(document.getElementById("searchProduits"), document.getElementById("produitsList"));

function initSiteSearch() {
  const searchInput   = document.getElementById("produitSiteSearch");
  const resultsDiv    = document.getElementById("siteSearchResults");
  const hiddenIdInput = document.getElementById("produitSiteId");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.trim().toLowerCase();
    if (searchTerm === "") { resultsDiv.style.display = "none"; resultsDiv.innerHTML = ""; hiddenIdInput.value = ""; return; }
    const filtered = allSites.filter(site =>
      site.nom.toLowerCase().includes(searchTerm) ||
      (site.adresse && site.adresse.toLowerCase().includes(searchTerm))
    );
    if (filtered.length > 0) {
      resultsDiv.innerHTML = "";
      resultsDiv.style.display = "block";
      filtered.forEach(site => {
        const div = document.createElement("div");
        div.style.cssText = "padding:0.75rem;cursor:pointer;border-bottom:1px solid var(--gray-200);transition:background 0.2s ease;";
        div.innerHTML = `<strong style="color:var(--gray-800);">${site.nom}</strong><br/><small style="color:var(--gray-600);">${site.adresse || "Pas d'adresse"}</small>`;
        div.addEventListener("mouseenter", () => div.style.background = "var(--gray-50)");
        div.addEventListener("mouseleave", () => div.style.background = "white");
        div.addEventListener("click", () => {
          searchInput.value = site.nom;
          hiddenIdInput.value = site.id_site;
          resultsDiv.style.display = "none";
          resultsDiv.innerHTML = "";
        });
        resultsDiv.appendChild(div);
      });
    } else {
      resultsDiv.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--gray-600);">Aucun site trouvé</div>';
      resultsDiv.style.display = "block";
    }
  });

  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) resultsDiv.style.display = "none";
  });
  resultsDiv.addEventListener("click", e => e.stopPropagation());
}

async function addProduit(e) {
  e.preventDefault();
  const data = {
    nom:         document.getElementById("produitNom").value,
    id_site:     document.getElementById("produitSiteId").value,
    departement: document.getElementById("produitDepartement").value || null,
    etat:        document.getElementById("produitEtat").value        || null,
    description: document.getElementById("produitDescription").value || null
  };
  if (editingProduitId !== null) { await updateProduit(editingProduitId, data); return; }
  const res = await apiFetch(`${API}/produits`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  if (!res.ok) { alert("Erreur lors de l'ajout du produit"); return; }
  const createdProduit = await res.json();
  const resQr = await apiFetch(`${API}/qrcodes/generate`, {
    method: "POST",
    body: JSON.stringify({ count: 1, prefill: { id_produit: createdProduit.id_produit } })
  });
  if (!resQr.ok) alert("Produit créé, mais erreur lors de la génération du QR code");
  hideAddProduitForm();
  loadProduits();
}

function showAddProduitForm() {
  editingProduitId = null;
  document.getElementById("produitForm").reset();
  document.getElementById("produitSiteSearch").value         = "";
  document.getElementById("produitSiteId").value             = "";
  document.getElementById("siteSearchResults").style.display = "none";
  document.getElementById("siteSearchResults").innerHTML     = "";
  const formTitle = document.querySelector("#addProduitForm h3");
  if (formTitle) formTitle.textContent = "Ajouter un produit";
  document.querySelector("#addProduitForm button[type='submit']").textContent = "Ajouter";
  document.getElementById("addProduitForm").style.display = "block";
  setTimeout(() => initSiteSearch(), 100);
}

function hideAddProduitForm() {
  document.getElementById("addProduitForm").style.display = "none";
  editingProduitId = null;
  document.getElementById("produitForm").reset();
}

async function deleteProduit(id_produit) {
  if (!confirm("Voulez-vous vraiment supprimer ce produit ? (CETTE ACTION EST IRREVERSIBLE)")) return;
  try {
    const res = await apiFetch(`${API}/produits/${id_produit}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression du produit"); return; }
    loadProduits();
  } catch (err) { alert("Erreur serveur lors de la suppression"); }
}

function editProduit(id_produit) {
  const produit = allProduits.find(p => p.id_produit === id_produit);
  if (!produit) return alert("Produit non trouvé");
  editingProduitId = id_produit;
  document.getElementById("produitNom").value         = produit.nom;
  document.getElementById("produitDepartement").value = produit.departement || "";
  document.getElementById("produitEtat").value        = produit.etat        || "";
  document.getElementById("produitDescription").value = produit.description || "";
  const site = allSites.find(s => s.id_site === produit.id_site);
  if (site) {
    document.getElementById("produitSiteSearch").value = site.nom;
    document.getElementById("produitSiteId").value     = site.id_site;
  }
  const formTitle = document.querySelector("#addProduitForm h3");
  if (formTitle) formTitle.textContent = "Modifier un produit";
  document.querySelector("#addProduitForm button[type='submit']").textContent = "Valider la modification";
  document.getElementById("addProduitForm").style.display = "block";
  setTimeout(() => initSiteSearch(), 100);
}

async function updateProduit(id_produit, data) {
  if (!confirm("Êtes-vous sûr de vouloir modifier ce produit ?")) return;
  try {
    const res = await apiFetch(`${API}/produits/${id_produit}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
    if (!res.ok) { alert("Erreur lors de la modification du produit"); return; }
    hideAddProduitForm();
    loadProduits();
    editingProduitId = null;
  } catch (err) { alert("Erreur serveur lors de la modification"); }
}

function printQR(id) { window.open(`${API}/qrcodes/showqr/${id}`, "_blank"); }

// ─── MAINTENANCES ─────────────────────────────────────────────────────────────
async function loadMaintenances() {
  try {
    const res = await apiFetch(`${API}/maintenances/NotFinished`);
    if (!res.ok) throw new Error("Erreur lors du chargement des maintenances");
    allMaintenances = await res.json();

    const ul = document.getElementById("maintenancesList");
    ul.innerHTML = "";

    if (allMaintenances.length === 0) {
      ul.innerHTML = "<li>Aucune maintenance en cours ou planifiée.</li>";
      return;
    }

    allMaintenances.forEach(m => {
      const details = document.createElement("details");
      details.classList.add("site-detail", "maintenance");
      const etat = (m.etat || "").toLowerCase();
      if (etat.includes("termin"))      details.classList.add("maintenance-terminee");
      else if (etat.includes("cours"))  details.classList.add("maintenance-en-cours");
      else if (etat.includes("planif")) details.classList.add("maintenance-planifiee");
      else                              details.classList.add("maintenance-autre");

      const summary = document.createElement("summary");
      let icone = "🔧";
      if (etat.includes("termin"))      icone = "✅";
      else if (etat.includes("cours"))  icone = "⚙️";
      else if (etat.includes("planif")) icone = "📅";
      const dateDisplay   = m.date_maintenance ? new Date(m.date_maintenance).toLocaleDateString('fr-FR') : 'N/A';
      const clientDisplay = m.client_nom || '';
      const siteDisplay   = m.site_nom   || '';
      summary.innerHTML = `${icone} ${[clientDisplay, siteDisplay, dateDisplay].filter(Boolean).join(' — ')}`;
      details.appendChild(summary);

      let etatColor = "#6C757D";
      if (etat.includes("termin"))      etatColor = "#28A745";
      else if (etat.includes("cours"))  etatColor = "#FFC107";
      else if (etat.includes("planif")) etatColor = "#0066CC";

      let operateursList = [];
      if (m.operateurs) operateursList = m.operateurs.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
      else operateursList = [m.operateur_1, m.operateur_2, m.operateur_3].filter(Boolean);

      const content = document.createElement("div");
      content.innerHTML = `
        <div><strong>N° RI :</strong> ${m.numero_ri || "N/A"}</div>
        <div><strong>Désignation :</strong> ${m.designation_produit_site || "N/A"}</div>
        <div><strong>Date :</strong> ${dateDisplay}</div>
        <div><strong>Type d'intervention :</strong> ${m.types_intervention || m.type || "N/A"}</div>
        <div><strong>État :</strong> <span style="color:${etatColor};font-weight:600;">${m.etat || "N/A"}</span></div>
        <div><strong>Département :</strong> ${m.departement || "N/A"}</div>
        ${operateursList.length ? `<div><strong>Personnes affectées :</strong> ${operateursList.join(' / ')}</div>` : ''}
        <div><strong>Garantie :</strong> ${m.garantie ? '✅ Oui' : '❌ Non'}</div>
        ${m.commentaire ? `<div><strong>Commentaire :</strong> ${m.commentaire}</div>` : ''}
        <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button class="btn-danger" onclick="deleteMaintenance(${m.id_maintenance})">Supprimer</button>
          <button class="btn-edit"   onclick="editMaintenanceById(${m.id_maintenance})">Modifier</button>
          <a href="./MaintenanceDetails/MaintenanceDetails.html?id_maintenance=${m.id_maintenance}"
            style="display:inline-block;padding:0.625rem 1.25rem;background:#0066CC;color:white;border-radius:8px;text-decoration:none;">Voir détails</a>
          <div style="display:flex;overflow:hidden;border-radius:8px;">
            <a href="${API}/maintenances/${m.id_maintenance}/html" target="_blank"
              style="background:#198754;color:white;padding:0.6rem 1rem;text-decoration:none;border-right:1px solid rgba(255,255,255,0.3);">👁 Aperçu RI</a>
            <a href="#"
            onclick="downloadPdf(${m.id_maintenance}); return false;"
            style="background:#157347;color:white;padding:0.6rem 1rem;text-decoration:none;">
            ⬇ PDF
          </a>
          </div>
        </div>
      `;
      details.appendChild(content);

      const li = document.createElement("li");
      li.style.cssText = "display:block;padding:0;border:none;background:transparent;";
      li.appendChild(details);
      ul.appendChild(li);
    });
  } catch (err) {
    document.getElementById("maintenancesList").innerHTML = `<li style="color:#DC3545;">${err.message}</li>`;
  }
}

async function downloadPdf(id_maintenance) {
  try {
    const res = await apiFetch(`${API}/maintenances/${id_maintenance}/pdf`);
    if (!res.ok) throw new Error("Erreur serveur");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `RI_maintenance_${id_maintenance}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert("Erreur lors du téléchargement du PDF");
    console.error(err);
  }
}

function showAddMaintenanceForm() {
  showMaintenanceForm();
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
loadMaintenanceForm("maintenance-form-container");
loadProduits();
loadSites();
loadClients();
loadMaintenances();

window.addEventListener('load', () => {
  if (document.getElementById("carte").classList.contains("active")) {
    setTimeout(() => initAllSitesMap(), 500);
  }
});