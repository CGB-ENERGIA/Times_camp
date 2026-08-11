<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-gutter-md q-mb-md">
      <div class="text-h6">Equipes</div>
      <q-select
        v-model="filtroBaseId"
        :options="opcoesBase"
        emit-value
        map-options
        label="Filtrar por base"
        filled
        dense
        clearable
        style="min-width: 220px"
        @update:model-value="carregar"
      />
      <q-space />
      <q-btn color="primary" icon="add" label="Nova equipe" unelevated @click="abrirNovo" />
    </div>

    <q-table :rows="equipes" :columns="colunas" row-key="id" :loading="carregando" flat bordered>
      <template #body-cell-ativo="props">
        <q-td :props="props">
          <q-badge :color="props.row.ativo ? 'positive' : 'grey-6'" :label="props.row.ativo ? 'Ativa' : 'Inativa'" />
        </q-td>
      </template>
      <template #body-cell-acoes="props">
        <q-td :props="props">
          <q-btn flat dense round icon="edit" @click="abrirEdicao(props.row)" />
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="dialogoAberto">
      <q-card style="width: 360px; max-width: 90vw">
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
          <q-input v-model="forma.identificador" label="Nome da equipe (ex: MA-BCB-D001M)" filled />
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
import { ref, onMounted } from 'vue';
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

const equipes = ref<Equipe[]>([]);
const opcoesBase = ref<Array<{ label: string; value: number }>>([]);
const filtroBaseId = ref<number | null>(null);
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

const colunas: QTableColumn[] = [
  { name: 'identificador', label: 'Nome', field: 'identificador', align: 'left', sortable: true },
  {
    name: 'base',
    label: 'Base',
    field: (row: Equipe) => opcoesBase.value.find((b) => b.value === row.base_id)?.label ?? row.base_id,
    align: 'left',
  },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left', sortable: true },
  {
    name: 'horario_padrao_saida',
    label: 'Horário de Saída',
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
        supervisor: forma.value.supervisor,
        coordenador: forma.value.coordenador,
        ativo: forma.value.ativo,
      });
    } else {
      await api.post('/equipes', {
        baseId: forma.value.baseId,
        tipo: forma.value.tipo,
        identificador: forma.value.identificador,
        horarioPadrao: forma.value.horarioPadrao,
        supervisor: forma.value.supervisor,
        coordenador: forma.value.coordenador,
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
