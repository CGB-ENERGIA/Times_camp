<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-gutter-sm q-mb-md">
      <div class="text-h6">Equipes</div>
      <q-select
        v-model="filtroBaseId"
        :options="opcoesBase"
        emit-value
        map-options
        label="Base"
        filled
        dense
        clearable
        style="min-width: 200px"
        @update:model-value="carregar"
      />
      <q-input
        v-model="busca"
        dense
        filled
        clearable
        debounce="150"
        placeholder="Buscar equipe, supervisor..."
        style="min-width: 240px"
      >
        <template #prepend><q-icon name="search" /></template>
      </q-input>
      <q-space />
      <div class="text-caption text-grey-6">{{ equipesFiltradas.length }} equipe(s)</div>
      <q-btn color="primary" icon="add" label="Nova equipe" unelevated @click="abrirNovo" />
    </div>

    <q-table
      :rows="equipesFiltradas"
      :columns="colunas"
      row-key="id"
      :loading="carregando"
      flat
      bordered
      :pagination="{ rowsPerPage: 25, sortBy: 'identificador' }"
      class="equipes-table"
    >
      <!-- Tipo -->
      <template #body-cell-tipo="props">
        <q-td :props="props" class="celula-editavel">
          <q-badge outline color="grey-6" :label="props.row.tipo" />
          <q-popup-edit
            :model-value="props.row.tipo"
            buttons
            label-set="Salvar"
            label-cancel="Cancelar"
            @save="(val) => salvarCampo(props.row, 'tipo', val)"
          >
            <template #default="scope">
              <q-select
                v-model="scope.value"
                :options="tipos"
                label="Tipo"
                dense
                autofocus
              />
            </template>
          </q-popup-edit>
        </q-td>
      </template>

      <!-- Horário -->
      <template #body-cell-horario="props">
        <q-td :props="props" class="celula-editavel">
          {{ props.row.horario_padrao_saida?.slice(0, 5) }}
          <q-popup-edit
            :model-value="props.row.horario_padrao_saida?.slice(0, 5)"
            buttons
            label-set="Salvar"
            label-cancel="Cancelar"
            @save="(val) => salvarCampo(props.row, 'horarioPadrao', val)"
          >
            <template #default="scope">
              <q-input
                v-model="scope.value"
                type="time"
                label="Horário de saída"
                dense
                autofocus
              />
            </template>
          </q-popup-edit>
        </q-td>
      </template>

      <!-- Supervisor -->
      <template #body-cell-supervisor="props">
        <q-td :props="props" class="celula-editavel">
          <span :class="props.row.supervisor ? '' : 'text-grey-5'">
            {{ props.row.supervisor || '—' }}
          </span>
          <q-popup-edit
            :model-value="props.row.supervisor ?? ''"
            buttons
            label-set="Salvar"
            label-cancel="Cancelar"
            @save="(val) => salvarCampo(props.row, 'supervisor', val)"
          >
            <template #default="scope">
              <q-input
                v-model="scope.value"
                label="Supervisor"
                dense
                autofocus
                hint="Nome exato (ex: MIKEIAS)"
              />
            </template>
          </q-popup-edit>
        </q-td>
      </template>

      <!-- Coordenador -->
      <template #body-cell-coordenador="props">
        <q-td :props="props" class="celula-editavel">
          <span :class="props.row.coordenador ? '' : 'text-grey-5'">
            {{ props.row.coordenador || '—' }}
          </span>
          <q-popup-edit
            :model-value="props.row.coordenador ?? ''"
            buttons
            label-set="Salvar"
            label-cancel="Cancelar"
            @save="(val) => salvarCampo(props.row, 'coordenador', val)"
          >
            <template #default="scope">
              <q-input
                v-model="scope.value"
                label="Coordenador"
                dense
                autofocus
                hint="Nome exato (ex: RICARDO)"
              />
            </template>
          </q-popup-edit>
        </q-td>
      </template>

      <!-- Status -->
      <template #body-cell-ativo="props">
        <q-td :props="props">
          <q-badge
            :color="props.row.ativo ? 'positive' : 'grey-6'"
            :label="props.row.ativo ? 'Ativa' : 'Inativa'"
          />
        </q-td>
      </template>

      <!-- Ações -->
      <template #body-cell-acoes="props">
        <q-td :props="props">
          <q-btn flat dense round icon="edit" size="sm" @click="abrirEdicao(props.row)">
            <q-tooltip>Editar todos os campos</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <template #no-data>
        <div class="full-width text-center text-grey-6 q-pa-lg">Nenhuma equipe encontrada.</div>
      </template>
    </q-table>

    <!-- Dica de edição inline -->
    <div class="text-caption text-grey-6 q-mt-sm">
      <q-icon name="info" size="14px" /> Clique em qualquer célula de Tipo, Horário, Supervisor ou Coordenador para editar diretamente.
    </div>

    <!-- Diálogo completo (nova equipe ou edição avançada) -->
    <q-dialog v-model="dialogoAberto">
      <q-card style="width: 380px; max-width: 90vw">
        <q-card-section>
          <div class="text-subtitle1">{{ editando ? 'Editar equipe' : 'Nova equipe' }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select
            v-model="forma.baseId"
            :options="opcoesBase"
            emit-value
            map-options
            label="Base"
            filled
            :disable="!!editando"
          />
          <q-select v-model="forma.tipo" :options="tipos" label="Tipo" filled />
          <q-input v-model="forma.identificador" label="Nome da equipe (ex: MA-BCB-D001M)" filled :disable="!!editando" />
          <q-input v-model="forma.horarioPadrao" label="Horário de saída padrão" type="time" filled />
          <q-input v-model="forma.supervisor" label="Supervisor" filled />
          <q-input v-model="forma.coordenador" label="Coordenador" filled />
          <q-toggle v-if="editando" v-model="forma.ativo" label="Ativa" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn color="primary" label="Salvar" :loading="salvando" @click="salvar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import type { QTableColumn } from 'quasar';
import { api } from '@/boot/axios';

interface Equipe {
  id: number;
  base_id: number;
  tipo: string;
  identificador: string;
  horario_padrao_saida: string;
  supervisor: string | null;
  coordenador: string | null;
  ativo: boolean;
}

interface Base {
  id: number;
  nome: string;
}

const tipos = ['GERE', 'GOMAN', 'GSTC'];
const $q = useQuasar();

const equipes = ref<Equipe[]>([]);
const opcoesBase = ref<Array<{ label: string; value: number }>>([]);
const filtroBaseId = ref<number | null>(null);
const busca = ref('');
const carregando = ref(false);
const dialogoAberto = ref(false);
const editando = ref<Equipe | null>(null);
const salvando = ref(false);
const forma = ref({
  baseId: null as number | null,
  tipo: 'GERE',
  identificador: '',
  horarioPadrao: '08:30',
  supervisor: '',
  coordenador: '',
  ativo: true,
});

const equipesFiltradas = computed(() => {
  const q = busca.value.toLowerCase().trim();
  if (!q) return equipes.value;
  return equipes.value.filter(
    (e) =>
      e.identificador.toLowerCase().includes(q) ||
      (e.supervisor ?? '').toLowerCase().includes(q) ||
      (e.coordenador ?? '').toLowerCase().includes(q) ||
      e.tipo.toLowerCase().includes(q),
  );
});

const colunas: QTableColumn[] = [
  { name: 'identificador', label: 'Equipe', field: 'identificador', align: 'left', sortable: true },
  {
    name: 'base',
    label: 'Base',
    field: (row: Equipe) => opcoesBase.value.find((b) => b.value === row.base_id)?.label ?? '-',
    align: 'left',
    sortable: true,
  },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left', sortable: true },
  {
    name: 'horario',
    label: 'Horário',
    field: (row: Equipe) => row.horario_padrao_saida?.slice(0, 5),
    align: 'left',
    sortable: true,
  },
  { name: 'supervisor', label: 'Supervisor', field: 'supervisor', align: 'left', sortable: true },
  { name: 'coordenador', label: 'Coordenador', field: 'coordenador', align: 'left', sortable: true },
  { name: 'ativo', label: 'Status', field: 'ativo', align: 'left' },
  { name: 'acoes', label: '', field: 'id', align: 'right' },
];

async function carregarBases() {
  const { data } = await api.get<Base[]>('/bases');
  opcoesBase.value = data.map((b) => ({ label: b.nome, value: b.id }));
}

async function carregar() {
  carregando.value = true;
  try {
    const { data } = await api.get<Equipe[]>('/equipes', {
      params: { baseId: filtroBaseId.value || undefined },
    });
    equipes.value = data;
  } finally {
    carregando.value = false;
  }
}

async function salvarCampo(equipe: Equipe, campo: string, valor: string) {
  try {
    const payload: Record<string, string | boolean | null> = {
      tipo: equipe.tipo,
      identificador: equipe.identificador,
      horarioPadrao: equipe.horario_padrao_saida.slice(0, 5),
      supervisor: equipe.supervisor,
      coordenador: equipe.coordenador,
      ativo: equipe.ativo,
      [campo]: valor || null,
    };
    await api.put(`/equipes/${equipe.id}`, payload);
    // Atualiza localmente sem recarregar tudo
    const idx = equipes.value.findIndex((e) => e.id === equipe.id);
    if (idx !== -1) {
      const atualizado: Equipe = { ...equipes.value[idx]! };
      if (campo === 'horarioPadrao') {
        atualizado.horario_padrao_saida = valor;
      } else {
        (atualizado as unknown as Record<string, unknown>)[campo] = valor || null;
      }
      equipes.value[idx] = atualizado;
    }
    $q.notify({ type: 'positive', message: 'Salvo!', timeout: 1200 });
  } catch {
    $q.notify({ type: 'negative', message: 'Erro ao salvar. Tente novamente.' });
  }
}

function abrirNovo() {
  editando.value = null;
  forma.value = {
    baseId: filtroBaseId.value,
    tipo: 'GERE',
    identificador: '',
    horarioPadrao: '08:30',
    supervisor: '',
    coordenador: '',
    ativo: true,
  };
  dialogoAberto.value = true;
}

function abrirEdicao(equipe: Equipe) {
  editando.value = equipe;
  forma.value = {
    baseId: equipe.base_id,
    tipo: equipe.tipo,
    identificador: equipe.identificador,
    horarioPadrao: equipe.horario_padrao_saida.slice(0, 5),
    supervisor: equipe.supervisor ?? '',
    coordenador: equipe.coordenador ?? '',
    ativo: equipe.ativo,
  };
  dialogoAberto.value = true;
}

async function salvar() {
  salvando.value = true;
  try {
    if (editando.value) {
      await api.put(`/equipes/${editando.value.id}`, {
        tipo: forma.value.tipo,
        identificador: forma.value.identificador,
        horarioPadrao: forma.value.horarioPadrao,
        supervisor: forma.value.supervisor || null,
        coordenador: forma.value.coordenador || null,
        ativo: forma.value.ativo,
      });
    } else {
      await api.post('/equipes', {
        baseId: forma.value.baseId,
        tipo: forma.value.tipo,
        identificador: forma.value.identificador,
        horarioPadrao: forma.value.horarioPadrao,
        supervisor: forma.value.supervisor || null,
        coordenador: forma.value.coordenador || null,
      });
    }
    dialogoAberto.value = false;
    await carregar();
  } finally {
    salvando.value = false;
  }
}

onMounted(async () => {
  await carregarBases();
  await carregar();
});
</script>

<style scoped>
.celula-editavel {
  cursor: pointer;
  position: relative;
}

.celula-editavel:hover::after {
  content: '✏';
  font-size: 10px;
  margin-left: 4px;
  opacity: 0.5;
}

:deep(.equipes-table .q-table tbody td) {
  padding-top: 6px;
  padding-bottom: 6px;
}
</style>
