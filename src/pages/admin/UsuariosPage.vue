<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h6">Usuários</div>
      <q-space />
      <q-btn color="primary" icon="add" label="Novo usuário" unelevated @click="abrirNovo" />
    </div>

    <q-table :rows="usuarios" :columns="colunas" row-key="id" :loading="carregando" flat bordered>
      <template #body-cell-role="props">
        <q-td :props="props">
          <q-badge :color="props.row.role === 'admin' ? 'purple' : 'primary'" :label="props.row.role === 'admin' ? 'Admin' : 'Técnico'" />
        </q-td>
      </template>
      <template #body-cell-ativo="props">
        <q-td :props="props">
          <q-badge :color="props.row.ativo ? 'positive' : 'grey-6'" :label="props.row.ativo ? 'Ativo' : 'Inativo'" />
        </q-td>
      </template>
      <template #body-cell-acoes="props">
        <q-td :props="props">
          <q-btn flat dense round icon="edit" @click="abrirEdicao(props.row)" />
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="dialogoAberto">
      <q-card style="width: 380px; max-width: 90vw">
        <q-card-section>
          <div class="text-subtitle1">{{ editando ? 'Editar usuário' : 'Novo usuário' }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="forma.nome" label="Nome" filled />
          <q-input v-model="forma.usuario" label="Usuário (login)" filled :disable="!!editando" />
          <q-select
            v-model="forma.role"
            :options="['admin', 'tecnico']"
            label="Perfil"
            filled
            :disable="!!editando"
          />
          <q-select
            v-if="forma.role === 'tecnico'"
            v-model="forma.baseId"
            :options="opcoesBase"
            emit-value
            map-options
            label="Base"
            filled
          />
          <q-input
            v-model="forma.senha"
            :label="editando ? 'Nova senha (deixe em branco para manter)' : 'Senha'"
            type="password"
            filled
          />
          <q-toggle v-if="editando" v-model="forma.ativo" label="Ativo" />
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

interface Usuario {
  id: number;
  nome: string;
  usuario: string;
  role: 'admin' | 'tecnico';
  base_id: number | null;
  ativo: boolean;
}

interface Base {
  id: number;
  nome: string;
}

const usuarios = ref<Usuario[]>([]);
const opcoesBase = ref<Array<{ label: string; value: number }>>([]);
const carregando = ref(false);
const dialogoAberto = ref(false);
const editando = ref<Usuario | null>(null);
const salvando = ref(false);
const forma = ref({
  nome: '',
  usuario: '',
  role: 'tecnico' as 'admin' | 'tecnico',
  baseId: null as number | null,
  senha: '',
  ativo: true,
});

const colunas: QTableColumn[] = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left', sortable: true },
  { name: 'usuario', label: 'Usuário', field: 'usuario', align: 'left', sortable: true },
  { name: 'role', label: 'Perfil', field: 'role', align: 'left' },
  {
    name: 'base',
    label: 'Base',
    field: (row: Usuario) => opcoesBase.value.find((b) => b.value === row.base_id)?.label ?? '—',
    align: 'left',
  },
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
    const { data } = await api.get<Usuario[]>('/usuarios');
    usuarios.value = data;
  } finally {
    carregando.value = false;
  }
}

function abrirNovo() {
  editando.value = null;
  forma.value = { nome: '', usuario: '', role: 'tecnico', baseId: null, senha: '', ativo: true };
  dialogoAberto.value = true;
}

function abrirEdicao(usuario: Usuario) {
  editando.value = usuario;
  forma.value = {
    nome: usuario.nome,
    usuario: usuario.usuario,
    role: usuario.role,
    baseId: usuario.base_id,
    senha: '',
    ativo: usuario.ativo,
  };
  dialogoAberto.value = true;
}

async function salvar() {
  salvando.value = true;
  try {
    if (editando.value) {
      await api.put(`/usuarios/${editando.value.id}`, {
        nome: forma.value.nome,
        baseId: forma.value.role === 'tecnico' ? forma.value.baseId : null,
        ativo: forma.value.ativo,
        senha: forma.value.senha || undefined,
      });
    } else {
      await api.post('/usuarios', {
        nome: forma.value.nome,
        usuario: forma.value.usuario,
        senha: forma.value.senha,
        role: forma.value.role,
        baseId: forma.value.baseId,
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
