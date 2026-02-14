const db = require("../config/db.js");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Fonction utilitaire pour formater les dates au format JJ/MM/AAAA
function formatDateForDisplay(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

// Fonction pour garder le format YYYY-MM-DD pour les inputs
function formatDateForInput(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatPhotoDate(photo) {
  if (photo.date_creation) {
    photo.date_creation_input = formatDateForInput(photo.date_creation);
    photo.date_creation = formatDateForDisplay(photo.date_creation);
  }
  if (photo.date_maintenance) {
    photo.date_maintenance_input = formatDateForInput(photo.date_maintenance);
    photo.date_maintenance = formatDateForDisplay(photo.date_maintenance);
  }
  return photo;
}

// Fonction helper pour récupérer les infos du produit (client, site, nom produit)
async function getProduitInfos(id_produit) {
  const [rows] = await db.query(
    `SELECT p.nom as produit_nom, s.nom as site_nom, c.nom as client_nom
     FROM produits p
     JOIN sites s ON p.id_site = s.id_site
     JOIN clients c ON s.id_client = c.id_client
     WHERE p.id_produit = ?`,
    [id_produit]
  );
  
  if (rows.length === 0) {
    throw new Error("Produit non trouvé");
  }
  
  return rows[0];
}

// Fonction pour nettoyer les noms de fichiers/dossiers (enlever caractères spéciaux)
function sanitizeFolderName(name) {
  return name
    .replace(/[^a-zA-Z0-9_\-]/g, '_') // Remplace tout caractère spécial par _
    .replace(/_+/g, '_')               // Remplace plusieurs _ consécutifs par un seul
    .replace(/^_|_$/g, '');            // Enlève les _ au début et à la fin
}

// Configuration du stockage temporaire
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = "./uploads/temp";
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    // Nom temporaire unique
    const tempName = `temp_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, tempName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi/; // Photos et vidéos
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Type de fichier non autorisé. Utilisez: JPG, PNG, GIF, WEBP, MP4, MOV ou AVI"));
  }
});

// Middleware d'upload
exports.uploadMiddleware = upload.single("photo");
exports.uploadMultipleMiddleware = upload.array("photos", 5); 

// Fonction pour déplacer un fichier temporaire vers sa destination finale
async function moveToFinalDestination(tempPath, id_produit, originalExt) {
  // Récupérer les infos du produit
  const infos = await getProduitInfos(id_produit);
  
  // Créer le chemin : uploads/[nom_client]/[nom_site]
  const clientFolder = sanitizeFolderName(infos.client_nom);
  const siteFolder = sanitizeFolderName(infos.site_nom);
  const finalDir = `./uploads/${clientFolder}/${siteFolder}`;
  
  // Créer les dossiers s'ils n'existent pas
  if (!fs.existsSync(finalDir)) {
    fs.mkdirSync(finalDir, { recursive: true });
  }
  
  // Créer le nom : [nom_produit]_[date]_[timestamp]_[random].[extension]
  const produitName = sanitizeFolderName(infos.produit_nom);
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const randomStr = Math.round(Math.random() * 1E6).toString().padStart(6, '0');
  
  const finalFilename = `${produitName}_${dateStr}_${timeStr}_${randomStr}${originalExt}`;
  const finalPath = path.join(finalDir, finalFilename);
  
  // Déplacer le fichier
  fs.renameSync(tempPath, finalPath);
  
  // Retourner le chemin relatif pour la BDD
  return `/uploads/${clientFolder}/${siteFolder}/${finalFilename}`;
}

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

    const formattedRows = rows.map(formatPhotoDate);
    res.json(formattedRows);
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

    const formattedRows = rows.map(formatPhotoDate);
    res.json(formattedRows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Récupérer les photos d'un produit spécifique dans une maintenance
exports.getPhotosByMaintenanceProduit = async (req, res) => {
  const { id_maintenance, id_produit } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT pp.*
       FROM produit_photos pp
       WHERE pp.id_maintenance = ? AND pp.id_produit = ?
       ORDER BY pp.date_creation DESC`,
      [id_maintenance, id_produit]
    );
    
    const formattedRows = rows.map(formatPhotoDate);
    res.json(formattedRows);
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

    const photo = formatPhotoDate(rows[0]);
    res.json(photo);
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
    // Supprimer le fichier temporaire
    fs.unlinkSync(req.file.path);
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

      if (existingPhotos[0].count >= 5) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          error: "Limite de 5 photos atteinte pour ce produit dans cette maintenance" 
        });
      }
    }

    // Déplacer le fichier vers sa destination finale
    const chemin_photo = await moveToFinalDestination(
      req.file.path,
      id_produit,
      path.extname(req.file.originalname)
    );

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
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error(err);
    res.status(500).json({ error: err.message || "Erreur serveur" });
  }
};

// POST /photos/multiple - Ajouter plusieurs photos à la fois
exports.addMultiplePhotos = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "Aucun fichier uploadé" });
  }

  const { id_produit, id_maintenance, commentaire } = req.body;

  if (!id_produit) {
    // Supprimer tous les fichiers temporaires
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
        req.files.forEach(file => fs.unlinkSync(file.path));
        return res.status(400).json({ 
          error: `Limite de 5 photos dépassée. Vous avez ${currentCount} photo(s), vous tentez d'en ajouter ${req.files.length}. Maximum autorisé: ${5 - currentCount} photo(s) supplémentaire(s).`
        });
      }
    }

    const photosAdded = [];

    // Traiter chaque fichier
    for (const file of req.files) {
      // Déplacer vers la destination finale
      const chemin_photo = await moveToFinalDestination(
        file.path,
        id_produit,
        path.extname(file.originalname)
      );

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
    // Supprimer tous les fichiers temporaires en cas d'erreur
    req.files.forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
    console.error(err);
    res.status(500).json({ error: err.message || "Erreur serveur" });
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

    const photo = formatPhotoDate(rows[0]);
    res.json(photo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};