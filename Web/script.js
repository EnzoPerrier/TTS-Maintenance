let editingProduitId = null;
let allSitesMap = null;
let allClients = []; // stocke tous les clients pour filtrage

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
      
      // Clic sur le marqueur pour aller vers les détails
      marker.on('click', () => {
        // Optionnel : ouvrir directement sans popup
        // goToSiteDetails(site.id_site);
      });
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
// Charger la liste des clients
async function loadClients() {
  try {
    const res = await fetch(`${API}/clients`);
    allClients = await res.json();
    renderClients(allClients);
  } catch (err) {
    console.error("Erreur lors du chargement des clients:", err);
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
    li.classList.add("clickable-line");
    
    li.innerHTML = `
      <div style="flex: 1;">
        <strong style="font-size: 1.1rem; color: var(--primary-blue);">${client.nom}</strong><br/>
        ${client.contact ? `<span style="color: var(--gray-600);">👤 Contact: ${client.contact}</span><br/>` : ''}
        ${client.email ? `<span style="color: var(--gray-600);">📧 ${client.email}</span><br/>` : ''}
        ${client.telephone ? `<span style="color: var(--gray-600);">📞 ${client.telephone}</span><br/>` : ''}
        ${client.adresse ? `<span style="color: var(--gray-600);">📍 ${client.adresse}</span>` : ''}
      </div>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <button onclick="event.stopPropagation(); deleteClient(${client.id_client})" style="background: var(--danger);">Supprimer</button>
      </div>
    `;

    list.appendChild(li);
  });
}

// Barre de recherche pour filtrer les clients
const searchClientsInput = document.getElementById("searchClients");
if (searchClientsInput) {
  searchClientsInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = allClients.filter(client =>
      client.nom.toLowerCase().includes(searchTerm) ||
      (client.contact && client.contact.toLowerCase().includes(searchTerm)) ||
      (client.email && client.email.toLowerCase().includes(searchTerm)) ||
      (client.telephone && client.telephone.toLowerCase().includes(searchTerm)) ||
      (client.adresse && client.adresse.toLowerCase().includes(searchTerm))
    );
    renderClients(filtered);
  });
}

// Ajouter un client
async function addClient(event) {
  event.preventDefault();

  const data = {
    nom: document.getElementById("clientNom").value,
    contact: document.getElementById("clientContact").value || null,
    email: document.getElementById("clientEmail").value || null,
    telephone: document.getElementById("clientTelephone").value || null,
    adresse: document.getElementById("clientAdresse").value || null
  };

  try {
    const res = await fetch(`${API}/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      hideAddClientForm();
      loadClients(); // recharge la liste des clients
      alert("Client ajouté avec succès !");
    } else {
      alert("Erreur lors de l'ajout du client");
    }
  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
}

// Supprimer un client
async function deleteClient(id_client) {
  const confirmDelete = confirm("Voulez-vous vraiment supprimer ce client ? Cette action supprimera également tous les sites associés.");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API}/clients/${id_client}`, {
      method: "DELETE"
    });

    if (!res.ok) {
      alert("Erreur lors de la suppression du client");
      return;
    }

    loadClients();
    alert("Client supprimé avec succès");
  } catch (err) {
    console.error(err);
    alert("Erreur serveur lors de la suppression");
  }
}

function showAddClientForm() {
  document.getElementById("addClientForm").style.display = "block";
}

function hideAddClientForm() {
  document.getElementById("addClientForm").style.display = "none";
  document.getElementById("addClientForm").querySelector("form").reset();
}

/* ---------- SITES ---------- */
let allSites = []; // stocke tous les sites pour filtrage

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

  sites.forEach(site => {
    const li = document.createElement("li");
    li.textContent = `${site.nom} - ${site.adresse || ""} - ${site.id_site}`;

    // Rendre toute la ligne cliquable
    li.addEventListener("click", () => {
      window.location.href = `./SiteDetails/siteDetails.html?id_site=${site.id_site}`;
    });

    li.classList.add("clickable-line");
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
  } else {
    alert("Erreur lors de l'ajout du site");
  }
}

function showAddSiteForm() {
  // Charger les clients dans le select
  loadClientsSelect();
  
  document.getElementById("addSiteForm").style.display = "block";
  
  // Initialiser la recherche de client
  setTimeout(() => {
    initClientSearch();
  }, 100);
}

function hideAddSiteForm() {
  document.getElementById("addSiteForm").style.display = "none";
  document.getElementById("addSiteForm").querySelector("form").reset();
}

// Charger les clients dans le select
function loadClientsSelect() {
  const select = document.getElementById("siteClientId");
  select.innerHTML = '<option value="">-- Sélectionner un client --</option>';
  
  allClients.forEach(client => {
    const option = document.createElement("option");
    option.value = client.id_client;
    option.textContent = `${client.nom}${client.contact ? ' - ' + client.contact : ''}`;
    option.dataset.nom = client.nom.toLowerCase();
    option.dataset.contact = (client.contact || '').toLowerCase();
    select.appendChild(option);
  });
}

// Initialiser la recherche de client
function initClientSearch() {
  const searchInput = document.getElementById("clientSearch");
  const select = document.getElementById("siteClientId");
  
  if (!searchInput) return;
  
  // Nettoyer les anciens event listeners
  const newSearchInput = searchInput.cloneNode(true);
  searchInput.parentNode.replaceChild(newSearchInput, searchInput);
  
  newSearchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const options = select.querySelectorAll("option");
    
    options.forEach(option => {
      if (option.value === "") {
        option.style.display = "block";
        return;
      }
      
      const nom = option.dataset.nom || "";
      const contact = option.dataset.contact || "";
      
      if (nom.includes(searchTerm) || contact.includes(searchTerm)) {
        option.style.display = "block";
      } else {
        option.style.display = "none";
      }
    });
    
    // Ouvrir le select si on tape
    if (searchTerm.length > 0) {
      select.size = Math.min(options.length, 8);
    } else {
      select.size = 1;
    }
  });
  
  // Réinitialiser la taille au focus
  newSearchInput.addEventListener("focus", () => {
    select.size = Math.min(select.options.length, 8);
  });
  
  // Fermer au blur
  newSearchInput.addEventListener("blur", () => {
    setTimeout(() => {
      select.size = 1;
    }, 200);
  });
  
  // Sélectionner au clic
  select.addEventListener("change", () => {
    select.size = 1;
    newSearchInput.value = "";
    // Réafficher toutes les options
    const options = select.querySelectorAll("option");
    options.forEach(opt => opt.style.display = "block");
  });
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
    li.classList.add("clickable-line");

    li.innerHTML = `
      <span>
  ${p.nom}
  ${p.departement ? " - " + p.departement : ""}
  ${p.etat ? " - " + p.etat : ""}
</span>
<div>
  <button id="deleteBtn" onclick="deleteProduit(${p.id_produit})">Supprimer</button>
  <button onclick="editProduit(${p.id_produit})">Modifier</button>
  <button id="editBtn" onclick="printQR(${p.id_produit})">QR</button>
  <button onclick="window.location.href='./ProduitDetails/produitDetails.html?id_produit=${p.id_produit}'" style="background: var(--secondary-blue);">Détails</button>
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

// Formulaire d'ajout de produit
function showAddProduitForm() {
  // Réinitialiser le mode édition
  editingProduitId = null;
  
  // Réinitialiser le formulaire
  document.getElementById("produitForm").reset();
  
  // Charger les sites dans le select
  loadSitesSelect();
  
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
  initSiteSearch();
}

// Charger les sites dans le select
function loadSitesSelect() {
  const select = document.getElementById("produitSiteId");
  select.innerHTML = '<option value="">-- Sélectionner un site --</option>';
  
  allSites.forEach(site => {
    const option = document.createElement("option");
    option.value = site.id_site;
    option.textContent = `${site.nom} - ${site.adresse || 'Sans adresse'}`;
    option.dataset.nom = site.nom.toLowerCase();
    option.dataset.adresse = (site.adresse || '').toLowerCase();
    select.appendChild(option);
  });
}

// Initialiser la recherche de site
function initSiteSearch() {
  const searchInput = document.getElementById("siteSearch");
  const select = document.getElementById("produitSiteId");
  
  if (!searchInput) return;
  
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const options = select.querySelectorAll("option");
    
    options.forEach(option => {
      if (option.value === "") {
        option.style.display = "block";
        return;
      }
      
      const nom = option.dataset.nom || "";
      const adresse = option.dataset.adresse || "";
      
      if (nom.includes(searchTerm) || adresse.includes(searchTerm)) {
        option.style.display = "block";
      } else {
        option.style.display = "none";
      }
    });
    
    // Ouvrir le select si on tape
    if (searchTerm.length > 0) {
      select.size = Math.min(options.length, 8);
    } else {
      select.size = 1;
    }
  });
  
  // Réinitialiser la taille au focus
  searchInput.addEventListener("focus", () => {
    select.size = Math.min(select.options.length, 8);
  });
  
  // Fermer au blur
  searchInput.addEventListener("blur", () => {
    setTimeout(() => {
      select.size = 1;
    }, 200);
  });
  
  // Sélectionner au clic
  select.addEventListener("change", () => {
    select.size = 1;
    searchInput.value = "";
    // Réafficher toutes les options
    const options = select.querySelectorAll("option");
    options.forEach(opt => opt.style.display = "block");
  });
}

function hideAddProduitForm() {
  document.getElementById("addProduitForm").style.display = "none";
  editingProduitId = null;
  document.getElementById("produitForm").reset();
}

// Suppression d'un produit
async function deleteProduit(id_produit) {
  const confirmDelete = confirm("Voulez-vous vraiment supprimer ce produit ?");
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
  document.getElementById("produitSiteId").value = produit.id_site;
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
loadClients();
loadProduits();
loadSites();
loadMaintenances();

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