export type CommunityTrustLevel = "high" | "medium" | "low";

export type CommunityTrustReason =
  | { code: "email-verified" }
  | { code: "email-not-verified" }
  | { code: "account-age-today" }
  | { code: "account-age-days"; days: number }
  | { code: "reports-none" }
  | { code: "reports-published"; count: number }
  | { code: "votes-none" }
  | { code: "votes-positive"; net: number }
  | { code: "votes-negative"; net: number }
  | { code: "votes-neutral" }
  | { code: "moderation-penalty"; count: number };

export interface CommunityTrustScore {
  level: CommunityTrustLevel;
  reasons: CommunityTrustReason[];
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
 * utilisateurs. Les raisons sont des codes structurés, à traduire côté
 * interface selon la langue choisie par l'utilisateur — jamais de texte en
 * dur ici.
 */
export function computeCommunityTrustScore(input: CommunityTrustInput): CommunityTrustScore {
  const reasons: CommunityTrustReason[] = [];
  let score = BASE_SCORE;

  if (input.emailVerified) {
    score += EMAIL_VERIFIED_BONUS;
    reasons.push({ code: "email-verified" });
  } else {
    reasons.push({ code: "email-not-verified" });
  }

  const ageBonus = Math.min(MAX_AGE_BONUS, Math.floor(input.accountAgeDays / AGE_BONUS_DAYS_DIVISOR));
  score += ageBonus;
  reasons.push(input.accountAgeDays < 1
    ? { code: "account-age-today" }
    : { code: "account-age-days", days: input.accountAgeDays });

  const reportsBonus = Math.min(MAX_REPORTS_BONUS, input.publishedReports * REPORTS_BONUS_PER_REPORT);
  score += reportsBonus;
  reasons.push(input.publishedReports > 0
    ? { code: "reports-published", count: input.publishedReports }
    : { code: "reports-none" });

  const netVotes = input.totalConfirms - input.totalDisputes;
  const voteBonus = Math.max(-MAX_VOTE_BONUS, Math.min(MAX_VOTE_BONUS, netVotes * VOTE_BONUS_MULTIPLIER));
  score += voteBonus;
  if (input.totalConfirms + input.totalDisputes === 0) {
    reasons.push({ code: "votes-none" });
  } else if (netVotes > 0) {
    reasons.push({ code: "votes-positive", net: netVotes });
  } else if (netVotes < 0) {
    reasons.push({ code: "votes-negative", net: netVotes });
  } else {
    reasons.push({ code: "votes-neutral" });
  }

  if (input.rejectedOrHiddenReports > 0) {
    const penalty = Math.min(MAX_MODERATION_PENALTY, input.rejectedOrHiddenReports * MODERATION_PENALTY_PER_REPORT);
    score -= penalty;
    reasons.push({ code: "moderation-penalty", count: input.rejectedOrHiddenReports });
  }

  const boundedScore = Math.max(0, Math.min(100, score));
  return {
    level: boundedScore >= 75 ? "high" : boundedScore >= 45 ? "medium" : "low",
    reasons,
    score: boundedScore,
  };
}
