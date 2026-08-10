<template>
  <q-layout>
    <q-page-container>
      <q-page class="flex flex-center bg-grey-2">
        <q-card style="width: 360px; max-width: 90vw" bordered>
          <q-card-section class="text-center q-pb-none">
            <div class="text-h6">Saída de Equipes</div>
            <div class="text-caption text-grey-7">LM · LV · PODA · TAT</div>
          </q-card-section>

          <q-card-section>
            <q-form class="q-gutter-md" @submit.prevent="onSubmit">
              <q-input
                v-model="usuario"
                label="Usuário"
                filled
                autofocus
                :rules="[(val) => !!val || 'Informe o usuário']"
              />
              <q-input
                v-model="senha"
                label="Senha"
                :type="mostrarSenha ? 'text' : 'password'"
                filled
                :rules="[(val) => !!val || 'Informe a senha']"
              >
                <template #append>
                  <q-icon
                    :name="mostrarSenha ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="mostrarSenha = !mostrarSenha"
                  />
                </template>
              </q-input>

              <div v-if="erro" class="text-negative text-caption">{{ erro }}</div>

              <q-btn
                type="submit"
                color="primary"
                label="Entrar"
                class="full-width"
                :loading="carregando"
                unelevated
              />
            </q-form>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { isAxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth';

const usuario = ref('');
const senha = ref('');
const erro = ref('');
const carregando = ref(false);
const mostrarSenha = ref(false);

const authStore = useAuthStore();
const router = useRouter();

async function onSubmit() {
  erro.value = '';
  carregando.value = true;
  try {
    await authStore.login(usuario.value, senha.value);
    await router.push('/');
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 401) {
        erro.value = 'Usuário ou senha inválidos';
      } else if (err.response) {
        erro.value = (err.response.data as { error?: string })?.error || `Erro do servidor (${err.response.status})`;
      } else {
        erro.value = 'Não foi possível conectar à API. Ela está rodando? (bun run dev:api ou vercel dev)';
      }
    } else {
      erro.value = 'Erro inesperado ao entrar';
    }
  } finally {
    carregando.value = false;
  }
}
</script>
