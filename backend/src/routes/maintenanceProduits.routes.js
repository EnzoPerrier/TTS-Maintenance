const express = require("express");
const router = express.Router();
const maintenanceProduitsController = require("../controllers/maintenanceProduitsController.js");

// Récupérer tous les produits d'une maintenance
router.get("/maintenance/:id_maintenance", maintenanceProduitsController.getProduitsByMaintenance);

// Récupérer toutes les maintenances d'un produit
router.get("/produit/:id_produit", maintenanceProduitsController.getMaintenancesByProduit);

// Associer un produit à une maintenance
router.post("/", maintenanceProduitsController.addProduitToMaintenance);

// Mettre à jour l'état d'un produit dans une maintenance
router.put("/:id_maintenance/:id_produit", maintenanceProduitsController.updateProduitMaintenance);

// Retirer un produit d'une maintenance
router.delete("/:id_maintenance/:id_produit", maintenanceProduitsController.removeProduitFromMaintenance);

module.exports = router;