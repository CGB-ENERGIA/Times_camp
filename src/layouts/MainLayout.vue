<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title> Saída de Equipes </q-toolbar-title>

        <div class="q-mr-md text-caption">
          {{ authStore.user?.nome }}
          <q-badge outline color="white" class="q-ml-xs">
            {{ authStore.user?.role === 'admin' ? 'Admin' : 'Técnico' }}
          </q-badge>
        </div>
        <q-btn flat dense round icon="logout" aria-label="Sair" @click="onLogout" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header>Navegação</q-item-label>

        <q-item to="/" exact clickable v-ripple>
          <q-item-section avatar><q-icon name="dashboard" /></q-item-section>
          <q-item-section>Monitoramento</q-item-section>
        </q-item>

        <q-item v-if="authStore.isTecnico" to="/lancar-saida" clickable v-ripple>
          <q-item-section avatar><q-icon name="directions_walk" /></q-item-section>
          <q-item-section>Lançar Saída</q-item-section>
        </q-item>

        <q-item to="/historico" clickable v-ripple>
          <q-item-section avatar><q-icon name="history" /></q-item-section>
          <q-item-section>Histórico</q-item-section>
        </q-item>

        <template v-if="authStore.isAdmin">
          <q-separator class="q-my-sm" />
          <q-item-label header>Administração</q-item-label>

          <q-item to="/admin/bases" clickable v-ripple>
            <q-item-section avatar><q-icon name="apartment" /></q-item-section>
            <q-item-section>Bases</q-item-section>
          </q-item>

          <q-item to="/admin/equipes" clickable v-ripple>
            <q-item-section avatar><q-icon name="groups" /></q-item-section>
            <q-item-section>Equipes</q-item-section>
          </q-item>

          <q-item to="/admin/usuarios" clickable v-ripple>
            <q-item-section avatar><q-icon name="badge" /></q-item-section>
            <q-item-section>Usuários</q-item-section>
          </q-item>
        </template>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const leftDrawerOpen = ref(false);
const authStore = useAuthStore();
const router = useRouter();

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

async function onLogout() {
  await authStore.logout();
  await router.push('/login');
}
</script>
