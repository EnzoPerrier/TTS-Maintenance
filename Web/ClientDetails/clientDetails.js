const API = "http://192.168.1.127:3000";

const params = new URLSearchParams(window.location.search);
const id_client = params.get("id_client");

let allSites = [];
let allEquipements = [];
let allMaintenances = [];

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
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}`;
}

function printQR(id) { window.open(`${API}/qrcodes/showqr/${id}`, "_blank"); }

// ─── CALLBACKS PARTIAL maintenanceForm.js ────────────────────────────────────

window.onMaintenanceUpdated = async () => {
  await loadAllMaintenances();
};

function editMaintenanceById(id) {
  const m = allMaintenances.find(x => x.id_maintenance == id);
  if (!m) { alert("Maintenance introuvable"); return; }
  showEditMaintenanceForm(m);
}

async function deleteMaintenance(id_maintenance) {
  if (!confirm("Voulez-vous vraiment supprimer cette maintenance ? (CETTE ACTION EST IRREVERSIBLE)")) return;
  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression de la maintenance"); return; }
    await loadAllMaintenances();
    alert("✓ Maintenance supprimée avec succès !");
  } catch (err) { console.error(err); alert("Erreur serveur"); }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

loadMaintenanceForm("maintenance-form-container");
loadClientDetails();
loadSites();

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
    document.getElementById("statsOK").textContent       = allEquipements.filter(p => p.etat === "OK").length;
    document.getElementById("statsNOK").textContent      = allEquipements.filter(p => p.etat === "NOK").length;
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
        const etat = (p.etat || "").toLowerCase();
        if (etat === "ok")            li.classList.add("equipement-ok");
        else if (etat === "nok")      li.classList.add("equipement-nok");
        else if (etat === "passable") li.classList.add("equipement-passable");
        else                          li.classList.add("equipement-autre");

        let etatColor = "#6C757D";
        if (etat === "ok")            etatColor = "#28A745";
        else if (etat === "nok")      etatColor = "#DC3545";
        else if (etat === "passable") etatColor = "#FFC107";

        li.innerHTML = `
          <div style="flex:1;">
            <strong>${p.nom}</strong>
            ${p.departement ? " - " + p.departement : ""}
            ${p.etat ? ` - <span style="color:${etatColor};font-weight:600;">${p.etat}</span>` : ""}
            <br/><small style="color:#6C757D;">${p.description || ""}</small>
          </div>
          <div>
            <button class="btn-danger" onclick="deleteProduit(${p.id_produit})">Supprimer</button>
            <button class="btn-edit" onclick="editProduit(${p.id_produit})">Modifier</button>
            <button class="btn-qr" onclick="printQR(${p.id_produit})">QR</button>
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
    document.getElementById("statsPlanifiees").textContent   = allMaintenances.filter(m => (m.etat||"").toLowerCase().includes("planif")).length;
    document.getElementById("statsEnCours").textContent      = allMaintenances.filter(m => (m.etat||"").toLowerCase().includes("cours")).length;
    document.getElementById("statsTerminees").textContent    = allMaintenances.filter(m => (m.etat||"").toLowerCase().includes("termin")).length;

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
        if (etat.includes("termin"))      details.classList.add("maintenance-terminee");
        else if (etat.includes("cours"))  details.classList.add("maintenance-en-cours");
        else if (etat.includes("planif")) details.classList.add("maintenance-planifiee");
        else                              details.classList.add("maintenance-autre");

        const summary = document.createElement("summary");
        let icone = "🔧";
        if (etat.includes("termin"))      icone = "✅";
        else if (etat.includes("cours"))  icone = "⚙️";
        else if (etat.includes("planif")) icone = "📅";
        summary.innerHTML = `${icone} ${m.types_intervention || m.type || "Maintenance"} - ${parseDate(m.date_maintenance)}`;
        details.appendChild(summary);

        let etatColor = "#6C757D";
        if (etat.includes("termin"))      etatColor = "#28A745";
        else if (etat.includes("cours"))  etatColor = "#FFC107";
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
            <button class="btn-danger" onclick="deleteMaintenance(${m.id_maintenance})">Supprimer</button>
            <button class="btn-edit" onclick="editMaintenanceById(${m.id_maintenance})">Modifier</button>
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

// ─── SUPPRESSION / ÉDITION PRODUITS ──────────────────────────────────────────

async function deleteProduit(id_produit) {
  if (!confirm("Voulez-vous vraiment supprimer cet équipement ? (CETTE ACTION EST IRREVERSIBLE)")) return;
  try {
    const res = await fetch(`${API}/produits/${id_produit}`, { method: "DELETE" });
    if (!res.ok) { alert("Erreur lors de la suppression de l'équipement"); return; }
    loadAllEquipements();
    alert("✓ Équipement supprimé avec succès !");
  } catch (err) { console.error(err); alert("Erreur serveur"); }
}

function editProduit(id_produit) {
  window.location.href = `../ProduitDetails/produitDetails.html?id_produit=${id_produit}`;
}