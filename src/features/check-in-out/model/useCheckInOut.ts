/**
 * src/features/check-in-out/model/useCheckInOut.ts
 * Бизнес-логика открытия и закрытия смены с нативной геопроверкой 50м и Telegram Haptics
 */
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { showSuccessToast, showFailToast, showToast, showConfirmDialog } from 'vant';
import confetti from 'canvas-confetti';
import { getBrowserLocation, validateCheckInRadius, useTelegramHaptic } from '@shared/lib';
import type { LocationCheckResult } from '@shared/types';
import { useSessionStore } from '@entities/session';
import { useShopStore } from '@entities/shop';
import { useShiftStore, createShiftApi, closeShiftApi } from '@entities/shift';
import { useTaskStore } from '@entities/task';

export const useCheckInOut = () => {
  const { t } = useI18n();
  const sessionStore = useSessionStore();
  const shopStore = useShopStore();
  const shiftStore = useShiftStore();
  const taskStore = useTaskStore();
  const haptic = useTelegramHaptic();

  const isCheckingLocation = ref(false);
  const isOperatingShift = ref(false);
  const lastGeoResult = ref<LocationCheckResult | null>(null);

  /**
   * Сценарий открытия смены (Check-in) — исключительно реальный GPS
   */
  const handleCheckIn = async (): Promise<boolean> => {
    if (!sessionStore.user) {
      haptic.notification('error');
      showFailToast(t('shift.loginRequired'));
      return false;
    }

    isCheckingLocation.value = true;
    try {
      // 1. Убеждаемся, что данные кофейни загружены
      const shopId = sessionStore.assignedShopId || 'shop_astana_1';
      if (!shopStore.currentShop) {
        await shopStore.loadShop(shopId);
      }

      const shopCoords = shopStore.shopCoordinates || { latitude: 51.1282, longitude: 71.4305 };

      // 2. Получаем текущую геопозицию бариста нативным API
      const { coordinates, accuracy } = await getBrowserLocation();

      // Контроль погрешности: если погрешность > 100 метров — предупреждаем
      if (accuracy > 100) {
        showToast({
          message: t('shift.gpsLowAccuracy', { accuracy: Math.round(accuracy) }),
          icon: 'warning-o',
          duration: 3500
        });
      }

      // 3. Проверяем расстояние по формуле гаверсинусов (строгий порог 50м, без моков)
      const validation = validateCheckInRadius(coordinates, shopCoords);
      lastGeoResult.value = { ...validation, accuracy };

      // 4. Валидация допуска
      if (!validation.canCheckIn) {
        haptic.notification('error');
        showFailToast({
          message: t('shift.notInShop', { distance: Math.round(validation.distance) }),
          duration: 3500
        });
        return false;
      }

      // 5. Создание смены в Firestore
      isOperatingShift.value = true;
      const newShiftId = await createShiftApi({
        userId: sessionStore.user.id,
        userName: sessionStore.user.name,
        shopId,
        checkInTimestamp: Date.now(),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      });

      // 6. Обновление локальных сторов
      sessionStore.setShiftId(newShiftId);
      await shiftStore.syncShiftFromUser(shopId, newShiftId);

      haptic.notification('success');
      showSuccessToast(t('shift.shiftStarted'));
      return true;
    } catch (err: unknown) {
      haptic.notification('error');
      const message = err instanceof Error ? err.message : t('shift.gpsError');
      showFailToast(message);
      return false;
    } finally {
      isCheckingLocation.value = false;
      isOperatingShift.value = false;
    }
  };

  /**
   * Сценарий закрытия смены (Check-out)
   */
  const handleCheckOut = async (): Promise<boolean> => {
    // 1. Получаем ID смены из всех доступных источников
    const shiftId =
      shiftStore.shiftId ||
      shiftStore.activeShift?.id ||
      sessionStore.currentShiftId ||
      sessionStore.user?.shiftId;

    if (!shiftId && !shiftStore.isOpen) {
      haptic.notification('error');
      showFailToast(t('shift.noActiveShift'));
      return false;
    }

    const effectiveShiftId = shiftId || sessionStore.user?.shiftId || 'shift_current';
    const userId = sessionStore.user?.id || shiftStore.activeShift?.userId || '';
    const shopId =
      shiftStore.activeShift?.shopId ||
      sessionStore.assignedShopId ||
      shopStore.currentShop?.id ||
      'shop_astana_1';

    // 2. Проверка незакрытых задач и подтверждение через Confirm Dialog
    const pendingCount = taskStore.tasks.filter((t) => t.status !== 'Approved').length;
    haptic.notification('warning');

    try {
      await showConfirmDialog({
        title: t('shift.confirmCloseTitle'),
        message: pendingCount > 0
          ? t('shift.confirmCloseWithPendingTasks', { count: pendingCount })
          : t('shift.confirmCloseClean'),
        confirmButtonText: t('shift.confirmCloseBtn'),
        cancelButtonText: t('shift.cancelClose'),
        confirmButtonColor: '#ef4444'
      });
    } catch {
      // Пользователь отменил закрытие смены («Остаться»)
      return false;
    }

    isOperatingShift.value = true;
    try {
      const { coordinates } = await getBrowserLocation().catch(() => ({
        coordinates: { latitude: 0, longitude: 0 },
        accuracy: null
      }));

      await closeShiftApi({
        userId,
        shopId,
        shiftId: effectiveShiftId,
        checkOutTimestamp: Date.now(),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      });

      sessionStore.setShiftId(null);
      shiftStore.clearActiveShift();

      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#6C3CE1', '#3B82F6', '#10B981']
        });
      } catch (confettiErr) {
        console.error('Confetti error:', confettiErr);
      }

      haptic.notification('success');
      showSuccessToast(t('shift.shiftEnded'));
      return true;
    } catch (err: unknown) {
      haptic.notification('error');
      const message = err instanceof Error ? err.message : t('shift.shiftEnded');
      showFailToast(message);
      return false;
    } finally {
      isOperatingShift.value = false;
    }
  };

  return {
    isCheckingLocation,
    isOperatingShift,
    lastGeoResult,
    handleCheckIn,
    handleCheckOut
  };
};
