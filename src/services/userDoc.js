import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function ensureUserDoc(user) {
  if (!user) return;
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  const userData = {
    email: (user.email ?? '').toLowerCase().trim(),
    displayName: user.displayName ?? '',
  };

  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        ...userData,
        balance: 0,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    // Atualizar email se mudou
    const currentData = snap.data();
    if (currentData.email !== userData.email) {
      await setDoc(ref, { email: userData.email }, { merge: true });
    }
  }
}
