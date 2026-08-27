import "server-only";
import { applicationDefault, cert, getApp, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { AppError } from "@/lib/errors";

function adminApp() {
  if (getApps().length) return getApp();
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const encodedServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  let credential;
  if (encodedServiceAccount) {
    try {
      const parsed = JSON.parse(Buffer.from(encodedServiceAccount, "base64").toString("utf8")) as ServiceAccount & { project_id?: string };
      if (!parsed.projectId && parsed.project_id) parsed.projectId = parsed.project_id;
      if (!parsed.projectId || !parsed.clientEmail || !parsed.privateKey) throw new Error("missing fields");
      if (projectId && parsed.projectId !== projectId) throw new Error("project mismatch");
      credential = cert(parsed);
    } catch {
      throw new AppError("CONFIGURATION_ERROR", "FIREBASE_SERVICE_ACCOUNT_BASE64 is invalid or belongs to a different Firebase project.", 503);
    }
  } else {
    credential = applicationDefault();
  }
  return initializeApp({
    credential,
    projectId,
  });
}

export function adminServices() {
  if(!process.env.FIREBASE_PROJECT_ID)throw new AppError("CONFIGURATION_ERROR","FIREBASE_PROJECT_ID is not configured. Follow README setup.",503);
  const app = adminApp();
  return { auth: getAuth(app), db: getFirestore(app) };
}
