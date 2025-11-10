import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import COLORS from '../theme/colors';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';

export default function PaymentMethodsScreen({ navigation }) {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [adding, setAdding] = useState(false);

 
  const [holder, setHolder] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');

  useEffect(() => {
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'paymentMethods');
    const unsub = onSnapshot(ref, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setCards(list);
    });
    return unsub;
  }, [user]);

  function maskLast4(num = '') {
    const last4 = (num || '').replace(/\s+/g, '').slice(-4);
    return `**** **** **** ${last4 || '----'}`;
  }

  async function addCard() {
    const cleanNum = number.replace(/\D/g, '');
    const cleanExp = expiry.replace(/\s/g, '');

    if (!holder.trim() || cleanNum.length < 12 || !/^\d{2}\/\d{2}$/.test(cleanExp)) {
      Alert.alert('Verifique os dados', 'Preencha titular, número e validade (MM/AA).');
      return;
    }

    try {
      const brand = detectBrand(cleanNum);
      await addDoc(collection(db, 'users', user.uid, 'paymentMethods'), {
        holder: holder.trim(),
        numberMasked: maskLast4(cleanNum),
        brand,
        expiry: cleanExp,
        createdAt: serverTimestamp(),
      });
      // limpa e fecha
      setHolder(''); setNumber(''); setExpiry('');
      setAdding(false);
    } catch (e) {
      console.log('ADD CARD ERROR ->', e);
      Alert.alert('Erro', 'Não foi possível adicionar o cartão.');
    }
  }

  async function removeCard(id) {
    Alert.alert('Remover', 'Deseja remover este cartão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'users', user.uid, 'paymentMethods', id));
          } catch (e) {
            console.log('DELETE CARD ERROR ->', e);
            Alert.alert('Erro', 'Não foi possível remover.');
          }
        },
      },
    ]);
  }

  function detectBrand(num) {
    if (/^4/.test(num)) return 'Visa';
    if (/^(5[1-5])/.test(num)) return 'Mastercard';
    if (/^3[47]/.test(num)) return 'Amex';
    return 'Cartão';
 
  }

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{`Cartão de Crédito ${item.brand || ''}`.trim()}</Text>
        <Text style={styles.cardSub}>
          {item.numberMasked} {` | Expira em ${item.expiry}`}
        </Text>
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={() => removeCard(item.id)}>
        <Text style={styles.removeText}>🗑 Remover</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      
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
        <Text style={styles.appbarTitle}>Métodos de Pagamento</Text>
        <View style={{ width: 72 }} />
      </View>

      <FlatList
        data={cards}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ListFooterComponent={
          <TouchableOpacity style={styles.addBtn} onPress={() => setAdding(true)}>
            <Text style={styles.addBtnText}>+ Adicionar Novo Cartão</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
      />

   
      <Modal visible={adding} transparent animationType="fade" onRequestClose={() => setAdding(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Novo Cartão</Text>

            <Text style={styles.label}>Nome do Titular</Text>
            <TextInput
              style={styles.input}
              placeholder="Como no cartão"
              value={holder}
              onChangeText={setHolder}
            />

            <Text style={styles.label}>Número</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0000 0000 0000 0000"
              value={number}
              onChangeText={(t) => setNumber(t.replace(/[^\d\s]/g, ''))}
              maxLength={19}
            />

            <Text style={styles.label}>Validade (MM/AA)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="12/29"
              value={expiry}
              onChangeText={(t) => {
                
                const v = t.replace(/[^\d]/g, '').slice(0, 4);
                setExpiry(v.length >= 3 ? v.slice(0, 2) + '/' + v.slice(2) : v);
              }}
              maxLength={5}
            />

            <View style={{ height: 10 }} />

            <TouchableOpacity style={styles.saveBtn} onPress={addCard}>
              <Text style={styles.saveBtnText}>Salvar Cartão</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setAdding(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const P = 18;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F9FC' },

  appbar: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backWrap: { flexDirection: 'row', alignItems: 'center', width: 82 },
  backArrow: { color: '#111', fontSize: 20, marginRight: 6 }, // PRETO
  backLabel: { color: '#111', fontSize: 14, fontWeight: '700' }, // PRETO
  appbarTitle: { color: '#000000ff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: P,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  cardTitle: { color: COLORS.navy, fontWeight: '800', marginBottom: 4 },
  cardSub: { color: COLORS.gray },

  removeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  removeText: { color: '#DC2626', fontWeight: '800' },

  addBtn: {
    marginTop: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addBtnText: { color: '#000000ff', fontWeight: '800' },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#000000ff',
    borderRadius: 14,
    padding: P,
  },
  modalTitle: { color: COLORS.navy, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  label: { color: COLORS.gray, marginTop: 8, marginBottom: 6 },
  input: {
    backgroundColor: '#000000ff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.navy,
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#000000ff', fontWeight: '800' },
  cancelBtn: { marginTop: 10, alignItems: 'center' },
  cancelBtnText: { color: COLORS.navy, fontWeight: '700' },
});
