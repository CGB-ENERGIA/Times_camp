import { sql } from './db.js';
import type { SessionPayload } from './auth.js';

interface EquipeAcesso {
  id: number;
  supervisor: string | null;
  coordenador: string | null;
}

/** Verifica se o usuário pode apontar/justificar a equipe, usando dados frescos do banco (o JWT pode estar desatualizado). */
export async function podeAcessarEquipe(session: SessionPayload, equipe: EquipeAcesso): Promise<{ ok: boolean; erro?: string }> {
  if (session.role === 'admin') return { ok: true };
  if (session.role === 'visualizador') return { ok: false, erro: 'Visualizadores não podem registrar' };

  const rows = await sql`
    select supervisor, coordenador, supervisores, coordenadores, equipes_ids, ativo
    from usuarios where id = ${session.usuarioId}
  `;
  const u = rows[0];
  if (!u || !u.ativo) return { ok: false, erro: 'Usuário inativo ou não encontrado' };

  if (session.role === 'tecnico') {
    const supervisores: string[] = u.supervisores?.length ? u.supervisores : u.supervisor ? [u.supervisor] : [];
    const equipesIds: number[] = u.equipes_ids ?? [];
    if (equipesIds.includes(Number(equipe.id)) || (equipe.supervisor && supervisores.includes(equipe.supervisor))) {
      return { ok: true };
    }
    return { ok: false, erro: 'Você só pode registrar equipes dos seus supervisores ou equipes atribuídas diretamente' };
  }

  if (session.role === 'coordenador') {
    const coordenadores: string[] = u.coordenadores?.length ? u.coordenadores : u.coordenador ? [u.coordenador] : [];
    if (equipe.coordenador && coordenadores.includes(equipe.coordenador)) return { ok: true };
    return { ok: false, erro: 'Você só pode registrar equipes dos seus coordenadores' };
  }

  return { ok: false, erro: 'Sem permissão' };
}
