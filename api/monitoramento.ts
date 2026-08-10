import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';

const LIMITE_SAIDA = '08:30:00';

function hojeBrasil(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const session = requireAuth(req, res);
  if (!session) return;

  const data = (req.query.data as string) || hojeBrasil();

  const linhas = await sql`
    select
      b.id as base_id, b.nome as base_nome,
      e.id as equipe_id, e.tipo, e.identificador,
      s.hora_saida, s.observacao, u.nome as registrado_por_nome
    from bases b
    join equipes e on e.base_id = b.id and e.ativo = true
    left join saidas s on s.equipe_id = e.id and s.data = ${data}
    left join usuarios u on u.id = s.registrado_por
    where b.ativo = true
    order by b.nome, e.tipo, e.identificador
  `;

  const basesMap = new Map<
    number,
    {
      baseId: number;
      baseNome: string;
      equipes: Array<{
        equipeId: number;
        tipo: string;
        identificador: string;
        horaSaida: string | null;
        observacao: string | null;
        registradoPor: string | null;
        status: 'no_prazo' | 'atrasado' | 'pendente';
      }>;
    }
  >();

  for (const linha of linhas) {
    if (!basesMap.has(linha.base_id)) {
      basesMap.set(linha.base_id, {
        baseId: linha.base_id,
        baseNome: linha.base_nome,
        equipes: [],
      });
    }

    const status: 'no_prazo' | 'atrasado' | 'pendente' = !linha.hora_saida
      ? 'pendente'
      : linha.hora_saida <= LIMITE_SAIDA
        ? 'no_prazo'
        : 'atrasado';

    basesMap.get(linha.base_id)!.equipes.push({
      equipeId: linha.equipe_id,
      tipo: linha.tipo,
      identificador: linha.identificador,
      horaSaida: linha.hora_saida,
      observacao: linha.observacao,
      registradoPor: linha.registrado_por_nome,
      status,
    });
  }

  res.status(200).json({
    data,
    limiteSaida: LIMITE_SAIDA.slice(0, 5),
    bases: Array.from(basesMap.values()),
  });
}
