const API = "http://192.168.1.127:3000";

const params = new URLSearchParams(window.location.search);
const id_site = params.get("id_site");

let map = null;
let allEquipements = [];
let allMaintenances = [];
let editingEquipementId = null;
let editingMaintenanceId = null;

document.getElementById("backBtn").addEventListener("click", () => {
  window.history.back();
});

// ========== CHARGEMENT SITE ==========
async function loadSiteDetails() {
  if (!id_site) {
    document.getElementById("siteDetails").textContent = "ID du site manquant.";
    return;
  }

  try {
    const res = await fetch(`${API}/sites/${id_site}`);
    if (!res.ok) throw new Error("Erreur lors du chargement du site");

    const site = await res.json();

    const SiteDiv = document.getElementById("siteDetails");
    SiteDiv.innerHTML = `
      <div class="site-detail"><strong>Nom :</strong> ${site.nom}</div>
      <div class="site-detail"><strong>ID Site :</strong> ${site.id_site}</div>
      <div class="site-detail"><strong>Adresse :</strong> ${site.adresse}</div>
      <div class="site-detail"><strong>ID Client :</strong> ${site.id_client}</div>
      <div class="site-detail"><strong>Latitude :</strong> ${site.gps_lat || "N/A"}</div>
      <div class="site-detail"><strong>Longitude :</strong> ${site.gps_lng || "N/A"}</div>
    `;

    if (site.gps_lat && site.gps_lng) {
      initMap(site.gps_lat, site.gps_lng, site.nom, site.adresse);
    } else {
      document.getElementById("mapContainer").innerHTML = 
        '<div style="padding: 2rem; text-align: center; color: #6C757D;">📍 Coordonnées GPS non disponibles pour ce site</div>';
    }
  } catch (err) {
    document.getElementById("siteDetails").textContent = err.message;
  }
}

// ========== CARTE ==========
function initMap(lat, lng, nom, adresse) {
  lat = parseFloat(lat);
  lng = parseFloat(lng);

  if (isNaN(lat) || isNaN(lng)) {
    document.getElementById("mapContainer").innerHTML = 
      '<div style="padding: 2rem; text-align: center; color: #6C757D;">📍 Coordonnées GPS invalides</div>';
    return;
  }

  if (map) {
    map.remove();
  }

  map = L.map('map').setView([lat, lng], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const customIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: linear-gradient(135deg, #0066CC 0%, #004A99 100%);
      width: 40px;
      height: 40px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="
        transform: rotate(45deg);
        font-size: 20px;
        color: white;
      ">📍</span>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });

  const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

  marker.bindPopup(`
    <div style="font-family: 'Segoe UI', sans-serif;">
      <strong style="color: #0066CC; font-size: 1.1em;">${nom}</strong><br/>
      <span style="color: #6C757D;">${adresse || 'Adresse non spécifiée'}</span><br/>
      <small style="color: #999;">📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}</small>
    </div>
  `).openPopup();

  L.circle([lat, lng], {
    color: '#0066CC',
    fillColor: '#3399FF',
    fillOpacity: 0.1,
    radius: 100
  }).addTo(map);
}

// ========== MAINTENANCES ==========
async function loadMaintenances() {
  try {
    const res = await fetch(`${API}/maintenances/AllMaintenancesBySiteID/${id_site}`);
    if (!res.ok) throw new Error("Erreur lors du chargement des maintenances");

    allMaintenances = await res.json();
    const MaintDiv = document.getElementById("MaintenancesList");
    MaintDiv.innerHTML = "";

    // Calcul des statistiques par état
    const statsPlanifiees = allMaintenances.filter(m => {
      const etat = (m.etat || "").toLowerCase();
      return etat.includes("planif");
    }).length;

    const statsEnCours = allMaintenances.filter(m => {
      const etat = (m.etat || "").toLowerCase();
      return etat.includes("cours");
    }).length;

    const statsTerminees = allMaintenances.filter(m => {
      const etat = (m.etat || "").toLowerCase();
      return etat.includes("termin");
    }).length;

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

      // Classes CSS pour l'état
      if (etat.includes("termin")) {
        details.classList.add("maintenance-terminee");
      } else if (etat.includes("cours")) {
        details.classList.add("maintenance-en-cours");
      } else if (etat.includes("planif")) {
        details.classList.add("maintenance-planifiee");
      } else {
        details.classList.add("maintenance-autre");
      }

      const summary = document.createElement("summary");
      
      // Icône selon l'état
      let icone = "🔧";
      if (etat.includes("termin")) icone = "✅";
      else if (etat.includes("cours")) icone = "⚙️";
      else if (etat.includes("planif")) icone = "📅";

      summary.innerHTML = `${icone} ${m.type || "Maintenance"} - ${m.date_maintenance}`;
      details.appendChild(summary);

      // Couleur de l'état
      let etatColor = "#6C757D";
      if (etat.includes("termin")) etatColor = "#28A745";
      else if (etat.includes("cours")) etatColor = "#FFC107";
      else if (etat.includes("planif")) etatColor = "#0066CC";

      const content = document.createElement("div");
      content.innerHTML = `
        <div><strong>ID :</strong> ${m.id_maintenance}</div>
        <div><strong>Date :</strong> ${m.date_maintenance}</div>
        <div><strong>Type :</strong> ${m.type}</div>
        <div><strong>État :</strong> <span style="color: ${etatColor}; font-weight: 600;">${m.etat || "N/A"}</span></div>
        <div><strong>Département :</strong> ${m.departement || "N/A"}</div>
        <div><strong>Commentaire :</strong> ${m.commentaire || "N/A"}</div>
        <div><strong>RI interne :</strong> ${m.ri_interne || "N/A"}</div>
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button onclick="editMaintenance(${m.id_maintenance})" style="background: #6C757D;">Modifier</button>
          <button onclick="deleteMaintenance(${m.id_maintenance})" style="background: #DC3545;">Supprimer</button>
          <a href="../MaintenanceDetails/MaintenanceDetails.html?id_maintenance=${m.id_maintenance}" style="display: inline-block; padding: 0.625rem 1.25rem; background: #0066CC; color: white; border-radius: 8px; text-decoration: none;">Voir détails</a>
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
  document.getElementById("maintenanceFormTitle").textContent = "Ajouter une maintenance";
  document.getElementById("maintenanceSubmitBtn").textContent = "Ajouter";
  document.getElementById("addMaintenanceForm").style.display = "block";
}

function hideAddMaintenanceForm() {
  document.getElementById("addMaintenanceForm").style.display = "none";
  editingMaintenanceId = null;
  document.getElementById("maintenanceForm").reset();
}

async function addMaintenance(event) {
  event.preventDefault();

  const data = {
    id_site: id_site,
    date_maintenance: document.getElementById("maintenanceDate").value,
    type: document.getElementById("maintenanceType").value,
    etat: document.getElementById("maintenanceEtat").value || null,
    departement: document.getElementById("maintenanceDepartement").value || null,
    commentaire: document.getElementById("maintenanceCommentaire").value || null,
    ri_interne: document.getElementById("maintenanceRI").value || null
  };

  // Si on est en mode édition
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

    if (!res.ok) {
      alert("Erreur lors de l'ajout de la maintenance");
      return;
    }

    hideAddMaintenanceForm();
    loadMaintenances();
    updateStats();
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

function editMaintenance(id_maintenance) {
  const maintenance = allMaintenances.find(m => m.id_maintenance === id_maintenance);
  if (!maintenance) return alert("Maintenance non trouvée");

  editingMaintenanceId = id_maintenance;

  // Pré-remplir le formulaire
  document.getElementById("maintenanceDate").value = maintenance.date_maintenance;
  document.getElementById("maintenanceType").value = maintenance.type;
  document.getElementById("maintenanceEtat").value = maintenance.etat || "";
  document.getElementById("maintenanceDepartement").value = maintenance.departement || "";
  document.getElementById("maintenanceCommentaire").value = maintenance.commentaire || "";
  document.getElementById("maintenanceRI").value = maintenance.ri_interne || "";

  document.getElementById("maintenanceFormTitle").textContent = "Modifier une maintenance";
  document.getElementById("maintenanceSubmitBtn").textContent = "Valider";

  document.getElementById("addMaintenanceForm").style.display = "block";
}

async function updateMaintenance(id_maintenance, data) {
  const confirmUpdate = confirm("Êtes-vous sûr de vouloir modifier cette maintenance ?");
  if (!confirmUpdate) return;

  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      alert("Erreur lors de la modification");
      return;
    }

    hideAddMaintenanceForm();
    loadMaintenances();
    updateStats();
    editingMaintenanceId = null;

  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

async function deleteMaintenance(id_maintenance) {
  const confirmDelete = confirm("Voulez-vous vraiment supprimer cette maintenance ?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      alert("Erreur lors de la suppression");
      return;
    }

    loadMaintenances();
    updateStats();
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

// ========== ÉQUIPEMENTS ==========
async function loadEquipements() {
  try {
    const res = await fetch(`${API}/produits/ProduitsBySiteID/${id_site}`);
    if (!res.ok) throw new Error("Erreur lors du chargement des produits");

    allEquipements = await res.json();
    const ProdDiv = document.getElementById("EquipementsList");
    ProdDiv.innerHTML = "";

    document.getElementById("statsEquipements").textContent = allEquipements.length;

    // Stats par état
    const statsOK = allEquipements.filter(p => p.etat === "OK").length;
    const statsNOK = allEquipements.filter(p => p.etat === "NOK").length;
    const statsPassable = allEquipements.filter(p => p.etat === "Passable").length;
    document.getElementById("statsOK").textContent = statsOK;
    document.getElementById("statsNOK").textContent = statsNOK;
    document.getElementById("statsPassable").textContent = statsPassable;

    if (allEquipements.length === 0) {
      ProdDiv.textContent = "Aucun équipement trouvé pour ce site.";
      return;
    }

    allEquipements.forEach(p => {
      const li = document.createElement("li");
      li.classList.add("site-detail", "equipement");

      const etat = (p.etat || "").toLowerCase();

      if (etat === "ok") {
        li.classList.add("equipement-ok");
      } else if (etat === "nok") {
        li.classList.add("equipement-nok");
      } else if (etat === "passable") {
        li.classList.add("equipement-passable");
      } else {
        li.classList.add("equipement-autre");
      }

      li.innerHTML = `
        <div style="flex: 1;">
          <strong>${p.nom}</strong>
          ${p.departement ? " - " + p.departement : ""}
          ${p.etat ? " - <span style='color: ${etat === 'ok' ? '#28A745' : etat === 'nok' ? '#DC3545' : '#FFC107'}'>" + p.etat + "</span>" : ""}
          <br/>
          <small style="color: #6C757D;">${p.description || ""}</small>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button onclick="deleteEquipement(${p.id_produit})" style="background: #DC3545;">Supprimer</button>
          <button onclick="editEquipement(${p.id_produit})" style="background: #6C757D;">Modifier</button>
          <button onclick="printQR(${p.id_produit})" style="background: #FF6600;">QR</button>
          <button onclick="window.location.href='../ProduitDetails/produitDetails.html?id_produit=${p.id_produit}'" style="background: var(--secondary-blue);">Détails</button>
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
    id_site: id_site,
    departement: document.getElementById("equipementDepartement").value || null,
    etat: document.getElementById("equipementEtat").value || null,
    description: document.getElementById("equipementDescription").value || null
  };

  // Si on est en mode édition
  if (editingEquipementId !== null) {
    await updateEquipement(editingEquipementId, data);
    return;
  }

  try {
    const res = await fetch(`${API}/produits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      alert("Erreur lors de l'ajout de l'équipement");
      return;
    }

    const createdProduit = await res.json();
    const produitId = createdProduit.id_produit;

    // Création du QR code
    const dataQr = {
      count: 1,
      prefill: {
        id_produit: produitId
      }
    };

    const resQr = await fetch(`${API}/qrcodes/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataQr)
    });

    if (!resQr.ok) {
      alert("Équipement créé, mais erreur lors de la génération du QR code");
    }

    hideAddEquipementForm();
    loadEquipements();
    updateStats();
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

function editEquipement(id_produit) {
  const produit = allEquipements.find(p => p.id_produit === id_produit);
  if (!produit) return alert("Produit non trouvé");

  editingEquipementId = id_produit;

  document.getElementById("equipementNom").value = produit.nom;
  document.getElementById("equipementDepartement").value = produit.departement || "";
  document.getElementById("equipementEtat").value = produit.etat || "";
  document.getElementById("equipementDescription").value = produit.description || "";

  document.getElementById("equipementFormTitle").textContent = "Modifier un équipement";
  document.getElementById("equipementSubmitBtn").textContent = "Valider";

  document.getElementById("addEquipementForm").style.display = "block";
}

async function updateEquipement(id_produit, data) {
  const confirmUpdate = confirm("Êtes-vous sûr de vouloir modifier cet équipement ?");
  if (!confirmUpdate) return;

  try {
    const res = await fetch(`${API}/produits/${id_produit}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      alert("Erreur lors de la modification");
      return;
    }

    hideAddEquipementForm();
    loadEquipements();
    updateStats();
    editingEquipementId = null;

  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

async function deleteEquipement(id_produit) {
  const confirmDelete = confirm("Voulez-vous vraiment supprimer cet équipement ?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API}/produits/${id_produit}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      alert("Erreur lors de la suppression");
      return;
    }

    loadEquipements();
    updateStats();
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

function printQR(id) {
  window.open(`${API}/qrcodes/showqr/${id}`, "_blank");
}

// ========== STATS ==========
function updateStats() {
  loadEquipements();
  loadMaintenances();
}

// ========== INIT ==========
loadSiteDetails();
loadMaintenances();
loadEquipements();