"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getFirebase } from "@/lib/firebase-client";
import { trackSafeEvent } from "@/lib/analytics";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configError: string | null;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  createAccount: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (pathname === "/demo") return;
    let unsubscribe: () => void = () => {};
    getFirebase()
      .then(({ auth, db }) => {
        unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
          setUser(nextUser);
          setLoading(false);
          if (nextUser) {
            if (
              window.sessionStorage.getItem("second-opinion-sign-in-pending")
            ) {
              window.sessionStorage.removeItem(
                "second-opinion-sign-in-pending",
              );
              void trackSafeEvent("sign_in_success");
            }
            const userRef = doc(db, "users", nextUser.uid);
            const profile = {
              displayName: nextUser.displayName || "",
              email: nextUser.email || "",
              photoURL: nextUser.photoURL,
              lastSeenAt: serverTimestamp(),
            };
            const existing = await getDoc(userRef).catch(() => null);
            if (existing?.exists())
              await updateDoc(userRef, profile).catch(() => undefined);
            else
              await setDoc(userRef, {
                ...profile,
                createdAt: serverTimestamp(),
              }).catch(() => undefined);
          }
        });
      })
      .catch((error: unknown) => {
        setConfigError(
          error instanceof Error
            ? error.message
            : "Account access is temporarily unavailable. The sample report remains available.",
        );
        setLoading(false);
      });
    return () => unsubscribe();
  }, [pathname]);

  const signIn = useCallback(async () => {
    const { auth } = await getFirebase();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    auth.useDeviceLanguage();
    await signInWithPopup(auth, provider);
    void trackSafeEvent("sign_in_success");
  }, []);

  const logOut = useCallback(async () => {
    const { auth } = await getFirebase();
    await signOut(auth);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { auth } = await getFirebase();
    await signInWithEmailAndPassword(auth, email.trim(), password);
    void trackSafeEvent("sign_in_success");
  }, []);

  const createAccount = useCallback(async (name: string, email: string, password: string) => {
    const { auth } = await getFirebase();
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(credential.user, { displayName: name.trim() });
    setUser(credential.user);
    void trackSafeEvent("sign_in_success");
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { auth } = await getFirebase();
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const value = useMemo(
    () => ({ user, loading, configError, signIn, signInWithEmail, createAccount, resetPassword, logOut }),
    [user, loading, configError, signIn, signInWithEmail, createAccount, resetPassword, logOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}

export function useOptionalAuth() {
  return useContext(AuthContext);
}
