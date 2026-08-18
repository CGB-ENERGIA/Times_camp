import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { public: true },
  },

  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', component: () => import('@/pages/MonitoramentoPage.vue') },
      {
        path: 'apontamento',
        component: () => import('@/pages/ApontamentoPage.vue'),
        meta: { roles: ['tecnico', 'admin', 'coordenador'] }, // visualizador excluído
      },
      { path: 'historico', component: () => import('@/pages/HistoricoPage.vue') },
      {
        path: 'admin/bases',
        component: () => import('@/pages/admin/BasesPage.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'admin/equipes',
        component: () => import('@/pages/admin/EquipesPage.vue'),
        meta: { roles: ['admin'] },
      },
      {
        path: 'admin/usuarios',
        component: () => import('@/pages/admin/UsuariosPage.vue'),
        meta: { roles: ['admin'] },
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
];

export default routes;
