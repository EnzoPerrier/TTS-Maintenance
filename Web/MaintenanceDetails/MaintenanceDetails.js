const API = "http://192.168.1.127:3000";

const params = new URLSearchParams(window.location.search);
const id_maintenance = params.get("id_maintenance");

let allProduitsDisponibles = [];
let id_site_maintenance = null;

document.getElementById("backBtn").addEventListener("click", () => {
  window.history.back();
});

// ========== PREVIEW PHOTO ==========
function previewPhoto(event, previewId) {
  const file = event.target.files[0];
  const preview = document.getElementById(previewId);
  
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.src = e.target.result;
      preview.style.display = "block";
    };
    reader.readAsDataURL(file);
  } else {
    preview.style.display = "none";
  }
}

// ========== MODAL PHOTO ==========
function openPhotoModal(photoUrl) {
  const modal = document.getElementById("photoModal");
  const modalImg = document.getElementById("modalPhoto");
  modal.style.display = "flex";
  modalImg.src = photoUrl;
}

function closePhotoModal() {
  document.getElementById("photoModal").style.display = "none";
}

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
        etatColor = "#28A745";
        break;
      case "En cours":
        etatColor = "#FFC107";
        break;
      case "Planifiée":
        etatColor = "#0066CC";
        break;
      default:
        etatColor = "#6C757D";
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
      
      // Icône selon l'état
      let icone = "📦";
      if (etat === "ok") {
        icone = "✅";
        details.classList.add("equipement-ok");
      } else if (etat === "nok") {
        icone = "❌";
        details.classList.add("equipement-nok");
      } else if (etat === "passable") {
        icone = "⚠️";
        details.classList.add("equipement-passable");
      } else {
        details.classList.add("equipement-autre");
      }

      const summary = document.createElement("summary");
      summary.innerHTML = `${icone} ${p.nom} - ${p.etat || "N/A"}`;
      details.appendChild(summary);

      // Couleur de l'état
      let etatColor = "#6C757D";
      if (etat === "ok") etatColor = "#28A745";
      else if (etat === "nok") etatColor = "#DC3545";
      else if (etat === "passable") etatColor = "#FFC107";

      // Gestion de l'affichage de la photo
      let photoHtml = "";
      if (p.photo) {
        photoHtml = `
          <div class="produit-photo-container">
            <strong>📷 Photo :</strong><br/>
            <img src="${API}/uploads/maintenance_produits/${p.photo}" 
                 class="produit-photo" 
                 alt="Photo du produit ${p.nom}" 
                 onclick="openPhotoModal('${API}/uploads/maintenance_produits/${p.photo}')" />
            <p class="photo-info">Cliquez pour agrandir</p>
          </div>
        `;
      }

      const content = document.createElement("div");
      content.innerHTML = `
        <div><strong>ID Produit :</strong> ${p.id_produit}</div>
        <div><strong>Nom :</strong> ${p.nom}</div>
        <div><strong>Département :</strong> ${p.departement || "N/A"}</div>
        <div><strong>État lors de la maintenance :</strong> <span style="color: ${etatColor}; font-weight: 600;">${p.etat || "N/A"}</span></div>
        <div><strong>Commentaire :</strong> ${p.commentaire || "N/A"}</div>
        <div><strong>Description produit :</strong> ${p.description || "N/A"}</div>
        ${photoHtml}
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn-edit-produit" onclick="showEditProduitForm(${p.id_produit}, '${p.nom.replace(/'/g, "\\'")}', '${p.etat || ''}', '${(p.commentaire || '').replace(/'/g, "\\'")}', '${p.photo || ''}')">Modifier l'état</button>
          <button class="btn-remove-produit" onclick="removeProduitFromMaintenance(${p.id_produit})">Retirer</button>
        </div>
      `;
      details.appendChild(content);

      ProdDiv.appendChild(details);
    });

  } catch (err) {
    document.getElementById("ListeProduits").textContent = err.message;
  }
}

// ========== FORMULAIRES ==========
function showAddProduitForm() {
  document.getElementById("produitAssocForm").reset();
  document.getElementById("photoPreview").style.display = "none";
  document.getElementById("addProduitForm").style.display = "block";
}

function hideAddProduitForm() {
  document.getElementById("addProduitForm").style.display = "none";
  document.getElementById("produitAssocForm").reset();
  document.getElementById("photoPreview").style.display = "none";
}

function showEditProduitForm(id_produit, nom, etat, commentaire, photo) {
  document.getElementById("editProduitId").value = id_produit;
  document.getElementById("editProduitNom").textContent = nom;
  document.getElementById("editProduitEtat").value = etat || "";
  document.getElementById("editProduitCommentaire").value = commentaire || "";
  document.getElementById("editPhotoPreview").style.display = "none";
  
  // Afficher la photo actuelle si elle existe
  const currentPhotoContainer = document.getElementById("currentPhotoContainer");
  if (photo) {
    currentPhotoContainer.innerHTML = `
      <div style="margin-top: 1rem;">
        <strong>📷 Photo actuelle :</strong><br/>
        <img src="${API}/uploads/maintenance_produits/${photo}" 
             class="photo-preview" 
             style="display: block; cursor: pointer;" 
             alt="Photo actuelle"
             onclick="openPhotoModal('${API}/uploads/maintenance_produits/${photo}')" />
        <p class="photo-info">Cliquez pour agrandir • Téléchargez une nouvelle photo pour la remplacer</p>
      </div>
    `;
  } else {
    currentPhotoContainer.innerHTML = '<p style="color: #6C757D; font-style: italic;">Aucune photo actuelle</p>';
  }
  
  document.getElementById("editProduitForm").style.display = "block";
}

function hideEditProduitForm() {
  document.getElementById("editProduitForm").style.display = "none";
  document.getElementById("produitEditForm").reset();
  document.getElementById("editPhotoPreview").style.display = "none";
  document.getElementById("currentPhotoContainer").innerHTML = "";
}

// ========== ACTIONS ==========
async function addProduitToMaintenance(event) {
  event.preventDefault();

  const id_produit = document.getElementById("produitSelect").value;
  const etat = document.getElementById("produitEtat").value;
  const commentaire = document.getElementById("produitCommentaire").value;
  const photoFile = document.getElementById("photoInput").files[0];

  if (!id_produit) {
    alert("Veuillez sélectionner un produit");
    return;
  }

  const formData = new FormData();
  formData.append("id_maintenance", id_maintenance);
  formData.append("id_produit", id_produit);
  formData.append("etat", etat || "N/A");
  formData.append("commentaire", commentaire || "");
  
  if (photoFile) {
    formData.append("photo", photoFile);
  }

  try {
    const res = await fetch(`${API}/maintenance-produits`, {
      method: "POST",
      body: formData
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
  const etat = document.getElementById("editProduitEtat").value;
  const commentaire = document.getElementById("editProduitCommentaire").value;
  const photoFile = document.getElementById("editPhotoInput").files[0];

  const confirmUpdate = confirm("Êtes-vous sûr de vouloir modifier cet état ?");
  if (!confirmUpdate) return;

  const formData = new FormData();
  formData.append("etat", etat || "N/A");
  formData.append("commentaire", commentaire || "");
  
  if (photoFile) {
    formData.append("photo", photoFile);
  }

  try {
    const res = await fetch(`${API}/maintenance-produits/${id_maintenance}/${id_produit}`, {
      method: "PUT",
      body: formData
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