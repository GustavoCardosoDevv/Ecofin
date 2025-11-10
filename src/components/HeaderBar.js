// src/components/HeaderBar.js
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const COLORS = {
  primary: '#588DB0',
  text: '#0F2D52',
  white: '#fff',
  sub: '#6B7280',
};

export default function HeaderBar({ userName, onSignOut, onOpenBudget }) {
  const [open, setOpen] = useState(false);
  const navigation = useNavigation();

  const goProfile = () => {
    setOpen(false);
    navigation.navigate('Profile');   // <- navega aqui
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => setOpen(v => !v)}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 8 }]}
        >
          <View style={styles.burgerLine} />
          <View style={[styles.burgerLine, { marginVertical: 4 }]} />
          <View style={styles.burgerLine} />
        </Pressable>

        <Text style={styles.title}>
          Bem-vindo, {userName?.split(' ')[0] ?? 'Usuário'} 👋
        </Text>

        <View style={{ width: 16 }} />
      </View>

      {open && (
        <>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetHeader}>Menu</Text>

            <Pressable style={styles.sheetItem} onPress={goProfile}>
              <Text style={styles.sheetItemText}>Perfil</Text>
            </Pressable>

            <Pressable
              style={styles.sheetItem}
              onPress={() => { setOpen(false); onOpenBudget?.(); }}
            >
              <Text style={styles.sheetItemText}>Definir orçamento</Text>
            </Pressable>

            <Pressable
              style={styles.sheetItem}
              onPress={() => { setOpen(false); onSignOut?.(); }}
            >
              <Text style={[styles.sheetItemText, { color: '#DC2626', fontWeight: '800' }]}>
                Sair
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: { position: 'relative', zIndex: 9999 },
  headerBar: {
    height: 64,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  burgerLine: { width: 24, height: 2, backgroundColor: COLORS.white, borderRadius: 2 },
  title: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)', zIndex: 10000 },
  sheet: {
    position: 'absolute',
    top: 64,
    left: 12,
    width: 230,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    zIndex: 10001,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
  },
  sheetHeader: { fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  sheetItem: { paddingVertical: 10 },
  sheetItemText: { color: COLORS.text, fontWeight: '700' },
});
