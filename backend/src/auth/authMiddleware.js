const jwt = require("jsonwebtoken");

/**
 * Vérifie le token JWT dans le header Authorization.
 * Si valide, injecte req.user = { id_user, username, role, ... }
 */
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant ou invalide" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expiré" });
    }
    return res.status(403).json({ error: "Token invalide" });
  }
};

/**
 * Vérifie que l'utilisateur connecté a le rôle "admin".
 * À utiliser APRÈS verifyToken.
 */
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Accès réservé aux administrateurs" });
  }
  next();
};