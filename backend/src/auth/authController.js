const db = require("../config/db.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

// REGISTER (admin ou client)
exports.register = async (req, res) => {
  const { username, password, role, id_client } = req.body;
  if (!username || !password || !role)
    return res.status(400).json({ message: "Champs manquants" });

  const hashed = bcrypt.hashSync(password, 10);

  try {
    await db.query(
      "INSERT INTO users (username, password, role, id_client) VALUES (?, ?, ?, ?)",
      [username, hashed, role, id_client || null]
    );
    res.status(201).json({ message: "Utilisateur créé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// LOGIN
exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Utilisateur introuvable" });

    const user = rows[0];
    const validPass = bcrypt.compareSync(password, user.password);
    if (!validPass)
      return res.status(401).json({ message: "Mot de passe incorrect" });

    const token = jwt.sign(
      { id_user: user.id_user, role: user.role, id_client: user.id_client },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ message: "Connexion réussie", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
