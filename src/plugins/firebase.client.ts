import { defineNuxtPlugin, useRuntimeConfig } from '#app';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore
} from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import type { FirebaseClientConfig } from '@shared/types';

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const firebaseConfig = config.public.firebase as unknown as FirebaseClientConfig;

  if (!firebaseConfig?.apiKey) {
    console.error(
      '[Firebase] Отсутствует конфигурация Firebase API Key! Убедитесь, что файл .env создан и содержит NUXT_PUBLIC_FIREBASE_API_KEY и остальные переменные (см. .env.example).'
    );
  }

  const app: FirebaseApp = getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

  const auth: Auth = getAuth(app);

  let firestore: Firestore;
  try {
    firestore = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch {
    firestore = getFirestore(app);
  }

  const storage: FirebaseStorage = getStorage(app);

  return {
    provide: {
      firebaseApp: app,
      auth,
      firestore,
      storage
    }
  };
});
