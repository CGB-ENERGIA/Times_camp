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
          <q-badge :color="corPerfil(props.row.role)" :label="rotuloPerfil(props.row.role)" />
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
            :options="['admin', 'tecnico', 'coordenador']"
            label="Perfil"
            filled
            :disable="!!editando"
          />
          <q-select
            v-if="forma.role === 'tecnico'"
            v-model="forma.supervisor"
            :options="opcoesSupervisor"
            label="Supervisor"
            hint="O técnico só verá e apontará as equipes desse supervisor"
            filled
          />
          <q-select
            v-if="forma.role === 'coordenador'"
            v-model="forma.coordenador"
            :options="opcoesCoordenador"
            label="Coordenador"
            hint="O coordenador só verá e apontará as equipes desse coordenador"
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

type Role = 'admin' | 'tecnico' | 'coordenador';

interface Usuario {
  id: number;
  nome: string;
  usuario: string;
  role: Role;
  base_id: number | null;
  supervisor: string | null;
  coordenador: string | null;
  ativo: boolean;
}

interface Equipe {
  supervisor: string | null;
  coordenador: string | null;
}

const usuarios = ref<Usuario[]>([]);
const opcoesSupervisor = ref<string[]>([]);
const opcoesCoordenador = ref<string[]>([]);
const carregando = ref(false);
const dialogoAberto = ref(false);
const editando = ref<Usuario | null>(null);
const salvando = ref(false);
const forma = ref({
  nome: '',
  usuario: '',
  role: 'tecnico' as Role,
  supervisor: null as string | null,
  coordenador: null as string | null,
  senha: '',
  ativo: true,
});

const colunas: QTableColumn[] = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left', sortable: true },
  { name: 'usuario', label: 'Usuário', field: 'usuario', align: 'left', sortable: true },
  { name: 'role', label: 'Perfil', field: 'role', align: 'left' },
  { name: 'supervisor', label: 'Supervisor', field: 'supervisor', align: 'left', sortable: true },
  { name: 'coordenador', label: 'Coordenador', field: 'coordenador', align: 'left', sortable: true },
  { name: 'ativo', label: 'Status', field: 'ativo', align: 'left' },
  { name: 'acoes', label: '', field: 'id', align: 'right' },
];

const ROTULOS_PERFIL: Record<Role, string> = { admin: 'Admin', tecnico: 'Técnico', coordenador: 'Coordenador' };
const CORES_PERFIL: Record<Role, string> = { admin: 'purple', tecnico: 'primary', coordenador: 'teal' };

function rotuloPerfil(role: Role) {
  return ROTULOS_PERFIL[role];
}

function corPerfil(role: Role) {
  return CORES_PERFIL[role];
}

async function carregarSupervisores() {
  const { data } = await api.get<Equipe[]>('/equipes');
  opcoesSupervisor.value = [...new Set(data.map((e) => e.supervisor).filter((v): v is string => !!v))].sort();
  opcoesCoordenador.value = [...new Set(data.map((e) => e.coordenador).filter((v): v is string => !!v))].sort();
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
  forma.value = { nome: '', usuario: '', role: 'tecnico', supervisor: null, coordenador: null, senha: '', ativo: true };
  dialogoAberto.value = true;
}

function abrirEdicao(usuario: Usuario) {
  editando.value = usuario;
  forma.value = {
    nome: usuario.nome,
    usuario: usuario.usuario,
    role: usuario.role,
    supervisor: usuario.supervisor,
    coordenador: usuario.coordenador,
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
        supervisor: forma.value.role === 'tecnico' ? forma.value.supervisor : null,
        coordenador: forma.value.role === 'coordenador' ? forma.value.coordenador : null,
        ativo: forma.value.ativo,
        senha: forma.value.senha || undefined,
      });
    } else {
      await api.post('/usuarios', {
        nome: forma.value.nome,
        usuario: forma.value.usuario,
        senha: forma.value.senha,
        role: forma.value.role,
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
  await carregarSupervisores();
  await carregar();
});
</script>
