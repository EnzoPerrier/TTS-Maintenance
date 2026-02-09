const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Servir les fichiers statiques (images uploadées)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/Ressources", express.static(path.join(__dirname, "pdf", 'Ressources')));

// Route test
app.get("/", (req, res) => {
  res.json({ message: "API TTSmaintenance opérationnelle " });
});

//--------------------------------- Import des routes

// Clients
const clientsRoutes = require("./routes/clients.routes.js");
app.use("/clients", clientsRoutes);

// Produits
const produitsRoutes = require("./routes/produits.routes.js");
app.use("/produits", produitsRoutes);

// Sites
const sitesRoutes = require("./routes/sites.routes.js");
app.use("/sites", sitesRoutes);

// Maintenances
const maintenancesRoutes = require("./routes/maintenances.routes.js");
app.use("/maintenances", maintenancesRoutes);

// Maintenance-Produits
const maintenanceProduitsRoutes = require("./routes/maintenanceProduits.routes.js");
app.use("/maintenance-produits", maintenanceProduitsRoutes);

// photos
const photosRoutes = require("./routes/photos.routes.js");
app.use("/photos", photosRoutes);

// Auth
const AuthRoutes = require("./routes/auth.routes.js");
app.use("/auth", AuthRoutes);

// Qr Codes
const QrCodesRoutes = require("./routes/qrcodes.routes.js");
app.use("/qrcodes", QrCodesRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Serveur API lancé sur le port " + PORT);
});