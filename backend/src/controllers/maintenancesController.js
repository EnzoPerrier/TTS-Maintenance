const db = require("../config/db.js");
const handlebars = require('handlebars');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Charger le template HTML au démarrage
let templateHTML;
(async () => {
  try {
    templateHTML = await fs.readFile(
      path.join(__dirname, '../pdf/templates', 'maintenanceReport.html'),
      'utf-8'
    );
  } catch (err) {
    console.error('Erreur chargement template:', err);
  }
})();

// Fonction utilitaire pour formater les dates au format JJ/MM/AAAA
function formatDateForDisplay(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

// Fonction pour formater les heures (HH:MM:SS -> HHhMM)
function formatTimeForDisplay(timeString) {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  return `${hours}h${minutes}`;
}

// Fonction pour parser l'état constaté (texte -> structure)
function parseEtatConstate(texte) {
  if (!texte) return [];
  
  const lignes = texte.split('\n').filter(l => l.trim());
  const grouped = [];
  let currentZone = null;
  let currentSousZone = null;
  
  lignes.forEach(ligne => {
    ligne = ligne.trim();
    
    if (/^\d+\.\s+[A-Z\s:]+:$/.test(ligne)) {
      currentZone = {
        titre: ligne,
        sousSection: []
      };
      grouped.push(currentZone);
      currentSousZone = null;
    }
    else if (/^\d+\.\d+\)/.test(ligne)) {
      if (!currentZone) {
        currentZone = {
          titre: 'CONSTAT',
          sousSection: []
        };
        grouped.push(currentZone);
      }
      currentSousZone = {
        titre: ligne,
        items: []
      };
      currentZone.sousSection.push(currentSousZone);
    }
    else if (ligne.startsWith('-')) {
      if (currentSousZone) {
        currentSousZone.items.push(ligne);
      } else if (currentZone) {
        if (currentZone.sousSection.length === 0) {
          currentSousZone = {
            titre: '',
            items: []
          };
          currentZone.sousSection.push(currentSousZone);
        } else {
          currentSousZone = currentZone.sousSection[currentZone.sousSection.length - 1];
        }
        currentSousZone.items.push(ligne);
      }
    }
  });
  
  return grouped;
}

function generateEtatConstateHTML(etatsGroupes) {
  if (!etatsGroupes || etatsGroupes.length === 0) {
    return '<p>Aucun état constaté</p>';
  }
  
  let html = '';
  
  etatsGroupes.forEach(section => {
    if (section.titre) {
      html += `<h3>${section.titre}</h3>`;
    }
    
    if (section.sousSection && Array.isArray(section.sousSection)) {
      section.sousSection.forEach(sous => {
        if (sous.titre) {
          html += `<h4>${sous.titre}</h4>`;
        }
        if (sous.items && Array.isArray(sous.items)) {
          sous.items.forEach(item => {
            html += `<p>${item}</p>`;
          });
        }
      });
    }
  });
  
  return html;
}

function combineEtatsConstates(produits) {
  let allEtats = [];
  
  produits.forEach((produit, index) => {
    if (produit.etat_constate) {
      const parsed = parseEtatConstate(produit.etat_constate);
      
      if (produits.length > 1) {
        allEtats.push({
          titre: `PRODUIT ${index + 1}: ${produit.produit_nom}`,
          sousSection: []
        });
      }
      
      allEtats = allEtats.concat(parsed);
    }
  });
  
  return allEtats;
}

function combineTravauxEffectues(produits) {
  let allTravaux = [];
  
  produits.forEach((produit, index) => {
    if (produit.travaux_effectues) {
      const lignes = produit.travaux_effectues.split('\n').filter(l => l.trim());
      
      if (produits.length > 1) {
        allTravaux.push(`<h4>PRODUIT ${index + 1}: ${produit.produit_nom}</h4>`);
      }
      
      lignes.forEach(ligne => {
        ligne = ligne.trim();
        if (!ligne.startsWith('-')) {
          ligne = '- ' + ligne;
        }
        allTravaux.push(`<p>${ligne}</p>`);
      });
    }
  });
  
  return allTravaux.length > 0 ? allTravaux.join('') : '<p>Aucun travail effectué</p>';
}

function transformDataForTemplate(maintenance, site, produits) {
  const operateurs = [
    maintenance.operateur_1,
    maintenance.operateur_2,
    maintenance.operateur_3
  ].filter(Boolean).join(' & ');
  
  const nomsProduitsStr = produits.map(p => p.produit_nom).join(', ');
  const etatsGroupes = combineEtatsConstates(produits);
  const travauxHTML = combineTravauxEffectues(produits);
  
  const joursSemaine = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const dateObj = new Date(maintenance.date_maintenance);
  const jourIndex = dateObj.getDay();
  const jourActuel = joursSemaine[jourIndex];
  
  const tempsParJour = {
    lundi: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    mardi: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    mercredi: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    jeudi: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    vendredi: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    samedi: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    dimanche: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } }
  };
  
  if (jourActuel && tempsParJour[jourActuel]) {
    tempsParJour[jourActuel].matin.arrivee = formatTimeForDisplay(maintenance.heure_arrivee_matin);
    tempsParJour[jourActuel].matin.depart = formatTimeForDisplay(maintenance.heure_depart_matin);
    tempsParJour[jourActuel].apm.arrivee = formatTimeForDisplay(maintenance.heure_arrivee_aprem);
    tempsParJour[jourActuel].apm.depart = formatTimeForDisplay(maintenance.heure_depart_aprem);
  }
  
  const typeChecked = {
    installation: maintenance.type === 'Installation' ? 'checked' : '',
    curatif: maintenance.type === 'Curatif' ? 'checked' : '',
    revision: maintenance.type === 'Révision' || maintenance.type === 'Preventif' ? 'checked' : '',
    garantie: maintenance.garantie ? 'checked' : ''
  };
  
  return {
    chrono: maintenance.numero_ri || '',
    date: formatDateForDisplay(maintenance.date_maintenance),
    technicien: operateurs || '',
    client: maintenance.client_nom || maintenance.site_nom || '',
    contact: maintenance.client_contact || maintenance.contact || '',
    typePanneau: maintenance.type_produit || nomsProduitsStr,
    numAffaire: maintenance.numero_commande || '',
    
    lundiMatin: tempsParJour.lundi.matin.arrivee,
    lundiMatinDepart: tempsParJour.lundi.matin.depart,
    lundiApm: tempsParJour.lundi.apm.arrivee,
    lundiApmDepart: tempsParJour.lundi.apm.depart,
    
    mardiMatin: tempsParJour.mardi.matin.arrivee,
    mardiMatinDepart: tempsParJour.mardi.matin.depart,
    mardiApm: tempsParJour.mardi.apm.arrivee,
    mardiApmDepart: tempsParJour.mardi.apm.depart,
    
    mercrediMatin: tempsParJour.mercredi.matin.arrivee,
    mercrediMatinDepart: tempsParJour.mercredi.matin.depart,
    mercrediApm: tempsParJour.mercredi.apm.arrivee,
    mercrediApmDepart: tempsParJour.mercredi.apm.depart,
    
    jeudiMatin: tempsParJour.jeudi.matin.arrivee,
    jeudiMatinDepart: tempsParJour.jeudi.matin.depart,
    jeudiApm: tempsParJour.jeudi.apm.arrivee,
    jeudiApmDepart: tempsParJour.jeudi.apm.depart,
    
    vendrediMatin: tempsParJour.vendredi.matin.arrivee,
    vendrediMatinDepart: tempsParJour.vendredi.matin.depart,
    vendrediApm: tempsParJour.vendredi.apm.arrivee,
    vendrediApmDepart: tempsParJour.vendredi.apm.depart,
    
    samediMatin: tempsParJour.samedi.matin.arrivee,
    samediMatinDepart: tempsParJour.samedi.matin.depart,
    samediApm: tempsParJour.samedi.apm.arrivee,
    samediApmDepart: tempsParJour.samedi.apm.depart,
    
    dimancheMatin: tempsParJour.dimanche.matin.arrivee,
    dimancheMatinDepart: tempsParJour.dimanche.matin.depart,
    dimancheApm: tempsParJour.dimanche.apm.arrivee,
    dimancheApmDepart: tempsParJour.dimanche.apm.depart,
    
    installationChecked: typeChecked.installation,
    curatifChecked: typeChecked.curatif,
    revisionChecked: typeChecked.revision,
    garantieChecked: typeChecked.garantie,
    contratChecked: '',
    locationChecked: '',
    accidentChecked: '',
    vandalismeChecked: '',
    orageChecked: '',
    
    etatConstateContent: generateEtatConstateHTML(etatsGroupes),
    travauxEffectuesContent: travauxHTML,
    
    interventionTermineeChecked: maintenance.etat === 'Terminé' ? 'checked' : '',
    signatureTTS: operateurs || '',
    signatureClient: ''
  };
}

// GET /maintenances → toutes les maintenances
exports.getAllMaintenances = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM maintenances");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /maintenances/:id  
exports.getMaintenanceById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      "SELECT * FROM maintenances WHERE id_maintenance = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Maintenance non trouvée" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /maintenances/AllMaintenancesBySiteID/:id 
exports.getAllMaintenancesBySiteID = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(
      "SELECT * FROM maintenances WHERE id_site = ? ORDER BY date_maintenance DESC",
      [id]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /maintenances/:id/html --> générer le rapport en HTML
exports.generateMaintenanceHTML = async (req, res) => {
  const { id } = req.params;

  try {
    const [maintenance] = await db.query(`
      SELECT m.*, 
             s.nom as site_nom, 
             s.adresse as site_adresse,
             c.nom as client_nom,
             c.contact as client_contact
      FROM maintenances m
      LEFT JOIN sites s ON m.id_site = s.id_site
      LEFT JOIN clients c ON s.id_client = c.id_client
      WHERE m.id_maintenance = ?
    `, [id]);

    if (maintenance.length === 0)
      return res.status(404).json({ error: "Maintenance non trouvée" });

    const [produits] = await db.query(`
      SELECT mp.etat, mp.commentaire, mp.etat_constate, mp.travaux_effectues, 
             p.nom as produit_nom, p.description as produit_description
      FROM maintenance_produits mp
      LEFT JOIN produits p ON mp.id_produit = p.id_produit
      WHERE mp.id_maintenance = ?
    `, [id]);

    const data = transformDataForTemplate(maintenance[0], maintenance[0], produits);
    const template = handlebars.compile(templateHTML);
    const html = template(data);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /maintenances/:id/pdf --> générer le rapport en PDF
exports.generateMaintenancePDF = async (req, res) => {
  const { id } = req.params;
  let browser;

  try {
    const [maintenance] = await db.query(`
      SELECT m.*, 
             s.nom as site_nom, 
             s.adresse as site_adresse,
             c.nom as client_nom,
             c.contact as client_contact
      FROM maintenances m
      LEFT JOIN sites s ON m.id_site = s.id_site
      LEFT JOIN clients c ON s.id_client = c.id_client
      WHERE m.id_maintenance = ?
    `, [id]);

    if (maintenance.length === 0)
      return res.status(404).json({ error: "Maintenance non trouvée" });

    const [produits] = await db.query(`
      SELECT mp.etat, mp.commentaire, mp.etat_constate, mp.travaux_effectues,
             p.nom as produit_nom, p.description as produit_description
      FROM maintenance_produits mp
      LEFT JOIN produits p ON mp.id_produit = p.id_produit
      WHERE mp.id_maintenance = ?
    `, [id]);

    const data = transformDataForTemplate(maintenance[0], maintenance[0], produits);
    const template = handlebars.compile(templateHTML);
    const html = template(data);

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });

    const filename = `rapport-${data.chrono || maintenance[0].id_maintenance}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(pdf);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  } finally {
    if (browser) await browser.close();
  }
};

// POST /maintenances 
exports.createMaintenance = async (req, res) => {
  const {
    id_site,
    date_maintenance,
    type,
    etat,
    commentaire,
    operateur_1,
    operateur_2,
    operateur_3,
    heure_arrivee_matin,
    heure_depart_matin,
    heure_arrivee_aprem,
    heure_depart_aprem,
    garantie,
    commentaire_interne,
    contact,
    type_produit,
    numero_commande,
    numero_ri,
    departement
  } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO maintenances (
        id_site, 
        date_maintenance, 
        type, 
        etat, 
        commentaire,
        date_creation,
        operateur_1,
        operateur_2,
        operateur_3,
        heure_arrivee_matin,
        heure_depart_matin,
        heure_arrivee_aprem,
        heure_depart_aprem,
        garantie,
        commentaire_interne,
        contact,
        type_produit,
        numero_commande,
        numero_ri,
        departement
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_site,
        date_maintenance,
        type,
        etat,
        commentaire,
        new Date().toISOString().split('T')[0],
        operateur_1 || null,
        operateur_2 || null,
        operateur_3 || null,
        heure_arrivee_matin || null,
        heure_depart_matin || null,
        heure_arrivee_aprem || null,
        heure_depart_aprem || null,
        garantie || 0,
        commentaire_interne || null,
        contact || null,
        type_produit || null,
        numero_commande || null,
        numero_ri || null,
        departement || null
      ]
    );

    res.status(201).json({
      id_maintenance: result.insertId,
      id_site,
      date_maintenance,
      type,
      etat,
      commentaire
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// PUT /maintenances/:id 
exports.updateMaintenance = async (req, res) => {
  const { id } = req.params;
  const {
    id_site,
    date_maintenance,
    type,
    etat,
    commentaire,
    operateur_1,
    operateur_2,
    operateur_3,
    heure_arrivee_matin,
    heure_depart_matin,
    heure_arrivee_aprem,
    heure_depart_aprem,
    garantie,
    commentaire_interne,
    contact,
    type_produit,
    numero_commande,
    numero_ri,
    departement
  } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE maintenances SET 
        id_site = ?, 
        date_maintenance = ?, 
        type = ?, 
        etat = ?, 
        commentaire = ?,
        operateur_1 = ?,
        operateur_2 = ?,
        operateur_3 = ?,
        heure_arrivee_matin = ?,
        heure_depart_matin = ?,
        heure_arrivee_aprem = ?,
        heure_depart_aprem = ?,
        garantie = ?,
        commentaire_interne = ?,
        contact = ?,
        type_produit = ?,
        numero_commande = ?,
        numero_ri = ?,
        departement = ?
      WHERE id_maintenance = ?`,
      [
        id_site,
        date_maintenance,
        type,
        etat,
        commentaire,
        operateur_1 || null,
        operateur_2 || null,
        operateur_3 || null,
        heure_arrivee_matin || null,
        heure_depart_matin || null,
        heure_arrivee_aprem || null,
        heure_depart_aprem || null,
        garantie || 0,
        commentaire_interne || null,
        contact || null,
        type_produit || null,
        numero_commande || null,
        numero_ri || null,
        departement || null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Maintenance non trouvée" });
    }

    res.json({ message: "Maintenance mise à jour" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// DELETE /maintenances/:id
exports.deleteMaintenance = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query(
      "DELETE FROM maintenances WHERE id_maintenance = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Maintenance non trouvée" });
    }

    res.json({ message: "Maintenance supprimée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};