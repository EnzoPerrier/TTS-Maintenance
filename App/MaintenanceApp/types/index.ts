export interface Site {
  id_site: number;
  id_client: number;
  nom: string;
  adresse?: string;
  gps_lat?: number;
  gps_lng?: number;
}

export interface Produit {
  id_produit: number;
  id_site: number;
  nom: string;
  departement?: string;
  etat?: 'OK' | 'NOK' | 'Passable';
  description?: string;
  date_creation?: string;
}

export interface Maintenance {
  id_maintenance: number;
  id_site: number;
  date_maintenance: string;
  type: string;
  etat?: string;
  departement?: string;
  commentaire?: string;
  ri_interne?: string;
}

export interface Photo {
  id_photo: number;
  id_produit: number;
  id_maintenance?: number;
  chemin_photo: string;
  commentaire?: string;
  date_creation: string;
}

export interface MaintenanceProduit extends Produit {
  commentaire?: string;
  etat?: string;
}

export type EtatProduit = 'OK' | 'NOK' | 'Passable' | 'Non vérifié';

export interface StatusConfig {
  color: string;
  icon: string;
}