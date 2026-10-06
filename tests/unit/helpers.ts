import type { TrialRecord } from "@/lib/activities/types";

export function trial(overrides: Partial<TrialRecord> & { trialIndex: number }): TrialRecord {
  return {
    condition: {},
    stimulusOnsetMs: null,
    responseAtMs: null,
    rtMs: null,
    response: null,
    correct: null,
    classification: null,
    inputType: null,
    valid: true,
    invalidReason: null,
    ...overrides,
  };
}
