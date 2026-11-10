import type { NextFunction, Request, Response } from 'express';
import { randomBytes, scrypt as scryptCallback, createHash, timingSafeEqual } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import { getPool } from './database.js';

export interface AuthUserShape {
  id: string;
  name: string;
  email: string;
  role: 'requester' | 'admin';
  password_hash?: string;
}

export function publicUser<T extends AuthUserShape>(user: T): Omit<T, 'password_hash'> {
  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

const allowedEmailDomains = new Set(['gmail.com', 'hotmail.com', 'outlook.com']);

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();

  if (!/^(?=[^@]*[a-z])[a-z0-9._%+\-]+@(?:[a-z0-9\-]+\.)+[a-z]{2,}$/.test(normalized)) {
    return null;
  }

  const [, domain] = normalized.split('@');
  if (!domain || !allowedEmailDomains.has(domain)) {
    return null;
  }

  return normalized;
}

export function validPassword(value: unknown): boolean {
  return typeof value === 'string' && value.length >= 12 && value.length <= 128;
}

export function validCredentials(name: unknown, email: unknown, password: unknown): boolean {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 150
    && normalizeEmail(email) !== null
    && validPassword(password);
}

export function validEmailAndPassword(email: unknown, password: unknown): boolean {
  return normalizeEmail(email) !== null && validPassword(password);
}

export function isValidSessionToken(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0 && /^[A-Za-z0-9._-]+$/.test(value);
}

export function readSessionCookie(req: Request, cookieName = 'bv_hub_session'): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const item = cookieHeader.split(';').map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${cookieName}=`));
  const token = item?.slice(cookieName.length + 1);
  return isValidSessionToken(token) ? token : undefined;
}

export function sessionHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isRoleAuthorized(
  role: string | undefined,
  allowedRoles: Array<'requester' | 'admin'>,
): boolean {
  return typeof role === 'string' && allowedRoles.includes(role as 'requester' | 'admin');
}

export const SESSION_COOKIE = 'bv_hub_session';
export const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export interface UserRow extends QueryResultRow {
  id: string;
  name: string;
  email: string;
  role: 'requester' | 'admin';
  password_hash: string;
}

export interface AuthenticatedRequest extends Request {
  user?: Omit<UserRow, 'password_hash'>;
}

function deriveKey(password: string, salt: Buffer, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, length, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

export function sessionCookie(value: string, maxAgeSeconds: number): string {
  const isSecureContext = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const secure = isSecureContext ? '; Secure' : '';
  const sameSite = isSecureContext ? 'Lax' : 'Strict';
  return `${SESSION_COOKIE}=${value}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${maxAgeSeconds}${secure}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await deriveKey(password, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function requireUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token = readSessionCookie(req);
    if (!token) {
      res.status(401).json({ error: 'Faça login para continuar.' });
      return;
    }

    const result = await getPool().query<UserRow>(
      `SELECT u.id, u.name, u.email, u.role
       FROM app_sessions s
       JOIN app_users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
      [sessionHash(token)],
    );
    if (!result.rows[0]) {
      res.setHeader('Set-Cookie', sessionCookie('', 0));
      res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.' });
      return;
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Erro ao validar sessão:', error);
    res.status(503).json({ error: 'Não foi possível validar a sessão.' });
  }
}

export function canAccessAdmin(req: AuthenticatedRequest): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(
    req.user
    && isRoleAuthorized(req.user.role, ['admin'])
    && adminEmail
    && req.user.email === adminEmail,
  );
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!canAccessAdmin(req)) {
    res.status(403).json({ error: 'Acesso exclusivo à administração.' });
    return;
  }
  next();
}

export async function createSession(userId: string, res: Response) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
  const pool = getPool();
  await pool.query('DELETE FROM app_sessions WHERE expires_at <= NOW()');
  await pool.query(
    'INSERT INTO app_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, sessionHash(token), expiresAt],
  );
  res.setHeader('Set-Cookie', sessionCookie(token, SESSION_LIFETIME_MS / 1000));
}
