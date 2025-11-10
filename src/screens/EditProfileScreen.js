import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import COLORS from '../theme/colors';

import {
  updateProfile,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';

import { auth, db, storage } from '../services/firebase';

export default function EditProfileScreen({ navigation }) {
  const { user } = useAuth();

  // valores iniciais do Auth
  const initialName = useMemo(() => user?.displayName || '', [user]);
  const initialEmail = useMemo(() => user?.email || '', [user]);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);

  // dados extras (Firestore)
  const [phone, setPhone] = useState('');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');

  // estados de UI
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // 1) buscar dados do Firestore (phone, photoURL)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const refUser = doc(db, 'users', user.uid);
        const snap = await getDoc(refUser);
        if (mounted && snap.exists()) {
          const data = snap.data();
          // tente ler em data.profile.* (como salvamos)
          const p = data?.profile || {};
          if (p.phone) setPhone(p.phone);
          if (p.photoURL) setPhotoURL(p.photoURL);
        }
      } catch (e) {
        console.log('LOAD PROFILE DOC ERROR ->', e);
      } finally {
        mounted && setLoadingDoc(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.uid]);

  // pede senha para reautenticar (caso precise mudar e-mail)
  function promptPassword() {
    return new Promise((resolve) => {
      if (Platform.OS === 'web') {
        const v = window.prompt('Confirme sua senha para atualizar o e-mail:');
        resolve(v || null);
        return;
      }
      if (Alert.prompt) {
        Alert.prompt(
          'Confirmar senha',
          'Digite sua senha para atualizar o e-mail.',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
            { text: 'OK', onPress: (txt) => resolve(txt || '') },
          ],
          'secure-text'
        );
      } else {
        // Para Android, o ideal é um modal próprio
        resolve(null);
      }
    });
  }

  // 2) escolher imagem e fazer upload
  async function onPickAvatar() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão', 'Precisamos da permissão da galeria.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];

      // upload
      setUploading(true);
      setProgress(0);

      // fazer fetch do arquivo local (web/mobile)
      const blob = await (await fetch(asset.uri)).blob();
      const fileRef = ref(storage, `avatars/${user.uid}.jpg`);
      const task = uploadBytesResumable(fileRef, blob);

      task.on('state_changed', (snap) => {
        const p = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setProgress(p);
      });

      await task;
      const url = await getDownloadURL(fileRef);

      // salvar em Auth e Firestore
      await updateProfile(auth.currentUser, { photoURL: url });
      await setDoc(doc(db, 'users', user.uid), {
        profile: { photoURL: url },
      }, { merge: true });

      setPhotoURL(url);
      Alert.alert('Pronto!', 'Foto atualizada.');
    } catch (e) {
      console.log('UPLOAD AVATAR ERROR ->', e);
      Alert.alert('Erro', 'Não foi possível enviar a foto.');
    } finally {
      setUploading(false);
    }
  }

  // 3) salvar alterações
  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe seu nome.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      Alert.alert('Atenção', 'E-mail inválido.');
      return;
    }

    try {
      setSaving(true);

      // displayName
      if (name.trim() !== initialName) {
        await updateProfile(auth.currentUser, { displayName: name.trim() });
      }

      // e-mail (reatenticar se necessário)
      if (email.trim().toLowerCase() !== initialEmail.toLowerCase()) {
        try {
          await updateEmail(auth.currentUser, email.trim());
        } catch (e) {
          if (e?.code === 'auth/requires-recent-login') {
            const pass = await promptPassword();
            if (!pass) throw e;
            const cred = EmailAuthProvider.credential(initialEmail, pass);
            await reauthenticateWithCredential(auth.currentUser, cred);
            await updateEmail(auth.currentUser, email.trim());
          } else {
            throw e;
          }
        }
      }

      // extras no Firestore
      await setDoc(
        doc(db, 'users', user.uid),
        { profile: { phone: phone.trim(), photoURL: photoURL || null } },
        { merge: true }
      );

      Alert.alert('Pronto!', 'Perfil atualizado com sucesso.');
      navigation.goBack();
    } catch (e) {
      console.log('EDIT PROFILE ERROR ->', e);
      let msg = 'Não foi possível salvar as alterações.';
      if (e?.code === 'auth/email-already-in-use') msg = 'Este e-mail já está em uso.';
      if (e?.code === 'auth/invalid-email') msg = 'E-mail inválido.';
      Alert.alert('Erro', msg);
    } finally {
      setSaving(false);
    }
  }

  if (loadingDoc) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* App bar */}
      <View style={styles.appbar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrap}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.appbarTitle}>Editar Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Informações do Perfil</Text>
        <Text style={styles.cardSub}>Atualize suas informações pessoais</Text>

        {/* Avatar */}
        <View style={{ alignItems: 'center', marginVertical: 10 }}>
          <TouchableOpacity onPress={onPickAvatar} activeOpacity={0.8}>
            <View style={styles.avatarWrap}>
              {photoURL ? (
                <Image source={{ uri: photoURL }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarEmoji}>👤</Text>
              )}
              <Text style={styles.cameraBadge}>📷</Text>
            </View>
          </TouchableOpacity>
          {uploading && (
            <Text style={{ color: COLORS.gray, marginTop: 6 }}>
              Enviando foto... {progress}%
            </Text>
          )}
        </View>

        <Text style={styles.label}>Nome Completo</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Seu nome"
          style={styles.input}
        />

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="seu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>Telefone</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+55 11 99999-9999"
          keyboardType="phone-pad"
          style={styles.input}
        />

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || uploading}
          style={[styles.primaryBtn, (saving || uploading) && { opacity: 0.7 }]}
        >
          <Text style={styles.primaryBtnText}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const P = 18;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F9FC', padding: P },

  appbar: {
    height: 54,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  backWrap: { width: 24, alignItems: 'flex-start' },
  backArrow: { color: '#000000ff', fontSize: 20 },
  appbarTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: P,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { color: COLORS.navy, fontWeight: '800', fontSize: 16 },
  cardSub: { color: COLORS.gray, marginTop: 4, marginBottom: 12 },

  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EEF5FA',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  avatarEmoji: { fontSize: 40 },
  avatarImg: { width: 96, height: 96, borderRadius: 48 },
  cameraBadge: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    fontSize: 20,
  },

  label: { color: COLORS.gray, marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.navy,
  },

  primaryBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#000000ff', fontWeight: '800' },
});
