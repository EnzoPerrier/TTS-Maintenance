const db = require("../config/db.js");

// GET /maintenance-produits/:id_maintenance - Récupérer tous les produits d'une maintenance
exports.getProduitsByMaintenance = async (req, res) => {
  const { id_maintenance } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT mp.*, p.nom, p.departement, p.description, p.id_site
       FROM maintenance_produits mp
       JOIN produits p ON mp.id_produit = p.id_produit
       WHERE mp.id_maintenance = ?
       ORDER BY p.nom ASC`,
      [id_maintenance]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /maintenance-produits/produit/:id_produit - Récupérer toutes les maintenances d'un produit
exports.getMaintenancesByProduit = async (req, res) => {
  const { id_produit } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT mp.*, m.date_maintenance, m.type, m.departement, m.commentaire as maintenance_commentaire
       FROM maintenance_produits mp
       JOIN maintenances m ON mp.id_maintenance = m.id_maintenance
       WHERE mp.id_produit = ?
       ORDER BY m.date_maintenance DESC`,
      [id_produit]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// POST /maintenance-produits - Associer un produit à une maintenance
exports.addProduitToMaintenance = async (req, res) => {
  const { id_maintenance, id_produit, etat, commentaire } = req.body;

  try {
    // Vérifier si l'association existe déjà
    const [existing] = await db.query(
      `SELECT * FROM maintenance_produits 
       WHERE id_maintenance = ? AND id_produit = ?`,
      [id_maintenance, id_produit]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Ce produit est déjà associé à cette maintenance" });
    }

    await db.query(
      `INSERT INTO maintenance_produits (id_maintenance, id_produit, etat, commentaire)
       VALUES (?, ?, ?, ?)`,
      [id_maintenance, id_produit, etat || 'N/A', commentaire || null]
    );

    res.status(201).json({
      message: "Produit associé à la maintenance",
      id_maintenance,
      id_produit,
      etat,
      commentaire
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// PUT /maintenance-produits/:id_maintenance/:id_produit - Mettre à jour l'état d'un produit dans une maintenance
exports.updateProduitMaintenance = async (req, res) => {
  const { id_maintenance, id_produit } = req.params;
  const { etat, commentaire } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE maintenance_produits
       SET etat = ?, commentaire = ?
       WHERE id_maintenance = ? AND id_produit = ?`,
      [etat || 'N/A', commentaire || null, id_maintenance, id_produit]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Association non trouvée" });
    }

    res.json({ message: "État du produit mis à jour" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// DELETE /maintenance-produits/:id_maintenance/:id_produit - Retirer un produit d'une maintenance
exports.removeProduitFromMaintenance = async (req, res) => {
  const { id_maintenance, id_produit } = req.params;

  try {
    const [result] = await db.query(
      `DELETE FROM maintenance_produits
       WHERE id_maintenance = ? AND id_produit = ?`,
      [id_maintenance, id_produit]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Association non trouvée" });
    }

    res.json({ message: "Produit retiré de la maintenance" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};