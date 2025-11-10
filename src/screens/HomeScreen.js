import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import HeaderBar from '../components/HeaderBar';
import PaymentsCalendar from '../components/PaymentsCalendar';

import {
  subscribeUserTransactions,
  subscribeUserBudget,
  subscribeUserBalance,
  subscribeUserPayments,   
  saveUserBudget,
  addBalance,
  transferBalance,
  addUserPayment,          
  deleteUserPayment,       
  toggleUserPaymentPaid,   
  toMonthKey,              
} from '../services/firestore';

function formatBRL(value = 0) {
  try {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } catch {
    return `R$ ${Number(value || 0).toFixed(2)}`;
  }
}

export default function HomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { colors, theme, toggleTheme } = useTheme();
  const nameOrEmail = user?.displayName || user?.email || 'Usuário';

  const [transactions, setTransactions] = useState([]);
  const [budget, setBudget] = useState(null);
  const [balance, setBalance] = useState(0);

  // Pagamentos (calendário)
  const [payments, setPayments] = useState([]);
  const [monthKey, setMonthKey] = useState(toMonthKey(new Date())); // 'YYYY-MM'

  // Modais de ação
  const [showAddBalance, setShowAddBalance] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [addBalanceAmount, setAddBalanceAmount] = useState('');
  const [transferEmail, setTransferEmail] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Assinaturas: transações/orçamento/saldo
  useEffect(() => {
    const unsubTx  = subscribeUserTransactions(setTransactions);
    const unsubBud = subscribeUserBudget(setBudget);
    const unsubBal = subscribeUserBalance((v) => setBalance(Number(v || 0)));
    return () => {
      unsubTx && unsubTx();
      unsubBud && unsubBud();
      unsubBal && unsubBal();
    };
  }, []);

  // Assinatura: pagamentos do mês
  useEffect(() => {
    const unsub = subscribeUserPayments(monthKey, setPayments);
    return () => unsub && unsub();
  }, [monthKey]);

  // Cálculos receitas/despesas
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

  // Orçamento
  const budgetLimit = Number(budget?.limit || 0);
  const budgetUsedPct = useMemo(() => {
    if (!budgetLimit) return 0;
    return Math.min(100, Math.max(0, (totalExpense / budgetLimit) * 100));
  }, [totalExpense, budgetLimit]);

  const showBudgetAlert = budgetLimit > 0 && totalExpense > budgetLimit;

  const handleOpenBudget = async () => {
    let value = null;
    if (Platform.OS === 'web') {
      value = window.prompt('Defina seu orçamento mensal (R$):', String(budgetLimit || ''));
    }
    if (value !== null && value !== '') {
      await saveUserBudget(Number(value));
    }
  };

  // Ações: adicionar saldo
  const handleAddBalance = async () => {
    const amount = parseFloat(String(addBalanceAmount).replace(',', '.'));
    if (!amount || amount <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }
    try {
      setLoading(true);
      await addBalance(amount);
      setShowAddBalance(false);
      setAddBalanceAmount('');
    } catch (e) {
      alert(e?.message || 'Não foi possível adicionar saldo.');
    } finally {
      setLoading(false);
    }
  };

  // Ações: transferir
  const handleTransfer = async () => {
    const amount = parseFloat(String(transferAmount).replace(',', '.'));
    const email = transferEmail.trim().toLowerCase();

    if (!email || !email.includes('@')) return alert('Informe um e-mail válido.');
    if (!amount || amount <= 0)     return alert('Informe um valor válido maior que zero.');
    if (amount > balance)           return alert('Saldo insuficiente para esta transferência.');

    try {
      setLoading(true);
      await transferBalance(email, amount);
      setShowTransfer(false);
      setTransferEmail('');
      setTransferAmount('');
    } catch (e) {
      alert(e?.message || 'Não foi possível realizar a transferência.');
    } finally {
      setLoading(false);
    }
  };

  /* ========= Pagamentos (Calendário) – Handlers ========= */

  // Criar (ou “salvar novo”) — o componente envia {title, amount, date, paid:false}
  const handleSavePayment = async (payment, isEdit) => {
    try {
      if (isEdit && payment.id) {
        // (Opcional) editar campos aqui se você implementar edição no modal
        // await updateUserPayment(payment.id, {...});
      } else {
        await addUserPayment({
          title: payment.title,
          amount: Number(payment.amount || 0),
          date: payment.date, // 'YYYY-MM-DD'
          paid: !!payment.paid,
        });
      }
    } catch (e) {
      alert(e?.message || 'Não foi possível salvar o pagamento.');
    }
  };

  const handleDeletePayment = async (id) => {
    try {
      await deleteUserPayment(id);
    } catch (e) {
      alert(e?.message || 'Não foi possível excluir.');
    }
  };

  const handleTogglePaid = async (id) => {
    try {
      const current = payments.find(p => p.id === id)?.paid || false;
      await toggleUserPaymentPaid(id, current);
    } catch (e) {
      alert(e?.message || 'Não foi possível alterar o status.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* HEADER */}
      <HeaderBar
        userName={nameOrEmail}
        onSignOut={signOut}
        onOpenBudget={handleOpenBudget}
        onGoProfile={() => navigation.navigate('Profile')}
      />

      {/* Alternância de tema */}
      <Pressable
        onPress={toggleTheme}
        style={{
          backgroundColor: colors.primary,
          alignSelf: 'flex-end',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 10,
          marginRight: 16,
          marginTop: 8,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>
          {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        </Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Card: Saldo */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Saldo da Conta</Text>
            <Text style={[styles.balanceValue, { color: colors.text }]}>{formatBRL(balance)}</Text>
          </View>

          <View style={styles.rowBetween}>
            <Text style={[styles.muted, { color: colors.sub }]}>
              Receitas: {formatBRL(totalIncome)}
            </Text>
            <Text style={[styles.muted, { color: colors.sub }]}>
              Despesas: {formatBRL(totalExpense)}
            </Text>
          </View>
        </View>

        {/* Card: Orçamento */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Orçamento Mensal</Text>
          <Text style={[styles.muted, { marginTop: 6, color: colors.sub }]}>
            {formatBRL(totalExpense)} de {formatBRL(budgetLimit)}{' '}
            <Text style={{ fontWeight: '700', color: colors.text }}>
              {budgetLimit ? `${budgetUsedPct.toFixed(1)}%` : '0.0%'}
            </Text>
          </Text>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${budgetUsedPct}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
        </View>

        {/* Alerta orçamento estourado */}
        {showBudgetAlert && (
          <View
            style={[
              styles.alertBox,
              { backgroundColor: '#FDECEC', borderColor: '#F8B4B4' },
            ]}
          >
            <Text style={[styles.alertTitle, { color: colors.red }]}>
              Alerta de Gasto Excessivo
            </Text>
            <Text style={[styles.alertText, { color: colors.sub }]}>
              Você gastou {formatBRL(totalExpense)} no mês, acima do limite de{' '}
              {formatBRL(budgetLimit)}. Considere rever suas despesas.
            </Text>
          </View>
        )}

        {/* Ações rápidas */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <Pressable
            style={[styles.pillBtn, { backgroundColor: colors.green || '#16A34A' }]}
            onPress={() => setShowAddBalance(true)}
          >
            <Text style={styles.pillBtnText}>Adicionar Saldo</Text>
          </Pressable>
          <Pressable
            style={[styles.pillBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowTransfer(true)}
          >
            <Text style={styles.pillBtnText}>Transferir</Text>
          </Pressable>
        </View>

        {/* Calendário de Pagamentos */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Calendário de Pagamentos
          </Text>

          <PaymentsCalendar
            paymentsData={payments}
            onSavePayment={handleSavePayment}
            onDeletePayment={handleDeletePayment}
            onTogglePaid={handleTogglePaid}
            onMonthChange={(y, m) => setMonthKey(`${y}-${String(m).padStart(2, '0')}`)}
          />
        </View>

        {/* Transações */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Transações Recentes</Text>

          {transactions.length === 0 ? (
            <Text style={[styles.muted, { marginTop: 8, color: colors.sub }]}>
              Sem transações ainda.
            </Text>
          ) : (
            transactions.map((t) => {
              const isIncome = (t.type || '').toLowerCase() === 'income';
              const sign = isIncome ? '+' : '−';
              const color = isIncome ? (colors.green || '#16A34A') : (colors.red || '#DC2626');

              return (
                <View key={t.id} style={[styles.txRow, { borderBottomColor: colors.border }]}>
                  <View>
                    <Text style={[styles.txTitle, { color: colors.text }]}>
                      {t.title || t.note || 'Transação'}
                    </Text>
                    <Text style={[styles.txCategory, { color: colors.sub }]}>
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

      {/* MODAL: Adicionar saldo */}
      <Modal
        visible={showAddBalance}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddBalance(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Adicionar Saldo</Text>
            <Text style={[styles.modalSubtitle, { color: colors.sub }]}>
              Informe o valor que deseja adicionar
            </Text>

            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="0,00"
              keyboardType="decimal-pad"
              value={addBalanceAmount}
              onChangeText={setAddBalanceAmount}
              placeholderTextColor={colors.sub}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#F1F5F9' }]}
                onPress={() => {
                  setShowAddBalance(false);
                  setAddBalanceAmount('');
                }}
                disabled={loading}
              >
                <Text style={[styles.modalButtonTextCancel, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
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

      {/* MODAL: Transferir */}
      <Modal
        visible={showTransfer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTransfer(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Transferir</Text>
            <Text style={[styles.modalSubtitle, { color: colors.sub }]}>
              Saldo disponível: {formatBRL(balance)}
            </Text>

            <Text style={[styles.modalLabel, { color: colors.text }]}>E-mail do destinatário</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="exemplo@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={transferEmail}
              onChangeText={setTransferEmail}
              placeholderTextColor={colors.sub}
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>Valor</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="0,00"
              keyboardType="decimal-pad"
              value={transferAmount}
              onChangeText={setTransferAmount}
              placeholderTextColor={colors.sub}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#F1F5F9' }]}
                onPress={() => {
                  setShowTransfer(false);
                  setTransferEmail('');
                  setTransferAmount('');
                }}
                disabled={loading}
              >
                <Text style={[styles.modalButtonTextCancel, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
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
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  muted: {
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
  },
  alertBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  alertTitle: {
    fontWeight: '800',
    marginBottom: 6,
  },
  pillBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pillBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  sectionTitle: {
    fontWeight: '800',
    marginBottom: 10,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  txTitle: {
    fontWeight: '700',
  },
  txCategory: {
    marginTop: 2,
  },
  txAmount: {
    fontWeight: '700',
  },
  // Modais
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
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
  modalButtonTextCancel: {
    fontWeight: '700',
  },
  modalButtonTextConfirm: {
    color: '#fff',
    fontWeight: '700',
  },
});
