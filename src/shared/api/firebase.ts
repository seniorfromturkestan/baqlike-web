/**
 * src/shared/api/firebase.ts
 * Клиентский синглтон Firebase SDK (Auth, Firestore, Storage)
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore
} from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { DEFAULT_FIREBASE_CONFIG } from '../config/constants';
import type { FirebaseClientConfig } from '../types';

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _firestore: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

/**
 * Инициализация клиентского синглтона Firebase
 */
export const initFirebase = (config?: Partial<FirebaseClientConfig>): {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
} => {
  if (!_app) {
    const existingApps = getApps();
    if (existingApps.length > 0 && existingApps[0]) {
      _app = existingApps[0];
    } else {
      let runtimeFirebaseConfig: Partial<FirebaseClientConfig> = {};
      try {
        const rc = useRuntimeConfig();
        if (rc?.public?.firebase) {
          runtimeFirebaseConfig = rc.public.firebase as unknown as Partial<FirebaseClientConfig>;
        }
      } catch {
        // runtimeConfig недоступен вне Nuxt контекста
      }

      const mergedConfig = {
        ...DEFAULT_FIREBASE_CONFIG,
        ...runtimeFirebaseConfig,
        ...(config || {})
      };

      if (!mergedConfig.apiKey) {
        console.error(
          '[Firebase] Ошибка: apiKey не найден в переменных окружения! Убедитесь, что .env заполнен.'
        );
      }

      _app = initializeApp(mergedConfig);
    }

    _auth = getAuth(_app);

    try {
      _firestore = initializeFirestore(_app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch {
      _firestore = getFirestore(_app);
    }

    _storage = getStorage(_app);
  }

  return {
    app: _app,
    auth: _auth!,
    firestore: _firestore!,
    storage: _storage!
  };
};

/**
 * Получение готовых сервисов Firebase (ленивая инициализация при первом обращении)
 */
export const getFirebaseServices = () => {
  return initFirebase();
};

export const getFirebaseAuth = (): Auth => {
  return initFirebase().auth;
};

export const getFirebaseFirestore = (): Firestore => {
  return initFirebase().firestore;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  return initFirebase().storage;
};
