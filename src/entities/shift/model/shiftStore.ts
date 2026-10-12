/**
 * src/entities/shift/model/shiftStore.ts
 * Pinia-стор активной смены бариста с персистентностью
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ShiftUi } from '@shared/types';
import { parseToTimestamp } from '@shared/lib/date';
import { fetchShiftById, findActiveUserShift, subscribeToShift } from '../api/shiftApi';
import type { Unsubscribe } from 'firebase/firestore';

export const useShiftStore = defineStore('shift', () => {
  const activeShift = ref<ShiftUi | null>(null);
  const shiftHistory = ref<ShiftUi[]>([]);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  let shiftUnsubscribe: Unsubscribe | null = null;

  // ==========================================
  // Геттеры
  // ==========================================

  const isOpen = computed<boolean>(() => {
    return Boolean(activeShift.value?.checkIn && !activeShift.value?.checkOut);
  });

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
  // Действия (Actions)
  // ==========================================

  const loadShift = async (shopId: string, shiftId: string): Promise<ShiftUi | null> => {
    if (!shopId || !shiftId) return null;

    loading.value = true;
    error.value = null;
    try {
      const shift = await fetchShiftById(shopId, shiftId);
      if (shift) {
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
   * Восстановление и real-time синхронизация смены из профиля пользователя
   */
  const syncShiftFromUser = async (shopId: string, userShiftId?: string | null): Promise<void> => {
    if (!shopId || !userShiftId) return;

    if (shiftUnsubscribe) {
      shiftUnsubscribe();
      shiftUnsubscribe = null;
    }

    // 1. Прямая загрузка из Firestore
    await loadShift(shopId, userShiftId);

    // 2. Real-time подписка на изменения документа смены
    shiftUnsubscribe = subscribeToShift(shopId, userShiftId, (updatedShift) => {
      if (updatedShift) {
        activeShift.value = updatedShift;
      } else {
        activeShift.value = null;
      }
    });
  };

  const loadActiveUserShift = async (shopId: string, userId: string): Promise<ShiftUi | null> => {
    if (!shopId || !userId) return null;

    loading.value = true;
    error.value = null;
    try {
      const shift = await findActiveUserShift(shopId, userId);
      if (shift) {
        activeShift.value = shift;
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
    shiftHistory,
    loading,
    error,
    isOpen,
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
