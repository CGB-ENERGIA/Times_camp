import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { hashPassword } from '../_lib/hash.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const session = requireAuth(req, res, 'admin');
  if (!session) return;

  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'id inválido' });
    return;
  }

  const { nome, baseId, ativo, senha } = req.body || {};
  const senhaHash = senha ? await hashPassword(senha) : null;

  const rows = await sql`
    update usuarios
    set
      nome = coalesce(${nome ?? null}, nome),
      base_id = case when ${baseId === undefined} then base_id else ${baseId ?? null} end,
      ativo = coalesce(${ativo ?? null}, ativo),
      senha_hash = coalesce(${senhaHash}, senha_hash)
    where id = ${id}
    returning id, nome, usuario, role, base_id, ativo, created_at
  `;

  if (rows.length === 0) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }

  res.status(200).json(rows[0]);
}
