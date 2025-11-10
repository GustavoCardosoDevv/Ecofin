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

/**
 * Obtém o saldo do usuário atual
 */
export function subscribeUserBalance(callback) {
  const user = auth.currentUser;
  if (!user) return () => {};

  const ref = doc(db, 'users', user.uid);
  return onDocSnapshot(ref, (snap) => {
    const data = snap.exists() ? snap.data() : null;
    callback(Number(data?.balance || 0));
  });
}

/**
 * Adiciona saldo à conta do usuário
 */
export async function addBalance(amount) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const amountNum = Number(amount || 0);
  if (amountNum <= 0) throw new Error('Valor deve ser maior que zero');

  const userRef = doc(db, 'users', user.uid);
  
  return runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists()) {
      // Se o documento não existe, criar com o saldo inicial
      transaction.set(userRef, { balance: amountNum });
    } else {
      const currentBalance = Number(userSnap.data()?.balance || 0);
      const newBalance = currentBalance + amountNum;
      transaction.update(userRef, { balance: newBalance });
    }

    // Adicionar transação de receita
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

/**
 * Busca usuário por email
 */
export async function findUserByEmail(email) {
  if (!email || !email.includes('@')) {
    throw new Error('Email inválido');
  }

  const normalizedEmail = email.toLowerCase().trim();
  console.log('Buscando usuário com email:', normalizedEmail);

  try {
    // Buscar na coleção de usuários pelo email
    // Nota: Isso requer que o email esteja salvo no documento do usuário
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', normalizedEmail));
    const querySnapshot = await getDocs(q);

    console.log('Resultado da busca:', querySnapshot.size, 'documentos encontrados');

    if (querySnapshot.empty) {
      console.log('Nenhum usuário encontrado com este email');
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const result = {
      uid: userDoc.id,
      email: userData.email || normalizedEmail,
      displayName: userData.displayName || userData.email || normalizedEmail,
    };
    
    console.log('Usuário encontrado:', result);
    return result;
  } catch (error) {
    // Se a busca falhar (por exemplo, falta de índice), tentar buscar todos e filtrar
    console.log('Erro na busca por índice, tentando busca alternativa:', error);
    
    try {
      // Busca alternativa: buscar todos os usuários e filtrar (não recomendado para produção)
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
    } catch (altError) {
      console.error('Erro na busca alternativa:', altError);
      throw new Error('Erro ao buscar usuário. Verifique se o email está correto e se o índice do Firestore está configurado.');
    }
  }
}

/**
 * Transfere saldo entre contas usando email
 */
export async function transferBalance(toEmail, amount) {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const amountNum = Number(amount || 0);
  if (amountNum <= 0) throw new Error('Valor deve ser maior que zero');

  console.log('Iniciando transferência:', { toEmail, amount: amountNum, from: user.email });

  // Buscar destinatário por email
  const recipient = await findUserByEmail(toEmail);
  if (!recipient) {
    throw new Error('Usuário não encontrado com este email');
  }

  console.log('Destinatário encontrado:', recipient);

  if (recipient.uid === user.uid) {
    throw new Error('Não é possível transferir para si mesmo');
  }

  const senderRef = doc(db, 'users', user.uid);
  const recipientRef = doc(db, 'users', recipient.uid);

  try {
    // Primeiro, fazer a transação de saldo (sem criar documentos de transação)
    await runTransaction(db, async (transaction) => {
      // Verificar saldo do remetente
      const senderSnap = await transaction.get(senderRef);
      if (!senderSnap.exists()) {
        throw new Error('Conta do remetente não encontrada');
      }

      const senderData = senderSnap.data();
      const senderBalance = Number(senderData?.balance || 0);

      console.log('Saldo do remetente:', senderBalance);

      if (senderBalance < amountNum) {
        throw new Error('Saldo insuficiente');
      }

      // Verificar se destinatário existe
      const recipientSnap = await transaction.get(recipientRef);
      if (!recipientSnap.exists()) {
        throw new Error('Conta do destinatário não encontrada');
      }

      const recipientData = recipientSnap.data();
      const recipientBalance = Number(recipientData?.balance || 0);

      console.log('Saldo do destinatário antes:', recipientBalance);

      // Atualizar saldo do remetente
      const newSenderBalance = senderBalance - amountNum;
      transaction.update(senderRef, { balance: newSenderBalance });

      // Atualizar saldo do destinatário
      const newRecipientBalance = recipientBalance + amountNum;
      transaction.update(recipientRef, { balance: newRecipientBalance });

      console.log('Novos saldos:', { 
        sender: newSenderBalance, 
        recipient: newRecipientBalance 
      });
    });

    console.log('Transação de saldo concluída, criando registros de transação...');

    // Depois, criar os registros de transação separadamente
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

    console.log('Transferência concluída com sucesso');
  } catch (error) {
    console.error('Erro na transferência:', error);
    throw error;
  }
}
