export type TipoJust = 'FALTA' | 'ATRASO' | 'FOLGA_COMPENSADA' | 'FERIADO';
export type MotivoJust =
  | 'INTERJORNADA'
  | 'PESSOAL_INSUFICIENTE'
  | 'CARREGAMENTO'
  | 'REUNIAO'
  | 'TREINAMENTO'
  | 'CAMINHAO_OFICINA'
  | 'OUTRO';

export const TIPOS_JUST: Array<{ value: TipoJust; label: string }> = [
  { value: 'FALTA', label: 'Falta' },
  { value: 'ATRASO', label: 'Atraso' },
  { value: 'FOLGA_COMPENSADA', label: 'Folga compensada' },
  { value: 'FERIADO', label: 'Feriado' },
];

const ROTULOS_MOTIVO: Record<MotivoJust, string> = {
  INTERJORNADA: 'Interjornada',
  PESSOAL_INSUFICIENTE: 'Pessoal insuficiente',
  CARREGAMENTO: 'Carregamento',
  REUNIAO: 'Reunião',
  TREINAMENTO: 'Treinamento',
  CAMINHAO_OFICINA: 'Caminhão na oficina',
  OUTRO: 'Outro (descrever)',
};

const MOTIVOS_POR_TIPO: Record<'FALTA' | 'ATRASO', MotivoJust[]> = {
  FALTA: ['INTERJORNADA', 'PESSOAL_INSUFICIENTE', 'TREINAMENTO', 'OUTRO'],
  ATRASO: ['INTERJORNADA', 'CARREGAMENTO', 'REUNIAO', 'TREINAMENTO', 'CAMINHAO_OFICINA', 'OUTRO'],
};

/** Motivos permitidos para o tipo (vazio quando o tipo não pede motivo). */
export function motivosPorTipo(tipo: TipoJust | null): Array<{ value: MotivoJust; label: string }> {
  if (tipo !== 'FALTA' && tipo !== 'ATRASO') return [];
  return MOTIVOS_POR_TIPO[tipo].map((value) => ({ value, label: ROTULOS_MOTIVO[value] }));
}

export function rotuloTipoJust(tipo: string | null | undefined): string {
  return TIPOS_JUST.find((t) => t.value === tipo)?.label ?? 'Justificado';
}

/** Falta e Atraso exigem um motivo; Folga compensada e Feriado já se explicam. */
export function exigeMotivo(tipo: TipoJust | null): boolean {
  return tipo === 'FALTA' || tipo === 'ATRASO';
}

type MotivoFixo = Exclude<MotivoJust, 'INTERJORNADA' | 'OUTRO'>;

const TEXTO_FALTA: Partial<Record<MotivoFixo, string>> = {
  PESSOAL_INSUFICIENTE: 'Pessoal insuficiente',
  TREINAMENTO: 'Equipe em treinamento',
};

const TEXTO_ATRASO: Partial<Record<MotivoFixo, string>> = {
  CARREGAMENTO: 'Atraso no carregamento',
  REUNIAO: 'Atraso por reunião',
  TREINAMENTO: 'Atraso por treinamento',
  CAMINHAO_OFICINA: 'Atraso por caminhão na oficina',
};

/** Texto final gravado em `motivo`; retorna '' enquanto os dados estiverem incompletos. */
export function montarJustificativa(
  tipo: TipoJust | null,
  motivo: MotivoJust | null,
  inc: string,
  outro: string,
): string {
  if (!tipo) return '';
  if (tipo === 'FOLGA_COMPENSADA') return 'Folga compensada';
  if (tipo === 'FERIADO') return 'Feriado';
  if (!motivo) return '';
  if (motivo === 'OUTRO') return outro.trim();
  if (motivo === 'INTERJORNADA') {
    const numero = inc.replace(/\D/g, '');
    if (!numero) return '';
    return tipo === 'ATRASO' ? `Atraso por interjornada INC - ${numero}` : `Interjornada INC - ${numero}`;
  }
  if (!motivosPorTipo(tipo).some((m) => m.value === motivo)) return '';
  return (tipo === 'ATRASO' ? TEXTO_ATRASO : TEXTO_FALTA)[motivo] ?? '';
}

/** Texto para exibição: evita repetir o tipo quando o motivo já o contém ("Atraso: Atraso no carregamento"). */
export function resumoJust(tipo: string | null | undefined, motivo: string | null | undefined): string {
  const m = (motivo ?? '').trim();
  const rotulo = rotuloTipoJust(tipo);
  if (tipo === 'FOLGA_COMPENSADA' || tipo === 'FERIADO') return rotulo;
  if (!m) return rotulo;
  if (m.toLowerCase().startsWith(rotulo.toLowerCase())) return m;
  return `${rotulo}: ${m}`;
}
