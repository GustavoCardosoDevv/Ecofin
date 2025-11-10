// src/screens/AccountSettingsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  deleteUser,
} from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import COLORS from '../theme/colors';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function AccountSettingsScreen({ navigation }) {
  const { user } = useAuth();

  const [visible, setVisible] = useState(true); // popup visível ao abrir
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [loadingPass, setLoadingPass] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 🔹 Salva preferências
  async function persistPreferences() {
    try {
      const ref = doc(db, 'users', user.uid);
      await setDoc(ref, { prefs: { darkMode, notifications } }, { merge: true });
    } catch (e) {
      console.log('Erro ao salvar preferências:', e);
    }
  }

  const handleToggleDark = (v) => {
    setDarkMode(v);
    persistPreferences();
  };
  const handleToggleNoti = (v) => {
    setNotifications(v);
    persistPreferences();
  };

  // 🔹 Alterar senha
  async function handleChangePassword() {
    if (!currentPass || !newPass) {
      Alert.alert('Atenção', 'Preencha a senha atual e a nova senha.');
      return;
    }
    if (newPass.length < 6) {
      Alert.alert('Ops', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      setLoadingPass(true);
      const cred = EmailAuthProvider.credential(user.email, currentPass);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPass);
      setCurrentPass('');
      setNewPass('');
      Alert.alert('Sucesso', 'Senha alterada com sucesso!');
    } catch (e) {
      console.log('Erro ao alterar senha:', e);
      Alert.alert('Erro', 'Não foi possível alterar a senha.');
    } finally {
      setLoadingPass(false);
    }
  }

  // 🔹 Excluir conta
  async function handleDeleteFlow() {
    Alert.alert(
      'Excluir conta',
      'Tem certeza que deseja excluir sua conta permanentemente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteUser(user);
              Alert.alert('Conta excluída', 'Sua conta foi removida.');
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            } catch (e) {
              console.log('Erro ao excluir conta:', e);
              Alert.alert('Erro', 'Não foi possível excluir a conta.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  // 🔹 Fecha popup e volta
  const handleClose = () => {
    setVisible(false);
    setTimeout(() => navigation.goBack(), 200);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <ScrollView contentContainerStyle={{ padding: 18 }}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Tela de Ajuda</Text>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Preferências */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Preferências</Text>
              <View style={styles.row}>
                <Text style={styles.rowText}>Modo Escuro</Text>
                <Switch value={darkMode} onValueChange={handleToggleDark} />
              </View>
              <View style={styles.row}>
                <Text style={styles.rowText}>Notificações</Text>
                <Switch value={notifications} onValueChange={handleToggleNoti} />
              </View>
            </View>

            {/* Segurança */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Segurança</Text>
              <Text style={styles.label}>Senha Atual</Text>
              <TextInput
                value={currentPass}
                onChangeText={setCurrentPass}
                placeholder="Senha atual"
                secureTextEntry
                style={styles.input}
              />
              <Text style={styles.label}>Nova Senha</Text>
              <TextInput
                value={newPass}
                onChangeText={setNewPass}
                placeholder="Nova senha"
                secureTextEntry
                style={styles.input}
              />
              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={loadingPass}
                style={[styles.primaryBtn, loadingPass && { opacity: 0.7 }]}
              >
                <Text style={styles.primaryBtnText}>
                  {loadingPass ? 'Alterando...' : 'Alterar senha'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Excluir conta */}
            <TouchableOpacity
              onPress={handleDeleteFlow}
              disabled={deleting}
              style={[styles.dangerBtn, deleting && { opacity: 0.7 }]}
            >
              <Text style={styles.dangerBtnText}>
                {deleting ? 'Excluindo...' : 'Excluir minha conta'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E7D32',
  },
  closeBtn: {
    fontSize: 22,
    color: '#444',
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: '#1B5E20',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowText: { fontSize: 15, color: '#222' },
  label: { color: '#444', marginTop: 10 },
  input: {
    backgroundColor: '#EEF2F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#333',
    marginBottom: 8,
  },
  primaryBtn: {
    marginTop: 10,
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  dangerBtn: {
    marginTop: 16,
    backgroundColor: '#E53935',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerBtnText: { color: '#fff', fontWeight: '700' },
});
