const express = require("express");
const router = express.Router();
const qrController = require("../controllers/qrcodesController.js");

// Générer un ou plusieurs QR codes
router.post("/generate", qrController.generateQRCodes);

// Liste tous les QrCodes disponibles
router.get("/all", qrController.getAllQRCodes);

// Scanner un QR --> retourne état (vierge/associe)
router.get("/scan/:id", qrController.scanQRCode);

// Affichage du QR Code
router.get("/showqr/:id", qrController.showQRCode);

// Associer un QR vierge à un produit
router.post("/assign", qrController.assignQRCode);

// Mettre à jour un QR code (PUT)
router.put("/:id", qrController.updateQRCode);

// Supprimer un QR code (DELETE)
router.delete("/:id", qrController.deleteQRCode);

module.exports = router;
