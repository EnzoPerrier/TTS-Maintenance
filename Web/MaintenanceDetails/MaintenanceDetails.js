const API = "http://192.168.1.127:3000";

const params = new URLSearchParams(window.location.search);
const id_maintenance = params.get("id_maintenance");

let allProduitsDisponibles = [];
let id_site_maintenance = null;

document.getElementById("backBtn").addEventListener("click", () => {
  window.history.back();
});

// ========== CHARGEMENT DE LA MAINTENANCE ==========
async function loadMaintenance() {
  if (!id_maintenance) {
    document.getElementById("MaintenanceDetails").textContent = "ID de maintenance manquant.";
    return;
  }

  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`);
    if (!res.ok) throw new Error("Erreur lors du chargement de la maintenance");

    const maintenance = await res.json();
    id_site_maintenance = maintenance.id_site;

    const MaintDiv = document.getElementById("MaintenanceDetails");

    let etatColor = "";
    switch (maintenance.etat) {
      case "Terminée":
        etatColor = "green";
        break;
      case "En cours":
        etatColor = "orange";
        break;
      case "Planifiée":
        etatColor = "blue";
        break;
      default:
        etatColor = "gray";
    }

    MaintDiv.innerHTML = `
      <div class="site-detail"><strong>ID Maintenance :</strong> ${maintenance.id_maintenance}</div>
      <div class="site-detail"><strong>ID Site :</strong> ${maintenance.id_site}</div>
      <div class="site-detail"><strong>Date maintenance :</strong> ${maintenance.date_maintenance}</div>
      <div class="site-detail"><strong>Type :</strong> ${maintenance.type}</div>
      <div class="site-detail"><strong>Département :</strong> ${maintenance.departement || "N/A"}</div>
      <div class="site-detail"><strong>État :</strong> <span style="color: ${etatColor}; font-weight: 600;">${maintenance.etat || "N/A"}</span></div>
      <div class="site-detail"><strong>Commentaire :</strong> ${maintenance.commentaire || "N/A"}</div>
      <div class="site-detail"><strong>RI interne :</strong> ${maintenance.ri_interne || "N/A"}</div>
    `;

    // Charger les produits disponibles pour ce site
    await loadProduitsDisponibles(id_site_maintenance);
  } catch (err) {
    document.getElementById("MaintenanceDetails").textContent = err.message;
  }
}

// ========== CHARGEMENT DES PRODUITS DISPONIBLES ==========
async function loadProduitsDisponibles(id_site) {
  try {
    const res = await fetch(`${API}/produits/ProduitsBySiteID/${id_site}`);
    if (!res.ok) throw new Error("Erreur lors du chargement des produits");

    allProduitsDisponibles = await res.json();
    
    // Remplir le select
    const select = document.getElementById("produitSelect");
    select.innerHTML = '<option value="">-- Sélectionner un produit --</option>';
    
    allProduitsDisponibles.forEach(p => {
      const option = document.createElement("option");
      option.value = p.id_produit;
      option.textContent = `${p.nom} ${p.departement ? '- ' + p.departement : ''}`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Erreur chargement produits:", err);
  }
}

// ========== CHARGEMENT DES PRODUITS ASSOCIÉS ==========
async function loadProduits() {
  try {
    const res = await fetch(`${API}/maintenance-produits/maintenance/${id_maintenance}`);
    if (!res.ok) throw new Error("Erreur lors du chargement des produits");

    const produits = await res.json();
    const ProdDiv = document.getElementById("ListeProduits");
    ProdDiv.innerHTML = "";

    if (produits.length === 0) {
      ProdDiv.innerHTML = "<p>Aucun produit associé à cette maintenance.</p>";
      return;
    }

    produits.forEach(p => {
      const details = document.createElement("details");
      details.classList.add("site-detail", "equipement");

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

      const summary = document.createElement("summary");
      summary.textContent = `${p.nom} - ${p.etat || "N/A"}`;
      details.appendChild(summary);

      // Couleur de l'état
      let etatColor = "#6C757D";
      if (etat === "ok") etatColor = "#28A745";
      else if (etat === "nok") etatColor = "#DC3545";
      else if (etat === "passable") etatColor = "#FFC107";

      const content = document.createElement("div");
      content.innerHTML = `
        <div><strong>ID Produit :</strong> ${p.id_produit}</div>
        <div><strong>Nom :</strong> ${p.nom}</div>
        <div><strong>Département :</strong> ${p.departement || "N/A"}</div>
        <div><strong>État lors de la maintenance :</strong> <span style="color: ${etatColor}; font-weight: 600;">${p.etat || "N/A"}</span></div>
        <div><strong>Commentaire :</strong> ${p.commentaire || "N/A"}</div>
        <div><strong>Description produit :</strong> ${p.description || "N/A"}</div>
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn-edit-produit" data-id="${p.id_produit}" data-nom="${p.nom}" style="background: #6C757D;">Modifier l'état</button>
          <button class="btn-remove-produit" data-id="${p.id_produit}" style="background: #DC3545;">Retirer</button>
        </div>
      `;
      details.appendChild(content);

      ProdDiv.appendChild(details);
    });

    // Ajouter les événements
    document.querySelectorAll('.btn-edit-produit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const nom = e.target.getAttribute('data-nom');
        showEditProduitForm(id, nom);
      });
    });

    document.querySelectorAll('.btn-remove-produit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        removeProduitFromMaintenance(id);
      });
    });

  } catch (err) {
    document.getElementById("ListeProduits").textContent = err.message;
  }
}

// ========== FORMULAIRES ==========
function showAddProduitForm() {
  document.getElementById("addProduitForm").style.display = "block";
}

function hideAddProduitForm() {
  document.getElementById("addProduitForm").style.display = "none";
  document.getElementById("produitAssocForm").reset();
}

function showEditProduitForm(id_produit, nom) {
  // Récupérer les données actuelles du produit
  fetch(`${API}/maintenance-produits/maintenance/${id_maintenance}`)
    .then(res => res.json())
    .then(produits => {
      const produit = produits.find(p => p.id_produit == id_produit);
      if (!produit) return;

      document.getElementById("editProduitId").value = id_produit;
      document.getElementById("editProduitNom").textContent = nom;
      document.getElementById("editProduitEtat").value = produit.etat || "";
      document.getElementById("editProduitCommentaire").value = produit.commentaire || "";
      
      document.getElementById("editProduitForm").style.display = "block";
    });
}

function hideEditProduitForm() {
  document.getElementById("editProduitForm").style.display = "none";
  document.getElementById("produitEditForm").reset();
}

// ========== ACTIONS ==========
async function addProduitToMaintenance(event) {
  event.preventDefault();

  const data = {
    id_maintenance: id_maintenance,
    id_produit: document.getElementById("produitSelect").value,
    etat: document.getElementById("produitEtat").value || "N/A",
    commentaire: document.getElementById("produitCommentaire").value || null
  };

  try {
    const res = await fetch(`${API}/maintenance-produits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const error = await res.json();
      alert(error.error || "Erreur lors de l'association");
      return;
    }

    hideAddProduitForm();
    loadProduits();
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

async function updateProduitMaintenance(event) {
  event.preventDefault();

  const id_produit = document.getElementById("editProduitId").value;
  const data = {
    etat: document.getElementById("editProduitEtat").value,
    commentaire: document.getElementById("editProduitCommentaire").value || null
  };

  try {
    const res = await fetch(`${API}/maintenance-produits/${id_maintenance}/${id_produit}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      alert("Erreur lors de la mise à jour");
      return;
    }

    hideEditProduitForm();
    loadProduits();
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

async function removeProduitFromMaintenance(id_produit) {
  const confirmDelete = confirm("Voulez-vous vraiment retirer ce produit de la maintenance ?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API}/maintenance-produits/${id_maintenance}/${id_produit}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      alert("Erreur lors de la suppression");
      return;
    }

    loadProduits();
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

// ========== INIT ==========
loadMaintenance();
loadProduits();