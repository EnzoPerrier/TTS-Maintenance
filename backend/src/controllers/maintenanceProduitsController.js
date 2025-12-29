const db = require("../config/db.js");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configuration de Multer pour le stockage des images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/maintenance_produits/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "produit-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB max
    fields: 10 // Nombre maximum de champs non-fichiers
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Seules les images sont autorisées (jpeg, jpg, png, gif, webp)"));
    }
  }
});

// Middleware Multer pour l'upload - accepte un fichier + champs texte
exports.uploadMiddleware = upload.single("photo");

// GET /maintenance-produits/:id_maintenance - Récupérer tous les produits d'une maintenance
exports.getProduitsByMaintenance = async (req, res) => {
  const { id_maintenance } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT mp.*, p.nom, p.departement, p.description, p.id_site
       FROM maintenance_produits mp
       JOIN produits p ON mp.id_produit = p.id_produit
       WHERE mp.id_maintenance = ?
       ORDER BY p.nom ASC`,
      [id_maintenance]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /maintenance-produits/produit/:id_produit - Récupérer toutes les maintenances d'un produit
exports.getMaintenancesByProduit = async (req, res) => {
  const { id_produit } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT mp.*, m.date_maintenance, m.type, m.departement, m.commentaire as maintenance_commentaire
       FROM maintenance_produits mp
       JOIN maintenances m ON mp.id_maintenance = m.id_maintenance
       WHERE mp.id_produit = ?
       ORDER BY m.date_maintenance DESC`,
      [id_produit]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// POST /maintenance-produits - Associer un produit à une maintenance (avec photo optionnelle)
exports.addProduitToMaintenance = async (req, res) => {
  // Avec multer, les champs texte sont dans req.body
  const id_maintenance = req.body.id_maintenance;
  const id_produit = req.body.id_produit;
  const etat = req.body.etat;
  const commentaire = req.body.commentaire;
  const photo = req.file ? req.file.filename : null;

  console.log("Données reçues:", { id_maintenance, id_produit, etat, commentaire, photo });

  // Validation
  if (!id_maintenance || !id_produit) {
    if (photo) {
      const photoPath = `uploads/maintenance_produits/${photo}`;
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
    return res.status(400).json({ error: "ID maintenance et ID produit requis" });
  }

  try {
    // Vérifier si l'association existe déjà
    const [existing] = await db.query(
      `SELECT * FROM maintenance_produits 
       WHERE id_maintenance = ? AND id_produit = ?`,
      [id_maintenance, id_produit]
    );

    if (existing.length > 0) {
      // Supprimer le fichier uploadé si l'association existe déjà
      if (photo) {
        const photoPath = `uploads/maintenance_produits/${photo}`;
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      }
      return res.status(400).json({ error: "Ce produit est déjà associé à cette maintenance" });
    }

    await db.query(
      `INSERT INTO maintenance_produits (id_maintenance, id_produit, etat, commentaire, photo)
       VALUES (?, ?, ?, ?, ?)`,
      [id_maintenance, id_produit, etat || 'N/A', commentaire || null, photo]
    );

    res.status(201).json({
      message: "Produit associé à la maintenance",
      id_maintenance,
      id_produit,
      etat,
      commentaire,
      photo
    });
  } catch (err) {
    console.error(err);
    // Supprimer le fichier uploadé en cas d'erreur
    if (photo) {
      const photoPath = `uploads/maintenance_produits/${photo}`;
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// PUT /maintenance-produits/:id_maintenance/:id_produit - Mettre à jour l'état d'un produit dans une maintenance
exports.updateProduitMaintenance = async (req, res) => {
  const { id_maintenance, id_produit } = req.params;
  
  // Avec multer, les champs texte sont dans req.body
  const etat = req.body.etat;
  const commentaire = req.body.commentaire;
  const newPhoto = req.file ? req.file.filename : null;

  console.log("Données reçues pour update:", { id_maintenance, id_produit, etat, commentaire, newPhoto });

  try {
    // Récupérer l'ancienne photo pour la supprimer si une nouvelle est uploadée
    const [existing] = await db.query(
      `SELECT photo FROM maintenance_produits
       WHERE id_maintenance = ? AND id_produit = ?`,
      [id_maintenance, id_produit]
    );

    if (existing.length === 0) {
      if (newPhoto) {
        const photoPath = `uploads/maintenance_produits/${newPhoto}`;
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      }
      return res.status(404).json({ error: "Association non trouvée" });
    }

    const oldPhoto = existing[0].photo;

    // Construire la requête SQL dynamiquement
    let query = `UPDATE maintenance_produits SET etat = ?, commentaire = ?`;
    let params = [etat || 'N/A', commentaire || null];

    if (newPhoto) {
      query += `, photo = ?`;
      params.push(newPhoto);
    }

    query += ` WHERE id_maintenance = ? AND id_produit = ?`;
    params.push(id_maintenance, id_produit);

    const [result] = await db.query(query, params);

    // Supprimer l'ancienne photo si une nouvelle a été uploadée
    if (newPhoto && oldPhoto) {
      const oldPhotoPath = `uploads/maintenance_produits/${oldPhoto}`;
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    res.json({ 
      message: "État du produit mis à jour",
      photo: newPhoto || oldPhoto
    });
  } catch (err) {
    console.error(err);
    if (newPhoto) {
      const photoPath = `uploads/maintenance_produits/${newPhoto}`;
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// DELETE /maintenance-produits/:id_maintenance/:id_produit - Retirer un produit d'une maintenance
exports.removeProduitFromMaintenance = async (req, res) => {
  const { id_maintenance, id_produit } = req.params;

  try {
    // Récupérer la photo avant de supprimer l'association
    const [existing] = await db.query(
      `SELECT photo FROM maintenance_produits
       WHERE id_maintenance = ? AND id_produit = ?`,
      [id_maintenance, id_produit]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Association non trouvée" });
    }

    const photo = existing[0].photo;

    const [result] = await db.query(
      `DELETE FROM maintenance_produits
       WHERE id_maintenance = ? AND id_produit = ?`,
      [id_maintenance, id_produit]
    );

    // Supprimer la photo si elle existe
    if (photo) {
      const photoPath = `uploads/maintenance_produits/${photo}`;
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    res.json({ message: "Produit retiré de la maintenance" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};