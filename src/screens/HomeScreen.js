import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import HeaderBar from '../components/HeaderBar';
import { useTheme } from '../context/ThemeContext';
import PaymentsCalendar from '../components/PaymentsCalendar'; // ✅ novo import

import {
  subscribeUserTransactions,
  subscribeUserBudget,
  saveUserBudget,
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
  const [payments, setPayments] = useState([]); // ✅ novo estado para o calendário

  useEffect(() => {
    const unsubTx = subscribeUserTransactions(setTransactions);
    const unsubBudget = subscribeUserBudget(setBudget);
    return () => {
      unsubTx && unsubTx();
      unsubBudget && unsubBudget();
    };
  }, []);

  // ✅ função para salvar pagamentos do calendário
  const handleSavePayment = (payment, isEdit) => {
    setPayments(prev =>
      isEdit
        ? prev.map(p => (p.id === payment.id ? { ...p, ...payment } : p))
        : [...prev, payment]
    );
  };

  // Cálculos de saldo e orçamento
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

  const balance = totalIncome - totalExpense;

  const budgetLimit = Number(budget?.limit || 0);
  const budgetUsedPct = useMemo(() => {
    if (!budgetLimit) return 0;
    return Math.min(100, (totalExpense / budgetLimit) * 100);
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* HEADER */}
      <HeaderBar
        userName={nameOrEmail}
        onSignOut={signOut}
        onOpenBudget={handleOpenBudget}
        onGoProfile={() => navigation.navigate('Profile')}
      />

      {/* Botão de alternância de tema */}
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
        {/* Card: Saldo Total */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Saldo Total</Text>
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

        {/* Card: Orçamento Mensal */}
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

        {/* Alerta de gasto */}
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

        {/* ✅ Novo: Calendário de Pagamentos */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 20 },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Calendário de Pagamentos</Text>
          <PaymentsCalendar paymentsData={payments} onSavePayment={handleSavePayment} />
        </View>

        {/* Lista de Transações */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Transações Recentes
          </Text>

          {transactions.length === 0 ? (
            <Text style={[styles.muted, { marginTop: 8, color: colors.sub }]}>
              Sem transações ainda.
            </Text>
          ) : (
            transactions.map((t) => {
              const isIncome = (t.type || '').toLowerCase() === 'income';
              const sign = isIncome ? '+' : '−';
              const color = isIncome ? colors.green : colors.red;

              return (
                <View key={t.id} style={styles.txRow}>
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
});
