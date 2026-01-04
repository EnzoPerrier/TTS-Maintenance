const db = require("../config/db.js");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configuration du stockage des fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "./uploads/produits";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Type de fichier non autorisé. Utilisez: JPG, PNG, GIF, WEBP"));
  }
});

// Middleware d'upload
exports.uploadMiddleware = upload.single("photo");
exports.uploadMultipleMiddleware = upload.array("photos", 5); 

// GET /photos/produit/:id_produit - Récupérer toutes les photos d'un produit
exports.getPhotosByProduit = async (req, res) => {
  const { id_produit } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT pp.*, m.date_maintenance, m.type as maintenance_type
       FROM produit_photos pp
       LEFT JOIN maintenances m ON pp.id_maintenance = m.id_maintenance
       WHERE pp.id_produit = ?
       ORDER BY pp.date_creation DESC`,
      [id_produit]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /photos/maintenance/:id_maintenance - Récupérer les photos d'une maintenance
exports.getPhotosByMaintenance = async (req, res) => {
  const { id_maintenance } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT pp.*, p.nom as produit_nom
       FROM produit_photos pp
       JOIN produits p ON pp.id_produit = p.id_produit
       WHERE pp.id_maintenance = ?
       ORDER BY pp.date_creation DESC`,
      [id_maintenance]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Récupérer les photos d'un produit spécifique dans une maintenance
exports.getPhotosByMaintenanceProduit = async (req, res) => {
  const { id_maintenance, id_produit } = req.params;
  
  /*console.log("Route appelée: /photos/maintenance/:id_maintenance/:id_produit");
  console.log("Params reçus:", { id_maintenance, id_produit });*/ //DEBUG

  try {
    const [rows] = await db.query(
      `SELECT pp.*
       FROM produit_photos pp
       WHERE pp.id_maintenance = ? AND pp.id_produit = ?
       ORDER BY pp.date_creation DESC`,
      [id_maintenance, id_produit]
    );
    
    console.log("Photos trouvées:", rows.length);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /photos/:id - Récupérer une photo spécifique
exports.getPhotoById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      "SELECT * FROM produit_photos WHERE id_photo = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Photo non trouvée" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// POST /photos - Ajouter une photo
exports.addPhoto = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucun fichier uploadé" });
  }

  const { id_produit, id_maintenance, commentaire } = req.body;

  if (!id_produit) {
    // Supprimer le fichier uploadé si pas de produit
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "ID produit requis" });
  }

  try {
    // ========== NOUVEAU: Vérifier la limite de 5 photos si maintenance ==========
    if (id_maintenance) {
      const [existingPhotos] = await db.query(
        `SELECT COUNT(*) as count FROM produit_photos 
         WHERE id_maintenance = ? AND id_produit = ?`,
        [id_maintenance, id_produit]
      );

      if (existingPhotos[0].count >= 5) {
        // Supprimer le fichier uploadé si limite atteinte
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          error: "Limite de 5 photos atteinte pour ce produit dans cette maintenance" 
        });
      }
    }

    const chemin_photo = `/uploads/produits/${req.file.filename}`;

    const [result] = await db.query(
      `INSERT INTO produit_photos (id_produit, id_maintenance, chemin_photo, commentaire)
       VALUES (?, ?, ?, ?)`,
      [id_produit, id_maintenance || null, chemin_photo, commentaire || null]
    );

    res.status(201).json({
      id_photo: result.insertId,
      id_produit,
      id_maintenance: id_maintenance || null,
      chemin_photo,
      commentaire: commentaire || null
    });
  } catch (err) {
    // Supprimer le fichier en cas d'erreur
    fs.unlinkSync(req.file.path);
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// POST /photos/multiple - Ajouter plusieurs photos à la fois
exports.addMultiplePhotos = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "Aucun fichier uploadé" });
  }

  const { id_produit, id_maintenance, commentaire } = req.body;

  if (!id_produit) {
    // Supprimer tous les fichiers uploadés
    req.files.forEach(file => fs.unlinkSync(file.path));
    return res.status(400).json({ error: "ID produit requis" });
  }

  try {
    // Vérifier la limite de 5 photos si maintenance
    if (id_maintenance) {
      const [existingPhotos] = await db.query(
        `SELECT COUNT(*) as count FROM produit_photos 
         WHERE id_maintenance = ? AND id_produit = ?`,
        [id_maintenance, id_produit]
      );

      const currentCount = existingPhotos[0].count;
      const newCount = currentCount + req.files.length;

      if (newCount > 5) {
        // Supprimer tous les fichiers uploadés
        req.files.forEach(file => fs.unlinkSync(file.path));
        return res.status(400).json({ 
          error: `Limite de 5 photos dépassée. Vous avez ${currentCount} photo(s), vous tentez d'en ajouter ${req.files.length}. Maximum autorisé: ${5 - currentCount} photo(s) supplémentaire(s).`
        });
      }
    }

    const photosAdded = [];

    // Insérer toutes les photos
    for (const file of req.files) {
      const chemin_photo = `/uploads/produits/${file.filename}`;

      const [result] = await db.query(
        `INSERT INTO produit_photos (id_produit, id_maintenance, chemin_photo, commentaire)
         VALUES (?, ?, ?, ?)`,
        [id_produit, id_maintenance || null, chemin_photo, commentaire || null]
      );

      photosAdded.push({
        id_photo: result.insertId,
        chemin_photo
      });
    }

    res.status(201).json({
      message: `${photosAdded.length} photo(s) ajoutée(s) avec succès`,
      photos: photosAdded,
      id_produit,
      id_maintenance: id_maintenance || null
    });

  } catch (err) {
    // Supprimer tous les fichiers en cas d'erreur
    req.files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// PUT /photos/:id - Mettre à jour une photo (commentaire uniquement)
exports.updatePhoto = async (req, res) => {
  const { id } = req.params;
  const { commentaire } = req.body;

  try {
    const [result] = await db.query(
      "UPDATE produit_photos SET commentaire = ? WHERE id_photo = ?",
      [commentaire || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Photo non trouvée" });
    }

    res.json({ message: "Photo mise à jour" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// DELETE /photos/:id - Supprimer une photo
exports.deletePhoto = async (req, res) => {
  const { id } = req.params;

  try {
    // Récupérer le chemin de la photo
    const [rows] = await db.query(
      "SELECT chemin_photo FROM produit_photos WHERE id_photo = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Photo non trouvée" });
    }

    // Supprimer le fichier physique
    const filePath = `.${rows[0].chemin_photo}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Supprimer de la base de données
    await db.query("DELETE FROM produit_photos WHERE id_photo = ?", [id]);

    res.json({ message: "Photo supprimée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /photos/latest/:id_produit - Récupérer la dernière photo d'un produit
exports.getLatestPhoto = async (req, res) => {
  const { id_produit } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT pp.*, m.date_maintenance, m.type as maintenance_type
       FROM produit_photos pp
       LEFT JOIN maintenances m ON pp.id_maintenance = m.id_maintenance
       WHERE pp.id_produit = ?
       ORDER BY pp.date_creation DESC
       LIMIT 1`,
      [id_produit]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Aucune photo trouvée" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};