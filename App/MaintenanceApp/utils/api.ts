import AsyncStorage from "@react-native-async-storage/async-storage";
import { Config } from "../constants/Config";
import {
  Client,
  Maintenance,
  MaintenanceProduit,
  Photo,
  Produit,
  Site,
} from "../types";

const API = Config.API_URL;

// ─── Token helpers ─────────────────────────────────────────────────────────

export const tokenStorage = {
  get: () => AsyncStorage.getItem("token"),
  set: (token: string) => AsyncStorage.setItem("token", token),
  remove: () => AsyncStorage.removeItem("token"),
};

// Callback appelé quand le token est expiré/invalide → à brancher dans ton _layout.tsx
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

// ─── fetch authentifié ─────────────────────────────────────────────────────
// Toutes les requêtes passent par authFetch.
// - Ajoute automatiquement le header Authorization: Bearer <token>
// - Sur 401/403 : supprime le token et déclenche onUnauthorized()
// - Pour les uploads multipart (FormData), ne pas passer Content-Type
//   (le navigateur/RN le génère avec le boundary correct)

async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await tokenStorage.get();

  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    // Content-Type seulement pour les requêtes JSON
    ...(!isFormData && { "Content-Type": "application/json" }),
    // Token si présent
    ...(token && { Authorization: `Bearer ${token}` }),
    // Laisser l'appelant surcharger si besoin
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(url, { ...options, headers });

  // Token expiré ou invalide → déconnexion automatique
  if (res.status === 401 || res.status === 403) {
    await tokenStorage.remove();
    onUnauthorized?.();
  }

  return res;
}

// ─── API ───────────────────────────────────────────────────────────────────

export const api = {
  // ─── AUTH ─────────────────────────────────────────────────────────────────
  // login est le seul appel sans token (authFetch inclura quand même le token
  // s'il existe, ce qui est inoffensif)

  login: async (data: {
    username: string;
    password: string;
  }): Promise<{ token: string; user: any }> => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: "Erreur inconnue" }));
      throw new Error(err.message || "Identifiants incorrects");
    }
    const result = await res.json();
    await tokenStorage.set(result.token);
    return result;
  },

  logout: async (): Promise<void> => {
    await tokenStorage.remove();
  },

  // ─── SITES ────────────────────────────────────────────────────────────────

  getSites: async (): Promise<Site[]> => {
    const res = await authFetch(`${API}/sites`);
    return res.json();
  },

  getSiteById: async (id: number): Promise<Site> => {
    const res = await authFetch(`${API}/sites/${id}`);
    return res.json();
  },

  createSite: async (data: {
    id_client: number;
    nom: string;
    adresse?: string | null;
    gps_lat?: number | null;
    gps_lng?: number | null;
  }): Promise<Site> => {
    const res = await authFetch(`${API}/sites`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erreur lors de la création du site");
    return res.json();
  },

  updateSite: async (id: number, data: Partial<Site>): Promise<void> => {
    const res = await authFetch(`${API}/sites/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erreur lors de la mise à jour du site");
  },

  deleteSite: async (id: number): Promise<void> => {
    const res = await authFetch(`${API}/sites/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erreur lors de la suppression du site");
  },

  // ─── CLIENTS ──────────────────────────────────────────────────────────────

  getClients: async (): Promise<Client[]> => {
    const res = await authFetch(`${API}/clients`);
    return res.json();
  },

  getClientById: async (id: number): Promise<Client> => {
    const res = await authFetch(`${API}/clients/${id}`);
    return res.json();
  },

  createClient: async (data: {
    nom: string;
    contact?: string | null;
    adresse?: string | null;
    email?: string | null;
    telephone?: string | null;
  }): Promise<Client> => {
    const res = await authFetch(`${API}/clients`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erreur lors de la création du client");
    return res.json();
  },

  updateClient: async (id: number, data: Partial<Client>): Promise<void> => {
    const res = await authFetch(`${API}/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erreur lors de la mise à jour du client");
  },

  deleteClient: async (id: number): Promise<void> => {
    const res = await authFetch(`${API}/clients/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
      throw new Error(err.error || "Erreur lors de la suppression du client");
    }
  },

  // ─── PRODUITS ─────────────────────────────────────────────────────────────

  getProducts: async (): Promise<Produit[]> => {
    const res = await authFetch(`${API}/produits`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  getProductById: async (id: number): Promise<Produit> => {
    const res = await authFetch(`${API}/produits/${id}`);
    return res.json();
  },

  getProductsBySite: async (siteId: number): Promise<Produit[]> => {
    const res = await authFetch(`${API}/produits/ProduitsBySiteID/${siteId}`);
    return res.json();
  },

  createProduct: async (data: {
    nom: string;
    id_site: number;
    departement?: string | null;
    etat?: string | null;
    description?: string | null;
  }): Promise<Produit> => {
    const res = await authFetch(`${API}/produits`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erreur lors de la création du produit");
    return res.json();
  },

  updateProduct: async (
    id: number,
    data: Partial<Produit>,
  ): Promise<Produit> => {
    const res = await authFetch(`${API}/produits/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erreur lors de la mise à jour du produit");
    return res.json();
  },

  deleteProduct: async (id: number): Promise<void> => {
    const res = await authFetch(`${API}/produits/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erreur lors de la suppression du produit");
  },

  // ─── MAINTENANCES ─────────────────────────────────────────────────────────

  getMaintenances: async (): Promise<Maintenance[]> => {
    const res = await authFetch(`${API}/maintenances`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  getMaintenancesNotFinished: async (): Promise<Maintenance[]> => {
    const res = await authFetch(`${API}/maintenances/NotFinished`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  getMaintenanceById: async (id: number): Promise<Maintenance> => {
    const res = await authFetch(`${API}/maintenances/${id}`);
    return res.json();
  },

  getMaintenancesBySite: async (siteId: number): Promise<Maintenance[]> => {
    const res = await authFetch(
      `${API}/maintenances/AllMaintenancesBySiteID/${siteId}`,
    );
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  createMaintenance: async (data: {
    id_site: number;
    date_maintenance: string;
    type: string;
    types_intervention?: string | null;
    etat?: string | null;
    commentaire?: string | null;
    operateurs?: string | null;
    heure_arrivee_matin?: string | null;
    heure_depart_matin?: string | null;
    heure_arrivee_aprem?: string | null;
    heure_depart_aprem?: string | null;
    jours_intervention?: string | null;
    garantie?: number | boolean | null;
    commentaire_interne?: string | null;
    contact?: string | null;
    type_produit?: string | null;
    numero_commande?: string | null;
    numero_ri?: string | null;
    designation_produit_site?: string | null;
    date_demande?: string | null;
    date_accord_client?: string | null;
    departement?: string | null;
  }): Promise<Maintenance> => {
    const res = await authFetch(`${API}/maintenances`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok)
      throw new Error("Erreur lors de la création de la maintenance");
    return res.json();
  },

  updateMaintenance: async (
    id: number,
    data: {
      id_site?: number;
      date_maintenance?: string;
      type?: string;
      types_intervention?: string | null;
      etat?: string | null;
      commentaire?: string | null;
      operateurs?: string | null;
      heure_arrivee_matin?: string | null;
      heure_depart_matin?: string | null;
      heure_arrivee_aprem?: string | null;
      heure_depart_aprem?: string | null;
      jours_intervention?: string | null;
      garantie?: number | boolean | null;
      commentaire_interne?: string | null;
      contact?: string | null;
      type_produit?: string | null;
      numero_commande?: string | null;
      numero_ri?: string | null;
      designation_produit_site?: string | null;
      date_demande?: string | null;
      date_accord_client?: string | null;
      departement?: string | null;
    },
  ): Promise<void> => {
    const res = await authFetch(`${API}/maintenances/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (!res.ok)
      throw new Error("Erreur lors de la mise à jour de la maintenance");
  },

  deleteMaintenance: async (id: number): Promise<void> => {
    const res = await authFetch(`${API}/maintenances/${id}`, {
      method: "DELETE",
    });
    if (!res.ok)
      throw new Error("Erreur lors de la suppression de la maintenance");
  },

  getMaintenanceReportUrl: (id: number): string =>
    `${API}/maintenances/${id}/html`,
  getMaintenancePdfUrl: (id: number): string => `${API}/maintenances/${id}/pdf`,

  // ─── MAINTENANCE-PRODUITS ─────────────────────────────────────────────────

  getProductsByMaintenance: async (
    maintenanceId: number,
  ): Promise<MaintenanceProduit[]> => {
    const res = await authFetch(
      `${API}/maintenance-produits/maintenance/${maintenanceId}`,
    );
    return res.json();
  },

  getMaintenancesByProduct: async (
    productId: number,
  ): Promise<MaintenanceProduit[]> => {
    const res = await authFetch(
      `${API}/maintenance-produits/produit/${productId}`,
    );
    return res.json();
  },

  addProductToMaintenance: async (data: {
    id_maintenance: number;
    id_produit: number;
    etat?: string | null;
    commentaire?: string | null;
    etat_constate?: string | null;
    travaux_effectues?: string | null;
    ri_interne?: string | null;
  }): Promise<any> => {
    const res = await authFetch(`${API}/maintenance-produits`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
      throw new Error(err.error || "Erreur lors de l'association du produit");
    }
    return res.json();
  },

  updateProductMaintenance: async (data: {
    id_maintenance: number;
    id_produit: number;
    etat?: string | null;
    commentaire?: string | null;
    etat_constate?: string | null;
    travaux_effectues?: string | null;
    ri_interne?: string | null;
  }): Promise<any> => {
    const res = await authFetch(
      `${API}/maintenance-produits/${data.id_maintenance}/${data.id_produit}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
      throw new Error(err.error || "Erreur lors de la mise à jour");
    }
    return res.json();
  },

  removeProductFromMaintenance: async (
    id_maintenance: number,
    id_produit: number,
  ): Promise<void> => {
    const res = await authFetch(
      `${API}/maintenance-produits/${id_maintenance}/${id_produit}`,
      { method: "DELETE" },
    );
    if (!res.ok) throw new Error("Erreur lors du retrait du produit");
  },

  // ─── PHOTOS ───────────────────────────────────────────────────────────────

  getPhotosByProduct: async (productId: number): Promise<Photo[]> => {
    const res = await authFetch(`${API}/photos/produit/${productId}`);
    return res.json();
  },

  getLatestPhotoByProduct: async (productId: number): Promise<Photo> => {
    const res = await authFetch(`${API}/photos/latest/${productId}`);
    if (!res.ok) throw new Error("Aucune photo trouvée");
    return res.json();
  },

  getPhotosByMaintenance: async (maintenanceId: number): Promise<Photo[]> => {
    const res = await authFetch(`${API}/photos/maintenance/${maintenanceId}`);
    return res.json();
  },

  getPhotosByMaintenanceProduit: async (
    maintenanceId: number,
    productId: number,
  ): Promise<Photo[]> => {
    const res = await authFetch(
      `${API}/photos/maintenance/${maintenanceId}/${productId}`,
    );
    return res.json();
  },

  getPhotoById: async (id: number): Promise<Photo> => {
    const res = await authFetch(`${API}/photos/${id}`);
    if (!res.ok) throw new Error("Photo non trouvée");
    return res.json();
  },

  // Upload simple — FormData contient : photo, id_produit, id_maintenance?, commentaire?
  uploadPhoto: async (formData: FormData): Promise<Photo> => {
    // authFetch détecte FormData et n'ajoute pas Content-Type
    const res = await authFetch(`${API}/photos`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Erreur lors de l'upload de la photo");
    return res.json();
  },

  // Upload multiple — FormData contient : photos[], id_produit, id_maintenance?, commentaire?
  uploadMultiplePhotos: async (
    formData: FormData,
  ): Promise<{
    message: string;
    photos: Photo[];
    id_produit: number;
    id_maintenance: number | null;
  }> => {
    const res = await authFetch(`${API}/photos/multiple`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
      throw new Error(err.error || "Erreur lors de l'upload des photos");
    }
    return res.json();
  },

  updatePhotoComment: async (
    id: number,
    commentaire: string | null,
  ): Promise<void> => {
    const res = await authFetch(`${API}/photos/${id}`, {
      method: "PUT",
      body: JSON.stringify({ commentaire }),
    });
    if (!res.ok) throw new Error("Erreur lors de la mise à jour de la photo");
  },

  deletePhoto: async (id: number): Promise<void> => {
    const res = await authFetch(`${API}/photos/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erreur lors de la suppression de la photo");
  },
};
