const API = "http://localhost:3000"; // adresse du serveur API --> PORT 3000

const params = new URLSearchParams(window.location.search); // Récupère les paramètres de l'URL
const id_maintenance = params.get("id_maintenance"); // Extrait l'id site de l'URL

document.getElementById("backBtn").addEventListener("click", () => {
  window.history.back();
});

async function loadMaintenance() {
  // Récupérer id_maintenance depuis l'URL

  if (!id_maintenance) {
    document.getElementById("MaintenanceDetails").textContent = "ID du site manquant.";
    return;
  }

  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`);
    if (!res.ok) throw new Error("Erreur lors du chargement du site");

    const maintenance = await res.json();

    const MaintDiv = document.getElementById("MaintenanceDetails");

    // Définir la couleur de l'état
    let etatColor = "";
    switch (maintenance.etat) {
      case "OK":
        etatColor = "green";
        break;
      case "NOK":
        etatColor = "red";
        break;
      case "Passable":
        etatColor = "orange";
        break;
      default:
        etatColor = "gray"; // Si l'état est absent ou inconnu, on met en gris
    }

    MaintDiv.innerHTML = `
      <div class="site-detail"><strong>ID Maintenance :</strong> ${maintenance.id_maintenance}</div>
      <div class="site-detail"><strong>ID Site :</strong> ${maintenance.id_site}</div>
      <div class="site-detail"><strong>Date maintenance :</strong> ${maintenance.date_maintenance}</div>
      <div class="site-detail"><strong>Type :</strong> ${maintenance.type}</div>
      <div class="site-detail"><strong>Etat :</strong> <span style="color: ${etatColor};">${maintenance.etat || "N/A"}</span></div>
      <div class="site-detail"><strong>Commentaire :</strong> ${maintenance.commentaire || "N/A"}</div>
    `;
  } catch (err) {
    document.getElementById("siteDetails").textContent = err.message;
  }
}

async function loadProduits() {
  try {
    const res = await fetch(`${API}/produits/ProduitsByMaintenance/${id_maintenance}`);
    if (!res.ok) throw new Error("Erreur lors du chargement des maintenances");

    const produits = await res.json();
    const ProdDiv = document.getElementById("ListeProduits");
    ProdDiv.innerHTML = ""; // vider avant d'ajouter

    if (produits.length === 0) {
      ProdDiv.textContent = "Aucune maintenance trouvée pour ce site.";
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
        <div><strong>Type :</strong> ${p.type}</div>
        <div><strong>Etat :</strong> ${p.etat || "N/A"}</div>
        <div><strong>Description :</strong> ${p.description || "N/A"}</div>
        <div><strong>Date de création :</strong> ${p.date_creation || "N/A"}</div>
        <div><a href="../index.html">Plus d'infos</a></div>
      `;
      details.appendChild(content);

      ProdDiv.appendChild(details);
    });

  } catch (err) {
    document.getElementById("ListeProduits").textContent = err.message;
  }
}

loadMaintenance();
loadProduits();
