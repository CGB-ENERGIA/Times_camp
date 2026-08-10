<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-gutter-md q-mb-md">
      <div class="text-h6">Lançar Saída — {{ baseNome }}</div>
      <q-space />
      <div class="text-caption text-grey-7">{{ dataHoje }}</div>
      <q-btn round dense flat icon="refresh" :loading="carregando" @click="carregar" />
    </div>

    <q-list bordered separator v-if="equipes.length > 0">
      <q-item v-for="equipe in equipes" :key="equipe.equipeId">
        <q-item-section>
          <q-item-label>{{ equipe.tipo }} · {{ equipe.identificador }}</q-item-label>
          <q-item-label caption v-if="equipe.horaSaida">
            Saiu às {{ equipe.horaSaida.slice(0, 5) }}
            <span v-if="equipe.observacao"> · {{ equipe.observacao }}</span>
          </q-item-label>
          <q-item-label caption v-else>Sem registro hoje</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-badge :color="corStatus(equipe.status)" :label="labelStatus(equipe.status)" class="q-mr-sm" />
          <q-btn
            :label="equipe.horaSaida ? 'Editar' : 'Registrar saída'"
            :color="equipe.horaSaida ? 'grey-8' : 'primary'"
            dense
            unelevated
            @click="abrirDialogo(equipe)"
          />
        </q-item-section>
      </q-item>
    </q-list>

    <div v-else-if="!carregando" class="text-grey-6 q-mt-xl text-center">
      Nenhuma equipe cadastrada para a sua base.
    </div>

    <q-dialog v-model="dialogoAberto">
      <q-card style="width: 360px; max-width: 90vw">
        <q-card-section>
          <div class="text-subtitle1">
            {{ equipeSelecionada?.tipo }} · {{ equipeSelecionada?.identificador }}
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
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api } from '@/boot/axios';
import { useAuthStore } from '@/stores/auth';
import { hojeStr, agoraStr } from '@/utils/date';

type Status = 'no_prazo' | 'atrasado' | 'pendente';

interface EquipeStatus {
  equipeId: number;
  tipo: string;
  identificador: string;
  horaSaida: string | null;
  observacao: string | null;
  status: Status;
}

interface MonitoramentoResponse {
  bases: Array<{ baseId: number; baseNome: string; equipes: EquipeStatus[] }>;
}

const authStore = useAuthStore();
const dataHoje = hojeStr();

const equipes = ref<EquipeStatus[]>([]);
const baseNome = ref('');
const carregando = ref(false);

const dialogoAberto = ref(false);
const equipeSelecionada = ref<EquipeStatus | null>(null);
const horaSaida = ref(agoraStr());
const observacao = ref('');
const salvando = ref(false);

function corStatus(status: Status) {
  return { no_prazo: 'positive', atrasado: 'negative', pendente: 'grey-6' }[status];
}

function labelStatus(status: Status) {
  return { no_prazo: 'No prazo', atrasado: 'Atrasado', pendente: 'Pendente' }[status];
}

async function carregar() {
  carregando.value = true;
  try {
    const { data } = await api.get<MonitoramentoResponse>('/monitoramento', {
      params: { data: dataHoje },
    });
    const minhaBase = data.bases.find((b) => b.baseId === authStore.user?.baseId);
    equipes.value = minhaBase?.equipes ?? [];
    baseNome.value = minhaBase?.baseNome ?? '';
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

onMounted(() => void carregar());
</script>
