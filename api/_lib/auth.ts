import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { serialize, parse } from 'cookie';

const COOKIE_NAME = 'tc_session';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não está definida');
}
const JWT_SECRET: string = process.env.JWT_SECRET;

export type Role = 'admin' | 'tecnico' | 'coordenador' | 'visualizador';

export interface SessionPayload {
  usuarioId: number;
  usuario: string;
  nome: string;
  role: Role;
  baseId: number | null;
  supervisor: string | null;
  coordenador: string | null;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
}

export function setSessionCookie(res: VercelResponse, token: string) {
  const cookie = serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  res.setHeader('Set-Cookie', cookie);
}

export function clearSessionCookie(res: VercelResponse) {
  const cookie = serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  res.setHeader('Set-Cookie', cookie);
}

export function getSession(req: VercelRequest): SessionPayload | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const cookies = parse(raw);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Verifica sessão (e opcionalmente a role); já escreve a resposta 401/403
 * e retorna null quando o acesso deve ser negado.
 */
export function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
  role?: Role,
): SessionPayload | null {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: 'Não autenticado' });
    return null;
  }
  if (role && session.role !== role) {
    res.status(403).json({ error: 'Sem permissão' });
    return null;
  }
  return session;
}
