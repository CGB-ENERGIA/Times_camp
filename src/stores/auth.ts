import { defineStore } from 'pinia';
import { api } from '@/boot/axios';

export type Role = 'admin' | 'tecnico' | 'coordenador' | 'visualizador';

export interface Usuario {
  id: number;
  usuario: string;
  nome: string;
  role: Role;
  baseId: number | null;
  supervisor: string | null;
  coordenador: string | null;
  supervisores: string[];
  coordenadores: string[];
  equipesIds: number[];
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as Usuario | null,
    ready: false,
  }),

  getters: {
    isAuthenticated: (state) => state.user !== null,
    isAdmin: (state) => state.user?.role === 'admin',
    isTecnico: (state) => state.user?.role === 'tecnico',
    isCoordenador: (state) => state.user?.role === 'coordenador',
    isVisualizador: (state) => state.user?.role === 'visualizador',
  },

  actions: {
    async fetchMe() {
      try {
        const { data } = await api.get<Usuario>('/auth/me');
        this.user = data;
      } catch {
        this.user = null;
      } finally {
        this.ready = true;
      }
    },

    async login(usuario: string, senha: string) {
      const { data } = await api.post<Usuario>('/auth/login', { usuario, senha });
      this.user = data;
    },

    async logout() {
      await api.post('/auth/logout');
      this.user = null;
    },
  },
});
