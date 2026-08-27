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
});
