export type AttackTypeId =
  | 'sqlInjection'
  | 'xss'
  | 'pathTraversal'
  | 'commandInjection'
  | 'log4shell'
  | 'sensitivePath'
  | 'scannerAgent'
  | 'bruteForce';

export type AttackSeverity = 'high' | 'medium';

/** OWASP Top 10 (2021) category ids. */
export type OwaspCategoryId = 'A01' | 'A03' | 'A05' | 'A06' | 'A07';

/** Which part of a request a fixed Web Application Firewall hint is about. */
export type WafField = 'path' | 'query' | 'agent' | 'uri';

/** A fixed text that is safe to put in a firewall rule: it comes from our tables, never from a log. */
export interface WafHint {
  field: WafField;
  value: string;
}

/** `request` signatures look only at the request target, `text` signatures at the whole line. */
export type SignatureScope = 'text' | 'request';

export interface AttackSignature {
  id: string;
  type: AttackTypeId;
  scope: SignatureScope;
  /** Runs on lower-cased, URL-decoded text. */
  pattern: RegExp;
  waf?: WafHint;
}

export interface AttackTypeInfo {
  severity: AttackSeverity;
  owasp: OwaspCategoryId;
  /** MITRE ATT&CK technique id. */
  mitre: string;
}

export interface AttackHit {
  lineIndex: number;
  type: AttackTypeId;
  signatureId: string;
  /** A validated address, or null when the line has none. */
  address: string | null;
}

export interface AddressCount {
  address: string;
  count: number;
}

export interface AttackGroup extends AttackTypeInfo {
  type: AttackTypeId;
  /** Lines with this kind of signal. */
  count: number;
  topAddresses: AddressCount[];
  signatureIds: string[];
  /** Line indexes to show as examples. */
  samples: number[];
}

export interface ScanResult {
  scannedLines: number;
  /** Most serious groups first. */
  groups: AttackGroup[];
  /** Lines with a high-severity signal. */
  highSignals: number;
  /** Distinct validated addresses behind the high-severity signals. */
  highAddresses: string[];
  /** Every validated address with a signal, most active first. */
  offenders: AddressCount[];
}
