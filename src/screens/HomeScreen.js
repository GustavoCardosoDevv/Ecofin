import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import HeaderBar from '../components/HeaderBar';
import { useAuth } from '../context/AuthContext';

import {
  addBalance,
  saveUserBudget,
  subscribeUserBalance,
  subscribeUserBudget,
  subscribeUserTransactions,
  transferBalance,
} from '../services/firestore';

const COLORS = {
  primary: '#588DB0',
  text: '#0F2D52',
  sub: '#6B7280',
  bg: '#F5F7FB',
  card: '#FFFFFF',
  red: '#DC2626',
  green: '#16A34A',
  border: '#E5E7EB',
  alertBg: '#FDECEC',
  alertBorder: '#F8B4B4',
};

function formatBRL(value = 0) {
  try {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } catch {
    return `R$ ${Number(value || 0).toFixed(2)}`;
  }
}

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const nameOrEmail = user?.displayName || user?.email || 'Usuário';

  const [transactions, setTransactions] = useState([]);
  const [budget, setBudget] = useState(null);
  const [balance, setBalance] = useState(0);
  
  // Modais
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [addBalanceAmount, setAddBalanceAmount] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubTx = subscribeUserTransactions(setTransactions);
    const unsubBudget = subscribeUserBudget(setBudget);
    const unsubBalance = subscribeUserBalance((newBalance) => {
      console.log('Balance recebido:', newBalance);
      Alert.alert('Debug Balance', `Balance recebido: ${newBalance}`);
      setBalance(newBalance);
    });
    return () => {
      unsubTx && unsubTx();
      unsubBudget && unsubBudget();
      unsubBalance && unsubBalance();
    };
  }, []);

  // Cálculos
  const { totalIncome, totalExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      if ((t.type || '').toLowerCase() === 'income') income += amt;
      else expense += amt;
    });
    return { totalIncome: income, totalExpense: expense };
  }, [transactions]);

  const budgetLimit = Number(budget?.limit || 0);
  
  const budgetUsedPct = useMemo(() => {
    console.log('Calculando budgetUsedPct - balance:', balance, 'budgetLimit:', budgetLimit);
    if (!budgetLimit || budgetLimit === 0) return 0;
    const pct = (balance / budgetLimit) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [balance, budgetLimit]);

  const showBudgetAlert = budgetLimit > 0 && balance > budgetLimit;

  const handleOpenBudget = async () => {
    let value = null;
    if (Platform.OS === 'web') {
      value = window.prompt('Defina seu orçamento mensal (R$):', String(budgetLimit || ''));
    }
    if (value !== null && value !== '') {
      await saveUserBudget(Number(value));
    }
  };

  const handleAddBalance = async () => {
    const amount = parseFloat(addBalanceAmount.replace(',', '.'));
    if (!amount || amount <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido maior que zero.');
      return;
    }

    try {
      setLoading(true);
      await addBalance(amount);
      Alert.alert('Sucesso', `Saldo de ${formatBRL(amount)} adicionado com sucesso!`);
      setShowAddBalance(false);
      setAddBalanceAmount('');
    } catch (e) {
      Alert.alert('Erro', e.message || 'Não foi possível adicionar saldo.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferAmount.replace(',', '.'));
    const email = transferEmail.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      Alert.alert('Atenção', 'Informe um email válido.');
      return;
    }

    if (!amount || amount <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido maior que zero.');
      return;
    }

    if (amount > balance) {
      Alert.alert('Atenção', 'Saldo insuficiente para esta transferência.');
      return;
    }

    try {
      setLoading(true);
      await transferBalance(email, amount);
      Alert.alert('Sucesso', `Transferência de ${formatBRL(amount)} realizada com sucesso!`);
      setShowTransfer(false);
      setTransferEmail('');
      setTransferAmount('');
    } catch (e) {
      Alert.alert('Erro', e.message || 'Não foi possível realizar a transferência.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* HEADER COM MENU (hambúrguer) */}
      <HeaderBar
        userName={nameOrEmail}
        onSignOut={signOut}
        onOpenBudget={handleOpenBudget}
        onGoProfile={() => navigation.navigate('Profile')}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Card: Saldo Total */}
        <View style={styles.card}>
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.cardTitle}>Saldo da Conta</Text>
            <Text style={styles.balanceValue}>{formatBRL(balance)}</Text>
          </View>

          <View style={styles.rowBetween}>
            <Text style={styles.muted}>Receitas: {formatBRL(totalIncome)}</Text>
            <Text style={styles.muted}>Despesas: {formatBRL(totalExpense)}</Text>
          </View>
        </View>

        {/* Card: Orçamento Mensal */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Orçamento Mensal</Text>
          <Text style={[styles.muted, { marginTop: 6 }]}>
            {formatBRL(balance)} de {formatBRL(budgetLimit)}{' '}
            <Text style={{ fontWeight: '700' }}>
              {budgetUsedPct.toFixed(1)}%
            </Text>
          </Text>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${budgetUsedPct}%` },
              ]}
            />
          </View>
        </View>

        {/* Alerta (só se ultrapassar o orçamento) */}
        {showBudgetAlert && (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>Alerta de Saldo Elevado</Text>
            <Text style={styles.alertText}>
              Seu saldo de {formatBRL(balance)} está acima do orçamento mensal de{' '}
              {formatBRL(budgetLimit)}. Considere ajustar seu planejamento financeiro.
            </Text>
          </View>
        )}

        {/* Botões de ação */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <Pressable 
            style={[styles.pillBtn, { backgroundColor: COLORS.green }]}
            onPress={() => setShowAddBalance(true)}
          >
            <Text style={styles.pillBtnText}>Adicionar Saldo</Text>
          </Pressable>
          <Pressable 
            style={[styles.pillBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => setShowTransfer(true)}
          >
            <Text style={styles.pillBtnText}>Transferir</Text>
          </Pressable>
        </View>

        {/* Lista de Transações */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Transações Recentes</Text>

          {transactions.length === 0 ? (
            <Text style={[styles.muted, { marginTop: 8 }]}>
              Sem transações ainda.
            </Text>
          ) : (
            transactions.map((t) => {
              const isIncome = (t.type || '').toLowerCase() === 'income';
              const sign = isIncome ? '+' : '−';
              const color = isIncome ? COLORS.green : COLORS.red;

              return (
                <View key={t.id} style={styles.txRow}>
                  <View>
                    <Text style={styles.txTitle}>
                      {t.title || t.note || 'Transação'}
                    </Text>
                    <Text style={styles.txCategory}>
                      {t.category || (isIncome ? 'Receitas' : 'Despesas')}
                    </Text>
                  </View>

                  <Text style={[styles.txAmount, { color }]}>
                    {sign} {formatBRL(t.amount)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modal: Adicionar Saldo */}
      <Modal
        visible={showAddBalance}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddBalance(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar Saldo</Text>
            <Text style={styles.modalSubtitle}>Informe o valor que deseja adicionar</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="0,00"
              keyboardType="decimal-pad"
              value={addBalanceAmount}
              onChangeText={setAddBalanceAmount}
              placeholderTextColor={COLORS.sub}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowAddBalance(false);
                  setAddBalanceAmount('');
                }}
                disabled={loading}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleAddBalance}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Adicionar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Transferir */}
      <Modal
        visible={showTransfer}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTransfer(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Transferir</Text>
            <Text style={styles.modalSubtitle}>Saldo disponível: {formatBRL(balance)}</Text>
            
            <Text style={styles.modalLabel}>Email do destinatário</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="exemplo@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={transferEmail}
              onChangeText={setTransferEmail}
              placeholderTextColor={COLORS.sub}
            />

            <Text style={styles.modalLabel}>Valor</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="0,00"
              keyboardType="decimal-pad"
              value={transferAmount}
              onChangeText={setTransferAmount}
              placeholderTextColor={COLORS.sub}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowTransfer(false);
                  setTransferEmail('');
                  setTransferAmount('');
                }}
                disabled={loading}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleTransfer}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Transferir</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  balanceValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  muted: {
    color: COLORS.sub,
    fontSize: 12,
  },
  progressTrack: {
    marginTop: 10,
    height: 8,
    width: '100%',
    borderRadius: 999,
    backgroundColor: '#E9EEF3',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  alertBox: {
    backgroundColor: COLORS.alertBg,
    borderColor: COLORS.alertBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  alertTitle: {
    color: COLORS.red,
    fontWeight: '800',
    marginBottom: 6,
  },
  alertText: {
    color: COLORS.sub,
  },
  pillBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pillBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  sectionTitle: {
    color: COLORS.text,
    fontWeight: '800',
    marginBottom: 10,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  txTitle: {
    color: COLORS.text,
    fontWeight: '700',
  },
  txCategory: {
    color: COLORS.sub,
    marginTop: 2,
  },
  txAmount: {
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.sub,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F1F5F9',
  },
  modalButtonConfirm: {
    backgroundColor: COLORS.primary,
  },
  modalButtonTextCancel: {
    color: COLORS.text,
    fontWeight: '700',
  },
  modalButtonTextConfirm: {
    color: '#fff',
    fontWeight: '700',
  },
});