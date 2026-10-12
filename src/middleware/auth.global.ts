/**
 * src/middleware/auth.global.ts
 * Глобальный Route Middleware для контроля доступа и авторизации
 */
import { defineNuxtRouteMiddleware, navigateTo } from '#imports';
import { useSessionStore } from '@entities/session';

export default defineNuxtRouteMiddleware((to, _from) => {
  const sessionStore = useSessionStore();

  const isAuthPage = to.path === '/auth' || to.path.startsWith('/auth/');

  // 1. Проверка роли: если роль не 'staff', сбрасываем сессию и блокируем доступ
  if (sessionStore.isAuthenticated && sessionStore.userRole !== 'staff') {
    sessionStore.isAdminForbidden = true;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('baqlike_user_session');
    }
    sessionStore.logout().catch(() => {
      sessionStore.user = null;
      sessionStore.isAuthenticated = false;
    });
    return navigateTo('/auth');
  }

  // 2. Авторизован со статусом staff и переходит на экран логина
  if (sessionStore.isAuthenticated && isAuthPage) {
    return navigateTo('/shift');
  }

  // 3. Не авторизован и пытается зайти на закрытый экран
  if (!sessionStore.isAuthenticated && !isAuthPage) {
    return navigateTo('/auth');
  }
});
