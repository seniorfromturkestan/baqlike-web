/**
 * src/shared/lib/geo/haversine.ts
 * Чистые утилиты георасчетов по формуле гаверсинусов и валидации радиуса заведения
 */
import { EARTH_RADIUS_METERS, ALLOWED_RADIUS_METERS } from '../../config/constants';
import type { Coordinates, FirestoreGeoPoint, LocationCheckResult } from '../../types';

export { EARTH_RADIUS_METERS, ALLOWED_RADIUS_METERS };

/**
 * Перевод градусов в радианы
 */
export const toRadians = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

/**
 * Расчет расстояния между двумя точками по формуле гаверсинусов
 * @param point1 Первые координаты (lat, lon)
 * @param point2 Вторые координаты (lat, lon)
 * @returns Дистанция в метрах (сферическая модель Земли R = 6,371,000м)
 */
export const calculateDistance = (
  point1: Coordinates | FirestoreGeoPoint,
  point2: Coordinates | FirestoreGeoPoint
): number => {
  const lat1 = point1.latitude;
  const lon1 = point1.longitude;
  const lat2 = point2.latitude;
  const lon2 = point2.longitude;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
};

/**
 * Проверка нахождения координат в допустимом радиусе
 */
export const isWithinRadius = (
  userCoords: Coordinates | FirestoreGeoPoint,
  shopCoords: Coordinates | FirestoreGeoPoint,
  allowedRadiusMeters: number = ALLOWED_RADIUS_METERS
): boolean => {
  const distance = calculateDistance(userCoords, shopCoords);
  return distance <= allowedRadiusMeters;
};

/**
 * Валидация возможности начала смены с учетом допустимого радиуса и исключения для тестового аккаунта
 * @param userCoords Координаты устройства сотрудника
 * @param shopCoords Координаты заведения
 * @param userName Имя сотрудника (если "Test", радиус игнорируется)
 * @param allowedRadiusMeters Порог радиуса в метрах (по умолчанию 150.0)
 */
export const validateCheckInRadius = (
  userCoords: Coordinates | FirestoreGeoPoint,
  shopCoords: Coordinates | FirestoreGeoPoint,
  userName?: string,
  allowedRadiusMeters: number = ALLOWED_RADIUS_METERS
): LocationCheckResult => {
  const distance = calculateDistance(userCoords, shopCoords);
  const isInside = distance <= allowedRadiusMeters;
  const canCheckIn = isInside;

  return {
    canCheckIn,
    isInside,
    isTestAccount: false,
    distance,
    allowedRadiusMeters,
    userCoordinates: {
      latitude: userCoords.latitude,
      longitude: userCoords.longitude
    },
    shopCoordinates: {
      latitude: shopCoords.latitude,
      longitude: shopCoords.longitude
    }
  };
};

/**
 * Запрос текущих GPS координат браузера с максимальной точностью
 */
export const getBrowserLocation = (
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  }
): Promise<{ coordinates: Coordinates; accuracy: number }> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Геолокация не поддерживается вашим устройством или браузером'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          coordinates: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          },
          accuracy: pos.coords.accuracy
        });
      },
      (err) => {
        let message = 'Не удалось определить местоположение';
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Доступ к геолокации запрещен. Включите доступ в настройках.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = 'Служба геолокации временно недоступна.';
        } else if (err.code === err.TIMEOUT) {
          message = 'Время ожидания GPS истекло. Повторите попытку.';
        }
        reject(new Error(message));
      },
      options
    );
  });
};
