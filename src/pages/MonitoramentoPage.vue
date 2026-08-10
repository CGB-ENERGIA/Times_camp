<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-gutter-md q-mb-md">
      <div class="text-h6">Monitoramento de Saída</div>
      <q-space />
      <div class="text-caption text-grey-7">Limite: {{ resposta?.limiteSaida ?? '08:30' }}</div>
      <q-input v-model="data" type="date" dense filled style="width: 170px" @update:model-value="carregar" />
      <q-btn round dense flat icon="refresh" :loading="carregando" @click="carregar" />
    </div>

    <div v-if="!carregando && bases.length === 0" class="text-grey-6 q-mt-xl text-center">
      Nenhuma base cadastrada ainda.
    </div>

    <div class="row q-col-gutter-md">
      <div v-for="base in bases" :key="base.baseId" class="col-12 col-md-6 col-lg-4">
        <q-card bordered>
          <q-card-section class="row items-center">
            <div class="text-subtitle1">{{ base.baseNome }}</div>
            <q-space />
            <q-badge :color="resumo(base).cor" :label="resumo(base).texto" />
          </q-card-section>

          <q-separator />

          <q-list separator>
            <q-item v-for="equipe in base.equipes" :key="equipe.equipeId">
              <q-item-section>
                <q-item-label>{{ equipe.tipo }} · {{ equipe.identificador }}</q-item-label>
                <q-item-label caption v-if="equipe.horaSaida">
                  Saiu às {{ equipe.horaSaida.slice(0, 5) }}
                  <span v-if="equipe.registradoPor"> · {{ equipe.registradoPor }}</span>
                </q-item-label>
                <q-item-label caption v-else>Ainda sem registro</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge :color="corStatus(equipe.status)" :label="labelStatus(equipe.status)" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { api } from '@/boot/axios';
import { hojeStr } from '@/utils/date';

type Status = 'no_prazo' | 'atrasado' | 'pendente';

interface EquipeStatus {
  equipeId: number;
  tipo: string;
  identificador: string;
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
  limiteSaida: string;
  bases: BaseStatus[];
}

const data = ref(hojeStr());
const resposta = ref<MonitoramentoResponse | null>(null);
const carregando = ref(false);
const bases = computed(() => resposta.value?.bases ?? []);

function corStatus(status: Status) {
  return { no_prazo: 'positive', atrasado: 'negative', pendente: 'grey-6' }[status];
}

function labelStatus(status: Status) {
  return { no_prazo: 'No prazo', atrasado: 'Atrasado', pendente: 'Pendente' }[status];
}

function resumo(base: BaseStatus) {
  const total = base.equipes.length;
  const atrasadas = base.equipes.filter((e) => e.status === 'atrasado').length;
  const pendentes = base.equipes.filter((e) => e.status === 'pendente').length;
  if (atrasadas > 0) return { cor: 'negative', texto: `${atrasadas} atrasada(s)` };
  if (pendentes > 0) return { cor: 'grey-6', texto: `${pendentes} pendente(s)` };
  return { cor: 'positive', texto: total > 0 ? 'Tudo em dia' : 'Sem equipes' };
}

async function carregar() {
  carregando.value = true;
  try {
    const { data: resp } = await api.get<MonitoramentoResponse>('/monitoramento', {
      params: { data: data.value },
    });
    resposta.value = resp;
  } finally {
    carregando.value = false;
  }
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
