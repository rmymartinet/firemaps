import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { prisma } from "./prisma";

const configuredBaseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
const configuredOrigin = (() => {
  try {
    return configuredBaseURL ? new URL(configuredBaseURL).origin : null;
  } catch {
    return null;
  }
})();
const trustedOrigins = [
  configuredOrigin,
  ...(process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:3000", "http://localhost:3001"]),
].filter((origin): origin is string => Boolean(origin));

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

async function sendPasswordResetEmail({
  email,
  name,
  resetUrl,
}: {
  email: string;
  name: string;
  resetUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("L’envoi d’e-mails est indisponible : RESEND_API_KEY ou AUTH_EMAIL_FROM manque.");
  }

  const safeName = escapeHtml(name || "vous");
  const safeResetUrl = escapeHtml(resetUrl);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Réinitialiser votre mot de passe Firemaps",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172322">
          <h1 style="font-size:24px">Réinitialiser votre mot de passe</h1>
          <p>Bonjour ${safeName},</p>
          <p>Une demande de nouveau mot de passe a été effectuée pour votre compte Firemaps.</p>
          <p><a href="${safeResetUrl}" style="display:inline-block;padding:13px 18px;border-radius:8px;background:#172322;color:#fff;text-decoration:none;font-weight:700">Choisir un nouveau mot de passe</a></p>
          <p style="font-size:13px;color:#52615e">Ce lien expire dans une heure. Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>
        </div>
      `,
    }),
  });
  if (!response.ok) throw new Error(`Resend a refusé l’e-mail (${response.status}).`);
}

export const auth = betterAuth({
  baseURL: configuredBaseURL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    resetPasswordTokenExpiresIn: 3_600,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetUrl: url,
      });
    },
  },
  trustedOrigins,
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
});
