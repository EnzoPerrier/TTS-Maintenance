import { useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../../constants/Colors";
import { GlobalStyles } from "../../constants/Styles";
import { api } from "../../utils/api";
import { setGlobalToken } from "../_layout";

export default function SettingsScreen() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    api.getMe()
      .then((me) => setUsername(me.username))
      .catch(() => setUsername(null));
  }, []);

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Se déconnecter",
          style: "destructive",
          onPress: async () => {
            await api.logout();
            setGlobalToken(null);
          },
        },
      ]
    );
  };

  const onReportBugClick = () => {
    const now = new Date().toLocaleString("fr-FR");
    const user = username || "inconnu";
    const subject = `BUG TTSMaintenance App - ${user} | ${now}`;
    const body = [
      "Bonjour,",
      "",
      `Utilisateur : ${user}`,
      `Date : ${now}`,
      "",
      "Description du bug :",
      "",
    ].join("\n");
    Linking.openURL(
      `mailto:tonemail@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    );
  };

  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : "??";

  return (
    <View style={GlobalStyles.container}>
      <View style={GlobalStyles.header}>
        <Text style={GlobalStyles.headerTitle}>⚙️ Paramètres</Text>
      </View>

      <View style={styles.content}>

        {/* ── BLOC PROFIL ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View>
            <Text style={styles.profileLabel}>Connecté en tant que</Text>
            <Text style={styles.profileUsername}>
              {username ?? "Chargement..."}
            </Text>
          </View>
        </View>

        {/* ── BOUTONS ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.btnIcon}>🚪</Text>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bugBtn} onPress={onReportBugClick}>
          <Text style={styles.btnIcon}>🪳</Text>
          <Text style={styles.bugText}>Signaler un bug</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 28,
    gap: 16,
  },

  // Bloc profil
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.borderBright,
    borderRadius: 14,
    padding: 20,
    marginBottom: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1,
  },
  profileLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
  },

  // Boutons
  btnIcon: { fontSize: 22 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 12,
    padding: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.danger,
  },
  bugBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: 12,
    padding: 16,
  },
  bugText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.warning,
  },
});