<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-gutter-sm q-mb-md">
      <div class="text-h6">Usuários</div>
      <q-space />
      <q-input
        v-model="busca"
        dense
        filled
        clearable
        debounce="150"
        placeholder="Buscar usuário..."
        style="min-width: 240px"
      >
        <template #prepend><q-icon name="search" /></template>
      </q-input>
      <q-btn color="primary" icon="add" label="Novo usuário" unelevated @click="abrirNovo" />
    </div>

    <q-table :rows="usuariosFiltrados" :columns="colunas" row-key="id" :loading="carregando" flat bordered>
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
            :options="['admin', 'tecnico', 'coordenador', 'visualizador']"
            label="Perfil"
            filled
          />
          <q-select
            v-if="forma.role === 'tecnico'"
            v-model="forma.supervisores"
            :options="opcoesSupervisor"
            label="Supervisores"
            hint="Acesso a todas as equipes desses supervisores"
            filled
            multiple
            use-chips
          />
          <q-select
            v-if="forma.role === 'tecnico'"
            v-model="forma.equipesIds"
            :options="opcoesEquipe"
            emit-value
            map-options
            label="Equipes específicas (opcional)"
            hint="Acesso a equipes individuais, além dos supervisores"
            filled
            multiple
            use-chips
            use-input
            input-debounce="0"
            :filter-fn="filtrarEquipes"
          />
          <q-select
            v-if="forma.role === 'coordenador'"
            v-model="forma.coordenadores"
            :options="opcoesCoordenador"
            label="Coordenadores"
            hint="O coordenador verá e apontará equipes de todos os coordenadores selecionados"
            filled
            multiple
            use-chips
          />
          <q-input
            v-model="forma.senha"
            :label="editando ? 'Nova senha (deixe em branco para manter)' : 'Senha'"
            :type="mostrarSenha ? 'text' : 'password'"
            filled
          >
            <template #append>
              <q-icon
                :name="mostrarSenha ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="mostrarSenha = !mostrarSenha"
              />
            </template>
          </q-input>
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
import { ref, computed, onMounted } from 'vue';
import type { QTableColumn } from 'quasar';
import { useQuasar } from 'quasar';
import axios from 'axios';
import { api } from '@/boot/axios';

type Role = 'admin' | 'tecnico' | 'coordenador' | 'visualizador';

interface Usuario {
  id: number;
  nome: string;
  usuario: string;
  role: Role;
  base_id: number | null;
  supervisor: string | null;
  coordenador: string | null;
  supervisores: string[];
  coordenadores: string[];
  equipes_ids: number[];
  ativo: boolean;
}

interface Equipe {
  id: number;
  tipo: string;
  identificador: string;
  supervisor: string | null;
  coordenador: string | null;
  ativo: boolean;
}

const $q = useQuasar();

const usuarios = ref<Usuario[]>([]);
const busca = ref('');

const usuariosFiltrados = computed(() => {
  const q = busca.value.toLowerCase().trim();
  if (!q) return usuarios.value;
  return usuarios.value.filter(
    (u) =>
      u.nome.toLowerCase().includes(q) ||
      u.usuario.toLowerCase().includes(q) ||
      u.supervisores?.some((s) => s.toLowerCase().includes(q)) ||
      u.coordenadores?.some((c) => c.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q),
  );
});
const opcoesSupervisor = ref<string[]>([]);
const opcoesCoordenador = ref<string[]>([]);
const opcoesEquipe = ref<Array<{ label: string; value: number }>>([]);
const todasOpcoesEquipe = ref<Array<{ label: string; value: number }>>([]);
const carregando = ref(false);
const dialogoAberto = ref(false);
const editando = ref<Usuario | null>(null);
const salvando = ref(false);
const mostrarSenha = ref(false);
const forma = ref({
  nome: '',
  usuario: '',
  role: 'tecnico' as Role,
  supervisores: [] as string[],
  coordenadores: [] as string[],
  equipesIds: [] as number[],
  senha: '',
  ativo: true,
});

const colunas: QTableColumn[] = [
  { name: 'nome', label: 'Nome', field: 'nome', align: 'left', sortable: true },
  { name: 'usuario', label: 'Usuário', field: 'usuario', align: 'left', sortable: true },
  { name: 'role', label: 'Perfil', field: 'role', align: 'left' },
  {
    name: 'supervisor',
    label: 'Supervisores',
    field: (row: Usuario) => row.supervisores?.join(', ') || row.supervisor || '-',
    align: 'left',
    sortable: true,
  },
  {
    name: 'coordenador',
    label: 'Coordenadores',
    field: (row: Usuario) => row.coordenadores?.join(', ') || row.coordenador || '-',
    align: 'left',
    sortable: true,
  },
  { name: 'ativo', label: 'Status', field: 'ativo', align: 'left' },
  { name: 'acoes', label: '', field: 'id', align: 'right' },
];

const ROTULOS_PERFIL: Record<Role, string> = { admin: 'Admin', tecnico: 'Técnico', coordenador: 'Coordenador', visualizador: 'Visualizador' };
const CORES_PERFIL: Record<Role, string> = { admin: 'purple', tecnico: 'primary', coordenador: 'teal', visualizador: 'orange' };

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
  const lista = data
    .filter((e) => e.ativo)
    .map((e) => ({ label: `${e.identificador} · ${e.tipo}${e.supervisor ? ' · ' + e.supervisor : ''}`, value: e.id }))
    .sort((a, b) => a.label.localeCompare(b.label));
  todasOpcoesEquipe.value = lista;
  opcoesEquipe.value = lista;
}

function filtrarEquipes(val: string, update: (fn: () => void) => void) {
  update(() => {
    const q = val.toLowerCase();
    opcoesEquipe.value = q
      ? todasOpcoesEquipe.value.filter((e) => e.label.toLowerCase().includes(q))
      : todasOpcoesEquipe.value;
  });
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
  mostrarSenha.value = false;
  opcoesEquipe.value = todasOpcoesEquipe.value;
  forma.value = { nome: '', usuario: '', role: 'tecnico', supervisores: [], coordenadores: [], equipesIds: [], senha: '', ativo: true };
  dialogoAberto.value = true;
}

function abrirEdicao(usuario: Usuario) {
  editando.value = usuario;
  mostrarSenha.value = false;
  opcoesEquipe.value = todasOpcoesEquipe.value;
  forma.value = {
    nome: usuario.nome,
    usuario: usuario.usuario,
    role: usuario.role,
    supervisores: usuario.supervisores?.length ? [...usuario.supervisores] : (usuario.supervisor ? [usuario.supervisor] : []),
    coordenadores: usuario.coordenadores?.length ? [...usuario.coordenadores] : (usuario.coordenador ? [usuario.coordenador] : []),
    equipesIds: [...(usuario.equipes_ids ?? [])],
    senha: '',
    ativo: usuario.ativo,
  };
  dialogoAberto.value = true;
}

async function salvar() {
  if (forma.value.role === 'tecnico' && forma.value.supervisores.length === 0) {
    $q.notify({ type: 'negative', message: 'Selecione pelo menos um supervisor para o técnico.' });
    return;
  }
  if (forma.value.role === 'coordenador' && forma.value.coordenadores.length === 0) {
    $q.notify({ type: 'negative', message: 'Selecione pelo menos um coordenador.' });
    return;
  }

  salvando.value = true;
  try {
    if (editando.value) {
      await api.put(`/usuarios/${editando.value.id}`, {
        nome: forma.value.nome,
        role: forma.value.role,
        supervisores: forma.value.role === 'tecnico' ? forma.value.supervisores : [],
        coordenadores: forma.value.role === 'coordenador' ? forma.value.coordenadores : [],
        equipesIds: forma.value.equipesIds,
        ativo: forma.value.ativo,
        senha: forma.value.senha || undefined,
      });
    } else {
      await api.post('/usuarios', {
        nome: forma.value.nome,
        usuario: forma.value.usuario,
        senha: forma.value.senha,
        role: forma.value.role,
        supervisores: forma.value.supervisores,
        coordenadores: forma.value.coordenadores,
        equipesIds: forma.value.equipesIds,
      });
    }
    dialogoAberto.value = false;
    await carregar();
  } catch (err) {
    const message = axios.isAxiosError(err) ? (err.response?.data as { error?: string })?.error : undefined;
    $q.notify({ type: 'negative', message: message || 'Não foi possível salvar o usuário.' });
  } finally {
    salvando.value = false;
  }
}

onMounted(async () => {
  await carregarSupervisores();
  await carregar();
});
</script>
