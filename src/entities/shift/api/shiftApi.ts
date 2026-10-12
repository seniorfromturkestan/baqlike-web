/**
 * src/entities/shift/api/shiftApi.ts
 * API операций со сменами в Firestore: coffeeshops/{shopId}/shifts
 */
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@shared/api';
import type { ShiftFirebase, ShiftUi, CheckInPayload, CheckOutPayload } from '@shared/types';
import { updateUserShiftId } from '../../session/api/sessionApi';

/**
 * Надежный парсер времени (поддерживает Date, number ms, Firestore Timestamp, объект { time, ... })
 */
export const parseFirestoreTimestamp = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(val);
  if (typeof val.toDate === 'function') return val.toDate();
  if (val.seconds !== undefined) return new Date(val.seconds * 1000);
  if (val.time) return parseFirestoreTimestamp(val.time);
  if (val.timestamp) return parseFirestoreTimestamp(val.timestamp);
  return null;
};

/**
 * Преобразование ShiftFirebase в ShiftUi
 */
export const mapShiftFirebaseToUi = (id: string, data: Partial<ShiftFirebase>, shopId?: string): ShiftUi => {
  const checkInDate = parseFirestoreTimestamp(data.check_in);
  const checkOutDate = parseFirestoreTimestamp(data.check_out);

  return {
    id,
    userId: data.user_id || '',
    shopId: shopId || (data as any).shop_id || (data as any).shopId || '',
    userName: data.user_name,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    isActive: Boolean(checkInDate && !checkOutDate && data.status !== 'closed')
  };
};

/**
 * Получение смены по ID
 */
export const fetchShiftById = async (shopId: string, shiftId: string): Promise<ShiftUi | null> => {
  if (!shopId || !shiftId) return null;
  const firestore = getFirebaseFirestore();
  const shiftRef = doc(firestore, 'coffeeshops', shopId, 'shifts', shiftId);
  const snapshot = await getDoc(shiftRef);

  if (!snapshot.exists()) return null;
  return mapShiftFirebaseToUi(snapshot.id, snapshot.data() as ShiftFirebase);
};

/**
 * Подписка на изменение активной смены
 */
export const subscribeToShift = (
  shopId: string,
  shiftId: string,
  callback: (shift: ShiftUi | null) => void
): Unsubscribe => {
  const firestore = getFirebaseFirestore();
  const shiftRef = doc(firestore, 'coffeeshops', shopId, 'shifts', shiftId);

  return onSnapshot(shiftRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
    } else {
      callback(mapShiftFirebaseToUi(snapshot.id, snapshot.data() as ShiftFirebase));
    }
  });
};

/**
 * Поиск незакрытой смены сотрудника (check_out == null)
 */
export const findActiveUserShift = async (
  shopId: string,
  userId: string
): Promise<ShiftUi | null> => {
  try {
    const firestore = getFirebaseFirestore();
    const shiftsRef = collection(firestore, 'coffeeshops', shopId, 'shifts');
    const q = query(
      shiftsRef,
      where('user_id', '==', userId),
      where('check_out', '==', null)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty && snapshot.docs[0]) {
      const firstDoc = snapshot.docs[0];
      return mapShiftFirebaseToUi(firstDoc.id, firstDoc.data() as ShiftFirebase);
    }
  } catch (err) {
    console.warn('Ошибка при поиске активной смены в Firestore:', err);
  }

  return null;
};

/**
 * Регистрация начала смены (Check-in)
 * 1. Создание документа в coffeeshops/{shopId}/shifts
 * 2. Сохранение id смены
 * 3. Безопасное обновление Users/{userId} через setDoc merge
 */
export const createShiftApi = async (payload: CheckInPayload): Promise<string> => {
  const firestore = getFirebaseFirestore();
  const shiftsRef = collection(firestore, 'coffeeshops', payload.shopId, 'shifts');

  const nowIsoDate = new Date().toISOString().slice(0, 10);
  const checkInData: Record<string, any> = {
    time: serverTimestamp(),
    timestamp: payload.checkInTimestamp || Date.now()
  };
  if (payload.latitude !== undefined && payload.longitude !== undefined) {
    checkInData.latitude = payload.latitude;
    checkInData.longitude = payload.longitude;
  }

  const shiftDocData: Record<string, any> = {
    user_id: payload.userId,
    user_name: payload.userName || 'Бариста',
    check_in: checkInData,
    check_out: null,
    status: 'open',
    date: nowIsoDate,
    created_at: serverTimestamp()
  };

  const docRef = await addDoc(shiftsRef, shiftDocData);

  // Сохраняем id внутри документа смены
  await setDoc(docRef, { id: docRef.id }, { merge: true });

  // Привязываем смену к профилю пользователя строго через setDoc merge
  await updateUserShiftId(payload.userId, docRef.id);

  return docRef.id;
};

export const openShiftApi = createShiftApi;

/**
 * Завершение смены (Check-out)
 * 1. Запись check_out и status: "closed" в coffeeshops/{shopId}/shifts/{shiftId}
 * 2. Сброс shift_id у пользователя через setDoc merge
 */
export const closeShiftApi = async (payload: CheckOutPayload): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const shiftRef = doc(firestore, 'coffeeshops', payload.shopId, 'shifts', payload.shiftId);

  const checkOutData: Record<string, any> = {
    time: serverTimestamp(),
    timestamp: payload.checkOutTimestamp || Date.now()
  };
  if (payload.latitude !== undefined && payload.longitude !== undefined) {
    checkOutData.latitude = payload.latitude;
    checkOutData.longitude = payload.longitude;
  }

  await setDoc(
    shiftRef,
    {
      check_out: checkOutData,
      status: 'closed',
      updated_at: serverTimestamp()
    },
    { merge: true }
  );

  // Сбрасываем смену в профиле пользователя через setDoc merge
  await updateUserShiftId(payload.userId, null);
};
