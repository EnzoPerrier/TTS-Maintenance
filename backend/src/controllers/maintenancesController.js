const db = require("../config/db.js");

// Fonction utilitaire pour formater les dates au format JJ/MM/AAAA HH:MM
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

function formatMaintenanceDate(maintenance) {
  if (maintenance.date_maintenance) {
    // Garder aussi le format original pour les inputs
    maintenance.date_maintenance_input = formatDateForInput(maintenance.date_maintenance);
    maintenance.date_maintenance = formatDateForDisplay(maintenance.date_maintenance);
  }
  return maintenance;
}

// GET /maintenances → toutes les maintenances
exports.getAllMaintenances = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM maintenances");
    const formattedRows = rows.map(formatMaintenanceDate);
    res.json(formattedRows);
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

    const maintenance = formatMaintenanceDate(rows[0]);
    res.json(maintenance);
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

    const formattedRows = rows.map(formatMaintenanceDate);
    res.json(formattedRows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /maintenances/details
exports.getAllMaintenancesDetails = async (req, res) => {

  try {
    const [rows] = await db.query(
      `SELECT 
          m.id_maintenance,
          m.date_maintenance,
          m.id_site,
          m.etat,
          s.nom AS site_nom,
          c.id_client,
          c.nom AS client_nom
       FROM maintenances m
       JOIN sites s ON m.id_site = s.id_site
       JOIN clients c ON s.id_client = c.id_client
       ORDER BY m.date_maintenance DESC`,
    );

    // Formatage des dates si nécessaire
    const formattedRows = rows.map(formatMaintenanceDate);

    res.json(formattedRows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /maintenances/details/:id
exports.getDetailsMaintenance = async (req, res) => {
  const { id } = req.params; // id_site ou id_maintenance selon usage

  try {
    const [rows] = await db.query(
      `SELECT 
          m.id_maintenance,
          m.date_maintenance,
          m.id_site,
          s.nom AS site_nom,
          c.id_client,
          c.nom AS client_nom
       FROM maintenances m
       JOIN sites s ON m.id_site = s.id_site
       JOIN clients c ON s.id_client = c.id_client
       WHERE m.id_site = ?
       ORDER BY m.date_maintenance DESC`,
      [id]
    );

    // Formatage des dates si nécessaire
    const formattedRows = rows.map(formatMaintenanceDate);

    res.json(formattedRows);

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
    ri_interne
  } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO maintenances (id_site, date_maintenance, type, etat, commentaire, ri_interne, date_creation) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id_site,
        date_maintenance,
        type,
        etat,
        commentaire,
        ri_interne,
        new Date().toISOString().split('T')[0]
      ]
    );

    res.status(201).json({
      id_maintenance: result.insertId,
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

// PUT /maintenances/:id 
exports.updateMaintenance = async (req, res) => {
  const { id } = req.params;
  const {
    id_site,
    date_maintenance,
    type,
    etat,
    commentaire,
    ri_interne
  } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE maintenances SET id_site = ?, date_maintenance = ?, type = ?, etat = ?, commentaire = ?, ri_interne = ? WHERE id_maintenance = ?`,
      [
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