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

// Parser les jours depuis JSON
function parseJoursIntervention(joursJson) {
  if (!joursJson) return [];
  try {
    if (typeof joursJson === 'object') return joursJson;
    return JSON.parse(joursJson);
  } catch (e) {
    console.error('Erreur parsing jours:', e);
    return [];
  }
}

// Parser les types depuis la chaîne séparée par virgules
function parseTypesIntervention(typesStr) {
  if (!typesStr) return [];
  return typesStr.split(',').map(t => t.trim()).filter(Boolean);
}

// Parser la liste des opérateurs (séparés par des sauts de ligne ou virgules)
function parseOperateurs(operateursStr) {
  if (!operateursStr) return [];
  // Supporte à la fois '\n' et ',' comme séparateurs
  return operateursStr
    .split(/[\n,]/)
    .map(o => o.trim())
    .filter(Boolean);
}

// Sérialiser la liste des opérateurs en chaîne
function serializeOperateurs(operateurs) {
  if (!operateurs) return null;
  if (Array.isArray(operateurs)) return operateurs.filter(Boolean).join('\n');
  return operateurs;
}

function combineEtatsConstates(produits) {
  let allEtats = [];
  produits.forEach((produit, index) => {
    if (produit.etat_constate) {
      allEtats.push(`<h4>PRODUIT ${index + 1}: ${produit.produit_nom}</h4>`);
      produit.etat_constate.split('\n').filter(l => l.trim()).forEach(ligne => {
        allEtats.push(`<p>${ligne.trim()}</p>`);
      });
    }
  });
  return allEtats.length > 0 ? allEtats.join('') : '<p>Aucun état constaté</p>';
}

function combineTravauxEffectues(produits) {
  let allTravaux = [];
  produits.forEach((produit, index) => {
    if (produit.travaux_effectues) {
      allTravaux.push(`<h4>PRODUIT ${index + 1}: ${produit.produit_nom}</h4>`);
      produit.travaux_effectues.split('\n').filter(l => l.trim()).forEach(ligne => {
        allTravaux.push(`<p>${ligne.trim()}</p>`);
      });
    }
  });
  return allTravaux.length > 0 ? allTravaux.join('') : '<p>Aucun travail effectué</p>';
}

function transformDataForTemplate(maintenance, site, produits) {
  // Opérateurs : stockés en colonne JSON ou texte multi-lignes
  const operateursList = parseOperateurs(maintenance.operateurs || [
    maintenance.operateur_1,
    maintenance.operateur_2,
    maintenance.operateur_3
  ].filter(Boolean).join('\n'));

  const operateurs = operateursList.join(' & ');

  const nomsProduitsStr = produits.map(p => p.produit_nom).join(', ');
  const etatConstateHTML = combineEtatsConstates(produits);
  const travauxHTML = combineTravauxEffectues(produits);

  const joursSemaine = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  const tempsParJour = {
    lundi: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    mardi: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    mercredi: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    jeudi: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    vendredi: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    samedi: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } },
    dimanche: { matin: { arrivee: '', depart: '' }, apm: { arrivee: '', depart: '' } }
  };

  const jours = parseJoursIntervention(maintenance.jours_intervention);

  if (jours.length > 0) {
    jours.forEach(jour => {
      const dateObj = new Date(jour.date_jour);
      const jourNom = joursSemaine[dateObj.getDay()];
      if (jourNom && tempsParJour[jourNom]) {
        tempsParJour[jourNom].matin.arrivee = formatTimeForDisplay(jour.heure_arrivee_matin);
        tempsParJour[jourNom].matin.depart = formatTimeForDisplay(jour.heure_depart_matin);
        tempsParJour[jourNom].apm.arrivee = formatTimeForDisplay(jour.heure_arrivee_aprem);
        tempsParJour[jourNom].apm.depart = formatTimeForDisplay(jour.heure_depart_aprem);
      }
    });
  } else {
    const dateObj = new Date(maintenance.date_maintenance);
    const jourActuel = joursSemaine[dateObj.getDay()];
    if (jourActuel && tempsParJour[jourActuel]) {
      tempsParJour[jourActuel].matin.arrivee = formatTimeForDisplay(maintenance.heure_arrivee_matin);
      tempsParJour[jourActuel].matin.depart = formatTimeForDisplay(maintenance.heure_depart_matin);
      tempsParJour[jourActuel].apm.arrivee = formatTimeForDisplay(maintenance.heure_arrivee_aprem);
      tempsParJour[jourActuel].apm.depart = formatTimeForDisplay(maintenance.heure_depart_aprem);
    }
  }

  const types = parseTypesIntervention(maintenance.types_intervention || maintenance.type);

  const typeChecked = {
    installation: types.includes('Installation') ? 'checked' : '',
    curatif: types.includes('Intervention Curative') || types.includes('Intervention curative') || types.includes('Curatif') ? 'checked' : '',
    revision: types.includes('Révision') || types.includes('Preventif') ? 'checked' : '',
    contrat: types.includes('Contrat de maintenance') ? 'checked' : '',
    location: types.includes('Location') ? 'checked' : '',
    accident: types.includes('Accident') ? 'checked' : '',
    vandalisme: types.includes('Vandalisme') ? 'checked' : '',
    orage: types.includes('Orage') ? 'checked' : '',
    autre: types.includes('Autres') || types.includes('Autre') ? 'checked' : '',
    garantie: (maintenance.garantie === 1 || maintenance.garantie === true || maintenance.garantie === 'Oui') ? 'checked' : ''
  };

  return {
    chrono: maintenance.numero_ri || '',
    date: formatDateForDisplay(maintenance.date_maintenance),
    dateDemandeDisplay: formatDateForDisplay(maintenance.date_demande),
    dateAccordClientDisplay: formatDateForDisplay(maintenance.date_accord_client),
    categorie: maintenance.categorie || '',
    typeIntervention: maintenance.types_intervention || maintenance.type || '',
    technicien: operateurs || '',
    operateursList,
    client: maintenance.client_nom || maintenance.site_nom || '',
    contact: maintenance.client_contact || maintenance.contact || '',
    typePanneau: maintenance.type_produit || nomsProduitsStr,
    designationProduitSite: maintenance.designation_produit_site || '',
    numAffaire: maintenance.numero_commande || '',
    departement: maintenance.departement || '',
    garantieValeur: maintenance.garantie === 1 || maintenance.garantie === true || maintenance.garantie === 'Oui' ? 'Oui' : 'Non',

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
    contratChecked: typeChecked.contrat,
    locationChecked: typeChecked.location,
    accidentChecked: typeChecked.accident,
    vandalismeChecked: typeChecked.vandalisme,
    orageChecked: typeChecked.orage,
    autreChecked: typeChecked.autre,

    etatConstateContent: etatConstateHTML,
    travauxEffectuesContent: travauxHTML,

    interventionTermineeChecked: maintenance.etat === 'Terminé' ? 'checked' : '',
    signatureTTS: operateurs || '',
    signatureClient: ''
  };
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// GET /maintenances
exports.getAllMaintenances = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM maintenances ORDER BY date_maintenance DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// GET /maintenances/NotFinished
exports.getAllMaintenancesNotFinished = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM maintenances WHERE etat <> 'Terminée' ORDER BY date_maintenance DESC"
    );
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
    if (rows.length === 0)
      return res.status(404).json({ error: "Maintenance non trouvée" });

    const maintenance = rows[0];

    // Parser les types
    if (maintenance.types_intervention) {
      maintenance.types = parseTypesIntervention(maintenance.types_intervention);
    } else if (maintenance.type) {
      maintenance.types = [maintenance.type];
    } else {
      maintenance.types = [];
    }

    // Parser les jours
    if (maintenance.jours_intervention) {
      maintenance.jours = parseJoursIntervention(maintenance.jours_intervention);
    } else {
      maintenance.jours = [{
        date_jour: maintenance.date_maintenance,
        heure_arrivee_matin: maintenance.heure_arrivee_matin,
        heure_depart_matin: maintenance.heure_depart_matin,
        heure_arrivee_aprem: maintenance.heure_arrivee_aprem,
        heure_depart_aprem: maintenance.heure_depart_aprem
      }];
    }

    // Parser les opérateurs
    if (maintenance.operateurs) {
      maintenance.operateursList = parseOperateurs(maintenance.operateurs);
    } else {
      maintenance.operateursList = [
        maintenance.operateur_1,
        maintenance.operateur_2,
        maintenance.operateur_3
      ].filter(Boolean);
    }

    res.json(maintenance);
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

// GET /maintenances/:id/pdf
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
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
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
    // Identification
    numero_ri,                  // Chrono d'intervention (obligatoire)
    designation_produit_site,   // Désignation produit/site
    categorie,                  // Catégorie (obligatoire)
    types,                      // Array : Nature des travaux (multi-select)
    type,                       // Fallback string
    departement,
    date_demande,
    date_accord_client,
    date_maintenance,           // Date intervention
    // Client
    id_site,
    contact,
    type_produit,
    numero_commande,
    // Opérateurs (array envoyé depuis le front, séparés par Entrée)
    operateurs,                 // Array ou chaîne multi-lignes
    operateur_1,                // Fallback legacy
    operateur_2,
    operateur_3,
    // Jours (array multi-jours)
    jours,
    // Heures legacy (un seul jour)
    heure_arrivee_matin,
    heure_depart_matin,
    heure_arrivee_aprem,
    heure_depart_aprem,
    // Nature des travaux / garantie
    garantie,                   // 'Oui' | 'Non' | true | false | 1 | 0
    // Autres
    etat,
    commentaire,
    commentaire_interne
  } = req.body;

  try {
    // Types
    let typesStr = null;
    if (types && Array.isArray(types) && types.length > 0) {
      typesStr = types.join(',');
    } else if (type) {
      typesStr = type;
    }

    // Jours
    let joursJson = null;
    let dateMaintenance = date_maintenance;
    if (jours && Array.isArray(jours) && jours.length > 0) {
      joursJson = JSON.stringify(jours);
      dateMaintenance = jours[0].date_jour;
    }

    // Opérateurs : on stocke en colonne `operateurs` (texte multi-lignes)
    const operateursStr = serializeOperateurs(operateurs || [operateur_1, operateur_2, operateur_3].filter(Boolean));

    // Garantie : normaliser en booléen/entier
    const garantieVal = (garantie === 'Oui' || garantie === true || garantie === 1) ? 1 : 0;

    const [result] = await db.query(
      `INSERT INTO maintenances (
        id_site,
        numero_ri,
        designation_produit_site,
        categorie,
        type,
        types_intervention,
        jours_intervention,
        departement,
        date_demande,
        date_accord_client,
        date_maintenance,
        contact,
        type_produit,
        numero_commande,
        operateurs,
        operateur_1,
        operateur_2,
        operateur_3,
        heure_arrivee_matin,
        heure_depart_matin,
        heure_arrivee_aprem,
        heure_depart_aprem,
        garantie,
        etat,
        commentaire,
        commentaire_interne,
        date_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_site,
        numero_ri || null,
        designation_produit_site || null,
        categorie || null,
        typesStr,
        typesStr,
        joursJson,
        departement || null,
        date_demande || null,
        date_accord_client || null,
        dateMaintenance || null,
        contact || null,
        type_produit || null,
        numero_commande || null,
        operateursStr,
        // Colonnes legacy pour compatibilité
        (Array.isArray(operateurs) ? operateurs[0] : operateur_1) || null,
        (Array.isArray(operateurs) ? operateurs[1] : operateur_2) || null,
        (Array.isArray(operateurs) ? operateurs[2] : operateur_3) || null,
        heure_arrivee_matin || null,
        heure_depart_matin || null,
        heure_arrivee_aprem || null,
        heure_depart_aprem || null,
        garantieVal,
        etat || null,
        commentaire || null,
        commentaire_interne || null,
        new Date().toISOString().split('T')[0]
      ]
    );

    res.status(201).json({
      id_maintenance: result.insertId,
      id_site,
      numero_ri,
      date_maintenance: dateMaintenance,
      etat
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
    numero_ri,
    designation_produit_site,
    categorie,
    types,
    type,
    departement,
    date_demande,
    date_accord_client,
    date_maintenance,
    contact,
    type_produit,
    numero_commande,
    operateurs,
    operateur_1,
    operateur_2,
    operateur_3,
    jours,
    heure_arrivee_matin,
    heure_depart_matin,
    heure_arrivee_aprem,
    heure_depart_aprem,
    garantie,
    etat,
    commentaire,
    commentaire_interne
  } = req.body;

  try {
    let typesStr = null;
    if (types && Array.isArray(types) && types.length > 0) {
      typesStr = types.join(',');
    } else if (type) {
      typesStr = type;
    }

    let joursJson = null;
    let dateMaintenance = date_maintenance;
    if (jours && Array.isArray(jours) && jours.length > 0) {
      joursJson = JSON.stringify(jours);
      dateMaintenance = jours[0].date_jour;
    }

    const operateursStr = serializeOperateurs(operateurs || [operateur_1, operateur_2, operateur_3].filter(Boolean));
    const garantieVal = (garantie === 'Oui' || garantie === true || garantie === 1) ? 1 : 0;

    const [result] = await db.query(
      `UPDATE maintenances SET
        id_site = ?,
        numero_ri = ?,
        designation_produit_site = ?,
        categorie = ?,
        type = ?,
        types_intervention = ?,
        jours_intervention = ?,
        departement = ?,
        date_demande = ?,
        date_accord_client = ?,
        date_maintenance = ?,
        contact = ?,
        type_produit = ?,
        numero_commande = ?,
        operateurs = ?,
        operateur_1 = ?,
        operateur_2 = ?,
        operateur_3 = ?,
        heure_arrivee_matin = ?,
        heure_depart_matin = ?,
        heure_arrivee_aprem = ?,
        heure_depart_aprem = ?,
        garantie = ?,
        etat = ?,
        commentaire = ?,
        commentaire_interne = ?
      WHERE id_maintenance = ?`,
      [
        id_site,
        numero_ri || null,
        designation_produit_site || null,
        categorie || null,
        typesStr,
        typesStr,
        joursJson,
        departement || null,
        date_demande || null,
        date_accord_client || null,
        dateMaintenance || null,
        contact || null,
        type_produit || null,
        numero_commande || null,
        operateursStr,
        (Array.isArray(operateurs) ? operateurs[0] : operateur_1) || null,
        (Array.isArray(operateurs) ? operateurs[1] : operateur_2) || null,
        (Array.isArray(operateurs) ? operateurs[2] : operateur_3) || null,
        heure_arrivee_matin || null,
        heure_depart_matin || null,
        heure_arrivee_aprem || null,
        heure_depart_aprem || null,
        garantieVal,
        etat || null,
        commentaire || null,
        commentaire_interne || null,
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
    const [result] = await db.query(
      "DELETE FROM maintenances WHERE id_maintenance = ?",
      [id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Maintenance non trouvée" });

    res.json({ message: "Maintenance supprimée" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};