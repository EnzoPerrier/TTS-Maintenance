let editingProduitId = null;
let editingClientId = null;
let allSitesMap = null;
let allClients = [];

const API = "http://192.168.1.127:3000";

// Jours pour le tableau horaires
const JOURS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
const JOURS_JS = [1,2,3,4,5,6,0];

function showSection(id) {
  document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === 'carte') {
    setTimeout(() => {
      if (allSitesMap) allSitesMap.invalidateSize();
      else initAllSitesMap();
    }, 100);
  }
  if (id === 'clients') loadClients();
}

// ─── UTILITAIRES FORMULAIRE MAINTENANCE ──────────────────────────────────────

function toggleCheckedClass(checkbox) {
  checkbox.closest('.checkbox-item').classList.toggle('checked', checkbox.checked);
}

function formatDateForInput(dateString) {
  if (!dateString) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [d, m, y] = dateString.split('/');
    return `${y}-${m}-${d}`;
  }
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function resetHorairesForm() {
  JOURS.forEach(j => {
    ['matin_arr','matin_dep','apm_arr','apm_dep'].forEach(slot => {
      const el = document.getElementById(`idx_${j}_${slot}`);
      if (el) el.value = '';
    });
  });
}

function resetTravauxCheckboxes() {
  ['installation','curative','revision','autres_g','contrat','autres_d'].forEach(id => {
    const el = document.getElementById(`idx_chk_${id}`);
    if (el) { el.checked = false; el.closest('.checkbox-item').classList.remove('checked'); }
  });
}

function collectTypes() {
  const chkMap = {
    idx_chk_installation: 'Installation',
    idx_chk_curative: 'Intervention Curative',
    idx_chk_revision: 'Révision',
    idx_chk_autres_g: 'Autres',
    idx_chk_contrat: 'Contrat de maintenance',
    idx_chk_autres_d: 'Autres',
  };
  const types = Object.entries(chkMap)
    .filter(([id]) => document.getElementById(id)?.checked)
    .map(([, val]) => val);
  return [...new Set(types)];
}

function collectJours(dateIntervention) {
  const jours = [];
  JOURS.forEach((j, idx) => {
    const arr_m = document.getElementById(`idx_${j}_matin_arr`)?.value;
    const dep_m = document.getElementById(`idx_${j}_matin_dep`)?.value;
    const arr_a = document.getElementById(`idx_${j}_apm_arr`)?.value;
    const dep_a = document.getElementById(`idx_${j}_apm_dep`)?.value;
    if (arr_m || dep_m || arr_a || dep_a) {
      const baseDate = new Date(dateIntervention || Date.now());
      const targetDow = JOURS_JS[idx];
      const diff = targetDow - baseDate.getDay();
      const jourDate = new Date(baseDate);
      jourDate.setDate(jourDate.getDate() + diff);
      jours.push({
        date_jour: jourDate.toISOString().split('T')[0],
        heure_arrivee_matin: arr_m || null,
        heure_depart_matin: dep_m || null,
        heure_arrivee_aprem: arr_a || null,
        heure_depart_aprem: dep_a || null
      });
    }
  });
  return jours;
}

/* ---------- CARTE ---------- */
async function initAllSitesMap() {
  try {
    const res = await fetch(`${API}/sites`);
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

/* ---------- CLIENTS ---------- */
let allClientsData = [];

async function loadClients() {
  try {
    const res = await fetch(`${API}/clients`);
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
      <div style="flex:1;cursor:pointer;" onclick="viewClientDetails(${client.id_client})">
        <strong>${client.nom}</strong><br/>
        <small style="color:#6C757D;">${client.contact ? client.contact + ' - ' : ''}${client.telephone ? '📞 ' + client.telephone : ''}${client.email ? ' - 📧 ' + client.email : ''}</small>
      </div>
      <div style="display:flex;gap:0.5rem;">
        <button onclick="deleteClient(${client.id_client});event.stopPropagation();" style="background:#DC3545;">Supprimer</button>
        <button onclick="editClient(${client.id_client});event.stopPropagation();" style="background:#6C757D;">Modifier</button>
        <button onclick="window.location.href='./ClientDetails/clientDetails.html?id_client=${client.id_client}';event.stopPropagation();" style="background:var(--secondary-blue);">Détails</button>
      </div>
    `;
    li.classList.add("clickable-line");
    list.appendChild(li);
  });
}

document.getElementById("searchClients").addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  renderClients(allClientsData.filter(c =>
    c.nom.toLowerCase().includes(term) ||
    (c.contact && c.contact.toLowerCase().includes(term)) ||
    (c.email && c.email.toLowerCase().includes(term)) ||
    (c.telephone && c.telephone.toLowerCase().includes(term))
  ));
});

function viewClientDetails(id_client) {}

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
    nom: document.getElementById("clientNom").value,
    contact: document.getElementById("clientContact").value,
    adresse: document.getElementById("clientAdresse").value || null,
    email: document.getElementById("clientEmail").value || null,
    telephone: document.getElementById("clientTelephone").value || null
  };
  if (editingClientId !== null) { await updateClient(editingClientId, data); return; }
  try {
    const res = await fetch(`${API}/clients`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { alert("Erreur lors de l'ajout du client"); return; }
    hideAddClientForm();
    loadClients();
    alert("Client ajouté avec succès !");
  } catch (err) { alert("Erreur serveur"); }
}

function editClient(id_client) {
  const client = allClientsData.find(c => c.id_client === id_client);
  if (!client) return alert("Client non trouvé");
  editingClientId = id_client;
  document.getElementById("clientNom").value = client.nom;
  document.getElementById("clientContact").value = client.contact || "";
  document.getElementById("clientAdresse").value = client.adresse || "";
  document.getElementById("clientEmail").value = client.email || "";
  document.getElementById("clientTelephone").value = client.telephone || "";
  document.getElementById("clientFormTitle").textContent = "Modifier un client";
  document.getElementById("clientSubmitBtn").textContent = "Valider";
  document.getElementById("addClientForm").style.display = "block";
}

async function updateClient(id_client, data) {
  if (!confirm("Êtes-vous sûr de vouloir modifier ce client ?")) return;
  try {
    const res = await fetch(`${API}/clients/${id_client}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { alert("Erreur lors de la modification du client"); return; }
    hideAddClientForm();
    loadClients();
    alert("Client modifié avec succès !");
  } catch (err) { alert("Erreur serveur"); }
}

async function deleteClient(id_client) {
  try {
    const resSites = await fetch(`${API}/sites`);
    const allSites = await resSites.json();
    const clientSites = allSites.filter(site => site.id_client == id_client);
    if (clientSites.length > 0) {
      alert(`❌ Impossible de supprimer ce client.\n\nIl a ${clientSites.length} site(s) associé(s):\n${clientSites.map(s => '- ' + s.nom).join('\n')}\n\nVeuillez d'abord supprimer ces sites.`);
      return;
    }
    if (!confirm("Voulez-vous vraiment supprimer ce client ? (CETTE ACTION EST IRREVERSIBLE)")) return;
    const res = await fetch(`${API}/clients/${id_client}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression du client"); return; }
    loadClients();
    alert("Client supprimé avec succès !");
  } catch (err) { alert("Erreur serveur"); }
}

/* ---------- SITES ---------- */
let allSites = [];
let editingSiteId = null;

async function loadClientsSelect() {
  try {
    const res = await fetch(`${API}/clients`);
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
  const res = await fetch(`${API}/sites`);
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
        <button onclick="deleteSite(${site.id_site})" style="background:#DC3545;">Supprimer</button>
        <button onclick="editSite(${site.id_site})" style="background:#6C757D;">Modifier</button>
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
    nom: document.getElementById("siteNom").value,
    adresse: document.getElementById("siteAdresse").value,
    gps_lat: document.getElementById("siteLat").value || null,
    gps_lng: document.getElementById("siteLng").value || null
  };
  if (editingSiteId !== null) { await updateSite(editingSiteId, data); return; }
  const res = await fetch(`${API}/sites`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (res.ok) {
    hideAddSiteForm();
    loadSites();
    if (document.getElementById("carte").classList.contains("active")) initAllSitesMap();
    alert("Site ajouté avec succès !");
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
    document.getElementById("siteNom").value = site.nom;
    document.getElementById("siteAdresse").value = site.adresse || "";
    document.getElementById("siteLat").value = site.gps_lat || "";
    document.getElementById("siteLng").value = site.gps_lng || "";
    document.getElementById("siteFormTitle").textContent = "Modifier un site";
    document.getElementById("siteSubmitBtn").textContent = "Valider";
    document.getElementById("addSiteForm").style.display = "block";
  });
}

async function updateSite(id_site, data) {
  if (!confirm("Êtes-vous sûr de vouloir modifier ce site ?")) return;
  try {
    const res = await fetch(`${API}/sites/${id_site}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { alert("Erreur lors de la modification du site"); return; }
    hideAddSiteForm();
    loadSites();
    if (document.getElementById("carte").classList.contains("active")) initAllSitesMap();
    alert("Site modifié avec succès !");
  } catch (err) { alert("Erreur serveur"); }
}

async function deleteSite(id_site) {
  try {
    const resProduits = await fetch(`${API}/produits/ProduitsBySiteID/${id_site}`);
    const produits = await resProduits.json();
    if (produits.length > 0) {
      alert(`❌ Impossible de supprimer ce site.\n\nIl a ${produits.length} équipement(s) associé(s):\n${produits.slice(0,5).map(p => '- ' + p.nom).join('\n')}${produits.length > 5 ? '\n...' : ''}\n\nVeuillez d'abord supprimer ces équipements.`);
      return;
    }
    const resMaintenances = await fetch(`${API}/maintenances/AllMaintenancesBySiteID/${id_site}`);
    const maintenances = await resMaintenances.json();
    if (maintenances.length > 0) {
      alert(`❌ Impossible de supprimer ce site.\n\nIl a ${maintenances.length} maintenance(s) associée(s).`);
      return;
    }
    if (!confirm("Voulez-vous vraiment supprimer ce site ? (CETTE ACTION EST IRREVERSIBLE)")) return;
    const res = await fetch(`${API}/sites/${id_site}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression du site"); return; }
    loadSites();
    if (document.getElementById("carte").classList.contains("active")) initAllSitesMap();
    alert("Site supprimé avec succès !");
  } catch (err) { alert("Erreur serveur"); }
}

/* ---------- PRODUITS ---------- */
let allProduits = [];

async function loadProduits() {
  const res = await fetch(`${API}/produits`);
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
    if (etat === "ok") li.classList.add("equipement-ok");
    else if (etat === "nok") li.classList.add("equipement-nok");
    else if (etat === "passable") li.classList.add("equipement-passable");
    else li.classList.add("equipement-autre");
    let etatColor = "#6C757D";
    if (etat === "ok") etatColor = "#28A745";
    else if (etat === "nok") etatColor = "#DC3545";
    else if (etat === "passable") etatColor = "#FFC107";
    li.innerHTML = `
      <div style="flex:1;">
        <strong>${p.nom}</strong>
        ${p.departement ? " - " + p.departement : ""}
        ${p.etat ? ` - <span style="color:${etatColor};font-weight:600;">${p.etat}</span>` : ""}
        <br/><small style="color:#6C757D;">${p.description || ""}</small>
      </div>
      <div>
        <button onclick="deleteProduit(${p.id_produit})">Supprimer</button>
        <button onclick="editProduit(${p.id_produit})">Modifier</button>
        <button onclick="printQR(${p.id_produit})">QR</button>
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
    (p.etat && p.etat.toLowerCase().includes(term))
  ));
});

const produitsSection = document.getElementById("produits");
produitsSection.insertBefore(document.getElementById("searchProduits"), document.getElementById("produitsList"));

function initSiteSearch() {
  const searchInput = document.getElementById("produitSiteSearch");
  const resultsDiv = document.getElementById("siteSearchResults");
  const hiddenIdInput = document.getElementById("produitSiteId");
  if (!searchInput) return;

  searchInput.addEventListener("input", async (e) => {
    const searchTerm = e.target.value.trim().toLowerCase();
    if (searchTerm === "") { resultsDiv.style.display = "none"; resultsDiv.innerHTML = ""; hiddenIdInput.value = ""; return; }
    const filtered = allSites.filter(site => site.nom.toLowerCase().includes(searchTerm) || (site.adresse && site.adresse.toLowerCase().includes(searchTerm)));
    if (filtered.length > 0) {
      resultsDiv.innerHTML = "";
      resultsDiv.style.display = "block";
      filtered.forEach(site => {
        const div = document.createElement("div");
        div.style.cssText = "padding:0.75rem;cursor:pointer;border-bottom:1px solid var(--gray-200);transition:background 0.2s ease;";
        div.innerHTML = `<strong style="color:var(--gray-800);">${site.nom}</strong><br/><small style="color:var(--gray-600);">${site.adresse || "Pas d'adresse"}</small>`;
        div.addEventListener("mouseenter", () => div.style.background = "var(--gray-50)");
        div.addEventListener("mouseleave", () => div.style.background = "white");
        div.addEventListener("click", () => { searchInput.value = site.nom; hiddenIdInput.value = site.id_site; resultsDiv.style.display = "none"; resultsDiv.innerHTML = ""; });
        resultsDiv.appendChild(div);
      });
    } else {
      resultsDiv.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--gray-600);">Aucun site trouvé</div>';
      resultsDiv.style.display = "block";
    }
  });

  document.addEventListener("click", (e) => { if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) resultsDiv.style.display = "none"; });
  resultsDiv.addEventListener("click", e => e.stopPropagation());
}

async function addProduit(e) {
  e.preventDefault();
  const data = {
    nom: document.getElementById("produitNom").value,
    id_site: document.getElementById("produitSiteId").value,
    departement: document.getElementById("produitDepartement").value || null,
    etat: document.getElementById("produitEtat").value || null,
    description: document.getElementById("produitDescription").value || null
  };
  if (editingProduitId !== null) { await updateProduit(editingProduitId, data); return; }
  const res = await fetch(`${API}/produits`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) { alert("Erreur lors de l'ajout du produit"); return; }
  const createdProduit = await res.json();
  const resQr = await fetch(`${API}/qrcodes/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: 1, prefill: { id_produit: createdProduit.id_produit } }) });
  if (!resQr.ok) { alert("Produit créé, mais erreur lors de la génération du QR code"); return; }
  hideAddProduitForm();
  loadProduits();
  document.getElementById("produitForm").reset();
}

function showAddProduitForm() {
  editingProduitId = null;
  document.getElementById("produitForm").reset();
  document.getElementById("produitSiteSearch").value = "";
  document.getElementById("produitSiteId").value = "";
  document.getElementById("siteSearchResults").style.display = "none";
  document.getElementById("siteSearchResults").innerHTML = "";
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
    const res = await fetch(`${API}/produits/${id_produit}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression du produit"); return; }
    loadProduits();
  } catch (err) { alert("Erreur serveur lors de la suppression"); }
}

function editProduit(id_produit) {
  const produit = allProduits.find(p => p.id_produit === id_produit);
  if (!produit) return alert("Produit non trouvé");
  editingProduitId = id_produit;
  document.getElementById("produitNom").value = produit.nom;
  const site = allSites.find(s => s.id_site === produit.id_site);
  if (site) { document.getElementById("produitSiteSearch").value = site.nom; document.getElementById("produitSiteId").value = site.id_site; }
  document.getElementById("produitDepartement").value = produit.departement || "";
  document.getElementById("produitEtat").value = produit.etat || "";
  document.getElementById("produitDescription").value = produit.description || "";
  const formTitle = document.querySelector("#addProduitForm h3");
  if (formTitle) formTitle.textContent = "Modifier un produit";
  document.querySelector("#addProduitForm button[type='submit']").textContent = "Valider la modification";
  document.getElementById("addProduitForm").style.display = "block";
  setTimeout(() => initSiteSearch(), 100);
}

async function updateProduit(id_produit, data) {
  if (!confirm("Êtes-vous sûr de vouloir modifier ce produit ?")) return;
  try {
    const res = await fetch(`${API}/produits/${id_produit}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { alert("Erreur lors de la modification du produit"); return; }
    hideAddProduitForm();
    loadProduits();
    document.getElementById("produitForm").reset();
    editingProduitId = null;
  } catch (err) { alert("Erreur serveur lors de la modification"); }
}

function printQR(id) { window.open(`${API}/qrcodes/showqr/${id}`, "_blank"); }

/* ---------- MAINTENANCES ---------- */
let editingMaintenanceId = null;
let allMaintenances = [];

async function loadMaintenances() {
  const res = await fetch(`${API}/maintenances/NotFinished`);
  allMaintenances = await res.json();
  const ul = document.getElementById("maintenancesList");
  ul.innerHTML = "";

  allMaintenances.forEach(m => {
    const details = document.createElement("details");
    details.classList.add("site-detail", "maintenance");
    const etat = (m.etat || "").toLowerCase();
    if (etat.includes("termin")) details.classList.add("maintenance-terminee");
    else if (etat.includes("cours")) details.classList.add("maintenance-en-cours");
    else if (etat.includes("planif")) details.classList.add("maintenance-planifiee");
    else details.classList.add("maintenance-autre");

    const summary = document.createElement("summary");
    let icone = "🔧";
    if (etat.includes("termin")) icone = "✅";
    else if (etat.includes("cours")) icone = "⚙️";
    else if (etat.includes("planif")) icone = "📅";
    summary.innerHTML = `${icone} ${m.types_intervention || m.type || "Maintenance"} - ${m.date_maintenance}`;
    details.appendChild(summary);

    let etatColor = "#6C757D";
    if (etat.includes("termin")) etatColor = "#28A745";
    else if (etat.includes("cours")) etatColor = "#FFC107";
    else if (etat.includes("planif")) etatColor = "#0066CC";

    let operateursList = [];
    if (m.operateurs) operateursList = m.operateurs.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    else operateursList = [m.operateur_1, m.operateur_2, m.operateur_3].filter(Boolean);

    const content = document.createElement("div");
    content.innerHTML = `
      <div><strong>N° RI :</strong> ${m.numero_ri || "N/A"}</div>
      <div><strong>Désignation :</strong> ${m.designation_produit_site || "N/A"}</div>
      <div><strong>Catégorie :</strong> ${m.categorie || "N/A"}</div>
      <div><strong>Date :</strong> ${m.date_maintenance}</div>
      <div><strong>Type d'intervention :</strong> ${m.types_intervention || m.type || "N/A"}</div>
      <div><strong>État :</strong> <span style="color:${etatColor};font-weight:600;">${m.etat || "N/A"}</span></div>
      <div><strong>Département :</strong> ${m.departement || "N/A"}</div>
      ${operateursList.length ? `<div><strong>Personnes affectées :</strong> ${operateursList.join(' / ')}</div>` : ''}
      <div><strong>Commentaire :</strong> ${m.commentaire || "N/A"}</div>
      <div><strong>Garantie :</strong> ${m.garantie ? '✅' : '❌'}</div>
      <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button onclick="deleteMaintenance(${m.id_maintenance})" style="background:#DC3545;">Supprimer</button>
        <button onclick="editMaintenance(${m.id_maintenance})" style="background:#6C757D;">Modifier</button>
        <a href="./MaintenanceDetails/MaintenanceDetails.html?id_maintenance=${m.id_maintenance}" style="display:inline-block;padding:0.625rem 1.25rem;background:#0066CC;color:white;border-radius:8px;text-decoration:none;">Voir détails</a>
        <div style="display:flex;overflow:hidden;border-radius:8px;">
          <a href="${API}/maintenances/${m.id_maintenance}/html" target="_blank" style="background:#198754;color:white;padding:0.6rem 1rem;text-decoration:none;border-right:1px solid rgba(255,255,255,0.3);">👁 Aperçu RI</a>
          <a href="${API}/maintenances/${m.id_maintenance}/pdf" style="background:#157347;color:white;padding:0.6rem 1rem;text-decoration:none;">⬇ PDF</a>
        </div>
      </div>
    `;
    details.appendChild(content);
    document.getElementById("maintenancesList").appendChild(details);
  });
}

async function editMaintenance(id_maintenance) {
  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`);
    if (!res.ok) { alert("Erreur lors du chargement de la maintenance"); return; }
    const m = await res.json();

    editingMaintenanceId = id_maintenance;

    // Identification
    document.getElementById("maintenanceChrono").value = m.numero_ri || '';
    document.getElementById("maintenanceDateDemande").value = formatDateForInput(m.date_demande);
    document.getElementById("maintenanceClient").value = m.client_nom || m.site_nom || '';
    document.getElementById("maintenanceDesignation").value = m.designation_produit_site || '';
    document.getElementById("maintenanceDateAccordClient").value = formatDateForInput(m.date_accord_client);
    document.getElementById("maintenanceContact").value = m.contact || '';
    document.getElementById("maintenanceCategorie").value = m.categorie || '';
    document.getElementById("maintenanceDateMaintenance").value = formatDateForInput(m.date_maintenance);
    document.getElementById("maintenanceTypeProduit").value = m.type_produit || '';
    document.getElementById("maintenanceTypeIntervention").value = '';
    document.getElementById("maintenanceDepartement").value = m.departement || '';
    document.getElementById("maintenanceNumeroCommande").value = m.numero_commande || '';
    document.getElementById("maintenanceEtat").value = m.etat || '';
    document.getElementById("maintenanceCommentaire").value = m.commentaire || '';

    // Opérateurs
    let operateursList = [];
    if (m.operateurs) operateursList = m.operateurs.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    else operateursList = [m.operateur_1, m.operateur_2, m.operateur_3].filter(Boolean);
    document.getElementById("maintenanceOperateurs").value = operateursList.join('\n');

    // Horaires
    resetHorairesForm();
    let jours = [];
    if (m.jours_intervention) {
      try { jours = typeof m.jours_intervention === 'object' ? m.jours_intervention : JSON.parse(m.jours_intervention); }
      catch { jours = []; }
    }
    if (jours.length > 0) {
      jours.forEach(jour => {
        const d = new Date(jour.date_jour);
        const idx = JOURS_JS.indexOf(d.getDay());
        if (idx === -1) return;
        const j = JOURS[idx];
        const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val.substring(0,5); };
        set(`idx_${j}_matin_arr`, jour.heure_arrivee_matin);
        set(`idx_${j}_matin_dep`, jour.heure_depart_matin);
        set(`idx_${j}_apm_arr`, jour.heure_arrivee_aprem);
        set(`idx_${j}_apm_dep`, jour.heure_depart_aprem);
      });
    } else if (m.date_maintenance) {
      const d = new Date(m.date_maintenance);
      const idx = JOURS_JS.indexOf(d.getDay());
      if (idx !== -1) {
        const j = JOURS[idx];
        const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val.substring(0,5); };
        set(`idx_${j}_matin_arr`, m.heure_arrivee_matin);
        set(`idx_${j}_matin_dep`, m.heure_depart_matin);
        set(`idx_${j}_apm_arr`, m.heure_arrivee_aprem);
        set(`idx_${j}_apm_dep`, m.heure_depart_aprem);
      }
    }

    // Nature des travaux
    resetTravauxCheckboxes();
    const typesStr = m.types_intervention || m.type || '';
    const typeMap = {
      'Installation': 'idx_chk_installation',
      'Intervention Curative': 'idx_chk_curative',
      'Intervention curative': 'idx_chk_curative',
      'Révision': 'idx_chk_revision',
      'Contrat de maintenance': 'idx_chk_contrat',
      'Autres': 'idx_chk_autres_g',
    };
    typesStr.split(',').map(t => t.trim()).filter(Boolean).forEach(t => {
      const id = typeMap[t];
      if (id) { const el = document.getElementById(id); if (el) { el.checked = true; el.closest('.checkbox-item').classList.add('checked'); } }
    });

    // Garantie
    const garantieOui = m.garantie === 1 || m.garantie === true || m.garantie === 'Oui';
    document.getElementById("idxGarantieOui").checked = garantieOui;
    document.getElementById("idxGarantieNon").checked = !garantieOui;

    document.getElementById("maintenanceFormTitle").textContent = "📝 Modifier la maintenance";
    document.getElementById("maintenanceSubmitLabel").textContent = "Valider";
    document.getElementById("addMaintenanceForm").style.display = "block";
  } catch (err) { console.error(err); alert("Erreur serveur"); }
}

async function updateMaintenance(id_maintenance, data) {
  if (!confirm("Êtes-vous sûr de vouloir modifier cette maintenance ?")) return;
  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { alert("Erreur lors de la modification de la maintenance"); return; }
    hideAddMaintenanceForm();
    loadMaintenances();
    alert("Maintenance modifiée avec succès !");
  } catch (err) { alert("Erreur serveur"); }
}

async function deleteMaintenance(id_maintenance) {
  if (!confirm("Voulez-vous vraiment supprimer cette maintenance ? (CETTE ACTION EST IRREVERSIBLE)")) return;
  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression de la maintenance"); return; }
    loadMaintenances();
    alert("Maintenance supprimée avec succès !");
  } catch (err) { alert("Erreur serveur"); }
}

function hideAddMaintenanceForm() {
  document.getElementById("addMaintenanceForm").style.display = "none";
  editingMaintenanceId = null;
  document.getElementById("maintenanceForm").reset();
  resetHorairesForm();
  resetTravauxCheckboxes();
}

function showAddMaintenanceForm() {
  editingMaintenanceId = null;
  document.getElementById("maintenanceForm").reset();
  resetHorairesForm();
  resetTravauxCheckboxes();
  document.getElementById("idxGarantieNon").checked = true;
  document.getElementById("maintenanceFormTitle").textContent = "📋 Ajouter une maintenance";
  document.getElementById("maintenanceSubmitLabel").textContent = "Ajouter";
  document.getElementById("addMaintenanceForm").style.display = "block";
}

async function addMaintenance(event) {
  event.preventDefault();

  const dateIntervention = document.getElementById("maintenanceDateMaintenance").value;
  const types = collectTypes();
  const jours = collectJours(dateIntervention);

  const operateursRaw = document.getElementById("maintenanceOperateurs").value;
  const operateursList = operateursRaw.split('\n').map(s => s.trim()).filter(Boolean);

  const garantie = document.querySelector('input[name="maintenanceGarantie"]:checked')?.value === 'Oui' ? 1 : 0;

  const data = {
    numero_ri: document.getElementById("maintenanceChrono").value || null,
    designation_produit_site: document.getElementById("maintenanceDesignation").value || null,
    categorie: document.getElementById("maintenanceCategorie").value || null,
    types,
    type: types.join(',') || document.getElementById("maintenanceTypeIntervention").value || null,
    types_intervention: types.join(',') || document.getElementById("maintenanceTypeIntervention").value || null,
    departement: document.getElementById("maintenanceDepartement").value || null,
    date_demande: document.getElementById("maintenanceDateDemande").value || null,
    date_accord_client: document.getElementById("maintenanceDateAccordClient").value || null,
    date_maintenance: dateIntervention || null,
    contact: document.getElementById("maintenanceContact").value || null,
    type_produit: document.getElementById("maintenanceTypeProduit").value || null,
    numero_commande: document.getElementById("maintenanceNumeroCommande").value || null,
    operateurs: operateursList,
    operateur_1: operateursList[0] || null,
    operateur_2: operateursList[1] || null,
    operateur_3: operateursList[2] || null,
    jours: jours.length > 0 ? jours : undefined,
    etat: document.getElementById("maintenanceEtat").value || null,
    commentaire: document.getElementById("maintenanceCommentaire").value || null,
    garantie
  };

  if (editingMaintenanceId !== null) { await updateMaintenance(editingMaintenanceId, data); return; }

  try {
    const res = await fetch(`${API}/maintenances`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { alert("Erreur lors de l'ajout de la maintenance"); return; }
    hideAddMaintenanceForm();
    loadMaintenances();
    alert("Maintenance ajoutée avec succès !");
  } catch (err) { alert("Erreur serveur"); }
}

/* ---------- INIT ---------- */
loadProduits();
loadSites();
loadMaintenances();
loadClients();

window.addEventListener('load', () => {
  if (document.getElementById("carte").classList.contains("active")) {
    setTimeout(() => initAllSitesMap(), 500);
  }
});