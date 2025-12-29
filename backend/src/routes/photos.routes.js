const express = require("express");
const router = express.Router();
const photosController = require("../controllers/photosController.js");

// Récupérer toutes les photos d'un produit
router.get("/produit/:id_produit", photosController.getPhotosByProduit);

// Récupérer la dernière photo d'un produit
router.get("/latest/:id_produit", photosController.getLatestPhoto);

// Récupérer les photos d'une maintenance
router.get("/maintenance/:id_maintenance", photosController.getPhotosByMaintenance);

// Récupérer une photo par ID
router.get("/:id", photosController.getPhotoById);

// Ajouter une photo
router.post("/", photosController.uploadMiddleware, photosController.addPhoto);

// Mettre à jour une photo (commentaire)
router.put("/:id", photosController.updatePhoto);

// Supprimer une photo
router.delete("/:id", photosController.deletePhoto);

module.exports = router;