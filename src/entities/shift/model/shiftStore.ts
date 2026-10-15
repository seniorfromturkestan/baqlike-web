/**
 * src/entities/shift/model/shiftStore.ts
 * Pinia-стор активной смены сотрудника с персистентностью
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { doc, setDoc, type Unsubscribe } from 'firebase/firestore';
import { getFirebaseFirestore } from '@shared/api';
import type { ShiftUi } from '@shared/types';
import { parseToTimestamp } from '@shared/lib/date';
import { useSessionStore } from '@entities/session';
import { fetchShiftById, findActiveUserShift, subscribeToShift } from '../api/shiftApi';

export const useShiftStore = defineStore('shift', () => {
  const activeShift = ref<ShiftUi | null>(null);
  const currentShift = activeShift;
  const shiftHistory = ref<ShiftUi[]>([]);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  let shiftUnsubscribe: Unsubscribe | null = null;

  // ==========================================
  // Геттеры
  // ==========================================

  const isShiftActive = computed<boolean>(() => {
    if (!activeShift.value) return false;
    return activeShift.value.status === 'open' || !activeShift.value.status;
  });

  const isOpen = computed<boolean>(() => isShiftActive.value);

  const workedDurationMs = computed<number>(() => {
    if (!activeShift.value?.checkIn) return 0;
    const start = parseToTimestamp(activeShift.value.checkIn);
    if (!start) return 0;
    const end = activeShift.value.checkOut ? parseToTimestamp(activeShift.value.checkOut) : Date.now();
    return Math.max(0, (end || Date.now()) - start);
  });

  const shiftId = computed<string | null>(() => {
    return activeShift.value?.id || null;
  });

  // ==========================================
  // Вспомогательный сброс shift_id у пользователя
  // ==========================================

  const resetUserShift = async () => {
    activeShift.value = null;
    const sessionStore = useSessionStore();
    sessionStore.setShiftId(null);
    if (sessionStore.user) {
      sessionStore.user.shiftId = null;
      (sessionStore.user as any).shift_id = null;
    }
    const userId = sessionStore.user?.id;
    if (userId) {
      try {
        const firestore = getFirebaseFirestore();
        await setDoc(doc(firestore, 'Users', userId), { shift_id: null }, { merge: true });
      } catch (err) {
        console.warn('[ShiftStore] Failed to reset shift_id in Users:', err);
      }
    }
  };

  // ==========================================
  // Действия (Actions)
  // ==========================================

  const loadShift = async (shopId: string, shiftId: string): Promise<ShiftUi | null> => {
    if (!shopId || !shiftId) return null;

    loading.value = true;
    error.value = null;
    try {
      const shift = await fetchShiftById(shopId, shiftId);
      if (shift && (shift.status === 'open' || !shift.status) && !shift.checkOut) {
        activeShift.value = shift;
      }
      return shift;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки смены';
      error.value = message;
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Восстановление и real-time синхронизация смены из профиля пользователя.
   * Если документ не найден или статус !== 'open' — сбрасывает shift_id в Users и сторе.
   */
  const syncShiftFromUser = async (shopId: string, userShiftId?: string | null): Promise<void> => {
    if (!shopId || !userShiftId) {
      activeShift.value = null;
      return;
    }

    if (shiftUnsubscribe) {
      shiftUnsubscribe();
      shiftUnsubscribe = null;
    }

    // 1. Прямая загрузка из Firestore
    const shift = await loadShift(shopId, userShiftId);

    // Если документ не найден и нет локально установленной смены с этим id
    if (!shift) {
      if (activeShift.value?.id !== userShiftId) {
        await resetUserShift();
      }
      return;
    }

    // Если смена закрыта
    if (shift.status === 'closed' || shift.checkOut) {
      await resetUserShift();
      return;
    }

    activeShift.value = shift;

    // 2. Real-time подписка на изменения документа смены
    shiftUnsubscribe = subscribeToShift(shopId, userShiftId, async (updatedShift) => {
      if (updatedShift && (updatedShift.status === 'open' || !updatedShift.status) && !updatedShift.checkOut) {
        activeShift.value = updatedShift;
      } else if (updatedShift && (updatedShift.status === 'closed' || updatedShift.checkOut)) {
        await resetUserShift();
      }
    });
  };

  const loadActiveUserShift = async (shopId: string, userId: string): Promise<ShiftUi | null> => {
    if (!shopId || !userId) return null;

    loading.value = true;
    error.value = null;
    try {
      const shift = await findActiveUserShift(shopId, userId);
      if (shift && shift.status === 'open') {
        activeShift.value = shift;
      } else {
        activeShift.value = null;
      }
      return shift;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка поиска смены';
      error.value = message;
      return null;
    } finally {
      loading.value = false;
    }
  };

  const setActiveShift = (shift: ShiftUi | null) => {
    activeShift.value = shift;
  };

  const clearActiveShift = () => {
    if (shiftUnsubscribe) {
      shiftUnsubscribe();
      shiftUnsubscribe = null;
    }
    activeShift.value = null;
  };

  return {
    activeShift,
    currentShift,
    shiftHistory,
    loading,
    error,
    isOpen,
    isShiftActive,
    workedDurationMs,
    shiftId,
    loadShift,
    syncShiftFromUser,
    loadActiveUserShift,
    setActiveShift,
    clearActiveShift
  };
}, {
  persist: true
});
