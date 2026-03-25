const API = "http://192.168.1.127:3000";

const params = new URLSearchParams(window.location.search);
const id_maintenance = params.get("id_maintenance");

let allProduits = [];
let produitsAssocies = [];
let maintenance = {};
let currentProduitPhotos = null;

// ─── INIT ─────────────────────────────────────────────────────────────────────

// Câbler les boutons
document.getElementById("btnApercuRI").addEventListener("click", () => {
  window.open(`${API}/maintenances/${id_maintenance}/html`, "_blank");
});
document.getElementById("btnPdfRI").addEventListener("click", () => {
  window.location.href = `${API}/maintenances/${id_maintenance}/pdf`;
});
document.getElementById("backBtn").addEventListener("click", () => window.history.back());

// Callback déclenché par maintenanceForm.js après un PUT réussi
window.onMaintenanceUpdated = async () => {
  await loadMaintenanceDetails();
};

// Démarrage : injecter le formulaire (synchrone) puis charger les données
loadMaintenanceForm("maintenance-form-container");
loadMaintenanceDetails();

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────

function formatDateDisplay(dateString) {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  if (isNaN(d)) return dateString;
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function formatTimeDisplay(t) {
  if (!t) return "";
  return t.substring(0, 5).replace(':', 'h');
}

function parseOperateurs(str) {
  if (!str) return [];
  return str.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
}

function parseTypes(str) {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

function parseJours(json) {
  if (!json) return [];
  try {
    if (typeof json === 'object') return json;
    return JSON.parse(json);
  } catch { return []; }
}

// ─── AFFICHAGE DÉTAILS ────────────────────────────────────────────────────────

async function loadMaintenanceDetails() {
  if (!id_maintenance) {
    document.getElementById("MaintenanceDetails").textContent = "ID de maintenance manquant.";
    return;
  }
  try {
    const res = await apiFetch(`${API}/maintenances/${id_maintenance}`);
    if (!res.ok) throw new Error("Erreur lors du chargement de la maintenance");
    maintenance = await res.json();
    renderMaintenanceDetails();
    await loadProduits();
    await loadProduitsAssocies();
  } catch (err) {
    document.getElementById("MaintenanceDetails").textContent = err.message;
  }
}

function renderMaintenanceDetails() {
  const m = maintenance;

  // Opérateurs
  let operateursList = [];
  if (m.operateursList && Array.isArray(m.operateursList) && m.operateursList.length > 0) {
    operateursList = m.operateursList;
  } else if (m.operateurs) {
    operateursList = parseOperateurs(m.operateurs);
  } 
  const operateursDisplay = operateursList.length ? operateursList.join(' / ') : 'N/A';

  // Types
  const types = parseTypes(m.types_intervention || m.type);
  const travauxDisplay = types.length ? types.join(', ') : 'N/A';

  // Horaires
  const jours = parseJours(m.jours_intervention);
  let horaireHtml = '';

  if (jours.length > 0) {
    const joursMap = {};
    jours.forEach(j => {
      const d = new Date(j.date_jour);
      const idx = JOURS_JS.indexOf(d.getDay());
      if (idx !== -1) joursMap[JOURS[idx]] = j;
    });
    horaireHtml = `<div style="overflow-x:auto; margin-top:0.5rem;">
      <table class="horaires-table" style="min-width:700px;">
        <thead><tr>
          <th></th>
          ${JOURS.map(j => `<th style="text-transform:uppercase;">${j}</th>`).join('')}
        </tr></thead>
        <tbody>
          <tr>
            <td class="row-label">☀️ Matin Arr.</td>
            ${JOURS.map(j => `<td>${joursMap[j] ? formatTimeDisplay(joursMap[j].heure_arrivee_matin) || '-' : '-'}</td>`).join('')}
          </tr>
          <tr>
            <td class="row-label">☀️ Matin Dép.</td>
            ${JOURS.map(j => `<td>${joursMap[j] ? formatTimeDisplay(joursMap[j].heure_depart_matin) || '-' : '-'}</td>`).join('')}
          </tr>
          <tr>
            <td class="row-label">🌤️ APM Arr.</td>
            ${JOURS.map(j => `<td>${joursMap[j] ? formatTimeDisplay(joursMap[j].heure_arrivee_aprem) || '-' : '-'}</td>`).join('')}
          </tr>
          <tr>
            <td class="row-label">🌤️ APM Dép.</td>
            ${JOURS.map(j => `<td>${joursMap[j] ? formatTimeDisplay(joursMap[j].heure_depart_aprem) || '-' : '-'}</td>`).join('')}
          </tr>
        </tbody>
      </table>
    </div>`;
  } else if (m.heure_arrivee_matin || m.heure_arrivee_aprem) {
    const d = new Date(m.date_maintenance);
    const idx = JOURS_JS.indexOf(d.getDay());
    const jourNom = idx !== -1 ? JOURS[idx].toUpperCase() : '?';
    horaireHtml = `<div style="margin-top:0.5rem;">
      <table class="horaires-table">
        <thead><tr><th></th><th>${jourNom}</th></tr></thead>
        <tbody>
          <tr><td class="row-label">☀️ Matin Arr.</td><td>${formatTimeDisplay(m.heure_arrivee_matin) || '-'}</td></tr>
          <tr><td class="row-label">☀️ Matin Dép.</td><td>${formatTimeDisplay(m.heure_depart_matin) || '-'}</td></tr>
          <tr><td class="row-label">🌤️ APM Arr.</td><td>${formatTimeDisplay(m.heure_arrivee_aprem) || '-'}</td></tr>
          <tr><td class="row-label">🌤️ APM Dép.</td><td>${formatTimeDisplay(m.heure_depart_aprem) || '-'}</td></tr>
        </tbody>
      </table>
    </div>`;
  } else {
    horaireHtml = '<span style="color:var(--gray-500); font-size:0.9rem;">Aucune heure renseignée</span>';
  }

  document.getElementById("MaintenanceDetails").innerHTML = `
    <div class="site-detail"><strong>N° RI / Chrono :</strong> ${m.numero_ri || 'N/A'}</div>
    <div class="site-detail"><strong>Désignation produit / site :</strong> ${m.designation_produit_site || 'N/A'}</div>
    <div class="site-detail"><strong>Type d'intervention :</strong> ${m.types_intervention || m.type || 'N/A'}</div>
    <div class="site-detail"><strong>Département :</strong> ${m.departement || 'N/A'}</div>
    <div class="site-detail"><strong>Date demande :</strong> ${formatDateDisplay(m.date_demande)}</div>
    <div class="site-detail"><strong>Date accord client :</strong> ${formatDateDisplay(m.date_accord_client)}</div>
    <div class="site-detail"><strong>Date intervention :</strong> ${formatDateDisplay(m.date_maintenance)}</div>
    <div class="site-detail"><strong>Client :</strong> ${m.client_nom || m.site_nom || 'N/A'}</div>
    <div class="site-detail"><strong>Contact :</strong> ${m.contact || 'N/A'}</div>
    <div class="site-detail"><strong>Type panneau / produit :</strong> ${m.type_produit || 'N/A'}</div>
    <div class="site-detail"><strong>N° Affaire / CDE :</strong> ${m.numero_commande || 'N/A'}</div>
    <div class="site-detail"><strong>Personnes affectées :</strong> ${operateursDisplay}</div>
    <div class="site-detail"><strong>État :</strong> ${m.etat || 'N/A'}</div>
    <div class="site-detail"><strong>Garantie :</strong> ${m.garantie === 1 || m.garantie === true ? '✅ Oui' : '❌ Non'}</div>
    <div class="site-detail"><strong>Nature des travaux :</strong> ${travauxDisplay}</div>
    ${m.commentaire ? `<div class="site-detail"><strong>Commentaire :</strong> ${m.commentaire}</div>` : ''}
    <div style="margin-top: 1.25rem;">
      <strong style="display:block; margin-bottom:0.5rem; color:var(--gray-700);">🕐 Horaires d'intervention :</strong>
      ${horaireHtml}
    </div>
  `;
}

// ─── PRODUITS ─────────────────────────────────────────────────────────────────

async function loadProduits() {
  try {
    const res = await apiFetch(`${API}/produits/ProduitsBySiteID/${maintenance.id_site}`);
    if (!res.ok) throw new Error();
    allProduits = await res.json();
  } catch { console.error("Erreur chargement produits"); }
}

async function loadProduitsAssocies() {
  try {
    const res = await apiFetch(`${API}/maintenance-produits/maintenance/${id_maintenance}`);
    if (!res.ok) throw new Error();
    produitsAssocies = await res.json();

    const container = document.getElementById("ListeProduits");
    container.innerHTML = "";

    if (produitsAssocies.length === 0) {
      container.innerHTML = "<p>Aucun produit associé à cette maintenance.</p>";
      return;
    }

    for (const p of produitsAssocies) {
      const photosRes = await apiFetch(`${API}/photos/maintenance/${id_maintenance}/${p.id_produit}`);
      const photos = photosRes.ok ? await photosRes.json() : [];

      const details = document.createElement("details");
      const etat = (p.etat || "").toLowerCase();
      if (etat === "ok")           details.classList.add("equipement-ok");
      else if (etat === "nok")     details.classList.add("equipement-nok");
      else if (etat === "passable")details.classList.add("equipement-passable");
      else                         details.classList.add("equipement-autre");

      const summary = document.createElement("summary");
      summary.textContent = `${p.nom} — ${p.etat || "N/A"}`;
      details.appendChild(summary);

      const content = document.createElement("div");
      content.innerHTML = `
        <div><strong>Nom :</strong><span>${p.nom}</span></div>
        <div><strong>Département :</strong><span>${p.departement || "N/A"}</span></div>
        <div><strong>Description :</strong><span>${p.description || "N/A"}</span></div>
        <div><strong>État lors de la maintenance :</strong><span>${p.etat || "N/A"}</span></div>
        <div><strong>Commentaire :</strong><span>${p.commentaire || "N/A"}</span></div>
        <div class="produit-maintenance-section">
          <h5>📝 Informations de maintenance</h5>
          <div style="padding:0.5rem 0; border-bottom:1px solid var(--gray-100);">
            <strong>État constaté :</strong><span>${p.etat_constate || "Non renseigné"}</span>
          </div>
          <div style="padding:0.5rem 0; border-bottom:1px solid var(--gray-100);">
            <strong>Travaux effectués :</strong><span>${p.travaux_effectues || "Non renseigné"}</span>
          </div>
          <div style="padding:0.5rem 0;">
            <strong>RI interne :</strong><span>${p.ri_interne || "Non renseigné"}</span>
          </div>
        </div>
        <h4 style="margin-top:1.5rem; margin-bottom:1rem; color:#0066CC;">📸 Photos (${photos.length}/5)</h4>
        <div class="photos-grid">
          ${photos.map(photo => `
            <div class="photo-item">
              <img src="${API}${photo.chemin_photo}" alt="Photo"
                   onclick="openPhotoModal('${API}${photo.chemin_photo}')" />
              <div class="photo-actions">
                <button onclick="deletePhoto(${photo.id_photo}, ${p.id_produit})"
                        class="btn-remove-produit" title="Supprimer">🗑️</button>
              </div>
              ${photo.commentaire ? `<p class="photo-description">${photo.commentaire}</p>` : ''}
            </div>
          `).join('')}
        </div>
        ${photos.length < 5
          ? `<button onclick="showAddPhotoForm(${p.id_produit})" class="primary" style="margin-top:1rem;">
               📷 Ajouter des photos (${photos.length}/5)
             </button>`
          : '<p style="color:#FFC107; margin-top:1rem;">⚠️ Limite de 5 photos atteinte</p>'
        }
        <div style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button onclick="editProduitMaintenance(${p.id_produit})" class="btn-edit-produit">
            Modifier les informations
          </button>
          <button onclick="removeProduit(${p.id_produit})" class="btn-remove-produit">
            Retirer de la maintenance
          </button>
        </div>
      `;
      details.appendChild(content);
      container.appendChild(details);
    }
  } catch (err) {
    document.getElementById("ListeProduits").textContent = err.message;
  }
}

// ─── PHOTOS ───────────────────────────────────────────────────────────────────

function showAddPhotoForm(id_produit) {
  currentProduitPhotos = id_produit;
  const formModal = document.createElement("div");
  formModal.id = "addPhotoFormModal";
  formModal.className = "modal";
  formModal.style.display = "flex";
  formModal.innerHTML = `
    <form id="photoForm" onsubmit="addPhoto(event)" style="max-width:600px;">
      <h3>📷 Ajouter des photos</h3>
      <p class="photo-help-text">💡 Vous pouvez ajouter jusqu'à 5 photos</p>
      <input type="file" id="photoFile" accept="image/*" multiple required />
      <div id="photoPreviewModal" style="display:flex; flex-wrap:wrap; gap:0.5rem; margin:1rem 0;"></div>
      <textarea id="photoDescription" placeholder="Commentaire pour toutes les photos (optionnel)"></textarea>
      <button class="primary" type="submit">Ajouter</button>
      <button type="button" onclick="hideAddPhotoForm()">Annuler</button>
    </form>
  `;
  document.body.appendChild(formModal);

  document.getElementById("photoFile").addEventListener("change", function(e) {
    const files = e.target.files;
    const preview = document.getElementById("photoPreviewModal");
    if (files.length > 5) { alert("Maximum 5 photos"); e.target.value = ""; preview.innerHTML = ""; return; }
    preview.innerHTML = "";
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = document.createElement("img");
        img.src = ev.target.result;
        Object.assign(img.style, { maxWidth:'150px', maxHeight:'150px', borderRadius:'8px', border:'2px solid #DEE2E6', objectFit:'cover' });
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
  const files = fileInput?.files;
  if (!files || files.length === 0) { alert("Veuillez sélectionner au moins une photo"); return; }
  if (files.length > 5) { alert("Maximum 5 photos autorisées"); return; }

  const formData = new FormData();
  Array.from(files).forEach(f => formData.append("photos", f));
  formData.append("id_maintenance", id_maintenance);
  formData.append("id_produit", currentProduitPhotos);
  if (commentaire) formData.append("commentaire", commentaire);

  try {
    const res = await apiFetch(`${API}/photos/multiple`, { method: "POST", body: formData });
    if (!res.ok) { const err = await res.json(); alert(err.error || "Erreur"); return; }
    const result = await res.json();
    alert(result.message || "Photos ajoutées !");
    hideAddPhotoForm();
    loadProduitsAssocies();
  } catch (err) { console.error(err); alert("Erreur serveur"); }
}

async function deletePhoto(id_photo) {
  if (!confirm("Voulez-vous vraiment supprimer cette photo ?")) return;
  try {
    const res = await apiFetch(`${API}/photos/${id_photo}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression"); return; }
    loadProduitsAssocies();
  } catch (err) { console.error(err); alert("Erreur serveur"); }
}

function openPhotoModal(url) {
  document.getElementById("photoModal").style.display = "flex";
  document.getElementById("modalPhoto").src = url;
}

function closePhotoModal() {
  document.getElementById("photoModal").style.display = "none";
}

// ─── ASSOCIER UN PRODUIT ──────────────────────────────────────────────────────

function loadProduitsSelect() {
  const select = document.getElementById("produitSelect");
  select.innerHTML = '<option value="">-- Sélectionner un produit --</option>';
  const ids = produitsAssocies.map(p => p.id_produit);
  const dispo = allProduits.filter(p => !ids.includes(p.id_produit));
  if (dispo.length === 0) {
    select.innerHTML = '<option value="">Tous les produits sont déjà associés</option>';
    select.disabled = true;
    return;
  }
  select.disabled = false;
  dispo.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id_produit;
    opt.textContent = `${p.nom} — ${p.departement || "N/A"}`;
    select.appendChild(opt);
  });
}

function showAddProduitForm() {
  loadProduitsSelect();
  document.getElementById("produitAssocForm").reset();
  const preview = document.getElementById("photoPreview");
  if (preview) { preview.innerHTML = ""; preview.style.display = "none"; }
  document.getElementById("addProduitForm").style.display = "block";
  setTimeout(() => initPhotoInput(), 100);
}

function hideAddProduitForm() {
  document.getElementById("addProduitForm").style.display = "none";
  document.getElementById("produitAssocForm").reset();
  const preview = document.getElementById("photoPreview");
  if (preview) { preview.innerHTML = ""; preview.style.display = "none"; }
}

async function addProduitToMaintenance(event) {
  event.preventDefault();
  const id_produit = document.getElementById("produitSelect").value;
  if (!id_produit) { alert("Veuillez sélectionner un produit"); return; }
  const photoInput = document.getElementById("photoInput");
  const photoFiles = photoInput?.files;
  if (photoFiles && photoFiles.length > 5) { alert("Maximum 5 photos autorisées"); return; }

  try {
    const resAssoc = await apiFetch(`${API}/maintenance-produits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_maintenance,
        id_produit,
        etat:              document.getElementById("produitEtat").value || null,
        commentaire:       document.getElementById("produitCommentaire").value || null,
        etat_constate:     document.getElementById("produitEtatConstate").value || null,
        travaux_effectues: document.getElementById("produitTravauxEffectues").value || null,
        ri_interne:        document.getElementById("produitRiInterne").value || null
      })
    });
    if (!resAssoc.ok) { const e = await resAssoc.json(); alert(e.error || "Erreur"); return; }

    if (photoFiles && photoFiles.length > 0) {
      const formData = new FormData();
      Array.from(photoFiles).forEach(f => formData.append("photos", f));
      formData.append("id_maintenance", id_maintenance);
      formData.append("id_produit", id_produit);
      const commentairePhotos = document.getElementById("photoDescriptionAddProduit").value;
      if (commentairePhotos) formData.append("commentaire", commentairePhotos);
      const resPhotos = await apiFetch(`${API}/photos/multiple`, { method: "POST", body: formData });
      if (!resPhotos.ok) { const e = await resPhotos.json(); alert(`Produit associé mais erreur photos: ${e.error}`); }
    }

    hideAddProduitForm();
    await loadProduitsAssocies();
    alert("Produit associé avec succès !");
  } catch (err) { console.error(err); alert("Erreur serveur"); }
}

// ─── MODIFIER PRODUIT ─────────────────────────────────────────────────────────

function editProduitMaintenance(id_produit) {
  const p = produitsAssocies.find(p => p.id_produit === id_produit);
  if (!p) { alert("Produit non trouvé"); return; }
  document.getElementById("editProduitId").value = id_produit;
  document.getElementById("editProduitNom").textContent = p.nom;
  document.getElementById("editProduitEtat").value = p.etat || "";
  document.getElementById("editProduitCommentaire").value = p.commentaire || "";
  document.getElementById("editProduitEtatConstate").value = p.etat_constate || "";
  document.getElementById("editProduitTravauxEffectues").value = p.travaux_effectues || "";
  document.getElementById("editProduitRiInterne").value = p.ri_interne || "";
  document.getElementById("editProduitForm").style.display = "block";
}

function hideEditProduitForm() {
  document.getElementById("editProduitForm").style.display = "none";
}

async function updateProduitMaintenance(event) {
  event.preventDefault();
  if (!confirm("Êtes-vous sûr de vouloir modifier ces informations ?")) return;
  const id_produit = document.getElementById("editProduitId").value;
  try {
    const res = await apiFetch(`${API}/maintenance-produits/${id_maintenance}/${id_produit}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        etat:              document.getElementById("editProduitEtat").value || null,
        commentaire:       document.getElementById("editProduitCommentaire").value || null,
        etat_constate:     document.getElementById("editProduitEtatConstate").value || null,
        travaux_effectues: document.getElementById("editProduitTravauxEffectues").value || null,
        ri_interne:        document.getElementById("editProduitRiInterne").value || null
      })
    });
    if (!res.ok) { alert("Erreur lors de la modification"); return; }
    hideEditProduitForm();
    await loadProduitsAssocies();
    alert("Informations mises à jour !");
  } catch (err) { console.error(err); alert("Erreur serveur"); }
}

async function removeProduit(id_produit) {
  if (!confirm("Voulez-vous vraiment retirer ce produit de la maintenance ?")) return;
  try {
    const res = await apiFetch(`${API}/maintenance-produits/${id_maintenance}/${id_produit}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression"); return; }
    await loadProduitsAssocies();
  } catch (err) { console.error(err); alert("Erreur serveur"); }
}

// ─── PHOTO INPUT ──────────────────────────────────────────────────────────────

function initPhotoInput() {
  const photoInput = document.getElementById("photoInput");
  if (!photoInput) return;
  const newInput = photoInput.cloneNode(true);
  photoInput.parentNode.replaceChild(newInput, photoInput);
  newInput.addEventListener("change", function(e) {
    const files = e.target.files;
    const preview = document.getElementById("photoPreview");
    if (files.length > 5) { alert("Maximum 5 photos"); e.target.value = ""; if (preview) preview.innerHTML = ""; return; }
    if (preview) {
      preview.innerHTML = "";
      preview.style.display = files.length > 0 ? "flex" : "none";
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = ev => {
          const img = document.createElement("img");
          img.src = ev.target.result;
          img.className = "photo-preview";
          preview.appendChild(img);
        };
        reader.readAsDataURL(file);
      });
    }
  });
}