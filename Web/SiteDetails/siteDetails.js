const API = "http://192.168.1.127:3000"; // adresse du serveur API --> PORT 3000

const params = new URLSearchParams(window.location.search); // Récupère les paramètres de l'URL
const id_site = params.get("id_site"); // Extrait l'id site de l'URL

let map = null; // Variable pour stocker la carte

document.getElementById("backBtn").addEventListener("click", () => {
  window.history.back();
});

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

    // Initialiser la carte si les coordonnées GPS sont disponibles
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

function initMap(lat, lng, nom, adresse) {
  // Convertir les coordonnées en nombres
  lat = parseFloat(lat);
  lng = parseFloat(lng);

  // Vérifier que les conversions sont valides
  if (isNaN(lat) || isNaN(lng)) {
    document.getElementById("mapContainer").innerHTML = 
      '<div style="padding: 2rem; text-align: center; color: #6C757D;">📍 Coordonnées GPS invalides</div>';
    return;
  }

  // Détruire la carte existante si elle existe déjà
  if (map) {
    map.remove();
  }

  // Créer la carte centrée sur les coordonnées du site
  map = L.map('map').setView([lat, lng], 15);

  // Ajouter les tuiles OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Créer une icône personnalisée bleue pour le marqueur
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

  // Ajouter un marqueur sur la position
  const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

  // Ajouter un popup avec les informations du site
  marker.bindPopup(`
    <div style="font-family: 'Segoe UI', sans-serif;">
      <strong style="color: #0066CC; font-size: 1.1em;">${nom}</strong><br/>
      <span style="color: #6C757D;">${adresse || 'Adresse non spécifiée'}</span><br/>
      <small style="color: #999;">📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}</small>
    </div>
  `).openPopup();

  // Ajouter un cercle de zone autour du marqueur
  L.circle([lat, lng], {
    color: '#0066CC',
    fillColor: '#3399FF',
    fillOpacity: 0.1,
    radius: 100 // 100 mètres
  }).addTo(map);
}

async function loadMaintenances() {
  try {
    const res = await fetch(`${API}/maintenances/AllMaintenancesBySiteID/${id_site}`);
    if (!res.ok) throw new Error("Erreur lors du chargement des maintenances");

    const maintenances = await res.json();
    const MaintDiv = document.getElementById("MaintenancesList");
    MaintDiv.innerHTML = ""; // vider avant d'ajouter

    if (maintenances.length === 0) {
      MaintDiv.textContent = "Aucune maintenance trouvée pour ce site.";
      return;
    }

    maintenances.forEach(m => {
      const details = document.createElement("details");
      details.classList.add("site-detail", "maintenance");

      // Normalisation de l'état
      const etat = (m.etat || "").toLowerCase();

      if (etat.includes("termin")) {
        details.classList.add("maintenance-terminee");
      } else if (etat.includes("cours")) {
        details.classList.add("maintenance-en-cours");
      } else {
        details.classList.add("maintenance-autre");
      }

      // Le résumé visible
      const summary = document.createElement("summary");
      summary.textContent = `ID maintenance : ${m.id_maintenance}`;
      details.appendChild(summary);

      // Le contenu caché
      const content = document.createElement("div");
      content.innerHTML = `
        <div><strong>Date :</strong> ${m.date_maintenance}</div>
        <div><strong>Type :</strong> ${m.type}</div>
        <div><strong>Etat :</strong> ${m.etat || "N/A"}</div>
        <div><strong>Commentaire :</strong> ${m.commentaire || "N/A"}</div>
        <div><strong>RI interne :</strong> ${m.ri_interne || "N/A"}</div>
        <div><a href="../MaintenanceDetails/MaintenanceDetails.html?id_maintenance=${m.id_maintenance}">Plus d'infos</a></div>
      `;
      details.appendChild(content);

      MaintDiv.appendChild(details);
    });

  } catch (err) {
    document.getElementById("MaintenancesList").textContent = err.message;
  }
}

async function loadEquipements() {
  try {
    const res = await fetch(`${API}/produits/ProduitsBySiteID/${id_site}`);
    if (!res.ok) throw new Error("Erreur lors du chargement des produits");

    const produits = await res.json();
    const ProdDiv = document.getElementById("EquipementsList");
    ProdDiv.innerHTML = ""; // vider avant d'ajouter

    if (produits.length === 0) {
      ProdDiv.textContent = "Aucun produit trouvé pour ce site.";
      return;
    }

    produits.forEach(p => {
      const details = document.createElement("details");
      details.classList.add("site-detail", "equipement");

      // Normalisation de l'état
      const etat = (p.etat || "").toLowerCase();

      if (etat === "ok") {
        details.classList.add("equipement-ok");
      } else if (etat === "nok") {
        details.classList.add("equipement-nok");
      } else if (etat === "passable") {
        details.classList.add("equipement-passable");
      } else {
        details.classList.add("equipement-autre");
      }

      // Résumé
      const summary = document.createElement("summary");
      summary.textContent = `ID produit : ${p.id_produit}`;
      details.appendChild(summary);

      // Contenu
      const content = document.createElement("div");
      content.innerHTML = `
        <div><strong>Nom :</strong> ${p.nom}</div>
        <div><strong>Type :</strong> ${p.type || "N/A"}</div>
        <div><strong>Etat :</strong> ${p.etat || "N/A"}</div>
        <div><strong>Description :</strong> ${p.description || "N/A"}</div>
        <div><strong>Date création :</strong> ${p.date_creation || "N/A"}</div>
        <div><a href="../index.html">Plus d'infos</a></div>
      `;
      details.appendChild(content);

      ProdDiv.appendChild(details);
    });

  } catch (err) {
    document.getElementById("EquipementsList").textContent = err.message;
  }
}

loadSiteDetails();
loadMaintenances();
loadEquipements();