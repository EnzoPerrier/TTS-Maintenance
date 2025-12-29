const express = require("express");
const router = express.Router();
const maintenanceProduitsController = require("../controllers/maintenanceProduitsController.js");

// Récupérer tous les produits d'une maintenance
router.get("/maintenance/:id_maintenance", maintenanceProduitsController.getProduitsByMaintenance);

// Récupérer toutes les maintenances d'un produit
router.get("/produit/:id_produit", maintenanceProduitsController.getMaintenancesByProduit);

// Associer un produit à une maintenance (avec photo)
// IMPORTANT: Le middleware uploadMiddleware DOIT être appelé avant le controller
router.post("/", 
  (req, res, next) => {
    console.log("Route POST /maintenance-produits appelée");
    console.log("Content-Type:", req.headers['content-type']);
    next();
  },
  maintenanceProduitsController.uploadMiddleware,
  (req, res, next) => {
    console.log("Après uploadMiddleware - req.body:", req.body);
    console.log("Après uploadMiddleware - req.file:", req.file);
    next();
  },
  maintenanceProduitsController.addProduitToMaintenance
);

// Mettre à jour l'état d'un produit dans une maintenance (avec photo optionnelle)
router.put("/:id_maintenance/:id_produit", 
  maintenanceProduitsController.uploadMiddleware,
  maintenanceProduitsController.updateProduitMaintenance
);

// Retirer un produit d'une maintenance
router.delete("/:id_maintenance/:id_produit", maintenanceProduitsController.removeProduitFromMaintenance);

module.exports = router;