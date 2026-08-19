import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { hashPassword } from '../_lib/hash.js';

const ROLES = ['admin', 'tecnico', 'coordenador'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = requireAuth(req, res, 'admin');
  if (!session) return;

  if (req.method === 'GET') {
    const usuarios = await sql`
      select id, nome, usuario, role, base_id, supervisor, coordenador, supervisores, coordenadores, ativo, created_at
      from usuarios
      order by nome
    `;
    res.status(200).json(usuarios);
    return;
  }

  if (req.method === 'POST') {
    const { nome, usuario, senha, role, supervisores, coordenadores } = req.body || {};
    if (!nome || !usuario || !senha || !role) {
      res.status(400).json({ error: 'Informe nome, usuário, senha e perfil' });
      return;
    }
    if (!ROLES.includes(role)) {
      res.status(400).json({ error: `Perfil inválido. Use um de: ${ROLES.join(', ')}` });
      return;
    }
    const supervisoresArr: string[] = Array.isArray(supervisores) ? supervisores : [];
    const coordenadoresArr: string[] = Array.isArray(coordenadores) ? coordenadores : [];
    if (role === 'tecnico' && supervisoresArr.length === 0) {
      res.status(400).json({ error: 'Técnico precisa estar vinculado a pelo menos um supervisor' });
      return;
    }
    if (role === 'coordenador' && coordenadoresArr.length === 0) {
      res.status(400).json({ error: 'Coordenador precisa estar vinculado a pelo menos um coordenador' });
      return;
    }
    const supervisorPrimario = supervisoresArr[0] ?? null;
    const coordenadorPrimario = coordenadoresArr[0] ?? null;

    const senhaHash = await hashPassword(senha);

    try {
      const [novo] = await sql`
        insert into usuarios (nome, usuario, senha_hash, role, supervisor, coordenador, supervisores, coordenadores, ativo)
        values (
          ${nome}, ${usuario}, ${senhaHash}, ${role},
          ${role === 'tecnico' ? supervisorPrimario : null},
          ${role === 'coordenador' ? coordenadorPrimario : null},
          ${role === 'tecnico' ? supervisoresArr : sql`'{}'::text[]`},
          ${role === 'coordenador' ? coordenadoresArr : sql`'{}'::text[]`},
          true
        )
        returning id, nome, usuario, role, base_id, supervisor, coordenador, supervisores, coordenadores, ativo, created_at
      `;
      res.status(201).json(novo);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('usuarios_usuario_key')) {
        res.status(409).json({ error: 'Já existe um usuário com esse login' });
        return;
      }
      throw err;
    }
    return;
  }

  res.status(405).json({ error: 'Método não permitido' });
}
