<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-gutter-md q-mb-md">
      <div class="text-h6">Monitoramento de Saída</div>
      <q-space />
      <q-input v-model="data" type="date" dense filled style="width: 170px" @update:model-value="carregarManual" />
      <q-btn round dense flat icon="refresh" :loading="carregando" @click="carregarManual" />
    </div>

    <div v-if="todasEquipes.length > 0" ref="conteudoEl">
      <!-- Chips de status: dobram como legenda (ícone + texto, nunca só cor) e como filtro -->
      <div class="row q-gutter-sm q-mb-sm">
        <q-chip
          clickable
          square
          :outline="!statusFiltro.includes('pendente')"
          text-color="white"
          :style="{ background: CORES.pendente }"
          icon="schedule"
          @click="alternarStatus('pendente')"
        >
          {{ statsAnim.pendente }} pendente(s)
        </q-chip>
        <q-chip
          clickable
          square
          :outline="!statusFiltro.includes('no_prazo')"
          text-color="white"
          :style="{ background: CORES.no_prazo }"
          icon="check_circle"
          @click="alternarStatus('no_prazo')"
        >
          {{ statsAnim.no_prazo }} no prazo
        </q-chip>
        <q-chip
          clickable
          square
          :outline="!statusFiltro.includes('atrasado')"
          text-color="white"
          :style="{ background: CORES.atrasado }"
          icon="warning"
          @click="alternarStatus('atrasado')"
        >
          {{ statsAnim.atrasado }} atrasada(s)
        </q-chip>

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
          dense
          filled
          clearable
          label="Tipo"
          style="min-width: 140px"
        />

        <q-select
          v-model="supervisorFiltro"
          :options="opcoesSupervisor"
          multiple
          dense
          filled
          clearable
          label="Supervisor"
          style="min-width: 160px"
        />

        <q-select
          v-model="coordenadorFiltro"
          :options="opcoesCoordenador"
          multiple
          dense
          filled
          clearable
          label="Coordenador"
          style="min-width: 160px"
        />

        <q-btn v-if="temFiltroAtivo" flat dense label="Limpar filtros" @click="limparFiltros" />
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
          <Bar v-if="visaoGrafico === 'base'" :data="dadosGraficoBase" :options="opcoesGraficoBase" style="height: 380px" />

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
      <q-card flat bordered class="q-mb-md">
        <q-card-section class="row items-center q-gutter-sm">
          <div class="text-subtitle2">Média de saída por base</div>
          <div class="text-caption text-grey-6">{{ data }} · apenas equipes com saída registrada</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <Bar
            v-if="rowsFiltradas.some(r => r.horaSaida)"
            :data="dadosGraficoMedia"
            :options="opcoesGraficoMedia"
            style="height: 280px"
          />
          <div v-else class="text-grey-6 text-center q-pa-lg">Nenhuma saída registrada ainda com esses filtros.</div>
        </q-card-section>
      </q-card>

      <!-- Gráfico: detalhe de equipes por base -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section class="row items-center q-gutter-sm">
          <div class="text-subtitle2">Equipes por base — detalhe</div>
          <div class="text-caption text-grey-6">{{ data }}</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div v-for="base in equipesPorBase" :key="base.baseNome" class="q-mb-md">
            <div class="row items-center q-gutter-xs q-mb-xs">
              <span class="text-subtitle2">{{ base.baseNome }}</span>
              <q-badge color="positive" :label="`${base.stats.no_prazo} no prazo`" />
              <q-badge v-if="base.stats.atrasado > 0" color="negative" :label="`${base.stats.atrasado} atrasada(s)`" />
              <q-badge v-if="base.stats.pendente > 0" color="grey-6" :label="`${base.stats.pendente} pendente(s)`" />
            </div>
            <div class="row q-gutter-xs">
              <div
                v-for="eq in base.equipes"
                :key="eq.equipeId"
                class="equipe-chip"
                :style="{ borderColor: CORES[eq.status], background: `${CORES[eq.status]}22` }"
                :title="`${eq.identificador} · ${eq.horaSaida ? eq.horaSaida.slice(0,5) : 'Pendente'}${eq.atrasoMin ? ` · +${eq.atrasoMin}min` : ''}`"
              >
                <span class="equipe-chip-id" :style="{ color: CORES[eq.status] }">{{ eq.identificador }}</span>
                <span v-if="eq.horaSaida" class="equipe-chip-time">{{ eq.horaSaida.slice(0, 5) }}</span>
                <span v-if="eq.atrasoMin" class="equipe-chip-atraso">+{{ eq.atrasoMin }}m</span>
              </div>
            </div>
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

type Status = 'no_prazo' | 'atrasado' | 'pendente';

// Paleta de status (verde/vermelho validados para contraste; cinza = neutro,
// não é um "alerta"). Nunca usada sozinha — sempre junto de ícone + texto.
const CORES: Record<Status, string> = {
  no_prazo: '#0ca30c',
  atrasado: '#d03b3b',
  pendente: '#757575',
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

const busca = ref('');
const baseFiltro = ref<number[]>([]);
const tipoFiltro = ref<string[]>([]);
const supervisorFiltro = ref<string[]>([]);
const coordenadorFiltro = ref<string[]>([]);
const statusFiltro = ref<Status[]>([]);
const visaoGrafico = ref<'base' | 'atraso' | 'heatmap'>('base');

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
    const bateBase = baseFiltro.value.length === 0 || baseFiltro.value.includes(r.baseId);
    const bateTipo = tipoFiltro.value.length === 0 || tipoFiltro.value.includes(r.tipo);
    const bateSupervisor = supervisorFiltro.value.length === 0 || (!!r.supervisor && supervisorFiltro.value.includes(r.supervisor));
    const bateCoordenador = coordenadorFiltro.value.length === 0 || (!!r.coordenador && coordenadorFiltro.value.includes(r.coordenador));
    const bateBusca = !busca.value || r.identificador.toLowerCase().includes(busca.value.toLowerCase());
    const bateStatus = statusFiltro.value.length === 0 || statusFiltro.value.includes(r.status);
    return bateBase && bateTipo && bateSupervisor && bateCoordenador && bateBusca && bateStatus;
  }),
);

// Stats/legenda respeitam base+tipo+supervisor+coordenador+busca, mas não o
// próprio filtro de status (senão marcar "Atrasado" faria a contagem de "Pendente" sumir).
const linhasParaStats = computed(() =>
  todasLinhas.value.filter((r) => {
    const bateBase = baseFiltro.value.length === 0 || baseFiltro.value.includes(r.baseId);
    const bateTipo = tipoFiltro.value.length === 0 || tipoFiltro.value.includes(r.tipo);
    const bateSupervisor = supervisorFiltro.value.length === 0 || (!!r.supervisor && supervisorFiltro.value.includes(r.supervisor));
    const bateCoordenador = coordenadorFiltro.value.length === 0 || (!!r.coordenador && coordenadorFiltro.value.includes(r.coordenador));
    const bateBusca = !busca.value || r.identificador.toLowerCase().includes(busca.value.toLowerCase());
    return bateBase && bateTipo && bateSupervisor && bateCoordenador && bateBusca;
  }),
);

const stats = computed(() => ({
  pendente: linhasParaStats.value.filter((r) => r.status === 'pendente').length,
  no_prazo: linhasParaStats.value.filter((r) => r.status === 'no_prazo').length,
  atrasado: linhasParaStats.value.filter((r) => r.status === 'atrasado').length,
}));

// Contadores animados dos chips (conta subindo/descendo em vez de trocar o número seco)
const statsAnim = reactive({ pendente: 0, no_prazo: 0, atrasado: 0 });

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
    baseFiltro.value.length > 0 ||
    tipoFiltro.value.length > 0 ||
    supervisorFiltro.value.length > 0 ||
    coordenadorFiltro.value.length > 0 ||
    statusFiltro.value.length > 0,
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
  return { no_prazo: 'No prazo', atrasado: 'Atrasado', pendente: 'Pendente' }[status];
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
  return {
    labels: bases,
    datasets: [
      {
        label: 'Média de saída',
        data: bases.map((b) => {
          const saidas = rowsFiltradas.value.filter((r) => r.baseNome === b && r.horaSaida);
          if (!saidas.length) return null;
          return Math.round(saidas.reduce((acc, r) => acc + toMinutos(r.horaSaida!), 0) / saidas.length);
        }),
        backgroundColor: bases.map((b) => {
          const saidas = rowsFiltradas.value.filter((r) => r.baseNome === b && r.horaSaida);
          if (!saidas.length) return CORES.pendente;
          const media = saidas.reduce((acc, r) => acc + toMinutos(r.horaSaida!), 0) / saidas.length;
          return media <= 510 ? CORES.no_prazo : CORES.atrasado;
        }),
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
        const order: Record<Status, number> = { no_prazo: 0, atrasado: 1, pendente: 2 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return a.identificador.localeCompare(b.identificador);
      }),
    stats: {
      no_prazo: rowsFiltradas.value.filter((r) => r.baseNome === baseNome && r.status === 'no_prazo').length,
      atrasado: rowsFiltradas.value.filter((r) => r.baseNome === baseNome && r.status === 'atrasado').length,
      pendente: rowsFiltradas.value.filter((r) => r.baseNome === baseNome && r.status === 'pendente').length,
    },
  }));
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
</style>
