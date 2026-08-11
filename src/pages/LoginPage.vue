<template>
  <q-layout>
    <q-page-container>
      <q-page class="login-page">
        <div class="brand-side" aria-hidden="true">
          <img src="@/assets/logo.ico" alt="" class="brand-logo-giant" />
        </div>

        <div class="form-side">
          <div class="tilt-stage">
            <div ref="cardEl" class="login-card" @mousemove="onCardMouseMove" @mouseleave="onCardMouseLeave">
              <div class="card-spotlight" />

              <div class="brand-row">
                <img src="@/assets/logo.ico" alt="CGB Engenharia" class="brand-row-logo" />
                <span ref="wordmarkEl" class="brand-row-word">TIMETRACK</span>
              </div>

              <template v-if="lembrado && !trocandoUsuario">
                <div class="welcome-row">
                  <div class="avatar-circle" :style="{ background: avatarBg }">{{ iniciais }}</div>
                  <h2 class="welcome-title">
                    Bem-vindo de volta,<br />
                    <span class="welcome-name">{{ primeiroNome }}</span>
                  </h2>
                </div>

                <q-form class="login-form" @submit.prevent="onSubmit">
                  <div class="form-field">
                    <q-input
                      v-model="senha"
                      label="Senha"
                      :type="mostrarSenha ? 'text' : 'password'"
                      filled
                      dark
                      dense
                      autofocus
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
                  </div>

                  <div class="form-field">
                    <q-checkbox v-model="lembrarDispositivo" label="Lembrar de mim" dense dark />
                  </div>

                  <div v-if="erro" class="form-field text-negative text-caption">{{ erro }}</div>

                  <div class="form-field">
                    <q-btn
                      ref="btnEl"
                      type="submit"
                      label="Entrar"
                      class="full-width login-btn"
                      :loading="carregando"
                      unelevated
                    >
                      <span class="btn-shine" />
                    </q-btn>
                  </div>
                </q-form>

                <div class="switch-row">
                  <a href="#" class="switch-link" @click.prevent="trocarUsuario">
                    Não é {{ primeiroNome }}? Entrar com outro usuário
                  </a>
                </div>
              </template>

              <template v-else>
                <h2 class="welcome-title welcome-title-plain">Acessar o painel</h2>
                <div class="tags-row">
                  <span
                    v-for="(tag, i) in tags"
                    :key="tag"
                    class="tag-chip"
                    :style="{ animationDelay: `${0.5 + i * 0.1}s` }"
                  >
                    {{ tag }}
                  </span>
                </div>

                <q-form class="login-form" @submit.prevent="onSubmit">
                  <div class="form-field">
                    <q-input
                      v-model="usuario"
                      label="Usuário"
                      filled
                      dark
                      dense
                      autofocus
                      :rules="[(val) => !!val || 'Informe o usuário']"
                    />
                  </div>

                  <div class="form-field">
                    <q-input
                      v-model="senha"
                      label="Senha"
                      :type="mostrarSenha ? 'text' : 'password'"
                      filled
                      dark
                      dense
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
                  </div>

                  <div class="form-field">
                    <q-checkbox v-model="lembrarDispositivo" label="Lembrar de mim neste dispositivo" dense dark />
                  </div>

                  <div v-if="erro" class="form-field text-negative text-caption">{{ erro }}</div>

                  <div class="form-field">
                    <q-btn
                      ref="btnEl"
                      type="submit"
                      label="Entrar"
                      class="full-width login-btn"
                      :loading="carregando"
                      unelevated
                    >
                      <span class="btn-shine" />
                    </q-btn>
                  </div>
                </q-form>

                <div v-if="lembrado" class="switch-row">
                  <a href="#" class="switch-link" @click.prevent="cancelarTroca">Voltar</a>
                </div>
              </template>
            </div>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { isAxiosError } from 'axios';
import gsap from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { useAuthStore } from '@/stores/auth';

gsap.registerPlugin(ScrambleTextPlugin);

const STORAGE_KEY = 'tc_login_lembrado';
const AVATAR_COLORS = ['#1976d2', '#00b8d4', '#7c4dff', '#0d9488', '#2563eb'];

interface LembradoUsuario {
  usuario: string;
  nome: string;
}

const tags = ['GERE', 'GOMAN', 'GSTC'];

const usuario = ref('');
const senha = ref('');
const erro = ref('');
const carregando = ref(false);
const mostrarSenha = ref(false);
const lembrarDispositivo = ref(true);

const lembrado = ref<LembradoUsuario | null>(null);
const trocandoUsuario = ref(false);

const primeiroNome = computed(() => lembrado.value?.nome.split(' ')[0] ?? '');
const iniciais = computed(() => {
  if (!lembrado.value) return '';
  const partes = lembrado.value.nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
  return (primeira + ultima).toUpperCase();
});
const avatarBg = computed(() => {
  const nome = lembrado.value?.nome ?? '';
  let hash = 0;
  for (const char of nome) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const cor = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return `linear-gradient(135deg, ${cor}, #0d1a30)`;
});

const cardEl = ref<HTMLElement | null>(null);
const wordmarkEl = ref<HTMLElement | null>(null);
const btnEl = ref<{ $el: HTMLElement } | null>(null);

const authStore = useAuthStore();
const router = useRouter();

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let quickRotateX: ((v: number) => void) | undefined;
let quickRotateY: ((v: number) => void) | undefined;
let quickSpotX: ((v: number) => void) | undefined;
let quickSpotY: ((v: number) => void) | undefined;

function onCardMouseMove(e: MouseEvent) {
  if (reduceMotion || !cardEl.value) return;
  const rect = cardEl.value.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width;
  const py = (e.clientY - rect.top) / rect.height;

  quickRotateY?.((px - 0.5) * 6);
  quickRotateX?.((0.5 - py) * 6);
  quickSpotX?.(px * 100);
  quickSpotY?.(py * 100);
}

function onCardMouseLeave() {
  quickRotateX?.(0);
  quickRotateY?.(0);
}

function carregarLembrado() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const dados = JSON.parse(raw) as LembradoUsuario;
    if (dados?.usuario && dados?.nome) {
      lembrado.value = dados;
      usuario.value = dados.usuario;
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function trocarUsuario() {
  trocandoUsuario.value = true;
  usuario.value = '';
  senha.value = '';
  erro.value = '';
}

function cancelarTroca() {
  trocandoUsuario.value = false;
  usuario.value = lembrado.value?.usuario ?? '';
  senha.value = '';
  erro.value = '';
}

onMounted(async () => {
  carregarLembrado();
  await nextTick();

  if (reduceMotion) return;

  quickRotateX = gsap.quickTo(cardEl.value, 'rotateX', { duration: 0.5, ease: 'power3.out' });
  quickRotateY = gsap.quickTo(cardEl.value, 'rotateY', { duration: 0.5, ease: 'power3.out' });
  quickSpotX = gsap.quickTo(cardEl.value, '--spot-x', { duration: 0.4, ease: 'power2.out' });
  quickSpotY = gsap.quickTo(cardEl.value, '--spot-y', { duration: 0.4, ease: 'power2.out' });

  const fieldEls = cardEl.value?.querySelectorAll('.form-field') ?? [];

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from(cardEl.value, { opacity: 0, x: 24, duration: 0.6 }).from(
    fieldEls,
    { opacity: 0, y: 14, duration: 0.35, stagger: 0.08 },
    '-=0.25',
  );

  if (wordmarkEl.value) {
    gsap.to(wordmarkEl.value, {
      duration: 1,
      scrambleText: { text: 'TIMETRACK', chars: 'upperAndLowerCase', speed: 0.4 },
      delay: 0.3,
    });
  }

  const shine = btnEl.value?.$el?.querySelector('.btn-shine');
  if (shine) {
    gsap.set(shine, { x: '-120%' });
    gsap.to(shine, { x: '220%', duration: 1.1, ease: 'power2.inOut', repeat: -1, repeatDelay: 2.4, delay: 1.5 });
  }
});

async function onSubmit() {
  erro.value = '';
  carregando.value = true;
  try {
    await authStore.login(usuario.value, senha.value);

    if (lembrarDispositivo.value && authStore.user) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ usuario: authStore.user.usuario, nome: authStore.user.nome }),
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    if (cardEl.value) {
      await gsap.to(cardEl.value, { opacity: 0, scale: 0.97, duration: 0.25, ease: 'power1.in' });
    }
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
    if (cardEl.value) {
      gsap.fromTo(cardEl.value, { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
    }
  } finally {
    carregando.value = false;
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  align-items: center;
  background: linear-gradient(160deg, #0b1220 0%, #10203a 45%, #0d1a30 100%);
}

/* Metade esquerda: só a logo, fixa, sem nenhuma animação */
.brand-side {
  flex: 1 1 55%;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 3vh 3vw;
  min-width: 0;
  min-height: 0;
}

/* Só a altura é fixa (em vh) — a largura fica em auto, então a proporção
   original da logo nunca é esticada, só encolhe/cresce junto com a tela. */
.brand-logo-giant {
  height: min(48vh, 420px);
  width: auto;
  filter: drop-shadow(0 20px 50px rgba(0, 0, 0, 0.5));
}

.form-side {
  flex: 1 1 45%;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 0;
  padding: 2vh 4vw 2vh 0;
}

.tilt-stage {
  perspective: 1200px;
}

.login-card {
  position: relative;
  width: 380px;
  max-width: 90vw;
  max-height: 96dvh;
  overflow: hidden;
  padding: clamp(18px, 3.5vh, 32px) clamp(20px, 3vw, 32px) clamp(16px, 3vh, 28px);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transform-style: preserve-3d;
  --spot-x: 50;
  --spot-y: 50;
}

.card-spotlight {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    circle at calc(var(--spot-x) * 1%) calc(var(--spot-y) * 1%),
    rgba(127, 215, 255, 0.14),
    transparent 55%
  );
}

.brand-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: clamp(12px, 2.5vh, 24px);
}

.brand-row-logo {
  height: 26px;
  width: auto;
}

.brand-row-word {
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  min-width: 9ch;
}

.welcome-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: clamp(12px, 2.5vh, 22px);
}

.avatar-circle {
  flex: none;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
}

.welcome-title {
  position: relative;
  margin: 0 0 clamp(10px, 2.5vh, 20px);
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.85);
}

.welcome-title-plain {
  margin-bottom: 4px;
}

.welcome-name {
  font-size: 1.3rem;
  color: #fff;
}

.tags-row {
  position: relative;
  display: flex;
  gap: 6px;
  margin-bottom: clamp(12px, 2.5vh, 22px);
}

.tag-chip {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #9fd3ff;
  background: rgba(255, 255, 255, 0.08);
  padding: 3px 9px;
  border-radius: 999px;
  opacity: 0;
  animation: tag-in 0.35s ease-out forwards;
}

@keyframes tag-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-form {
  position: relative;
  text-align: left;
}

.form-field {
  margin-bottom: clamp(10px, 2.2vh, 16px);
}

.form-field:last-child {
  margin-bottom: 0;
}

.login-form :deep(.q-field__control) {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}

.login-btn {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #1976d2, #00b8d4);
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: 0.03em;
  animation: btn-pulse 2.8s ease-in-out infinite;
}

@keyframes btn-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(0, 184, 212, 0.35);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(0, 184, 212, 0);
  }
}

.btn-shine {
  position: absolute;
  top: 0;
  left: 0;
  width: 40%;
  height: 100%;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  transform: translateX(-120%);
  pointer-events: none;
}

.switch-row {
  position: relative;
  margin-top: clamp(10px, 2.2vh, 16px);
  text-align: center;
}

.switch-link {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
}

.switch-link:hover {
  text-decoration: underline;
  color: #9fd3ff;
}

@media (max-width: 900px) {
  .brand-side {
    display: none;
  }
  .form-side {
    flex: 1 1 100%;
    padding: 6vw;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-btn,
  .tag-chip {
    animation: none !important;
  }
}
</style>
