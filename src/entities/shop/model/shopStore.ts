/**
 * src/entities/shop/model/shopStore.ts
 * Pinia-стор данных привязанной кофейни
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ShopFirebase, Coordinates } from '@shared/types';
import { fetchShopDocument } from '../api/shopApi';

export const useShopStore = defineStore('shop', () => {
  const currentShop = ref<ShopFirebase | null>(null);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  // ==========================================
  // Геттеры
  // ==========================================

  const shopCoordinates = computed<Coordinates | null>(() => {
    if (!currentShop.value?.location) return null;
    return {
      latitude: currentShop.value.location.latitude,
      longitude: currentShop.value.location.longitude
    };
  });

  const shopName = computed<string>(() => {
    return currentShop.value?.name || 'Кофейня BaqLike';
  });

  const shopAddress = computed<string>(() => {
    return currentShop.value?.name || 'г. Астана, пр. Достык';
  });

  // ==========================================
  // Действия (Actions)
  // ==========================================

  const loadShop = async (shopId?: string): Promise<ShopFirebase | null> => {
    loading.value = true;
    error.value = null;
    try {
      const data = await fetchShopDocument(shopId);
      currentShop.value = data;
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки точки';
      error.value = message;
      return null;
    } finally {
      loading.value = false;
    }
  };

  const setShop = (shop: ShopFirebase | null) => {
    currentShop.value = shop;
  };

  return {
    currentShop,
    loading,
    error,
    shopCoordinates,
    shopName,
    shopAddress,
    loadShop,
    setShop
  };
}, {
  persist: true
});
