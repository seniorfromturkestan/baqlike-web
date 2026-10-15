/**
 * src/plugins/telegram.client.ts
 * Инициализация Telegram WebApp: растягивание на весь экран, настройка цветов,
 * защита от случайного закрытия и свайпов вниз.
 */
import { isDark, updateTelegramTheme } from '@shared/lib';

export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return;

  const tg = (window as any).Telegram?.WebApp;
  if (!tg) return;

  try {
    tg.ready();
    tg.expand();

    // Определение платформы: на Android системная панель Telegram перекрывает хедер
    if (tg.platform === 'android') {
      document.documentElement.classList.add('platform-android');
    }

    // Защита от схлопывания при свайпе вниз (Telegram 7.7+)
    if (typeof tg.disableVerticalSwipes === 'function') {
      tg.disableVerticalSwipes();
    }

    // Подтверждение закрытия приложения
    if (typeof tg.enableClosingConfirmation === 'function') {
      tg.enableClosingConfirmation();
    }

    // Синхронизация цветов шапки и фона с текущей темой
    updateTelegramTheme(isDark.value);
  } catch (err) {
    console.warn('[Telegram WebApp] Init warning:', err);
  }
});
