<template>
  <van-config-provider :theme="isDark ? 'dark' : 'light'">
    <div class="h-full w-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200 font-sans antialiased selection:bg-brand/20 relative">
      <NuxtPage />
      <AppTabbar v-if="showTabbar" />
    </div>
  </van-config-provider>
</template>
ё
<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAppTheme } from '@shared/lib';
import { AppTabbar } from '@widgets/app-tabbar';
import { useSessionStore } from '@entities/session';
import { useShopStore } from '@entities/shop';
import { useShiftStore } from '@entities/shift';
import { useTaskStore } from '@entities/task';

const route = useRoute();
const { isDark } = useAppTheme();
const sessionStore = useSessionStore();
const shopStore = useShopStore();
const shiftStore = useShiftStore();
const taskStore = useTaskStore();

const showTabbar = computed(() => {
  return route.path !== '/auth' && !route.path.startsWith('/auth/');
});

onMounted(() => {
  sessionStore.initSession();
  shopStore.loadShop(sessionStore.assignedShopId || undefined);
});

// Реактивная подгрузка кофейни и подписка на задачи при готовности assignedShopId
watch(
  () => sessionStore.assignedShopId,
  (newShopId) => {
    if (newShopId) {
      shopStore.loadShop(newShopId);
      taskStore.subscribeTasks(newShopId);
    }
  },
  { immediate: true }
);

// Реактивное восстановление смены из Firestore
watch(
  () => [sessionStore.assignedShopId, sessionStore.currentShiftId] as const,
  ([shopId, shiftId]) => {
    if (shopId && shiftId) {
      shiftStore.syncShiftFromUser(shopId, shiftId);
    }
  },
  { immediate: true }
);
</script>
