import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const session = requireAuth(req, res);
    if (!session) return;

    const bases = await sql`select id, nome, codigo, ativo from bases order by nome`;
    res.status(200).json(bases);
    return;
  }

  if (req.method === 'POST') {
    const session = requireAuth(req, res, 'admin');
    if (!session) return;

    const { nome, codigo } = req.body || {};
    if (!nome || !codigo) {
      res.status(400).json({ error: 'Informe nome e código da base' });
      return;
    }

    try {
      const [base] = await sql`
        insert into bases (nome, codigo, ativo)
        values (${nome}, ${codigo}, true)
        returning id, nome, codigo, ativo
      `;
      res.status(201).json(base);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('bases_codigo_key')) {
        res.status(409).json({ error: 'Já existe uma base com esse código' });
        return;
      }
      throw err;
    }
    return;
  }

  res.status(405).json({ error: 'Método não permitido' });
}
