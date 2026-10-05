export type TipoJust = 'FALTA' | 'ATRASO' | 'FOLGA_COMPENSADA' | 'FERIADO';
export type MotivoJust = 'INTERJORNADA' | 'CARREGAMENTO' | 'REUNIAO' | 'TREINAMENTO' | 'CAMINHAO_OFICINA' | 'OUTRO';

export const TIPOS_JUST: Array<{ value: TipoJust; label: string }> = [
  { value: 'FALTA', label: 'Falta' },
  { value: 'ATRASO', label: 'Atraso' },
  { value: 'FOLGA_COMPENSADA', label: 'Folga compensada' },
  { value: 'FERIADO', label: 'Feriado' },
];

export const MOTIVOS_JUST: Array<{ value: MotivoJust; label: string }> = [
  { value: 'INTERJORNADA', label: 'Interjornada' },
  { value: 'CARREGAMENTO', label: 'Carregamento' },
  { value: 'REUNIAO', label: 'Reunião' },
  { value: 'TREINAMENTO', label: 'Treinamento' },
  { value: 'CAMINHAO_OFICINA', label: 'Caminhão na oficina' },
  { value: 'OUTRO', label: 'Outro (descrever)' },
];

export function rotuloTipoJust(tipo: string | null | undefined): string {
  return TIPOS_JUST.find((t) => t.value === tipo)?.label ?? 'Justificado';
}

/** Falta e Atraso exigem um motivo; Folga compensada e Feriado já se explicam. */
export function exigeMotivo(tipo: TipoJust | null): boolean {
  return tipo === 'FALTA' || tipo === 'ATRASO';
}

const TEXTO_FALTA: Record<Exclude<MotivoJust, 'INTERJORNADA' | 'OUTRO'>, string> = {
  CARREGAMENTO: 'Equipe em carregamento',
  REUNIAO: 'Equipe em reunião',
  TREINAMENTO: 'Equipe em treinamento',
  CAMINHAO_OFICINA: 'Caminhão na oficina',
};

const TEXTO_ATRASO: Record<Exclude<MotivoJust, 'INTERJORNADA' | 'OUTRO'>, string> = {
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
  return (tipo === 'ATRASO' ? TEXTO_ATRASO : TEXTO_FALTA)[motivo];
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
