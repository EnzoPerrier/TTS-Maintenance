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

function formatDateForDisplay(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

function formatTimeForDisplay(timeString) {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  return `${hours}h${minutes}`;
}

function parseEtatConstate(texte) {
  if (!texte) return [];
  const lignes = texte.split('\n').filter(l => l.trim());
  const grouped = [];
  let currentZone = null;
  let currentSousZone = null;
  lignes.forEach(ligne => {
    ligne = ligne.trim();
    if (/^\d+\.\s+[A-Z\s:]+:$/.test(ligne)) {
      currentZone = { titre: ligne, sousSection: [] };
      grouped.push(currentZone);
      currentSousZone = null;
    } else if (/^\d+\.\d+\)/.test(ligne)) {
      if (!currentZone) { currentZone = { titre: 'CONSTAT', sousSection: [] }; grouped.push(currentZone); }
      currentSousZone = { titre: ligne, items: [] };
      currentZone.sousSection.push(currentSousZone);
    } else if (ligne.startsWith('-')) {
      if (currentSousZone) {
        currentSousZone.items.push(ligne);
      } else if (currentZone) {
        if (currentZone.sousSection.length === 0) { currentSousZone = { titre: '', items: [] }; currentZone.sousSection.push(currentSousZone); }
        else { currentSousZone = currentZone.sousSection[currentZone.sousSection.length - 1]; }
        currentSousZone.items.push(ligne);
      }
    }
  });
  return grouped;
}

function generateEtatConstateHTML(etatsGroupes) {
  if (!etatsGroupes || etatsGroupes.length === 0) return '<p>Aucun état constaté</p>';
  let html = '';
  etatsGroupes.forEach(section => {
    if (section.titre) html += `<h3>${section.titre}</h3>`;
    if (section.sousSection && Array.isArray(section.sousSection)) {
      section.sousSection.forEach(sous => {
        if (sous.titre) html += `<h4>${sous.titre}</h4>`;
        if (sous.items && Array.isArray(sous.items)) sous.items.forEach(item => { html += `<p>${item}</p>`; });
      });
    }
  });
  return html;
}

function combineEtatsConstates(produits) {
  let allEtats = [];
  produits.forEach((produit, index) => {
    if (produit.etat_constate) {
      allEtats.push(`<h4>PRODUIT ${index + 1}: ${produit.produit_nom}</h4>`);
      produit.etat_constate.split('\n').filter(l => l.trim()).forEach(ligne => { allEtats.push(`<p>${ligne.trim()}</p>`); });
    }
  });
  return allEtats.length > 0 ? allEtats.join('') : '<p>Aucun état constaté</p>';
}

function combineTravauxEffectues(produits) {
  let allTravaux = [];
  produits.forEach((produit, index) => {
    if (produit.travaux_effectues) {
      allTravaux.push(`<h4>PRODUIT ${index + 1}: ${produit.produit_nom}</h4>`);
      produit.travaux_effectues.split('\n').filter(l => l.trim()).forEach(ligne => { allTravaux.push(`<p>${ligne.trim()}</p>`); });
    }
  });
  return allTravaux.length > 0 ? allTravaux.join('') : '<p>Aucun travail effectué</p>';
}

function transformDataForTemplate(maintenance, site, produits) {
  let operateurs = '';
  if (maintenance.operateurs) {
    operateurs = maintenance.operateurs.split(/[\n,]/).map(s => s.trim()).filter(Boolean).join(' & ');
  } else {
    operateurs = [maintenance.operateur_1, maintenance.operateur_2, maintenance.operateur_3].filter(Boolean).join(' & ');
  }

  const nomsProduitsStr = produits.map(p => p.produit_nom).join(', ');
  const etatConstateHTML = combineEtatsConstates(produits);
  const travauxHTML = combineTravauxEffectues(produits);
  const joursSemaine = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  const tempsParJour = {
    lundi:    { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    mardi:    { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    mercredi: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    jeudi:    { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    vendredi: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    samedi:   { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    dimanche: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } }
  };

  let jours = [];
  if (maintenance.jours_intervention) {
    try {
      jours = typeof maintenance.jours_intervention === 'object'
        ? maintenance.jours_intervention
        : JSON.parse(maintenance.jours_intervention);
    } catch(e) { jours = []; }
  }

  if (jours.length > 0) {
    jours.forEach(jour => {
      const d = new Date(jour.date_jour);
      const jourNom = joursSemaine[d.getDay()];
      if (jourNom && tempsParJour[jourNom]) {
        tempsParJour[jourNom].matin.arrivee = formatTimeForDisplay(jour.heure_arrivee_matin);
        tempsParJour[jourNom].matin.depart  = formatTimeForDisplay(jour.heure_depart_matin);
        tempsParJour[jourNom].apm.arrivee   = formatTimeForDisplay(jour.heure_arrivee_aprem);
        tempsParJour[jourNom].apm.depart    = formatTimeForDisplay(jour.heure_depart_aprem);
      }
    });
  } else if (maintenance.heure_arrivee_matin || maintenance.heure_arrivee_aprem) {
    const dateObj = new Date(maintenance.date_maintenance);
    const jourActuel = joursSemaine[dateObj.getDay()];
    if (jourActuel && tempsParJour[jourActuel]) {
      tempsParJour[jourActuel].matin.arrivee = formatTimeForDisplay(maintenance.heure_arrivee_matin);
      tempsParJour[jourActuel].matin.depart  = formatTimeForDisplay(maintenance.heure_depart_matin);
      tempsParJour[jourActuel].apm.arrivee   = formatTimeForDisplay(maintenance.heure_arrivee_aprem);
      tempsParJour[jourActuel].apm.depart    = formatTimeForDisplay(maintenance.heure_depart_aprem);
    }
  }

  const typesStr = maintenance.types_intervention || maintenance.type || '';
  const typesList = typesStr.split(',').map(t => t.trim());
  const hasType = (val) => typesList.some(t => t.toLowerCase() === val.toLowerCase());

  const typeChecked = {
    installation: hasType('Installation') ? 'checked' : '',
    curatif:      (hasType('Intervention Curative') || hasType('Curatif')) ? 'checked' : '',
    revision:     (hasType('Révision') || hasType('Revision') || hasType('Preventif')) ? 'checked' : '',
    contrat:      hasType('Contrat de maintenance') ? 'checked' : '',
    location:     hasType('Location') ? 'checked' : '',
    accident:     hasType('Accident') ? 'checked' : '',
    vandalisme:   hasType('Vandalisme') ? 'checked' : '',
    orage:        hasType('Orage') ? 'checked' : '',
    autre:        (hasType('Autres') || hasType('Autre')) ? 'checked' : '',
    garantie:     maintenance.garantie ? 'checked' : ''
  };

  return {
    chrono:      maintenance.numero_ri || '',
    date:        formatDateForDisplay(maintenance.date_maintenance),
    dateDemande: formatDateForDisplay(maintenance.date_demande),
    dateAccord:  formatDateForDisplay(maintenance.date_accord_client),
    technicien:  operateurs || '',
    client:      maintenance.client_nom || maintenance.site_nom || '',
    contact:     maintenance.client_contact || maintenance.contact || '',
    typePanneau: maintenance.type_produit || nomsProduitsStr,
    numAffaire:  maintenance.numero_commande || '',
    departement: maintenance.departement || '',
    designation: maintenance.designation_produit_site || '',
    categorie:   maintenance.categorie || '',
    etat:        maintenance.etat || '',

    lundiMatin:          tempsParJour.lundi.matin.arrivee,
    lundiMatinDepart:    tempsParJour.lundi.matin.depart,
    lundiApm:            tempsParJour.lundi.apm.arrivee,
    lundiApmDepart:      tempsParJour.lundi.apm.depart,
    mardiMatin:          tempsParJour.mardi.matin.arrivee,
    mardiMatinDepart:    tempsParJour.mardi.matin.depart,
    mardiApm:            tempsParJour.mardi.apm.arrivee,
    mardiApmDepart:      tempsParJour.mardi.apm.depart,
    mercrediMatin:       tempsParJour.mercredi.matin.arrivee,
    mercrediMatinDepart: tempsParJour.mercredi.matin.depart,
    mercrediApm:         tempsParJour.mercredi.apm.arrivee,
    mercrediApmDepart:   tempsParJour.mercredi.apm.depart,
    jeudiMatin:          tempsParJour.jeudi.matin.arrivee,
    jeudiMatinDepart:    tempsParJour.jeudi.matin.depart,
    jeudiApm:            tempsParJour.jeudi.apm.arrivee,
    jeudiApmDepart:      tempsParJour.jeudi.apm.depart,
    vendrediMatin:       tempsParJour.vendredi.matin.arrivee,
    vendrediMatinDepart: tempsParJour.vendredi.matin.depart,
    vendrediApm:         tempsParJour.vendredi.apm.arrivee,
    vendrediApmDepart:   tempsParJour.vendredi.apm.depart,
    samediMatin:         tempsParJour.samedi.matin.arrivee,
    samediMatinDepart:   tempsParJour.samedi.matin.depart,
    samediApm:           tempsParJour.samedi.apm.arrivee,
    samediApmDepart:     tempsParJour.samedi.apm.depart,
    dimancheMatin:       tempsParJour.dimanche.matin.arrivee,
    dimancheMatinDepart: tempsParJour.dimanche.matin.depart,
    dimancheApm:         tempsParJour.dimanche.apm.arrivee,
    dimancheApmDepart:   tempsParJour.dimanche.apm.depart,

    installationChecked: typeChecked.installation,
    curatifChecked:      typeChecked.curatif,
    revisionChecked:     typeChecked.revision,
    garantieChecked:     typeChecked.garantie,
    contratChecked:      typeChecked.contrat,
    locationChecked:     typeChecked.location,
    accidentChecked:     typeChecked.accident,
    vandalismeChecked:   typeChecked.vandalisme,
    orageChecked:        typeChecked.orage,
    autreChecked:        typeChecked.autre,

    etatConstateContent:     etatConstateHTML,
    travauxEffectuesContent: travauxHTML,

    interventionTermineeChecked: (maintenance.etat === 'Terminée') ? 'checked' : '',
    signatureTTS:    operateurs || '',
    signatureClient: ''
  };
}

// GET /maintenances → toutes les maintenances
exports.getAllMaintenances = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM maintenances ORDER BY date_maintenance DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /maintenances/NotFinished --> toutes les maintenances en cours (pas terminées) — MODIFIÉ : ajout JOIN client/site
exports.getAllMaintenancesNotFinished = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m.*,
       s.nom AS site_nom,
       c.nom AS client_nom
      FROM maintenances m
      LEFT JOIN sites s ON m.id_site = s.id_site
      LEFT JOIN clients c ON s.id_client = c.id_client
      WHERE m.etat <> 'Terminée'
      ORDER BY m.date_maintenance DESC;
    `);
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
    const [rows] = await db.query(`
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
    if (rows.length === 0)
      return res.status(404).json({ error: "Maintenance non trouvée" });
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

// GET /maintenances/:id/html
exports.generateMaintenanceHTML = async (req, res) => {
  const { id } = req.params;
  try {
    const [maintenance] = await db.query(`
      SELECT m.*, s.nom as site_nom, s.adresse as site_adresse,
             c.nom as client_nom, c.contact as client_contact
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

// GET /maintenances/:id/pdf
exports.generateMaintenancePDF = async (req, res) => {
  const { id } = req.params;
  let browser;
  try {
    const [maintenance] = await db.query(`
      SELECT m.*, s.nom as site_nom, s.adresse as site_adresse,
             c.nom as client_nom, c.contact as client_contact
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
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } });
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
    id_site, date_maintenance, type, etat, commentaire,
    operateur_1, operateur_2, operateur_3,
    heure_arrivee_matin, heure_depart_matin, heure_arrivee_aprem, heure_depart_aprem,
    garantie, commentaire_interne, contact, type_produit, numero_commande, numero_ri, departement
  } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO maintenances (
        id_site, date_maintenance, type, etat, commentaire, date_creation,
        operateur_1, operateur_2, operateur_3,
        heure_arrivee_matin, heure_depart_matin, heure_arrivee_aprem, heure_depart_aprem,
        garantie, commentaire_interne, contact, type_produit, numero_commande, numero_ri, departement
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_site, date_maintenance, type, etat, commentaire,
        new Date().toISOString().split('T')[0],
        operateur_1 || null, operateur_2 || null, operateur_3 || null,
        heure_arrivee_matin || null, heure_depart_matin || null,
        heure_arrivee_aprem || null, heure_depart_aprem || null,
        garantie || 0, commentaire_interne || null, contact || null,
        type_produit || null, numero_commande || null, numero_ri || null, departement || null
      ]
    );
    res.status(201).json({ id_maintenance: result.insertId, id_site, date_maintenance, type, etat, commentaire });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// PUT /maintenances/:id
exports.updateMaintenance = async (req, res) => {
  const { id } = req.params;
  const {
    id_site, date_maintenance, types, type, types_intervention,
    etat, commentaire, commentaire_interne, contact, type_produit,
    numero_commande, numero_ri, departement, designation_produit_site,
    categorie, date_demande, date_accord_client,
    operateurs, operateur_1, operateur_2, operateur_3,
    jours, garantie
  } = req.body;

  try {
    let finalIdSite = id_site || null;
    if (!finalIdSite) {
      const [rows] = await db.query('SELECT id_site FROM maintenances WHERE id_maintenance = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ error: "Maintenance non trouvée" });
      finalIdSite = rows[0].id_site;
    }

    let typesStr = null;
    if (types && Array.isArray(types) && types.length > 0) typesStr = [...new Set(types)].join(',');
    else if (types_intervention) typesStr = types_intervention;
    else if (type) typesStr = type;

    let operateursStr = null;
    if (operateurs && Array.isArray(operateurs)) operateursStr = operateurs.join('\n');
    else if (operateurs && typeof operateurs === 'string') operateursStr = operateurs;

    let joursJson = null;
    if (jours && Array.isArray(jours) && jours.length > 0) joursJson = JSON.stringify(jours);

    const [result] = await db.query(
      `UPDATE maintenances SET
        id_site = ?, numero_ri = ?, designation_produit_site = ?, categorie = ?,
        type = ?, types_intervention = ?, jours_intervention = ?,
        departement = ?, date_demande = ?, date_accord_client = ?, date_maintenance = ?,
        contact = ?, type_produit = ?, numero_commande = ?,
        operateurs = ?, operateur_1 = ?, operateur_2 = ?, operateur_3 = ?,
        heure_arrivee_matin = NULL, heure_depart_matin = NULL,
        heure_arrivee_aprem = NULL, heure_depart_aprem = NULL,
        garantie = ?, etat = ?, commentaire = ?, commentaire_interne = ?
      WHERE id_maintenance = ?`,
      [
        finalIdSite, numero_ri || null, designation_produit_site || null, categorie || null,
        typesStr, typesStr, joursJson,
        departement || null, date_demande || null, date_accord_client || null, date_maintenance || null,
        contact || null, type_produit || null, numero_commande || null,
        operateursStr, operateur_1 || null, operateur_2 || null, operateur_3 || null,
        garantie != null ? garantie : 0, etat || null, commentaire || null, commentaire_interne || null,
        id
      ]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Maintenance non trouvée" });

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
    const [result] = await db.query("DELETE FROM maintenances WHERE id_maintenance = ?", [id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Maintenance non trouvée" });
    res.json({ message: "Maintenance supprimée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};