const db = require("../config/db");

// GET /sites --> liste tous les sites
exports.getAllSites = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM sites");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /sites/:id --> récupère un site par ID
exports.getSiteById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      "SELECT * FROM sites WHERE id_site = ?",
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Site non trouvé" });

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// POST /sites --> créer un site
exports.createSite = async (req, res) => {
  const { id_client, nom, adresse, gps_lat, gps_lng } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO sites (id_client, nom, adresse, gps_lat, gps_lng)
       VALUES (?, ?, ?, ?, ?)`,
      [id_client, nom, adresse, gps_lat, gps_lng]
    );

    res.status(201).json({
      id_site: result.insertId,
      id_client,
      nom,
      adresse,
      gps_lat,
      gps_lng
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// PUT /sites/:id --> modifier un site
exports.updateSite = async (req, res) => {
  const { id } = req.params;
  const { id_client, nom, adresse, gps_lat, gps_long } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE sites 
       SET id_client=?, nom=?, adresse=?, gps_lat=?, gps_long=?
       WHERE id_site=?`,
      [id_client, nom, adresse, gps_lat, gps_long, id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Site non trouvé" });

    res.json({ message: "Site mis à jour" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// DELETE /sites/:id --> supprimer un site
exports.deleteSite = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query(
      "DELETE FROM sites WHERE id_site=?",
      [id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Site non trouvé" });

    res.json({ message: "Site supprimé" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
