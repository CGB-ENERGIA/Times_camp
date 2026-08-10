import { defineBoot } from '#q-app';
import axios, { type AxiosInstance } from 'axios';

const api = axios.create({ baseURL: '/api', withCredentials: true });

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

export default defineBoot(({ app }) => {
  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

export { api };
