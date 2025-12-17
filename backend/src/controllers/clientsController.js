const db = require("../config/db.js");

// GET /clients --> liste tous les clients
exports.getAllClients = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM clients");
    res.json(rows);
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
    res.json(rows[0]);
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
    const [result] = await db.query("DELETE FROM clients WHERE id_client = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Client non trouvé" });
    res.json({ message: "Client supprimé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
