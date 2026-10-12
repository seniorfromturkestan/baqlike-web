/**
 * src/shared/lib/telegram/useTelegramHaptic.ts
 * Composable тактильного отклика Telegram Haptic Feedback
 */
export type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
export type NotificationType = 'error' | 'success' | 'warning';

export const useTelegramHaptic = () => {
  const getHaptic = () => {
    if (typeof window === 'undefined') return null;
    return (window as any).Telegram?.WebApp?.HapticFeedback || null;
  };

  /**
   * Тактильный удар заданной жесткости
   */
  const impact = (style: ImpactStyle = 'light') => {
    try {
      getHaptic()?.impactOccurred(style);
    } catch {
      // Игнорируем в браузерах вне Telegram
    }
  };

  /**
   * Отклик при смене выбора (переключение табов, чекбоксов, фильтров)
   */
  const selection = () => {
    try {
      getHaptic()?.selectionChanged();
    } catch {
      // Игнорируем в браузерах вне Telegram
    }
  };

  /**
   * Уведомление об успехе, ошибке или предупреждении
   */
  const notification = (type: NotificationType) => {
    try {
      getHaptic()?.notificationOccurred(type);
    } catch {
      // Игнорируем в браузерах вне Telegram
    }
  };

  return {
    impact,
    selection,
    notification
  };
};
