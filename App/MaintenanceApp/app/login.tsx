import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { api } from '../utils/api';
import { DEFAULT_IP, getServerIp, setServerIp } from '../utils/serverConfig';
import { setGlobalToken } from './_layout';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // IP du serveur
  const [serverIp, setServerIpState] = useState<string>(DEFAULT_IP);
  const [showIpForm, setShowIpForm] = useState(false);
  const [ipInput, setIpInput] = useState<string>(DEFAULT_IP);

  useEffect(() => {
    getServerIp().then((ip) => {
      setServerIpState(ip);
      setIpInput(ip);
    });
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Erreur', 'Remplissez tous les champs');
      return;
    }
    setLoading(true);
    try {
      const result = await api.login({ username, password });
      setGlobalToken(result.token);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIp = async () => {
    const trimmed = ipInput.trim();
    if (!trimmed) {
      Alert.alert('Erreur', "L'adresse IP ne peut pas être vide.");
      return;
    }
    await setServerIp(trimmed);
    setServerIpState(trimmed);
    setShowIpForm(false);
    Alert.alert(
      'Serveur mis à jour',
      `Nouvelle adresse :\nhttp://${trimmed}/api\n\nRelancez l'application pour appliquer.`
    );
  };

  const handleResetIp = async () => {
    await setServerIp(DEFAULT_IP);
    setServerIpState(DEFAULT_IP);
    setIpInput(DEFAULT_IP);
    setShowIpForm(false);
    Alert.alert('Réinitialisé', `IP remise à : ${DEFAULT_IP}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        TTS<Text style={styles.accent}>maintenance</Text>
      </Text>
      <Text style={styles.subtitle}>Connexion requise</Text>

      <TextInput
        style={styles.input}
        placeholder="Identifiant"
        placeholderTextColor={Colors.textMuted}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        placeholderTextColor={Colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.btn, loading && { opacity: 0.5 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.btnText}>
          {loading ? '⏳ Connexion...' : 'Se connecter →'}
        </Text>
      </TouchableOpacity>

      {/* ── Lien changement IP ── */}
      <TouchableOpacity
        style={styles.serverLink}
        onPress={() => {
          setIpInput(serverIp);
          setShowIpForm(!showIpForm);
        }}
      >
        <Text style={styles.serverLinkText}>
          🌐 Serveur : <Text style={styles.serverLinkIp}>{serverIp}</Text>
        </Text>
      </TouchableOpacity>

      {/* ── Formulaire IP (affiché si showIpForm) ── */}
      {showIpForm && (
        <View style={styles.ipCard}>
          <Text style={styles.ipCardTitle}>Adresse IP du serveur</Text>

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
            />
            <Text style={styles.ipSuffix}>/api</Text>
          </View>

          <View style={styles.ipActions}>
            <TouchableOpacity style={styles.ipSaveBtn} onPress={handleSaveIp}>
              <Text style={styles.ipSaveBtnText}>✓ Sauvegarder</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ipCancelBtn}
              onPress={() => setShowIpForm(false)}
            >
              <Text style={styles.ipCancelBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleResetIp} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>↺ IP par défaut ({DEFAULT_IP})</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    padding: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -1,
  },
  accent: { color: Colors.primary },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 14,
  },
  btn: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },

  // Lien serveur
  serverLink: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 8,
  },
  serverLinkText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  serverLinkIp: {
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Carte IP
  ipCard: {
    marginTop: 12,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.borderBright,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  ipCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ipInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  ipPrefix: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  ipInput: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 6,
    fontSize: 14,
    color: Colors.text,
  },
  ipSuffix: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  ipActions: {
    flexDirection: 'row',
    gap: 8,
  },
  ipSaveBtn: {
    flex: 1,
    backgroundColor: Colors.success,
    padding: 11,
    borderRadius: 9,
    alignItems: 'center',
  },
  ipSaveBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  ipCancelBtn: {
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 9,
    alignItems: 'center',
  },
  ipCancelBtnText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  resetBtn: {
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 12,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});