<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-gutter-md q-mb-md">
      <div class="text-h6">Apontamento</div>

      <q-select
        v-if="authStore.isAdmin"
        v-model="baseSelecionada"
        :options="opcoesBase"
        emit-value
        map-options
        label="Base"
        filled
        dense
        style="min-width: 220px"
      />
      <div v-else-if="authStore.isCoordenador" class="text-subtitle2">Coordenador: {{ authStore.user?.coordenadores?.join(', ') || authStore.user?.coordenador }}</div>
      <div v-else class="text-subtitle2">Supervisor: {{ authStore.user?.supervisores?.join(', ') || authStore.user?.supervisor }}</div>

      <q-space />
      <div class="text-caption text-grey-7">{{ dataHoje }}</div>
      <q-btn round dense flat icon="refresh" :loading="carregando" @click="carregar" />
    </div>

    <div v-if="equipesBase.length > 0" ref="conteudoEl">
      <div class="row q-gutter-sm q-mb-md">
        <q-chip
          clickable square :outline="!statusFiltro.includes('pendente')"
          color="grey-7"
          :text-color="statusFiltro.includes('pendente') ? 'white' : 'grey-7'"
          icon="schedule"
          @click="alternarStatus('pendente')"
        >{{ statsAnim.pendente }} pendente(s)</q-chip>
        <q-chip
          clickable square :outline="!statusFiltro.includes('no_prazo')"
          color="positive"
          :text-color="statusFiltro.includes('no_prazo') ? 'white' : 'positive'"
          icon="check_circle"
          @click="alternarStatus('no_prazo')"
        >{{ statsAnim.no_prazo }} no prazo</q-chip>
        <q-chip
          clickable square :outline="!statusFiltro.includes('atrasado')"
          color="negative"
          :text-color="statusFiltro.includes('atrasado') ? 'white' : 'negative'"
          icon="warning"
          @click="alternarStatus('atrasado')"
        >{{ statsAnim.atrasado }} atrasada(s)</q-chip>
        <q-chip
          clickable square :outline="!statusFiltro.includes('justificado')"
          color="info"
          :text-color="statusFiltro.includes('justificado') ? 'white' : 'info'"
          icon="description"
          @click="alternarStatus('justificado')"
        >{{ statsAnim.justificado }} justificada(s)</q-chip>

        <q-space />

        <q-input
          v-model="busca"
          dense filled clearable debounce="150"
          placeholder="Buscar equipe..."
          style="min-width: 220px"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>

        <q-select
          v-model="tipoFiltro"
          :options="tipos"
          multiple use-chips dense filled label="Tipo"
          style="min-width: 160px"
          @update:model-value="(v) => (tipoFiltro = v ?? [])"
        />

        <q-btn v-if="temFiltroAtivo" flat dense label="Limpar filtros" @click="limparFiltros" />
      </div>

      <q-table
        :rows="equipesFiltradas"
        :columns="colunas"
        row-key="equipeId"
        :loading="carregando"
        flat bordered
        :pagination="{ rowsPerPage: 15 }"
      >
        <template #body="props">
          <q-tr :props="props" :class="`row-${props.row.status}`">
            <q-td key="identificador" :props="props">{{ props.row.identificador }}</q-td>
            <q-td v-if="!authStore.isAdmin" key="baseNome" :props="props">{{ props.row.baseNome }}</q-td>
            <q-td key="tipo" :props="props">
              <q-badge outline color="grey-6" :label="props.row.tipo" />
            </q-td>
            <q-td key="supervisao" :props="props">
              <div>{{ props.row.supervisor || '—' }}</div>
              <div class="text-caption text-grey-6">{{ props.row.coordenador || '—' }}</div>
            </q-td>
            <q-td key="horario" :props="props">
              <span v-if="props.row.horaSaida">{{ props.row.horaSaida.slice(0, 5) }}</span>
              <span v-else class="text-grey-6">—</span>
              <span class="text-grey-6"> · limite {{ props.row.horarioPadrao.slice(0, 5) }}</span>
              <div v-if="props.row.observacao" class="text-caption text-grey-6">{{ props.row.observacao }}</div>
              <div v-if="justificativas.get(props.row.equipeId)" class="text-caption text-orange">
                <q-icon name="comment" size="12px" />
                <strong>{{ justificativas.get(props.row.equipeId)?.tipo }}</strong>
                — {{ justificativas.get(props.row.equipeId)?.motivo }}
              </div>
            </q-td>
            <q-td key="status" :props="props">
              <q-badge :color="corStatus(props.row.status)" :label="labelStatus(props.row.status)" />
            </q-td>
            <q-td key="acoes" :props="props" auto-width>
              <div class="row no-wrap q-gutter-xs">
                <q-btn
                  :label="props.row.horaSaida ? 'Editar' : 'Apontar'"
                  :color="props.row.horaSaida ? 'grey-8' : 'primary'"
                  size="sm" dense unelevated
                  @click="abrirDialogo(props.row)"
                />
                <q-btn
                  icon="comment"
                  :color="justificativas.has(props.row.equipeId) ? 'orange' : 'grey-7'"
                  :outline="!justificativas.has(props.row.equipeId)"
                  size="sm" dense unelevated
                  @click="abrirJustificativa(props.row)"
                >
                  <q-tooltip>{{ justificativas.has(props.row.equipeId) ? 'Ver / editar justificativa' : 'Adicionar justificativa' }}</q-tooltip>
                </q-btn>
              </div>
            </q-td>
          </q-tr>
        </template>

        <template #no-data>
          <div class="full-width text-center text-grey-6 q-pa-lg">Nenhuma equipe encontrada com esses filtros.</div>
        </template>
      </q-table>
    </div>

    <div v-else-if="!carregando" class="text-grey-6 q-mt-xl text-center">
      {{ mensagemSemEquipes }}
    </div>

    <!-- Diálogo de apontamento -->
    <q-dialog v-model="dialogoAberto">
      <q-card style="width: 360px; max-width: 90vw">
        <q-card-section>
          <div class="text-subtitle1">{{ equipeSelecionada?.tipo }} · {{ equipeSelecionada?.identificador }}</div>
          <div v-if="equipeSelecionada" class="text-caption text-grey-7">
            Limite padrão: {{ equipeSelecionada.horarioPadrao.slice(0, 5) }}
          </div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="horaSaida" label="Hora de saída" type="time" filled />
          <q-input v-model="observacao" label="Observação (opcional)" filled />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Salvar" :loading="salvando" @click="salvar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Diálogo de justificativa -->
    <q-dialog v-model="dialogoJustAberto">
      <q-card style="width: 420px; max-width: 90vw">
        <q-card-section>
          <div class="text-subtitle1">
            <q-icon name="comment" color="orange" class="q-mr-xs" />
            Justificativa
          </div>
          <div class="text-caption text-grey-7">{{ equipeJust?.tipo }} · {{ equipeJust?.identificador }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select
            v-model="tipoJust"
            :options="[{ label: 'Falta — equipe não saiu', value: 'FALTA' }, { label: 'Atraso — equipe saiu depois do limite', value: 'ATRASO' }]"
            emit-value
            map-options
            label="Tipo de ocorrência"
            filled
          />
          <q-input
            v-model="motivoJust"
            label="Descrição do motivo"
            type="textarea"
            filled
            autogrow
            :rows="3"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            color="orange"
            label="Salvar justificativa"
            :loading="salvandoJust"
            :disable="!tipoJust || !motivoJust.trim()"
            @click="salvarJustificativa"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue';
import type { QTableColumn } from 'quasar';
import gsap from 'gsap';
import { api } from '@/boot/axios';
import { useAuthStore } from '@/stores/auth';
import { hojeStr, agoraStr } from '@/utils/date';

type Status = 'no_prazo' | 'atrasado' | 'pendente' | 'justificado';

interface EquipeStatus {
  equipeId: number;
  tipo: string;
  identificador: string;
  horarioPadrao: string;
  supervisor: string | null;
  coordenador: string | null;
  horaSaida: string | null;
  observacao: string | null;
  justificativa: string | null;
  status: Status;
  baseNome?: string;
}

interface BaseComEquipes {
  baseId: number;
  baseNome: string;
  equipes: EquipeStatus[];
}

interface MonitoramentoResponse {
  bases: BaseComEquipes[];
}

interface Justificativa {
  id: number;
  equipe_id: number;
  tipo: string;
  motivo: string;
}

const tipos = ['GERE', 'GOMAN', 'GSTC'];
const authStore = useAuthStore();
const dataHoje = hojeStr();

const resposta = ref<MonitoramentoResponse | null>(null);
const carregando = ref(false);
const baseSelecionada = ref<number | null>(authStore.user?.baseId ?? null);

const busca = ref('');
const tipoFiltro = ref<string[]>([]);
const statusFiltro = ref<Status[]>([]);
const conteudoEl = ref<HTMLElement | null>(null);

// Justificativas: mapa equipeId → { tipo, motivo }
const justificativas = ref<Map<number, { tipo: string; motivo: string }>>(new Map());

const opcoesBase = computed(() =>
  (resposta.value?.bases ?? []).map((b) => ({ label: b.baseNome, value: b.baseId })),
);

const baseAtual = computed(() => resposta.value?.bases.find((b) => b.baseId === baseSelecionada.value));

const equipesDoSupervisor = computed<EquipeStatus[]>(() => {
  const supervisores = authStore.user?.supervisores?.length
    ? authStore.user.supervisores
    : authStore.user?.supervisor ? [authStore.user.supervisor] : [];
  const supervisoresLower = supervisores.map((s) => s.toLowerCase());
  const equipesIds = new Set(authStore.user?.equipesIds ?? []);
  if (!supervisores.length && !equipesIds.size) return [];
  return (resposta.value?.bases ?? []).flatMap((b) =>
    b.equipes
      .filter((e) => supervisoresLower.includes((e.supervisor ?? '').toLowerCase()) || equipesIds.has(e.equipeId))
      .map((e) => ({ ...e, baseNome: b.baseNome })),
  );
});

const equipesDoCoordenador = computed<EquipeStatus[]>(() => {
  const coordenador = authStore.user?.coordenador;
  if (!coordenador) return [];
  const coordenadorLower = coordenador.toLowerCase();
  return (resposta.value?.bases ?? []).flatMap((b) =>
    b.equipes.filter((e) => (e.coordenador ?? '').toLowerCase() === coordenadorLower).map((e) => ({ ...e, baseNome: b.baseNome })),
  );
});

const equipesBase = computed(() => {
  if (authStore.isAdmin) return baseAtual.value?.equipes ?? [];
  if (authStore.isCoordenador) return equipesDoCoordenador.value;
  return equipesDoSupervisor.value;
});

const mensagemSemEquipes = computed(() => {
  if (authStore.isAdmin) return baseSelecionada.value ? 'Nenhuma equipe cadastrada para essa base.' : 'Selecione uma base.';
  if (authStore.isCoordenador) return 'Nenhuma equipe encontrada para o seu coordenador.';
  return 'Nenhuma equipe encontrada para o seu supervisor.';
});

const equipesComBuscaTipo = computed(() =>
  equipesBase.value.filter((e) => {
    const bateBusca = !busca.value || e.identificador.toLowerCase().includes((busca.value ?? '').toLowerCase());
    const bateTipo = (tipoFiltro.value?.length ?? 0) === 0 || tipoFiltro.value.includes(e.tipo);
    return bateBusca && bateTipo;
  }),
);

const stats = computed(() => ({
  pendente: equipesComBuscaTipo.value.filter((e) => e.status === 'pendente').length,
  no_prazo: equipesComBuscaTipo.value.filter((e) => e.status === 'no_prazo').length,
  atrasado: equipesComBuscaTipo.value.filter((e) => e.status === 'atrasado').length,
  justificado: equipesComBuscaTipo.value.filter((e) => e.status === 'justificado').length,
}));

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

const equipesFiltradas = computed(() =>
  equipesComBuscaTipo.value.filter((e) => (statusFiltro.value?.length ?? 0) === 0 || statusFiltro.value.includes(e.status)),
);

const temFiltroAtivo = computed(() => !!busca.value || (tipoFiltro.value?.length ?? 0) > 0 || (statusFiltro.value?.length ?? 0) > 0);

const colunas = computed<QTableColumn[]>(() => [
  { name: 'identificador', label: 'Equipe', field: 'identificador', align: 'left', sortable: true },
  ...(authStore.isAdmin
    ? []
    : [{ name: 'baseNome', label: 'Base', field: 'baseNome', align: 'left' as const, sortable: true }]),
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left', sortable: true },
  { name: 'supervisao', label: 'Supervisor / Coordenador', field: 'supervisor', align: 'left', sortable: true },
  { name: 'horario', label: 'Horário', field: 'horaSaida', align: 'left', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'left', sortable: true },
  { name: 'acoes', label: '', field: 'equipeId', align: 'right' },
]);

// Diálogo de apontamento
const dialogoAberto = ref(false);
const equipeSelecionada = ref<EquipeStatus | null>(null);
const horaSaida = ref(agoraStr());
const observacao = ref('');
const salvando = ref(false);

// Diálogo de justificativa
const dialogoJustAberto = ref(false);
const equipeJust = ref<EquipeStatus | null>(null);
const tipoJust = ref<'FALTA' | 'ATRASO' | null>(null);
const motivoJust = ref('');
const salvandoJust = ref(false);

function corStatus(status: Status) {
  return { no_prazo: 'positive', atrasado: 'negative', pendente: 'grey-6', justificado: 'info' }[status];
}

function labelStatus(status: Status) {
  return { no_prazo: 'No prazo', atrasado: 'Atrasado', pendente: 'Pendente', justificado: 'Justificado' }[status];
}

function alternarStatus(status: Status) {
  const i = statusFiltro.value.indexOf(status);
  if (i === -1) statusFiltro.value.push(status);
  else statusFiltro.value.splice(i, 1);
}

function limparFiltros() {
  busca.value = '';
  tipoFiltro.value = [];
  statusFiltro.value = [];
}

async function carregarJustificativas() {
  try {
    const { data } = await api.get<Justificativa[]>('/justificativas', { params: { data: dataHoje } });
    const mapa = new Map<number, { tipo: string; motivo: string }>();
    for (const j of data) mapa.set(j.equipe_id, { tipo: j.tipo, motivo: j.motivo });
    justificativas.value = mapa;
  } catch {
    // silencioso — não bloqueia a página
  }
}

let primeiraCarga = true;

async function carregar() {
  carregando.value = true;
  try {
    const { data } = await api.get<MonitoramentoResponse>('/monitoramento', {
      params: { data: dataHoje },
    });
    resposta.value = data;
    if (baseSelecionada.value === null && data.bases.length > 0) {
      baseSelecionada.value = data.bases[0]?.baseId ?? null;
    }
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

function abrirDialogo(equipe: EquipeStatus) {
  equipeSelecionada.value = equipe;
  horaSaida.value = equipe.horaSaida ? equipe.horaSaida.slice(0, 5) : agoraStr();
  observacao.value = equipe.observacao ?? '';
  dialogoAberto.value = true;
}

async function salvar() {
  if (!equipeSelecionada.value) return;
  salvando.value = true;
  try {
    await api.post('/saidas', {
      equipeId: equipeSelecionada.value.equipeId,
      data: dataHoje,
      horaSaida: horaSaida.value,
      observacao: observacao.value || null,
    });
    dialogoAberto.value = false;
    await carregar();
  } finally {
    salvando.value = false;
  }
}

function abrirJustificativa(equipe: EquipeStatus) {
  equipeJust.value = equipe;
  const existente = justificativas.value.get(equipe.equipeId);
  tipoJust.value = (existente?.tipo ?? null) as 'FALTA' | 'ATRASO' | null;
  motivoJust.value = existente?.motivo ?? '';
  dialogoJustAberto.value = true;
}

async function salvarJustificativa() {
  if (!equipeJust.value || !tipoJust.value || !motivoJust.value.trim()) return;
  salvandoJust.value = true;
  try {
    await api.post('/justificativas', {
      equipeId: equipeJust.value.equipeId,
      data: dataHoje,
      tipo: tipoJust.value,
      motivo: motivoJust.value.trim(),
    });
    justificativas.value.set(equipeJust.value.equipeId, { tipo: tipoJust.value, motivo: motivoJust.value.trim() });
    dialogoJustAberto.value = false;
  } finally {
    salvandoJust.value = false;
  }
}

onMounted(async () => {
  await Promise.all([carregar(), carregarJustificativas()]);
});
</script>

<style scoped>
:deep(.row-atrasado)    { border-left: 3px solid var(--q-negative); }
:deep(.row-pendente)    { border-left: 3px solid rgba(158,158,158,0.5); }
:deep(.row-no_prazo)    { border-left: 3px solid var(--q-positive); }
:deep(.row-justificado) { border-left: 3px solid var(--q-info); }
</style>
