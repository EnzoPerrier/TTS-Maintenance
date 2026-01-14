const express = require("express");
const router = express.Router();
const maintenancesController = require("../controllers/maintenancesController.js");

// IMPORTANT: Routes spécifiques AVANT les routes génériques
router.get("/", maintenancesController.getAllMaintenances);
router.get("/AllMaintenancesBySiteID/:id", maintenancesController.getAllMaintenancesBySiteID);
router.get("/:id", maintenancesController.getMaintenanceById);
router.post("/", maintenancesController.createMaintenance);
router.put("/:id", maintenancesController.updateMaintenance);
router.delete("/:id", maintenancesController.deleteMaintenance);

module.exports = router;