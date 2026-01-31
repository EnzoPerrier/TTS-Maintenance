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

exports.generateQRCodes = async (req, res) => {
  const { count = 1, prefill } = req.body;

  try {
    const qrCodes = [];

    for (let i = 0; i < count; i++) {

      const id_produit = prefill?.id_produit ?? null;
      const etat = id_produit ? "associe" : "vierge";

      const [result] = await db.query(
        `INSERT INTO qr_codes (id_produit, etat)
         VALUES (?, ?)`,
        [id_produit, etat]
      );

      const id_qr = result.insertId;

      const payload = { id_qr };
      const qrContent = JSON.stringify(payload);
      const qrDataUrl = await QRCode.toDataURL(qrContent);

      qrCodes.push({ id_qr, qrDataUrl });
    }

    res.json({ qrCodes });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


// Affichage du QRCode
exports.showQRCode = async (req, res) => {
  const { id } = req.params; // id_produit passé depuis printQR

  try {
    console.log('Affichage QR pour produit:', id);

    // Récupérer le QR code via id_produit
    const [rows] = await db.query(
      `SELECT id_qr, id_produit FROM qr_codes WHERE id_produit = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).send("QR code introuvable pour ce produit");
    }

    const { id_qr, id_produit } = rows[0];
    console.log('QR trouvé - id_qr:', id_qr, 'id_produit:', id_produit);

    // Générer le QR code avec id_qr ET id_produit
    const qrContent = JSON.stringify({ 
      id_qr: id_qr,
      id_produit: id_produit 
    });
    
    const qrDataUrl = await QRCode.toDataURL(qrContent);

    // Envoyer du HTML minimal
    res.send(`
      <html>
        <head>
          <title>QR Code - Produit ${id_produit}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 2rem;
              border-radius: 16px;
              box-shadow: 0 8px 24px rgba(0,0,0,0.2);
              text-align: center;
            }
            h1 {
              color: #333;
              margin-bottom: 1rem;
            }
            .info {
              color: #666;
              margin-bottom: 1rem;
              font-size: 14px;
            }
            img {
              margin-top: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📦 QR Code Produit</h1>
            <div class="info">
              <strong>ID Produit:</strong> ${id_produit}<br/>
              <strong>ID QR:</strong> ${id_qr}
            </div>
            <img src="${qrDataUrl}" alt="QR Code Produit ${id_produit}" />
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Erreur showQRCode:', err);
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
      [qr.id_produit]
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
       SET id_produit = ?, etat = 'associe'
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
  const { id_produit, site_id, type, etat } = req.body;

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
       SET id_produit = ?, site_id = ?, type = ?, etat = ?
       WHERE id_qr = ?`,
      [
        id_produit ?? rows[0].id_produit,
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
