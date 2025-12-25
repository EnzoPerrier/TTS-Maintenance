const express = require("express");
const router = express.Router();
const produitsController = require("../controllers/produitsController.js");

router.get("/", produitsController.getAllProduits);
router.get("/:id", produitsController.getProduitById);
router.get("/ProduitsBySiteID/:id", produitsController.getProduitsBySiteId);
router.post("/", produitsController.createProduit);
router.put("/:id", produitsController.updateProduit);
router.delete("/:id", produitsController.deleteProduit);

module.exports = router;