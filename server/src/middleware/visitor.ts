import { createHash } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env';
import { clientAddress } from './clientAddress';
import { AppError } from './errorHandler';

/** Who is calling: the browser's random id (owner) and a hash of its network address. */
export interface Visitor {
  owner: string;
  clientHash: string;
}

const VISITOR_ID_PATTERN = /^[A-Za-z0-9-]{16,64}$/;
/**
 * A UUID has 15 or more different characters. An id with fewer is not random ("aaaaaaaaaaaaaaaa",
 * "1234512345123451") and anybody could guess it, so it is refused.
 */
const MIN_DISTINCT_CHARACTERS = 10;

/**
 * The client sends a random id stored in its own browser (a UUID). It is not a login: whoever
 * holds the id can read and delete that history, exactly like a session cookie, and anybody who
 * learns it (a shared computer, a leaked browser profile) can do the same. It keeps each visitor's
 * history separate from everyone else's, which is all a demo without accounts needs; it is not a
 * protection for sensitive logs. A missing, malformed or guessable id becomes an empty owner.
 */
export function readVisitorId(header: string | undefined): string {
  if (header === undefined || !VISITOR_ID_PATTERN.test(header)) {
    return '';
  }
  if (new Set(header).size < MIN_DISTINCT_CHARACTERS) {
    return '';
  }
  return header;
}

/** The network address is stored only as a salted hash, never in clear. */
export function hashAddress(address: string): string {
  return createHash('sha256').update(`${env.VISITOR_SALT}:${address}`).digest('hex').slice(0, 32);
}

function readAddress(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  let forwardedAddress: string | undefined;
  if (typeof forwarded === 'string') {
    forwardedAddress = forwarded;
  }
  return clientAddress(forwardedAddress, req.socket.remoteAddress ?? '', env.TRUST_PROXY);
}

/**
 * Analysis routes need a visitor id. Without one, the request would read or write
 * the shared rows that have no owner, so it is refused.
 */
export function requireVisitorOwner(_req: Request, res: Response, next: NextFunction) {
  const visitor = res.locals.visitor as Visitor | undefined;
  if (!visitor?.owner) {
    throw new AppError(400, 'Missing or invalid X-Visitor-Id header.');
  }
  next();
}

/** The salted hash of the caller's network address: how the limits tell callers apart. */
export function readClientHash(req: Request): string {
  return hashAddress(readAddress(req));
}

export function identifyVisitor(req: Request, res: Response, next: NextFunction) {
  const visitor: Visitor = {
    owner: readVisitorId(req.header('x-visitor-id')),
    clientHash: readClientHash(req),
  };
  res.locals.visitor = visitor;
  next();
}
