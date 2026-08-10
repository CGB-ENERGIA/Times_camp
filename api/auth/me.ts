import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }
  const session = requireAuth(req, res);
  if (!session) return;

  res.status(200).json({
    id: session.usuarioId,
    usuario: session.usuario,
    nome: session.nome,
    role: session.role,
    baseId: session.baseId,
  });
}
