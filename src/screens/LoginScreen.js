import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import LabeledInput from '../components/LabeledInput';
import PrimaryButton from '../components/PrimaryButton';
import InlineText from '../components/InlineText';
import EyeToggle from '../components/EyeToggle';
import COLORS from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { signIn, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // modal de “esqueci a senha”
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());

  const handleLogin = async () => {
    try {
      setLoading(true);
      setErr('');
      await signIn(email.trim(), password);
    } catch (e) {
      setErr(mapAuthError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReset = () => {
    setResetEmail(email.trim()); 
    setResetOpen(true);
  };

  const handleSendReset = async () => {
    const target = resetEmail.trim();
    if (!/\S+@\S+\.\S+/.test(target)) {
      Alert.alert('Recuperar senha', 'Informe um e-mail válido.');
      return;
    }

    try {
      await resetPassword(target);
      setResetOpen(false);
      Alert.alert(
        'Verifique seu e-mail',
        'Enviamos um link para redefinir sua senha. Confira também a caixa de spam.'
      );
    } catch (e) {
      Alert.alert('Não foi possível enviar', mapAuthError(e.code));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={[styles.container, { paddingTop: 32 }]}>
          <Text style={styles.title}>Entrar</Text>
          <Text style={styles.subtitle}>Acesse sua conta para continuar.</Text>

          <View style={{ height: 12 }} />

          <LabeledInput
            label="Email"
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            error={email.length > 0 && !emailOk ? 'Email inválido' : undefined}
          />

          <View style={{ height: 12 }} />

          <LabeledInput
            label="Senha"
            placeholder="Sua senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            rightElement={<EyeToggle visible={showPass} onPress={() => setShowPass((v) => !v)} />}
          />

          {/* link “esqueci a senha” */}
          <TouchableOpacity onPress={handleOpenReset} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
            <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />

          <PrimaryButton
            title={loading ? 'Entrando...' : 'Entrar'}
            disabled={!emailOk || password.length === 0 || loading}
            onPress={handleLogin}
          />

          {err ? <Text style={{ color: 'tomato', marginTop: 8 }}>{err}</Text> : null}

          <View style={{ height: 16 }} />

          <InlineText
            prefix="Ainda não tem conta? "
            action="Cadastre-se"
            onPress={() => navigation.navigate('Register')}
          />
        </View>
      </ScrollView>

      {/* Modal de recuperação de senha */}
      <Modal visible={resetOpen} transparent animationType="fade" onRequestClose={() => setResetOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Recuperar senha</Text>
            <Text style={{ color: COLORS.gray, marginBottom: 12 }}>
              Digite o e-mail da sua conta. Enviaremos um link de redefinição.
            </Text>

            <LabeledInput
              label="Email"
              placeholder="seu@email.com"
              value={resetEmail}
              onChangeText={setResetEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={{ height: 16 }} />

            <PrimaryButton title="Enviar link" onPress={handleSendReset} />
            <TouchableOpacity onPress={() => setResetOpen(false)} style={{ marginTop: 12, alignSelf: 'center' }}>
              <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function mapAuthError(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'Email inválido.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'Email ou senha incorretos.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente mais tarde.';
    default:
      return 'Não foi possível concluir. Tente novamente.';
  }
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.navy },
  subtitle: { color: COLORS.gray, marginTop: 6, fontSize: 14, lineHeight: 20 },

  // modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.navy, marginBottom: 4 },
});
