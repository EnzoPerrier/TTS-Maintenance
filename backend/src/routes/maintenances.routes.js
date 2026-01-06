const express = require("express");
const router = express.Router();
const maintenancesController = require("../controllers/maintenancesController.js");

router.get("/", maintenancesController.getAllMaintenances);
router.get("/details", maintenancesController.getAllMaintenancesDetails);
router.get("/AllMaintenancesBySiteID/:id", maintenancesController.getAllMaintenancesBySiteID);
router.get("/details/:id", maintenancesController.getDetailsMaintenance);
router.get("/:id", maintenancesController.getMaintenanceById);
router.post("/", maintenancesController.createMaintenance);
router.put("/:id", maintenancesController.updateMaintenance);
router.delete("/:id", maintenancesController.deleteMaintenance);

module.exports = router;
