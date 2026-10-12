/**
 * src/entities/session/model/sessionStore.ts
 * Pinia-стор управления сессией, профилем сотрудника и нативной авторизацией Telegram
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { UserUi } from '@shared/types';
import { getFirebaseAuth } from '@shared/api';
import {
  subscribeAuthState,
  subscribeUserProfile,
  syncUserProfile,
  loginViaTelegramApi,
  loginWithEmailApi,
  signOutApi,
  uploadUserAvatarApi
} from '../api/sessionApi';
import type { Unsubscribe } from 'firebase/firestore';

export const SESSION_STORAGE_KEY = 'baqlike_user_session';

export const useSessionStore = defineStore('session', () => {
  // 1. Синхронное восстановление профиля из localStorage при старте
  const getInitialUser = (): UserUi | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) {
          // Если в кэше оказалась роль администратора — мгновенно очищаем
          if (parsed.role && parsed.role !== 'staff') {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            return null;
          }
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[Session] Failed to parse cached session:', err);
    }
    return null;
  };

  const initialUser = getInitialUser();
  const user = ref<UserUi | null>(initialUser);
  const isAuthenticated = ref<boolean>(Boolean(initialUser?.id));
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const isAccessDenied = ref<boolean>(false);
  const isAdminForbidden = ref<boolean>(false);

  let userUnsubscribe: Unsubscribe | null = null;
  let authUnsubscribe: Unsubscribe | null = null;

  // ==========================================
  // Геттеры
  // ==========================================

  const userRole = computed(() => {
    return user.value?.role || 'staff';
  });

  const assignedShopId = computed(() => {
    return user.value?.coffeeShopId || '1';
  });

  const currentShiftId = computed(() => {
    return user.value?.shiftId || null;
  });

  const userInitials = computed(() => {
    if (!user.value?.name) return 'BK';
    const parts = user.value.name.trim().split(/\s+/);
    const first = parts[0];
    const second = parts[1];
    if (first && second && first[0] && second[0]) {
      return (first[0] + second[0]).toUpperCase();
    }
    return user.value.name.substring(0, 2).toUpperCase();
  });

  // ==========================================
  // Вспомогательные методы сохранения и подписки
  // ==========================================

  const saveSession = (profile: UserUi | null) => {
    if (typeof window === 'undefined') return;
    if (profile) {
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
      } catch (err) {
        console.warn('[Session] Storage set error:', err);
      }
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  const startUserSubscription = (userId: string) => {
    if (userUnsubscribe) {
      userUnsubscribe();
      userUnsubscribe = null;
    }

    userUnsubscribe = subscribeUserProfile(
      userId,
      (updated) => {
        if (updated) {
          if (updated.role && updated.role !== 'staff') {
            user.value = null;
            isAuthenticated.value = false;
            isAdminForbidden.value = true;
            saveSession(null);
            loading.value = false;
            return;
          }
          user.value = updated;
          saveSession(updated);
        }
        loading.value = false;
      },
      (err) => {
        console.warn('[Session] User profile sync error:', err);
        loading.value = false;
      }
    );
  };

  // ==========================================
  // Действия (Actions)
  // ==========================================

  /**
   * Инициализация слушателя сессии при старте приложения
   */
  const initSession = () => {
    // Если сессия уже была восстановлена из localStorage — сразу запускаем подписку
    if (user.value?.id && !userUnsubscribe) {
      startUserSubscription(user.value.id);
    }

    if (authUnsubscribe) return;

    authUnsubscribe = subscribeAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        // Если уже есть пользователь из Telegram или кэша с ID, не перезаписываем дефолтным
        if (!user.value?.id) {
          try {
            const synced = await syncUserProfile(firebaseUser.uid, {
              name: firebaseUser.displayName || 'Staff',
              phone: firebaseUser.phoneNumber || ''
            });
            if (synced.role && synced.role !== 'staff') {
              isAdminForbidden.value = true;
              error.value = 'ROLE_FORBIDDEN_ADMIN';
              await signOutApi();
              user.value = null;
              isAuthenticated.value = false;
              saveSession(null);
              return;
            }
            user.value = synced;
            isAuthenticated.value = true;
            saveSession(synced);
            startUserSubscription(firebaseUser.uid);
          } catch (syncErr) {
            console.warn('[Session] Initial sync error:', syncErr);
          }
        }
      }
    });
  };

  /**
   * Нативная авторизация через Telegram Mini App
   */
  const loginViaTelegram = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
    if (!tgUser || !tgUser.id) {
      return false;
    }

    loading.value = true;
    error.value = null;
    isAccessDenied.value = false;
    isAdminForbidden.value = false;

    try {
      const profile = await loginViaTelegramApi({
        id: Number(tgUser.id),
        username: tgUser.username,
        first_name: tgUser.first_name,
        photo_url: tgUser.photo_url
      });

      if (profile) {
        if (profile.role && profile.role !== 'staff') {
          isAdminForbidden.value = true;
          error.value = 'ROLE_FORBIDDEN_ADMIN';
          return false;
        }
        user.value = profile;
        isAuthenticated.value = true;
        isAccessDenied.value = false;
        isAdminForbidden.value = false;
        saveSession(profile);
        startUserSubscription(profile.id);
        return true;
      } else {
        isAccessDenied.value = true;
        error.value = 'access_denied';
        return false;
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'ROLE_FORBIDDEN_ADMIN') {
        isAdminForbidden.value = true;
        error.value = 'ROLE_FORBIDDEN_ADMIN';
        await signOutApi();
        user.value = null;
        isAuthenticated.value = false;
        saveSession(null);
        return false;
      }
      const msg = err instanceof Error ? err.message : 'Ошибка авторизации Telegram';
      error.value = msg;
      isAccessDenied.value = true;
      return false;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Авторизация через Email и пароль (для входа вне Telegram)
   */
  const loginWithEmail = async (email: string, pass: string): Promise<void> => {
    loading.value = true;
    error.value = null;
    isAccessDenied.value = false;
    isAdminForbidden.value = false;

    try {
      const firebaseUser = await loginWithEmailApi(email, pass);
      const synced = await syncUserProfile(firebaseUser.uid, {
        name: firebaseUser.displayName || email.split('@')[0] || 'Staff'
      });
      if (synced.role && synced.role !== 'staff') {
        isAdminForbidden.value = true;
        error.value = 'ROLE_FORBIDDEN_ADMIN';
        await signOutApi();
        user.value = null;
        isAuthenticated.value = false;
        saveSession(null);
        throw new Error('ROLE_FORBIDDEN_ADMIN');
      }
      user.value = synced;
      isAuthenticated.value = true;
      saveSession(synced);
      startUserSubscription(firebaseUser.uid);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'ROLE_FORBIDDEN_ADMIN') {
        isAdminForbidden.value = true;
        error.value = 'ROLE_FORBIDDEN_ADMIN';
        await signOutApi();
        user.value = null;
        isAuthenticated.value = false;
        saveSession(null);
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Ошибка авторизации';
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Выход из системы с проверкой незакрытой смены
   */
  const logout = async (): Promise<void> => {
    if (user.value?.shiftId) {
      throw new Error('Чтобы выйти вы должны завершить смену');
    }

    loading.value = true;
    try {
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }
      await signOutApi();
      user.value = null;
      isAuthenticated.value = false;
      saveSession(null);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Прямое обновление локального состояния пользователя (при чек-ине/чек-ауте)
   */
  const setShiftId = (shiftId: string | null) => {
    if (user.value) {
      user.value.shiftId = shiftId;
      saveSession(user.value);
    }
  };

  /**
   * Загрузка аватара сотрудника в Storage и синхронизация в сторе
   */
  const uploadAvatar = async (file: File): Promise<string> => {
    if (!user.value?.id) throw new Error('Пользователь не авторизован');
    loading.value = true;
    try {
      const url = await uploadUserAvatarApi(user.value.id, file);
      user.value.avatarUrl = url;
      saveSession(user.value);
      return url;
    } finally {
      loading.value = false;
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    error,
    isAccessDenied,
    isAdminForbidden,
    userRole,
    assignedShopId,
    currentShiftId,
    userInitials,
    initSession,
    loginViaTelegram,
    loginWithEmail,
    logout,
    setShiftId,
    uploadAvatar
  };
});
