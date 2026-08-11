<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn ref="menuBtnEl" flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <img
          src="@/assets/logo.ico"
          alt="CGB Engenharia"
          class="q-mx-sm"
          style="height: 32px; width: auto"
        />

        <q-toolbar-title> TimeTrack </q-toolbar-title>

        <div class="q-mr-md text-caption">
          {{ authStore.user?.nome }}
          <q-badge outline color="white" class="q-ml-xs">
            {{ rotuloPerfil }}
          </q-badge>
        </div>
        <q-btn
          flat
          dense
          round
          :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
          :aria-label="$q.dark.isActive ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
          @click="toggleDarkMode"
        />
        <q-btn flat dense round icon="logout" aria-label="Sair" @click="onLogout" />
      </q-toolbar>
    </q-header>

    <q-drawer ref="drawerEl" v-model="leftDrawerOpen" bordered>
      <q-list ref="navListEl">
        <q-item-label header>Navegação</q-item-label>

        <q-item to="/" exact clickable v-ripple>
          <q-item-section avatar><q-icon name="dashboard" /></q-item-section>
          <q-item-section>Monitoramento</q-item-section>
        </q-item>

        <q-item
          v-if="authStore.isTecnico || authStore.isAdmin || authStore.isCoordenador"
          to="/apontamento"
          clickable
          v-ripple
        >
          <q-item-section avatar><q-icon name="edit_calendar" /></q-item-section>
          <q-item-section>Apontamento</q-item-section>
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
      <router-view v-slot="{ Component }">
        <transition
          mode="out-in"
          :css="false"
          @enter="onPageEnter"
          @leave="onPageLeave"
        >
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import gsap from 'gsap';
import { useAuthStore } from '@/stores/auth';
import { DARK_MODE_STORAGE_KEY } from '@/boot/dark-mode';

const authStore = useAuthStore();
const router = useRouter();
const $q = useQuasar();

const rotuloPerfil = computed(() => {
  const rotulos: Record<string, string> = { admin: 'Admin', tecnico: 'Técnico', coordenador: 'Coordenador' };
  return rotulos[authStore.user?.role ?? ''] ?? '';
});

// Aberto por padrão no desktop; fechado no mobile (onde ele cobre a tela toda).
const leftDrawerOpen = ref($q.screen.gt.sm);

const navListEl = ref<{ $el: HTMLElement } | null>(null);
const drawerEl = ref<{ $el: HTMLElement } | null>(null);
const menuBtnEl = ref<{ $el: HTMLElement } | null>(null);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

// No modo "reveal" (desktop), o QDrawer empurra o conteúdo em vez de flutuar
// por cima — por isso não existe backdrop nativo pra fechar ao clicar fora.
// Detectamos manualmente: clicou fora do drawer e fora do botão de menu? Fecha.
function onDocumentClick(e: MouseEvent) {
  if (!leftDrawerOpen.value) return;
  if ($q.screen.lt.md) return; // no mobile o Quasar já usa overlay com backdrop nativo
  const alvo = e.target as Node;
  const drawerNode = drawerEl.value?.$el;
  const botaoNode = menuBtnEl.value?.$el;
  if (drawerNode?.contains(alvo) || botaoNode?.contains(alvo)) return;
  leftDrawerOpen.value = false;
}

function onPageEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.28, ease: 'power1.out', onComplete: done },
  );
}

function onPageLeave(el: Element, done: () => void) {
  gsap.to(el, { opacity: 0, y: -6, duration: 0.16, ease: 'power1.in', onComplete: done });
}

function toggleDarkMode() {
  $q.dark.toggle();
  localStorage.setItem(DARK_MODE_STORAGE_KEY, $q.dark.isActive ? 'dark' : 'light');
}

onMounted(() => {
  const items = navListEl.value?.$el?.querySelectorAll('.q-item');
  if (items?.length) {
    gsap.from(items, {
      opacity: 0,
      x: -12,
      duration: 0.35,
      stagger: 0.05,
      ease: 'power1.out',
    });
  }
  document.addEventListener('click', onDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick);
});

async function onLogout() {
  await authStore.logout();
  await router.push('/login');
}
</script>
