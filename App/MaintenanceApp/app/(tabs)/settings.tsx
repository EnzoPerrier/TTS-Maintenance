import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { GlobalStyles } from "../../constants/Styles";
import { api } from "../../utils/api";
import { DEFAULT_IP, getServerIp, setServerIp } from "../../utils/serverConfig";
import { setGlobalToken } from "../_layout";

export default function SettingsScreen() {
  const [username, setUsername] = useState<string | null>(null);
  const [serverIp, setServerIpState] = useState<string>(DEFAULT_IP);
  const [ipInput, setIpInput] = useState<string>(DEFAULT_IP);
  const [ipEditing, setIpEditing] = useState(false);

  useEffect(() => {
    api
      .getMe()
      .then((me) => setUsername(me.username))
      .catch(() => setUsername(null));

    getServerIp().then((ip) => {
      setServerIpState(ip);
      setIpInput(ip);
    });
  }, []);

  const handleSaveIp = async () => {
    const trimmed = ipInput.trim();
    if (!trimmed) {
      Alert.alert("Erreur", "L'adresse IP ne peut pas être vide.");
      return;
    }
    // Validation simple : chiffres et points/deux-points uniquement
    const ipRegex = /^[\d.:a-zA-Z-]+$/;
    if (!ipRegex.test(trimmed)) {
      Alert.alert("Erreur", "Adresse IP invalide.");
      return;
    }
    await setServerIp(trimmed);
    setServerIpState(trimmed);
    setIpEditing(false);
    Alert.alert(
      "Serveur mis à jour",
      `L'API sera désormais contactée sur :\nhttp://${trimmed}/api\n\nRelancez l'application pour appliquer le changement.`
    );
  };

  const handleResetIp = async () => {
    await setServerIp(DEFAULT_IP);
    setServerIpState(DEFAULT_IP);
    setIpInput(DEFAULT_IP);
    setIpEditing(false);
    Alert.alert("Réinitialisé", `IP remise à la valeur par défaut : ${DEFAULT_IP}`);
  };

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: async () => {
          await api.logout();
          setGlobalToken(null);
        },
      },
    ]);
  };

  const onReportBugClick = () => {
    const now = new Date().toLocaleString("fr-FR");
    const user = username || "inconnu";
    const subject = `BUG TTSMaintenance App - ${user} | ${now}`;
    const body = ["Bonjour,", "", `Utilisateur : ${user}`, `Date : ${now}`, "", "Description du bug :", ""].join("\n");
    Linking.openURL(
      `mailto:tonemail@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    );
  };

  const initials = username ? username.slice(0, 2).toUpperCase() : "??";

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
            <Text style={styles.profileUsername}>{username ?? "Chargement..."}</Text>
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

        {/* ── BLOC SERVEUR ── */}
        <View style={styles.serverCard}>
          <View style={styles.serverHeader}>
            <Text style={styles.serverIcon}>🌐</Text>
            <Text style={styles.serverTitle}>Adresse du serveur</Text>
          </View>

          <Text style={styles.serverSubtitle}>
            URL actuelle : <Text style={styles.serverUrl}>http://{serverIp}/api</Text>
          </Text>

          {ipEditing ? (
            <>
              <View style={styles.ipInputRow}>
                <Text style={styles.ipPrefix}>http://</Text>
                <TextInput
                  style={styles.ipInput}
                  value={ipInput}
                  onChangeText={setIpInput}
                  placeholder={DEFAULT_IP}
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="default"
                />
                <Text style={styles.ipSuffix}>/api</Text>
              </View>

              <View style={styles.ipActions}>
                <TouchableOpacity
                  style={styles.ipSaveBtn}
                  onPress={handleSaveIp}
                >
                  <Text style={styles.ipSaveBtnText}>✓ Sauvegarder</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.ipCancelBtn}
                  onPress={() => {
                    setIpInput(serverIp);
                    setIpEditing(false);
                  }}
                >
                  <Text style={styles.ipCancelBtnText}>✕ Annuler</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleResetIp} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>↺ Remettre l'IP par défaut ({DEFAULT_IP})</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.editIpBtn}
              onPress={() => setIpEditing(true)}
            >
              <Text style={styles.editIpBtnText}>✏️ Modifier l'adresse IP</Text>
            </TouchableOpacity>
          )}
        </View>
        
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

  // Profil
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.borderBright,
    borderRadius: 14,
    padding: 20,
    marginBottom: 4,
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

  // Serveur
  serverCard: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.borderBright,
    borderRadius: 14,
    padding: 18,
    gap: 12,
  },
  serverHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  serverIcon: { fontSize: 20 },
  serverTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  serverSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  serverUrl: {
    color: Colors.primary,
    fontWeight: "600",
  },
  ipInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  ipPrefix: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  ipInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    fontSize: 15,
    color: Colors.text,
  },
  ipSuffix: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  ipActions: {
    flexDirection: "row",
    gap: 10,
  },
  ipSaveBtn: {
    flex: 1,
    backgroundColor: Colors.success,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  ipSaveBtnText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  ipCancelBtn: {
    flex: 1,
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  ipCancelBtnText: {
    color: Colors.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
  resetBtn: {
    alignItems: "center",
    paddingVertical: 6,
  },
  resetBtnText: {
    fontSize: 12,
    color: Colors.textMuted,
    textDecorationLine: "underline",
  },
  editIpBtn: {
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  editIpBtnText: {
    color: Colors.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },

  // Boutons action
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