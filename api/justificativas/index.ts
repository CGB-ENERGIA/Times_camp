import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { podeAcessarEquipe } from '../_lib/acesso.js';

const TIPOS_JUSTIFICATIVA = ['FALTA', 'ATRASO', 'FOLGA_COMPENSADA', 'FERIADO'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;

    const data = (req.query.data as string) || null;
    const dataInicio = (req.query.dataInicio as string) || data;
    const dataFim = (req.query.dataFim as string) || data || dataInicio;
    const baseId = req.query.baseId ? Number(req.query.baseId) : null;
    const limite = Math.min(Math.max(Number(req.query.limit) || 1000, 1), 10000);

    const rows = await sql`
      select
        j.id, j.equipe_id, j.data, j.tipo, j.motivo, u.nome as registrado_por_nome, j.updated_at,
        e.identificador, e.tipo as equipe_tipo, e.base_id, b.nome as base_nome,
        e.horario_padrao_saida, e.supervisor, e.coordenador
      from justificativas j
      join usuarios u on u.id = j.registrado_por
      join equipes e on e.id = j.equipe_id
      join bases b on b.id = e.base_id
      where (${dataInicio}::date is null or j.data >= ${dataInicio})
        and (${dataFim}::date is null or j.data <= ${dataFim})
        and (${baseId}::int is null or e.base_id = ${baseId})
      order by j.data desc, b.nome, e.identificador
      limit ${limite}
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
    if (!TIPOS_JUSTIFICATIVA.includes(tipo)) {
      res.status(400).json({ error: `Tipo deve ser um de: ${TIPOS_JUSTIFICATIVA.join(', ')}` });
      return;
    }

    const equipeRows = await sql`select id, supervisor, coordenador from equipes where id = ${equipeId}`;
    const equipe = equipeRows[0];
    if (!equipe) {
      res.status(404).json({ error: 'Equipe não encontrada' });
      return;
    }

    const acesso = await podeAcessarEquipe(session, equipe as { id: number; supervisor: string | null; coordenador: string | null });
    if (!acesso.ok) {
      res.status(403).json({ error: acesso.erro });
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
