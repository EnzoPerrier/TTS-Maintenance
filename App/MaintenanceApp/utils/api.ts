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
  
  // Maintenances
  getMaintenances: async (): Promise<Maintenance[]> => {
    const res = await fetch(`${API}/maintenances`);
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
  
  // Photos
  getPhotosByProduct: async (productId: number): Promise<Photo[]> => {
    const res = await fetch(`${API}/photos/produit/${productId}`);
    return res.json();
  },
  
  getPhotosByMaintenance: async (maintenanceId: number, productId: number): Promise<Photo[]> => {
    const res = await fetch(`${API}/photos/maintenance/${maintenanceId}/${productId}`);
    return res.json();
  },
  
  uploadPhotos: async (formData: FormData): Promise<any> => {
    const res = await fetch(`${API}/photos/multiple`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },
  
  // Maintenance-Produits
  getProductsByMaintenance: async (maintenanceId: number): Promise<MaintenanceProduit[]> => {
    const res = await fetch(`${API}/maintenance-produits/maintenance/${maintenanceId}`);
    return res.json();
  },
  
  addProductToMaintenance: async (data: {
    id_maintenance: number;
    id_produit: number;
    etat?: string;
    commentaire?: string;
  }): Promise<any> => {
    const res = await fetch(`${API}/maintenance-produits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};