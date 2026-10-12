/**
 * src/entities/session/api/sessionApi.ts
 * API запросы аутентификации и профиля пользователя в Firestore
 */
import {
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
  limit,
  getDocs,
  serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from '@shared/api';
import type { UserFirebase, UserUi } from '@shared/types';

/**
 * Преобразование Firebase DTO в UserUi модель фронтенда
 */
export const mapUserFirebaseToUi = (id: string, data: Partial<UserFirebase>): UserUi => {
  return {
    id,
    name: data.name || 'Staff',
    role: data.role || 'staff',
    coffeeShopId: data.coffeeshop_id || data.shop_id || '1',
    shiftId: data.shift_id || (data as any).shiftId || null,
    telegramId: data.telegram_id ?? null,
    telegramUsername: data.telegram_username ?? null,
    avatarUrl: data.avatar_url ?? null
  };
};

/**
 * Получение первой доступной кофейни для привязки бариста
 */
export const getFirstAvailableShopId = async (): Promise<string> => {
  try {
    const firestore = getFirebaseFirestore();
    const q = query(collection(firestore, 'coffeeshops'), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty && snapshot.docs[0]) {
      return snapshot.docs[0].id;
    }
  } catch (err) {
    console.warn('Не удалось загрузить список coffeeshops из Firestore:', err);
  }
  return 'shop_astana_1';
};

/**
 * Синхронизация профиля пользователя с Firestore:
 * Если документа нет в /Users/{uid} — создает его через setDoc с дефолтными полями.
 * Если есть — возвращает актуальные данные.
 */
export const syncUserProfile = async (
  userId: string,
  initialData?: { name?: string; phone?: string; role?: string; shopId?: string }
): Promise<UserUi> => {
  const firestore = getFirebaseFirestore();
  const userDocRef = doc(firestore, 'Users', userId);

  try {
    const snapshot = await getDoc(userDocRef);

    if (snapshot.exists()) {
      const data = snapshot.data() as UserFirebase;
      const userRole = data.role;
      if (userRole && userRole !== 'staff') {
        throw new Error('ROLE_FORBIDDEN_ADMIN');
      }
      return mapUserFirebaseToUi(snapshot.id, data);
    }

    // Если документ отсутствует, создаем его
    const defaultShopId = initialData?.shopId || (await getFirstAvailableShopId());
    const newUserDoc: Record<string, any> = {
      name: initialData?.name || 'Бариста',
      phone: initialData?.phone || '',
      role: initialData?.role || 'barista',
      shop_id: defaultShopId,
      coffeeshop_id: defaultShopId,
      shift_id: null,
      created_at: serverTimestamp()
    };

    await setDoc(userDocRef, newUserDoc, { merge: true });

    return {
      id: userId,
      name: newUserDoc.name,
      role: newUserDoc.role,
      coffeeShopId: defaultShopId,
      shiftId: null
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'ROLE_FORBIDDEN_ADMIN') {
      throw err;
    }
    console.warn(`Ошибка при синхронизации пользователя /Users/${userId}:`, err);
    // Безопасный fallback
    return {
      id: userId,
      name: initialData?.name || 'Бариста',
      role: initialData?.role || 'Бариста',
      coffeeShopId: initialData?.shopId || 'shop_astana_1',
      shiftId: null
    };
  }
};

/**
 * Получение профиля пользователя из коллекции Users/{userId}
 */
export const fetchUserProfile = async (userId: string): Promise<UserUi | null> => {
  const firestore = getFirebaseFirestore();
  const userDocRef = doc(firestore, 'Users', userId);
  const snapshot = await getDoc(userDocRef);

  if (!snapshot.exists()) {
    return null;
  }

  return mapUserFirebaseToUi(snapshot.id, snapshot.data() as UserFirebase);
};

/**
 * Поиск пользователя в коллекции Users по номеру телефона
 */
export const findUserByPhone = async (phone: string): Promise<UserUi | null> => {
  try {
    const firestore = getFirebaseFirestore();
    const usersRef = collection(firestore, 'Users');
    const cleanDigits = phone.replace(/\D/g, '');

    const candidates = [
      phone.trim(),
      `+${cleanDigits}`,
      cleanDigits,
      cleanDigits.startsWith('7') ? '8' + cleanDigits.slice(1) : cleanDigits,
      cleanDigits.startsWith('8') ? '+7' + cleanDigits.slice(1) : cleanDigits
    ].filter(Boolean);

    for (const p of candidates) {
      const q = query(usersRef, where('phone', '==', p), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs[0]) {
        return mapUserFirebaseToUi(snap.docs[0].id, snap.docs[0].data() as UserFirebase);
      }
    }
  } catch (err) {
    console.warn('Ошибка при поиске пользователя по номеру телефона:', err);
  }
  return null;
};

/**
 * Подписка в реальном времени на документ пользователя Users/{userId}
 */
export const subscribeUserProfile = (
  userId: string,
  callback: (user: UserUi | null) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const firestore = getFirebaseFirestore();
  const userDocRef = doc(firestore, 'Users', userId);

  return onSnapshot(
    userDocRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
      } else {
        callback(mapUserFirebaseToUi(snapshot.id, snapshot.data() as UserFirebase));
      }
    },
    (err) => {
      if (onError) onError(err);
    }
  );
};

/**
 * Вход по Email и паролю через Firebase Auth
 */
export const loginWithEmailApi = async (email: string, pass: string): Promise<FirebaseUser> => {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  return credential.user;
};

/**
 * Выход из учетной записи Firebase Auth
 */
export const signOutApi = async (): Promise<void> => {
  const auth = getFirebaseAuth();
  await signOut(auth);
};

/**
 * Слушатель состояния авторизации Firebase Auth
 */
export const subscribeAuthState = (
  callback: (user: FirebaseUser | null) => void
): Unsubscribe => {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
};

/**
 * Безопасное обновление привязки shift_id у пользователя через setDoc merge
 * Полностью исключает ошибку "No document to update"
 */
export const updateUserShiftId = async (userId: string, shiftId: string | null): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const userDocRef = doc(firestore, 'Users', userId);
  await setDoc(
    userDocRef,
    {
      shift_id: shiftId
    },
    { merge: true }
  );
};

/**
 * Авторизация через Telegram Mini App
 * 1. Обеспечивает сессию Firebase Auth (signInAnonymously)
 * 2. Ищет в Users по telegram_id
 * 3. Если не найден — ищет по telegram_username (в lowercase)
 * 4. Если найден — обновляет telegram_id при необходимости и возвращает профиль
 */
export const loginViaTelegramApi = async (tgUser: {
  id: number;
  username?: string;
  first_name?: string;
  photo_url?: string;
}): Promise<UserUi | null> => {
  const auth = getFirebaseAuth();
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (authErr) {
      console.warn('Anonymous auth warning:', authErr);
    }
  }

  const firestore = getFirebaseFirestore();
  const usersRef = collection(firestore, 'Users');

  // Шаг 1: поиск по telegram_id
  let q = query(usersRef, where('telegram_id', '==', tgUser.id), limit(1));
  let snapshot = await getDocs(q);

  // Шаг 2 (первый вход): если не найден и есть username, поиск по telegram_username
  if (snapshot.empty && tgUser.username) {
    const cleanUsername = tgUser.username.toLowerCase().replace(/^@/, '');
    q = query(usersRef, where('telegram_username', '==', cleanUsername), limit(1));
    snapshot = await getDocs(q);
  }

  if (!snapshot.empty && snapshot.docs[0]) {
    const docSnap = snapshot.docs[0];
    const data = docSnap.data() as UserFirebase;

    // Роль сотрудника: строго 'staff'. Администраторам вход запрещен
    const userRole = data.role;
    if (userRole && userRole !== 'staff') {
      throw new Error('ROLE_FORBIDDEN_ADMIN');
    }

    const updates: Partial<UserFirebase> = {};
    // Если telegram_id в документе еще пустой, привязываем id
    if (data.telegram_id === undefined || data.telegram_id === null) {
      updates.telegram_id = tgUser.id;
      data.telegram_id = tgUser.id;
    }

    // Автоподтягивание фото из Telegram, если аватар еще не был задан
    if (!data.avatar_url && tgUser.photo_url) {
      updates.avatar_url = tgUser.photo_url;
      data.avatar_url = tgUser.photo_url;
    }

    if (Object.keys(updates).length > 0) {
      try {
        await setDoc(docSnap.ref, updates, { merge: true });
      } catch (updateErr) {
        console.warn('Failed to update telegram profile fields:', updateErr);
      }
    }

    return mapUserFirebaseToUi(docSnap.id, data);
  }

  return null;
};

/**
 * Загрузка аватара сотрудника в Firebase Storage и обновление Users/{userId}
 */
export const uploadUserAvatarApi = async (userId: string, file: File | Blob): Promise<string> => {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const { getFirebaseStorage, getFirebaseFirestore } = await import('@shared/api');
  const storage = getFirebaseStorage();
  const avatarRef = ref(storage, `avatars/${userId}.jpg`);
  await uploadBytes(avatarRef, file, { contentType: 'image/jpeg' });
  const downloadUrl = await getDownloadURL(avatarRef);

  const firestore = getFirebaseFirestore();
  const userDocRef = doc(firestore, 'Users', userId);
  await setDoc(userDocRef, { avatar_url: downloadUrl }, { merge: true });

  return downloadUrl;
};
