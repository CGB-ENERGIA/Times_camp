import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;

    const baseId = req.query.baseId ? Number(req.query.baseId) : null;
    const equipeId = req.query.equipeId ? Number(req.query.equipeId) : null;
    const dataInicio = (req.query.dataInicio as string) || null;
    const dataFim = (req.query.dataFim as string) || null;

    const registros = await sql`
      select
        s.id, s.equipe_id, e.identificador, e.tipo, e.base_id, b.nome as base_nome,
        s.data, s.hora_saida, s.observacao, u.nome as registrado_por_nome
      from saidas s
      join equipes e on e.id = s.equipe_id
      join bases b on b.id = e.base_id
      join usuarios u on u.id = s.registrado_por
      where (${baseId}::int is null or e.base_id = ${baseId})
        and (${equipeId}::int is null or s.equipe_id = ${equipeId})
        and (${dataInicio}::date is null or s.data >= ${dataInicio})
        and (${dataFim}::date is null or s.data <= ${dataFim})
      order by s.data desc, b.nome, e.identificador
      limit 500
    `;
    res.status(200).json(registros);
    return;
  }

  if (req.method === 'POST') {
    const session = requireAuth(req, res);
    if (!session) return;

    const { equipeId, data, horaSaida, observacao } = req.body || {};
    if (!equipeId || !data || !horaSaida) {
      res.status(400).json({ error: 'Informe equipe, data e hora de saída' });
      return;
    }

    const equipeRows = await sql`select id, base_id from equipes where id = ${equipeId}`;
    const equipe = equipeRows[0];
    if (!equipe) {
      res.status(404).json({ error: 'Equipe não encontrada' });
      return;
    }

    if (session.role === 'tecnico' && equipe.base_id !== session.baseId) {
      res.status(403).json({ error: 'Você só pode registrar saídas da sua base' });
      return;
    }

    const [registro] = await sql`
      insert into saidas (equipe_id, data, hora_saida, registrado_por, observacao)
      values (${equipeId}, ${data}, ${horaSaida}, ${session.usuarioId}, ${observacao ?? null})
      on conflict (equipe_id, data)
      do update set
        hora_saida = excluded.hora_saida,
        observacao = excluded.observacao,
        registrado_por = excluded.registrado_por,
        updated_at = now()
      returning id, equipe_id, data, hora_saida, observacao
    `;
    res.status(200).json(registro);
    return;
  }

  res.status(405).json({ error: 'Método não permitido' });
}
