// ============================================================
//  PARTIAL : maintenanceForm.js
//  Formulaire Maintenance (Ajout + Modification)
//  HTML intégré en template string — fonctionne sans serveur (file://)
//
//  DÉPENDANCES dans la page hôte :
//    - const API        → URL de l'API
//    - const JOURS      → ['lundi','mardi',...]
//    - const JOURS_JS   → [1,2,3,4,5,6,0]
//
//  FONCTIONS PUBLIQUES :
//    - loadMaintenanceForm(containerId?)   → injecte le HTML dans le conteneur
//    - showMaintenanceForm()               → ouvre en mode Ajout
//    - showEditMaintenanceForm(obj)        → ouvre en mode Édition
//    - hideMaintenanceForm()               → ferme et réinitialise
//    - handleMaintenanceSubmit(event)      → handler onsubmit du <form>
//
//  CALLBACKS page hôte :
//    - window.onMaintenanceCreated(obj)   → après POST réussi
//    - window.onMaintenanceUpdated(obj)   → après PUT réussi
// ============================================================

const JOURS    = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
const JOURS_JS = [1, 2, 3, 4, 5, 6, 0]; // correspondance getDay()

let _editingMaintenanceId = null;
let _contextIdSite = null; // id_site injecté par la page hôte lors d'un ajout

// ─── HTML DU FORMULAIRE ───────────────────────────────────────────────────────

const _MAINTENANCE_FORM_HTML = `
<div id="maintenanceFormOverlay" class="modal" style="display:none;">
  <form id="maintenanceForm" class="maintenance-form-modern" onsubmit="handleMaintenanceSubmit(event)">

    <h3 id="maintenanceFormTitle">📋 Ajouter une maintenance</h3>

    <!-- ══ IDENTIFICATION ══ -->
    <div class="form-section">
      <div class="section-header">
        <span class="section-icon">🪪</span>
        <h4>Identification</h4>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="mf_chrono">Chrono d'inter. <span class="required-star">*</span></label>
          <input type="text" id="mf_chrono" placeholder="Ex: RI251210" required />
        </div>
        <div class="form-group">
          <label for="mf_date_demande">Date demande</label>
          <input type="date" id="mf_date_demande" />
        </div>
      </div>

      <div class="form-row form-row-3">
        <div class="form-group">
          <label for="mf_designation">Désign. produit / site</label>
          <input type="text" id="mf_designation" placeholder="Désignation produit ou site" />
        </div>
        <div class="form-group">
          <label for="mf_date_accord_client">Date accord client</label>
          <input type="date" id="mf_date_accord_client" />
        </div>
        <div class="form-group">
          <label for="mf_contact">Contact</label>
          <input type="text" id="mf_contact" placeholder="Vide = contact du site" />
        </div>
      </div>

      <div class="form-row form-row-3">
        <div class="form-group">
          <label for="mf_date_intervention">Date inter. <span class="required-star">*</span></label>
          <input type="date" id="mf_date_intervention" />
        </div>
        <div class="form-group">
          <label for="mf_type_produit">Type panneau / produit</label>
          <input type="text" id="mf_type_produit" placeholder="Ex: TJT, PMV..." />
        </div>
      </div>

      <div class="form-row form-row-3">
        <div class="form-group">
          <label for="mf_type_intervention">Type d'intervention</label>
          <select id="mf_type_intervention">
            <option value="">-- Sélectionner --</option>
            <option value="SAV">SAV</option>
            <option value="Maintenance">Maintenance</option>
            <option value="MES">MES</option>
            <option value="Formation">Formation</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
        <div class="form-group">
          <label for="mf_departement">Département</label>
          <input type="text" id="mf_departement" placeholder="Ex: STEP, SDRT..." />
        </div>
        <div class="form-group">
          <label for="mf_numero_commande">N° D'affaire / CDE</label>
          <input type="text" id="mf_numero_commande" placeholder="N° Commande / Affaire" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="mf_etat">État</label>
          <select id="mf_etat">
            <option value="">-- État --</option>
            <option value="Planifiée">📅 Planifiée</option>
            <option value="En cours">⚙️ En cours</option>
            <option value="Terminée">✅ Terminée</option>
          </select>
        </div>
        <div class="form-group">
          <label for="mf_commentaire">Commentaire</label>
          <textarea id="mf_commentaire" placeholder="Commentaire interne..." rows="2"></textarea>
        </div>
      </div>
    </div>

    <!-- ══ OPÉRATEURS ══ -->
    <div class="form-section">
      <div class="section-header">
        <span class="section-icon">👷</span>
        <h4>Personnes affectées</h4>
      </div>
      <div class="form-group">
        <label for="mf_operateurs">Initiales des opérateurs</label>
        <textarea id="mf_operateurs" class="operators-tags-input" rows="4"
          placeholder="Saisir les initiales, appuyer sur Entrée entre chaque personne&#10;Ex: VM&#10;JD&#10;ML_H (suffixe _H = hotline)"></textarea>
        <span class="operators-hint">
          💡 Séparer chaque personne par la touche "Entrée".
          Ajouter _H à la fin pour indiquer une hotline (ex: VM_H)
        </span>
      </div>
    </div>

    <!-- ══ HORAIRES 7 JOURS ══ -->
    <div class="form-section">
      <div class="section-header">
        <span class="section-icon">🕐</span>
        <h4>Horaires d'intervention — Matin ☀️ &amp; Après-midi 🌤️</h4>
      </div>
      <div class="horaires-7jours">
        <table>
          <thead>
            <tr>
              <th style="min-width:90px;"></th>
              <th>LUNDI</th><th>MARDI</th><th>MERCREDI</th><th>JEUDI</th>
              <th>VENDREDI</th><th>SAMEDI</th><th>DIMANCHE</th>
            </tr>
          </thead>
          <tbody>
            <tr><td class="period-sub" colspan="8">☀️ Matin</td></tr>
            <tr>
              <td class="period-sub">Arrivée</td>
              <td><input type="time" id="h_lundi_matin_arr" /></td>
              <td><input type="time" id="h_mardi_matin_arr" /></td>
              <td><input type="time" id="h_mercredi_matin_arr" /></td>
              <td><input type="time" id="h_jeudi_matin_arr" /></td>
              <td><input type="time" id="h_vendredi_matin_arr" /></td>
              <td><input type="time" id="h_samedi_matin_arr" /></td>
              <td><input type="time" id="h_dimanche_matin_arr" /></td>
            </tr>
            <tr>
              <td class="period-sub">Départ</td>
              <td><input type="time" id="h_lundi_matin_dep" /></td>
              <td><input type="time" id="h_mardi_matin_dep" /></td>
              <td><input type="time" id="h_mercredi_matin_dep" /></td>
              <td><input type="time" id="h_jeudi_matin_dep" /></td>
              <td><input type="time" id="h_vendredi_matin_dep" /></td>
              <td><input type="time" id="h_samedi_matin_dep" /></td>
              <td><input type="time" id="h_dimanche_matin_dep" /></td>
            </tr>
            <tr><td class="period-sub" colspan="8">🌤️ Après-midi</td></tr>
            <tr>
              <td class="period-sub">Arrivée</td>
              <td><input type="time" id="h_lundi_apm_arr" /></td>
              <td><input type="time" id="h_mardi_apm_arr" /></td>
              <td><input type="time" id="h_mercredi_apm_arr" /></td>
              <td><input type="time" id="h_jeudi_apm_arr" /></td>
              <td><input type="time" id="h_vendredi_apm_arr" /></td>
              <td><input type="time" id="h_samedi_apm_arr" /></td>
              <td><input type="time" id="h_dimanche_apm_arr" /></td>
            </tr>
            <tr>
              <td class="period-sub">Départ</td>
              <td><input type="time" id="h_lundi_apm_dep" /></td>
              <td><input type="time" id="h_mardi_apm_dep" /></td>
              <td><input type="time" id="h_mercredi_apm_dep" /></td>
              <td><input type="time" id="h_jeudi_apm_dep" /></td>
              <td><input type="time" id="h_vendredi_apm_dep" /></td>
              <td><input type="time" id="h_samedi_apm_dep" /></td>
              <td><input type="time" id="h_dimanche_apm_dep" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══ NATURE DES TRAVAUX ══ -->
    <div class="form-section">
      <div class="section-header">
        <span class="section-icon">⚠️</span>
        <h4>Nature des travaux</h4>
      </div>

      <div class="travaux-grid">
        <div class="travaux-col">
          <label class="checkbox-item" id="lbl-installation">
            <input type="checkbox" id="chk_installation" value="Installation" onchange="toggleCheckedClass(this)" />
            <span>Installation</span>
          </label>
          <label class="checkbox-item" id="lbl-curative">
            <input type="checkbox" id="chk_curative" value="Intervention Curative" onchange="toggleCheckedClass(this)" />
            <span>Intervention Curative</span>
          </label>
          <label class="checkbox-item" id="lbl-revision">
            <input type="checkbox" id="chk_revision" value="Révision" onchange="toggleCheckedClass(this)" />
            <span>Révision</span>
          </label>
          <label class="checkbox-item" id="lbl-location">
            <input type="checkbox" id="chk_location" value="Location" onchange="toggleCheckedClass(this)" />
            <span>Location</span>
          </label>
          <label class="checkbox-item" id="lbl-accident">
            <input type="checkbox" id="chk_accident" value="Accident" onchange="toggleCheckedClass(this)" />
            <span>Accident</span>
          </label>
          <label class="checkbox-item" id="lbl-autres_g">
            <input type="checkbox" id="chk_autres_g" value="Autres" onchange="toggleCheckedClass(this)" />
            <span>Autres</span>
          </label>
        </div>
        <div class="travaux-col">
          <label class="checkbox-item" id="lbl-contrat">
            <input type="checkbox" id="chk_contrat" value="Contrat de maintenance" onchange="toggleCheckedClass(this)" />
            <span>Contrat de maintenance</span>
          </label>
          <label class="checkbox-item" id="lbl-vandalisme">
            <input type="checkbox" id="chk_vandalisme" value="Vandalisme" onchange="toggleCheckedClass(this)" />
            <span>Vandalisme</span>
          </label>
          <label class="checkbox-item" id="lbl-orage">
            <input type="checkbox" id="chk_orage" value="Orage" onchange="toggleCheckedClass(this)" />
            <span>Orage</span>
          </label>
          <label class="checkbox-item" id="lbl-autres_d">
            <input type="checkbox" id="chk_autres_d" value="Autres" onchange="toggleCheckedClass(this)" />
            <span>Autres</span>
          </label>
        </div>
      </div>

      <!-- Garantie -->
      <div style="margin-top:1.25rem;">
        <label style="display:block; font-weight:600; color:var(--gray-700); margin-bottom:0.5rem;">Garantie</label>
        <div class="garantie-row">
          <label class="garantie-option">
            <input type="radio" name="mf_garantie" id="mf_garantie_oui" value="Oui" />
            ✅ Oui
          </label>
          <label class="garantie-option">
            <input type="radio" name="mf_garantie" id="mf_garantie_non" value="Non" checked />
            ❌ Non
          </label>
        </div>
      </div>
    </div>

    <!-- ══ BOUTONS ══ -->
    <div class="form-actions">
      <button class="primary" type="submit" id="maintenanceSubmitBtn">
        <span class="btn-icon">✔</span>
        <span id="maintenanceSubmitLabel">Ajouter</span>
      </button>
      <button type="button" onclick="hideMaintenanceForm()" class="btn-secondary">
        <span class="btn-icon">✕</span> Annuler
      </button>
    </div>

  </form>
</div>
`;

// ─── CHARGEMENT ───────────────────────────────────────────────────────────────

/**
 * Injecte le HTML du formulaire dans le conteneur désigné.
 * Synchrone — plus besoin de fetch ni de serveur.
 * @param {string} containerId - ID du div conteneur (défaut: "maintenance-form-container")
 */
function loadMaintenanceForm(containerId = "maintenance-form-container") {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[MaintenanceForm] Conteneur #${containerId} introuvable.`);
    return;
  }
  container.innerHTML = _MAINTENANCE_FORM_HTML;
  console.log("[MaintenanceForm] Formulaire injecté.");
}

// ─── AFFICHAGE / MASQUAGE ─────────────────────────────────────────────────────

/**
 * Ouvre le formulaire en mode AJOUT.
 * @param {object} [context] - contexte optionnel, ex: { id_site: 42 }
 */
function showMaintenanceForm(context = {}) {
  _editingMaintenanceId = null;
  _contextIdSite = context.id_site || null;
  _resetForm();
  document.getElementById("maintenanceFormTitle").textContent = "📋 Ajouter une maintenance";
  document.getElementById("maintenanceSubmitLabel").textContent = "Ajouter";
  document.getElementById("maintenanceFormOverlay").style.display = "flex";
}

/**
 * Ouvre le formulaire en mode ÉDITION et pré-remplit les champs.
 * @param {object} maintenance - objet maintenance retourné par l'API
 */
function showEditMaintenanceForm(maintenance) {
  if (!maintenance || !maintenance.id_maintenance) {
    alert("Erreur : maintenance non chargée.");
    return;
  }
  if (!document.getElementById("maintenanceFormTitle")) {
    alert("Erreur : le formulaire n'est pas encore initialisé.");
    return;
  }

  _editingMaintenanceId = maintenance.id_maintenance;
  _resetForm();

  // ── Identification ──
  _setVal("mf_chrono",             maintenance.numero_ri);
  _setVal("mf_date_demande",       _fmtDate(maintenance.date_demande));
  _setVal("mf_designation",        maintenance.designation_produit_site);
  _setVal("mf_date_accord_client", _fmtDate(maintenance.date_accord_client));
  _setVal("mf_contact",            maintenance.contact);
  _setVal("mf_date_intervention",  _fmtDate(maintenance.date_maintenance));
  _setVal("mf_type_produit",       maintenance.type_produit);
  _setVal("mf_departement",        maintenance.departement);
  _setVal("mf_numero_commande",    maintenance.numero_commande);
  _setVal("mf_etat",               maintenance.etat);
  _setVal("mf_commentaire",        maintenance.commentaire);

  // ── Opérateurs ──
  const ops = _parseOperateurs(
    maintenance.operateurs ||
    [maintenance.operateur_1, maintenance.operateur_2, maintenance.operateur_3]
      .filter(Boolean).join('\n')
  );
  _setVal("mf_operateurs", ops.join('\n'));

  // ── Horaires 7 jours ──
  _fillHoraires(maintenance);

  // ── Nature des travaux ──
  _fillTravaux(maintenance.types_intervention || maintenance.type);

  // ── Garantie ──
  const garantieOui = maintenance.garantie === 1 || maintenance.garantie === true || maintenance.garantie === 'Oui';
  const elOui = document.getElementById("mf_garantie_oui");
  const elNon = document.getElementById("mf_garantie_non");
  if (elOui) elOui.checked = garantieOui;
  if (elNon) elNon.checked = !garantieOui;

  // ── Titre et bouton ──
  document.getElementById("maintenanceFormTitle").textContent = "📝 Modifier la maintenance";
  document.getElementById("maintenanceSubmitLabel").textContent = "Valider";
  document.getElementById("maintenanceFormOverlay").style.display = "flex";
}

/** Ferme et réinitialise le formulaire */
function hideMaintenanceForm() {
  document.getElementById("maintenanceFormOverlay").style.display = "none";
  _editingMaintenanceId = null;
  _resetForm();
}

// ─── SOUMISSION ───────────────────────────────────────────────────────────────

async function handleMaintenanceSubmit(event) {
  event.preventDefault();
  const data = _collectFormData();

  if (_editingMaintenanceId) {
    if (!confirm("Êtes-vous sûr de vouloir modifier cette maintenance ?")) return;
    try {
      const res = await apiFetch(`${API}/maintenances/${_editingMaintenanceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) { alert("Erreur lors de la modification de la maintenance"); return; }
      hideMaintenanceForm();
      alert("✓ Maintenance modifiée avec succès !");
      if (typeof window.onMaintenanceUpdated === "function") {
        window.onMaintenanceUpdated({ id_maintenance: _editingMaintenanceId, ...data });
      }
    } catch (err) { console.error(err); alert("Erreur serveur"); }

  } else {
    try {
      const res = await apiFetch(`${API}/maintenances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, id_site: _contextIdSite || undefined })
      });
      if (!res.ok) { alert("Erreur lors de la création de la maintenance"); return; }
      const newMaintenance = await res.json();
      hideMaintenanceForm();
      alert("✓ Maintenance créée avec succès !");
      if (typeof window.onMaintenanceCreated === "function") {
        window.onMaintenanceCreated(newMaintenance);
      }
    } catch (err) { console.error(err); alert("Erreur serveur"); }
  }
}

// ─── COLLECTE DES DONNÉES ─────────────────────────────────────────────────────

function _collectFormData() {
  const chkMap = {
    chk_installation: 'Installation',
    chk_curative:     'Intervention Curative',
    chk_revision:     'Révision',
    chk_location:     'Location',
    chk_accident:     'Accident',
    chk_autres_g:     'Autres',
    chk_contrat:      'Contrat de maintenance',
    chk_vandalisme:   'Vandalisme',
    chk_orage:        'Orage',
    chk_autres_d:     'Autres',
  };
  const types = [...new Set(
    Object.entries(chkMap)
      .filter(([id]) => document.getElementById(id)?.checked)
      .map(([, val]) => val)
  )];

  const dateIntervention = _getVal("mf_date_intervention");
  const jours = [];
  JOURS.forEach((j, idx) => {
    const arr_m = document.getElementById(`h_${j}_matin_arr`)?.value;
    const dep_m = document.getElementById(`h_${j}_matin_dep`)?.value;
    const arr_a = document.getElementById(`h_${j}_apm_arr`)?.value;
    const dep_a = document.getElementById(`h_${j}_apm_dep`)?.value;
    if (arr_m || dep_m || arr_a || dep_a) {
      const baseDate = new Date(dateIntervention || Date.now());
      const diff = JOURS_JS[idx] - baseDate.getDay();
      const jourDate = new Date(baseDate);
      jourDate.setDate(jourDate.getDate() + diff);
      jours.push({
        date_jour:           jourDate.toISOString().split('T')[0],
        heure_arrivee_matin: arr_m || null,
        heure_depart_matin:  dep_m || null,
        heure_arrivee_aprem: arr_a || null,
        heure_depart_aprem:  dep_a || null
      });
    }
  });

  const operateursList = _getVal("mf_operateurs").split('\n').map(s => s.trim()).filter(Boolean);
  const garantie = document.querySelector('input[name="mf_garantie"]:checked')?.value === 'Oui' ? 1 : 0;

  return {
    numero_ri:                _getVal("mf_chrono")             || null,
    date_demande:             _getVal("mf_date_demande")       || null,
    designation_produit_site: _getVal("mf_designation")        || null,
    date_accord_client:       _getVal("mf_date_accord_client") || null,
    contact:                  _getVal("mf_contact")            || null,
    date_maintenance:         dateIntervention                  || null,
    type_produit:             _getVal("mf_type_produit")       || null,
    types_intervention:       types.join(',')                  || null,
    type:                     types.join(',')                  || null,
    types,
    departement:              _getVal("mf_departement")        || null,
    numero_commande:          _getVal("mf_numero_commande")    || null,
    etat:                     _getVal("mf_etat")               || null,
    commentaire:              _getVal("mf_commentaire")        || null,
    operateurs:               operateursList,
    jours:                    jours.length > 0 ? jours : undefined,
    garantie
  };
}

// ─── UTILITAIRES INTERNES ─────────────────────────────────────────────────────

function _getVal(id) {
  return document.getElementById(id)?.value || "";
}

function _setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || "";
}

function _fmtDate(dateString) {
  if (!dateString) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [d, m, y] = dateString.split('/');
    return `${y}-${m}-${d}`;
  }
  const date = new Date(dateString);
  if (isNaN(date)) return "";
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function _parseOperateurs(str) {
  if (!str) return [];
  return str.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
}

function _resetForm() {
  const form = document.getElementById("maintenanceForm");
  if (form) form.reset();
  document.querySelectorAll(".checkbox-item").forEach(el => el.classList.remove("checked"));
}

function _fillHoraires(maintenance) {
  JOURS.forEach(j => {
    ['matin_arr','matin_dep','apm_arr','apm_dep'].forEach(slot => {
      const el = document.getElementById(`h_${j}_${slot}`);
      if (el) el.value = '';
    });
  });

  let jours = [];
  try {
    const raw = maintenance.jours_intervention;
    if (raw) jours = typeof raw === 'object' ? raw : JSON.parse(raw);
  } catch { jours = []; }

  if (jours.length > 0) {
    jours.forEach(jour => {
      const d = new Date(jour.date_jour);
      const idx = JOURS_JS.indexOf(d.getDay());
      if (idx === -1) return;
      const j = JOURS[idx];
      const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val.substring(0,5); };
      set(`h_${j}_matin_arr`, jour.heure_arrivee_matin);
      set(`h_${j}_matin_dep`, jour.heure_depart_matin);
      set(`h_${j}_apm_arr`,   jour.heure_arrivee_aprem);
      set(`h_${j}_apm_dep`,   jour.heure_depart_aprem);
    });
  } else if (maintenance.date_maintenance) {
    const d = new Date(maintenance.date_maintenance);
    const idx = JOURS_JS.indexOf(d.getDay());
    if (idx !== -1) {
      const j = JOURS[idx];
      const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val.substring(0,5); };
      set(`h_${j}_matin_arr`, maintenance.heure_arrivee_matin);
      set(`h_${j}_matin_dep`, maintenance.heure_depart_matin);
      set(`h_${j}_apm_arr`,   maintenance.heure_arrivee_aprem);
      set(`h_${j}_apm_dep`,   maintenance.heure_depart_aprem);
    }
  }
}

function _fillTravaux(typesStr) {
  const typeMap = {
    'Installation':           'installation',
    'Intervention Curative':  'curative',
    'Intervention curative':  'curative',
    'Révision':               'revision',
    'Contrat de maintenance': 'contrat',
    'Location':               'location',
    'Accident':               'accident',
    'Vandalisme':             'vandalisme',
    'Orage':                  'orage',
    'Autres':                 'autres_g',
  };
  Object.values(typeMap).forEach(id => {
    const el = document.getElementById(`chk_${id}`);
    if (el) { el.checked = false; el.closest('.checkbox-item')?.classList.remove('checked'); }
  });
  if (!typesStr) return;
  typesStr.split(',').map(s => s.trim()).filter(Boolean).forEach(t => {
    const id = typeMap[t];
    if (id) {
      const el = document.getElementById(`chk_${id}`);
      if (el) { el.checked = true; el.closest('.checkbox-item')?.classList.add('checked'); }
    }
  });
}

// Appelé depuis onchange dans le HTML du formulaire
function toggleCheckedClass(checkbox) {
  checkbox.closest('.checkbox-item').classList.toggle('checked', checkbox.checked);
}