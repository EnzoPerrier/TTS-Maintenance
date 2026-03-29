import { StyleSheet } from 'react-native';
import { Colors } from './Colors';

// ── Ombres ──────────────────────────────────────────────────────────────────
const shadowSm = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.35,
  shadowRadius: 4,
  elevation: 3,
};
const shadowMd = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.45,
  shadowRadius: 10,
  elevation: 6,
};

// ── Global ───────────────────────────────────────────────────────────────────
export const GlobalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Header avec fond semi-transparent façon CSS
  header: {
    backgroundColor: 'rgba(15,17,23,0.97)',
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...shadowMd,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 3,
  },

  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  scrollView: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.bg,
  },

  backButton: {
    marginBottom: 10,
    alignSelf: 'flex-start',
  },

  backButtonText: {
    color: Colors.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
});

// ── Cards ────────────────────────────────────────────────────────────────────
export const CardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadowSm,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    letterSpacing: -0.2,
  },

  cardText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  cardComment: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

// ── Boutons ──────────────────────────────────────────────────────────────────
export const ButtonStyles = StyleSheet.create({
  // Bouton primaire bleu
  primary: {
    backgroundColor: Colors.primary,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    ...shadowSm,
  },
  primaryText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Bouton danger rouge
  danger: {
    backgroundColor: Colors.danger,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // Bouton secondaire (surface3 + border)
  secondary: {
    backgroundColor: Colors.surface3,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Bouton succès vert
  success: {
    backgroundColor: Colors.success,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  successText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // Bouton orange accent (FAB-like)
  accent: {
    backgroundColor: Colors.accent,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  accentText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

// ── Inputs ───────────────────────────────────────────────────────────────────
export const InputStyles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.text,
    fontFamily: 'monospace',
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface3,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
});

// ── Formulaire de section (comme form-section du CSS) ─────────────────────
export const FormStyles = StyleSheet.create({
  section: {
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderBright,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

// ── Stats cards (comme stat-card-modern du CSS) ────────────────────────────
export const StatStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...shadowSm,
  },
  value: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -1,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: Colors.surface2,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
});

// ── Badge statut ─────────────────────────────────────────────────────────────
export const BadgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  text: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});

// ── Modal ────────────────────────────────────────────────────────────────────
export const ModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5,8,15,0.85)',
    justifyContent: 'flex-end',
  },
  overlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(5,8,15,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 22,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.borderBright,
  },
  contentCenter: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 22,
    width: '92%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: Colors.borderBright,
    ...shadowMd,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: -0.4,
  },
});

// ── Tab bar ──────────────────────────────────────────────────────────────────
export const TabStyles = {
  tabBarStyle: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 8,
    paddingTop: 8,
    height: 62,
  },
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
};