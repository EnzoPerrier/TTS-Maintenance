const db = require("../config/db.js");

// GET /produits --> liste tous les produits
exports.getAllProduits = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM produits ORDER BY id_produit DESC");
    res.json(rows);
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

    res.json(rows[0]);
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

    // Toujours renvoyer un tableau (vide si aucun produit)
    res.json(rows);
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
  const { id_site, nom, departement, etat, description } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE produits
       SET id_site = ?, nom = ?, departement = ?, etat = ?, description = ?
       WHERE id_produit = ?`,
      [id_site, nom, departement, etat, description, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Produit non trouvé" });
    }

    res.json({
      message: "Produit mis à jour",
      produit: { id_produit: id, id_site, nom, departement, etat, description }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
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