let editingProduitId = null;

const API = "http://192.168.1.127:3000"; // adresse du serveur API --> PORT 3000

function showSection(id) {
  document.querySelectorAll("section").forEach(s =>
    s.classList.remove("active")
  );
  document.getElementById(id).classList.add("active");
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
  } else {
    alert("Erreur lors de l'ajout du site");
  }
}

function showAddSiteForm() {
  document.getElementById("addSiteForm").style.display = "block";
}

function hideAddSiteForm() {
  document.getElementById("addSiteForm").style.display = "none";
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

function showAddProduitForm() {
  // Réinitialiser le mode édition
  editingProduitId = null;
  
  // Réinitialiser le formulaire
  document.getElementById("produitForm").reset();
  
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
  document.getElementById("produitDepartement").value = produit.type || "";
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

    alert("Produit modifié avec succès");
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