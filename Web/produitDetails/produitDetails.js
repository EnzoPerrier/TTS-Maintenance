const API = "http://192.168.1.127:3000";

const params = new URLSearchParams(window.location.search);
const id_produit = params.get("id_produit");

let allPhotos = [];
let allMaintenances = [];

document.getElementById("backBtn").addEventListener("click", () => {
  window.history.back();
});

// ========== CHARGEMENT PRODUIT ==========
async function loadProduitDetails() {
  if (!id_produit) {
    document.getElementById("produitDetails").textContent = "ID du produit manquant.";
    return;
  }

  try {
    const res = await fetch(`${API}/produits/${id_produit}`);
    if (!res.ok) throw new Error("Erreur lors du chargement du produit");

    const produit = await res.json();

    const ProduitDiv = document.getElementById("produitDetails");
    ProduitDiv.innerHTML = `
      <div class="site-detail"><strong>Nom :</strong> ${produit.nom}</div>
      <div class="site-detail"><strong>ID Produit :</strong> ${produit.id_produit}</div>
      <div class="site-detail"><strong>Département :</strong> ${produit.departement || "N/A"}</div>
      <div class="site-detail"><strong>État :</strong> <span style="color: ${getEtatColor(produit.etat)}; font-weight: 600;">${produit.etat || "N/A"}</span></div>
      <div class="site-detail"><strong>Description :</strong> ${produit.description || "N/A"}</div>
      <div class="site-detail"><strong>ID Site :</strong> ${produit.id_site}</div>
      <div class="site-detail"><strong>Date de création :</strong> ${formatDate(produit.date_creation)}</div>
    `;
  } catch (err) {
    document.getElementById("produitDetails").textContent = err.message;
  }
}

function getEtatColor(etat) {
  if (!etat) return "#6C757D";
  const e = etat.toLowerCase();
  if (e === "ok") return "#28A745";
  if (e === "nok") return "#DC3545";
  if (e === "passable") return "#FFC107";
  return "#6C757D";
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ========== PHOTOS ==========
async function loadPhotos() {
  try {
    const res = await fetch(`${API}/photos/produit/${id_produit}`);
    
    if (res.status === 404) {
      allPhotos = [];
      renderLatestPhotos([]);
      renderPhotoGallery([]);
      return;
    }

    if (!res.ok) throw new Error("Erreur lors du chargement des photos");

    allPhotos = await res.json();
    
    // Récupérer toutes les photos de la date la plus récente
    if (allPhotos.length > 0) {
      const latestDate = allPhotos[0].date_creation;
      const latestPhotos = allPhotos.filter(photo => photo.date_creation === latestDate);
      renderLatestPhotos(latestPhotos);
    } else {
      renderLatestPhotos([]);
    }
    
    renderPhotoGallery(allPhotos);
  } catch (err) {
    console.error(err);
  }
}

function renderLatestPhotos(photos) {
  const container = document.getElementById("photoMainContainer");
  
  if (!photos || photos.length === 0) {
    container.innerHTML = `
      <div class="photo-placeholder">
        <span>📷 Aucune photo disponible</span>
      </div>
    `;
    return;
  }

  // Afficher le nombre de photos et la date
  const dateStr = formatDate(photos[0].date_creation);
  const maintenanceInfo = photos[0].maintenance_type 
    ? `<div><strong>Maintenance :</strong> ${photos[0].maintenance_type} (${formatDate(photos[0].date_maintenance)})</div>` 
    : '<div style="color: var(--gray-500);">Photo indépendante (hors maintenance)</div>';

  container.innerHTML = `
    <div class="photo-info" style="margin-bottom: 1rem;">
      <div style="font-size: 1.1rem; font-weight: 600; color: var(--primary-blue);">
        📸 ${photos.length} photo${photos.length > 1 ? 's' : ''} récente${photos.length > 1 ? 's' : ''}
      </div>
      <div><strong>Date :</strong> ${dateStr}</div>
      ${maintenanceInfo}
    </div>
    <div class="latest-photos-grid">
      ${photos.map(photo => `
        <div class="latest-photo-item">
          <img src="${API}${photo.chemin_photo}" alt="Photo" onclick="openPhotoModal('${API}${photo.chemin_photo}')" />
          ${photo.commentaire ? `<div class="latest-photo-comment">${photo.commentaire}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function renderPhotoGallery(photos) {
  const gallery = document.getElementById("photoGallery");
  
  if (photos.length === 0) {
    gallery.innerHTML = "<p style='text-align: center; padding: 2rem; color: var(--gray-600);'>📷 Aucune photo dans l'historique</p>";
    return;
  }

  gallery.innerHTML = "";
  
  photos.forEach(photo => {
    const item = document.createElement("div");
    item.classList.add("photo-item");
    
    item.innerHTML = `
      <img src="${API}${photo.chemin_photo}" alt="Photo" onclick="openPhotoModal('${API}${photo.chemin_photo}')" />
      <div class="photo-item-info">
        <div class="photo-item-date">${formatDate(photo.date_creation)}</div>
        ${photo.maintenance_type ? `<div class="photo-item-maintenance">${photo.maintenance_type}</div>` : '<div class="photo-item-maintenance" style="color: var(--gray-500);">Sans maintenance</div>'}
        ${photo.commentaire ? `<div style="font-size: 0.85rem; color: var(--gray-600); margin-top: 0.25rem;">${photo.commentaire}</div>` : ''}
        <button onclick="deletePhoto(${photo.id_photo})" style="background: var(--danger); margin-top: 0.5rem; width: 100%; font-size: 0.85rem; padding: 0.5rem;">Supprimer</button>
      </div>
    `;
    
    gallery.appendChild(item);
  });
}

// ========== UPLOAD PHOTOS MULTIPLES ==========
async function uploadPhoto(event) {
  event.preventDefault();

  const fileInput = document.getElementById("photoInput");
  const maintenanceSelect = document.getElementById("maintenanceSelect");
  const commentaire = document.getElementById("photoCommentaire").value;
  const files = fileInput.files;

  if (files.length === 0) {
    alert("Veuillez sélectionner au moins une photo");
    return;
  }

  if (files.length > 5) {
    alert("Maximum 5 photos à la fois");
    return;
  }

  const formData = new FormData();
  
  // Ajouter tous les fichiers
  Array.from(files).forEach(file => {
    formData.append("photos", file);
  });
  
  formData.append("id_produit", id_produit);
  
  if (maintenanceSelect.value) {
    formData.append("id_maintenance", maintenanceSelect.value);
  }
  
  if (commentaire) {
    formData.append("commentaire", commentaire);
  }

  try {
    const res = await fetch(`${API}/photos/multiple`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const error = await res.json();
      alert(`Erreur: ${error.error}`);
      return;
    }

    const result = await res.json();
    alert(result.message);
    
    // Réinitialiser le formulaire
    document.getElementById("uploadForm").reset();
    document.getElementById("fileLabel").classList.remove("has-file");
    document.getElementById("fileCount").textContent = "";
    document.getElementById("photoPreviewUpload").innerHTML = "";
    document.getElementById("fileLabel").innerHTML = `
      <div>
        <strong>📁 Cliquez pour sélectionner des photos</strong>
        <p style="margin-top: 0.5rem; color: var(--gray-600);">
          Formats acceptés: JPG, PNG, GIF, WEBP (Max 10MB par photo, 5 photos max)
        </p>
      </div>
    `;
    
    // Recharger les photos
    loadPhotos();
  } catch (err) {
    console.error(err);
    alert("Erreur serveur lors de l'upload");
  }
}

// Gestion du changement de fichiers multiples
document.getElementById("photoInput").addEventListener("change", (e) => {
  const files = e.target.files;
  const label = document.getElementById("fileLabel");
  const fileCount = document.getElementById("fileCount");
  const preview = document.getElementById("photoPreviewUpload");
  
  if (files.length > 0) {
    if (files.length > 5) {
      alert("Maximum 5 photos autorisées");
      e.target.value = "";
      label.classList.remove("has-file");
      fileCount.textContent = "";
      preview.innerHTML = "";
      return;
    }
    
    label.classList.add("has-file");
    
    let totalSize = 0;
    Array.from(files).forEach(file => {
      totalSize += file.size;
    });
    
    fileCount.textContent = `✅ ${files.length} photo${files.length > 1 ? 's' : ''} sélectionnée${files.length > 1 ? 's' : ''} (${(totalSize / 1024 / 1024).toFixed(2)} MB)`;
    fileCount.style.color = "var(--success)";
    fileCount.style.fontWeight = "600";
    
    // Prévisualisation des images
    preview.innerHTML = "";
    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        const img = document.createElement("img");
        img.src = event.target.result;
        img.style.maxWidth = "120px";
        img.style.height = "120px";
        img.style.objectFit = "cover";
        img.style.margin = "0.5rem";
        img.style.borderRadius = "8px";
        img.style.border = "2px solid #28A745";
        img.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  } else {
    label.classList.remove("has-file");
    fileCount.textContent = "";
    preview.innerHTML = "";
  }
});

// ========== SUPPRESSION PHOTO ==========
async function deletePhoto(id_photo) {
  const confirmDelete = confirm("Voulez-vous vraiment supprimer cette photo ?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API}/photos/${id_photo}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      alert("Erreur lors de la suppression");
      return;
    }

    loadPhotos();
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

// ========== MODAL PHOTO ==========
function openPhotoModal(photoUrl) {
  const modal = document.getElementById("photoModal");
  const img = document.getElementById("modalImage");
  img.src = photoUrl;
  modal.classList.add("active");
}

function closePhotoModal() {
  const modal = document.getElementById("photoModal");
  modal.classList.remove("active");
}

// Fermer le modal en cliquant dessus
document.getElementById("photoModal").addEventListener("click", closePhotoModal);

// ========== MAINTENANCES ==========
async function loadMaintenances() {
  try {
    // Récupérer d'abord les infos du produit pour avoir id_site
    const resProduit = await fetch(`${API}/produits/${id_produit}`);
    if (!resProduit.ok) return;
    
    const produit = await resProduit.json();
    
    // Récupérer les maintenances du site
    const res = await fetch(`${API}/maintenances/AllMaintenancesBySiteID/${produit.id_site}`);
    if (!res.ok) throw new Error("Erreur maintenances");

    allMaintenances = await res.json();
    
    // Remplir le select pour l'upload
    const select = document.getElementById("maintenanceSelect");
    select.innerHTML = '<option value="">-- Associer à une maintenance (optionnel) --</option>';
    
    allMaintenances.forEach(m => {
      const option = document.createElement("option");
      option.value = m.id_maintenance;
      option.textContent = `${m.type} - ${formatDate(m.date_maintenance)}`;
      select.appendChild(option);
    });
    
    // Afficher l'historique
    renderMaintenanceHistory();
  } catch (err) {
    console.error(err);
  }
}

function renderMaintenanceHistory() {
  const container = document.getElementById("maintenanceHistory");
  
  if (allMaintenances.length === 0) {
    container.innerHTML = "<p style='text-align: center; padding: 2rem; color: var(--gray-600);'>🔧 Aucune maintenance enregistrée</p>";
    return;
  }

  container.innerHTML = "";
  
  allMaintenances.forEach(m => {
    const card = document.createElement("div");
    card.classList.add("maintenance-card");
    
    const etat = (m.etat || "").toLowerCase();
    let etatColor = "#6C757D";
    let icone = "🔧";
    
    if (etat.includes("termin")) {
      etatColor = "#28A745";
      icone = "✅";
    } else if (etat.includes("cours")) {
      etatColor = "#FFC107";
      icone = "⚙️";
    } else if (etat.includes("planif")) {
      etatColor = "#0066CC";
      icone = "📅";
    }
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div style="flex: 1;">
          <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">
            ${icone} ${m.type}
          </div>
          <div><strong>Date :</strong> ${formatDate(m.date_maintenance)}</div>
          <div><strong>État :</strong> <span style="color: ${etatColor}; font-weight: 600;">${m.etat || "N/A"}</span></div>
          ${m.commentaire ? `<div style="margin-top: 0.5rem; color: var(--gray-600);"><strong>Commentaire :</strong> ${m.commentaire}</div>` : ''}
        </div>
        <a href="../MaintenanceDetails/MaintenanceDetails.html?id_maintenance=${m.id_maintenance}" 
           style="padding: 0.625rem 1.25rem; background: var(--primary-blue); color: white; border-radius: 8px; text-decoration: none; white-space: nowrap;">
          Voir détails
        </a>
      </div>
    `;
    
    container.appendChild(card);
  });
}

// ========== INIT ==========
loadProduitDetails();
loadPhotos();
loadMaintenances();