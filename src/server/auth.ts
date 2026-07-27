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

export const auth = betterAuth({
  baseURL: configuredBaseURL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    revokeSessionsOnPasswordReset: true,
  },
  trustedOrigins,
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
});
