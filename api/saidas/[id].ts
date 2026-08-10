import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const session = requireAuth(req, res);
  if (!session) return;

  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'id inválido' });
    return;
  }

  const existenteRows = await sql`
    select s.id, e.base_id
    from saidas s
    join equipes e on e.id = s.equipe_id
    where s.id = ${id}
  `;
  const existente = existenteRows[0];
  if (!existente) {
    res.status(404).json({ error: 'Registro não encontrado' });
    return;
  }
  if (session.role === 'tecnico' && existente.base_id !== session.baseId) {
    res.status(403).json({ error: 'Você só pode editar saídas da sua base' });
    return;
  }

  const { horaSaida, observacao } = req.body || {};
  const rows = await sql`
    update saidas
    set
      hora_saida = coalesce(${horaSaida ?? null}, hora_saida),
      observacao = coalesce(${observacao ?? null}, observacao),
      registrado_por = ${session.usuarioId},
      updated_at = now()
    where id = ${id}
    returning id, equipe_id, data, hora_saida, observacao
  `;

  res.status(200).json(rows[0]);
}
