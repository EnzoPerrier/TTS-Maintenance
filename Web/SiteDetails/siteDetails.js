const API = "/api";

const params = new URLSearchParams(window.location.search);
const id_site = params.get("id_site");

let map = null;
let allEquipements = [];
let allMaintenances = [];
let editingEquipementId = null;

document.getElementById("backBtn").addEventListener("click", () => window.history.back());

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────

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

function parseDate(dateStr) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
}

function updateStats() { loadEquipements(); loadMaintenances(); }

// ─── INIT ─────────────────────────────────────────────────────────────────────

// Callbacks déclenchés par maintenanceForm.js après POST/PUT réussi
window.onMaintenanceCreated = async () => {
  await loadMaintenances();
  updateStats();
};

window.onMaintenanceUpdated = async () => {
  await loadMaintenances();
  updateStats();
};

// Wrapper pour ouvrir le formulaire en mode ajout avec id_site
function showAddMaintenanceForm() {
  showMaintenanceForm({ id_site });
}

// Wrapper global appelé depuis le HTML généré dynamiquement
function editMaintenanceById(id) {
  const m = allMaintenances.find(x => x.id_maintenance == id);
  if (!m) { alert("Maintenance introuvable"); return; }
  showEditMaintenanceForm(m);
}

// Suppression d'une maintenance
async function deleteMaintenance(id_maintenance) {
  if (!confirm("Voulez-vous vraiment supprimer cette maintenance ? (CETTE ACTION EST IRREVERSIBLE)")) return;
  try {
    const res = await apiapiFetch(`${API}/maintenances/${id_maintenance}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression"); return; }
    await loadMaintenances();
    updateStats();
    alert("\u2713 Maintenance supprimée avec succès !");
  } catch (err) { console.error(err); alert("Erreur serveur"); }
}

// Démarrage : injecter le formulaire (synchrone) puis charger les données
loadMaintenanceForm("maintenance-form-container");
loadSiteDetails();
loadMaintenances();
loadEquipements();

// ─── CHARGEMENT SITE ──────────────────────────────────────────────────────────

async function loadSiteDetails() {
  if (!id_site) { document.getElementById("siteDetails").textContent = "ID du site manquant."; return; }

  try {
    const res = await apiFetch(`${API}/sites/${id_site}`);
    if (!res.ok) throw new Error("Erreur lors du chargement du site");
    const site = await res.json();

    const res1 = await apiFetch(`${API}/clients/${site.id_client}`);
    if (!res1.ok) throw new Error("Erreur lors du chargement des infos client");
    const client = await res1.json();

    document.getElementById("siteDetails").innerHTML = `
      <div class="site-detail"><strong>Nom :</strong> ${site.nom}</div>
      <div class="site-detail"><strong>Client :</strong> ${client.nom}</div>
      <div class="site-detail"><strong>Contact :</strong> ${client.contact}</div>
      <div class="site-detail"><strong>Email :</strong> ${client.email ? `<a href="mailto:${client.email}">${client.email}</a>` : "N/A"}</div>
      <div class="site-detail"><strong>Téléphone :</strong> ${client.telephone ? `<a href="tel:${client.telephone}">${client.telephone}</a>` : "N/A"}</div>
      <div class="site-detail"><strong>Adresse :</strong> ${site.adresse}</div>
      <div class="site-detail"><strong>Latitude :</strong> ${site.gps_lat || "N/A"}</div>
      <div class="site-detail"><strong>Longitude :</strong> ${site.gps_lng || "N/A"}</div>
      <div class="site-detail"><strong>Date de création :</strong> ${site.date_creation}</div>
    `;

    if (site.gps_lat && site.gps_lng) {
      initMap(site.gps_lat, site.gps_lng, site.nom, site.adresse);
    } else {
      document.getElementById("mapContainer").innerHTML =
        '<div style="padding:2rem; text-align:center; color:#6C757D;">📍 Coordonnées GPS non disponibles pour ce site</div>';
    }
  } catch (err) {
    document.getElementById("siteDetails").textContent = err.message;
  }
}

// ─── CARTE ────────────────────────────────────────────────────────────────────

function initMap(lat, lng, nom, adresse) {
  lat = parseFloat(lat);
  lng = parseFloat(lng);
  if (isNaN(lat) || isNaN(lng)) {
    document.getElementById("mapContainer").innerHTML =
      '<div style="padding:2rem;text-align:center;color:#6C757D;">📍 Coordonnées GPS invalides</div>';
    return;
  }
  if (map) map.remove();
  map = L.map('map').setView([lat, lng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const customIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:linear-gradient(135deg,#0066CC 0%,#004A99 100%);width:40px;height:40px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:20px;color:white;">📍</span>
    </div>`,
    iconSize: [40,40], iconAnchor: [20,40], popupAnchor: [0,-40]
  });

  const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
  marker.bindPopup(`
    <div style="font-family:'Segoe UI',sans-serif;">
      <strong style="color:#0066CC;font-size:1.1em;">${nom}</strong><br/>
      <span style="color:#6C757D;">${adresse || 'Adresse non spécifiée'}</span><br/>
      <small style="color:#999;">📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}</small>
    </div>
  `).openPopup();

  L.circle([lat, lng], { color:'#0066CC', fillColor:'#3399FF', fillOpacity:0.1, radius:100 }).addTo(map);
}

// ─── MAINTENANCES ─────────────────────────────────────────────────────────────

async function loadMaintenances() {
  try {
    const res = await apiFetch(`${API}/maintenances/AllMaintenancesBySiteID/${id_site}`);
    if (!res.ok) throw new Error("Erreur lors du chargement des maintenances");
    allMaintenances = await res.json();

    const MaintDiv = document.getElementById("MaintenancesList");
    MaintDiv.innerHTML = "";

    const statsPlanifiees = allMaintenances.filter(m => (m.etat||"").toLowerCase().includes("planif")).length;
    const statsEnCours    = allMaintenances.filter(m => (m.etat||"").toLowerCase().includes("cours")).length;
    const statsTerminees  = allMaintenances.filter(m => (m.etat||"").toLowerCase().includes("termin")).length;

    document.getElementById("statsPlanifiees").textContent   = statsPlanifiees;
    document.getElementById("statsEnCours").textContent      = statsEnCours;
    document.getElementById("statsTerminees").textContent    = statsTerminees;
    document.getElementById("statsMaintenances").textContent = allMaintenances.length;

    if (allMaintenances.length === 0) {
      MaintDiv.textContent = "Aucune maintenance trouvée pour ce site.";
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
      summary.innerHTML = `${icone} ${m.types_intervention || m.type || "Maintenance"} - ${parseDate(m.date_maintenance)}`;
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
        <div><strong>Date demande :</strong> ${parseDate(m.date_demande)}</div>
        <div><strong>Date accord client :</strong> ${parseDate(m.date_accord_client)}</div>
        <div><strong>Date intervention :</strong> ${parseDate(m.date_maintenance)}</div>
        <div><strong>Type d'intervention :</strong> ${m.types_intervention || m.type || "N/A"}</div>
        <div><strong>Département :</strong> ${m.departement || "N/A"}</div>
        <div><strong>N° Affaire/CDE :</strong> ${m.numero_commande || "N/A"}</div>
        <div><strong>Contact :</strong> ${m.contact || "N/A"}</div>
        <div><strong>Type panneau/produit :</strong> ${m.type_produit || "N/A"}</div>
        ${operateursList.length ? `<div><strong>Personnes affectées :</strong> ${operateursList.join(' / ')}</div>` : ''}
        <div><strong>État :</strong> <span style="color:${etatColor};font-weight:600;">${m.etat || "N/A"}</span></div>
        <div><strong>Garantie :</strong> ${m.garantie ? '✅ Oui' : '❌ Non'}</div>
        ${m.commentaire ? `<div><strong>Commentaire :</strong> ${m.commentaire}</div>` : ''}
        <div style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button class="btn-danger" onclick="deleteMaintenance(${m.id_maintenance})">Supprimer</button>
          <button class="btn-edit" onclick="editMaintenanceById(${m.id_maintenance})">Modifier</button>
          <a href="../MaintenanceDetails/MaintenanceDetails.html?id_maintenance=${m.id_maintenance}"
            style="display:inline-block;padding:0.625rem 1.25rem;background:#0066CC;color:white;border-radius:8px;text-decoration:none;">Voir détails</a>
          <div style="display:flex;overflow:hidden;border-radius:8px;">
            <a href="${API}/maintenances/${m.id_maintenance}/html" target="_blank"
              style="background:#198754;color:white;padding:0.6rem 1rem;text-decoration:none;border-right:1px solid rgba(255,255,255,0.3);">👁 Aperçu RI</a>
            <a href="${API}/maintenances/${m.id_maintenance}/pdf"
              style="background:#157347;color:white;padding:0.6rem 1rem;text-decoration:none;">⬇ PDF</a>
          </div>
        </div>
      `;
      details.appendChild(content);
      MaintDiv.appendChild(details);
    });
  } catch (err) {
    document.getElementById("MaintenancesList").textContent = err.message;
  }
}

// ─── ÉQUIPEMENTS ──────────────────────────────────────────────────────────────

async function loadEquipements() {
  try {
    const res = await apiFetch(`${API}/produits/ProduitsBySiteID/${id_site}`);
    if (!res.ok) throw new Error("Erreur lors du chargement des produits");
    allEquipements = await res.json();

    const ProdDiv = document.getElementById("EquipementsList");
    ProdDiv.innerHTML = "";

    document.getElementById("statsEquipements").textContent = allEquipements.length;
    document.getElementById("statsOK").textContent          = allEquipements.filter(p => p.etat === "OK").length;
    document.getElementById("statsNOK").textContent         = allEquipements.filter(p => p.etat === "NOK").length;
    document.getElementById("statsPassable").textContent    = allEquipements.filter(p => p.etat === "Passable").length;

    if (allEquipements.length === 0) { ProdDiv.textContent = "Aucun équipement trouvé pour ce site."; return; }

    allEquipements.forEach(p => {
      const li = document.createElement("li");
      const etat = (p.etat || "").toLowerCase();
      if (etat === "ok")           li.classList.add("equipement-ok");
      else if (etat === "nok")     li.classList.add("equipement-nok");
      else if (etat === "passable")li.classList.add("equipement-passable");
      else                         li.classList.add("equipement-autre");

      let etatColor = "#6C757D";
      if (etat === "ok")           etatColor = "#28A745";
      else if (etat === "nok")     etatColor = "#DC3545";
      else if (etat === "passable")etatColor = "#FFC107";

      li.innerHTML = `
        <div style="flex:1;">
          <strong>${p.nom}</strong>
          ${p.departement ? " - " + p.departement : ""}
          ${p.etat ? ` - <span style="color:${etatColor};font-weight:600;">${p.etat}</span>` : ""}
          <br/><small style="color:#6C757D;">${p.description || ""}</small>
        </div>
        <div>
          <button class="btn-danger" onclick="deleteProduit(${p.id_produit})">Supprimer</button>
          <button class="btn-edit" onclick="editProduit(${p.id_produit})">Modifier</button>
          <button class="btn-qr" onclick="printQR(${p.id_produit})">QR</button>
          <button onclick="window.location.href='../ProduitDetails/produitDetails.html?id_produit=${p.id_produit}'" style="background:var(--secondary-blue);">Détails</button>
        </div>
      `;
      ProdDiv.appendChild(li);
    });
  } catch (err) {
    document.getElementById("EquipementsList").textContent = err.message;
  }
}

function showAddEquipementForm() {
  editingEquipementId = null;
  document.getElementById("equipementForm").reset();
  document.getElementById("equipementFormTitle").textContent = "Ajouter un équipement";
  document.getElementById("equipementSubmitBtn").textContent = "Ajouter";
  document.getElementById("addEquipementForm").style.display = "block";
}

function hideAddEquipementForm() {
  document.getElementById("addEquipementForm").style.display = "none";
  editingEquipementId = null;
  document.getElementById("equipementForm").reset();
}

async function addEquipement(event) {
  event.preventDefault();
  const data = {
    nom: document.getElementById("equipementNom").value,
    id_site,
    departement: document.getElementById("equipementDepartement").value || null,
    etat:        document.getElementById("equipementEtat").value || null,
    description: document.getElementById("equipementDescription").value || null
  };

  if (editingEquipementId !== null) { await updateEquipement(editingEquipementId, data); return; }

  try {
    const res = await apiFetch(`${API}/produits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) { alert("Erreur lors de l'ajout de l'équipement"); return; }
    const created = await res.json();

    const resQr = await apiFetch(`${API}/qrcodes/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 1, prefill: { id_produit: created.id_produit } })
    });
    if (!resQr.ok) alert("Équipement créé, mais erreur lors de la génération du QR code");

    hideAddEquipementForm();
    loadEquipements();
  } catch (err) { console.error(err); alert("Erreur serveur"); }
}

function editProduit(id_produit) {
  const p = allEquipements.find(p => p.id_produit === id_produit);
  if (!p) { alert("Produit non trouvé"); return; }
  editingEquipementId = id_produit;
  document.getElementById("equipementNom").value         = p.nom;
  document.getElementById("equipementDepartement").value = p.departement || '';
  document.getElementById("equipementEtat").value        = p.etat || '';
  document.getElementById("equipementDescription").value = p.description || '';
  document.getElementById("equipementFormTitle").textContent  = "Modifier un équipement";
  document.getElementById("equipementSubmitBtn").textContent  = "Valider";
  document.getElementById("addEquipementForm").style.display  = "block";
}

function editEquipement(id_produit) { return editProduit(id_produit); }

async function updateEquipement(id_produit, data) {
  if (!confirm("Êtes-vous sûr de vouloir modifier cet équipement ?")) return;
  try {
    const res = await apiFetch(`${API}/produits/${id_produit}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
    });
    if (!res.ok) { alert("Erreur lors de la modification"); return; }
    hideAddEquipementForm();
    loadEquipements();
    editingEquipementId = null;
  } catch (err) { console.error(err); alert("Erreur serveur"); }
}

async function deleteProduit(id_produit) {
  if (!confirm("Voulez-vous vraiment supprimer cet équipement ? (CETTE ACTION EST IRREVERSIBLE)")) return;
  try {
    const res = await apiFetch(`${API}/produits/${id_produit}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression"); return; }
    loadEquipements();
    alert("\u2713 Équipement supprimé avec succès !");
  } catch (err) { console.error(err); alert("Erreur serveur"); }
}

async function deleteEquipement(id_produit) { return deleteProduit(id_produit); }

function printQR(id) { window.open(`${API}/qrcodes/showqr/${id}`, "_blank"); }