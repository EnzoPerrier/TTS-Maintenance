const API = "http://192.168.1.127:3000";

const params = new URLSearchParams(window.location.search);
const id_maintenance = params.get("id_maintenance");

let allProduits = [];
let produitsAssocies = [];
let maintenance = [];
let currentProduitPhotos = null;

document.getElementById("backBtn").addEventListener("click", () => {
  window.history.back();
});

// ========== CHARGEMENT MAINTENANCE ==========
async function loadMaintenanceDetails() {
  if (!id_maintenance) {
    document.getElementById("MaintenanceDetails").textContent = "ID de maintenance manquant.";
    return;
  }

  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`);
    if (!res.ok) throw new Error("Erreur lors du chargement de la maintenance");

    maintenance = await res.json();

    const MaintenanceDiv = document.getElementById("MaintenanceDetails");
    MaintenanceDiv.innerHTML = `
      <div class="site-detail"><strong>RI interne :</strong> ${maintenance.ri_interne || "N/A"}</div>
      <div class="site-detail"><strong>Type :</strong> ${maintenance.type}</div>
      <div class="site-detail"><strong>État :</strong> ${maintenance.etat || "N/A"}</div>
      <div class="site-detail"><strong>Commentaire :</strong> ${maintenance.commentaire || "N/A"}</div>
      <div class="site-detail"><strong>Date :</strong> ${maintenance.date_maintenance}</div>
    `;

    await loadProduits();
    await loadProduitsAssocies();

  } catch (err) {
    document.getElementById("MaintenanceDetails").textContent = err.message;
  }
}

// ========== PRODUITS ASSOCIÉS ==========
async function loadProduits() {
  try {
    const res = await fetch(`${API}/produits/ProduitsBySiteID/${maintenance.id_site}`); // A VOIR
    if (!res.ok) throw new Error("Erreur lors du chargement des produits");
    allProduits = await res.json();
  } catch (err) {
    console.error(err);
  }
}

async function loadProduitsAssocies() {
  try {
    const res = await fetch(`${API}/maintenance-produits/maintenance/${id_maintenance}`);
    if (!res.ok) throw new Error("Erreur lors du chargement des produits");

    produitsAssocies = await res.json();
    const ListeProduits = document.getElementById("ListeProduits");
    ListeProduits.innerHTML = "";

    if (produitsAssocies.length === 0) {
      ListeProduits.innerHTML = "<p>Aucun produit associé à cette maintenance.</p>";
      return;
    }

    for (const p of produitsAssocies) {
      // Charger les photos pour chaque produit
      const photosRes = await fetch(`${API}/photos/maintenance/${id_maintenance}/${p.id_produit}`);
      const photos = photosRes.ok ? await photosRes.json() : [];

      const details = document.createElement("details");
      
      // Classe selon l'état
      const etat = (p.etat || "").toLowerCase();
      if (etat === "ok") details.classList.add("equipement-ok");
      else if (etat === "nok") details.classList.add("equipement-nok");
      else if (etat === "passable") details.classList.add("equipement-passable");
      else details.classList.add("equipement-autre");

      const summary = document.createElement("summary");
      summary.textContent = `${p.nom} - ${p.etat || "N/A"}`;
      details.appendChild(summary);

      const content = document.createElement("div");
      content.innerHTML = `
        <div><strong>Nom :</strong> ${p.nom}</div>
        <div><strong>Département :</strong> ${p.departement || "N/A"}</div>
        <div><strong>Description :</strong> ${p.description || "N/A"}</div>
        <div><strong>État lors de la maintenance :</strong> ${p.etat || "N/A"}</div>
        <div><strong>Commentaire maintenance :</strong> ${p.commentaire || "N/A"}</div>
        
        <h4 style="margin-top: 1.5rem; margin-bottom: 1rem; color: #0066CC;">📸 Photos (${photos.length}/5)</h4>
        <div id="photos-grid-${p.id_produit}" class="photos-grid">
          ${photos.map(photo => `
            <div class="photo-item">
              <img src="${API}${photo.chemin_photo}" alt="Photo" onclick="openPhotoModal('${API}${photo.chemin_photo}')" style="cursor: pointer;" />
              <div class="photo-actions">
                <button onclick="deletePhoto(${photo.id_photo}, ${p.id_produit})" class="btn-remove-produit" title="Supprimer">🗑️</button>
              </div>
              ${photo.commentaire ? `<p class="photo-description">${photo.commentaire}</p>` : ''}
            </div>
          `).join('')}
        </div>
        
        ${photos.length < 5 ? `
          <button onclick="showAddPhotoForm(${p.id_produit})" class="primary" style="margin-top: 1rem;">
            📷 Ajouter une photo (${photos.length}/5)
          </button>
        ` : '<p style="color: #FFC107; margin-top: 1rem;">⚠️ Limite de 5 photos atteinte</p>'}
        
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button onclick="editProduitMaintenance(${p.id_produit})" class="btn-edit-produit">Modifier l'état</button>
          <button onclick="removeProduit(${p.id_produit})" class="btn-remove-produit">Retirer de la maintenance</button>
        </div>
      `;
      details.appendChild(content);

      ListeProduits.appendChild(details);
    }
  } catch (err) {
    document.getElementById("ListeProduits").textContent = err.message;
  }
}

// ========== GESTION DES PHOTOS ==========
function showAddPhotoForm(id_produit) {
  currentProduitPhotos = id_produit;
  
  const existingForm = document.getElementById("addPhotoFormModal");
  if (existingForm) existingForm.remove();

  const formModal = document.createElement("div");
  formModal.id = "addPhotoFormModal";
  formModal.className = "modal";
  formModal.style.display = "flex";
  
  formModal.innerHTML = `
    <form id="photoForm" onsubmit="addPhoto(event)" style="max-width: 600px;">
      <h3>📷 Ajouter des photos</h3>
      <p style="color: #6C757D; margin-bottom: 1rem;">Vous pouvez sélectionner jusqu'à 5 photos</p>
      <input type="file" id="photoFile" accept="image/*" multiple required />
      <div id="fileCount" style="margin-bottom: 1rem; color: #0066CC; font-weight: 500;"></div>
      <textarea id="photoDescription" placeholder="Commentaire pour toutes les photos (optionnel)"></textarea>
      <div id="photoPreviewModal" style="display: flex; flex-wrap: wrap; gap: 0.5rem; max-width: 100%; margin: 1rem 0;"></div>
      <button class="primary" type="submit">Ajouter</button>
      <button type="button" onclick="hideAddPhotoForm()">Annuler</button>
    </form>
  `;
  
  document.body.appendChild(formModal);

  // Prévisualisation des images multiples
  document.getElementById("photoFile").addEventListener("change", function(e) {
    const files = e.target.files;
    const fileCount = document.getElementById("fileCount");
    const preview = document.getElementById("photoPreviewModal");
    
    if (files.length > 5) {
      alert("Maximum 5 photos autorisées");
      e.target.value = "";
      fileCount.textContent = "";
      preview.innerHTML = "";
      return;
    }
    
    fileCount.textContent = files.length > 0 ? `${files.length} photo(s) sélectionnée(s)` : "";
    preview.innerHTML = "";
    
    if (files.length === 0) {
      return;
    }
    
    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        const img = document.createElement("img");
        img.src = event.target.result;
        img.style.maxWidth = "150px";
        img.style.maxHeight = "150px";
        img.style.margin = "0.5rem";
        img.style.borderRadius = "8px";
        img.style.border = "2px solid #DEE2E6";
        img.style.objectFit = "cover";
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });
}

function hideAddPhotoForm() {
  const form = document.getElementById("addPhotoFormModal");
  if (form) form.remove();
  currentProduitPhotos = null;
}

async function addPhoto(event) {
  event.preventDefault();

  const fileInput = document.getElementById("photoFile");
  const commentaire = document.getElementById("photoDescription").value;
  const files = fileInput ? fileInput.files : [];

  if (!files || files.length === 0) {
    alert("Veuillez sélectionner au moins une photo");
    return;
  }

  if (files.length > 5) {
    alert("Maximum 5 photos autorisées");
    return;
  }

  console.log("Ajout de", files.length, "photo(s) au produit", currentProduitPhotos);

  // Créer FormData pour l'upload
  const formData = new FormData();
  
  // Ajouter tous les fichiers
  Array.from(files).forEach((file, index) => {
    console.log(`Fichier ${index + 1}:`, file.name, file.type, file.size);
    formData.append("photos", file);
  });
  
  formData.append("id_maintenance", id_maintenance);
  formData.append("id_produit", currentProduitPhotos);
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
      console.error("Erreur upload:", error);
      alert(error.error || "Erreur lors de l'ajout des photos");
      return;
    }

    const result = await res.json();
    console.log("Succès upload:", result);
    alert(result.message || "Photos ajoutées avec succès");
    
    hideAddPhotoForm();
    loadProduitsAssocies();
  } catch (err) {
    console.error("Erreur:", err);
    alert("Erreur serveur");
  }
}

async function deletePhoto(id_photo, id_produit) {
  const confirmDelete = confirm("Voulez-vous vraiment supprimer cette photo ?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API}/photos/${id_photo}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      alert("Erreur lors de la suppression de la photo");
      return;
    }

    loadProduitsAssocies();
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

// ========== MODAL PHOTO EN GRAND ==========
function openPhotoModal(photoUrl) {
  const modal = document.getElementById("photoModal");
  const modalImg = document.getElementById("modalPhoto");
  modal.style.display = "flex";
  modalImg.src = photoUrl;
}

function closePhotoModal() {
  const modal = document.getElementById("photoModal");
  modal.style.display = "none";
}

// Fonction de prévisualisation pour les formulaires
function previewPhoto(event, previewId) {
  const files = event.target.files;
  const preview = document.getElementById(previewId);
  
  // Support pour plusieurs photos
  if (files.length > 0) {
    preview.innerHTML = ""; // Vider la prévisualisation
    preview.style.display = "block";
    
    // Limiter à 5 photos
    if (files.length > 5) {
      alert("Maximum 5 photos autorisées");
      event.target.value = "";
      preview.style.display = "none";
      return;
    }
    
    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.className = "photo-preview";
        img.style.maxWidth = "150px";
        img.style.margin = "0.5rem";
        img.style.display = "inline-block";
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  } else {
    preview.style.display = "none";
  }
}

// ========== ASSOCIER UN PRODUIT (AVEC FILTRE ET PHOTOS MULTIPLES) ==========
function loadProduitsSelect() {
  const select = document.getElementById("produitSelect");
  select.innerHTML = '<option value="">-- Sélectionner un produit --</option>';

  // Récupérer les IDs des produits déjà associés
  const produitsAssociesIds = produitsAssocies.map(p => p.id_produit);

  // Filtrer les produits non encore associés
  const produitsDisponibles = allProduits.filter(p => !produitsAssociesIds.includes(p.id_produit));

  if (produitsDisponibles.length === 0) {
    select.innerHTML = '<option value="">Tous les produits sont déjà associés</option>';
    select.disabled = true;
    
    // Désactiver aussi le bouton de soumission
    const submitBtn = document.querySelector("#produitAssocForm button[type='submit']");
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  select.disabled = false;
  const submitBtn = document.querySelector("#produitAssocForm button[type='submit']");
  if (submitBtn) submitBtn.disabled = false;

  produitsDisponibles.forEach(p => {
    const option = document.createElement("option");
    option.value = p.id_produit;
    option.textContent = `${p.nom} - ${p.departement || "N/A"}`;
    select.appendChild(option);
  });
}

function showAddProduitForm() {
  loadProduitsSelect(); // Charge la liste filtrée
  document.getElementById("produitAssocForm").reset();
  
  // Réinitialiser la prévisualisation des photos
  const preview = document.getElementById("photoPreview");
  if (preview) {
    preview.innerHTML = "";
    preview.style.display = "none";
  }
  
  // Réinitialiser le compteur de fichiers
  const fileCount = document.getElementById("fileCount");
  if (fileCount) fileCount.textContent = "";
  
  document.getElementById("addProduitForm").style.display = "block";
  
  // Réinitialiser le gestionnaire d'événements pour les photos
  setTimeout(() => {
    initPhotoInput();
  }, 100);
}

function hideAddProduitForm() {
  document.getElementById("addProduitForm").style.display = "none";
  document.getElementById("produitAssocForm").reset();
  
  // Réinitialiser la prévisualisation
  const preview = document.getElementById("photoPreview");
  if (preview) {
    preview.innerHTML = "";
    preview.style.display = "none";
  }
}

async function addProduitToMaintenance(event) {
  event.preventDefault();

  const id_produit = document.getElementById("produitSelect").value;
  const etat = document.getElementById("produitEtat").value;
  const commentaire = document.getElementById("produitCommentaire").value;
  const photoInput = document.getElementById("photoInput");
  const photoFiles = photoInput ? photoInput.files : [];

  if (!id_produit) {
    alert("Veuillez sélectionner un produit");
    return;
  }

  if (photoFiles.length > 5) {
    alert("Maximum 5 photos autorisées");
    return;
  }

  console.log("Photos à envoyer:", photoFiles.length);

  try {
    // 1. Associer le produit à la maintenance
    const resAssoc = await fetch(`${API}/maintenance-produits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_maintenance: id_maintenance,
        id_produit: id_produit,
        etat: etat || null,
        commentaire: commentaire || null
      })
    });

    if (!resAssoc.ok) {
      const error = await resAssoc.json();
      alert(error.error || "Erreur lors de l'association");
      return;
    }

    console.log("Produit associé, maintenant upload des photos...");

    // 2. Si des photos ont été sélectionnées, les uploader
    if (photoFiles && photoFiles.length > 0) {
      const formData = new FormData();
      
      // Ajouter tous les fichiers
      Array.from(photoFiles).forEach((file, index) => {
        console.log(`Ajout fichier ${index + 1}:`, file.name, file.type, file.size);
        formData.append("photos", file);
      });
      
      formData.append("id_maintenance", id_maintenance);
      formData.append("id_produit", id_produit);
      if (commentaire) {
        formData.append("commentaire", commentaire);
      }

      console.log("Envoi de FormData avec", photoFiles.length, "photos");

      const resPhotos = await fetch(`${API}/photos/multiple`, {
        method: "POST",
        body: formData
      });

      if (!resPhotos.ok) {
        const error = await resPhotos.json();
        console.error("Erreur upload photos:", error);
        alert(`Produit associé mais erreur photos: ${error.error || 'Erreur inconnue'}`);
      } else {
        const result = await resPhotos.json();
        console.log("Photos uploadées avec succès:", result);
      }
    } else {
      console.log("Aucune photo à uploader");
    }

    hideAddProduitForm();
    await loadProduitsAssocies(); // Recharge la liste
    alert("Produit associé avec succès !");
    
  } catch (err) {
    console.error("Erreur:", err);
    alert("Erreur serveur");
  }
}

// ========== MODIFIER L'ÉTAT D'UN PRODUIT ==========
function editProduitMaintenance(id_produit) {
  alert("Fonctionnalité de modification à implémenter");
}

async function removeProduit(id_produit) {
  const confirmRemove = confirm("Voulez-vous vraiment retirer ce produit de la maintenance ?");
  if (!confirmRemove) return;

  try {
    const res = await fetch(`${API}/maintenance-produits/${id_maintenance}/${id_produit}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      alert("Erreur lors de la suppression");
      return;
    }

    await loadProduitsAssocies(); // Recharge la liste
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

// ========== INIT ==========
loadMaintenanceDetails();

// Initialiser le gestionnaire d'événements pour les photos
function initPhotoInput() {
  const photoInput = document.getElementById("photoInput");
  if (photoInput) {
    // Retirer les anciens gestionnaires pour éviter les doublons
    const newPhotoInput = photoInput.cloneNode(true);
    photoInput.parentNode.replaceChild(newPhotoInput, photoInput);
    
    newPhotoInput.addEventListener("change", function(e) {
      const files = e.target.files;
      const fileCount = document.getElementById("fileCount");
      const preview = document.getElementById("photoPreview");
      
      if (files.length > 5) {
        alert("Maximum 5 photos autorisées");
        e.target.value = "";
        if (fileCount) fileCount.textContent = "";
        if (preview) {
          preview.innerHTML = "";
          preview.style.display = "none";
        }
        return;
      }
      
      if (fileCount) {
        fileCount.textContent = files.length > 0 ? `${files.length} photo(s) sélectionnée(s)` : "";
      }
      
      if (preview) {
        preview.innerHTML = "";
        
        if (files.length === 0) {
          preview.style.display = "none";
          return;
        }
        
        preview.style.display = "flex";
        
        Array.from(files).forEach((file, index) => {
          const reader = new FileReader();
          reader.onload = function(event) {
            const img = document.createElement("img");
            img.src = event.target.result;
            img.className = "photo-preview";
            img.style.maxWidth = "150px";
            img.style.maxHeight = "150px";
            img.style.margin = "0.5rem";
            img.style.borderRadius = "8px";
            img.style.border = "2px solid #DEE2E6";
            img.style.objectFit = "cover";
            preview.appendChild(img);
          };
          reader.readAsDataURL(file);
        });
      }
    });
  }
}