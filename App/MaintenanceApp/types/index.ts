// ─── ENTITÉS PRINCIPALES ──────────────────────────────────────────────────────

export interface Client {
  id_client: number;
  nom: string;
  contact?: string | null;
  adresse?: string | null;
  email?: string | null;
  telephone?: string | null;
  date_creation?: string | null;
}

export interface Site {
  id_site: number;
  id_client: number;
  nom: string;
  adresse?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  date_creation?: string | null;
}

export interface Produit {
  id_produit: number;
  id_site: number;
  nom: string;
  departement?: string | null;
  etat?: 'OK' | 'NOK' | 'Passable' | null;
  description?: string | null;
  date_creation?: string | null;
}

export interface Maintenance {
  id_maintenance: number;
  id_site: number;
  date_maintenance: string;
  type: string;
  // Stocké en TEXT, séparé par virgules ex: "Installation, Révision"
  types_intervention?: string | null;
  etat?: string | null;
  departement?: string | null;
  commentaire?: string | null;
  date_creation?: string | null;
  // Stocké en TEXT, séparé par virgules ou \n ex: "JD, ML, AB"
  operateurs?: string | null;
  // Horaires (fallback champs simples)
  heure_arrivee_matin?: string | null;
  heure_depart_matin?: string | null;
  heure_arrivee_aprem?: string | null;
  heure_depart_aprem?: string | null;
  // Horaires multi-jours (JSON stringifié)
  jours_intervention?: string | null;
  // Infos complémentaires
  garantie?: number | boolean | null;
  commentaire_interne?: string | null;
  contact?: string | null;
  type_produit?: string | null;
  numero_commande?: string | null;
  numero_ri?: string | null;
  designation_produit_site?: string | null;
  date_demande?: string | null;
  date_accord_client?: string | null;
  // Champs joints (retournés par certains endpoints)
  client_nom?: string | null;
  site_nom?: string | null;
}

export interface Photo {
  id_photo: number;
  id_produit: number;
  id_maintenance?: number | null;
  chemin_photo: string;
  commentaire?: string | null;
  date_creation: string;
  // Champs joints
  date_maintenance?: string | null;
  maintenance_type?: string | null;
  produit_nom?: string | null;
}

// Produit enrichi avec les infos de la liaison maintenance_produits
export interface MaintenanceProduit extends Produit {
  commentaire?: string | null;
  etat?: string | null;
  etat_constate?: string | null;
  travaux_effectues?: string | null;
  ri_interne?: string | null;
  photo?: string | null;
}

// ─── TYPES UTILITAIRES ────────────────────────────────────────────────────────

export type EtatProduit = 'OK' | 'NOK' | 'Passable' | 'Non vérifié';

export type EtatMaintenance = 'Planifiée' | 'En cours' | 'Terminée';

export type TypeMaintenance =
  | 'Installation'
  | 'Intervention curative'
  | 'Révision'
  | 'Contrat de maintenance'
  | 'Location'
  | 'Accident'
  | 'Vandalisme'
  | 'Orage'
  | 'Autre';

export interface StatusConfig {
  color: string;
  icon: string;
}