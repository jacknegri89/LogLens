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
 * The client sends a random id stored in its own browser. It is not a login:
 * it only keeps each visitor's history separate from everyone else's.
 * An invalid or missing id becomes an empty owner.
 */
export function readVisitorId(header: string | undefined): string {
  if (header !== undefined && VISITOR_ID_PATTERN.test(header)) {
    return header;
  }
  return '';
}

/** The network address is stored only as a salted hash, never in clear. */
export function hashAddress(address: string): string {
  return createHash('sha256').update(`${env.VISITOR_SALT}:${address}`).digest('hex').slice(0, 32);
}

function readAddress(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  return clientAddress(
    typeof forwarded === 'string' ? forwarded : undefined,
    req.socket.remoteAddress ?? '',
    env.TRUST_PROXY,
  );
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

export function identifyVisitor(req: Request, res: Response, next: NextFunction) {
  const visitor: Visitor = {
    owner: readVisitorId(req.header('x-visitor-id')),
    clientHash: hashAddress(readAddress(req)),
  };
  res.locals.visitor = visitor;
  next();
}
