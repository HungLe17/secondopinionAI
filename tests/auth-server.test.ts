import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyIdToken, adminServices } = vi.hoisted(() => ({ verifyIdToken: vi.fn(), adminServices: vi.fn() }));
vi.mock("@/lib/server/firebase-admin", () => ({ adminServices }));
import { requireUser } from "@/lib/server/auth";

describe("server authentication configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminServices.mockReturnValue({ auth: { verifyIdToken } });
  });

  it("reports missing server credentials as configuration, not expired sign-in", async () => {
    verifyIdToken.mockRejectedValue(Object.assign(new Error("Could not load the default credentials from metadata"), { code: "app/invalid-credential" }));
    await expect(requireUser(new Request("http://test", { headers: { Authorization: "Bearer token" } }))).rejects.toMatchObject({ code: "CONFIGURATION_ERROR", status: 503 });
  });

  it("still reports an invalid user token as unauthorized", async () => {
    verifyIdToken.mockRejectedValue(Object.assign(new Error("Decoding Firebase ID token failed"), { code: "auth/argument-error" }));
    await expect(requireUser(new Request("http://test", { headers: { Authorization: "Bearer bad-token" } }))).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
  });
});
