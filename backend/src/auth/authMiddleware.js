const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

// Vérifie que le token est présent et valide
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(403).json({ message: "Token manquant" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(403).json({ message: "Token manquant" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // id_user, role, id_client
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide" });
  }
};

// Middleware pour role admin
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Accès refusé" });
  next();
};
