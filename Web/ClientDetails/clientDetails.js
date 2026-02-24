const API = "http://192.168.1.127:3000";

const params = new URLSearchParams(window.location.search);
const id_client = params.get("id_client");

let allSites = [];
let allEquipements = [];
let allMaintenances = [];

document.getElementById("backBtn").addEventListener("click", () => {
  window.history.back();
});

// ========== CHARGEMENT CLIENT ==========
async function loadClientDetails() {
  if (!id_client) {
    document.getElementById("clientDetails").textContent = "ID du client manquant.";
    return;
  }

  try {
    const res = await fetch(`${API}/clients/${id_client}`);
    if (!res.ok) throw new Error("Erreur lors du chargement du client");

    const client = await res.json();

    const ClientDiv = document.getElementById("clientDetails");
    ClientDiv.innerHTML = `
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

// ========== SITES ==========
async function loadSites() {
  try {
    // Récupérer tous les sites et filtrer ceux du client
    const res = await fetch(`${API}/sites`);
    if (!res.ok) throw new Error("Erreur lors du chargement des sites");

    const allSitesData = await res.json();
    allSites = allSitesData.filter(site => site.id_client == id_client);

    const SitesDiv = document.getElementById("SitesList");
    SitesDiv.innerHTML = "";

    // Mettre à jour les stats
    document.getElementById("statsSites").textContent = allSites.length;

    if (allSites.length === 0) {
      SitesDiv.innerHTML = "<p>Aucun site associé à ce client.</p>";
      return;
    }

    // Créer une liste de sites
    const ul = document.createElement("ul");
    ul.style.listStyle = "none";
    ul.style.padding = "0";

    allSites.forEach(site => {
      const li = document.createElement("li");
      li.classList.add("site-detail");
      li.style.cursor = "pointer";
      li.style.padding = "1rem";
      li.style.marginBottom = "0.5rem";
      li.style.background = "var(--gray-50)";
      li.style.borderRadius = "var(--radius-md)";
      li.style.border = "1px solid var(--gray-200)";
      li.style.transition = "var(--transition)";

      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: var(--primary-blue); font-size: 1.1rem;">🏢 ${site.nom}</strong><br/>
            <span style="color: var(--gray-600);">${site.adresse || "Adresse non spécifiée"}</span>
          </div>
          <button onclick="window.location.href='../SiteDetails/siteDetails.html?id_site=${site.id_site}'" style="background: var(--primary-blue);">
            Voir détails
          </button>
        </div>
      `;

      li.addEventListener("mouseenter", () => {
        li.style.borderColor = "var(--primary-blue)";
        li.style.transform = "translateX(4px)";
      });

      li.addEventListener("mouseleave", () => {
        li.style.borderColor = "var(--gray-200)";
        li.style.transform = "translateX(0)";
      });

      ul.appendChild(li);
    });

    SitesDiv.appendChild(ul);

    // Charger les équipements et maintenances pour chaque site
    await loadAllEquipements();
    await loadAllMaintenances();

  } catch (err) {
    document.getElementById("SitesList").textContent = err.message;
  }
}

// ========== ÉQUIPEMENTS ==========

// Fonction affichage du qr code
function printQR(id) {
  window.open(`${API}/qrcodes/showqr/${id}`, "_blank");
}

async function loadAllEquipements() {
  try {
    allEquipements = [];

    // Pour chaque site, récupérer les équipements
    for (const site of allSites) {
      const res = await fetch(`${API}/produits/ProduitsBySiteID/${site.id_site}`);
      if (res.ok) {
        const produits = await res.json();
        allEquipements = allEquipements.concat(produits);
      }
    }

    const EquipDiv = document.getElementById("EquipementsList");
    EquipDiv.innerHTML = "";

    // Calcul des stats
    const statsOK = allEquipements.filter(p => p.etat === "OK").length;
    const statsNOK = allEquipements.filter(p => p.etat === "NOK").length;
    const statsPassable = allEquipements.filter(p => p.etat === "Passable").length;

    document.getElementById("statsEquipements").textContent = allEquipements.length;
    document.getElementById("statsOK").textContent = statsOK;
    document.getElementById("statsNOK").textContent = statsNOK;
    document.getElementById("statsPassable").textContent = statsPassable;

    if (allEquipements.length === 0) {
      EquipDiv.innerHTML = "<p>Aucun équipement associé à ce client.</p>";
      return;
    }

    // Grouper par site
    const equipementsBySite = {};
    allEquipements.forEach(eq => {
      if (!equipementsBySite[eq.id_site]) {
        equipementsBySite[eq.id_site] = [];
      }
      equipementsBySite[eq.id_site].push(eq);
    });

    // Afficher par site
    for (const site of allSites) {
      if (!equipementsBySite[site.id_site] || equipementsBySite[site.id_site].length === 0) continue;

      const siteSection = document.createElement("div");
      siteSection.style.marginBottom = "1.5rem";

      const siteTitle = document.createElement("h4");
      siteTitle.textContent = `🏢 ${site.nom}`;
      siteTitle.style.color = "var(--primary-blue)";
      siteTitle.style.marginBottom = "0.75rem";
      siteSection.appendChild(siteTitle);

      const ul = document.createElement("ul");
      ul.style.listStyle = "none";
      ul.style.padding = "0";

      allEquipements.forEach(p => {
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
  <div style="flex: 1;"> 
    <strong>${p.nom}</strong>
    ${p.departement ? " - " + p.departement : ""}
    ${p.etat ? ` - <span style="color: ${etatColor}; font-weight: 600;">${p.etat}</span>` : ""}
    <br/>
    <small style="color: #6C757D;">${p.description || ""}</small>
  </div>

  <div>
    <button onclick="deleteProduit(${p.id_produit})">Supprimer</button>
    <button onclick="editProduit(${p.id_produit})">Modifier</button>
    <button onclick="printQR(${p.id_produit})">QR</button>
    <button onclick="window.location.href='../ProduitDetails/produitDetails.html?id_produit=${p.id_produit}'" style="background: var(--secondary-blue);">
      Détails
    </button>
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

// ========== MAINTENANCES ==========
async function loadAllMaintenances() {
  try {
    allMaintenances = [];

    // Pour chaque site, récupérer les maintenances
    for (const site of allSites) {
      const res = await fetch(`${API}/maintenances/AllMaintenancesBySiteID/${site.id_site}`);
      if (res.ok) {
        const maintenances = await res.json();
        // Ajouter le nom du site à chaque maintenance
        maintenances.forEach(m => m.site_nom = site.nom);
        allMaintenances = allMaintenances.concat(maintenances);
      }
    }

    const MaintDiv = document.getElementById("MaintenancesList");
    MaintDiv.innerHTML = "";

    // Calcul des stats
    const statsPlanifiees = allMaintenances.filter(m => {
      const etat = (m.etat || "").toLowerCase();
      return etat.includes("planif");
    }).length;

    const statsEnCours = allMaintenances.filter(m => {
      const etat = (m.etat || "").toLowerCase();
      return etat.includes("cours");
    }).length;

    const statsTerminees = allMaintenances.filter(m => {
      const etat = (m.etat || "").toLowerCase();
      return etat.includes("termin");
    }).length;

    document.getElementById("statsMaintenances").textContent = allMaintenances.length;
    document.getElementById("statsPlanifiees").textContent = statsPlanifiees;
    document.getElementById("statsEnCours").textContent = statsEnCours;
    document.getElementById("statsTerminees").textContent = statsTerminees;

    if (allMaintenances.length === 0) {
      MaintDiv.innerHTML = "<p>Aucune maintenance associée à ce client.</p>";
      return;
    }

    // Trier par date décroissante
    allMaintenances.sort((a, b) => {
      // Convertir les dates JJ/MM/AAAA en objets Date pour comparaison
      const dateA = parseDate(a.date_maintenance);
      const dateB = parseDate(b.date_maintenance);
      return dateB - dateA;
    });

    // Grouper par site
    const maintenancesBySite = {};
    allMaintenances.forEach(m => {
      if (!maintenancesBySite[m.id_site]) {
        maintenancesBySite[m.id_site] = [];
      }
      maintenancesBySite[m.id_site].push(m);
    });

    // Afficher par site
    for (const site of allSites) {
      if (!maintenancesBySite[site.id_site] || maintenancesBySite[site.id_site].length === 0) continue;

      const siteSection = document.createElement("div");
      siteSection.style.marginBottom = "1.5rem";

      const siteTitle = document.createElement("h4");
      siteTitle.textContent = `🏢 ${site.nom}`;
      siteTitle.style.color = "var(--primary-blue)";
      siteTitle.style.marginBottom = "0.75rem";
      siteSection.appendChild(siteTitle);

      maintenancesBySite[site.id_site].forEach(m => {
        const details = document.createElement("details");
        details.classList.add("maintenance");

        const etat = (m.etat || "").toLowerCase();

        // Classes CSS pour l'état
        if (etat.includes("termin")) {
          details.classList.add("maintenance-terminee");
        } else if (etat.includes("cours")) {
          details.classList.add("maintenance-en-cours");
        } else if (etat.includes("planif")) {
          details.classList.add("maintenance-planifiee");
        } else {
          details.classList.add("maintenance-autre");
        }

        const summary = document.createElement("summary");

        // Icône selon l'état
        let icone = "🔧";
        if (etat.includes("termin")) icone = "✅";
        else if (etat.includes("cours")) icone = "⚙️";
        else if (etat.includes("planif")) icone = "📅";

        const dateFormatted = parseDate(m.date_maintenance);

        summary.innerHTML = `${icone} ${m.type || "Maintenance"} - ${dateFormatted}`;
        details.appendChild(summary);

        // Couleur de l'état
        let etatColor = "#6C757D";
        if (etat.includes("termin")) etatColor = "#28A745";
        else if (etat.includes("cours")) etatColor = "#FFC107";
        else if (etat.includes("planif")) etatColor = "#0066CC";

        const content = document.createElement("div");
        content.innerHTML = content.innerHTML = `
        <div><strong>N° RI :</strong> ${m.numero_ri || "N/A"}</div>
        ${m.operateur_1 ? `<div><strong>Opérateur 1 :</strong> ${m.operateur_1}</div>` : ''}
        ${m.operateur_2 ? `<div><strong>Opérateur 2 :</strong> ${m.operateur_2}</div>` : ''}
        ${m.operateur_3 ? `<div><strong>Opérateur 3 :</strong> ${m.operateur_3}</div>` : ''}
        <div><strong>Date :</strong> ${dateFormatted}</div>
        <div><strong>Type :</strong> ${m.type}</div>
        <div><strong>État :</strong> <span style="color: ${etatColor}; font-weight: 600;">${m.etat || "N/A"}</span></div>
        <div><strong>Département :</strong> ${m.departement || "N/A"}</div>
        <div><strong>Commentaire :</strong> ${m.commentaire || "N/A"}</div>
        ${m.garantie ? `<div><strong>Garantie: </strong> ✅</div>` : '<div><strong>Garantie: </strong> ❌</div>'}
        <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button onclick="deleteMaintenance(${m.id_maintenance})" style="background: #DC3545;">Supprimer</button>
          <button onclick="editMaintenance(${m.id_maintenance})" style="background: #6C757D;">Modifier</button>
          <a href="../MaintenanceDetails/MaintenanceDetails.html?id_maintenance=${m.id_maintenance}" style="display: inline-block; padding: 0.625rem 1.25rem; background: #0066CC; color: white; border-radius: 8px; text-decoration: none;">Voir détails</a>
          <div style="display:flex; overflow:hidden; border-radius:8px;">
            <a href="${API}/maintenances/${m.id_maintenance}/html" target="_blank"
              style="background:#198754; color:white; padding:0.6rem 1rem; text-decoration:none; border-right:1px solid rgba(255,255,255,0.3);">
              👁 Aperçu RI
            </a>

            <a href="${API}/maintenances/${m.id_maintenance}/pdf"
              style="background:#157347; color:white; padding:0.6rem 1rem; text-decoration:none;">
              ⬇ PDF
            </a>
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

// Fonction utilitaire pour parser les dates au format JJ/MM/AAAA
function parseDate(dateStr) {
  if (!dateStr) return new Date(0);

  const date = new Date(dateStr);

  if (isNaN(date)) return new Date(0);

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

// ========== MODIFICATION MAINTENANCE ==========

let editingMaintenanceId = null;

// ========== GESTION DES ÉQUIPEMENTS ==========

// Fonction de suppression d'un équipement
async function deleteProduit(id_produit) {
  const confirmDelete = confirm("Voulez-vous vraiment supprimer cet équipement ? (CETTE ACTION EST IRREVERSIBLE)");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API}/produits/${id_produit}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      alert("Erreur lors de la suppression de l'équipement");
      return;
    }

    // Recharger les équipements
    loadAllEquipements();
    alert("Équipement supprimé avec succès !");
  } catch (err) {
    console.error(err);
    alert("Erreur serveur lors de la suppression");
  }
}

// Fonction pour modifier un équipement (redirection vers la page de détails)
function editProduit(id_produit) {
  window.location.href = `../ProduitDetails/produitDetails.html?id_produit=${id_produit}`;
}

// Fonction pour afficher le formulaire de modification
async function editMaintenance(id_maintenance) {
  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`);
    if (!res.ok) {
      alert("Erreur lors du chargement de la maintenance");
      return;
    }
    
    const maintenance = await res.json();
    editingMaintenanceId = id_maintenance;
    
    // Pré-remplir le formulaire
    document.getElementById("maintenanceNumeroRi").value = maintenance.numero_ri || "";
    document.getElementById("maintenanceOperateur1").value = maintenance.operateur_1 || "";
    document.getElementById("maintenanceOperateur2").value = maintenance.operateur_2 || "";
    document.getElementById("maintenanceOperateur3").value = maintenance.operateur_3 || "";
    document.getElementById("maintenanceDateMaintenance").value = maintenance.date_maintenance || "";
    document.getElementById("maintenanceType").value = maintenance.type || "";
    document.getElementById("maintenanceEtat").value = maintenance.etat || "";
    document.getElementById("maintenanceDepartement").value = maintenance.departement || "";
    document.getElementById("maintenanceCommentaire").value = maintenance.commentaire || "";
    document.getElementById("maintenanceGarantie").checked = maintenance.garantie || false;
    document.getElementById("maintenanceNumeroCommande").value = maintenance.numero_commande || "";
    document.getElementById("maintenanceContact").value = maintenance.contact || "";
    document.getElementById("maintenanceTypeProduit").value = maintenance.type_produit || "";
    document.getElementById("maintenanceHeureArriveeMatin").value = maintenance.heure_arrivee_matin || "";
    document.getElementById("maintenanceHeureDepartMatin").value = maintenance.heure_depart_matin || "";
    document.getElementById("maintenanceHeureArriveeAprem").value = maintenance.heure_arrivee_aprem || "";
    document.getElementById("maintenanceHeureDepartAprem").value = maintenance.heure_depart_aprem || "";
    
    // Afficher le formulaire
    document.getElementById("addMaintenanceForm").style.display = "block";
    
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

// Fonction pour mettre à jour une maintenance
async function updateMaintenanceSubmit(event) {
  event.preventDefault();
  
  if (!editingMaintenanceId) {
    alert("Erreur : ID de maintenance manquant");
    return;
  }

  const data = {
    numero_ri: document.getElementById("maintenanceNumeroRi").value || null,
    operateur_1: document.getElementById("maintenanceOperateur1").value || null,
    operateur_2: document.getElementById("maintenanceOperateur2").value || null,
    operateur_3: document.getElementById("maintenanceOperateur3").value || null,
    date_maintenance: document.getElementById("maintenanceDateMaintenance").value,
    type: document.getElementById("maintenanceType").value,
    etat: document.getElementById("maintenanceEtat").value || null,
    departement: document.getElementById("maintenanceDepartement").value || null,
    commentaire: document.getElementById("maintenanceCommentaire").value || null,
    garantie: document.getElementById("maintenanceGarantie").checked ? 1 : 0,
    numero_commande: document.getElementById("maintenanceNumeroCommande").value || null,
    contact: document.getElementById("maintenanceContact").value || null,
    type_produit: document.getElementById("maintenanceTypeProduit").value || null,
    heure_arrivee_matin: document.getElementById("maintenanceHeureArriveeMatin").value || null,
    heure_depart_matin: document.getElementById("maintenanceHeureDepartMatin").value || null,
    heure_arrivee_aprem: document.getElementById("maintenanceHeureArriveeAprem").value || null,
    heure_depart_aprem: document.getElementById("maintenanceHeureDepartAprem").value || null
  };

  const confirmUpdate = confirm("Êtes-vous sûr de vouloir modifier cette maintenance ?");
  if (!confirmUpdate) return;

  try {
    const res = await fetch(`${API}/maintenances/${editingMaintenanceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      alert("Erreur lors de la modification de la maintenance");
      return;
    }

    hideAddMaintenanceForm();
    loadAllMaintenances();
    alert("Maintenance modifiée avec succès !");
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

// Fonction pour cacher le formulaire
function hideAddMaintenanceForm() {
  document.getElementById("addMaintenanceForm").style.display = "none";
  editingMaintenanceId = null;
  document.getElementById("maintenanceForm").reset();
}

// Fonction de suppression
async function deleteMaintenance(id_maintenance) {
  const confirmDelete = confirm("Voulez-vous vraiment supprimer cette maintenance ? (CETTE ACTION EST IRREVERSIBLE)");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API}/maintenances/${id_maintenance}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      alert("Erreur lors de la suppression de la maintenance");
      return;
    }

    loadAllMaintenances();
    alert("Maintenance supprimée avec succès !");
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

// ========== INIT ==========
loadClientDetails();
loadSites();