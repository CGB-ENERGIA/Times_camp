<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h6">Bases</div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nova base" unelevated @click="abrirNovo" />
    </div>

    <q-table :rows="bases" :columns="colunas" row-key="id" :loading="carregando" flat bordered>
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
          <div class="text-subtitle1">{{ editando ? 'Editar base' : 'Nova base' }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="forma.nome" label="Nome" filled />
          <q-input v-model="forma.codigo" label="Código" filled />
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

interface Base {
  id: number;
  nome: string;
  codigo: string;
  ativo: boolean;
}

const bases = ref<Base[]>([]);
const carregando = ref(false);
const dialogoAberto = ref(false);
const editando = ref<Base | null>(null);
const salvando = ref(false);
const forma = ref({ nome: '', codigo: '', ativo: true });

const colunas: QTableColumn[] = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left', sortable: true },
  { name: 'codigo', label: 'Código', field: 'codigo', align: 'left', sortable: true },
  { name: 'ativo', label: 'Status', field: 'ativo', align: 'left' },
  { name: 'acoes', label: '', field: 'id', align: 'right' },
];

async function carregar() {
  carregando.value = true;
  try {
    const { data } = await api.get<Base[]>('/bases');
    bases.value = data;
  } finally {
    carregando.value = false;
  }
}

function abrirNovo() {
  editando.value = null;
  forma.value = { nome: '', codigo: '', ativo: true };
  dialogoAberto.value = true;
}

function abrirEdicao(base: Base) {
  editando.value = base;
  forma.value = { nome: base.nome, codigo: base.codigo, ativo: base.ativo };
  dialogoAberto.value = true;
}

async function salvar() {
  salvando.value = true;
  try {
    if (editando.value) {
      await api.put(`/bases/${editando.value.id}`, forma.value);
    } else {
      await api.post('/bases', { nome: forma.value.nome, codigo: forma.value.codigo });
    }
    dialogoAberto.value = false;
    await carregar();
  } finally {
    salvando.value = false;
  }
}

onMounted(() => void carregar());
</script>
