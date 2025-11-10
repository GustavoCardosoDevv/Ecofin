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
} from 'firebase/firestore';
import { auth } from './firebase';

const db = getFirestore();

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

/** Adiciona transação simples (útil para seed ou telas futuras) */
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

  const ref = doc(db, 'users', user.uid); // DOC com 2 segmentos (válido)
  return onDocSnapshot(ref, (snap) => {
    const data = snap.exists() ? snap.data() : null;
    callback(data?.budgetLimit != null ? { limit: Number(data.budgetLimit) } : null);
  });
}

/**
 * Salva/atualiza o orçamento do usuário no DOC users/{uid}, campo "budgetLimit".
 */
export async function saveUserBudget(limit) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const ref = doc(db, 'users', user.uid); // DOC com 2 segmentos (válido)
  await setDoc(ref, { budgetLimit: Number(limit || 0) }, { merge: true });
}
