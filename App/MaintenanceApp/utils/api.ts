import { Config } from '../constants/Config';
import { Maintenance, MaintenanceProduit, Photo, Produit, Site } from '../types';

const API = Config.API_URL;

export const api = {
  // Sites
  getSites: async (): Promise<Site[]> => {
    const res = await fetch(`${API}/sites`);
    return res.json();
  },

  getSiteById: async (id: number): Promise<Site> => {
    const res = await fetch(`${API}/sites/${id}`);
    return res.json();
  },

  // Produits
  getProducts: async (): Promise<Produit[]> => {
    const res = await fetch(`${API}/produits`);
    return res.json();
  },

  getProductById: async (id: number): Promise<Produit> => {
    const res = await fetch(`${API}/produits/${id}`);
    return res.json();
  },

  getProductsBySite: async (siteId: number): Promise<Produit[]> => {
    const res = await fetch(`${API}/produits/ProduitsBySiteID/${siteId}`);
    return res.json();
  },

  createProduct: async (data: {
    nom: string;
    id_site: number;
    departement?: string | null;
    etat?: string | null;
    description?: string | null;
  }): Promise<Produit> => {
    const res = await fetch(`${API}/produits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateProduct: async (id: number, data: Partial<Produit>): Promise<Produit> => {
    const res = await fetch(`${API}/produits/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!res.ok) {
      throw new Error('Erreur lors de la mise à jour du produit');
    }
    
    return res.json();
  },

  deleteProduct: async (id: number): Promise<Produit> => {
    const res = await fetch(`${API}/produits/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      throw new Error('Erreur lors de la suppression du produit');
    }

    const data: Produit = await res.json();
    return data;
  },

  // Maintenances
  getMaintenances: async (): Promise<Maintenance[]> => {
    const res = await fetch(`${API}/maintenances`);
    return res.json();
  },

  getMaintenancesNotFinished: async (): Promise<Maintenance[]> => {
    const res = await fetch(`${API}/maintenances/NotFinished`);
    return res.json();
  },

  getMaintenanceById: async (id: number): Promise<Maintenance> => {
    const res = await fetch(`${API}/maintenances/${id}`);
    return res.json();
  },

  getMaintenancesBySite: async (siteId: number): Promise<Maintenance[]> => {
    const res = await fetch(`${API}/maintenances/AllMaintenancesBySiteID/${siteId}`);
    return res.json();
  },

  createMaintenance: async (data: Partial<Maintenance>): Promise<Maintenance> => {
    const res = await fetch(`${API}/maintenances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteMaintenance: async (id: number): Promise<Maintenance> => {
    const res = await fetch(`${API}/maintenances/${id}`, {
      method: 'DELETE',
    });

    const data: Maintenance = await res.json();
    return data;
  },

  // Photos
  getPhotosByProduct: async (productId: number): Promise<Photo[]> => {
    const res = await fetch(`${API}/photos/produit/${productId}`);
    return res.json();
  },

  getPhotosByMaintenance: async (
    maintenanceId: number,
    productId: number
  ): Promise<Photo[]> => {
    const res = await fetch(
      `${API}/photos/maintenance/${maintenanceId}/${productId}`
    );
    return res.json();
  },

  uploadPhotos: async (data: {
    maintenance_id: number;
    produit_id: number;
    photos: string[];
  }): Promise<any> => {
    const res = await fetch(`${API}/photos/multiple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  uploadPhoto: async (formData: FormData): Promise<Photo> => {
    const res = await fetch(`${API}/photos`, {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) {
      throw new Error('Erreur lors de l\'upload de la photo');
    }
    
    return res.json();
  },

  deletePhoto: async (id: number): Promise<any> => {
    const res = await fetch(`${API}/photos/${id}`, {
      method: 'DELETE',
    });
    
    if (!res.ok) {
      throw new Error('Erreur lors de la suppression de la photo');
    }
    
    return res.json();
  },

  // Maintenance-Produits
  getProductsByMaintenance: async (
    maintenanceId: number
  ): Promise<MaintenanceProduit[]> => {
    const res = await fetch(
      `${API}/maintenance-produits/maintenance/${maintenanceId}`
    );
    return res.json();
  },

  addProductToMaintenance: async (data: {
    id_maintenance: number;
    id_produit: number;
    etat?: string;
    commentaire?: string;
    etat_constate?: string;
    travaux_effectues?: string;
    ri_interne?: string;
    photos?: string[];
  }): Promise<any> => {
    const res = await fetch(`${API}/maintenance-produits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
      throw new Error(error.error || 'Erreur lors de l association du produit');
    }

    return res.json();
  },

  removeProductFromMaintenance: async (id_maintenance: number, id_produit: number): Promise<Produit> => {
    const res = await fetch(`${API}/maintenance-produits/${id_maintenance}/${id_produit}`, {
      method: 'DELETE',
    });

    const data: Produit = await res.json();
    return data;
  },

  updateProductMaintenance: async (data: {
  id_maintenance: number;
  id_produit: number;
  etat?: string;
  commentaire?: string;
  etat_constate?: string;
  travaux_effectues?: string;
  ri_interne?: string;
}): Promise<any> => {
  const res = await fetch(`${API}/maintenance-produits/${data.id_maintenance}/${data.id_produit}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Erreur inconnue' }));
    throw new Error(error.error || 'Erreur lors de la mise à jour');
  }

  return res.json();
},
};