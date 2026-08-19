import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

const TIPOS = ['GERE', 'GOMAN', 'GSTC'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = requireAuth(req, res, 'admin');
  if (!session) return;

  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'id inválido' });
    return;
  }

  if (req.method === 'PUT') {
    const { baseId, tipo, identificador, horarioPadrao, supervisor, coordenador, ativo } = req.body || {};
    if (tipo && !TIPOS.includes(tipo)) {
      res.status(400).json({ error: `Tipo inválido. Use um de: ${TIPOS.join(', ')}` });
      return;
    }

    try {
      const rows = await sql`
        update equipes
        set
          base_id              = coalesce(${baseId ?? null}::int, base_id),
          tipo                 = coalesce(${tipo ?? null}, tipo),
          identificador        = coalesce(${identificador ?? null}, identificador),
          horario_padrao_saida = coalesce(${horarioPadrao ?? null}, horario_padrao_saida),
          supervisor           = coalesce(${supervisor ?? null}, supervisor),
          coordenador          = coalesce(${coordenador ?? null}, coordenador),
          ativo                = coalesce(${ativo ?? null}, ativo)
        where id = ${id}
        returning id, base_id, tipo, identificador, horario_padrao_saida, supervisor, coordenador, ativo
      `;
      if (rows.length === 0) {
        res.status(404).json({ error: 'Equipe não encontrada' });
        return;
      }
      res.status(200).json(rows[0]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('equipes_base_id_identificador_key')) {
        res.status(409).json({ error: 'Já existe uma equipe com esse identificador nessa base' });
        return;
      }
      throw err;
    }
    return;
  }

  if (req.method === 'DELETE') {
    const existente = await sql`select id from equipes where id = ${id}`;
    if (!existente[0]) {
      res.status(404).json({ error: 'Equipe não encontrada' });
      return;
    }

    try {
      await sql`delete from equipes where id = ${id}`;
      res.status(200).json({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('foreign key') || msg.includes('fkey')) {
        res.status(409).json({ error: 'Não é possível excluir: equipe possui registros de saída vinculados' });
        return;
      }
      throw err;
    }
    return;
  }

  res.status(405).json({ error: 'Método não permitido' });
}
