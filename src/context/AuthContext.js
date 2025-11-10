import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,                 // salvar displayName
  sendPasswordResetEmail,        // reset de senha por e-mail
  signOut as fbSignOut,
  deleteUser,                    // excluir conta
  reauthenticateWithCredential,  // reautenticação
  EmailAuthProvider,             // credencial p/ reauth
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { ensureUserDoc } from '../services/userDoc';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          await ensureUserDoc(u); // garante doc do usuário
        } catch (e) {
          console.log('ENSURE USER DOC ERROR ->', e);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // (name, email, password)
  async function signUp(name, email, password) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(cred.user, { displayName: name });
      }
      await ensureUserDoc(cred.user);
      return cred.user;
    } catch (e) {
      console.log('SIGNUP ERROR ->', e.code, e.message, e?.customData?.serverResponse);
      throw e;
    }
  }

  async function signIn(email, password) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await ensureUserDoc(cred.user);
      return cred.user;
    } catch (e) {
      console.log('SIGNIN ERROR ->', e.code, e.message, e?.customData?.serverResponse);
      throw e;
    }
  }

  // Reset de senha por e-mail
  async function resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (e) {
      console.log('RESET PASSWORD ERROR ->', e.code, e.message, e?.customData?.serverResponse);
      throw e;
    }
  }

  // Excluir conta (reautentica se necessário)
  async function deleteAccount(currentPassword) {
    const u = auth.currentUser;
    if (!u) throw new Error('Nenhum usuário logado');

    try {
      // Tenta deletar direto (se o login for recente, funciona)
      await deleteUser(u);
      return;
    } catch (e) {
      if (e?.code === 'auth/requires-recent-login') {
        // precisa reautenticar
        if (!currentPassword) {
          // Deixe a tela pedir a senha e chamar novamente
          throw new Error('REAUTH_NEEDED');
        }
        const cred = EmailAuthProvider.credential(u.email, currentPassword);
        await reauthenticateWithCredential(u, cred);
        await deleteUser(u);
        return;
      }
      throw e;
    }
  }

  async function signOut() {
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.log('SIGNOUT ERROR ->', e);
      throw e;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        resetPassword,
        deleteAccount,  // <<—— exposto no contexto
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
