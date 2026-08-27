<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-gutter-md q-mb-md">
      <div class="text-h6">Monitoramento de Saída</div>
      <q-space />
      <q-input v-model="data" type="date" dense filled style="width: 170px" @update:model-value="carregarManual" />
      <q-btn round dense flat icon="refresh" :loading="carregando" @click="carregarManual" />
      <q-btn
        v-if="todasEquipes.length > 0"
        unelevated
        color="primary"
        icon="ios_share"
        label="Divulgar"
        :loading="exportandoResumo"
        @click="exportarResumo"
      >
        <q-tooltip>Gerar imagem resumo para WhatsApp (status + médias + pendentes)</q-tooltip>
      </q-btn>
    </div>

    <div v-if="todasEquipes.length > 0" ref="conteudoEl">
      <!-- Chips de status: dobram como legenda (ícone + texto, nunca só cor) e como filtro -->
      <div class="row q-gutter-sm q-mb-sm">
        <q-chip
          clickable square
          :outline="!statusFiltro.includes('pendente')"
          color="grey-7"
          :text-color="statusFiltro.includes('pendente') ? 'white' : 'grey-7'"
          icon="schedule"
          @click="alternarStatus('pendente')"
        >{{ statsAnim.pendente }} pendente(s)</q-chip>
        <q-chip
          clickable square
          :outline="!statusFiltro.includes('no_prazo')"
          color="positive"
          :text-color="statusFiltro.includes('no_prazo') ? 'white' : 'positive'"
          icon="check_circle"
          @click="alternarStatus('no_prazo')"
        >{{ statsAnim.no_prazo }} no prazo</q-chip>
        <q-chip
          clickable square
          :outline="!statusFiltro.includes('atrasado')"
          color="negative"
          :text-color="statusFiltro.includes('atrasado') ? 'white' : 'negative'"
          icon="warning"
          @click="alternarStatus('atrasado')"
        >{{ statsAnim.atrasado }} atrasada(s)</q-chip>
        <q-chip
          clickable square
          :outline="!statusFiltro.includes('justificado')"
          color="info"
          :text-color="statusFiltro.includes('justificado') ? 'white' : 'info'"
          icon="description"
          @click="alternarStatus('justificado')"
        >{{ statsAnim.justificado }} justificada(s)</q-chip>

        <q-space />

        <q-input
          v-model="busca"
          dense
          filled
          clearable
          debounce="150"
          placeholder="Buscar equipe..."
          style="min-width: 200px"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>

        <q-select
          v-model="baseFiltro"
          :options="opcoesBase"
          multiple
          emit-value
          map-options
          dense
          filled
          clearable
          label="Base"
          style="min-width: 160px"
        />

        <q-select
          v-model="tipoFiltro"
          :options="tipos"
          multiple
          use-chips
          dense
          filled
          label="Tipo"
          style="min-width: 140px"
          @update:model-value="(v) => (tipoFiltro = v ?? [])"
        />

        <q-select
          v-model="supervisorFiltro"
          :options="opcoesSupervisor"
          multiple
          use-chips
          dense
          filled
          label="Supervisor"
          style="min-width: 160px"
          @update:model-value="(v) => (supervisorFiltro = v ?? [])"
        />

        <q-select
          v-model="coordenadorFiltro"
          :options="opcoesCoordenador"
          multiple
          use-chips
          dense
          filled
          label="Coordenador"
          style="min-width: 160px"
          @update:model-value="(v) => (coordenadorFiltro = v ?? [])"
        />

        <q-btn v-if="temFiltroAtivo" flat dense label="Limpar filtros" @click="limparFiltros" />
        <q-btn
          flat dense round icon="share"
          :loading="exportandoPendentes"
          @click="exportarPendentes"
        >
          <q-tooltip>Baixar imagem dos pendentes para WhatsApp</q-tooltip>
        </q-btn>
      </div>

      <q-card flat bordered class="q-mb-md" ref="graficoCardEl">
        <q-card-section class="row items-center q-gutter-sm">
          <div class="text-subtitle2">{{ tituloGrafico }}</div>
          <div class="text-caption text-grey-6">{{ data }}</div>
          <q-space />
          <div class="row items-center q-gutter-sm" :class="{ 'export-oculto': exportando }">
            <q-btn-toggle
              v-model="visaoGrafico"
              dense
              no-caps
              unelevated
              toggle-color="primary"
              color="grey-9"
              :options="[
                { label: 'Por base', value: 'base', icon: 'bar_chart' },
                { label: 'Atrasos', value: 'atraso', icon: 'warning' },
                { label: 'Horários', value: 'heatmap', icon: 'grid_on' },
              ]"
            />
            <q-btn
              flat
              dense
              round
              icon="ios_share"
              :loading="exportando"
              @click="exportarGrafico"
            >
              <q-tooltip>Baixar imagem (para enviar no WhatsApp)</q-tooltip>
            </q-btn>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section ref="graficoSecaoEl">
          <Bar v-if="visaoGrafico === 'base'" :data="dadosGraficoBase" :options="opcoesGraficoBase" :plugins="[stackedLabelPlugin]" style="height: 380px" />

          <template v-else-if="visaoGrafico === 'atraso'">
            <Bar
              v-if="atrasos.length > 0"
              :data="dadosGraficoAtraso"
              :options="opcoesGraficoAtraso"
              :style="{ height: `${Math.max(160, atrasos.length * 30)}px` }"
            />
            <div v-else class="text-grey-6 text-center q-pa-lg">
              <q-icon name="check_circle" size="32px" color="positive" />
              <div class="q-mt-sm">Nenhuma equipe atrasada com esses filtros.</div>
            </div>
            <div v-if="atrasosTruncados > 0" class="text-caption text-grey-6 text-center q-mt-sm">
              +{{ atrasosTruncados }} outra(s) equipe(s) atrasada(s) não exibida(s) no gráfico (veja na tabela)
            </div>
          </template>

          <template v-else>
            <div v-if="linhasHeatmap.length === 0" class="text-grey-6 text-center q-pa-lg">
              Nenhuma saída registrada ainda com esses filtros.
            </div>
            <div v-else class="heatmap-wrap">
              <table class="heatmap-table">
                <thead>
                  <tr>
                    <th class="heatmap-corner">Base</th>
                    <th
                      v-for="col in colunasHeatmap"
                      :key="col.minutos"
                      class="heatmap-col-header"
                      :class="{ 'heatmap-limite': col.ehLimite }"
                    >
                      {{ col.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="linha in linhasHeatmap" :key="linha.baseNome">
                    <th class="heatmap-row-header">{{ linha.baseNome }}</th>
                    <td
                      v-for="col in colunasHeatmap"
                      :key="col.minutos"
                      class="heatmap-cell"
                      :class="{ 'heatmap-limite': col.ehLimite }"
                      :style="{ background: corCelulaHeatmap(linha.porBucket[col.minutos] ?? 0) }"
                      :title="`${linha.baseNome} · ${col.label}: ${linha.porBucket[col.minutos] ?? 0} equipe(s)`"
                    >
                      {{ linha.porBucket[col.minutos] || '' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="row items-center q-gutter-sm q-mt-md">
              <div class="text-caption text-grey-6">Menos saídas</div>
              <div class="heatmap-legend-bar" />
              <div class="text-caption text-grey-6">Mais saídas</div>
              <q-space />
              <div class="text-caption text-grey-6">
                <span class="heatmap-limite-swatch" /> = coluna do limite padrão (08:30)
              </div>
            </div>
          </template>
        </q-card-section>
      </q-card>

      <!-- Gráfico: média de saída por base -->
      <q-card flat bordered class="q-mb-md" ref="mediaCardEl">
        <q-card-section class="row items-center q-gutter-sm">
          <div class="text-subtitle2">Média de saída por base</div>
          <div class="text-caption text-grey-6">{{ data }} · apenas equipes com saída registrada</div>
          <q-space />
          <q-btn flat dense round icon="ios_share" :loading="exportandoMedia" @click="exportarMedia">
            <q-tooltip>Baixar imagem para WhatsApp</q-tooltip>
          </q-btn>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <Bar
            v-if="rowsFiltradas.some(r => r.horaSaida)"
            :data="dadosGraficoMedia"
            :options="opcoesGraficoMedia"
            :plugins="[mediaLabelPlugin]"
            style="height: 300px"
          />
          <div v-else class="text-grey-6 text-center q-pa-lg">Nenhuma saída registrada ainda com esses filtros.</div>
        </q-card-section>
      </q-card>

      <!-- Card: Expurgos da média -->
      <q-card v-if="expurgosPorBase.length" flat bordered class="q-mb-md">
        <q-card-section class="row items-center q-gutter-sm">
          <q-icon name="filter_alt" color="amber-8" />
          <div class="text-subtitle2">Expurgos aplicados à média</div>
          <div class="text-caption text-grey-6">Menor e maior horário removidos de cada base (mínimo 3 registros)</div>
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pa-sm">
          <q-markup-table flat dense separator="horizontal">
            <thead>
              <tr class="text-grey-7 text-caption">
                <th class="text-left">Base</th>
                <th class="text-left">Removido mínimo</th>
                <th class="text-left">Removido máximo</th>
                <th class="text-center">Usadas / Total</th>
                <th class="text-right">Média ajustada</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in expurgosPorBase" :key="b.baseNome">
                <td class="text-weight-medium">{{ b.baseNome }}</td>
                <td>
                  <q-chip v-if="b.expMin" dense square size="sm" color="blue-grey-2" text-color="blue-grey-9" icon="arrow_downward">
                    {{ b.expMin.identificador }} · {{ b.expMin.horaSaida?.slice(0,5) }}
                  </q-chip>
                </td>
                <td>
                  <q-chip v-if="b.expMax" dense square size="sm" color="deep-orange-2" text-color="deep-orange-9" icon="arrow_upward">
                    {{ b.expMax.identificador }} · {{ b.expMax.horaSaida?.slice(0,5) }}
                  </q-chip>
                </td>
                <td class="text-center text-caption text-grey-7">{{ b.count }} / {{ b.total }}</td>
                <td class="text-right text-weight-bold" :class="b.media !== null && b.media <= 510 ? 'text-positive' : 'text-negative'">
                  {{ b.media !== null ? formatarMinutos(b.media) : '—' }}
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-card-section>
      </q-card>

      <!-- Gráfico: detalhe de equipes por base -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section class="row items-center q-gutter-sm">
          <div class="text-subtitle2">Equipes por base — detalhe</div>
          <div class="text-caption text-grey-6">{{ data }}</div>
          <q-space />
          <q-btn flat dense round icon="ios_share" :loading="exportandoDetalhe" @click="exportarDetalhe">
            <q-tooltip>Exportar detalhamento por base</q-tooltip>
          </q-btn>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div v-for="base in equipesPorBase" :key="base.baseNome" class="q-mb-md">
            <div class="row items-center q-gutter-xs q-mb-xs">
              <span class="text-subtitle2">{{ base.baseNome }}</span>
              <q-badge color="positive" :label="`${base.stats.no_prazo} no prazo`" />
              <q-badge v-if="base.stats.atrasado > 0" color="negative" :label="`${base.stats.atrasado} atrasada(s)`" />
              <q-badge v-if="base.stats.justificado > 0" color="info" :label="`${base.stats.justificado} justificada(s)`" />
              <q-badge v-if="base.stats.pendente > 0" color="grey-6" :label="`${base.stats.pendente} pendente(s)`" />
            </div>
            <div class="row q-gutter-xs">
              <div
                v-for="eq in base.equipes"
                :key="eq.equipeId"
                class="equipe-chip"
                :style="{ borderColor: CORES[eq.status], background: `${CORES[eq.status]}22` }"
                :title="`${eq.identificador} · ${eq.horaSaida ? eq.horaSaida.slice(0,5) : labelStatus(eq.status)}${eq.atrasoMin ? ` · +${eq.atrasoMin}min` : ''}`"
              >
                <span class="equipe-chip-id" :style="{ color: CORES[eq.status] }">{{ eq.identificador }}</span>
                <span v-if="eq.horaSaida" class="equipe-chip-time">{{ eq.horaSaida.slice(0, 5) }}</span>
                <span v-if="eq.atrasoMin" class="equipe-chip-atraso">+{{ eq.atrasoMin }}m</span>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Mapa histórico de saídas (equipes × dias) -->
      <q-card flat bordered class="q-mb-md" ref="mapaCardEl">
        <q-card-section class="row items-center q-gutter-sm">
          <div class="text-subtitle2">Mapa histórico de saídas</div>
          <q-space />
          <q-btn-toggle
            v-model="diasMapa"
            dense no-caps unelevated
            toggle-color="primary"
            color="grey-9"
            text-color="white"
            :options="[
              { label: '7d', value: 7 },
              { label: '14d', value: 14 },
              { label: '30d', value: 30 },
            ]"
            @update:model-value="carregarMapa"
          />
          <q-btn flat dense round icon="refresh" :loading="carregandoMapa" @click="carregarMapa">
            <q-tooltip>Recarregar mapa</q-tooltip>
          </q-btn>
          <q-btn flat dense round icon="ios_share" :loading="exportandoMapa" @click="exportarMapa">
            <q-tooltip>Baixar imagem para WhatsApp</q-tooltip>
          </q-btn>
        </q-card-section>
        <q-separator />
        <q-card-section class="q-pa-sm">
          <div v-if="carregandoMapa" class="text-center q-pa-lg">
            <q-spinner color="primary" size="32px" />
          </div>
          <div v-else-if="!mapaCarregado" class="text-grey-6 text-center q-pa-lg">
            Selecione o período e clique em <q-icon name="refresh" /> para carregar o mapa.
          </div>
          <div v-else-if="mapaGrid.length === 0" class="text-grey-6 text-center q-pa-lg">
            Nenhum dado com os filtros atuais.
          </div>
          <div v-else class="mapa-wrap">
            <table class="mapa-table">
              <thead>
                <tr>
                  <th class="mapa-prefixo-th">Prefixo</th>
                  <th
                    v-for="dia in datasMapaRange"
                    :key="dia"
                    class="mapa-dia-th"
                    :title="dia"
                  >{{ diaLabel(dia) }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in mapaGrid" :key="row.equipeId">
                  <td class="mapa-prefixo-cell">{{ row.identificador }}</td>
                  <td
                    v-for="(cel, i) in row.celulas"
                    :key="i"
                    class="mapa-celula"
                    :class="`mapa-status-${cel.status}`"
                  >
                    <span v-if="cel.status === 'ausente'" class="mapa-ausente-txt">AUS</span>
                    <span v-else-if="cel.hora">{{ cel.hora }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </q-card-section>
        <q-card-section v-if="mapaCarregado && !carregandoMapa" class="q-pt-none">
          <div class="row q-gutter-sm items-center text-caption text-grey-6">
            <span><span class="mapa-legenda-dot" style="background:#0ca30c" /> No prazo</span>
            <span><span class="mapa-legenda-dot" style="background:#d03b3b" /> Atrasado</span>
            <span><span class="mapa-legenda-dot" style="background:#e65100" /> Ausente (FALTA)</span>
            <span><span class="mapa-legenda-dot" style="background:rgba(128,128,128,0.15);border:1px solid #ccc" /> Sem registro</span>
            <q-space />
            <span class="text-grey-6">{{ datasMapaRange[0] }} → {{ datasMapaRange[datasMapaRange.length - 1] }}</span>
          </div>
        </q-card-section>
      </q-card>

      <q-table
        :rows="rowsFiltradas"
        :columns="colunas"
        row-key="equipeId"
        flat
        bordered
        :pagination="{ rowsPerPage: 15, sortBy: 'status' }"
      >
        <template #body="props">
          <q-tr :props="props" :class="`row-${props.row.status}`">
            <q-td key="baseNome" :props="props">{{ props.row.baseNome }}</q-td>
            <q-td key="identificador" :props="props">{{ props.row.identificador }}</q-td>
            <q-td key="tipo" :props="props">
              <q-badge outline color="grey-6" :label="props.row.tipo" />
            </q-td>
            <q-td key="supervisor" :props="props">{{ props.row.supervisor || '—' }}</q-td>
            <q-td key="coordenador" :props="props">{{ props.row.coordenador || '—' }}</q-td>
            <q-td key="horario" :props="props">
              <span v-if="props.row.horaSaida">{{ props.row.horaSaida.slice(0, 5) }}</span>
              <span v-else class="text-grey-6">—</span>
              <span class="text-grey-6"> · limite {{ props.row.horarioPadrao.slice(0, 5) }}</span>
            </q-td>
            <q-td key="atraso" :props="props">
              <span v-if="props.row.atrasoMin !== null" class="text-negative">{{ props.row.atrasoMin }} min</span>
              <span v-else class="text-grey-6">—</span>
            </q-td>
            <q-td key="status" :props="props">
              <q-badge :style="{ background: corStatus(props.row.status) }" :label="labelStatus(props.row.status)" />
            </q-td>
          </q-tr>
        </template>

        <template #no-data>
          <div class="full-width text-center text-grey-6 q-pa-lg">Nenhuma equipe encontrada com esses filtros.</div>
        </template>
      </q-table>
    </div>

    <div v-else-if="!carregando" class="text-grey-6 q-mt-xl text-center">Nenhuma base cadastrada ainda.</div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import type { QTableColumn } from 'quasar';
import { Chart as ChartJS, registerables, type ChartData, type ChartOptions } from 'chart.js';
import { Bar } from 'vue-chartjs';
import gsap from 'gsap';
import html2canvas from 'html2canvas';
import { api } from '@/boot/axios';
import { hojeStr } from '@/utils/date';

ChartJS.register(...registerables);

type Status = 'no_prazo' | 'atrasado' | 'pendente' | 'justificado';

// Paleta de status (verde/vermelho validados para contraste; cinza = neutro,
// não é um "alerta"). Nunca usada sozinha — sempre junto de ícone + texto.
const CORES: Record<Status, string> = {
  no_prazo: '#0ca30c',
  atrasado: '#d03b3b',
  pendente: '#757575',
  justificado: '#0891b2',
};

interface EquipeStatus {
  equipeId: number;
  tipo: string;
  identificador: string;
  horarioPadrao: string;
  supervisor: string | null;
  coordenador: string | null;
  horaSaida: string | null;
  observacao: string | null;
  registradoPor: string | null;
  status: Status;
}

interface BaseStatus {
  baseId: number;
  baseNome: string;
  equipes: EquipeStatus[];
}

interface MonitoramentoResponse {
  data: string;
  bases: BaseStatus[];
}

interface Row extends EquipeStatus {
  baseId: number;
  baseNome: string;
  atrasoMin: number | null;
}

const tipos = ['GERE', 'GOMAN', 'GSTC'];
const $q = useQuasar();

const data = ref(hojeStr());
const resposta = ref<MonitoramentoResponse | null>(null);
const carregando = ref(false);
const conteudoEl = ref<HTMLElement | null>(null);
const graficoSecaoEl = ref<{ $el: HTMLElement } | null>(null);
const graficoCardEl = ref<{ $el: HTMLElement } | null>(null);
const exportando = ref(false);
const mediaCardEl = ref<{ $el: HTMLElement } | null>(null);
const mapaCardEl = ref<{ $el: HTMLElement } | null>(null);
const exportandoMedia = ref(false);
const exportandoMapa = ref(false);
const exportandoPendentes = ref(false);
const exportandoResumo = ref(false);
const exportandoDetalhe = ref(false);

const busca = ref('');
const baseFiltro = ref<number[]>([]);
const tipoFiltro = ref<string[]>([]);
const supervisorFiltro = ref<string[]>([]);
const coordenadorFiltro = ref<string[]>([]);
const statusFiltro = ref<Status[]>([]);
const visaoGrafico = ref<'base' | 'atraso' | 'heatmap'>('base');

// ---- Mapa histórico ----
interface SaidaMapa { equipe_id: number; data: string; hora_saida: string }
interface JustMapa { equipe_id: number; data: string; tipo: string }
const diasMapa = ref<7 | 14 | 30>(7);
const saidasMapa = ref<SaidaMapa[]>([]);
const justMapa = ref<JustMapa[]>([]);
const carregandoMapa = ref(false);
const mapaCarregado = ref(false);

const datasMapaRange = computed<string[]>(() => {
  const dias: string[] = [];
  for (let i = diasMapa.value - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dias.push(d.toISOString().slice(0, 10));
  }
  return dias;
});

function diaLabel(iso: string): string {
  // "YYYY-MM-DD" → "DD/MM"
  return `${iso.slice(8)}/${iso.slice(5, 7)}`;
}

type CelulaStatus = 'no_prazo' | 'atrasado' | 'ausente' | 'vazio';
interface CelulaMapa { hora: string | null; status: CelulaStatus }
interface LinhaMapa extends Row { celulas: CelulaMapa[] }

const mapaGrid = computed<LinhaMapa[]>(() => {
  if (!mapaCarregado.value) return [];
  const dias = datasMapaRange.value;
  const saidaMap = new Map<string, string>();
  const justMap = new Map<string, string>();
  for (const s of saidasMapa.value) {
    saidaMap.set(`${s.equipe_id}-${s.data}`, s.hora_saida);
  }
  for (const j of justMapa.value) {
    const k = `${j.equipe_id}-${j.data}`;
    if (!justMap.has(k)) justMap.set(k, j.tipo);
  }
  return rowsFiltradas.value.map((eq) => ({
    ...eq,
    celulas: dias.map((dia) => {
      const hora = saidaMap.get(`${eq.equipeId}-${dia}`) ?? null;
      const just = justMap.get(`${eq.equipeId}-${dia}`) ?? null;
      let status: CelulaStatus;
      if (hora) {
        status = toMinutos(hora) <= toMinutos(eq.horarioPadrao) ? 'no_prazo' : 'atrasado';
      } else if (just === 'FALTA') {
        status = 'ausente';
      } else {
        status = 'vazio';
      }
      return { hora: hora ? hora.slice(0, 5) : null, status };
    }),
  }));
});

// Plugin: mostra o valor numérico em cada segmento das barras empilhadas (Status por base)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stackedLabelPlugin: any = {
  id: 'stackedLabels',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta.hidden) return;
      meta.data.forEach((bar: any, i: number) => {
        const value = dataset.data[i] as number;
        if (!value || value <= 0) return;
        const barHeight = Math.abs(bar.base - bar.y);
        if (barHeight < 16) return;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${barHeight > 28 ? 13 : 11}px sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.fillText(String(value), bar.x, bar.y + barHeight / 2);
        ctx.restore();
      });
    });
  },
};

// Plugin: mostra a média de saída (HH:MM) acima de cada barra + contagem de equipes dentro
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mediaLabelPlugin: any = {
  id: 'mediaLabels',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;
    const dataset = chart.data.datasets[0];
    if (!dataset) return;
    const meta = chart.getDatasetMeta(0);
    if (meta.hidden) return;
    const corTexto = getComputedStyle(chart.canvas).color || '#333';
    meta.data.forEach((bar: any, i: number) => {
      const value = dataset.data[i];
      if (value === null || value === undefined) return;
      const timeLabel = formatarMinutos(value as number);
      const count: number = dataset.counts?.[i] ?? 0;
      const barHeight = Math.abs(bar.base - bar.y);

      ctx.save();
      ctx.textAlign = 'center';

      // Tempo acima da barra
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = corTexto;
      ctx.textBaseline = 'bottom';
      ctx.fillText(timeLabel, bar.x, bar.y - 6);

      // Contagem dentro da barra (se houver espaço)
      if (count > 0 && barHeight > 32) {
        ctx.font = '11px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.textBaseline = 'top';
        ctx.fillText(`${count} equipe${count !== 1 ? 's' : ''}`, bar.x, bar.y + 6);
      }

      ctx.restore();
    });
  },
};

async function carregarMapa() {
  if (carregandoMapa.value) return;
  carregandoMapa.value = true;
  try {
    const dataInicio = datasMapaRange.value[0];
    const dataFim = datasMapaRange.value[datasMapaRange.value.length - 1];
    const [{ data: saidas }, { data: justs }] = await Promise.all([
      api.get<SaidaMapa[]>('/saidas', { params: { dataInicio, dataFim, limit: 10000 } }),
      api.get<JustMapa[]>('/justificativas', { params: { dataInicio, dataFim } }),
    ]);
    saidasMapa.value = saidas;
    justMapa.value = justs;
    mapaCarregado.value = true;
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao carregar mapa histórico' });
  } finally {
    carregandoMapa.value = false;
  }
}

const tituloGrafico = computed(
  () =>
    ({
      base: 'Status por base',
      atraso: 'Atrasos (minutos após o limite)',
      heatmap: 'Horários de saída por base',
    })[visaoGrafico.value],
);

function toMinutos(hhmmss: string): number {
  const [h, m] = hhmmss.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

type Linha = typeof todasLinhas.value[0];
type ResultadoMedia = { media: number | null; count: number; expMin: Linha | null; expMax: Linha | null };

function calcMediaAjustada(saidas: Linha[]): ResultadoMedia {
  if (!saidas.length) return { media: null, count: 0, expMin: null, expMax: null };
  const sorted = [...saidas].sort((a, b) => toMinutos(a.horaSaida!) - toMinutos(b.horaSaida!));
  if (sorted.length <= 2) {
    const soma = sorted.reduce((a, r) => a + toMinutos(r.horaSaida!), 0);
    return { media: Math.round(soma / sorted.length), count: sorted.length, expMin: null, expMax: null };
  }
  const expMin = sorted[0]!;
  const expMax = sorted[sorted.length - 1]!;
  const restantes = sorted.slice(1, -1);
  const soma = restantes.reduce((a, r) => a + toMinutos(r.horaSaida!), 0);
  return { media: Math.round(soma / restantes.length), count: restantes.length, expMin, expMax };
}

const todasEquipes = computed(() => resposta.value?.bases.flatMap((b) => b.equipes) ?? []);

const opcoesBase = computed(() => (resposta.value?.bases ?? []).map((b) => ({ label: b.baseNome, value: b.baseId })));

const opcoesSupervisor = computed(() =>
  [...new Set(todasEquipes.value.map((e) => e.supervisor).filter((v): v is string => !!v))].sort(),
);
const opcoesCoordenador = computed(() =>
  [...new Set(todasEquipes.value.map((e) => e.coordenador).filter((v): v is string => !!v))].sort(),
);

const todasLinhas = computed<Row[]>(() => {
  const bases = resposta.value?.bases ?? [];
  const linhas: Row[] = [];
  for (const base of bases) {
    for (const eq of base.equipes) {
      linhas.push({
        ...eq,
        baseId: base.baseId,
        baseNome: base.baseNome,
        atrasoMin: eq.status === 'atrasado' && eq.horaSaida ? toMinutos(eq.horaSaida) - toMinutos(eq.horarioPadrao) : null,
      });
    }
  }
  return linhas;
});

const rowsFiltradas = computed(() =>
  todasLinhas.value.filter((r) => {
    const bateBase = (baseFiltro.value?.length ?? 0) === 0 || baseFiltro.value.includes(r.baseId);
    const bateTipo = (tipoFiltro.value?.length ?? 0) === 0 || tipoFiltro.value.includes(r.tipo);
    const bateSupervisor = (supervisorFiltro.value?.length ?? 0) === 0 || (!!r.supervisor && supervisorFiltro.value.includes(r.supervisor));
    const bateCoordenador = (coordenadorFiltro.value?.length ?? 0) === 0 || (!!r.coordenador && coordenadorFiltro.value.includes(r.coordenador));
    const bateBusca = !busca.value || r.identificador.toLowerCase().includes(busca.value.toLowerCase());
    const bateStatus = (statusFiltro.value?.length ?? 0) === 0 || statusFiltro.value.includes(r.status);
    return bateBase && bateTipo && bateSupervisor && bateCoordenador && bateBusca && bateStatus;
  }),
);

// Stats/legenda respeitam base+tipo+supervisor+coordenador+busca, mas não o
// próprio filtro de status (senão marcar "Atrasado" faria a contagem de "Pendente" sumir).
const linhasParaStats = computed(() =>
  todasLinhas.value.filter((r) => {
    const bateBase = (baseFiltro.value?.length ?? 0) === 0 || baseFiltro.value.includes(r.baseId);
    const bateTipo = (tipoFiltro.value?.length ?? 0) === 0 || tipoFiltro.value.includes(r.tipo);
    const bateSupervisor = (supervisorFiltro.value?.length ?? 0) === 0 || (!!r.supervisor && supervisorFiltro.value.includes(r.supervisor));
    const bateCoordenador = (coordenadorFiltro.value?.length ?? 0) === 0 || (!!r.coordenador && coordenadorFiltro.value.includes(r.coordenador));
    const bateBusca = !busca.value || r.identificador.toLowerCase().includes(busca.value.toLowerCase());
    return bateBase && bateTipo && bateSupervisor && bateCoordenador && bateBusca;
  }),
);

const stats = computed(() => ({
  pendente: linhasParaStats.value.filter((r) => r.status === 'pendente').length,
  no_prazo: linhasParaStats.value.filter((r) => r.status === 'no_prazo').length,
  atrasado: linhasParaStats.value.filter((r) => r.status === 'atrasado').length,
  justificado: linhasParaStats.value.filter((r) => r.status === 'justificado').length,
}));

// Contadores animados dos chips (conta subindo/descendo em vez de trocar o número seco)
const statsAnim = reactive({ pendente: 0, no_prazo: 0, atrasado: 0, justificado: 0 });

watch(
  stats,
  (novo) => {
    (Object.keys(novo) as Status[]).forEach((chave) => {
      gsap.to(statsAnim, { [chave]: novo[chave], duration: 0.5, ease: 'power1.out', roundProps: chave });
    });
  },
  { immediate: true },
);

// Troca de gráfico: fade + leve deslocamento em vez de aparecer seco
watch(visaoGrafico, () => {
  const el = graficoSecaoEl.value?.$el;
  if (!el) return;
  gsap.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power1.out' });
});

const temFiltroAtivo = computed(
  () =>
    !!busca.value ||
    (baseFiltro.value?.length ?? 0) > 0 ||
    (tipoFiltro.value?.length ?? 0) > 0 ||
    (supervisorFiltro.value?.length ?? 0) > 0 ||
    (coordenadorFiltro.value?.length ?? 0) > 0 ||
    (statusFiltro.value?.length ?? 0) > 0,
);

const colunas: QTableColumn[] = [
  { name: 'baseNome', label: 'Base', field: 'baseNome', align: 'left', sortable: true },
  { name: 'identificador', label: 'Equipe', field: 'identificador', align: 'left', sortable: true },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left', sortable: true },
  { name: 'supervisor', label: 'Supervisor', field: 'supervisor', align: 'left', sortable: true },
  { name: 'coordenador', label: 'Coordenador', field: 'coordenador', align: 'left', sortable: true },
  { name: 'horario', label: 'Horário', field: 'horaSaida', align: 'left', sortable: true },
  { name: 'atraso', label: 'Atraso', field: 'atrasoMin', align: 'left', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'left', sortable: true },
];

function labelStatus(status: Status) {
  return { no_prazo: 'No prazo', atrasado: 'Atrasado', pendente: 'Pendente', justificado: 'Justificado' }[status];
}

function corStatus(status: Status) {
  return CORES[status];
}

function alternarStatus(status: Status) {
  const i = statusFiltro.value.indexOf(status);
  if (i === -1) statusFiltro.value.push(status);
  else statusFiltro.value.splice(i, 1);
}

function limparFiltros() {
  busca.value = '';
  baseFiltro.value = [];
  tipoFiltro.value = [];
  supervisorFiltro.value = [];
  coordenadorFiltro.value = [];
  statusFiltro.value = [];
}

// ----- Gráfico 1: status por base (barras empilhadas) -----
const dadosGraficoBase = computed<ChartData<'bar'>>(() => {
  const bases = [...new Set(rowsFiltradas.value.map((r) => r.baseNome))].sort();
  const contarPorBase = (status: Status) => bases.map((b) => rowsFiltradas.value.filter((r) => r.baseNome === b && r.status === status).length);
  return {
    labels: bases,
    datasets: [
      { label: 'Pendente', data: contarPorBase('pendente'), backgroundColor: CORES.pendente, stack: 's' },
      { label: 'No prazo', data: contarPorBase('no_prazo'), backgroundColor: CORES.no_prazo, stack: 's' },
      { label: 'Atrasado', data: contarPorBase('atrasado'), backgroundColor: CORES.atrasado, stack: 's' },
      { label: 'Justificado', data: contarPorBase('justificado'), backgroundColor: CORES.justificado, stack: 's' },
    ],
  };
});

const opcoesGraficoBase = computed<ChartOptions<'bar'>>(() => {
  const corTexto = $q.dark.isActive ? '#e0e0e0' : '#333';
  const corGrade = $q.dark.isActive ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: true, ticks: { color: corTexto }, grid: { display: false } },
      y: { stacked: true, beginAtZero: true, ticks: { color: corTexto, precision: 0 }, grid: { color: corGrade } },
    },
    plugins: {
      legend: { position: 'bottom', labels: { color: corTexto, usePointStyle: true } },
      tooltip: { mode: 'index', intersect: false },
    },
  };
});

// ----- Gráfico 2: atrasos individuais (barras horizontais) -----
const LIMITE_BARRAS_ATRASO = 20;
const atrasos = computed(() =>
  rowsFiltradas.value
    .filter((r) => r.status === 'atrasado' && r.atrasoMin !== null)
    .sort((a, b) => (b.atrasoMin ?? 0) - (a.atrasoMin ?? 0))
    .slice(0, LIMITE_BARRAS_ATRASO),
);
const atrasosTruncados = computed(
  () => rowsFiltradas.value.filter((r) => r.status === 'atrasado').length - atrasos.value.length,
);

const dadosGraficoAtraso = computed<ChartData<'bar'>>(() => ({
  labels: atrasos.value.map((r) => `${r.identificador} (${r.baseNome})`),
  datasets: [
    {
      label: 'Minutos de atraso',
      data: atrasos.value.map((r) => r.atrasoMin ?? 0),
      backgroundColor: CORES.atrasado,
      borderRadius: 4,
    },
  ],
}));

const opcoesGraficoAtraso = computed<ChartOptions<'bar'>>(() => {
  const corTexto = $q.dark.isActive ? '#e0e0e0' : '#333';
  const corGrade = $q.dark.isActive ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { beginAtZero: true, ticks: { color: corTexto, precision: 0 }, grid: { color: corGrade } },
      y: { ticks: { color: corTexto }, grid: { display: false } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.raw} min de atraso`,
        },
      },
    },
  };
});

// ----- Gráfico A: média de saída por base -----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dadosGraficoMedia = computed<any>(() => {
  const bases = [...new Set(rowsFiltradas.value.map((r) => r.baseNome))].sort();
  const porBase = bases.map((b) => {
    const saidas = rowsFiltradas.value.filter((r) => r.baseNome === b && r.horaSaida);
    if (!saidas.length) return { media: null, count: 0 };
    const { media, count } = calcMediaAjustada(saidas);
    return { media, count };
  });
  return {
    labels: bases,
    datasets: [
      {
        label: 'Média de saída',
        data: porBase.map((d) => d.media),
        counts: porBase.map((d) => d.count),
        backgroundColor: porBase.map((d) =>
          d.media === null ? CORES.pendente : d.media <= 510 ? CORES.no_prazo : CORES.atrasado,
        ),
        borderRadius: 4,
        order: 1,
      },
      {
        type: 'line',
        label: 'Limite 08:30',
        data: Array(bases.length).fill(510),
        borderColor: '#f59e0b',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
        order: 0,
      },
    ],
  };
});

const opcoesGraficoMedia = computed<ChartOptions<'bar'>>(() => {
  const corTexto = $q.dark.isActive ? '#e0e0e0' : '#333';
  const corGrade = $q.dark.isActive ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 32 } },
    scales: {
      x: { ticks: { color: corTexto }, grid: { display: false } },
      y: {
        min: 6 * 60,
        ticks: {
          color: corTexto,
          stepSize: 30,
          callback: (val) => formatarMinutos(val as number),
        },
        grid: { color: corGrade },
      },
    },
    plugins: {
      legend: { position: 'bottom', labels: { color: corTexto, usePointStyle: true } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            if ((ctx.dataset as { type?: string }).type === 'line') return 'Limite: 08:30';
            const val = ctx.raw as number | null;
            return val !== null ? `Média: ${formatarMinutos(val)}` : 'Sem saídas';
          },
        },
      },
    },
  };
});

// ----- Gráfico B: detalhe de equipes por base -----
const equipesPorBase = computed(() => {
  const bases = [...new Set(rowsFiltradas.value.map((r) => r.baseNome))].sort();
  return bases.map((baseNome) => ({
    baseNome,
    equipes: rowsFiltradas.value
      .filter((r) => r.baseNome === baseNome)
      .sort((a, b) => {
        const order: Record<Status, number> = { no_prazo: 0, atrasado: 1, justificado: 2, pendente: 3 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return a.identificador.localeCompare(b.identificador);
      }),
    stats: {
      no_prazo: rowsFiltradas.value.filter((r) => r.baseNome === baseNome && r.status === 'no_prazo').length,
      atrasado: rowsFiltradas.value.filter((r) => r.baseNome === baseNome && r.status === 'atrasado').length,
      justificado: rowsFiltradas.value.filter((r) => r.baseNome === baseNome && r.status === 'justificado').length,
      pendente: rowsFiltradas.value.filter((r) => r.baseNome === baseNome && r.status === 'pendente').length,
    },
  }));
});

// ----- Expurgos da média (min e max removidos por base) -----
const expurgosPorBase = computed(() => {
  const bases = [...new Set(rowsFiltradas.value.map((r) => r.baseNome))].sort();
  return bases
    .map((baseNome) => {
      const saidas = rowsFiltradas.value.filter((r) => r.baseNome === baseNome && r.horaSaida);
      const { media, count, expMin, expMax } = calcMediaAjustada(saidas);
      return { baseNome, media, count, total: saidas.length, expMin, expMax };
    })
    .filter((b) => b.expMin !== null || b.expMax !== null);
});

// ----- Gráfico 3: heatmap de horário de saída por base -----
const TAMANHO_BUCKET = 15; // minutos
const LIMITE_PADRAO_MIN = 8 * 60 + 30; // 08:30, referência visual (a maioria das equipes usa esse limite)

function formatarMinutos(min: number): string {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, '0');
  const m = (min % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

const colunasHeatmap = computed(() => {
  const registrados = rowsFiltradas.value.filter((r) => r.horaSaida);
  let min = 7 * 60;
  let max = 9 * 60 + 30;
  for (const r of registrados) {
    const m = toMinutos(r.horaSaida as string);
    min = Math.min(min, Math.floor(m / TAMANHO_BUCKET) * TAMANHO_BUCKET);
    max = Math.max(max, Math.ceil(m / TAMANHO_BUCKET) * TAMANHO_BUCKET);
  }
  const cols: Array<{ minutos: number; label: string; ehLimite: boolean }> = [];
  for (let m = min; m < max; m += TAMANHO_BUCKET) {
    cols.push({ minutos: m, label: formatarMinutos(m), ehLimite: m <= LIMITE_PADRAO_MIN && m + TAMANHO_BUCKET > LIMITE_PADRAO_MIN });
  }
  return cols;
});

const linhasHeatmap = computed(() => {
  const registrados = rowsFiltradas.value.filter((r) => r.horaSaida);
  const bases = [...new Set(registrados.map((r) => r.baseNome))].sort();
  return bases.map((baseNome) => {
    const porBucket: Record<number, number> = {};
    for (const r of registrados) {
      if (r.baseNome !== baseNome) continue;
      const m = toMinutos(r.horaSaida as string);
      const bucket = Math.floor(m / TAMANHO_BUCKET) * TAMANHO_BUCKET;
      porBucket[bucket] = (porBucket[bucket] ?? 0) + 1;
    }
    return { baseNome, porBucket };
  });
});

const maxContagemHeatmap = computed(() => {
  let max = 0;
  for (const linha of linhasHeatmap.value) {
    for (const v of Object.values(linha.porBucket)) max = Math.max(max, v);
  }
  return max || 1;
});

function corCelulaHeatmap(contagem: number): string {
  if (contagem === 0) return 'transparent';
  const intensidade = 0.12 + 0.78 * (contagem / maxContagemHeatmap.value);
  return `rgba(25, 118, 210, ${intensidade.toFixed(2)})`;
}

async function exportarResumo() {
  if (exportandoResumo.value) return;
  exportandoResumo.value = true;
  try {
    const linhas = rowsFiltradas.value;
    const pendentes = linhas.filter((r) => r.status === 'pendente');
    const noPrazoCount = linhas.filter((r) => r.status === 'no_prazo').length;
    const atrasadoCount = linhas.filter((r) => r.status === 'atrasado').length;
    const baseNomes = [...new Set(linhas.map((r) => r.baseNome))].sort();
    const basesComMedia = baseNomes.filter((b) => linhas.some((r) => r.baseNome === b && r.horaSaida));
    const pendentesBases = baseNomes.filter((b) => pendentes.some((r) => r.baseNome === b));

    // --- carrega logo ---
    const logo = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = '/icons/logo-cgb.png';
    });

    // --- constantes de layout ---
    const SCALE = 2;
    const W = 860;
    const PAD = 28;
    const IW = W - PAD * 2;
    const CARDS_PER_ROW = 3;
    const CARD_H = 80;
    const CARD_GAP = 10;
    const BAR_ITEM_H = 32;
    const SEC_H = 40;

    // calcula altura total
    const H_HEADER = 106;
    const H_STATS = 62;
    const H_STATUS = SEC_H + baseNomes.length * BAR_ITEM_H + 28;
    const H_MEDIA = SEC_H + Math.ceil(basesComMedia.length / CARDS_PER_ROW) * (CARD_H + CARD_GAP) + 12;
    let H_PEND = SEC_H + (pendentes.length === 0 ? 36 : 0);
    if (pendentes.length > 0) {
      for (const b of pendentesBases) {
        const cnt = pendentes.filter((r) => r.baseNome === b).length;
        H_PEND += 22 + Math.ceil(cnt / 9) * 28 + 8;
      }
    }
    const H_FOOTER = 38;
    const TOTAL_H = H_HEADER + H_STATS + PAD + H_STATUS + 20 + H_MEDIA + 20 + H_PEND + PAD + H_FOOTER;

    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE;
    canvas.height = TOTAL_H * SCALE;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(SCALE, SCALE);

    // --- helpers ---
    function rr(x: number, y: number, w: number, h: number, r = 6) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    }

    function txt(
      s: string, x: number, y: number,
      font = '12px Arial', color = '#1c1c2e',
      align: CanvasTextAlign = 'left', maxW?: number,
    ) {
      ctx.save();
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      maxW !== undefined ? ctx.fillText(s, x, y, maxW) : ctx.fillText(s, x, y);
      ctx.restore();
    }

    // === FUNDO BRANCO ===
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, TOTAL_H);

    // === HEADER — gradiente azul escuro ===
    const hGrad = ctx.createLinearGradient(0, 0, W, H_HEADER);
    hGrad.addColorStop(0, '#16387a');
    hGrad.addColorStop(1, '#091628');
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, W, H_HEADER);

    // Faixa âmbar no rodapé do header
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, H_HEADER - 5, W, 5);

    // Logo — proporcional pela altura do header, sem deformação
    const LOGO_H = 80;
    const LY = (H_HEADER - 5 - LOGO_H) / 2;
    let logoDrawW = 0;
    if (logo) {
      const nw = logo.naturalWidth || logo.width;
      const nh = logo.naturalHeight || logo.height;
      const logoScale = LOGO_H / nh;         // escala pela altura
      const dw = nw * logoScale;             // largura proporcional real
      const dh = LOGO_H;
      logoDrawW = dw;

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
      ctx.drawImage(logo, PAD, LY, dw, dh);
      ctx.restore();
    }

    const TX = PAD + (logo ? logoDrawW + 18 : 0);
    txt('CGB ENERGIA', TX, H_HEADER / 2 - 5, 'bold 28px Arial', '#ffffff');
    txt('Monitoramento de Saídas de Campo', TX, H_HEADER / 2 + 22, '13px Arial', 'rgba(255,255,255,0.6)');
    txt(data.value, W - PAD, 34, 'bold 13px Arial', 'rgba(255,255,255,0.55)', 'right');

    let y = H_HEADER;

    // === BARRA DE STATS ===
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(0, y, W, H_STATS);

    const sstats = [
      { n: noPrazoCount,         label: 'No prazo',  color: '#6effa0' },
      { n: atrasadoCount,        label: 'Atrasadas', color: '#ff8a8a' },
      { n: pendentes.length,     label: 'Pendentes', color: '#ffd97a' },
      { n: linhas.length,        label: 'Total',     color: 'rgba(255,255,255,0.85)' },
    ];
    const scw = W / sstats.length;
    sstats.forEach((s, i) => {
      const cx = scw * i + scw / 2;
      if (i > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(scw * i, y + 10, 1, H_STATS - 20);
      }
      txt(String(s.n), cx, y + 32, 'bold 26px Arial', s.color, 'center');
      txt(s.label, cx, y + 52, '11px Arial', 'rgba(255,255,255,0.6)', 'center');
    });

    y += H_STATS + PAD;

    // helper de título de seção
    function secTitle(label: string) {
      ctx.fillStyle = '#1565c0';
      ctx.fillRect(PAD, y, 4, 22);
      txt(label, PAD + 12, y + 16, 'bold 11px Arial', '#374151');
      y += SEC_H;
    }

    // === STATUS POR BASE ===
    secTitle('STATUS POR BASE');

    const LBL_W = 155;
    const CNT_W = 36;
    const BX = PAD + LBL_W + 10;
    const BW = IW - LBL_W - CNT_W - 18;
    const BH = 22;

    for (const b of baseNomes) {
      const eqs = linhas.filter((r) => r.baseNome === b);
      const total = eqs.length;
      if (!total) continue;
      const np = eqs.filter((r) => r.status === 'no_prazo').length;
      const at = eqs.filter((r) => r.status === 'atrasado').length;
      const pe = eqs.filter((r) => r.status === 'pendente').length;
      const barY = y + 5;

      txt(b, PAD, y + BH, '12px Arial', '#1c1c2e', 'left', LBL_W - 4);

      // segmentos com clip rounded
      ctx.save();
      rr(BX, barY, BW, BH, 5);
      ctx.fillStyle = '#e5e7eb';
      ctx.fill();
      ctx.clip();
      let sx = BX;
      for (const [cnt, col] of [[np, '#0ca30c'], [at, '#d03b3b'], [pe, '#9e9e9e']] as [number, string][]) {
        if (!cnt) continue;
        const sw = Math.round((cnt / total) * BW);
        ctx.fillStyle = col;
        ctx.fillRect(sx, barY, sw, BH);
        if (sw > 24) txt(String(cnt), sx + sw / 2, barY + 15, 'bold 10px Arial', '#fff', 'center');
        sx += sw;
      }
      ctx.restore();

      txt(String(total), W - PAD, y + BH, 'bold 11px Arial', '#9ca3af', 'right');
      y += BAR_ITEM_H;
    }

    // legenda
    for (const [i, [col, lab]] of ([[`#0ca30c`, 'No prazo'], [`#d03b3b`, 'Atrasado'], [`#9e9e9e`, 'Pendente']] as [string, string][]).entries()) {
      const lx = PAD + i * 120;
      ctx.fillStyle = col;
      rr(lx, y + 3, 10, 10, 2);
      ctx.fill();
      txt(lab, lx + 15, y + 13, '10px Arial', '#6b7280');
    }
    y += 22;

    // separador
    y += 20;
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(PAD, y, IW, 1);
    y += 20;

    // === MÉDIA DE SAÍDA ===
    secTitle('MÉDIA DE SAÍDA POR BASE');

    const CW = Math.floor((IW - (CARDS_PER_ROW - 1) * CARD_GAP) / CARDS_PER_ROW);
    let cardX = PAD, cardY = y;

    basesComMedia.forEach((b, i) => {
      const saidas = linhas.filter((r) => r.baseNome === b && r.horaSaida);
      const media = Math.round(saidas.reduce((a, r) => a + toMinutos(r.horaSaida!), 0) / saidas.length);
      const hora = formatarMinutos(media);
      const ok = media <= 510;
      const bg = ok ? '#f0fdf4' : '#fff5f5';
      const cor = ok ? '#0ca30c' : '#d03b3b';

      // sombra leve
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.07)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = bg;
      rr(cardX, cardY, CW, CARD_H, 10);
      ctx.fill();
      ctx.restore();

      // faixa lateral colorida
      ctx.fillStyle = cor;
      ctx.fillRect(cardX, cardY + 10, 4, CARD_H - 20);

      txt(hora, cardX + 18, cardY + 42, 'bold 26px Arial', cor);
      txt(b, cardX + 18, cardY + 60, 'bold 11px Arial', '#374151', 'left', CW - 28);
      txt(`${saidas.length} equipe${saidas.length !== 1 ? 's' : ''}`, cardX + 18, cardY + 74, '10px Arial', '#9ca3af');

      cardX += CW + CARD_GAP;
      if ((i + 1) % CARDS_PER_ROW === 0) { cardX = PAD; cardY += CARD_H + CARD_GAP; }
    });
    if (basesComMedia.length % CARDS_PER_ROW !== 0) cardY += CARD_H + CARD_GAP;
    y = cardY + 8;

    // separador
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(PAD, y, IW, 1);
    y += 20;

    // === EQUIPES PENDENTES ===
    secTitle(`EQUIPES PENDENTES (${pendentes.length})`);

    if (pendentes.length === 0) {
      txt('✓  Todas as equipes já apontaram!', PAD + 12, y + 20, 'bold 13px Arial', '#0ca30c');
    } else {
      for (const b of pendentesBases) {
        const eqs = pendentes.filter((r) => r.baseNome === b);
        txt(b.toUpperCase(), PAD, y + 14, 'bold 9px Arial', '#9ca3af');
        y += 22;

        const CP = 9, CH = 22, CG = 5;
        let cx = PAD;

        for (const eq of eqs) {
          ctx.font = 'bold 10px Arial';
          const tw = ctx.measureText(eq.identificador).width;
          const cw = tw + CP * 2;
          if (cx + cw > PAD + IW && cx > PAD) { cx = PAD; y += CH + CG; }
          ctx.fillStyle = '#374151';
          rr(cx, y, cw, CH, 4);
          ctx.fill();
          txt(eq.identificador, cx + CP, y + 15, 'bold 10px Arial', '#fff');
          cx += cw + CG;
        }
        y += CH + 8;
      }
    }

    y += PAD;

    // === FOOTER ===
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, y, W, H_FOOTER);
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, y, W, 1);
    txt(
      'Gerado automaticamente · TimeTrack · CGB Engenharia',
      W / 2, y + 24, '10px Arial', '#9ca3af', 'center',
    );

    // === DOWNLOAD ===
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumo-cgb-${data.value}.png`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    exportandoResumo.value = false;
  }
}

async function capturarEl(el: HTMLElement, nomeArquivo: string) {
  const corFundo = getComputedStyle(el).backgroundColor || '#ffffff';
  const canvas = await html2canvas(el, { backgroundColor: corFundo, scale: 2, useCORS: true });
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

async function exportarMedia() {
  const cardEl = mediaCardEl.value?.$el;
  if (!cardEl || exportandoMedia.value) return;
  exportandoMedia.value = true;
  try {
    await nextTick();
    await capturarEl(cardEl, `media-saida-${data.value}.png`);
  } finally {
    exportandoMedia.value = false;
  }
}

async function exportarMapa() {
  const cardEl = mapaCardEl.value?.$el;
  if (!cardEl || exportandoMapa.value || !mapaCarregado.value) return;
  exportandoMapa.value = true;
  try {
    await nextTick();
    const ini = datasMapaRange.value[0];
    const fim = datasMapaRange.value[datasMapaRange.value.length - 1];
    await capturarEl(cardEl, `mapa-historico-${ini}-a-${fim}.png`);
  } finally {
    exportandoMapa.value = false;
  }
}

async function exportarDetalhe() {
  if (exportandoDetalhe.value) return;
  exportandoDetalhe.value = true;
  try {
    const bases = equipesPorBase.value;
    if (!bases.length) {
      $q.notify({ type: 'info', message: 'Nenhum dado para exportar' });
      return;
    }

    const logo = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = '/icons/logo-cgb.png';
    });

    const SCALE = 2;
    const W = 860;
    const PAD = 28;
    const IW = W - PAD * 2;
    const H_HEADER = 106;
    const H_SUBTIT = 44;
    const H_FOOTER = 46;
    const BASE_HEAD_H = 42;   // barra azul da base
    const ROW_H = 32;          // altura de cada linha de equipe
    const COLS = 2;            // equipes por linha
    const COL_W = IW / COLS;
    const CALC_H = 52;         // box de cálculo da média
    const BASE_GAP = 20;       // espaço entre bases

    // altura total dinâmica
    let totalH = H_HEADER + H_SUBTIT + PAD + H_FOOTER;
    for (const b of bases) {
      const nRows = Math.ceil(b.equipes.length / COLS);
      totalH += BASE_HEAD_H + nRows * ROW_H + CALC_H + BASE_GAP;
    }

    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE;
    canvas.height = totalH * SCALE;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(SCALE, SCALE);

    // helpers
    function rr(x: number, y: number, w: number, h: number, r = 6) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
    }
    function txt(s: string, x: number, y: number, font = '12px Arial', color = '#1c1c2e', align: CanvasTextAlign = 'left', maxW?: number) {
      ctx.save(); ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
      maxW !== undefined ? ctx.fillText(s, x, y, maxW) : ctx.fillText(s, x, y);
      ctx.restore();
    }

    // === FUNDO ===
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, totalH);

    // === HEADER ===
    const hGrad = ctx.createLinearGradient(0, 0, W, H_HEADER);
    hGrad.addColorStop(0, '#16387a'); hGrad.addColorStop(1, '#091628');
    ctx.fillStyle = hGrad; ctx.fillRect(0, 0, W, H_HEADER);
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(0, H_HEADER - 5, W, 5);

    const LOGO_H = 80;
    const LY = (H_HEADER - 5 - LOGO_H) / 2;
    let logoDrawW = 0;
    if (logo) {
      const nw = logo.naturalWidth || logo.width;
      const nh = logo.naturalHeight || logo.height;
      const ls = LOGO_H / nh;
      logoDrawW = nw * ls;
      ctx.save();
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 18;
      ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 2;
      ctx.drawImage(logo, PAD, LY, logoDrawW, LOGO_H);
      ctx.restore();
    }
    const TX = PAD + (logo ? logoDrawW + 18 : 0);
    txt('CGB ENERGIA', TX, H_HEADER / 2 - 5, 'bold 28px Arial', '#ffffff');
    txt('Monitoramento de Saídas de Campo', TX, H_HEADER / 2 + 22, '13px Arial', 'rgba(255,255,255,0.6)');
    txt(data.value, W - PAD, 34, 'bold 13px Arial', 'rgba(255,255,255,0.55)', 'right');

    // === SUBTÍTULO ===
    let y = H_HEADER;
    ctx.fillStyle = '#1e3a5f'; ctx.fillRect(0, y, W, H_SUBTIT);
    txt('Detalhamento · Horários de Saída por Base', PAD, y + H_SUBTIT / 2 + 5, 'bold 14px Arial', '#ffffff');
    txt(data.value, W - PAD, y + H_SUBTIT / 2 + 5, '13px Arial', 'rgba(255,255,255,0.55)', 'right');
    y += H_SUBTIT + PAD;

    // === BASES ===
    for (const base of bases) {
      const comSaida = base.equipes.filter((e) => e.horaSaida);
      const { media, count: countUsado, expMin, expMax } = calcMediaAjustada(comSaida);
      const somaUsada = comSaida
        .filter((e) => e.equipeId !== expMin?.equipeId && e.equipeId !== expMax?.equipeId)
        .reduce((a, e) => a + toMinutos(e.horaSaida!), 0);
      const mediaOk = media !== null && media <= 510;
      const nRows = Math.ceil(base.equipes.length / COLS);

      // ── Barra de cabeçalho da base ──
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(PAD, y, IW, BASE_HEAD_H);
      // nome da base
      txt(base.baseNome.toUpperCase(), PAD + 14, y + BASE_HEAD_H / 2 + 5, 'bold 15px Arial', '#ffffff');
      // badges à direita
      const drawBadge2 = (label: string, bg: string, rx: number) => {
        ctx.save(); ctx.font = 'bold 10px Arial';
        const bw = ctx.measureText(label).width + 14; const bh = 18;
        rr(rx - bw, y + (BASE_HEAD_H - bh) / 2, bw, bh, 4);
        ctx.fillStyle = bg; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, rx - bw / 2, y + BASE_HEAD_H / 2);
        ctx.restore();
        return rx - bw - 6;
      };
      let rx2 = W - PAD - 6;
      if (base.stats.pendente > 0) rx2 = drawBadge2(`${base.stats.pendente} pendente(s)`, '#6b7280', rx2);
      if (base.stats.justificado > 0) rx2 = drawBadge2(`${base.stats.justificado} justificada(s)`, '#0891b2', rx2);
      if (base.stats.atrasado > 0) rx2 = drawBadge2(`${base.stats.atrasado} atrasada(s)`, '#b91c1c', rx2);
      drawBadge2(`${base.stats.no_prazo} no prazo`, '#15803d', rx2);
      y += BASE_HEAD_H;

      // ── Linhas de equipe em 2 colunas ──
      base.equipes.forEach((eq, idx) => {
        const col = idx % COLS;
        const row = Math.floor(idx / COLS);
        const x0 = PAD + col * COL_W;
        const y0 = y + row * ROW_H;
        const isExpurgo = eq.equipeId === expMin?.equipeId || eq.equipeId === expMax?.equipeId;
        const ehMin = eq.equipeId === expMin?.equipeId;
        const ehMax = eq.equipeId === expMax?.equipeId;
        const cor = isExpurgo ? '#94a3b8' : eq.status === 'no_prazo' ? '#16a34a' : eq.status === 'atrasado' ? '#dc2626' : eq.status === 'justificado' ? '#d97706' : '#9ca3af';

        // fundo: expurgos têm fundo acinzentado especial
        ctx.fillStyle = isExpurgo ? '#e2e8f0' : row % 2 === 0 ? '#ffffff' : '#f1f5f9';
        ctx.fillRect(x0, y0, COL_W, ROW_H);

        // barra lateral: azul-acinzentada para expurgos
        ctx.fillStyle = isExpurgo ? '#64748b' : cor;
        ctx.fillRect(x0 + (col === 1 ? 1 : 0), y0 + 5, 4, ROW_H - 10);

        // tag EXP min/max
        if (isExpurgo) {
          const tag = ehMin ? '↓mín' : (ehMax ? '↑máx' : '');
          const tagColor = ehMin ? '#2563eb' : '#ea580c';
          ctx.save(); ctx.font = 'bold 8px Arial';
          const tw = ctx.measureText(tag).width + 6;
          rr(x0 + COL_W - tw - 4, y0 + 4, tw, 12, 2);
          ctx.fillStyle = tagColor; ctx.fill();
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(tag, x0 + COL_W - tw / 2 - 4, y0 + 10);
          ctx.restore();
        }

        // identificador (acinzentado se expurgo)
        txt(eq.identificador, x0 + 12, y0 + ROW_H / 2 + 4, 'bold 11.5px monospace', isExpurgo ? '#64748b' : '#334155', 'left', COL_W * 0.55);

        // hora de saída
        if (eq.horaSaida) {
          const timeX = x0 + COL_W - (isExpurgo ? 52 : eq.atrasoMin ? 46 : 10);
          txt(eq.horaSaida.slice(0, 5), timeX, y0 + ROW_H / 2 + 4, `bold 13px Arial`, cor, 'right');
          if (!isExpurgo && eq.atrasoMin) {
            txt(`+${eq.atrasoMin}m`, x0 + COL_W - 6, y0 + ROW_H / 2 + 4, 'bold 10px Arial', '#dc2626', 'right');
          }
        } else if (eq.status === 'justificado') {
          txt('justificado', x0 + COL_W - 10, y0 + ROW_H / 2 + 4, 'bold 11px Arial', '#d97706', 'right');
        } else {
          txt('pendente', x0 + COL_W - 10, y0 + ROW_H / 2 + 4, '11px Arial', '#9ca3af', 'right');
        }
      });

      // linha separadora central entre colunas
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD + COL_W, y);
      ctx.lineTo(PAD + COL_W, y + nRows * ROW_H);
      ctx.stroke();

      // borda inferior da tabela
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, y + nRows * ROW_H);
      ctx.lineTo(W - PAD, y + nRows * ROW_H);
      ctx.stroke();

      y += nRows * ROW_H;

      // ── Box de cálculo da média ──
      if (media !== null) {
        const calcBg = mediaOk ? '#f0fdf4' : '#fff5f5';
        const calcCor = mediaOk ? '#15803d' : '#b91c1c';
        const calcBorder = mediaOk ? '#86efac' : '#fca5a5';

        ctx.fillStyle = calcBg;
        ctx.fillRect(PAD, y, IW, CALC_H);
        ctx.strokeStyle = calcBorder; ctx.lineWidth = 1.5;
        ctx.strokeRect(PAD, y, IW, CALC_H);

        const formulaY1 = y + 18;
        const formulaY2 = y + 38;

        // linha 1: info dos expurgos
        if (expMin || expMax) {
          const expInfo = [
            expMin ? `↓mín expurgado: ${expMin.identificador} ${expMin.horaSaida?.slice(0,5)}` : '',
            expMax ? `↑máx expurgado: ${expMax.identificador} ${expMax.horaSaida?.slice(0,5)}` : '',
          ].filter(Boolean).join('   ·   ');
          txt(expInfo, PAD + 14, formulaY1, '10.5px Arial', '#64748b');
        } else {
          txt(`${comSaida.length} equipe(s) com apontamento — sem expurgos`, PAD + 14, formulaY1, '10.5px Arial', '#64748b');
        }

        // linha 2: fórmula
        const somaHH = formatarMinutos(somaUsada);
        const formula = `Cálculo: ${somaHH} (soma de ${countUsado}) ÷ ${countUsado} equipes = ${formatarMinutos(media)}`;
        txt(formula, PAD + 14, formulaY2, '11px Arial', calcCor);

        // resultado à direita
        const tag = mediaOk ? '✓ No prazo' : '✗ Acima do limite';
        txt(tag, W - PAD - 14, formulaY1, '10px Arial', calcCor, 'right');
        txt(formatarMinutos(media), W - PAD - 14, formulaY2 + 2, 'bold 20px Arial', calcCor, 'right');
      } else {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(PAD, y, IW, CALC_H);
        txt('Nenhuma equipe com apontamento registrado nesta base', PAD + 14, y + CALC_H / 2 + 4, '11px Arial', '#9ca3af');
      }

      y += CALC_H + BASE_GAP;
    }

    // === FOOTER ===
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(0, totalH - H_FOOTER, W, H_FOOTER);
    txt('Gerado automaticamente  ·  TimeTrack  ·  CGB Engenharia', W / 2, totalH - H_FOOTER / 2 + 5, '11px Arial', '#94a3b8', 'center');

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = `detalhe-saidas-${data.value}.png`; a.click();

    $q.notify({ type: 'positive', message: 'Imagem de detalhamento gerada!' });
  } finally {
    exportandoDetalhe.value = false;
  }
}

async function exportarPendentes() {
  if (exportandoPendentes.value) return;
  const pendentes = rowsFiltradas.value.filter((r) => r.status === 'pendente');
  if (!pendentes.length) {
    $q.notify({ type: 'info', message: 'Nenhuma equipe pendente com os filtros atuais' });
    return;
  }
  exportandoPendentes.value = true;
  try {
    const div = document.createElement('div');
    div.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;width:720px;padding:24px 28px;background:#fff;font-family:Arial,sans-serif;';

    const baseNomes = [...new Set(pendentes.map((r) => r.baseNome))].sort();
    div.innerHTML = `
      <div style="font-size:20px;font-weight:700;color:#1565c0;margin-bottom:2px;">CGB ENERGIA</div>
      <div style="font-size:15px;font-weight:600;color:#333;margin-bottom:2px;">Equipes pendentes de apontamento</div>
      <div style="font-size:13px;color:#666;margin-bottom:16px;">${data.value} · ${pendentes.length} equipe(s)</div>
      ${baseNomes
        .map(
          (b) => `
        <div style="margin-bottom:12px;">
          <div style="font-size:12px;font-weight:700;color:#555;border-bottom:1px solid #eee;padding-bottom:4px;margin-bottom:6px;">${b}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${pendentes
              .filter((r) => r.baseNome === b)
              .map(
                (r) =>
                  `<span style="padding:4px 10px;background:#757575;color:#fff;border-radius:6px;font-size:12px;font-weight:600;">${r.identificador}</span>`,
              )
              .join('')}
          </div>
        </div>`,
        )
        .join('')}
    `;
    document.body.appendChild(div);
    await nextTick();
    await capturarEl(div, `pendentes-${data.value}.png`);
    document.body.removeChild(div);
  } finally {
    exportandoPendentes.value = false;
  }
}

async function exportarGrafico() {
  const cardEl = graficoCardEl.value?.$el;
  if (!cardEl || exportando.value) return;

  exportando.value = true;
  try {
    // Esconde os controles (toggle/botão) durante a captura, só o gráfico + título aparecem na imagem.
    await nextTick();
    const corFundo = getComputedStyle(cardEl).backgroundColor;
    const canvas = await html2canvas(cardEl, { backgroundColor: corFundo, scale: 2 });

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;

    const nomeArquivo = `timetrack-${visaoGrafico.value}-${data.value}.png`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
  } finally {
    exportando.value = false;
  }
}

let primeiraCarga = true;

async function carregar() {
  carregando.value = true;
  try {
    const { data: resp } = await api.get<MonitoramentoResponse>('/monitoramento', {
      params: { data: data.value },
    });
    resposta.value = resp;
    if (primeiraCarga) {
      primeiraCarga = false;
      void nextTick(() => {
        if (conteudoEl.value) {
          gsap.from(conteudoEl.value, { opacity: 0, y: 14, duration: 0.4, ease: 'power1.out' });
        }
      });
    }
  } finally {
    carregando.value = false;
  }
}

function carregarManual() {
  void carregar();
}

let intervalo: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  void carregar();
  intervalo = setInterval(() => void carregar(), 45000);
});

onUnmounted(() => {
  if (intervalo) clearInterval(intervalo);
});
</script>

<style scoped>
.export-oculto {
  visibility: hidden;
}

:deep(.row-atrasado) {
  border-left: 3px solid var(--q-negative);
}

:deep(.row-pendente) {
  border-left: 3px solid rgba(158, 158, 158, 0.5);
}

:deep(.row-no_prazo) {
  border-left: 3px solid var(--q-positive);
}

:deep(.row-justificado) {
  border-left: 3px solid var(--q-info);
}

.heatmap-wrap {
  overflow-x: auto;
}

.heatmap-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.78rem;
}

.heatmap-table th,
.heatmap-table td {
  padding: 6px 8px;
  text-align: center;
  white-space: nowrap;
  border: 2px solid rgba(128, 128, 128, 0.15);
}

.heatmap-corner {
  min-width: 130px;
}

.heatmap-row-header {
  text-align: left;
  font-weight: 600;
  min-width: 130px;
  position: sticky;
  left: 0;
  background: inherit;
}

.heatmap-col-header {
  font-weight: 500;
  color: var(--q-grey-6, #9e9e9e);
}

.heatmap-cell {
  min-width: 44px;
}

.heatmap-limite {
  box-shadow: inset 0 0 0 2px var(--q-negative);
}

.heatmap-legend-bar {
  width: 90px;
  height: 10px;
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(25, 118, 210, 0.1), rgba(25, 118, 210, 0.9));
}

.equipe-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1.5px solid;
  font-size: 0.75rem;
  white-space: nowrap;
}

.equipe-chip-id {
  font-weight: 600;
}

.equipe-chip-time {
  color: var(--q-grey-6, #757575);
  font-size: 0.72rem;
}

.equipe-chip-atraso {
  color: #d03b3b;
  font-size: 0.7rem;
  font-weight: 600;
}

.heatmap-limite-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  box-shadow: inset 0 0 0 2px var(--q-negative);
  vertical-align: middle;
  margin-right: 2px;
}

/* ---- Mapa histórico ---- */
.mapa-wrap {
  overflow-x: auto;
}

.mapa-table {
  border-collapse: collapse;
  font-size: 0.72rem;
  white-space: nowrap;
}

.mapa-table th,
.mapa-table td {
  border: 1px solid rgba(128, 128, 128, 0.2);
  text-align: center;
  padding: 3px 5px;
}

.mapa-prefixo-th {
  text-align: left;
  min-width: 130px;
  font-size: 0.72rem;
  font-weight: 600;
  position: sticky;
  left: 0;
  z-index: 1;
}

.mapa-prefixo-cell {
  text-align: left;
  min-width: 130px;
  font-weight: 600;
  font-size: 0.72rem;
  position: sticky;
  left: 0;
  z-index: 1;
}

.mapa-dia-th {
  min-width: 52px;
  font-size: 0.68rem;
}

.mapa-celula {
  min-width: 52px;
  font-weight: 600;
  font-size: 0.7rem;
}

.mapa-status-no_prazo {
  background: #0ca30c;
  color: #fff;
}

.mapa-status-atrasado {
  background: #d03b3b;
  color: #fff;
}

.mapa-status-ausente {
  background: #e65100;
  color: #fff;
}

.mapa-status-vazio {
  color: rgba(128, 128, 128, 0.4);
}

.mapa-ausente-txt {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.mapa-legenda-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  vertical-align: middle;
  margin-right: 3px;
}
</style>
