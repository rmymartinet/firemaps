import { describe, expect, it } from "vitest";
import { requireVerifiedEmail } from "./require-verified-email";

describe("requireVerifiedEmail", () => {
  it("laisse passer un compte dont l'e-mail est vérifié", () => {
    expect(requireVerifiedEmail({ user: { emailVerified: true } })).toBeNull();
  });

  it("renvoie une réponse 403 pour un compte non vérifié", async () => {
    const response = requireVerifiedEmail({ user: { emailVerified: false } });

    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toEqual({
      code: "EMAIL_NOT_VERIFIED",
      message: "Confirmez votre adresse e-mail avant de contribuer.",
    });
  });
});
