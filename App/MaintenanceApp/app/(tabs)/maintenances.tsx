import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { Colors } from '../../constants/Colors';
import { CardStyles, GlobalStyles } from '../../constants/Styles';
import { useMaintenances } from '../../hooks/useMaintenances';
import { api } from '../../utils/api';
import { formatDate } from '../../utils/formatters';
import { getStatusConfig } from '../../utils/helpers';

export default function MaintenancesScreen() {
  const router = useRouter();
  const { maintenances, refreshing, loadMaintenancesNotFinished, refresh } = useMaintenances();

  useEffect(() => {
    loadMaintenancesNotFinished();
  }, []);

  const handleDelete = (id_maintenance: number, type: string) => {
    Alert.alert(
      'Supprimer la maintenance',
      `Voulez-vous vraiment supprimer la maintenance "${type}" ?\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteMaintenance(id_maintenance);
              Alert.alert('Succès', 'Maintenance supprimée avec succès');
              loadMaintenancesNotFinished();
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Impossible de supprimer cette maintenance.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={GlobalStyles.container}>
      <View style={GlobalStyles.header}>
        <Text style={GlobalStyles.headerTitle}>🔧 Maintenances</Text>
        <Text style={GlobalStyles.headerSubtitle}>
          {maintenances.length} en cours / planifiée(s)
        </Text>
      </View>

      <ScrollView
        style={GlobalStyles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadMaintenancesNotFinished} />}
      >
        {/* Bouton ajouter */}
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/maintenance/add')}>
          <Text style={styles.addBtnText}>➕ Nouvelle maintenance</Text>
        </TouchableOpacity>

        {maintenances.map(m => {
          const { color, icon } = getStatusConfig(m.etat);
          return (
            <Card key={m.id_maintenance} title={`${icon} ${m.type}`} borderLeftColor={color}>
              <Text style={CardStyles.cardText}>📅 {formatDate(m.date_maintenance)}</Text>
              <Text style={CardStyles.cardText}>
                État : <Text style={{ color, fontWeight: '600' }}>{m.etat || 'N/A'}</Text>
              </Text>
              {m.departement && <Text style={CardStyles.cardText}>🏷️ {m.departement}</Text>}
              {m.commentaire && <Text style={CardStyles.cardComment}>💬 {m.commentaire}</Text>}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.detailsBtn}
                  onPress={() => router.push(`/maintenance/${m.id_maintenance}`)}
                >
                  <Text style={styles.btnText}>Détails →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(m.id_maintenance, m.type)}
                >
                  <Text style={styles.btnText}>🗑️ Supprimer</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}

        {maintenances.length === 0 && (
          <Text style={styles.emptyText}>Aucune maintenance en cours ou planifiée</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    backgroundColor: Colors.success,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.gray200 },
  detailsBtn: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  deleteBtn: { flex: 1, backgroundColor: Colors.danger, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: Colors.gray600, fontStyle: 'italic', padding: 24, fontSize: 15 },
});