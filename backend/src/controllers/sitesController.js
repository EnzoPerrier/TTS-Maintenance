const db = require("../config/db");

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

function formatSiteDate(site) {
  if (site.date_creation) {
    site.date_creation_input = formatDateForInput(site.date_creation);
    site.date_creation = formatDateForDisplay(site.date_creation);
  }
  return site;
}

// GET /sites --> liste tous les sites
exports.getAllSites = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM sites");
    const formattedRows = rows.map(formatSiteDate);
    res.json(formattedRows);
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

    const site = formatSiteDate(rows[0]);
    res.json(site);
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
  const { id_client, nom, adresse, gps_lat, gps_lng } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE sites 
       SET id_client=?, nom=?, adresse=?, gps_lat=?, gps_lng=?
       WHERE id_site=?`,
      [id_client, nom, adresse, gps_lat, gps_lng, id]
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