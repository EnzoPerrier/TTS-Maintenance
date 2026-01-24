const express = require("express");
const router = express.Router();
const maintenancesController = require("../controllers/maintenancesController.js");

// Routes spécifiques AVANT /:id
router.get("/:id/html", maintenancesController.generateMaintenanceHTML);
router.get("/:id/pdf", maintenancesController.generateMaintenancePDF);
router.get("/AllMaintenancesBySiteID/:id", maintenancesController.getAllMaintenancesBySiteID);

router.get("/", maintenancesController.getAllMaintenances);
router.get("/:id", maintenancesController.getMaintenanceById);
router.post("/", maintenancesController.createMaintenance);
router.put("/:id", maintenancesController.updateMaintenance);
router.delete("/:id", maintenancesController.deleteMaintenance);

module.exports = router;