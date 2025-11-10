import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import LabeledInput from '../components/LabeledInput';
import PrimaryButton from '../components/PrimaryButton';
import InlineText from '../components/InlineText';
import EyeToggle from '../components/EyeToggle';
import COLORS from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const passOk = password.length >= 6;
  const match = confirm === password && confirm.length > 0;
  const valid = name.trim().length > 0 && emailOk && passOk && match;

  const onRegister = async () => {
    try {
      setLoading(true);
      setError('');
      await signUp(name.trim(), email.trim(), password); // se ok, vai para Home pelo AppNavigator
    } catch (e) {
      setError('Não foi possível cadastrar. Tente outro email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} bounces={false}>
        <View style={[styles.container, { paddingTop: 32 }]}>
          <Text style={styles.title}>Crie sua conta</Text>
          <Text style={styles.subtitle}>
            Crie uma conta gratuitamente e faça parte da nossa comunidade.
          </Text>

          <View style={{ height: 12 }} />

          <LabeledInput
            label="*Nome:"
            placeholder="Insira seu nome"
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />

          <View style={{ height: 12 }} />

          <LabeledInput
            label="*Email:"
            placeholder="Insira seu melhor email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            error={email.length > 0 && !emailOk ? 'Email inválido' : undefined}
          />

          <View style={{ height: 12 }} />

          <LabeledInput
            label="*Senha:"
            placeholder="Insira sua senha mais forte"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass1}
            rightElement={
              <EyeToggle visible={showPass1} onPress={() => setShowPass1(v => !v)} />
            }
            returnKeyType="next"
            error={password.length > 0 && !passOk ? 'Mínimo de 6 caracteres' : undefined}
          />

          <View style={{ height: 12 }} />

          <LabeledInput
            label="*Senha confirmar:"
            placeholder="Repita sua senha"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showPass2}
            rightElement={
              <EyeToggle visible={showPass2} onPress={() => setShowPass2(v => !v)} />
            }
            returnKeyType="done"
            error={confirm.length > 0 && !match ? 'As senhas não conferem' : undefined}
          />

          <View style={{ height: 24 }} />

          <PrimaryButton
            title={loading ? 'Cadastrando...' : 'Finalizar cadastro'}
            disabled={!valid || loading}
            onPress={onRegister}
          />

          {error ? (
            <Text style={{ color: 'tomato', marginTop: 8 }}>{error}</Text>
          ) : null}

          <View style={{ height: 16 }} />

          <InlineText
            prefix="Já possui uma conta? "
            action="Entre"
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.navy },
  subtitle: { color: COLORS.gray, marginTop: 6, fontSize: 14, lineHeight: 20 },
});