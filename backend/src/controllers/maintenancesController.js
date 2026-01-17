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

// GET /maintenances/:id  
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

// GET /maintenances/AllMaintenancesBySiteID/:id 
exports.getAllMaintenancesBySiteID = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      "SELECT * FROM maintenances WHERE id_site = ? ORDER BY date_maintenance DESC",
      [id]
    );

    // Toujours renvoyer un tableau (vide si aucune maintenance)
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// POST /maintenances 
exports.createMaintenance = async (req, res) => {
  const {
    id_site,
    date_maintenance,
    type,
    etat,
    commentaire,
    operateur_1,
    operateur_2,
    operateur_3,
    heure_arrivee_matin,
    heure_depart_matin,
    heure_arrivee_aprem,
    heure_depart_aprem,
    garantie,
    commentaire_interne,
    contact,
    type_produit,
    numero_commande,
    numero_ri,
    departement
  } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO maintenances (
        id_site, 
        date_maintenance, 
        type, 
        etat, 
        commentaire,
        date_creation,
        operateur_1,
        operateur_2,
        operateur_3,
        heure_arrivee_matin,
        heure_depart_matin,
        heure_arrivee_aprem,
        heure_depart_aprem,
        garantie,
        commentaire_interne,
        contact,
        type_produit,
        numero_commande,
        numero_ri,
        departement
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_site,
        date_maintenance,
        type,
        etat,
        commentaire,
        new Date().toISOString().split('T')[0],
        operateur_1 || null,
        operateur_2 || null,
        operateur_3 || null,
        heure_arrivee_matin || null,
        heure_depart_matin || null,
        heure_arrivee_aprem || null,
        heure_depart_aprem || null,
        garantie || 0,
        commentaire_interne || null,
        contact || null,
        type_produit || null,
        numero_commande || null,
        numero_ri || null,
        departement || null
      ]
    );

    res.status(201).json({
      id_maintenance: result.insertId,
      id_site,
      date_maintenance,
      type,
      etat,
      commentaire
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// PUT /maintenances/:id 
exports.updateMaintenance = async (req, res) => {
  const { id } = req.params;
  const {
    id_site,
    date_maintenance,
    type,
    etat,
    commentaire,
    operateur_1,
    operateur_2,
    operateur_3,
    heure_arrivee_matin,
    heure_depart_matin,
    heure_arrivee_aprem,
    heure_depart_aprem,
    garantie,
    commentaire_interne,
    contact,
    type_produit,
    numero_commande,
    numero_ri,
    departement
  } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE maintenances SET 
        id_site = ?, 
        date_maintenance = ?, 
        type = ?, 
        etat = ?, 
        commentaire = ?,
        operateur_1 = ?,
        operateur_2 = ?,
        operateur_3 = ?,
        heure_arrivee_matin = ?,
        heure_depart_matin = ?,
        heure_arrivee_aprem = ?,
        heure_depart_aprem = ?,
        garantie = ?,
        commentaire_interne = ?,
        contact = ?,
        type_produit = ?,
        numero_commande = ?,
        numero_ri = ?,
        departement = ?
      WHERE id_maintenance = ?`,
      [
        id_site,
        date_maintenance,
        type,
        etat,
        commentaire,
        operateur_1 || null,
        operateur_2 || null,
        operateur_3 || null,
        heure_arrivee_matin || null,
        heure_depart_matin || null,
        heure_arrivee_aprem || null,
        heure_depart_aprem || null,
        garantie || 0,
        commentaire_interne || null,
        contact || null,
        type_produit || null,
        numero_commande || null,
        numero_ri || null,
        departement || null,
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