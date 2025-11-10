import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import COLORS from '../theme/colors';

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const name = user?.displayName || 'Usuário';
  const email = user?.email || '';

 function handleEdit() {
  navigation.navigate('EditProfile');
}


  return (
    <View style={styles.container}>
      {/* App bar com back no canto superior esquerdo */}
      <View style={styles.appbar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backWrap}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backLabel}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.appbarTitle}>Perfil</Text>

        {/* Espaçador para balancear o título centralizado */}
        <View style={{ width: 72 }} />
      </View>

      {/* Card do usuário */}
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name?.[0]?.toUpperCase() || 'U'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
          <Text style={styles.editBtnText}>Editar Perfil</Text>
        </TouchableOpacity>
      </View>

      
      <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('AccountSettings')}>
        <Text style={styles.itemIcon}>🛠️</Text>
        <Text style={styles.itemText}>Configurações da Conta</Text>
      </TouchableOpacity>

      <TouchableOpacity
          style={styles.item}
          onPress={() => navigation.navigate('Payments')}
  >
          <Text style={styles.itemIcon}>💳</Text>
          <Text style={styles.itemText}>Métodos de Pagamento</Text>
      </TouchableOpacity>


      <TouchableOpacity
          style={styles.item}
          onPress={() => navigation.navigate('Support')}  
      >
        <Text style={styles.itemIcon}>❓</Text>
        <Text style={styles.itemText}>Ajuda e Suporte</Text>
      </TouchableOpacity>


   
      <TouchableOpacity style={styles.logout} onPress={signOut}>
        <Text style={styles.logoutIcon}>⎋</Text>
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
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

  backWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 72, 
  },
  backArrow: { color: '#000000ff', fontSize: 20, marginRight: 6 },
  backLabel: { color: '#000000ff', fontSize: 14, fontWeight: '700' },

  appbarTitle: { color: '#000000ff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: P,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E7EEF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { color: COLORS.navy, fontSize: 20, fontWeight: '800' },
  name: { color: COLORS.navy, fontSize: 16, fontWeight: '700' },
  email: { color: COLORS.gray, marginTop: 2 },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EEF5FA',
  },
  editBtnText: { color: COLORS.navy, fontWeight: '700', fontSize: 12 },

  item: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: P,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemIcon: { fontSize: 18, marginRight: 10 },
  itemText: { color: COLORS.navy, fontWeight: '600' },

  logout: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  logoutIcon: { color: '#E24D4D', marginRight: 8, fontSize: 18 },
  logoutText: { color: '#E24D4D', fontWeight: '700' },
});
