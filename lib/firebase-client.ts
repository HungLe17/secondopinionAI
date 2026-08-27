import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Analytics, getAnalytics, initializeAnalytics, isSupported } from "firebase/analytics";
import { Auth, connectAuthEmulator, getAuth } from "firebase/auth";
import { Firestore, connectFirestoreEmulator, getFirestore } from "firebase/firestore";

export type PublicConfig = {
  firebase: { apiKey: string; authDomain: string; projectId: string; appId: string; measurementId?: string };
  analyticsEnabled: boolean;
  emulatorsEnabled?: boolean;
};

let app: FirebaseApp | undefined;
let config: PublicConfig | undefined;
let emulatorsConnected = false;
let analytics: Analytics | undefined;

export async function getPublicConfig() {
  if (config) return config;
  const response = await fetch("/api/config", { cache: "no-store" });
  if (!response.ok) throw new Error("Firebase is not configured. Check the setup guide.");
  config = await response.json() as PublicConfig;
  return config;
}

export async function getFirebase() {
  const runtime = await getPublicConfig();
  app = app ?? (getApps().length ? getApp() : initializeApp(runtime.firebase));
  const auth = getAuth(app);const db=getFirestore(app);
  if(runtime.emulatorsEnabled&&!emulatorsConnected){connectAuthEmulator(auth,"http://127.0.0.1:9099",{disableWarnings:true});connectFirestoreEmulator(db,"127.0.0.1",8081);emulatorsConnected=true;}
  return {
    app,
    auth: auth as Auth,
    db: db as Firestore,
    config: runtime
  };
}

export async function enableConsentedAnalytics(): Promise<Analytics | null> {
  const { app, config } = await getFirebase();
  if (!config.analyticsEnabled || !(await isSupported())) return null;
  analytics = analytics ?? initializeAnalytics(app, { config: { send_page_view: false } });
  return analytics || getAnalytics(app);
}
