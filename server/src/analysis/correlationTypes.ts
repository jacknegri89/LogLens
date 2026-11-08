import type { StrongIdentifierKind } from '../parser/normalizedEvent';
import type { OrderedEvent } from './eventOrdering';

/**
 * How sure a link is.
 * - `confirmed`: the log itself ties the two events (they share an identifier, or the later event
 *   reports the very value the earlier one changed).
 * - `probable`: the events are about the same thing and happen in the right order, but the log does
 *   not state the dependency.
 * - `possible`: a hint worth a look, not enough to say more.
 */
export type Certainty = 'confirmed' | 'probable' | 'possible';

/**
 * What a link says. The first group says only that two events belong together (same request, same
 * order); the second group says that one event may have caused the other.
 */
export type LinkRelation =
  | 'same-identifier'
  | 'change-precedes-anomaly'
  | 'dependency-failure'
  | 'entity-sequence'
  | 'known-relation';

/** A quotation of the log that supports a link, with the place it comes from. */
export interface EvidenceRef {
  eventId: string;
  lineStart: number;
  lineEnd: number;
  /** The first line of the event, cut to a readable length. */
  quote: string;
  /** Why this event supports the link: "shares requestId=req-7", "reports ttlMs=900". */
  note?: string;
}

export interface CausalLink {
  id: string;
  sourceEventId: string;
  targetEventId: string;
  relation: LinkRelation;
  /** False when the link only says the events belong together; true when it says cause and effect. */
  causal: boolean;
  evidence: EvidenceRef[];
  certainty: Certainty;
  /** Reasons not to be fully sure: an assumed time zone, an order inferred from the file, no stated dependency. */
  uncertainty: string[];
}

/** Events that carry the same identifier. */
export interface EventGroup {
  id: string;
  /** A strong identifier kind, or `entityId` for another field that names one thing (a reservation id). */
  kind: StrongIdentifierKind | 'entityId';
  /** The name of the field: `requestId`, `reservationId`. */
  label: string;
  value: string;
  eventIds: string[];
}

/** The same kind of anomaly, repeated: one problem that happens many times. */
export interface RecurrenceGroup {
  id: string;
  signature: string;
  service: string | null;
  eventIds: string[];
}

export interface EventCorrelation {
  ordered: OrderedEvent[];
  groups: EventGroup[];
  recurrences: RecurrenceGroup[];
  links: CausalLink[];
}
