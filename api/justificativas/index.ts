import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;

    const data = (req.query.data as string) || null;
    const dataInicio = (req.query.dataInicio as string) || null;
    const dataFim = (req.query.dataFim as string) || null;

    if (!data && !dataInicio) {
      res.status(400).json({ error: 'Informe a data ou dataInicio' });
      return;
    }

    const rows = dataInicio
      ? await sql`
          select j.id, j.equipe_id, j.data, j.tipo, j.motivo, u.nome as registrado_por_nome, j.updated_at
          from justificativas j
          join usuarios u on u.id = j.registrado_por
          where j.data >= ${dataInicio} and j.data <= ${dataFim ?? dataInicio}
          order by j.data desc, j.updated_at desc
        `
      : await sql`
          select j.id, j.equipe_id, j.data, j.tipo, j.motivo, u.nome as registrado_por_nome, j.updated_at
          from justificativas j
          join usuarios u on u.id = j.registrado_por
          where j.data = ${data}
          order by j.updated_at desc
        `;
    res.status(200).json(rows);
    return;
  }

  if (req.method === 'POST') {
    const session = requireAuth(req, res);
    if (!session) return;

    if (session.role === 'visualizador') {
      res.status(403).json({ error: 'Visualizadores não podem registrar justificativas' });
      return;
    }

    const { equipeId, data, tipo, motivo } = req.body || {};
    if (!equipeId || !data || !tipo || !motivo?.trim()) {
      res.status(400).json({ error: 'Informe equipe, data, tipo e motivo' });
      return;
    }
    if (!['FALTA', 'ATRASO'].includes(tipo)) {
      res.status(400).json({ error: 'Tipo deve ser FALTA ou ATRASO' });
      return;
    }

    const equipeRows = await sql`select id, supervisor, coordenador from equipes where id = ${equipeId}`;
    const equipe = equipeRows[0];
    if (!equipe) {
      res.status(404).json({ error: 'Equipe não encontrada' });
      return;
    }

    if (session.role === 'tecnico' && (!session.supervisor || equipe.supervisor !== session.supervisor)) {
      res.status(403).json({ error: 'Você só pode justificar equipes do seu supervisor' });
      return;
    }

    if (session.role === 'coordenador' && (!session.coordenador || equipe.coordenador !== session.coordenador)) {
      res.status(403).json({ error: 'Você só pode justificar equipes do seu coordenador' });
      return;
    }

    const [registro] = await sql`
      insert into justificativas (equipe_id, data, tipo, motivo, registrado_por)
      values (${equipeId}, ${data}, ${tipo}, ${motivo.trim()}, ${session.usuarioId})
      on conflict (equipe_id, data)
      do update set
        tipo = excluded.tipo,
        motivo = excluded.motivo,
        registrado_por = excluded.registrado_por,
        updated_at = now()
      returning id, equipe_id, data, tipo, motivo
    `;
    res.status(200).json(registro);
    return;
  }

  if (req.method === 'DELETE') {
    const session = requireAuth(req, res);
    if (!session) return;

    if (session.role !== 'admin') {
      res.status(403).json({ error: 'Apenas admins podem remover justificativas' });
      return;
    }

    const { equipeId, data } = req.body || {};
    await sql`delete from justificativas where equipe_id = ${equipeId} and data = ${data}`;
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Método não permitido' });
}
