const express = require("express");
const router = express.Router();
const photosController = require("../controllers/photosController.js");

// Récupérer les photos d'un produit spécifique dans une maintenance
router.get("/maintenance/:id_maintenance/:id_produit", photosController.getPhotosByMaintenanceProduit);

// Récupérer toutes les photos d'un produit
router.get("/produit/:id_produit", photosController.getPhotosByProduit);

// Récupérer toutes les photos d'une maintenance
router.get("/maintenance/:id_maintenance", photosController.getPhotosByMaintenance);

// Récupérer la dernière photo d'un produit
router.get("/latest/:id_produit", photosController.getLatestPhoto);

// Récupérer une photo par ID
router.get("/:id", photosController.getPhotoById);

// Ajouter une photo (avec upload)
router.post("/", photosController.uploadMiddleware, photosController.addPhoto);

// Mettre à jour une photo (commentaire)
router.put("/:id", photosController.updatePhoto);

// Supprimer une photo
router.delete("/:id", photosController.deletePhoto);

module.exports = router;