import "server-only";
import { AppError } from "@/lib/errors";
import { adminServices } from "@/lib/server/firebase-admin";

export async function requireUser(request: Request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer (.+)$/i);
  if (!match) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
  const auth=adminServices().auth;
  try {
    return await auth.verifyIdToken(match[1], true);
  } catch (error) {
    const code = String((error as { code?: unknown })?.code || "");
    const message = error instanceof Error ? error.message : "";
    if (/credential|metadata|default credentials/i.test(`${code} ${message}`)) {
      throw new AppError("CONFIGURATION_ERROR", "Server-side Firebase credentials are not configured. Add FIREBASE_SERVICE_ACCOUNT_BASE64 to the deployment secrets.", 503);
    }
    throw new AppError("UNAUTHORIZED", "Your sign-in has expired. Sign in again.", 401);
  }
}
