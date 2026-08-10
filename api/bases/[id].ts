import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

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

  const { nome, codigo, ativo } = req.body || {};
  const rows = await sql`
    update bases
    set
      nome = coalesce(${nome ?? null}, nome),
      codigo = coalesce(${codigo ?? null}, codigo),
      ativo = coalesce(${ativo ?? null}, ativo)
    where id = ${id}
    returning id, nome, codigo, ativo
  `;

  if (rows.length === 0) {
    res.status(404).json({ error: 'Base não encontrada' });
    return;
  }

  res.status(200).json(rows[0]);
}
