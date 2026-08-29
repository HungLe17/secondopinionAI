import "server-only";
import { AppError } from "@/lib/errors";

export function publicConfig() {
  const read = (name: string) => process.env[name]?.trim() || "";
  const firebase = {
    apiKey: read("FIREBASE_WEB_API_KEY"),
    authDomain: read("FIREBASE_AUTH_DOMAIN"),
    projectId: read("FIREBASE_PROJECT_ID"),
    appId: read("FIREBASE_APP_ID"),
    measurementId: read("FIREBASE_MEASUREMENT_ID") || undefined
  };
  const missing = [
    ["FIREBASE_WEB_API_KEY", firebase.apiKey],
    ["FIREBASE_AUTH_DOMAIN", firebase.authDomain],
    ["FIREBASE_PROJECT_ID", firebase.projectId],
    ["FIREBASE_APP_ID", firebase.appId],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new AppError("CONFIGURATION_ERROR", `Missing deployment variables: ${missing.join(", ")}.`, 503);
  if (/^https?:\/\//i.test(firebase.authDomain) || firebase.authDomain.includes("/")) {
    throw new AppError("CONFIGURATION_ERROR", "FIREBASE_AUTH_DOMAIN must be a hostname such as your-project.firebaseapp.com, without https:// or a path.", 503);
  }
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
