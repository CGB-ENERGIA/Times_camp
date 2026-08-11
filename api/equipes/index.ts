import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

const TIPOS = ['GERE', 'GOMAN', 'GSTC'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;

    const baseId = req.query.baseId ? Number(req.query.baseId) : null;
    const equipes = baseId
      ? await sql`
          select id, base_id, tipo, identificador, horario_padrao_saida, supervisor, coordenador, ativo
          from equipes
          where base_id = ${baseId}
          order by tipo, identificador
        `
      : await sql`
          select id, base_id, tipo, identificador, horario_padrao_saida, supervisor, coordenador, ativo
          from equipes
          order by base_id, tipo, identificador
        `;
    res.status(200).json(equipes);
    return;
  }

  if (req.method === 'POST') {
    const session = requireAuth(req, res, 'admin');
    if (!session) return;

    const { baseId, tipo, identificador, horarioPadrao, supervisor, coordenador } = req.body || {};
    if (!baseId || !tipo || !identificador) {
      res.status(400).json({ error: 'Informe base, tipo e identificador da equipe' });
      return;
    }
    if (!TIPOS.includes(tipo)) {
      res.status(400).json({ error: `Tipo inválido. Use um de: ${TIPOS.join(', ')}` });
      return;
    }

    try {
      const [equipe] = await sql`
        insert into equipes (base_id, tipo, identificador, horario_padrao_saida, supervisor, coordenador, ativo)
        values (${baseId}, ${tipo}, ${identificador}, ${horarioPadrao || '08:30'}, ${supervisor || null}, ${coordenador || null}, true)
        returning id, base_id, tipo, identificador, horario_padrao_saida, supervisor, coordenador, ativo
      `;
      res.status(201).json(equipe);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('equipes_base_id_identificador_key')) {
        res.status(409).json({ error: 'Já existe uma equipe com esse identificador nessa base' });
        return;
      }
      throw err;
    }
    return;
  }

  res.status(405).json({ error: 'Método não permitido' });
}
