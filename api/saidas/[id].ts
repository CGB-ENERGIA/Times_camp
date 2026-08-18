import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = requireAuth(req, res);
  if (!session) return;

  if (session.role !== 'admin') {
    res.status(403).json({ error: 'Apenas administradores podem editar ou excluir registros' });
    return;
  }

  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'id inválido' });
    return;
  }

  if (req.method === 'PUT') {
    const existenteRows = await sql`select id from saidas where id = ${id}`;
    if (!existenteRows[0]) {
      res.status(404).json({ error: 'Registro não encontrado' });
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
    return;
  }

  if (req.method === 'DELETE') {
    const existenteRows = await sql`select id from saidas where id = ${id}`;
    if (!existenteRows[0]) {
      res.status(404).json({ error: 'Registro não encontrado' });
      return;
    }
    await sql`delete from saidas where id = ${id}`;
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Método não permitido' });
}
