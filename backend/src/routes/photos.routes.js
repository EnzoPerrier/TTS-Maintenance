const express = require("express");
const router = express.Router();
const photosController = require("../controllers/photosController.js");

// IMPORTANT: Les routes spécifiques DOIVENT être AVANT les routes génériques avec :id

// Récupérer la dernière photo d'un produit
router.get("/latest/:id_produit", photosController.getLatestPhoto);

// Récupérer toutes les photos d'un produit
router.get("/produit/:id_produit", photosController.getPhotosByProduit);

// Récupérer toutes les photos d'une maintenance
router.get("/maintenance/:id_maintenance", photosController.getPhotosByMaintenance);

// Récupérer les photos d'un produit spécifique dans une maintenance
router.get("/maintenance/:id_maintenance/:id_produit", photosController.getPhotosByMaintenanceProduit);

// Ajouter une photo (avec upload)
router.post("/", photosController.uploadMiddleware, photosController.addPhoto);

// Ajouter plusieurs photos à la fois
router.post("/multiple", photosController.uploadMultipleMiddleware, photosController.addMultiplePhotos);

// Mettre à jour une photo (commentaire)
router.put("/:id", photosController.updatePhoto);

// Supprimer une photo
router.delete("/:id", photosController.deletePhoto);

// Récupérer une photo par ID - DOIT ÊTRE EN DERNIER
router.get("/:id", photosController.getPhotoById);

module.exports = router;