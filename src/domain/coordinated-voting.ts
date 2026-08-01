export interface CoordinatedVotingInput {
  minimumDistinctVoters: number;
  recentVotes: Array<{ voterId: string }>;
}

export interface CoordinatedVotingSignal {
  distinctVoterCount: number;
  flagged: boolean;
}

/**
 * Signale (sans jamais bloquer) un possible vote coordonné : plusieurs
 * comptes distincts ayant voté sur le même signalement depuis la même
 * adresse IP dans une fenêtre de temps courte. Le filtrage par signalement,
 * IP et fenêtre temporelle est fait par l'appelant (requête base de
 * données) ; cette fonction ne fait que compter les comptes distincts déjà
 * filtrés et comparer au seuil.
 *
 * Ne bloque jamais le vote : une IP partagée (foyer, bureau, réseau mobile
 * CGNAT) peut légitimement représenter plusieurs personnes distinctes votant
 * sincèrement. Le signal sert uniquement à alimenter une modération humaine
 * future.
 */
export function detectCoordinatedVoting(input: CoordinatedVotingInput): CoordinatedVotingSignal {
  const distinctVoterCount = new Set(input.recentVotes.map((vote) => vote.voterId)).size;
  return {
    distinctVoterCount,
    flagged: distinctVoterCount >= input.minimumDistinctVoters,
  };
}
