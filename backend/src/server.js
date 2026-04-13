const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: "Trop de requêtes, réessaie plus tard" },
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Trop de tentatives de connexion" },
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/Ressources", express.static(path.join(__dirname, "pdf", "Ressources")));

app.get("/", (req, res) => {
  res.json({ message: "API TTSmaintenance opérationnelle" });
});

const { verifyToken, isAdmin } = require("./auth/authMiddleware.js");

// ── TOUS LES REQUIRES EN PREMIER ──
const AuthRoutes = require("./routes/auth.routes.js");
const QrCodesRoutes = require("./routes/qrcodes.routes.js");
const clientsRoutes = require("./routes/clients.routes.js");
const produitsRoutes = require("./routes/produits.routes.js");
const sitesRoutes = require("./routes/sites.routes.js");
const maintenancesRoutes = require("./routes/maintenances.routes.js");
const maintenanceProduitsRoutes = require("./routes/maintenanceProduits.routes.js");
const photosRoutes = require("./routes/photos.routes.js");
const AdminRoutes = require("./routes/admin.routes.js");

// ── ROUTES PUBLIQUES ──
app.use("/auth", authLimiter, AuthRoutes);

// QR public - routes directes SANS passer par le router
const qrController = require("./controllers/qrcodesController.js");
app.get("/qrcodes/showqr/:id", qrController.showQRCode);
app.get("/qrcodes/scan/:id", qrController.scanQRCode);

// Rapports d'intervention publics (HTML + PDF)
const maintenancesController = require("./controllers/maintenancesController.js");
app.get("/maintenances/:id/html", maintenancesController.generateMaintenanceHTML);
app.get("/maintenances/:id/pdf", maintenancesController.generateMaintenancePDF);

app.get("/stats/public", async (req, res) => {
  try {
    const db = require("./config/db.js");
    const [[{ sites }]]        = await db.query("SELECT COUNT(*) as sites FROM sites");
    const [[{ maintenances }]] = await db.query("SELECT COUNT(*) as maintenances FROM maintenances WHERE etat != 'Terminée'");
    const [[{ produits }]]     = await db.query("SELECT COUNT(*) as produits FROM produits");
    res.json({ sites, maintenances, produits });
  } catch {
    res.json({ sites: 0, maintenances: 0, produits: 0 });
  }
});

// ── ROUTES PROTÉGÉES ──
app.use("/clients", verifyToken, clientsRoutes);
app.use("/produits", verifyToken, produitsRoutes);
app.use("/sites", verifyToken, sitesRoutes);
app.use("/maintenances", verifyToken, maintenancesRoutes);
app.use("/maintenance-produits", verifyToken, maintenanceProduitsRoutes);
app.use("/photos", verifyToken, photosRoutes);
app.use("/qrcodes", verifyToken, QrCodesRoutes);

// ── ROUTES ADMIN ──
app.use("/admin", verifyToken, isAdmin, (req, res, next) => {
  req.admin = req.user;
  next();
}, AdminRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Erreur serveur interne" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur API lancé sur le port ${PORT}`);
});