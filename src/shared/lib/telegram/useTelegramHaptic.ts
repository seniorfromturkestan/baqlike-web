/**
 * src/shared/lib/telegram/useTelegramHaptic.ts
 * Кроссплатформенный composable тактильного отклика:
 * - На iOS: нативный Telegram WebApp HapticFeedback (Apple Taptic Engine).
 * - На Android: комбинация Telegram HapticFeedback, прямого Web Vibration API (navigator.vibrate)
 *   и обход бага клиента Telegram Android (где impactOccurred / selectionChanged не вызывают вибрацию).
 * - В PWA и браузерах на Android: нативная эмуляция тактильного отклика iOS через navigator.vibrate.
 */
export type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
export type NotificationType = 'error' | 'success' | 'warning';

const IMPACT_PATTERNS: Record<ImpactStyle, number> = {
  soft: 14,
  light: 18,
  medium: 32,
  rigid: 22,
  heavy: 55,
};

const NOTIFICATION_PATTERNS: Record<NotificationType, number | number[]> = {
  success: [18, 50, 24],
  warning: [30, 60, 30],
  error: [40, 50, 40, 50, 60],
};

const SELECTION_PATTERN = 12;

export const useTelegramHaptic = () => {
  const isClient = typeof window !== 'undefined';

  const getTg = () => {
    if (!isClient) return null;
    return (window as any).Telegram?.WebApp || null;
  };

  const getHaptic = () => {
    return getTg()?.HapticFeedback || null;
  };

  const isAndroid = (): boolean => {
    if (!isClient) return false;
    const platform = getTg()?.platform;
    if (platform === 'android') return true;
    return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  };

  const isIOS = (): boolean => {
    if (!isClient) return false;
    const platform = getTg()?.platform;
    if (platform === 'ios') return true;
    if (typeof navigator !== 'undefined') {
      return (
        /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      );
    }
    return false;
  };

  /**
   * Безопасный вызов Web Vibration API с защитой от ошибок и проверкой поддержки
   */
  const vibrateSafe = (pattern: number | number[]): boolean => {
    if (!isClient || typeof navigator === 'undefined') return false;
    try {
      if (typeof navigator.vibrate === 'function') {
        return navigator.vibrate(pattern);
      }
    } catch {
      // Игнорируем блокировки контекста безопасности браузера
    }
    return false;
  };

  /**
   * Тактильный удар заданной жесткости
   */
  const impact = (style: ImpactStyle = 'light') => {
    if (!isClient) return;

    const haptic = getHaptic();

    // 1. На iOS в Telegram используется эталонный Taptic Engine
    if (isIOS()) {
      try {
        haptic?.impactOccurred(style);
      } catch {
        // Игнорируем ошибки вне окружения Telegram
      }
      return;
    }

    // 2. На Android:
    // Пытаемся вызвать Telegram SDK
    try {
      haptic?.impactOccurred(style);
    } catch {
      // Игнорируем
    }

    // Вызываем Web Vibration API для Android (в PWA, Chrome и WebView)
    const pattern = IMPACT_PATTERNS[style] || 20;
    const vibrated = vibrateSafe(pattern);

    // Если мы внутри Telegram на Android и navigator.vibrate заблокирован вебвью
    // (известный баг Issue #28 Telegram Android, где impactOccurred молчит):
    // делаем мягкий fallback на рабочий notificationOccurred
    if (!vibrated && getTg()?.platform === 'android' && haptic) {
      try {
        if (style === 'heavy' || style === 'rigid') {
          haptic.notificationOccurred('warning');
        } else {
          haptic.notificationOccurred('success');
        }
      } catch {
        // Игнорируем
      }
    }
  };

  /**
   * Отклик при смене выбора (переключение табов, чекбоксов, фильтров)
   */
  const selection = () => {
    if (!isClient) return;

    const haptic = getHaptic();

    // 1. На iOS в Telegram
    if (isIOS()) {
      try {
        haptic?.selectionChanged();
      } catch {
        // Игнорируем
      }
      return;
    }

    // 2. На Android
    try {
      haptic?.selectionChanged();
    } catch {
      // Игнорируем
    }

    const vibrated = vibrateSafe(SELECTION_PATTERN);

    // Fallback для Telegram Android при блокировке navigator.vibrate
    if (!vibrated && getTg()?.platform === 'android' && haptic) {
      try {
        haptic.notificationOccurred('success');
      } catch {
        // Игнорируем
      }
    }
  };

  /**
   * Уведомление об успехе, ошибке или предупреждении
   */
  const notification = (type: NotificationType) => {
    if (!isClient) return;

    const haptic = getHaptic();

    // 1. На iOS в Telegram
    if (isIOS()) {
      try {
        haptic?.notificationOccurred(type);
      } catch {
        // Игнорируем
      }
      return;
    }

    // 2. На Android:
    let tgNotificationCalled = false;
    if (haptic && typeof haptic.notificationOccurred === 'function') {
      try {
        haptic.notificationOccurred(type);
        tgNotificationCalled = true;
      } catch {
        // Игнорируем
      }
    }

    // Если вне Telegram (PWA / браузер) или вызов Telegram не сработал:
    if (!tgNotificationCalled || !getTg()?.platform) {
      const pattern = NOTIFICATION_PATTERNS[type] || [30, 50, 30];
      vibrateSafe(pattern);
    }
  };

  return {
    impact,
    selection,
    notification,
    isAndroid,
    isIOS
  };
};

