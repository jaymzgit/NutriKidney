/**
 * Shared settings for mock services. Everything in mocks/ stands in for a
 * backend that doesn't exist yet — see the MOCK: markers in each file.
 */

/** Set above 0 (e.g. 0.3) to exercise error states in the UI. */
export const MOCK_FAILURE_RATE = 0;

/** Resolve after `ms`, or reject if the simulated network "fails". */
export function simulateNetwork(ms: number): Promise<void> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (Math.random() < MOCK_FAILURE_RATE) {
        reject(new Error("We couldn't reach the server. Please try again."));
      } else {
        resolve();
      }
    }, ms)
  );
}
