const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
dotenv.config();

const app = express();

// ── Sécurité HTTP headers
app.use(helmet());

// ── CORS restrictif (liste blanche)
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Rate limiting global (100 req / 15min par IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Trop de requêtes, réessaie plus tard" },
});
app.use(limiter);

// ── Rate limiting spécifique sur le login (anti brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Trop de tentatives de connexion" },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Fichiers statiques
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/Ressources", express.static(path.join(__dirname, "pdf", "Ressources")));

// ── Route test
app.get("/", (req, res) => {
  res.json({ message: "API TTSmaintenance opérationnelle" });
});

// ── Middleware auth (importé une seule fois ici)
const { verifyToken, isAdmin } = require("./auth/authMiddleware.js");

// ─────────────────────────────────────────────
//  ROUTES PUBLIQUES (pas de token requis)
// ─────────────────────────────────────────────
const AuthRoutes = require("./routes/auth.routes.js");
app.use("/auth", authLimiter, AuthRoutes);

// QR code scan : public car scanné par n'importe qui via l'app mobile
const QrCodesRoutes = require("./routes/qrcodes.routes.js");
app.use("/qrcodes/scan", QrCodesRoutes);

// ─────────────────────────────────────────────
//  ROUTES PROTÉGÉES (token JWT obligatoire)
// ─────────────────────────────────────────────
const clientsRoutes = require("./routes/clients.routes.js");
app.use("/clients", verifyToken, clientsRoutes);

const produitsRoutes = require("./routes/produits.routes.js");
app.use("/produits", verifyToken, produitsRoutes);

const sitesRoutes = require("./routes/sites.routes.js");
app.use("/sites", verifyToken, sitesRoutes);

const maintenancesRoutes = require("./routes/maintenances.routes.js");
app.use("/maintenances", verifyToken, maintenancesRoutes);

const maintenanceProduitsRoutes = require("./routes/maintenanceProduits.routes.js");
app.use("/maintenance-produits", verifyToken, maintenanceProduitsRoutes);

const photosRoutes = require("./routes/photos.routes.js");
app.use("/photos", verifyToken, photosRoutes);

// QR code management : protégé (création, suppression, listing)
app.use("/qrcodes", verifyToken, QrCodesRoutes);

// ─────────────────────────────────────────────
//  ROUTES ADMIN (token + rôle admin requis)
//  req.user → req.admin pour compatibilité
//  avec AdminController.js qui lit req.admin
// ─────────────────────────────────────────────
const AdminRoutes = require("./routes/admin.routes.js");
app.use("/admin", verifyToken, isAdmin, (req, res, next) => {
  req.admin = req.user; // ← pont de compatibilité
  next();
}, AdminRoutes);

// ─────────────────────────────────────────────
//  GESTION GLOBALE DES ERREURS
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Erreur serveur interne" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur API lancé sur le port ${PORT}`);
});