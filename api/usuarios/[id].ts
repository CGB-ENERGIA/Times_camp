import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { hashPassword } from '../_lib/hash.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const session = requireAuth(req, res, 'admin');
  if (!session) return;

  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'id inválido' });
    return;
  }

  const { nome, role, supervisores, coordenadores, equipesIds, ativo, senha } = req.body || {};

  const ROLES = ['admin', 'tecnico', 'coordenador'];
  if (role !== undefined && !ROLES.includes(role)) {
    res.status(400).json({ error: `Perfil inválido. Use: ${ROLES.join(', ')}` });
    return;
  }

  const senhaHash = senha ? await hashPassword(senha) : null;

  const supervisoresArr: string[] = Array.isArray(supervisores) ? supervisores : [];
  const coordenadoresArr: string[] = Array.isArray(coordenadores) ? coordenadores : [];
  const equipesIdsArr: number[] = Array.isArray(equipesIds) ? equipesIds : [];
  const supervisorPrimario: string | null = supervisoresArr[0] ?? null;
  const coordenadorPrimario: string | null = coordenadoresArr[0] ?? null;
  const atualizarSupervisores = Array.isArray(supervisores);
  const atualizarCoordenadores = Array.isArray(coordenadores);
  const atualizarEquipesIds = Array.isArray(equipesIds);

  const RETURNING = sql`returning id, nome, usuario, role, base_id, supervisor, coordenador, supervisores, coordenadores, equipes_ids, ativo, created_at`;

  let rows;
  if (atualizarSupervisores && atualizarCoordenadores && atualizarEquipesIds) {
    rows = await sql`
      update usuarios set
        nome          = coalesce(${nome ?? null}, nome),
        role          = coalesce(${role ?? null}::user_role, role),
        supervisor    = ${supervisorPrimario},
        coordenador   = ${coordenadorPrimario},
        supervisores  = ${supervisoresArr}::text[],
        coordenadores = ${coordenadoresArr}::text[],
        equipes_ids   = ${equipesIdsArr}::integer[],
        ativo         = coalesce(${ativo ?? null}, ativo),
        senha_hash    = coalesce(${senhaHash}, senha_hash)
      where id = ${id}
      ${RETURNING}
    `;
  } else if (atualizarSupervisores && atualizarEquipesIds) {
    rows = await sql`
      update usuarios set
        nome         = coalesce(${nome ?? null}, nome),
        role         = coalesce(${role ?? null}::user_role, role),
        supervisor   = ${supervisorPrimario},
        supervisores = ${supervisoresArr}::text[],
        equipes_ids  = ${equipesIdsArr}::integer[],
        ativo        = coalesce(${ativo ?? null}, ativo),
        senha_hash   = coalesce(${senhaHash}, senha_hash)
      where id = ${id}
      ${RETURNING}
    `;
  } else if (atualizarEquipesIds) {
    rows = await sql`
      update usuarios set
        nome        = coalesce(${nome ?? null}, nome),
        role        = coalesce(${role ?? null}::user_role, role),
        equipes_ids = ${equipesIdsArr}::integer[],
        ativo       = coalesce(${ativo ?? null}, ativo),
        senha_hash  = coalesce(${senhaHash}, senha_hash)
      where id = ${id}
      ${RETURNING}
    `;
  } else if (atualizarSupervisores) {
    rows = await sql`
      update usuarios set
        nome         = coalesce(${nome ?? null}, nome),
        role         = coalesce(${role ?? null}::user_role, role),
        supervisor   = ${supervisorPrimario},
        supervisores = ${supervisoresArr}::text[],
        ativo        = coalesce(${ativo ?? null}, ativo),
        senha_hash   = coalesce(${senhaHash}, senha_hash)
      where id = ${id}
      ${RETURNING}
    `;
  } else {
    rows = await sql`
      update usuarios set
        nome       = coalesce(${nome ?? null}, nome),
        role       = coalesce(${role ?? null}::user_role, role),
        ativo      = coalesce(${ativo ?? null}, ativo),
        senha_hash = coalesce(${senhaHash}, senha_hash)
      where id = ${id}
      ${RETURNING}
    `;
  }

  if (rows.length === 0) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }

  res.status(200).json(rows[0]);
}
