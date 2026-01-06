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

function formatClientDate(client) {
  if (client.date_creation) {
    client.date_creation_input = formatDateForInput(client.date_creation);
    client.date_creation = formatDateForDisplay(client.date_creation);
  }
  return client;
}

// GET /clients --> liste tous les clients
exports.getAllClients = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM clients ORDER BY nom ASC");
    const formattedRows = rows.map(formatClientDate);
    res.json(formattedRows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /clients/:id --> récupère un client spécifique
exports.getClientById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query("SELECT * FROM clients WHERE id_client = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Client non trouvé" });
    
    const client = formatClientDate(rows[0]);
    res.json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// POST /clients --> créer un nouveau client
exports.createClient = async (req, res) => {
  const { nom, contact, adresse, email, telephone } = req.body;
  try {
    const [result] = await db.query(
      "INSERT INTO clients (nom, contact, adresse, email, telephone) VALUES (?, ?, ?, ?, ?)",
      [nom, contact, adresse, email, telephone]
    );
    res.status(201).json({
      id_client: result.insertId,
      nom, contact, adresse, email, telephone
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// PUT /clients/:id --> modifier un client
exports.updateClient = async (req, res) => {
  const { id } = req.params;
  const { nom, contact, adresse, email, telephone } = req.body;
  try {
    const [result] = await db.query(
      "UPDATE clients SET nom = ?, contact = ?, adresse = ?, email = ?, telephone = ? WHERE id_client = ?",
      [nom, contact, adresse, email, telephone, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Client non trouvé" });
    
    res.json({ message: "Client mis à jour" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// DELETE /clients/:id --> supprimer un client
exports.deleteClient = async (req, res) => {
  const { id } = req.params;
  try {
    // Vérifier d'abord si le client a des sites
    const [sites] = await db.query("SELECT COUNT(*) as count FROM sites WHERE id_client = ?", [id]);
    
    if (sites[0].count > 0) {
      return res.status(400).json({ 
        error: "Impossible de supprimer ce client car il a des sites associés",
        sitesCount: sites[0].count
      });
    }
    
    const [result] = await db.query("DELETE FROM clients WHERE id_client = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Client non trouvé" });
    res.json({ message: "Client supprimé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};