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
    fileSize: 5 * 1024 * 1024,
    fields: 10
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
      `SELECT mp.*, m.date_maintenance, m.type, m.commentaire as maintenance_commentaire
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

// POST /maintenance-produits - Associer un produit à une maintenance
exports.addProduitToMaintenance = async (req, res) => {
  const id_maintenance = req.body.id_maintenance;
  const id_produit = req.body.id_produit;
  const etat = req.body.etat;
  const commentaire = req.body.commentaire;
  const etat_constate = req.body.etat_constate;
  const travaux_effectues = req.body.travaux_effectues;
  const ri_interne = req.body.ri_interne;
  const photo = req.file ? req.file.filename : null;

  console.log("Données reçues:", { 
    id_maintenance, 
    id_produit, 
    etat, 
    commentaire, 
    etat_constate,
    travaux_effectues,
    ri_interne,
    photo 
  });

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
      if (photo) {
        const photoPath = `uploads/maintenance_produits/${photo}`;
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      }
      return res.status(400).json({ error: "Ce produit est déjà associé à cette maintenance" });
    }

    // Insérer l'association maintenance-produit avec les nouveaux champs
    await db.query(
      `INSERT INTO maintenance_produits (
        id_maintenance, 
        id_produit, 
        etat, 
        commentaire, 
        photo,
        etat_constate,
        travaux_effectues,
        ri_interne
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_maintenance, 
        id_produit, 
        etat || 'N/A', 
        commentaire || null, 
        photo,
        etat_constate || null,
        travaux_effectues || null,
        ri_interne || null
      ]
    );

    // Mettre à jour l'état du produit si un état est fourni
    if (etat && etat !== 'N/A') {
      await db.query(
        `UPDATE produits SET etat = ? WHERE id_produit = ?`,
        [etat, id_produit]
      );
      console.log(`État du produit ${id_produit} mis à jour: ${etat}`);
    }

    res.status(201).json({
      message: "Produit associé à la maintenance",
      id_maintenance,
      id_produit,
      etat,
      commentaire,
      etat_constate,
      travaux_effectues,
      ri_interne,
      photo
    });
  } catch (err) {
    console.error(err);
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
  
  const etat = req.body.etat;
  const commentaire = req.body.commentaire;
  const etat_constate = req.body.etat_constate;
  const travaux_effectues = req.body.travaux_effectues;
  const ri_interne = req.body.ri_interne;
  const newPhoto = req.file ? req.file.filename : null;

  console.log("Données reçues pour update:", { 
    id_maintenance, 
    id_produit, 
    etat, 
    commentaire,
    etat_constate,
    travaux_effectues,
    ri_interne,
    newPhoto 
  });

  try {
    // Récupérer l'ancienne photo
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
    let query = `UPDATE maintenance_produits SET 
      etat = ?, 
      commentaire = ?,
      etat_constate = ?,
      travaux_effectues = ?,
      ri_interne = ?`;
    let params = [
      etat || 'N/A', 
      commentaire || null,
      etat_constate || null,
      travaux_effectues || null,
      ri_interne || null
    ];

    if (newPhoto) {
      query += `, photo = ?`;
      params.push(newPhoto);
    }

    query += ` WHERE id_maintenance = ? AND id_produit = ?`;
    params.push(id_maintenance, id_produit);

    await db.query(query, params);

    // Mettre à jour l'état du produit dans la table produits
    if (etat && etat !== 'N/A') {
      await db.query(
        `UPDATE produits SET etat = ? WHERE id_produit = ?`,
        [etat, id_produit]
      );
      console.log(`État du produit ${id_produit} mis à jour: ${etat}`);
    }

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
    // 1. Récupérer toutes les photos liées à cette association maintenance-produit
    const [photos] = await db.query(
      `SELECT id_photo, chemin_photo FROM produit_photos
       WHERE id_maintenance = ? AND id_produit = ?`,
      [id_maintenance, id_produit]
    );

    // 2. Supprimer les fichiers physiques des photos
    const fs = require('fs');
    const path = require('path');
    
    photos.forEach(photo => {
      const filePath = path.join(__dirname, '..', '..', photo.chemin_photo);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Photo supprimée: ${filePath}`);
      }
    });

    // 3. Supprimer les entrées des photos dans la base de données
    await db.query(
      `DELETE FROM produit_photos
       WHERE id_maintenance = ? AND id_produit = ?`,
      [id_maintenance, id_produit]
    );

    // 4. Vérifier que l'association existe
    const [existing] = await db.query(
      `SELECT photo FROM maintenance_produits
       WHERE id_maintenance = ? AND id_produit = ?`,
      [id_maintenance, id_produit]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Association non trouvée" });
    }

    const photo = existing[0].photo;

    // 5. Supprimer l'association maintenance-produit
    await db.query(
      `DELETE FROM maintenance_produits
       WHERE id_maintenance = ? AND id_produit = ?`,
      [id_maintenance, id_produit]
    );

    // 6. Supprimer la photo de l'ancienne table (si elle existe)
    if (photo) {
      const photoPath = `uploads/maintenance_produits/${photo}`;
      const fullPath = path.join(__dirname, '..', '..', photoPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`Ancienne photo supprimée: ${fullPath}`);
      }
    }

    res.json({ 
      message: "Produit retiré de la maintenance",
      photos_supprimees: photos.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};