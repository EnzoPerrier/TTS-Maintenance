const API = "http://192.168.1.127:3000";

const params = new URLSearchParams(window.location.search);
const id_maintenance = params.get("id_maintenance");

let allProduits = [];
let produitsAssocies = [];
let maintenance = {};
let currentProduitPhotos = null;

// Jours ordonnés pour la grille horaires
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

function formatDateDisplay(dateString) {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  if (isNaN(d)) return dateString;
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function formatTimeDisplay(t) {
  if (!t) return "";
  return t.substring(0,5).replace(':', 'h');
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

// Visual feedback on checked checkboxes
function toggleCheckedClass(checkbox) {
  checkbox.closest('.checkbox-item').classList.toggle('checked', checkbox.checked);
}

// ─── AFFICHAGE DÉTAILS ────────────────────────────────────────────────────────

async function loadMaintenanceDetails() {
  if (!id_maintenance) {
    document.getElementById("MaintenanceDetails").textContent = "ID de maintenance manquant.";
    return;
  }

  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`);
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

  // Opérateurs : lire depuis operateurs, operateursList (parsé par le controller), ou les colonnes legacy
  let operateursList = [];
  if (m.operateursList && Array.isArray(m.operateursList) && m.operateursList.length > 0) {
    operateursList = m.operateursList;
  } else if (m.operateurs) {
    operateursList = parseOperateurs(m.operateurs);
  } else {
    operateursList = [m.operateur_1, m.operateur_2, m.operateur_3].filter(Boolean);
  }
  const operateursDisplay = operateursList.length ? operateursList.join(' / ') : 'N/A';

  // Types / nature des travaux
  const types = parseTypes(m.types_intervention || m.type);
  const travauxDisplay = types.length ? types.join(', ') : 'N/A';

  // Horaires : construire un mini tableau
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
    <div class="site-detail"><strong>Catégorie :</strong> ${m.categorie || 'N/A'}</div>
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

  // ─── Boutons RI / PDF ─────────────────────────────

const btnApercu = document.getElementById("btnApercuRI");
const btnPdf = document.getElementById("btnPdfRI");

if (btnApercu && btnPdf && maintenance.id_maintenance) {

  btnApercu.onclick = () => {
    window.open(`${API}/maintenances/${maintenance.id_maintenance}/html`, "_blank");
  };

  btnPdf.onclick = () => {
    window.open(`${API}/maintenances/${maintenance.id_maintenance}/pdf`, "_blank");
  };
}

}

// ─── MODIFIER LA MAINTENANCE ──────────────────────────────────────────────────

function showEditMaintenanceForm() {
  if (!maintenance || !maintenance.id_maintenance) { alert("Maintenance non chargée"); return; }

  const m = maintenance;

  // Identification
  document.getElementById("editChrono").value = m.numero_ri || '';
  document.getElementById("editDateDemande").value = formatDateForInput(m.date_demande);
  document.getElementById("editClient").value = m.client_nom || m.site_nom || '';
  document.getElementById("editDesignation").value = m.designation_produit_site || '';
  document.getElementById("editDateAccordClient").value = formatDateForInput(m.date_accord_client);
  document.getElementById("editContact").value = m.contact || '';
  document.getElementById("editCategorie").value = m.categorie || '';
  document.getElementById("editDateIntervention").value = formatDateForInput(m.date_maintenance);
  document.getElementById("editTypeProduit").value = m.type_produit || '';
  document.getElementById("editTypeIntervention").value = '';
  document.getElementById("editDepartement").value = m.departement || '';
  document.getElementById("editNumeroCommande").value = m.numero_commande || '';
  document.getElementById("editEtat").value = m.etat || '';
  document.getElementById("editCommentaire").value = m.commentaire || '';

  // Opérateurs
  const operateursList = parseOperateurs(m.operateurs || [m.operateur_1, m.operateur_2, m.operateur_3].filter(Boolean).join('\n'));
  document.getElementById("editOperateurs").value = operateursList.join('\n');

  // Horaires 7 jours
  // Reset
  JOURS.forEach(j => {
    ['matin_arr','matin_dep','apm_arr','apm_dep'].forEach(slot => {
      const el = document.getElementById(`h_${j}_${slot}`);
      if (el) el.value = '';
    });
  });

  const jours = parseJours(m.jours_intervention);
  if (jours.length > 0) {
    jours.forEach(jour => {
      const d = new Date(jour.date_jour);
      const idx = JOURS_JS.indexOf(d.getDay());
      if (idx === -1) return;
      const j = JOURS[idx];
      const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val.substring(0,5); };
      set(`h_${j}_matin_arr`, jour.heure_arrivee_matin);
      set(`h_${j}_matin_dep`, jour.heure_depart_matin);
      set(`h_${j}_apm_arr`, jour.heure_arrivee_aprem);
      set(`h_${j}_apm_dep`, jour.heure_depart_aprem);
    });
  } else if (m.date_maintenance) {
    const d = new Date(m.date_maintenance);
    const idx = JOURS_JS.indexOf(d.getDay());
    if (idx !== -1) {
      const j = JOURS[idx];
      const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val.substring(0,5); };
      set(`h_${j}_matin_arr`, m.heure_arrivee_matin);
      set(`h_${j}_matin_dep`, m.heure_depart_matin);
      set(`h_${j}_apm_arr`, m.heure_arrivee_aprem);
      set(`h_${j}_apm_dep`, m.heure_depart_aprem);
    }
  }

  // Nature des travaux — reset toutes les cases
  const chkIds = ['installation','curative','revision','autres_g','contrat','autres_d'];
  chkIds.forEach(id => {
    const el = document.getElementById(`chk_${id}`);
    if (el) { el.checked = false; el.closest('.checkbox-item').classList.remove('checked'); }
  });

  const types = parseTypes(m.types_intervention || m.type);
  const typeMap = {
    'Installation': 'installation',
    'Intervention Curative': 'curative',
    'Intervention curative': 'curative',
    'Révision': 'revision',
    'Contrat de maintenance': 'contrat',
    'Location': 'location',
    'Accident': 'accident',
    'Vandalisme': 'vandalisme',
    'Orage': 'orage',
    'Autres': 'autres_g',
  };
  types.forEach(t => {
    const id = typeMap[t];
    if (id) {
      const el = document.getElementById(`chk_${id}`);
      if (el) { el.checked = true; el.closest('.checkbox-item').classList.add('checked'); }
    }
  });

  // Garantie
  const garantieOui = m.garantie === 1 || m.garantie === true || m.garantie === 'Oui';
  document.getElementById("garantieOui").checked = garantieOui;
  document.getElementById("garantieNon").checked = !garantieOui;

  document.getElementById("editMaintenanceForm").style.display = "block";
}

function hideEditMaintenanceForm() {
  document.getElementById("editMaintenanceForm").style.display = "none";
}

async function updateMaintenance(event) {
  event.preventDefault();
  if (!confirm("Êtes-vous sûr de vouloir modifier cette maintenance ?")) return;

  // Collecte des types cochés
  const chkMap = {
    chk_installation: 'Installation',
    chk_curative: 'Intervention Curative',
    chk_revision: 'Révision',
    chk_autres_g: 'Autres',
    chk_contrat: 'Contrat de maintenance',
    chk_autres_d: 'Autres',
  };
  const types = Object.entries(chkMap)
    .filter(([id]) => document.getElementById(id)?.checked)
    .map(([, val]) => val);
  // Dédoublonner
  const typesUniq = [...new Set(types)];

  // Collecte des jours
  const jours = [];
  const dateIntervention = document.getElementById("editDateIntervention").value;

  JOURS.forEach((j, idx) => {
    const arr_m = document.getElementById(`h_${j}_matin_arr`)?.value;
    const dep_m = document.getElementById(`h_${j}_matin_dep`)?.value;
    const arr_a = document.getElementById(`h_${j}_apm_arr`)?.value;
    const dep_a = document.getElementById(`h_${j}_apm_dep`)?.value;

    if (arr_m || dep_m || arr_a || dep_a) {
      // Calculer une date approximative pour ce jour de la semaine
      // On prend la date d'intervention comme base et on trouve le bon jour
      const baseDate = new Date(dateIntervention || Date.now());
      const baseDow = baseDate.getDay(); // 0=dim
      const targetDow = JOURS_JS[idx];
      const diff = targetDow - baseDow;
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

  // Opérateurs
  const operateursRaw = document.getElementById("editOperateurs").value;
  const operateursList = operateursRaw.split('\n').map(s => s.trim()).filter(Boolean);

  const garantie = document.querySelector('input[name="editGarantie"]:checked')?.value === 'Oui' ? 1 : 0;

  const data = {
    id_site: maintenance.id_site,
    numero_ri: document.getElementById("editChrono").value || null,
    designation_produit_site: document.getElementById("editDesignation").value || null,
    categorie: document.getElementById("editCategorie").value || null,
    types: typesUniq,
    type: typesUniq.join(',') || null,
    departement: document.getElementById("editDepartement").value || null,
    date_demande: document.getElementById("editDateDemande").value || null,
    date_accord_client: document.getElementById("editDateAccordClient").value || null,
    date_maintenance: dateIntervention || null,
    contact: document.getElementById("editContact").value || null,
    type_produit: document.getElementById("editTypeProduit").value || null,
    numero_commande: document.getElementById("editNumeroCommande").value || null,
    operateurs: operateursList,
    // Legacy
    operateur_1: operateursList[0] || null,
    operateur_2: operateursList[1] || null,
    operateur_3: operateursList[2] || null,
    jours: jours.length > 0 ? jours : undefined,
    etat: document.getElementById("editEtat").value || null,
    commentaire: document.getElementById("editCommentaire").value || null,
    garantie
  };

  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) { alert("Erreur lors de la modification de la maintenance"); return; }

    hideEditMaintenanceForm();
    await loadMaintenanceDetails();
    alert("✓ Maintenance modifiée avec succès !");
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

// ─── PRODUITS ─────────────────────────────────────────────────────────────────

async function loadProduits() {
  try {
    const res = await fetch(`${API}/produits/ProduitsBySiteID/${maintenance.id_site}`);
    if (!res.ok) throw new Error();
    allProduits = await res.json();
  } catch { console.error("Erreur chargement produits"); }
}

async function loadProduitsAssocies() {
  try {
    const res = await fetch(`${API}/maintenance-produits/maintenance/${id_maintenance}`);
    if (!res.ok) throw new Error();
    produitsAssocies = await res.json();

    const container = document.getElementById("ListeProduits");
    container.innerHTML = "";

    if (produitsAssocies.length === 0) {
      container.innerHTML = "<p>Aucun produit associé à cette maintenance.</p>";
      return;
    }

    for (const p of produitsAssocies) {
      const photosRes = await fetch(`${API}/photos/maintenance/${id_maintenance}/${p.id_produit}`);
      const photos = photosRes.ok ? await photosRes.json() : [];

      const details = document.createElement("details");
      const etat = (p.etat || "").toLowerCase();
      if (etat === "ok") details.classList.add("equipement-ok");
      else if (etat === "nok") details.classList.add("equipement-nok");
      else if (etat === "passable") details.classList.add("equipement-passable");
      else details.classList.add("equipement-autre");

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
              <img src="${API}${photo.chemin_photo}" alt="Photo" onclick="openPhotoModal('${API}${photo.chemin_photo}')" />
              <div class="photo-actions">
                <button onclick="deletePhoto(${photo.id_photo}, ${p.id_produit})" class="btn-remove-produit" title="Supprimer">🗑️</button>
              </div>
              ${photo.commentaire ? `<p class="photo-description">${photo.commentaire}</p>` : ''}
            </div>
          `).join('')}
        </div>
        ${photos.length < 5
          ? `<button onclick="showAddPhotoForm(${p.id_produit})" class="primary" style="margin-top:1rem;">📷 Ajouter des photos (${photos.length}/5)</button>`
          : '<p style="color:#FFC107; margin-top:1rem;">⚠️ Limite de 5 photos atteinte</p>'
        }
        <div style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button onclick="editProduitMaintenance(${p.id_produit})" class="btn-edit-produit">Modifier les informations</button>
          <button onclick="removeProduit(${p.id_produit})" class="btn-remove-produit">Retirer de la maintenance</button>
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
    const res = await fetch(`${API}/photos/multiple`, { method: "POST", body: formData });
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
    const res = await fetch(`${API}/photos/${id_photo}`, { method: "DELETE" });
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
    const resAssoc = await fetch(`${API}/maintenance-produits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_maintenance,
        id_produit,
        etat: document.getElementById("produitEtat").value || null,
        commentaire: document.getElementById("produitCommentaire").value || null,
        etat_constate: document.getElementById("produitEtatConstate").value || null,
        travaux_effectues: document.getElementById("produitTravauxEffectues").value || null,
        ri_interne: document.getElementById("produitRiInterne").value || null
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
      const resPhotos = await fetch(`${API}/photos/multiple`, { method: "POST", body: formData });
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
    const res = await fetch(`${API}/maintenance-produits/${id_maintenance}/${id_produit}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        etat: document.getElementById("editProduitEtat").value || null,
        commentaire: document.getElementById("editProduitCommentaire").value || null,
        etat_constate: document.getElementById("editProduitEtatConstate").value || null,
        travaux_effectues: document.getElementById("editProduitTravauxEffectues").value || null,
        ri_interne: document.getElementById("editProduitRiInterne").value || null
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
    const res = await fetch(`${API}/maintenance-produits/${id_maintenance}/${id_produit}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression"); return; }
    await loadProduitsAssocies();
  } catch (err) { console.error(err); alert("Erreur serveur"); }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

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

loadMaintenanceDetails();