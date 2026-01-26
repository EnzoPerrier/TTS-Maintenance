import { Colors } from '../constants/Colors';
import { StatusConfig } from '../types';

export const getEtatColor = (etat?: string): string => {
  if (!etat) return Colors.gray600;
  const e = etat.toLowerCase();
  if (e === 'ok') return Colors.success;
  if (e === 'nok') return Colors.danger;
  if (e === 'passable') return Colors.warning;
  return Colors.gray600;
};

export const getStatusConfig = (etat?: string): StatusConfig => {
  const etatLower = (etat || '').toLowerCase();
  if (etatLower.includes('termin')) return { color: Colors.success, icon: '✅' };
  if (etatLower.includes('cours')) return { color: Colors.warning, icon: '⚙️' };
  if (etatLower.includes('planif')) return { color: Colors.primary, icon: '📅' };
  return { color: Colors.gray600, icon: '🔧' };
};