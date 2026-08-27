import "server-only";
import { AppError } from "@/lib/errors";

export function publicConfig() {
  const firebase = {
    apiKey: process.env.FIREBASE_WEB_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    appId: process.env.FIREBASE_APP_ID || "",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || undefined
  };
  if (!firebase.apiKey || !firebase.authDomain || !firebase.projectId || !firebase.appId) throw new AppError("CONFIGURATION_ERROR", "Firebase web configuration is incomplete. Follow README setup.", 503);
  return { firebase, analyticsEnabled: Boolean(firebase.measurementId), emulatorsEnabled: process.env.APP_ENV === "emulator" };
}

export function serverConfig() {
  const values = {
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    appBaseUrl: process.env.APP_BASE_URL || "",
    appEnv: process.env.APP_ENV || "development"
  };
  const missing = Object.entries(values).filter(([key, value]) => !["geminiModel","appEnv"].includes(key) && !value).map(([key]) => key);
  if (missing.length) throw new AppError("CONFIGURATION_ERROR", `Server configuration is incomplete (${missing.join(", ")}). Follow README setup.`, 503);
  try{const url=new URL(values.appBaseUrl);if(!["http:","https:"].includes(url.protocol))throw new Error();}catch{throw new AppError("CONFIGURATION_ERROR","APP_BASE_URL must be a valid http(s) URL.",503);}
  return values;
}
