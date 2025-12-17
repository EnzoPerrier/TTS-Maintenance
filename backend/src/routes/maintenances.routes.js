const express = require("express");
const router = express.Router();
const maintenancesController = require("../controllers/maintenancesController.js");

router.get("/", maintenancesController.getAllMaintenances);
router.get("/:id", maintenancesController.getMaintenanceById);
router.post("/", maintenancesController.createMaintenance);
router.put("/:id", maintenancesController.updateMaintenance);
router.delete("/:id", maintenancesController.deleteMaintenance);

module.exports = router;
