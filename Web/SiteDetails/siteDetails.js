const API = "http://192.168.1.127:3000";

const params = new URLSearchParams(window.location.search);
const id_site = params.get("id_site");

let map = null;
let allEquipements = [];
let allMaintenances = [];
let editingEquipementId = null;
let editingMaintenanceId = null;

// Jours pour le tableau horaires
const JOURS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
const JOURS_JS = [1,2,3,4,5,6,0]; // getDay() correspondant

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

function toggleCheckedClass(checkbox) {
  checkbox.closest('.checkbox-item').classList.toggle('checked', checkbox.checked);
}

function resetHorairesForm() {
  JOURS.forEach(j => {
    ['matin_arr','matin_dep','apm_arr','apm_dep'].forEach(slot => {
      const el = document.getElementById(`add_${j}_${slot}`);
      if (el) el.value = '';
    });
  });
}

function resetTravauxCheckboxes() {
  const ids = ['installation','curative','revision','autres_g','contrat','autres_d'];
  ids.forEach(id => {
    const el = document.getElementById(`add_chk_${id}`);
    if (el) { el.checked = false; el.closest('.checkbox-item').classList.remove('checked'); }
  });
}

function collectTypes() {
  const chkMap = {
    add_chk_installation: 'Installation',
    add_chk_curative: 'Intervention Curative',
    add_chk_revision: 'Révision',
    add_chk_autres_g: 'Autres',
    add_chk_contrat: 'Contrat de maintenance',
    add_chk_autres_d: 'Autres',
  };
  const types = Object.entries(chkMap)
    .filter(([id]) => document.getElementById(id)?.checked)
    .map(([, val]) => val);
  return [...new Set(types)];
}

function collectJours(dateIntervention) {
  const jours = [];
  JOURS.forEach((j, idx) => {
    const arr_m = document.getElementById(`add_${j}_matin_arr`)?.value;
    const dep_m = document.getElementById(`add_${j}_matin_dep`)?.value;
    const arr_a = document.getElementById(`add_${j}_apm_arr`)?.value;
    const dep_a = document.getElementById(`add_${j}_apm_dep`)?.value;

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

// ─── CHARGEMENT SITE ──────────────────────────────────────────────────────────

async function loadSiteDetails() {
  if (!id_site) { document.getElementById("siteDetails").textContent = "ID du site manquant."; return; }

  try {
    const res = await fetch(`${API}/sites/${id_site}`);
    if (!res.ok) throw new Error("Erreur lors du chargement du site");
    const site = await res.json();

    const res1 = await fetch(`${API}/clients/${site.id_client}`);
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
    const res = await fetch(`${API}/maintenances/AllMaintenancesBySiteID/${id_site}`);
    if (!res.ok) throw new Error("Erreur lors du chargement des maintenances");
    allMaintenances = await res.json();

    const MaintDiv = document.getElementById("MaintenancesList");
    MaintDiv.innerHTML = "";

    const statsPlanifiees = allMaintenances.filter(m => (m.etat||"").toLowerCase().includes("planif")).length;
    const statsEnCours = allMaintenances.filter(m => (m.etat||"").toLowerCase().includes("cours")).length;
    const statsTerminees = allMaintenances.filter(m => (m.etat||"").toLowerCase().includes("termin")).length;

    document.getElementById("statsPlanifiees").textContent = statsPlanifiees;
    document.getElementById("statsEnCours").textContent = statsEnCours;
    document.getElementById("statsTerminees").textContent = statsTerminees;
    document.getElementById("statsMaintenances").textContent = allMaintenances.length;

    if (allMaintenances.length === 0) {
      MaintDiv.textContent = "Aucune maintenance trouvée pour ce site.";
      return;
    }

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
      summary.innerHTML = `${icone} ${m.types_intervention || m.type || "Maintenance"} - ${parseDate(m.date_maintenance)}`;
      details.appendChild(summary);

      let etatColor = "#6C757D";
      if (etat.includes("termin")) etatColor = "#28A745";
      else if (etat.includes("cours")) etatColor = "#FFC107";
      else if (etat.includes("planif")) etatColor = "#0066CC";

      // Opérateurs : lire depuis opérateurs ou colonnes legacy
      let operateursList = [];
      if (m.operateurs) {
        operateursList = m.operateurs.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
      } else {
        operateursList = [m.operateur_1, m.operateur_2, m.operateur_3].filter(Boolean);
      }

      const content = document.createElement("div");
      content.innerHTML = `
        <div><strong>N° RI :</strong> ${m.numero_ri || "N/A"}</div>
        <div><strong>Désignation :</strong> ${m.designation_produit_site || "N/A"}</div>
        <div><strong>Catégorie :</strong> ${m.categorie || "N/A"}</div>
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
          <button onclick="deleteMaintenance(${m.id_maintenance})" style="background:#DC3545;">Supprimer</button>
          <button onclick="editMaintenance(${m.id_maintenance})" style="background:#6C757D;">Modifier</button>
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

function showAddMaintenanceForm() {
  editingMaintenanceId = null;
  document.getElementById("maintenanceForm").reset();
  resetHorairesForm();
  resetTravauxCheckboxes();
  document.getElementById("addGarantieNon").checked = true;
  document.getElementById("maintenanceFormTitle").textContent = "📋 Ajouter une maintenance";
  document.getElementById("maintenanceSubmitLabel").textContent = "Ajouter";
  document.getElementById("addMaintenanceForm").style.display = "block";
}

function hideAddMaintenanceForm() {
  document.getElementById("addMaintenanceForm").style.display = "none";
  editingMaintenanceId = null;
  document.getElementById("maintenanceForm").reset();
  resetHorairesForm();
  resetTravauxCheckboxes();
}

async function addMaintenance(event) {
  event.preventDefault();

  const dateIntervention = document.getElementById("maintenanceDate").value;
  const types = collectTypes();
  const jours = collectJours(dateIntervention);

  const operateursRaw = document.getElementById("maintenanceOperateurs").value;
  const operateursList = operateursRaw.split('\n').map(s => s.trim()).filter(Boolean);

  const garantie = document.querySelector('input[name="maintenanceGarantie"]:checked')?.value === 'Oui' ? 1 : 0;

  const data = {
    id_site,
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
    commentaire: document.getElementById("commentaireMaintenance").value || null,
    garantie
  };

  if (editingMaintenanceId !== null) {
    await updateMaintenance(editingMaintenanceId, data);
    return;
  }

  try {
    const res = await fetch(`${API}/maintenances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) { alert("Erreur lors de l'ajout de la maintenance"); return; }
    hideAddMaintenanceForm();
    loadMaintenances();
    alert("✓ Maintenance ajoutée avec succès !");
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

function editMaintenance(id_maintenance) {
  const m = allMaintenances.find(m => m.id_maintenance === id_maintenance);
  if (!m) { alert("Maintenance non trouvée"); return; }

  editingMaintenanceId = id_maintenance;

  // Identification
  document.getElementById("maintenanceChrono").value = m.numero_ri || '';
  document.getElementById("maintenanceDateDemande").value = formatDateForInput(m.date_demande);
  document.getElementById("maintenanceClient").value = m.client_nom || m.site_nom || '';
  document.getElementById("maintenanceDesignation").value = m.designation_produit_site || '';
  document.getElementById("maintenanceDateAccordClient").value = formatDateForInput(m.date_accord_client);
  document.getElementById("maintenanceContact").value = m.contact || '';
  document.getElementById("maintenanceCategorie").value = m.categorie || '';
  document.getElementById("maintenanceDate").value = formatDateForInput(m.date_maintenance);
  document.getElementById("maintenanceTypeProduit").value = m.type_produit || '';
  document.getElementById("maintenanceTypeIntervention").value = '';
  document.getElementById("maintenanceDepartement").value = m.departement || '';
  document.getElementById("maintenanceNumeroCommande").value = m.numero_commande || '';
  document.getElementById("maintenanceEtat").value = m.etat || '';
  document.getElementById("commentaireMaintenance").value = m.commentaire || '';

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
      set(`add_${j}_matin_arr`, jour.heure_arrivee_matin);
      set(`add_${j}_matin_dep`, jour.heure_depart_matin);
      set(`add_${j}_apm_arr`, jour.heure_arrivee_aprem);
      set(`add_${j}_apm_dep`, jour.heure_depart_aprem);
    });
  } else if (m.date_maintenance) {
    const d = new Date(m.date_maintenance);
    const idx = JOURS_JS.indexOf(d.getDay());
    if (idx !== -1) {
      const j = JOURS[idx];
      const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val.substring(0,5); };
      set(`add_${j}_matin_arr`, m.heure_arrivee_matin);
      set(`add_${j}_matin_dep`, m.heure_depart_matin);
      set(`add_${j}_apm_arr`, m.heure_arrivee_aprem);
      set(`add_${j}_apm_dep`, m.heure_depart_aprem);
    }
  }

  // Nature des travaux
  resetTravauxCheckboxes();
  const typesStr = m.types_intervention || m.type || '';
  const typeMap = {
    'Installation': 'add_chk_installation',
    'Intervention Curative': 'add_chk_curative',
    'Intervention curative': 'add_chk_curative',
    'Révision': 'add_chk_revision',
    'Contrat de maintenance': 'add_chk_contrat',
    'Autres': 'add_chk_autres_g',
  };
  typesStr.split(',').map(t => t.trim()).filter(Boolean).forEach(t => {
    const id = typeMap[t];
    if (id) {
      const el = document.getElementById(id);
      if (el) { el.checked = true; el.closest('.checkbox-item').classList.add('checked'); }
    }
  });

  // Garantie
  const garantieOui = m.garantie === 1 || m.garantie === true || m.garantie === 'Oui';
  document.getElementById("addGarantieOui").checked = garantieOui;
  document.getElementById("addGarantieNon").checked = !garantieOui;

  document.getElementById("maintenanceFormTitle").textContent = "📝 Modifier la maintenance";
  document.getElementById("maintenanceSubmitLabel").textContent = "Valider";
  document.getElementById("addMaintenanceForm").style.display = "block";
}

async function updateMaintenance(id_maintenance, data) {
  if (!confirm("Êtes-vous sûr de vouloir modifier cette maintenance ?")) return;
  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) { alert("Erreur lors de la modification"); return; }
    hideAddMaintenanceForm();
    loadMaintenances();
    editingMaintenanceId = null;
    alert("✓ Maintenance modifiée avec succès !");
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

async function deleteMaintenance(id_maintenance) {
  if (!confirm("Voulez-vous vraiment supprimer cette maintenance ? (CETTE ACTION EST IRREVERSIBLE)")) return;
  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression"); return; }
    loadMaintenances();
    alert("✓ Maintenance supprimée avec succès !");
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

// ─── ÉQUIPEMENTS ──────────────────────────────────────────────────────────────

async function loadEquipements() {
  try {
    const res = await fetch(`${API}/produits/ProduitsBySiteID/${id_site}`);
    if (!res.ok) throw new Error("Erreur lors du chargement des produits");
    allEquipements = await res.json();

    const ProdDiv = document.getElementById("EquipementsList");
    ProdDiv.innerHTML = "";

    document.getElementById("statsEquipements").textContent = allEquipements.length;
    document.getElementById("statsOK").textContent = allEquipements.filter(p => p.etat === "OK").length;
    document.getElementById("statsNOK").textContent = allEquipements.filter(p => p.etat === "NOK").length;
    document.getElementById("statsPassable").textContent = allEquipements.filter(p => p.etat === "Passable").length;

    if (allEquipements.length === 0) { ProdDiv.textContent = "Aucun équipement trouvé pour ce site."; return; }

    allEquipements.forEach(p => {
      const li = document.createElement("li");
      li.setAttribute("id", "produitsList");
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
    etat: document.getElementById("equipementEtat").value || null,
    description: document.getElementById("equipementDescription").value || null
  };

  if (editingEquipementId !== null) { await updateEquipement(editingEquipementId, data); return; }

  try {
    const res = await fetch(`${API}/produits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) { alert("Erreur lors de l'ajout de l'équipement"); return; }
    const created = await res.json();

    const resQr = await fetch(`${API}/qrcodes/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 1, prefill: { id_produit: created.id_produit } })
    });
    if (!resQr.ok) alert("Équipement créé, mais erreur lors de la génération du QR code");

    hideAddEquipementForm();
    loadEquipements();
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

function editProduit(id_produit) {
  const p = allEquipements.find(p => p.id_produit === id_produit);
  if (!p) { alert("Produit non trouvé"); return; }
  editingEquipementId = id_produit;
  document.getElementById("equipementNom").value = p.nom;
  document.getElementById("equipementDepartement").value = p.departement || '';
  document.getElementById("equipementEtat").value = p.etat || '';
  document.getElementById("equipementDescription").value = p.description || '';
  document.getElementById("equipementFormTitle").textContent = "Modifier un équipement";
  document.getElementById("equipementSubmitBtn").textContent = "Valider";
  document.getElementById("addEquipementForm").style.display = "block";
}

function editEquipement(id_produit) { return editProduit(id_produit); }

async function updateEquipement(id_produit, data) {
  if (!confirm("Êtes-vous sûr de vouloir modifier cet équipement ?")) return;
  try {
    const res = await fetch(`${API}/produits/${id_produit}`, {
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
    const res = await fetch(`${API}/produits/${id_produit}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression"); return; }
    loadEquipements();
    alert("✓ Équipement supprimé avec succès !");
  } catch (err) { console.error(err); alert("Erreur serveur"); }
}

async function deleteEquipement(id_produit) { return deleteProduit(id_produit); }

function printQR(id) { window.open(`${API}/qrcodes/showqr/${id}`, "_blank"); }

function updateStats() { loadEquipements(); loadMaintenances(); }

// ─── INIT ─────────────────────────────────────────────────────────────────────

loadSiteDetails();
loadMaintenances();
loadEquipements();