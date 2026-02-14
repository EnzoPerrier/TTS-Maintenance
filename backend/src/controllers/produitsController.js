const db = require("../config/db.js");

// Fonction utilitaire pour formater les dates au format JJ/MM/AAAA
function formatDateForDisplay(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

// Fonction pour garder le format YYYY-MM-DD pour les inputs
function formatDateForInput(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatProduitDate(produit) {
  if (produit.date_creation) {
    produit.date_creation_input = formatDateForInput(produit.date_creation);
    produit.date_creation = formatDateForDisplay(produit.date_creation);
  }
  return produit;
}

// GET /produits --> liste tous les produits
exports.getAllProduits = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM produits ORDER BY id_produit DESC");
    const formattedRows = rows.map(formatProduitDate);
    res.json(formattedRows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /produits/:id --> produit par ID
exports.getProduitById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      "SELECT * FROM produits WHERE id_produit = ?",
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Produit non trouvé" });

    const produit = formatProduitDate(rows[0]);
    res.json(produit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /produits/ProduitsBySiteID/:id --> produits par site ID
exports.getProduitsBySiteId = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      "SELECT * FROM produits WHERE id_site = ? ORDER BY nom ASC",
      [id]
    );

    const formattedRows = rows.map(formatProduitDate);
    res.json(formattedRows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// POST /produits --> créer un produit
exports.createProduit = async (req, res) => {
  const { id_site, nom, departement, etat, description } = req.body;
  
  try {
    const [result] = await db.query(
      `INSERT INTO produits (id_site, nom, departement, etat, description, date_creation)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [id_site, nom, departement, etat, description]
    );

    res.status(201).json({
      id_produit: result.insertId,
      id_site,
      nom,
      departement,
      etat,
      description
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// PUT /produits/:id --> modifier un produit
exports.updateProduit = async (req, res) => {
  const { id } = req.params;
  const { nom, etat, departement, description } = req.body;

  try {
    // Ne pas inclure id_site dans l'UPDATE
    const result = await db.query(
      `UPDATE produits 
       SET nom = COALESCE(?, nom),
           etat = ?,
           departement = ?,
           description = ?
       WHERE id_produit = ?`,
      [nom, etat, departement, description, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Récupérer le produit mis à jour
    const [updated] = await db.query(
      'SELECT * FROM produits WHERE id_produit = ?',
      [id]
    );

    res.json(updated[0]);
  } catch (error) {
    console.error('Erreur updateProduit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// DELETE /produits/:id --> supprimer un produit
exports.deleteProduit = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query(
      "DELETE FROM produits WHERE id_produit=?",
      [id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Produit non trouvé" });

    res.json({ message: "Produit supprimé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};