import { describe, expect, it } from "vitest";
import { friendlyAuthError } from "@/lib/auth-errors";

describe("friendlyAuthError", () => {
  it("does not expose Firebase credential details", () => {
    expect(friendlyAuthError({ code: "auth/invalid-credential" }, "en")).toBe("The email or password is incorrect.");
    expect(friendlyAuthError(new Error("sensitive backend detail"), "en")).toBe("Sign-in could not be completed. Please try again.");
  });

  it("returns proper Vietnamese messages", () => {
    expect(friendlyAuthError({ code: "auth/email-already-in-use" }, "vi")).toBe("Email này đã được dùng để tạo tài khoản.");
    expect(friendlyAuthError({ code: "auth/too-many-requests" }, "vi")).toContain("quá nhiều lần");
  });

  it("explains hosted Google sign-in failures", () => {
    expect(friendlyAuthError({ code: "auth/unauthorized-domain" }, "en")).toContain("Authorized domains");
    expect(friendlyAuthError({ code: "auth/popup-blocked" }, "en")).toContain("new tab");
    expect(friendlyAuthError({ code: "auth/web-storage-unsupported" }, "en")).toContain("embedded preview");
  });

  it("identifies Firebase deployment configuration failures", () => {
    expect(friendlyAuthError({ code: "auth/invalid-api-key" }, "en")).toContain("FIREBASE_WEB_API_KEY");
    expect(friendlyAuthError({ code: "auth/app-not-authorized" }, "en")).toContain("API key restrictions");
    expect(friendlyAuthError({ code: "auth/configuration-not-found" }, "en")).toContain("same Firebase Web App");
    expect(friendlyAuthError({ code: "auth/an-unmapped-code" }, "en")).toContain("auth/an-unmapped-code");
  });
});
