const QRCode = require("qrcode");
const db = require("../config/db.js");


// Liste de tous les QR codes
exports.getAllQRCodes = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM qr_codes ORDER BY id_qr DESC`
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "AUCUN QR code enregistré"
      });
    }

    return res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Générer un ou plusieurs QR codes (vides ou préremplis)
exports.generateQRCodes = async (req, res) => {
  const { count = 1, prefill } = req.body;

  try {
    const qrCodes = [];

    for (let i = 0; i < count; i++) {

      // Insertion dans la base : permet de créer un QR vierge ou déjà prérempli
      const [result] = await db.query(
        `INSERT INTO qr_codes (produit_id, site_id, type, etat)
         VALUES (?, ?, ?, ?)`,
        [
          prefill?.produit_id || null,
          prefill?.site_id || null,
          prefill?.type || null,
          prefill ? "associe" : "vierge"
        ]
      );

      // Récupération de l'identifiant généré automatiquement
      const id_qr = result.insertId;

      // Contenu réel du QR code encodé
      const payload = { id_qr };
      const qrContent = JSON.stringify(payload);

      // Génération du QR code en base64
      const qrDataUrl = await QRCode.toDataURL(qrContent);

      qrCodes.push({ id_qr, qrDataUrl });
    }

    res.json({ qrCodes });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Affichage du QRCode
exports.showQRCode = async (req, res) => {
  const { id } = req.params;

  try {
    // Récupérer le QR depuis la base
    const [rows] = await db.query(
      `SELECT id_qr FROM qr_codes WHERE id_qr = ?`,
      [id]
    );

    if (rows.length === 0) return res.status(404).send("QR code introuvable");

    // Générer le QR code en base64
    const qrContent = JSON.stringify({ id_qr: id });
    const qrDataUrl = await QRCode.toDataURL(qrContent);

    // Envoyer du HTML minimal
    res.send(`
      <html>
        <head><title>QR Code ${id}</title></head>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;">
          <img src="${qrDataUrl}" alt="QR Code ${id}" />
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur serveur");
  }
};


// Scanner un QR code pour connaître son état (vierge ou associé à un produit)
exports.scanQRCode = async (req, res) => {
  const { id } = req.params;

  try {
    // Recherche du QR code
    const [rows] = await db.query(
      `SELECT * FROM qr_codes WHERE id_qr = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "QR code inconnu" });
    }

    const qr = rows[0];

    // Le QR est vierge : uniquement l'état est retourné
    if (qr.etat === "vierge") {
      return res.json({
        status: "vierge",
        message: "QR code non associé",
        id_qr: qr.id_qr
      });
    }

    // Le QR est associé : on retourne aussi les informations du produit
    const [product] = await db.query(
      `SELECT * FROM produits WHERE id_produit = ?`,
      [qr.produit_id]
    );

    return res.json({
      status: "associe",
      produit: product[0] || null,
      id_qr: qr.id_qr
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};


// Associer un QR code vierge à un nouveau produit
exports.assignQRCode = async (req, res) => {
  const { id_qr, nom, site_id, type, date_installation } = req.body;

  try {
    // Vérification que le QR existe et est vierge
    const [rows] = await db.query(
      `SELECT * FROM qr_codes WHERE id_qr = ?`,
      [id_qr]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "QR code introuvable" });

    if (rows[0].etat !== "vierge")
      return res.status(400).json({ error: "QR code déjà associé" });

    // Création du produit lié
    const [productResult] = await db.query(
      `INSERT INTO produits (nom, site_id, type, date_installation)
       VALUES (?, ?, ?, ?)`,
      [nom, site_id, type, date_installation]
    );

    const id_produit = productResult.insertId;

    // Mise à jour du QR code avec le produit nouvellement créé
    await db.query(
      `UPDATE qr_codes
       SET produit_id = ?, etat = 'associe'
       WHERE id_qr = ?`,
      [id_produit, id_qr]
    );

    res.json({
      message: "Produit associé au QR code",
      id_qr,
      id_produit
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Mettre à jour un QR code (ex: changer produit, site, type ou état)
exports.updateQRCode = async (req, res) => {
  const { id } = req.params;
  const { produit_id, site_id, type, etat } = req.body;

  try {
    // Vérification que le QR existe
    const [rows] = await db.query(
      `SELECT * FROM qr_codes WHERE id_qr = ?`,
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "QR code introuvable" });

    // Mise à jour du QR code
    await db.query(
      `UPDATE qr_codes 
       SET produit_id = ?, site_id = ?, type = ?, etat = ?
       WHERE id_qr = ?`,
      [
        produit_id ?? rows[0].produit_id,
        site_id ?? rows[0].site_id,
        type ?? rows[0].type,
        etat ?? rows[0].etat,
        id
      ]
    );

    res.json({ message: "QR code mis à jour", id_qr: id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// Supprimer un QR code de la base
exports.deleteQRCode = async (req, res) => {
  const { id } = req.params;

  try {
    // Vérification que le QR existe
    const [rows] = await db.query(
      `SELECT * FROM qr_codes WHERE id_qr = ?`,
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "QR code introuvable" });

    // Suppression définitive
    await db.query(
      `DELETE FROM qr_codes WHERE id_qr = ?`,
      [id]
    );

    res.json({ message: "QR code supprimé", id_qr: id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
