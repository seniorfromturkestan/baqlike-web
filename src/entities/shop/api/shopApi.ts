/**
 * src/entities/shop/api/shopApi.ts
 * API запросы кофейни из коллекции coffeeshops/{shopId}
 */
import { doc, getDoc, collection, query, limit, getDocs } from 'firebase/firestore';
import { getFirebaseFirestore } from '@shared/api';
import type { ShopFirebase } from '@shared/types';

/**
 * Получение данных кофейни по shopId с автоматическим fallback на первую доступную точку
 */
export const fetchShopDocument = async (shopId?: string): Promise<ShopFirebase | null> => {
  const firestore = getFirebaseFirestore();

  try {
    // 1. Попытка загрузить по конкретному shopId (если передан)
    if (shopId) {
      const shopDocRef = doc(firestore, 'coffeeshops', shopId);
      const snapshot = await getDoc(shopDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        return {
          id: snapshot.id,
          name: data.name || 'Кофейня BaqLike',
          location: {
            latitude: data.location?.latitude ?? 51.1282,
            longitude: data.location?.longitude ?? 71.4305
          },
          radius: data.radius ?? 50
        };
      }
    }

    // 2. Fallback: загрузка первой существующей кофейни из Firestore
    const q = query(collection(firestore, 'coffeeshops'), limit(1));
    const fallbackSnap = await getDocs(q);
    if (!fallbackSnap.empty && fallbackSnap.docs[0]) {
      const firstDoc = fallbackSnap.docs[0];
      const data = firstDoc.data();
      return {
        id: firstDoc.id,
        name: data.name || 'Кофейня BaqLike',
        location: {
          latitude: data.location?.latitude ?? 51.1282,
          longitude: data.location?.longitude ?? 71.4305
        },
        radius: data.radius ?? 50
      };
    }
  } catch (err) {
    console.warn('Не удалось загрузить coffeeshops из Firestore:', err);
  }

  // 3. Резервные дефолтные координаты (Астана, пр. Достык)
  return {
    id: 'shop_astana_1',
    name: 'BaqLike Dostyk Avenue',
    location: {
      latitude: 51.1282,
      longitude: 71.4305
    },
    radius: 50
  };
};
