import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { verifyPassword } from '../_lib/hash.js';
import { signSession, setSessionCookie } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const { usuario, senha } = req.body || {};
  if (!usuario || !senha) {
    res.status(400).json({ error: 'Informe usuário e senha' });
    return;
  }

  const rows = await sql`
    select id, nome, usuario, senha_hash, role, base_id, supervisor, coordenador, supervisores, coordenadores, equipes_ids, ativo
    from usuarios
    where usuario = ${usuario}
  `;

  const user = rows[0];
  if (!user || !user.ativo) {
    res.status(401).json({ error: 'Usuário ou senha inválidos' });
    return;
  }

  const senhaOk = await verifyPassword(senha, user.senha_hash);
  if (!senhaOk) {
    res.status(401).json({ error: 'Usuário ou senha inválidos' });
    return;
  }

  const token = signSession({
    usuarioId: user.id,
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
  setSessionCookie(res, token);

  res.status(200).json({
    id: user.id,
    nome: user.nome,
    usuario: user.usuario,
    role: user.role,
    baseId: user.base_id,
    supervisor: user.supervisor,
    coordenador: user.coordenador,
  });
}
