let editingProduitId = null;
let editingClientId = null;
let allSitesMap = null;
let allClients = [];

const API = "http://192.168.1.127:3000"; // adresse du serveur API --> PORT 3000

function showSection(id) {
  document.querySelectorAll("section").forEach(s =>
    s.classList.remove("active")
  );
  document.getElementById(id).classList.add("active");
  
  // Si on affiche la section carte, initialiser/rafraîchir la carte
  if (id === 'carte') {
    setTimeout(() => {
      if (allSitesMap) {
        allSitesMap.invalidateSize();
      } else {
        initAllSitesMap();
      }
    }, 100);
  }
  
  // Si on affiche la section clients, charger les clients
  if (id === 'clients') {
    loadClients();
  }
}

/* ---------- CARTE DE TOUS LES SITES ---------- */
async function initAllSitesMap() {
  console.log("Initialisation de la carte...");
  
  try {
    const res = await fetch(`${API}/sites`);
    const sites = await res.json();
    
    console.log("Sites chargés:", sites);
    
    // Filtrer les sites qui ont des coordonnées GPS
    const sitesWithCoords = sites.filter(s => s.gps_lat && s.gps_lng);
    
    console.log("Sites avec coordonnées:", sitesWithCoords);
    
    if (sitesWithCoords.length === 0) {
      document.getElementById("allSitesMapContainer").innerHTML = 
        '<div style="padding: 2rem; text-align: center; color: #6C757D;">📍 Aucun site avec coordonnées GPS disponibles</div>';
      return;
    }
    
    // Supprimer la carte existante si elle existe
    if (allSitesMap) {
      allSitesMap.remove();
      allSitesMap = null;
    }
    
    // Vérifier que le conteneur existe
    const mapContainer = document.getElementById('allSitesMap');
    if (!mapContainer) {
      console.error("Conteneur de carte introuvable");
      return;
    }
    
    // Calculer le centre de la carte (moyenne des coordonnées)
    const avgLat = sitesWithCoords.reduce((sum, s) => sum + parseFloat(s.gps_lat), 0) / sitesWithCoords.length;
    const avgLng = sitesWithCoords.reduce((sum, s) => sum + parseFloat(s.gps_lng), 0) / sitesWithCoords.length;
    
    // Créer la carte
    allSitesMap = L.map('allSitesMap').setView([avgLat, avgLng], 10);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(allSitesMap);
    
    console.log("Couche de tuiles ajoutée");
    
    // Ajouter un marqueur pour chaque site
    sitesWithCoords.forEach(site => {
      const lat = parseFloat(site.gps_lat);
      const lng = parseFloat(site.gps_lng);
      
      // Icône personnalisée
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background: linear-gradient(135deg, #0066CC 0%, #004A99 100%);
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        ">
          <span style="
            transform: rotate(45deg);
            font-size: 18px;
            color: white;
          ">📍</span>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      });
      
      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(allSitesMap);
      
      // Popup avec lien vers les détails
      marker.bindPopup(`
        <div style="font-family: 'Segoe UI', sans-serif; min-width: 200px;">
          <strong style="color: #0066CC; font-size: 1.1em;">${site.nom}</strong><br/>
          <span style="color: #6C757D;">${site.adresse || 'Adresse non spécifiée'}</span><br/>
          <small style="color: #999;">📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}</small><br/>
          <button onclick="goToSiteDetails(${site.id_site})" style="
            margin-top: 0.75rem;
            background: #0066CC;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            width: 100%;
          ">Voir les détails</button>
        </div>
      `);
    });
    
    // Ajuster la vue pour montrer tous les marqueurs
    if (sitesWithCoords.length > 1) {
      const bounds = L.latLngBounds(sitesWithCoords.map(s => [parseFloat(s.gps_lat), parseFloat(s.gps_lng)]));
      allSitesMap.fitBounds(bounds, { padding: [50, 50] });
    }
    
  } catch (err) {
    console.error(err);
    document.getElementById("allSitesMapContainer").innerHTML = 
      '<div style="padding: 2rem; text-align: center; color: #DC3545;">Erreur lors du chargement de la carte</div>';
  }
}

function goToSiteDetails(id_site) {
  window.location.href = `./SiteDetails/siteDetails.html?id_site=${id_site}`;
}

/* ---------- CLIENTS ---------- */
let allClientsData = []; // stocke tous les clients pour filtrage

// Charger la liste des clients
async function loadClients() {
  try {
    const res = await fetch(`${API}/clients`);
    allClientsData = await res.json();
    renderClients(allClientsData);
    
    // Charger aussi pour le select dans le formulaire de sites
    loadClientsSelect();
  } catch (err) {
    console.error(err);
    document.getElementById("clientsList").innerHTML = 
      '<li style="color: #DC3545;">Erreur lors du chargement des clients</li>';
  }
}

// Fonction pour afficher les clients dans la liste
function renderClients(clients) {
  const list = document.getElementById("clientsList");
  list.innerHTML = "";

  if (clients.length === 0) {
    list.innerHTML = "<li>Aucun client trouvé</li>";
    return;
  }

  clients.forEach(client => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div style="flex: 1; cursor: pointer;" onclick="viewClientDetails(${client.id_client})">
        <strong>${client.nom}</strong><br/>
        <small style="color: #6C757D;">
          ${client.contact ? client.contact + ' - ' : ''}
          ${client.telephone ? '📞 ' + client.telephone : ''}
          ${client.email ? ' - 📧 ' + client.email : ''}
        </small>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button onclick="deleteClient(${client.id_client}); event.stopPropagation();" style="background: #DC3545;">Supprimer</button>
        <button onclick="editClient(${client.id_client}); event.stopPropagation();" style="background: #6C757D;">Modifier</button>
        <button onclick="window.location.href='./ClientDetails/clientDetails.html?id_client=${client.id_client}'; event.stopPropagation();" style="background: var(--secondary-blue);">Détails</button>
      </div>
    `;
    
    li.classList.add("clickable-line");
    list.appendChild(li);
  });
}

// Barre de recherche pour filtrer les clients
const searchClientsInput = document.getElementById("searchClients");
searchClientsInput.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filtered = allClientsData.filter(client =>
    client.nom.toLowerCase().includes(searchTerm) ||
    (client.contact && client.contact.toLowerCase().includes(searchTerm)) ||
    (client.email && client.email.toLowerCase().includes(searchTerm)) ||
    (client.telephone && client.telephone.toLowerCase().includes(searchTerm))
  );
  renderClients(filtered);
});

// Voir les détails d'un client (optionnel - pour l'instant juste un log)
function viewClientDetails(id_client) {
  console.log("Voir client:", id_client);
  // TODO: Créer une page clientDetails.html si nécessaire
}

// Afficher le formulaire d'ajout de client
function showAddClientForm() {
  editingClientId = null;
  document.getElementById("clientFormTitle").textContent = "Ajouter un client";
  document.getElementById("clientSubmitBtn").textContent = "Ajouter";
  document.querySelector("#addClientForm form").reset();
  document.getElementById("addClientForm").style.display = "block";
}

// Masquer le formulaire d'ajout de client
function hideAddClientForm() {
  document.getElementById("addClientForm").style.display = "none";
  editingClientId = null;
  document.querySelector("#addClientForm form").reset();
}

// Ajouter ou modifier un client
async function addClient(event) {
  event.preventDefault();

  const data = {
    nom: document.getElementById("clientNom").value,
    contact: document.getElementById("clientContact").value,
    adresse: document.getElementById("clientAdresse").value || null,
    email: document.getElementById("clientEmail").value || null,
    telephone: document.getElementById("clientTelephone").value || null
  };

  // Si on est en mode édition
  if (editingClientId !== null) {
    await updateClient(editingClientId, data);
    return;
  }

  // Création du client
  try {
    const res = await fetch(`${API}/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      alert("Erreur lors de l'ajout du client");
      return;
    }

    hideAddClientForm();
    loadClients();
    alert("Client ajouté avec succès !");
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

// Modifier un client
function editClient(id_client) {
  const client = allClientsData.find(c => c.id_client === id_client);
  if (!client) return alert("Client non trouvé");

  editingClientId = id_client;

  // Pré-remplir le formulaire
  document.getElementById("clientNom").value = client.nom;
  document.getElementById("clientContact").value = client.contact || "";
  document.getElementById("clientAdresse").value = client.adresse || "";
  document.getElementById("clientEmail").value = client.email || "";
  document.getElementById("clientTelephone").value = client.telephone || "";

  document.getElementById("clientFormTitle").textContent = "Modifier un client";
  document.getElementById("clientSubmitBtn").textContent = "Valider";

  document.getElementById("addClientForm").style.display = "block";
}

// Mettre à jour un client
async function updateClient(id_client, data) {
  const confirmUpdate = confirm("Êtes-vous sûr de vouloir modifier ce client ?");
  if (!confirmUpdate) return;

  try {
    const res = await fetch(`${API}/clients/${id_client}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      alert("Erreur lors de la modification du client");
      return;
    }

    hideAddClientForm();
    loadClients();
    alert("Client modifié avec succès !");
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

// Supprimer un client
async function deleteClient(id_client) {
  try {
    // Vérifier d'abord si le client a des sites
    const resSites = await fetch(`${API}/sites`);
    const allSites = await resSites.json();
    const clientSites = allSites.filter(site => site.id_client == id_client);

    if (clientSites.length > 0) {
      alert(`❌ Impossible de supprimer ce client.\n\nIl a ${clientSites.length} site(s) associé(s):\n${clientSites.map(s => '- ' + s.nom).join('\n')}\n\nVeuillez d'abord supprimer ces sites.`);
      return;
    }

    const confirmDelete = confirm("Voulez-vous vraiment supprimer ce client ? (CETTE ACTION EST IRREVERSIBLE)");
    if (!confirmDelete) return;

    const res = await fetch(`${API}/clients/${id_client}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      alert("Erreur lors de la suppression du client");
      return;
    }

    loadClients();
    alert("Client supprimé avec succès !");
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

/* ---------- SITES ---------- */
let allSites = []; // stocke tous les sites pour filtrage
let editingSiteId = null;

// Charger la liste des clients pour le select
async function loadClientsSelect() {
  try {
    const res = await fetch(`${API}/clients`);
    allClients = await res.json();
    
    const select = document.getElementById("siteClientId");
    select.innerHTML = '<option value="">-- Sélectionner un client --</option>';
    
    allClients.forEach(client => {
      const option = document.createElement("option");
      option.value = client.id_client;
      option.textContent = client.nom;
      select.appendChild(option);
    });
  } catch (err) {
    console.error(err);
  }
}

// Charger la liste des sites
async function loadSites() {
  const res = await fetch(`${API}/sites`);
  allSites = await res.json();
  renderSites(allSites);
}

// Fonction pour afficher les sites dans la liste
function renderSites(sites) {
  const list = document.getElementById("sitesList");
  list.innerHTML = "";

  if (sites.length === 0) {
    list.innerHTML = "<li>Aucun site trouvé</li>";
    return;
  }

  sites.forEach(site => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div style="flex: 1;">
        <strong>${site.nom}</strong><br/>
        <small style="color: #6C757D;">${site.adresse || "Adresse non spécifiée"}</small>
      </div>
      <div style="display: flex; gap: 0.5rem;">
      <button onclick="deleteSite(${site.id_site})" style="background: #DC3545;">Supprimer</button>
        <button onclick="editSite(${site.id_site})" style="background: #6C757D;">Modifier</button>
        <button onclick="window.location.href='./SiteDetails/siteDetails.html?id_site=${site.id_site}'" style="background: var(--secondary-blue);">Détails</button>
      </div>
    `;

    list.appendChild(li);
  });
}

// Barre de recherche pour filtrer les sites
const searchInput = document.getElementById("searchSites")
searchInput.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filtered = allSites.filter(site =>
    site.nom.toLowerCase().includes(searchTerm) ||
    (site.adresse && site.adresse.toLowerCase().includes(searchTerm))
  );
  renderSites(filtered);
});

// Ajouter la barre de recherche au-dessus de la liste
const sitesSection = document.getElementById("sites");
sitesSection.insertBefore(searchInput, document.getElementById("sitesList"));

async function addSite(event) {
  event.preventDefault();

  const data = {
    id_client: document.getElementById("siteClientId").value,
    nom: document.getElementById("siteNom").value,
    adresse: document.getElementById("siteAdresse").value,
    gps_lat: document.getElementById("siteLat").value || null,
    gps_lng: document.getElementById("siteLng").value || null
  };

  // Si on est en mode édition
  if (editingSiteId !== null) {
    await updateSite(editingSiteId, data);
    return;
  }

  const res = await fetch(`${API}/sites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (res.ok) {
    hideAddSiteForm();
    loadSites(); // recharge la liste des sites
    // Rafraîchir la carte si elle est affichée
    if (document.getElementById("carte").classList.contains("active")) {
      initAllSitesMap();
    }
    alert("Site ajouté avec succès !");
  } else {
    alert("Erreur lors de l'ajout du site");
  }
}

function showAddSiteForm() {
  editingSiteId = null;
  loadClientsSelect(); // Charger les clients dans le select
  document.getElementById("siteFormTitle").textContent = "Ajouter un site";
  document.getElementById("siteSubmitBtn").textContent = "Ajouter";
  document.querySelector("#addSiteForm form").reset();
  document.getElementById("addSiteForm").style.display = "block";
}

function hideAddSiteForm() {
  document.getElementById("addSiteForm").style.display = "none";
  editingSiteId = null;
  document.querySelector("#addSiteForm form").reset();
}

// Modifier un site
function editSite(id_site) {
  const site = allSites.find(s => s.id_site === id_site);
  if (!site) return alert("Site non trouvé");

  editingSiteId = id_site;

  // Charger les clients et pré-remplir le formulaire
  loadClientsSelect().then(() => {
    document.getElementById("siteClientId").value = site.id_client;
    document.getElementById("siteNom").value = site.nom;
    document.getElementById("siteAdresse").value = site.adresse || "";
    document.getElementById("siteLat").value = site.gps_lat || "";
    document.getElementById("siteLng").value = site.gps_lng || "";

    document.getElementById("siteFormTitle").textContent = "Modifier un site";
    document.getElementById("siteSubmitBtn").textContent = "Valider";

    document.getElementById("addSiteForm").style.display = "block";
  });
}

// Mettre à jour un site
async function updateSite(id_site, data) {
  const confirmUpdate = confirm("Êtes-vous sûr de vouloir modifier ce site ?");
  if (!confirmUpdate) return;

  try {
    const res = await fetch(`${API}/sites/${id_site}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      alert("Erreur lors de la modification du site");
      return;
    }

    hideAddSiteForm();
    loadSites();
    // Rafraîchir la carte si elle est affichée
    if (document.getElementById("carte").classList.contains("active")) {
      initAllSitesMap();
    }
    alert("Site modifié avec succès !");
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

// Supprimer un site
async function deleteSite(id_site) {
  try {
    // Vérifier d'abord si le site a des produits
    const resProduits = await fetch(`${API}/produits/ProduitsBySiteID/${id_site}`);
    const produits = await resProduits.json();

    if (produits.length > 0) {
      alert(`❌ Impossible de supprimer ce site.\n\nIl a ${produits.length} équipement(s) associé(s):\n${produits.slice(0, 5).map(p => '- ' + p.nom).join('\n')}${produits.length > 5 ? '\n...' : ''}\n\nVeuillez d'abord supprimer ces équipements.`);
      return;
    }

    // Vérifier si le site a des maintenances
    const resMaintenances = await fetch(`${API}/maintenances/AllMaintenancesBySiteID/${id_site}`);
    const maintenances = await resMaintenances.json();

    if (maintenances.length > 0) {
      alert(`❌ Impossible de supprimer ce site.\n\nIl a ${maintenances.length} maintenance(s) associée(s):\n${maintenances.slice(0, 5).map(m => '- ' + m.type + ' (' + m.date_maintenance + ')').join('\n')}${maintenances.length > 5 ? '\n...' : ''}\n\nVeuillez d'abord supprimer ces maintenances.`);
      return;
    }

    const confirmDelete = confirm("Voulez-vous vraiment supprimer ce site ? (CETTE ACTION EST IRREVERSIBLE)");
    if (!confirmDelete) return;

    const res = await fetch(`${API}/sites/${id_site}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      alert("Erreur lors de la suppression du site");
      return;
    }

    loadSites();
    // Rafraîchir la carte si elle est affichée
    if (document.getElementById("carte").classList.contains("active")) {
      initAllSitesMap();
    }
    alert("Site supprimé avec succès !");
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

/* ---------- PRODUITS ---------- */

let allProduits = []; // Stocke tous les produits pour le filtrage

// Charger la liste des produits
async function loadProduits() {
  const res = await fetch(`${API}/produits`);
  allProduits = await res.json();
  renderProduits(allProduits);
}

// Affichage de la liste des produits
function renderProduits(produits) {
  const ul = document.getElementById("produitsList");
  ul.innerHTML = "";

  if (produits.length === 0) {
    ul.innerHTML = "<li>Aucun produit trouvé</li>";
    return;
  }

  produits.forEach(p => {
    const li = document.createElement("li");

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
    <button onclick="window.location.href='./ProduitDetails/produitDetails.html?id_produit=${p.id_produit}'" style="background: var(--secondary-blue);">
      Détails
    </button>
  </div>
`;

    ul.appendChild(li);
  });
}

// Recherche dans les produits
const searchProduitsInput = document.getElementById("searchProduits");
searchProduitsInput.addEventListener("input", e => {
  const term = e.target.value.toLowerCase();

  const filtered = allProduits.filter(p =>
    p.nom.toLowerCase().includes(term) ||
    (p.departement && p.departement.toLowerCase().includes(term)) ||
    (p.etat && p.etat.toLowerCase().includes(term))
  );

  renderProduits(filtered);
});

// Placement de la barre de recherche
const produitsSection = document.getElementById("produits");
produitsSection.insertBefore(
  searchProduitsInput,
  document.getElementById("produitsList")
);

// Fonction pour initialiser la recherche de site dans le formulaire produit
function initSiteSearch() {
  const searchInput = document.getElementById("produitSiteSearch");
  const resultsDiv = document.getElementById("siteSearchResults");
  const hiddenIdInput = document.getElementById("produitSiteId");

  if (!searchInput) return;

  // Événement de saisie
  searchInput.addEventListener("input", async (e) => {
    const searchTerm = e.target.value.trim().toLowerCase();

    // Réinitialiser l'ID caché si le champ est vidé
    if (searchTerm === "") {
      resultsDiv.style.display = "none";
      resultsDiv.innerHTML = "";
      hiddenIdInput.value = "";
      return;
    }

    // Filtrer les sites
    const filtered = allSites.filter(site =>
      site.nom.toLowerCase().includes(searchTerm) ||
      (site.adresse && site.adresse.toLowerCase().includes(searchTerm))
    );

    // Afficher les résultats
    if (filtered.length > 0) {
      resultsDiv.innerHTML = "";
      resultsDiv.style.display = "block";

      filtered.forEach(site => {
        const div = document.createElement("div");
        div.style.cssText = `
          padding: 0.75rem;
          cursor: pointer;
          border-bottom: 1px solid var(--gray-200);
          transition: background 0.2s ease;
        `;
        
        div.innerHTML = `
          <strong style="color: var(--gray-800);">${site.nom}</strong><br/>
          <small style="color: var(--gray-600);">${site.adresse || "Pas d'adresse"}</small>
        `;

        // Survol
        div.addEventListener("mouseenter", () => {
          div.style.background = "var(--gray-50)";
        });

        div.addEventListener("mouseleave", () => {
          div.style.background = "white";
        });

        // Clic pour sélectionner
        div.addEventListener("click", () => {
          searchInput.value = site.nom;
          hiddenIdInput.value = site.id_site;
          resultsDiv.style.display = "none";
          resultsDiv.innerHTML = "";
        });

        resultsDiv.appendChild(div);
      });
    } else {
      resultsDiv.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--gray-600);">
          Aucun site trouvé
        </div>
      `;
      resultsDiv.style.display = "block";
    }
  });

  // Fermer les résultats si on clique ailleurs
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
      resultsDiv.style.display = "none";
    }
  });

  // Empêcher la fermeture quand on clique dans les résultats
  resultsDiv.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

// Ajouter un produit
async function addProduit(e) {
  e.preventDefault();

  const data = {
    nom: document.getElementById("produitNom").value,
    id_site: document.getElementById("produitSiteId").value,
    departement: document.getElementById("produitDepartement").value || null,
    etat: document.getElementById("produitEtat").value || null,
    description: document.getElementById("produitDescription").value || null
  };

  // Si on est en mode édition
  if (editingProduitId !== null) {
    await updateProduit(editingProduitId, data);
    return;
  }

  // Création du produit
  const res = await fetch(`${API}/produits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    alert("Erreur lors de l'ajout du produit");
    return;
  }

  // Récupération de l'id_produit généré
  const createdProduit = await res.json();
  const produitId = createdProduit.id_produit;

  // Création du QR code associé au produit
  const dataQr = {
    count: 1,
    prefill: {
      id_produit: produitId
    }
  };

  const resQr = await fetch(`${API}/qrcodes/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dataQr)
  });

  if (!resQr.ok) {
    alert("Produit créé, mais erreur lors de la génération du QR code");
    return;
  }

  hideAddProduitForm();
  loadProduits();
  document.getElementById("produitForm").reset();
}

function showAddProduitForm() {
  // Réinitialiser le mode édition
  editingProduitId = null;
  
  // Réinitialiser le formulaire
  document.getElementById("produitForm").reset();
  
  // Réinitialiser la recherche de site
  document.getElementById("produitSiteSearch").value = "";
  document.getElementById("produitSiteId").value = "";
  document.getElementById("siteSearchResults").style.display = "none";
  document.getElementById("siteSearchResults").innerHTML = "";
  
  // Changer le titre du formulaire
  const formTitle = document.querySelector("#addProduitForm h3");
  if (formTitle) {
    formTitle.textContent = "Ajouter un produit";
  } else {
    const title = document.createElement("h3");
    title.textContent = "Ajouter un produit";
    document.getElementById("addProduitForm").querySelector("form").prepend(title);
  }
  
  // Changer le texte du bouton
  const submitBtn = document.querySelector("#addProduitForm button[type='submit']");
  submitBtn.textContent = "Ajouter";
  
  document.getElementById("addProduitForm").style.display = "block";
  
  // Initialiser la recherche de site
  setTimeout(() => {
    initSiteSearch();
  }, 100);
}

function hideAddProduitForm() {
  document.getElementById("addProduitForm").style.display = "none";
  editingProduitId = null;
  document.getElementById("produitForm").reset();
}

// Suppression d'un produit
async function deleteProduit(id_produit) {
  const confirmDelete = confirm("Voulez-vous vraiment supprimer ce produit ? (CETTE ACTION EST IRREVERSIBLE)");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API}/produits/${id_produit}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      alert("Erreur lors de la suppression du produit");
      return;
    }

    loadProduits();
  } catch (err) {
    console.error(err);
    alert("Erreur serveur lors de la suppression");
  }
}

// Modification d'un produit
function editProduit(id_produit) {
  const produit = allProduits.find(p => p.id_produit === id_produit);
  if (!produit) return alert("Produit non trouvé");

  // Passer en mode édition
  editingProduitId = id_produit;

  // Pré-remplir le formulaire
  document.getElementById("produitNom").value = produit.nom;
  
  // Trouver le site correspondant
  const site = allSites.find(s => s.id_site === produit.id_site);
  if (site) {
    document.getElementById("produitSiteSearch").value = site.nom;
    document.getElementById("produitSiteId").value = site.id_site;
  }
  
  document.getElementById("produitDepartement").value = produit.departement || "";
  document.getElementById("produitEtat").value = produit.etat || "";
  document.getElementById("produitDescription").value = produit.description || "";

  // Changer le titre du formulaire
  const formTitle = document.querySelector("#addProduitForm h3");
  if (formTitle) {
    formTitle.textContent = "Modifier un produit";
  } else {
    const title = document.createElement("h3");
    title.textContent = "Modifier un produit";
    document.getElementById("addProduitForm").querySelector("form").prepend(title);
  }

  // Changer le texte du bouton
  const submitBtn = document.querySelector("#addProduitForm button[type='submit']");
  submitBtn.textContent = "Valider la modification";

  // Afficher le formulaire
  document.getElementById("addProduitForm").style.display = "block";
  
  // Initialiser la recherche de site
  setTimeout(() => {
    initSiteSearch();
  }, 100);
}

// Fonction pour mettre à jour un produit
async function updateProduit(id_produit, data) {
  // Demander confirmation
  const confirmUpdate = confirm("Êtes-vous sûr de vouloir modifier ce produit ?");
  if (!confirmUpdate) return;

  try {
    const res = await fetch(`${API}/produits/${id_produit}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      alert("Erreur lors de la modification du produit");
      return;
    }

    hideAddProduitForm();
    loadProduits();
    document.getElementById("produitForm").reset();
    editingProduitId = null;

  } catch (err) {
    console.error(err);
    alert("Erreur serveur lors de la modification");
  }
}

// Affichage du QrCode relatif au produit
function printQR(id) {
  window.open(`${API}/qrcodes/showqr/${id}`, "_blank");
}

/* ---------- MAINTENANCES ---------- */
async function loadMaintenances() {
  const res = await fetch(`${API}/maintenances`);
  const maintenances = await res.json();
  const ul = document.getElementById("maintenancesList");
  ul.innerHTML = "";

  maintenances.forEach(m => {
    const li = document.createElement("li");
    li.textContent = `${m.description || "Maintenance"} – ${m.date_maintenance}`;
    ul.appendChild(li);
  });
}

/* ---------- INIT ---------- */
loadProduits();
loadSites();
loadMaintenances();
loadClients();

// Attendre que la page soit complètement chargée
window.addEventListener('load', () => {
  console.log("Page chargée, initialisation de la carte...");
  // Initialiser la carte si l'onglet carte est actif par défaut
  if (document.getElementById("carte").classList.contains("active")) {
    setTimeout(() => {
      console.log("Tentative d'initialisation de la carte après 500ms");
      initAllSitesMap();
    }, 500);
  }
});