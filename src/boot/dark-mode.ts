import { defineBoot } from '#q-app';
import { Dark } from 'quasar';

export const DARK_MODE_STORAGE_KEY = 'tc_dark_mode';

export default defineBoot(() => {
  const salvo = localStorage.getItem(DARK_MODE_STORAGE_KEY);
  if (salvo === 'light') {
    Dark.set(false);
  } else if (salvo === 'dark') {
    Dark.set(true);
  }
  // sem preferência salva: mantém o padrão definido em quasar.config.ts (escuro)
});
