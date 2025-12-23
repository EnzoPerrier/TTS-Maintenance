const API = "http://localhost:3000"; // adresse du serveur API --> PORT 3000

const params = new URLSearchParams(window.location.search); // Récupère les paramètres de l'URL
const id_site = params.get("id_site"); // Extrait l'id site de l'URL

document.getElementById("backBtn").addEventListener("click", () => {
  window.history.back();
});

async function loadSiteDetails() {
  // Récupérer id_site depuis l'URL

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
  } catch (err) {
    document.getElementById("siteDetails").textContent = err.message;
  }
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
      details.classList.add("site-detail");

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
      details.classList.add("site-detail");

      // Le résumé visible
      const summary = document.createElement("summary");
      summary.textContent = `ID produit : ${p.id_produit}`;
      details.appendChild(summary);

      // Le contenu caché
      const content = document.createElement("div");
      content.innerHTML = `
        <div><strong>Nom :</strong> ${p.nom}</div>
        <div><strong>Type :</strong> ${p.type || "N/A"}</div>
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


loadEquipements();
loadMaintenances();
loadSiteDetails();
