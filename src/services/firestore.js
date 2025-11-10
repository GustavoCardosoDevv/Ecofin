import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  onSnapshot as onDocSnapshot,
  setDoc,
  getDoc,
  where,
  getDocs,
  runTransaction,
  updateDoc,
  deleteDoc, // 👈 necessário para excluir pagamentos
} from 'firebase/firestore';
import { auth } from './firebase';

const db = getFirestore();

/** Utils */
function pad2(n) { return String(n).padStart(2, '0'); }
export function toMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; // YYYY-MM
}
export function makeYMD(dateObj = new Date()) {
  return `${dateObj.getFullYear()}-${pad2(dateObj.getMonth() + 1)}-${pad2(dateObj.getDate())}`;
}

/** Transações em tempo real */
export function subscribeUserTransactions(callback) {
  const user = auth.currentUser;
  if (!user) return () => {};

  const q = query(
    collection(db, 'users', user.uid, 'transactions'),
    orderBy('date', 'desc')
  );

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

/** Adiciona transação simples */
export async function addTransaction({ type, amount, category, note, date }) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  await addDoc(collection(db, 'users', user.uid, 'transactions'), {
    type,
    amount: Number(amount || 0),
    category: category || 'Geral',
    note: note || '',
    date: date ? new Date(date) : new Date(),
    createdAt: serverTimestamp(),
  });
}

export function subscribeUserBudget(callback) {
  const user = auth.currentUser;
  if (!user) return () => {};

  const ref = doc(db, 'users', user.uid);
  return onDocSnapshot(ref, (snap) => {
    const data = snap.exists() ? snap.data() : null;
    callback(data?.budgetLimit != null ? { limit: Number(data.budgetLimit) } : null);
  });
}

/** Salva/atualiza orçamento */
export async function saveUserBudget(limit) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const ref = doc(db, 'users', user.uid);
  await setDoc(ref, { budgetLimit: Number(limit || 0) }, { merge: true });
}

/** Assina saldo do usuário */
export function subscribeUserBalance(callback) {
  const user = auth.currentUser;
  if (!user) return () => {};

  const ref = doc(db, 'users', user.uid);
  return onDocSnapshot(ref, (snap) => {
    const data = snap.exists() ? snap.data() : null;
    callback(Number(data?.balance || 0));
  });
}

/** Adiciona saldo */
export async function addBalance(amount) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const amountNum = Number(amount || 0);
  if (amountNum <= 0) throw new Error('Valor deve ser maior que zero');

  const userRef = doc(db, 'users', user.uid);
  
  return runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      transaction.set(userRef, { balance: amountNum });
    } else {
      const currentBalance = Number(userSnap.data()?.balance || 0);
      const newBalance = currentBalance + amountNum;
      transaction.update(userRef, { balance: newBalance });
    }

    const txRef = doc(collection(db, 'users', user.uid, 'transactions'));
    transaction.set(txRef, {
      type: 'income',
      amount: amountNum,
      category: 'Depósito',
      note: 'Saldo adicionado',
      date: new Date(),
      createdAt: serverTimestamp(),
    });
  });
}

/** Busca usuário por email */
export async function findUserByEmail(email) {
  if (!email || !email.includes('@')) {
    throw new Error('Email inválido');
  }
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', normalizedEmail));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    return {
      uid: userDoc.id,
      email: userData.email || normalizedEmail,
      displayName: userData.displayName || userData.email || normalizedEmail,
    };
  } catch (error) {
    // fallback (não recomendado em prod)
    const usersRef = collection(db, 'users');
    const allUsers = await getDocs(usersRef);
    for (const userDoc of allUsers.docs) {
      const userData = userDoc.data();
      if (userData.email && userData.email.toLowerCase().trim() === normalizedEmail) {
        return {
          uid: userDoc.id,
          email: userData.email,
          displayName: userData.displayName || userData.email,
        };
      }
    }
    return null;
  }
}

/** Transfere saldo por email */
export async function transferBalance(toEmail, amount) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const amountNum = Number(amount || 0);
  if (amountNum <= 0) throw new Error('Valor deve ser maior que zero');

  const recipient = await findUserByEmail(toEmail);
  if (!recipient) throw new Error('Usuário não encontrado com este email');
  if (recipient.uid === user.uid) throw new Error('Não é possível transferir para si mesmo');

  const senderRef = doc(db, 'users', user.uid);
  const recipientRef = doc(db, 'users', recipient.uid);

  await runTransaction(db, async (transaction) => {
    const senderSnap = await transaction.get(senderRef);
    if (!senderSnap.exists()) throw new Error('Conta do remetente não encontrada');

    const senderData = senderSnap.data();
    const senderBalance = Number(senderData?.balance || 0);
    if (senderBalance < amountNum) throw new Error('Saldo insuficiente');

    const recipientSnap = await transaction.get(recipientRef);
    if (!recipientSnap.exists()) throw new Error('Conta do destinatário não encontrada');

    const recipientData = recipientSnap.data();
    const recipientBalance = Number(recipientData?.balance || 0);

    transaction.update(senderRef, { balance: senderBalance - amountNum });
    transaction.update(recipientRef, { balance: recipientBalance + amountNum });
  });

  await Promise.all([
    addDoc(collection(db, 'users', user.uid, 'transactions'), {
      type: 'expense',
      amount: amountNum,
      category: 'Transferência',
      note: `Transferência para ${recipient.displayName || recipient.email}`,
      date: new Date(),
      createdAt: serverTimestamp(),
      transferTo: recipient.email,
    }),
    addDoc(collection(db, 'users', recipient.uid, 'transactions'), {
      type: 'income',
      amount: amountNum,
      category: 'Transferência',
      note: `Transferência de ${user.displayName || user.email}`,
      date: new Date(),
      createdAt: serverTimestamp(),
      transferFrom: user.email,
    }),
  ]);
}

/* ===========================
   PAGAMENTOS (CALENDÁRIO)
   =========================== */

/** Assina pagamentos do mês (monthKey = 'YYYY-MM') */
export function subscribeUserPayments(monthKey, callback) {
  const user = auth.currentUser;
  if (!user) return () => {};

  // Range por string 'YYYY-MM-DD'
  const start = `${monthKey}-01`;
  const end = `${monthKey}-31`;

  const q = query(
    collection(db, 'users', user.uid, 'payments'),
    where('date', '>=', start),
    where('date', '<=', end),
    orderBy('date', 'asc'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(list);
  });
}

/** Adiciona pagamento: {title, amount, date:'YYYY-MM-DD', paid} */
export async function addUserPayment({ title, amount, date, paid = false }) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const payload = {
    title: (title || 'Pagamento').trim(),
    amount: Number(amount || 0),
    date, // string 'YYYY-MM-DD'
    paid: !!paid,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'users', user.uid, 'payments'), payload);
  return ref.id;
}

/** Atualiza parcialmente um pagamento */
export async function updateUserPayment(id, partial) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const ref = doc(db, 'users', user.uid, 'payments', id);
  await updateDoc(ref, { ...partial });
}

/** Exclui pagamento */
export async function deleteUserPayment(id) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const ref = doc(db, 'users', user.uid, 'payments', id);
  await deleteDoc(ref);
}

/** Alterna pago/não pago */
export async function toggleUserPaymentPaid(id, currentPaid) {
  await updateUserPayment(id, { paid: !currentPaid });
}
