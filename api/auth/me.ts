import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }
  const session = requireAuth(req, res);
  if (!session) return;

  // Busca dados frescos do banco para refletir mudanças feitas pelo admin sem precisar de logout
  const rows = await sql`
    select id, nome, usuario, role, base_id, supervisor, coordenador,
           supervisores, coordenadores, equipes_ids, ativo
    from usuarios where id = ${session.usuarioId}
  `;
  const user = rows[0];
  if (!user || !user.ativo) {
    res.status(401).json({ error: 'Usuário inativo ou não encontrado' });
    return;
  }

  res.status(200).json({
    id: user.id,
    usuario: user.usuario,
    nome: user.nome,
    role: user.role,
    baseId: user.base_id,
    supervisor: user.supervisor,
    coordenador: user.coordenador,
    supervisores: user.supervisores ?? [],
    coordenadores: user.coordenadores ?? [],
    equipesIds: user.equipes_ids ?? [],
  });
}
