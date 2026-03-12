const API = "http://192.168.1.127:3000";

const params = new URLSearchParams(window.location.search);
const id_client = params.get("id_client");

let allSites = [];
let allEquipements = [];
let allMaintenances = [];
let editingMaintenanceId = null;

const JOURS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
const JOURS_JS = [1,2,3,4,5,6,0];

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

function parseDate(dateStr) {
  if (!dateStr) return new Date(0);
  const date = new Date(dateStr);
  if (isNaN(date)) return new Date(0);
  return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
}

function toggleCheckedClass(checkbox) {
  checkbox.closest('.checkbox-item').classList.toggle('checked', checkbox.checked);
}

function resetHorairesForm() {
  JOURS.forEach(j => {
    ['matin_arr','matin_dep','apm_arr','apm_dep'].forEach(slot => {
      const el = document.getElementById(`cli_${j}_${slot}`);
      if (el) el.value = '';
    });
  });
}

function resetTravauxCheckboxes() {
  ['installation','curative','revision','autres_g','contrat','autres_d'].forEach(id => {
    const el = document.getElementById(`cli_chk_${id}`);
    if (el) { el.checked = false; el.closest('.checkbox-item').classList.remove('checked'); }
  });
}

function collectTypes() {
  const chkMap = {
    cli_chk_installation: 'Installation',
    cli_chk_curative: 'Intervention Curative',
    cli_chk_revision: 'Révision',
    cli_chk_autres_g: 'Autres',
    cli_chk_contrat: 'Contrat de maintenance',
    cli_chk_autres_d: 'Autres',
  };
  const types = Object.entries(chkMap)
    .filter(([id]) => document.getElementById(id)?.checked)
    .map(([, val]) => val);
  return [...new Set(types)];
}

function collectJours(dateIntervention) {
  const jours = [];
  JOURS.forEach((j, idx) => {
    const arr_m = document.getElementById(`cli_${j}_matin_arr`)?.value;
    const dep_m = document.getElementById(`cli_${j}_matin_dep`)?.value;
    const arr_a = document.getElementById(`cli_${j}_apm_arr`)?.value;
    const dep_a = document.getElementById(`cli_${j}_apm_dep`)?.value;
    if (arr_m || dep_m || arr_a || dep_a) {
      const baseDate = new Date(dateIntervention || Date.now());
      const targetDow = JOURS_JS[idx];
      const diff = targetDow - baseDate.getDay();
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
  return jours;
}

// ─── CHARGEMENT CLIENT ────────────────────────────────────────────────────────

async function loadClientDetails() {
  if (!id_client) { document.getElementById("clientDetails").textContent = "ID du client manquant."; return; }
  try {
    const res = await fetch(`${API}/clients/${id_client}`);
    if (!res.ok) throw new Error("Erreur lors du chargement du client");
    const client = await res.json();
    document.getElementById("clientDetails").innerHTML = `
      <div class="site-detail"><strong>Nom :</strong> ${client.nom}</div>
      <div class="site-detail"><strong>Contact :</strong> ${client.contact || "N/A"}</div>
      <div class="site-detail"><strong>Adresse :</strong> ${client.adresse || "N/A"}</div>
      <div class="site-detail"><strong>Email :</strong> ${client.email ? `<a href="mailto:${client.email}">${client.email}</a>` : "N/A"}</div>
      <div class="site-detail"><strong>Téléphone :</strong> ${client.telephone ? `<a href="tel:${client.telephone}">${client.telephone}</a>` : "N/A"}</div>
      ${client.date_creation ? `<div class="site-detail"><strong>Date de création :</strong> ${client.date_creation}</div>` : ''}
    `;
  } catch (err) {
    document.getElementById("clientDetails").textContent = err.message;
  }
}

// ─── SITES ────────────────────────────────────────────────────────────────────

async function loadSites() {
  try {
    const res = await fetch(`${API}/sites`);
    if (!res.ok) throw new Error("Erreur lors du chargement des sites");
    const allSitesData = await res.json();
    allSites = allSitesData.filter(site => site.id_client == id_client);

    const SitesDiv = document.getElementById("SitesList");
    SitesDiv.innerHTML = "";
    document.getElementById("statsSites").textContent = allSites.length;

    if (allSites.length === 0) { SitesDiv.innerHTML = "<p>Aucun site associé à ce client.</p>"; return; }

    const ul = document.createElement("ul");
    ul.style.cssText = "list-style:none; padding:0;";

    allSites.forEach(site => {
      const li = document.createElement("li");
      li.classList.add("site-detail");
      li.style.cssText = "cursor:pointer; padding:1rem; margin-bottom:0.5rem; background:var(--gray-50); border-radius:var(--radius-md); border:1px solid var(--gray-200); transition:var(--transition);";
      li.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="color:var(--primary-blue); font-size:1.1rem;">🏢 ${site.nom}</strong><br/>
            <span style="color:var(--gray-600);">${site.adresse || "Adresse non spécifiée"}</span>
          </div>
          <button onclick="window.location.href='../SiteDetails/siteDetails.html?id_site=${site.id_site}'" style="background:var(--primary-blue);">Voir détails</button>
        </div>
      `;
      li.addEventListener("mouseenter", () => { li.style.borderColor = "var(--primary-blue)"; li.style.transform = "translateX(4px)"; });
      li.addEventListener("mouseleave", () => { li.style.borderColor = "var(--gray-200)"; li.style.transform = "translateX(0)"; });
      ul.appendChild(li);
    });

    SitesDiv.appendChild(ul);
    await loadAllEquipements();
    await loadAllMaintenances();
  } catch (err) {
    document.getElementById("SitesList").textContent = err.message;
  }
}

// ─── ÉQUIPEMENTS ──────────────────────────────────────────────────────────────

function printQR(id) { window.open(`${API}/qrcodes/showqr/${id}`, "_blank"); }

async function loadAllEquipements() {
  try {
    allEquipements = [];
    for (const site of allSites) {
      const res = await fetch(`${API}/produits/ProduitsBySiteID/${site.id_site}`);
      if (res.ok) allEquipements = allEquipements.concat(await res.json());
    }

    const EquipDiv = document.getElementById("EquipementsList");
    EquipDiv.innerHTML = "";

    document.getElementById("statsEquipements").textContent = allEquipements.length;
    document.getElementById("statsOK").textContent = allEquipements.filter(p => p.etat === "OK").length;
    document.getElementById("statsNOK").textContent = allEquipements.filter(p => p.etat === "NOK").length;
    document.getElementById("statsPassable").textContent = allEquipements.filter(p => p.etat === "Passable").length;

    if (allEquipements.length === 0) { EquipDiv.innerHTML = "<p>Aucun équipement associé à ce client.</p>"; return; }

    const equipementsBySite = {};
    allEquipements.forEach(eq => {
      if (!equipementsBySite[eq.id_site]) equipementsBySite[eq.id_site] = [];
      equipementsBySite[eq.id_site].push(eq);
    });

    for (const site of allSites) {
      if (!equipementsBySite[site.id_site]?.length) continue;
      const siteSection = document.createElement("div");
      siteSection.style.marginBottom = "1.5rem";
      const siteTitle = document.createElement("h4");
      siteTitle.textContent = `🏢 ${site.nom}`;
      siteTitle.style.cssText = "color:var(--primary-blue); margin-bottom:0.75rem;";
      siteSection.appendChild(siteTitle);

      const ul = document.createElement("ul");
      ul.style.cssText = "list-style:none; padding:0;";

      equipementsBySite[site.id_site].forEach(p => {
        const li = document.createElement("li");
        li.setAttribute("id", "produitsList");
        const etat = (p.etat || "").toLowerCase();
        if (etat === "ok") li.classList.add("equipement-ok");
        else if (etat === "nok") li.classList.add("equipement-nok");
        else if (etat === "passable") li.classList.add("equipement-passable");
        else li.classList.add("equipement-autre");

        let etatColor = "#6C757D";
        if (etat === "ok") etatColor = "#28A745";
        else if (etat === "nok") etatColor = "#DC3545";
        else if (etat === "passable") etatColor = "#FFC107";

        li.innerHTML = `
          <div style="flex:1;">
            <strong>${p.nom}</strong>
            ${p.departement ? " - " + p.departement : ""}
            ${p.etat ? ` - <span style="color:${etatColor};font-weight:600;">${p.etat}</span>` : ""}
            <br/><small style="color:#6C757D;">${p.description || ""}</small>
          </div>
          <div>
            <button onclick="deleteProduit(${p.id_produit})">Supprimer</button>
            <button onclick="editProduit(${p.id_produit})">Modifier</button>
            <button onclick="printQR(${p.id_produit})">QR</button>
            <button onclick="window.location.href='../ProduitDetails/produitDetails.html?id_produit=${p.id_produit}'" style="background:var(--secondary-blue);">Détails</button>
          </div>
        `;
        ul.appendChild(li);
      });

      siteSection.appendChild(ul);
      EquipDiv.appendChild(siteSection);
    }
  } catch (err) {
    document.getElementById("EquipementsList").textContent = err.message;
  }
}

// ─── MAINTENANCES ─────────────────────────────────────────────────────────────

async function loadAllMaintenances() {
  try {
    allMaintenances = [];
    for (const site of allSites) {
      const res = await fetch(`${API}/maintenances/AllMaintenancesBySiteID/${site.id_site}`);
      if (res.ok) {
        const maintenances = await res.json();
        maintenances.forEach(m => m.site_nom = site.nom);
        allMaintenances = allMaintenances.concat(maintenances);
      }
    }

    const MaintDiv = document.getElementById("MaintenancesList");
    MaintDiv.innerHTML = "";

    document.getElementById("statsMaintenances").textContent = allMaintenances.length;
    document.getElementById("statsPlanifiees").textContent = allMaintenances.filter(m => (m.etat||"").toLowerCase().includes("planif")).length;
    document.getElementById("statsEnCours").textContent = allMaintenances.filter(m => (m.etat||"").toLowerCase().includes("cours")).length;
    document.getElementById("statsTerminees").textContent = allMaintenances.filter(m => (m.etat||"").toLowerCase().includes("termin")).length;

    if (allMaintenances.length === 0) { MaintDiv.innerHTML = "<p>Aucune maintenance associée à ce client.</p>"; return; }

    allMaintenances.sort((a, b) => new Date(b.date_maintenance) - new Date(a.date_maintenance));

    const maintenancesBySite = {};
    allMaintenances.forEach(m => {
      if (!maintenancesBySite[m.id_site]) maintenancesBySite[m.id_site] = [];
      maintenancesBySite[m.id_site].push(m);
    });

    for (const site of allSites) {
      if (!maintenancesBySite[site.id_site]?.length) continue;
      const siteSection = document.createElement("div");
      siteSection.style.marginBottom = "1.5rem";
      const siteTitle = document.createElement("h4");
      siteTitle.textContent = `🏢 ${site.nom}`;
      siteTitle.style.cssText = "color:var(--primary-blue); margin-bottom:0.75rem;";
      siteSection.appendChild(siteTitle);

      maintenancesBySite[site.id_site].forEach(m => {
        const details = document.createElement("details");
        details.classList.add("maintenance");
        const etat = (m.etat || "").toLowerCase();
        if (etat.includes("termin")) details.classList.add("maintenance-terminee");
        else if (etat.includes("cours")) details.classList.add("maintenance-en-cours");
        else if (etat.includes("planif")) details.classList.add("maintenance-planifiee");
        else details.classList.add("maintenance-autre");

        const summary = document.createElement("summary");
        let icone = "🔧";
        if (etat.includes("termin")) icone = "✅";
        else if (etat.includes("cours")) icone = "⚙️";
        else if (etat.includes("planif")) icone = "📅";
        summary.innerHTML = `${icone} ${m.types_intervention || m.type || "Maintenance"} - ${parseDate(m.date_maintenance)}`;
        details.appendChild(summary);

        let etatColor = "#6C757D";
        if (etat.includes("termin")) etatColor = "#28A745";
        else if (etat.includes("cours")) etatColor = "#FFC107";
        else if (etat.includes("planif")) etatColor = "#0066CC";

        let operateursList = [];
        if (m.operateurs) operateursList = m.operateurs.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
        else operateursList = [m.operateur_1, m.operateur_2, m.operateur_3].filter(Boolean);

        const content = document.createElement("div");
        content.innerHTML = `
          <div><strong>N° RI :</strong> ${m.numero_ri || "N/A"}</div>
          <div><strong>Date :</strong> ${parseDate(m.date_maintenance)}</div>
          <div><strong>Type :</strong> ${m.types_intervention || m.type || "N/A"}</div>
          <div><strong>État :</strong> <span style="color:${etatColor};font-weight:600;">${m.etat || "N/A"}</span></div>
          <div><strong>Département :</strong> ${m.departement || "N/A"}</div>
          ${operateursList.length ? `<div><strong>Personnes affectées :</strong> ${operateursList.join(' / ')}</div>` : ''}
          <div><strong>Commentaire :</strong> ${m.commentaire || "N/A"}</div>
          <div><strong>Garantie :</strong> ${m.garantie ? '✅ Oui' : '❌ Non'}</div>
          <div style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button onclick="deleteMaintenance(${m.id_maintenance})" style="background:#DC3545;">Supprimer</button>
            <button onclick="editMaintenance(${m.id_maintenance})" style="background:#6C757D;">Modifier</button>
            <a href="../MaintenanceDetails/MaintenanceDetails.html?id_maintenance=${m.id_maintenance}"
              style="display:inline-block;padding:0.625rem 1.25rem;background:#0066CC;color:white;border-radius:8px;text-decoration:none;">Voir détails</a>
            <div style="display:flex;overflow:hidden;border-radius:8px;">
              <a href="${API}/maintenances/${m.id_maintenance}/html" target="_blank"
                style="background:#198754;color:white;padding:0.6rem 1rem;text-decoration:none;border-right:1px solid rgba(255,255,255,0.3);">👁 Aperçu RI</a>
              <a href="${API}/maintenances/${m.id_maintenance}/pdf"
                style="background:#157347;color:white;padding:0.6rem 1rem;text-decoration:none;">⬇ PDF</a>
            </div>
          </div>
        `;
        details.appendChild(content);
        siteSection.appendChild(details);
      });

      MaintDiv.appendChild(siteSection);
    }
  } catch (err) {
    document.getElementById("MaintenancesList").textContent = err.message;
  }
}

// ─── MODIFIER MAINTENANCE ─────────────────────────────────────────────────────

async function editMaintenance(id_maintenance) {
  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`);
    if (!res.ok) { alert("Erreur lors du chargement de la maintenance"); return; }
    const m = await res.json();
    editingMaintenanceId = id_maintenance;

    // Identification
    document.getElementById("maintenanceChrono").value = m.numero_ri || '';
    document.getElementById("maintenanceDateDemande").value = formatDateForInput(m.date_demande);
    document.getElementById("maintenanceDesignation").value = m.designation_produit_site || '';
    document.getElementById("maintenanceDateAccordClient").value = formatDateForInput(m.date_accord_client);
    document.getElementById("maintenanceContact").value = m.contact || '';
    document.getElementById("maintenanceCategorie").value = m.categorie || '';
    document.getElementById("maintenanceDateMaintenance").value = formatDateForInput(m.date_maintenance);
    document.getElementById("maintenanceTypeProduit").value = m.type_produit || '';
    document.getElementById("maintenanceTypeIntervention").value = '';
    document.getElementById("maintenanceDepartement").value = m.departement || '';
    document.getElementById("maintenanceNumeroCommande").value = m.numero_commande || '';
    document.getElementById("maintenanceEtat").value = m.etat || '';
    document.getElementById("maintenanceCommentaire").value = m.commentaire || '';

    // Opérateurs
    let operateursList = [];
    if (m.operateurs) operateursList = m.operateurs.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    else operateursList = [m.operateur_1, m.operateur_2, m.operateur_3].filter(Boolean);
    document.getElementById("maintenanceOperateurs").value = operateursList.join('\n');

    // Horaires
    resetHorairesForm();
    let jours = [];
    if (m.jours_intervention) {
      try { jours = typeof m.jours_intervention === 'object' ? m.jours_intervention : JSON.parse(m.jours_intervention); }
      catch { jours = []; }
    }
    if (jours.length > 0) {
      jours.forEach(jour => {
        const d = new Date(jour.date_jour);
        const idx = JOURS_JS.indexOf(d.getDay());
        if (idx === -1) return;
        const j = JOURS[idx];
        const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val.substring(0,5); };
        set(`cli_${j}_matin_arr`, jour.heure_arrivee_matin);
        set(`cli_${j}_matin_dep`, jour.heure_depart_matin);
        set(`cli_${j}_apm_arr`, jour.heure_arrivee_aprem);
        set(`cli_${j}_apm_dep`, jour.heure_depart_aprem);
      });
    } else if (m.date_maintenance) {
      const d = new Date(m.date_maintenance);
      const idx = JOURS_JS.indexOf(d.getDay());
      if (idx !== -1) {
        const j = JOURS[idx];
        const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val.substring(0,5); };
        set(`cli_${j}_matin_arr`, m.heure_arrivee_matin);
        set(`cli_${j}_matin_dep`, m.heure_depart_matin);
        set(`cli_${j}_apm_arr`, m.heure_arrivee_aprem);
        set(`cli_${j}_apm_dep`, m.heure_depart_aprem);
      }
    }

    // Nature des travaux
    resetTravauxCheckboxes();
    const typesStr = m.types_intervention || m.type || '';
    const typeMap = {
      'Installation': 'cli_chk_installation',
      'Intervention Curative': 'cli_chk_curative',
      'Intervention curative': 'cli_chk_curative',
      'Révision': 'cli_chk_revision',
      'Contrat de maintenance': 'cli_chk_contrat',
      'Autres': 'cli_chk_autres_g',
    };
    typesStr.split(',').map(t => t.trim()).filter(Boolean).forEach(t => {
      const id = typeMap[t];
      if (id) {
        const el = document.getElementById(id);
        if (el) { el.checked = true; el.closest('.checkbox-item').classList.add('checked'); }
      }
    });

    // Garantie
    const garantieOui = m.garantie === 1 || m.garantie === true || m.garantie === 'Oui';
    document.getElementById("cliGarantieOui").checked = garantieOui;
    document.getElementById("cliGarantieNon").checked = !garantieOui;

    document.getElementById("addMaintenanceForm").style.display = "block";
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

async function updateMaintenanceSubmit(event) {
  event.preventDefault();
  if (!editingMaintenanceId) { alert("Erreur : ID de maintenance manquant"); return; }
  if (!confirm("Êtes-vous sûr de vouloir modifier cette maintenance ?")) return;

  const dateIntervention = document.getElementById("maintenanceDateMaintenance").value;
  const types = collectTypes();
  const jours = collectJours(dateIntervention);
  const operateursRaw = document.getElementById("maintenanceOperateurs").value;
  const operateursList = operateursRaw.split('\n').map(s => s.trim()).filter(Boolean);
  const garantie = document.querySelector('input[name="maintenanceGarantie"]:checked')?.value === 'Oui' ? 1 : 0;

  const data = {
    numero_ri: document.getElementById("maintenanceChrono").value || null,
    designation_produit_site: document.getElementById("maintenanceDesignation").value || null,
    categorie: document.getElementById("maintenanceCategorie").value || null,
    types,
    type: types.join(',') || document.getElementById("maintenanceTypeIntervention").value || null,
    types_intervention: types.join(',') || document.getElementById("maintenanceTypeIntervention").value || null,
    departement: document.getElementById("maintenanceDepartement").value || null,
    date_demande: document.getElementById("maintenanceDateDemande").value || null,
    date_accord_client: document.getElementById("maintenanceDateAccordClient").value || null,
    date_maintenance: dateIntervention || null,
    contact: document.getElementById("maintenanceContact").value || null,
    type_produit: document.getElementById("maintenanceTypeProduit").value || null,
    numero_commande: document.getElementById("maintenanceNumeroCommande").value || null,
    operateurs: operateursList,
    operateur_1: operateursList[0] || null,
    operateur_2: operateursList[1] || null,
    operateur_3: operateursList[2] || null,
    jours: jours.length > 0 ? jours : undefined,
    etat: document.getElementById("maintenanceEtat").value || null,
    commentaire: document.getElementById("maintenanceCommentaire").value || null,
    garantie
  };

  try {
    const res = await fetch(`${API}/maintenances/${editingMaintenanceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) { alert("Erreur lors de la modification de la maintenance"); return; }
    hideAddMaintenanceForm();
    loadAllMaintenances();
    alert("✓ Maintenance modifiée avec succès !");
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

function hideAddMaintenanceForm() {
  document.getElementById("addMaintenanceForm").style.display = "none";
  editingMaintenanceId = null;
  document.getElementById("maintenanceForm").reset();
  resetHorairesForm();
  resetTravauxCheckboxes();
}

// ─── SUPPRESSION ──────────────────────────────────────────────────────────────

async function deleteProduit(id_produit) {
  if (!confirm("Voulez-vous vraiment supprimer cet équipement ? (CETTE ACTION EST IRREVERSIBLE)")) return;
  try {
    const res = await fetch(`${API}/produits/${id_produit}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression de l'équipement"); return; }
    loadAllEquipements();
    alert("Équipement supprimé avec succès !");
  } catch (err) { console.error(err); alert("Erreur serveur lors de la suppression"); }
}

function editProduit(id_produit) {
  window.location.href = `../ProduitDetails/produitDetails.html?id_produit=${id_produit}`;
}

async function deleteMaintenance(id_maintenance) {
  if (!confirm("Voulez-vous vraiment supprimer cette maintenance ? (CETTE ACTION EST IRREVERSIBLE)")) return;
  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression de la maintenance"); return; }
    loadAllMaintenances();
    alert("✓ Maintenance supprimée avec succès !");
  } catch (err) { console.error(err); alert("Erreur serveur"); }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

loadClientDetails();
loadSites();