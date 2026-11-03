export const SCENARIO_IDS = [
  'database-connection-refused',
  'connection-pool-exhausted',
  'sql-injection',
  'null-access',
  'unhandled-rejection',
  'outbound-timeout',
  'rate-limit-429',
  'out-of-memory',
  'expired-certificate',
  'cors-blocked',
  'missing-environment-variable',
  'json-parse-error',
  'path-traversal',
  'brute-force-login',
  'file-descriptor-leak',
] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

export const CODE_LANGUAGE_IDS = [
  'node',
  'python',
  'java',
  'go',
  'php',
  'ruby',
  'csharp',
  'rust',
] as const;

export type CodeLanguageId = (typeof CODE_LANGUAGE_IDS)[number];

/** The buggy code and its patch, in one language. */
export interface CodeSample {
  before: string;
  after: string;
}

export type CodeSamples = Partial<Record<CodeLanguageId, CodeSample>>;

export interface RemediationScenario {
  id: ScenarioId;
  samples: CodeSamples;
}
