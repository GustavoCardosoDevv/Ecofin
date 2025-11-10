import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function ensureUserDoc(user) {
  if (!user) return;
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        email: user.email ?? '',
        displayName: user.displayName ?? '',
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}
