const express = require("express");
const router = express.Router();
const sitesController = require("../controllers/sitesController.js");

router.get("/", sitesController.getAllSites);
router.get("/:id", sitesController.getSiteById);
router.post("/", sitesController.createSite);
router.put("/:id", sitesController.updateSite);
router.delete("/:id", sitesController.deleteSite);

module.exports = router;
