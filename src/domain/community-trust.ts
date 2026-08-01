export type CommunityTrustLevel = "high" | "medium" | "low";

export interface CommunityTrustScore {
  level: CommunityTrustLevel;
  reasons: string[];
  score: number;
}

export interface CommunityTrustInput {
  accountAgeDays: number;
  emailVerified: boolean;
  publishedReports: number;
  rejectedOrHiddenReports: number;
  totalConfirms: number;
  totalDisputes: number;
}

const BASE_SCORE = 20;
const EMAIL_VERIFIED_BONUS = 20;
const MAX_AGE_BONUS = 20;
const AGE_BONUS_DAYS_DIVISOR = 3;
const MAX_REPORTS_BONUS = 20;
const REPORTS_BONUS_PER_REPORT = 2;
const MAX_VOTE_BONUS = 20;
const VOTE_BONUS_MULTIPLIER = 2;
const MAX_MODERATION_PENALTY = 20;
const MODERATION_PENALTY_PER_REPORT = 5;

/**
 * Score de confiance communautaire explicable, calculé uniquement à partir de
 * données déjà persistées (aucune migration de schéma requise). Réservé à un
 * affichage privé pour le compte concerné : jamais de classement public entre
 * utilisateurs.
 */
export function computeCommunityTrustScore(input: CommunityTrustInput): CommunityTrustScore {
  const reasons: string[] = [];
  let score = BASE_SCORE;

  if (input.emailVerified) {
    score += EMAIL_VERIFIED_BONUS;
    reasons.push("Adresse e-mail vérifiée.");
  } else {
    reasons.push("Adresse e-mail non vérifiée.");
  }

  const ageBonus = Math.min(MAX_AGE_BONUS, Math.floor(input.accountAgeDays / AGE_BONUS_DAYS_DIVISOR));
  score += ageBonus;
  reasons.push(input.accountAgeDays < 1
    ? "Compte créé aujourd’hui."
    : `Compte créé depuis ${input.accountAgeDays} jour${input.accountAgeDays > 1 ? "s" : ""}.`);

  const reportsBonus = Math.min(MAX_REPORTS_BONUS, input.publishedReports * REPORTS_BONUS_PER_REPORT);
  score += reportsBonus;
  reasons.push(input.publishedReports > 0
    ? `${input.publishedReports} signalement${input.publishedReports > 1 ? "s" : ""} publié${input.publishedReports > 1 ? "s" : ""}.`
    : "Aucun signalement publié pour l’instant.");

  const netVotes = input.totalConfirms - input.totalDisputes;
  const voteBonus = Math.max(-MAX_VOTE_BONUS, Math.min(MAX_VOTE_BONUS, netVotes * VOTE_BONUS_MULTIPLIER));
  score += voteBonus;
  if (input.totalConfirms + input.totalDisputes === 0) {
    reasons.push("Pas encore de votes reçus.");
  } else if (netVotes > 0) {
    reasons.push(`Bilan des votes reçus positif (+${netVotes}).`);
  } else if (netVotes < 0) {
    reasons.push(`Bilan des votes reçus négatif (${netVotes}).`);
  } else {
    reasons.push("Bilan des votes reçus neutre.");
  }

  if (input.rejectedOrHiddenReports > 0) {
    const penalty = Math.min(MAX_MODERATION_PENALTY, input.rejectedOrHiddenReports * MODERATION_PENALTY_PER_REPORT);
    score -= penalty;
    reasons.push(`${input.rejectedOrHiddenReports} signalement${input.rejectedOrHiddenReports > 1 ? "s" : ""} rejeté${input.rejectedOrHiddenReports > 1 ? "s" : ""} ou masqué${input.rejectedOrHiddenReports > 1 ? "s" : ""} par la modération.`);
  }

  const boundedScore = Math.max(0, Math.min(100, score));
  return {
    level: boundedScore >= 75 ? "high" : boundedScore >= 45 ? "medium" : "low",
    reasons,
    score: boundedScore,
  };
}
