import { watch } from 'vue';
import { useDark, useToggle } from '@vueuse/core';

export const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  valueLight: '',
  storageKey: 'baqlike-color-scheme'
});

export const updateTelegramTheme = (isDarkVal: boolean) => {
  if (typeof window === 'undefined') return;
  const tg = (window as any).Telegram?.WebApp;
  if (!tg) return;
  try {
    if (typeof tg.setHeaderColor === 'function') {
      tg.setHeaderColor(isDarkVal ? '#0B132B' : '#FFFFFF');
    }
    if (typeof tg.setBackgroundColor === 'function') {
      tg.setBackgroundColor(isDarkVal ? '#0B132B' : '#F8FAFC');
    }
  } catch (e) {
    console.warn('[Telegram] Theme update error:', e);
  }
};

watch(
  isDark,
  (val) => {
    updateTelegramTheme(val);
  },
  { immediate: true }
);

export const toggleTheme = useToggle(isDark);

export const useAppTheme = () => {
  return {
    isDark,
    toggleTheme,
    updateTelegramTheme
  };
};
