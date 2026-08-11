import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

const TIPOS = ['GERE', 'GOMAN', 'GSTC'];

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

  const { tipo, identificador, horarioPadrao, supervisor, coordenador, ativo } = req.body || {};
  if (tipo && !TIPOS.includes(tipo)) {
    res.status(400).json({ error: `Tipo inválido. Use um de: ${TIPOS.join(', ')}` });
    return;
  }

  const rows = await sql`
    update equipes
    set
      tipo = coalesce(${tipo ?? null}, tipo),
      identificador = coalesce(${identificador ?? null}, identificador),
      horario_padrao_saida = coalesce(${horarioPadrao ?? null}, horario_padrao_saida),
      supervisor = coalesce(${supervisor ?? null}, supervisor),
      coordenador = coalesce(${coordenador ?? null}, coordenador),
      ativo = coalesce(${ativo ?? null}, ativo)
    where id = ${id}
    returning id, base_id, tipo, identificador, horario_padrao_saida, supervisor, coordenador, ativo
  `;

  if (rows.length === 0) {
    res.status(404).json({ error: 'Equipe não encontrada' });
    return;
  }

  res.status(200).json(rows[0]);
}
