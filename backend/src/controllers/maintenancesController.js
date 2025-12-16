const db = require("../config/db.js");

// GET /maintenances → toutes les maintenances
exports.getAllMaintenances = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM maintenances");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /maintenances/:id → une maintenance
exports.getMaintenanceById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      "SELECT * FROM maintenances WHERE id_maintenance = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Maintenance non trouvée" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// POST /maintenances → créer une maintenance
exports.createMaintenance = async (req, res) => {
  const {
    id_produit,
    id_site,
    date_maintenance,
    type,
    etat,
    commentaire,
    ri_interne
  } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO maintenances 
      (id_produit, id_site, date_maintenance, type, etat, commentaire, ri_interne)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id_produit,
        id_site,
        date_maintenance,
        type,
        etat,
        commentaire,
        ri_interne
      ]
    );

    res.status(201).json({
      id_maintenance: result.insertId,
      id_produit,
      id_site,
      date_maintenance,
      type,
      etat,
      commentaire,
      ri_interne
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// PUT /maintenances/:id → modifier une maintenance
exports.updateMaintenance = async (req, res) => {
  const { id } = req.params;
  const {
    id_produit,
    id_site,
    date_maintenance,
    type,
    etat,
    commentaire,
    ri_interne
  } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE maintenances
       SET id_produit = ?, id_site = ?, date_maintenance = ?, type = ?, 
           etat = ?, commentaire = ?, ri_interne = ?
       WHERE id_maintenance = ?`,
      [
        id_produit,
        id_site,
        date_maintenance,
        type,
        etat,
        commentaire,
        ri_interne,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Maintenance non trouvée" });
    }

    res.json({ message: "Maintenance mise à jour" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// DELETE /maintenances/:id
exports.deleteMaintenance = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query(
      "DELETE FROM maintenances WHERE id_maintenance = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Maintenance non trouvée" });
    }

    res.json({ message: "Maintenance supprimée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
