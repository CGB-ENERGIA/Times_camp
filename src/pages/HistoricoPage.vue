<template>
  <q-page class="q-pa-md">
    <div class="text-h6 q-mb-md">Histórico de Saídas</div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-3">
        <q-select
          v-model="filtroBaseId"
          :options="opcoesBase"
          emit-value
          map-options
          label="Base"
          filled
          dense
          clearable
          @update:model-value="carregar"
        />
      </div>
      <div class="col-12 col-sm-3">
        <q-input v-model="dataInicio" type="date" label="De" filled dense @update:model-value="carregar" />
      </div>
      <div class="col-12 col-sm-3">
        <q-input v-model="dataFim" type="date" label="Até" filled dense @update:model-value="carregar" />
      </div>
      <div class="col-12 col-sm-3 flex items-center">
        <q-btn flat dense icon="refresh" :loading="carregando" @click="carregar" />
      </div>
    </div>

    <q-table
      :rows="registros"
      :columns="colunas"
      row-key="id"
      :loading="carregando"
      flat
      bordered
      :pagination="{ rowsPerPage: 20 }"
    >
      <template #body-cell-status="props">
        <q-td :props="props">
          <q-badge :color="corStatus(props.row)" :label="labelStatus(props.row)" />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { QTableColumn } from 'quasar';
import { api } from '@/boot/axios';

interface Registro {
  id: number;
  equipe_id: number;
  identificador: string;
  tipo: string;
  base_id: number;
  base_nome: string;
  data: string;
  hora_saida: string;
  observacao: string | null;
  registrado_por_nome: string;
}

interface BaseOpcao {
  id: number;
  nome: string;
}

const registros = ref<Registro[]>([]);
const opcoesBase = ref<Array<{ label: string; value: number }>>([]);
const filtroBaseId = ref<number | null>(null);
const dataInicio = ref('');
const dataFim = ref('');
const carregando = ref(false);

const colunas: QTableColumn[] = [
  { name: 'data', label: 'Data', field: 'data', align: 'left', sortable: true },
  { name: 'base_nome', label: 'Base', field: 'base_nome', align: 'left', sortable: true },
  {
    name: 'equipe',
    label: 'Equipe',
    field: (row: Registro) => `${row.tipo} · ${row.identificador}`,
    align: 'left',
  },
  {
    name: 'hora_saida',
    label: 'Hora de Saída',
    field: (row: Registro) => row.hora_saida?.slice(0, 5),
    align: 'left',
  },
  { name: 'status', label: 'Status', field: 'hora_saida', align: 'left' },
  { name: 'registrado_por_nome', label: 'Registrado por', field: 'registrado_por_nome', align: 'left' },
  { name: 'observacao', label: 'Observação', field: 'observacao', align: 'left' },
];

function corStatus(row: Registro) {
  return row.hora_saida <= '08:30:00' ? 'positive' : 'negative';
}

function labelStatus(row: Registro) {
  return row.hora_saida <= '08:30:00' ? 'No prazo' : 'Atrasado';
}

async function carregarBases() {
  const { data } = await api.get<BaseOpcao[]>('/bases');
  opcoesBase.value = data.map((b) => ({ label: b.nome, value: b.id }));
}

async function carregar() {
  carregando.value = true;
  try {
    const { data } = await api.get<Registro[]>('/saidas', {
      params: {
        baseId: filtroBaseId.value || undefined,
        dataInicio: dataInicio.value || undefined,
        dataFim: dataFim.value || undefined,
      },
    });
    registros.value = data;
  } finally {
    carregando.value = false;
  }
}

onMounted(async () => {
  await carregarBases();
  await carregar();
});
</script>
