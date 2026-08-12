/**
 * Forms Offline — Remote Sync Service & PoW Solver
 * 
 * Computes client-side SHA-256 CPU puzzle (~100ms) and submits encrypted records
 * to self-hosted collector endpoints.
 */

import { FormSubmission } from '../core/types';
import { computeSHA256 } from '../core/fingerprint/templateHasher';

export async function solvePoWChallenge(nonce: string, difficultyPrefix = '0000'): Promise<string> {
  let counter = 0;
  while (counter < 1000000) {
    const solutionStr = String(counter);
    const hash = await computeSHA256(nonce + solutionStr);
    if (hash.startsWith(difficultyPrefix)) {
      return solutionStr;
    }
    counter++;
  }
  throw new Error('PoW challenge solution search timeout.');
}

export async function syncRecordToRemoteServer(serverUrl: string, submission: FormSubmission): Promise<boolean> {
  try {
    // 1. Fetch challenge nonce from remote server
    const challengeRes = await fetch(`${serverUrl}/challenge`);
    if (!challengeRes.ok) return false;
    const { nonce } = await challengeRes.json();

    // 2. Solve PoW puzzle client-side
    const solution = await solvePoWChallenge(nonce);

    // 3. POST encrypted record payload with PoW headers
    const submitRes = await fetch(`${serverUrl}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PoW-Nonce': nonce,
        'X-PoW-Solution': solution
      },
      body: JSON.stringify(submission)
    });

    return submitRes.ok;
  } catch (err) {
    console.error('Remote E2EE sync failed:', err);
    return false;
  }
}
