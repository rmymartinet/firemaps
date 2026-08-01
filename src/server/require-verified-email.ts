/**
 * Retourne une réponse 403 si l'e-mail du compte n'est pas vérifié, `null`
 * sinon. À appeler après avoir vérifié la présence d'une session.
 */
export function requireVerifiedEmail(session: { user: { emailVerified: boolean } }): Response | null {
  if (session.user.emailVerified) return null;
  return Response.json(
    { code: "EMAIL_NOT_VERIFIED", message: "Confirmez votre adresse e-mail avant de contribuer." },
    { status: 403 },
  );
}
