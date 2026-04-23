# 📡 API Reference — TTSmaintenance

> API REST Node.js / Express — Base de données MySQL 8.0
>
> URL de base : `http://<host>/api`

---

## Sommaire

- [Authentification](#-authentification)
- [Clients](#-clients)
- [Sites](#-sites)
- [Produits](#-produits)
- [Maintenances](#-maintenances)
- [Maintenance-Produits](#-maintenance-produits)
- [Photos](#-photos)
- [QR Codes](#-qr-codes)
- [Administration](#-administration)
- [Statistiques publiques](#-statistiques-publiques)
- [Codes d'erreur](#-codes-derreur)
- [Schéma de la base de données](#-schéma-de-la-base-de-données)

---

## 🔐 Authentification

L'API utilise des **JWT (JSON Web Tokens)**. Après connexion, le token doit être transmis dans le header de chaque requête protégée.

```
Authorization: Bearer <token>
```

> ⚠️ Le token expire selon la valeur de `JWT_EXPIRY` dans le `.env` (défaut : `24h`).  
> Sur expiration ou token invalide, l'API répond `401` et le client doit se reconnecter.

### Flux d'authentification

```
Utilisateur          Frontend (Web/App)          API (serveur)          Base de données
     |                       |                        |                        |
     |-- login/password ---→ |                        |                        |
     |                       |-- POST /auth/login --> |                        |
     |                       |                        |-- vérifie user ------→ |
     |                       |                        |←-- user ok ----------- |
     |                       |←-- { token: "eyJ..." } |                        |
     |                       |                        |                        |
     |                       | stocke token           |                        |
     |                       | (localStorage /        |                        |
     |                       |  AsyncStorage)         |                        |
     |                       |                        |                        |
     |-- "donne moi les      |                        |                        |
     |    sites" ----------→ |                        |                        |
     |                       |-- GET /sites           |                        |
     |                       |   Authorization:       |                        |
     |                       |   Bearer eyJ... ----→  |                        |
     |                       |                        |-- vérifie token        |
     |                       |                        |   (pas de BDD)         |
     |                       |←-- [ liste des sites ] |                        |
     |←-- affiche les sites  |                        |                        |
```

---

### `POST /auth/login`

Connexion d'un utilisateur.

**Body JSON :**
```json
{
  "username": "jean.dupont",
  "password": "monMotDePasse"
}
```

**Réponse `200` :**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5...",
  "user": {
    "id_user": 1,
    "username": "jean.dupont",
    "email": "jean@example.com",
    "role": "user"
  }
}
```

**Réponse `401` :**
```json
{ "message": "Identifiants incorrects" }
```

**Réponse `403` :**
```json
{ "message": "Votre accès a été suspendu. Contactez l'administrateur." }
```

---

### `POST /auth/register`

Création d'un compte utilisateur.

**Body JSON :**
```json
{
  "username": "jean.dupont",
  "password": "monMotDePasse",
  "email": "jean@example.com",
  "role": "user"
}
```

**Réponse `201` :**
```json
{
  "message": "Compte créé avec succès",
  "id_user": 5,
  "username": "jean.dupont",
  "role": "user"
}
```

---

### `POST /auth/logout` 🔒

Déconnexion — supprime la session en base.

**Réponse `200` :**
```json
{ "message": "Déconnecté avec succès" }
```

---

### `GET /auth/me` 🔒

Retourne le profil de l'utilisateur connecté.

**Réponse `200` :**
```json
{
  "id_user": 1,
  "username": "jean.dupont",
  "email": "jean@example.com",
  "role": "user",
  "last_login": "2026-04-21T10:30:00.000Z"
}
```

---

## 👤 Clients

> 🔒 Toutes les routes nécessitent un token valide.

### `GET /clients`

Retourne la liste de tous les clients triés par nom.

**Réponse `200` :**
```json
[
  {
    "id_client": 1,
    "nom": "Mairie de Nice",
    "contact": "M. Martin",
    "adresse": "5 rue de la Paix, Nice",
    "email": "contact@mairie-nice.fr",
    "telephone": "0493000000",
    "date_creation": "21/04/2026"
  }
]
```

---

### `GET /clients/:id`

Retourne un client par son ID.

**Réponse `404` :**
```json
{ "error": "Client non trouvé" }
```

---

### `POST /clients`

Crée un nouveau client.

**Body JSON :**
```json
{
  "nom": "Mairie de Nice",
  "contact": "M. Martin",
  "adresse": "5 rue de la Paix, Nice",
  "email": "contact@mairie-nice.fr",
  "telephone": "0493000000"
}
```

**Réponse `201` :**
```json
{
  "id_client": 2,
  "nom": "Mairie de Nice",
  ...
}
```

---

### `PUT /clients/:id`

Met à jour un client existant. Accepte les mêmes champs que le `POST`.

**Réponse `200` :**
```json
{ "message": "Client mis à jour" }
```

---

### `DELETE /clients/:id`

Supprime un client.

> ⚠️ Impossible si le client possède des sites associés.

**Réponse `400` :**
```json
{
  "error": "Impossible de supprimer ce client car il a des sites associés",
  "sitesCount": 3
}
```

---

## 🏢 Sites

> 🔒 Toutes les routes nécessitent un token valide.

### `GET /sites`

Retourne tous les sites.

**Réponse `200` :**
```json
[
  {
    "id_site": 1,
    "id_client": 1,
    "nom": "Site Centre-Ville",
    "adresse": "12 avenue Jean Médecin, Nice",
    "gps_lat": "43.7102200",
    "gps_lng": "7.2619800",
    "date_creation": "21/04/2026"
  }
]
```

---

### `GET /sites/:id`

Retourne un site par son ID.

---

### `POST /sites`

Crée un nouveau site.

**Body JSON :**
```json
{
  "id_client": 1,
  "nom": "Site Centre-Ville",
  "adresse": "12 avenue Jean Médecin, Nice",
  "gps_lat": 43.7102200,
  "gps_lng": 7.2619800
}
```

**Réponse `201` :**
```json
{
  "id_site": 3,
  "id_client": 1,
  "nom": "Site Centre-Ville",
  ...
}
```

---

### `PUT /sites/:id`

Met à jour un site existant. Accepte les mêmes champs que le `POST`.

---

### `DELETE /sites/:id`

Supprime un site.

---

## 📦 Produits

> 🔒 Toutes les routes nécessitent un token valide.

### `GET /produits`

Retourne tous les produits (équipements), triés par ID décroissant.

**Réponse `200` :**
```json
[
  {
    "id_produit": 1,
    "id_site": 2,
    "nom": "PMV Autoroute A8",
    "departement": "SDRT",
    "etat": "OK",
    "description": "Panneau à message variable km 42",
    "date_creation": "21/04/2026"
  }
]
```

---

### `GET /produits/:id`

Retourne un produit par son ID.

---

### `GET /produits/ProduitsBySiteID/:id`

Retourne tous les produits d'un site donné, triés par nom.

---

### `POST /produits`

Crée un nouveau produit. Génère automatiquement un QR code associé côté client.

**Body JSON :**
```json
{
  "id_site": 2,
  "nom": "PMV Autoroute A8",
  "departement": "SDRT",
  "etat": "OK",
  "description": "Panneau à message variable km 42"
}
```

**Champ `etat` — valeurs acceptées :** `OK` · `NOK` · `Passable`

**Réponse `201` :**
```json
{
  "id_produit": 5,
  "id_site": 2,
  "nom": "PMV Autoroute A8",
  ...
}
```

---

### `PUT /produits/:id`

Met à jour un produit. Le champ `id_site` n'est pas modifiable via cette route.

**Body JSON :**
```json
{
  "nom": "PMV Autoroute A8 v2",
  "etat": "Passable",
  "departement": "SDRT",
  "description": "Mise à jour description"
}
```

**Réponse `200` :** retourne le produit mis à jour complet.

---

### `DELETE /produits/:id`

Supprime un produit.

---

## 🔧 Maintenances

> 🔒 Toutes les routes nécessitent un token valide.

### `GET /maintenances`

Retourne toutes les maintenances, triées par date décroissante.

---

### `GET /maintenances/NotFinished`

Retourne les maintenances dont l'état est **différent de `Terminée`**, avec les noms du site et du client joints.

**Réponse `200` :**
```json
[
  {
    "id_maintenance": 12,
    "id_site": 2,
    "date_maintenance": "2026-04-21",
    "type": "Intervention Curative",
    "types_intervention": "Intervention Curative",
    "etat": "En cours",
    "numero_ri": "RI260421",
    "departement": "06",
    "operateurs": "JD\nML",
    "garantie": 0,
    "site_nom": "Site Centre-Ville",
    "client_nom": "Mairie de Nice",
    ...
  }
]
```

---

### `GET /maintenances/:id`

Retourne une maintenance par son ID, avec le nom du site et du client joints.

---

### `GET /maintenances/AllMaintenancesBySiteID/:id`

Retourne toutes les maintenances d'un site donné.

---

### `GET /maintenances/:id/html`

Génère et retourne le **rapport d'intervention au format HTML** (aperçu RI).

**Content-Type :** `text/html`

---

### `GET /maintenances/:id/pdf`

Génère et retourne le **rapport d'intervention au format PDF** (via Puppeteer).

**Content-Type :** `application/pdf`  
**Content-Disposition :** `attachment; filename=rapport-RI260421.pdf`

---

### `POST /maintenances`

Crée une nouvelle maintenance.

**Body JSON :**
```json
{
  "id_site": 2,
  "date_maintenance": "2026-04-21",
  "type": "Intervention Curative",
  "types_intervention": ["Intervention Curative", "Garantie"],
  "etat": "Planifiée",
  "numero_ri": "RI260421",
  "designation_produit_site": "PMV A8",
  "date_demande": "2026-04-15",
  "date_accord_client": "2026-04-18",
  "contact": "M. Bernard",
  "type_produit": "PMV",
  "numero_commande": "CDE-2026-042",
  "departement": "06",
  "operateurs": ["JD", "ML"],
  "jours": [
    {
      "date_jour": "2026-04-21",
      "heure_arrivee_matin": "08:00",
      "heure_depart_matin": "12:00",
      "heure_arrivee_aprem": "13:30",
      "heure_depart_aprem": "17:00"
    }
  ],
  "garantie": 0,
  "commentaire": "Intervention urgente",
  "commentaire_interne": "Pièce commandée le 18/04"
}
```

**Champ `etat` — valeurs acceptées :** `Planifiée` · `En cours` · `Terminée`

**Champ `operateurs` :** tableau de strings ou string séparée par `\n` ou `,`

**Champ `jours` :** tableau d'objets horaires par jour. 

**Réponse `201` :**
```json
{
  "id_maintenance": 13,
  "id_site": 2,
  "date_maintenance": "2026-04-21",
  "type": "Intervention Curative",
  "etat": "Planifiée",
  "commentaire": "Intervention urgente"
}
```

---

### `PUT /maintenances/:id`

Met à jour une maintenance existante. Accepte les mêmes champs que le `POST`.

> ℹ️ Les champs `heure_arrivee_matin`, `heure_depart_matin`, `heure_arrivee_aprem`, `heure_depart_aprem` sont mis à `NULL` lors d'un PUT (remplacés par `jours_intervention` en JSON).

---

### `DELETE /maintenances/:id`

Supprime une maintenance.

---

## 🔗 Maintenance-Produits

> 🔒 Toutes les routes nécessitent un token valide.
>
> Table de liaison entre une maintenance et les produits traités lors de cette intervention.

### `GET /maintenance-produits/maintenance/:id_maintenance`

Retourne tous les produits associés à une maintenance, avec leurs infos de liaison (état constaté, travaux, etc.).

**Réponse `200` :**
```json
[
  {
    "id_maintenance": 12,
    "id_produit": 5,
    "nom": "PMV Autoroute A8",
    "departement": "SDRT",
    "description": "...",
    "id_site": 2,
    "etat": "NOK",
    "commentaire": "Écran défectueux",
    "etat_constate": "Écran principal HS",
    "travaux_effectues": "Remplacement carte mère",
    "ri_interne": "RI-INT-2026-042"
  }
]
```

---

### `GET /maintenance-produits/produit/:id_produit`

Retourne toutes les maintenances auxquelles un produit a été associé.

---

### `POST /maintenance-produits`

Associe un produit à une maintenance.

**Content-Type :** `application/json`

**Body JSON :**
```json
{
  "id_maintenance": 12,
  "id_produit": 5,
  "etat": "NOK",
  "commentaire": "Écran défectueux",
  "etat_constate": "Écran principal HS",
  "travaux_effectues": "Remplacement carte mère",
  "ri_interne": "RI-INT-2026-042"
}
```

> ℹ️ Si un `etat` est fourni (différent de `N/A`), le champ `etat` du produit dans la table `produits` est automatiquement mis à jour.

**Réponse `400` si déjà associé :**
```json
{ "error": "Ce produit est déjà associé à cette maintenance" }
```

---

### `PUT /maintenance-produits/:id_maintenance/:id_produit`

Met à jour les informations de liaison d'un produit dans une maintenance.

**Body JSON :** mêmes champs que le `POST` (hors `id_maintenance` et `id_produit`).

---

### `DELETE /maintenance-produits/:id_maintenance/:id_produit`

Retire un produit d'une maintenance. Supprime également toutes les photos associées à cette liaison.

**Réponse `200` :**
```json
{
  "message": "Produit retiré de la maintenance",
  "photos_supprimees": 3
}
```

---

## 📸 Photos

> 🔒 Toutes les routes nécessitent un token valide.
>
> Les photos sont stockées sur le disque sous `uploads/<client>/<site>/` avec un nom horodaté.
> La limite est de **5 photos** par produit par maintenance.

### `GET /photos/produit/:id_produit`

Retourne toutes les photos d'un produit, triées par date décroissante.

**Réponse `200` :**
```json
[
  {
    "id_photo": 1,
    "id_produit": 5,
    "id_maintenance": 12,
    "chemin_photo": "/uploads/Mairie_de_Nice/Site_Centre_Ville/PMV_A8_20260421_143022_000123.jpg",
    "date_creation": "21/04/2026",
    "commentaire": "État avant intervention",
    "date_maintenance": "21/04/2026",
    "maintenance_type": "Intervention Curative"
  }
]
```

---

### `GET /photos/maintenance/:id_maintenance`

Retourne toutes les photos d'une maintenance (tous produits confondus).

---

### `GET /photos/maintenance/:id_maintenance/:id_produit`

Retourne les photos d'un produit spécifique dans une maintenance donnée.

---

### `GET /photos/latest/:id_produit`

Retourne la dernière photo prise pour un produit.

**Réponse `404` :**
```json
{ "error": "Aucune photo trouvée" }
```

---

### `GET /photos/:id`

Retourne une photo par son ID.

---

### `POST /photos`

Upload d'une photo unique.

**Content-Type :** `multipart/form-data`

| Champ | Type | Requis | Description |
|---|---|---|---|
| `photo` | file | ✅ | Image (jpg, png, gif, webp) — max 100MB |
| `id_produit` | string | ✅ | ID du produit |
| `id_maintenance` | string | ❌ | ID de la maintenance |
| `commentaire` | string | ❌ | Commentaire |

---

### `POST /photos/multiple`

Upload de **plusieurs photos** en une seule requête (max 5).

**Content-Type :** `multipart/form-data`

| Champ | Type | Requis | Description |
|---|---|---|---|
| `photos` | file[] | ✅ | Tableau d'images (max 5) |
| `id_produit` | string | ✅ | ID du produit |
| `id_maintenance` | string | ❌ | ID de la maintenance |
| `commentaire` | string | ❌ | Commentaire commun à toutes les photos |

**Réponse `201` :**
```json
{
  "message": "3 photo(s) ajoutée(s) avec succès",
  "photos": [
    { "id_photo": 10, "chemin_photo": "/uploads/..." },
    { "id_photo": 11, "chemin_photo": "/uploads/..." },
    { "id_photo": 12, "chemin_photo": "/uploads/..." }
  ],
  "id_produit": 5,
  "id_maintenance": 12
}
```

**Réponse `400` si limite dépassée :**
```json
{
  "error": "Limite de 5 photos dépassée. Vous avez 3 photo(s), vous tentez d'en ajouter 3. Maximum autorisé: 2 photo(s) supplémentaire(s)."
}
```

---

### `PUT /photos/:id`

Met à jour le commentaire d'une photo.

**Body JSON :**
```json
{ "commentaire": "Nouveau commentaire" }
```

---

### `DELETE /photos/:id`

Supprime une photo (fichier physique + entrée BDD).

---

## 📱 QR Codes

> Les routes de **scan** sont publiques. Les routes de gestion nécessitent un token.

### `POST /qrcodes/generate` 🔒

Génère un ou plusieurs QR codes.

**Body JSON :**
```json
{
  "count": 1,
  "prefill": {
    "id_produit": 5
  }
}
```

> Si `id_produit` est fourni, le QR code est créé avec l'état `associe`. Sinon, état `vierge`.

**Réponse `200` :**
```json
{
  "qrCodes": [
    {
      "id_qr": 8,
      "qrDataUrl": "data:image/png;base64,iVBORw0KGgo..."
    }
  ]
}
```

---

### `GET /qrcodes/scan/:id`

Scanne un QR code et retourne son état.

**Réponse `200` — QR vierge :**
```json
{
  "status": "vierge",
  "message": "QR code non associé",
  "id_qr": 3
}
```

**Réponse `200` — QR associé :**
```json
{
  "status": "associe",
  "id_qr": 8,
  "produit": {
    "id_produit": 5,
    "nom": "PMV Autoroute A8",
    "etat": "OK",
    ...
  }
}
```

---

### `GET /qrcodes/showqr/:id` 🔒

Retourne une page HTML affichant le QR code d'un produit (par `id_produit`).

---

### `GET /qrcodes/all` 🔒

Retourne tous les QR codes enregistrés.

---

### `PUT /qrcodes/:id` 🔒

Met à jour un QR code.

**Body JSON :**
```json
{
  "id_produit": 5,
  "etat": "associe"
}
```

---

### `DELETE /qrcodes/:id` 🔒

Supprime un QR code.

---

## ⚙️ Administration

> 🔒🔑 Toutes les routes nécessitent un token valide **et** le rôle `admin`.

### Stats globales

#### `GET /admin/stats`

Retourne les statistiques générales du panneau admin.

**Réponse `200` :**
```json
{
  "activeSessions": 3,
  "totalUsers": 12,
  "blockedUsers": 1,
  "mods24h": 47,
  "recentLogs": [...]
}
```

---

### Gestion des sessions

#### `GET /admin/sessions`
Retourne toutes les sessions actives.

#### `DELETE /admin/sessions`
Déconnecte tous les utilisateurs (hors admin courant).

#### `DELETE /admin/sessions/:sessionId`
Déconnecte une session spécifique (kick).

---

### Gestion des utilisateurs

#### `GET /admin/users`
Retourne tous les utilisateurs.

#### `POST /admin/users`
Crée un utilisateur.

**Body JSON :**
```json
{
  "username": "nouveau.user",
  "password": "motdepasse",
  "email": "user@example.com",
  "role": "user"
}
```

#### `PUT /admin/users/:id`
Met à jour un utilisateur. Le mot de passe est optionnel (si vide, conservé).

#### `DELETE /admin/users/:id`
Supprime un utilisateur (impossible de se supprimer soi-même).

#### `POST /admin/users/:id/block`
Bloque ou débloque un utilisateur.

**Body JSON :**
```json
{
  "block": true,
  "reason": "Abonnement expiré"
}
```

#### `GET /admin/users/:id/stats`
Retourne les statistiques détaillées d'un utilisateur (connexions, activité CRUD, heatmap, IP fréquentes, sessions actives...).

---

### Logs d'activité

#### `GET /admin/logs`

Retourne les logs d'activité.

**Query params :**

| Param | Description |
|---|---|
| `limit` | Nombre de résultats (défaut : 100) |
| `action` | Filtre : `CREATE` · `UPDATE` · `DELETE` · `LOGIN` · `BLOCK` |

#### `DELETE /admin/logs`
Purge tous les logs.

---

### Verrou global

#### `GET /admin/lock`
Retourne l'état du verrou global.

**Réponse `200` :**
```json
{
  "locked": false,
  "message": ""
}
```

#### `POST /admin/lock`
Active ou désactive le verrou global. Si activé, toutes les sessions non-admin sont supprimées.

**Body JSON :**
```json
{
  "locked": true,
  "message": "Application en maintenance jusqu'à 18h."
}
```

---

## 📊 Statistiques publiques

### `GET /stats/public`

Route **publique** (sans token). Utilisée par la page de connexion pour afficher les compteurs.

**Réponse `200` :**
```json
{
  "sites": 42,
  "maintenances": 7,
  "produits": 128
}
```

---

## ❌ Codes d'erreur

| Code | Signification |
|---|---|
| `200` | Succès |
| `201` | Ressource créée |
| `400` | Requête invalide (champ manquant, contrainte violée...) |
| `401` | Token absent ou expiré |
| `403` | Accès interdit (rôle insuffisant ou compte bloqué) |
| `404` | Ressource introuvable |
| `409` | Conflit (ex : username déjà pris) |
| `500` | Erreur serveur interne |
| `503` | Application verrouillée par l'admin |

---

## 🗄️ Schéma de la base de données

```
clients
  └── id_client (PK)

sites
  └── id_site (PK)
  └── id_client (FK → clients)

produits
  └── id_produit (PK)
  └── id_site (→ sites)

maintenances
  └── id_maintenance (PK)
  └── id_site (→ sites)

maintenance_produits
  └── id_maintenance + id_produit (PK composite)
  └── id_maintenance (→ maintenances)
  └── id_produit (→ produits)

produit_photos
  └── id_photo (PK)
  └── id_produit (→ produits)
  └── id_maintenance (→ maintenances, nullable)

qr_codes
  └── id_qr (PK)
  └── id_produit (→ produits)

users
  └── id_user (PK)
  └── username (UNIQUE)

user_sessions
  └── session_id (PK)
  └── id_user (FK → users, ON DELETE CASCADE)
  └── ip_address
  └── created_at
  └── last_activity
  └── expires_at

activity_logs
  └── id (PK)
  └── id_user (→ users, nullable)

app_config
  └── config_key (PK)
  └── config_value
```

---

## 🛡️ Rate Limiting

| Périmètre | Limite |
|---|---|
| Global | 1000 requêtes / 15 min / IP |
| `POST /auth/login` | 10 requêtes / 15 min / IP |

---

*© 2026 Enzo Perrier*