<template>
  <van-config-provider :theme="isDark ? 'dark' : 'light'">
    <div class="h-full w-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200 font-sans antialiased selection:bg-brand/20 relative">
      <NuxtPage />
      <AppTabbar v-if="showTabbar" />

      <!-- Полноэкранный Splash Screen при старте приложения -->
      <Transition name="splash-fade">
        <div
          v-if="!isAppReady"
          class="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-gradient-to-b from-[#6C3CE1] via-[#5C2CD1] to-[#481EBD] text-white select-none overflow-hidden font-sans"
          :style="{
            paddingTop: 'max(env(safe-area-inset-top, 0px), 28px)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 28px)',
            paddingLeft: '24px',
            paddingRight: '24px'
          }"
        >
          <!-- Декоративные фоновые элементы -->
          <div class="absolute -top-24 -left-24 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div class="absolute -bottom-24 -right-24 w-80 h-80 bg-black/20 rounded-full blur-3xl pointer-events-none" />

          <!-- Верхний спейсер для визуального центрирования -->
          <div class="h-10 w-full" />

          <!-- Центральный контент: чистый логотип BaqLike, название и пульсация -->
          <div class="flex flex-col items-center text-center space-y-6 relative z-10">
            <!-- Чистый логотип фиксированного размера без внешней рамки со скруглением -->
            

            <div class="space-y-1.5 font-sans">
              <h1 class="text-2xl font-bold tracking-tight text-white drop-shadow-sm font-sans">
                BaqLike <span class="text-purple-200 font-medium">Staff</span>
              </h1>
              <p class="text-[11px] text-purple-100/90 font-semibold tracking-wider uppercase font-sans">
                ЗАДАЧИ И СТАНДАРТЫ
              </p>
            </div>

            <!-- Индикатор загрузки -->
            <div class="flex items-center gap-2 pt-2">
              <span class="w-2.5 h-2.5 rounded-full bg-white/90 animate-bounce [animation-delay:-0.3s]" />
              <span class="w-2.5 h-2.5 rounded-full bg-white/90 animate-bounce [animation-delay:-0.15s]" />
              <span class="w-2.5 h-2.5 rounded-full bg-white/90 animate-bounce" />
            </div>
          </div>

          <!-- Нижний статус с учетом безопасной зоны -->
          <div class="relative z-10 pb-4 text-center font-sans">
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-purple-100/90 font-medium font-sans shadow-sm">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span class="font-sans font-medium">Синхронизация...</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </van-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
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

const isAppReady = ref(false);

const showTabbar = computed(() => {
  return route.path !== '/auth' && !route.path.startsWith('/auth/');
});

onMounted(async () => {
  const startTime = Date.now();
  try {
    // 1. Инициализация сессии (восстановление из storage / Firebase / Telegram)
    await sessionStore.initSession();

    // 2. Если авторизован — подгружаем заведение и смену
    if (sessionStore.isAuthenticated) {
      const shopId = sessionStore.assignedShopId || undefined;
      await Promise.allSettled([
        shopStore.loadShop(shopId),
        sessionStore.assignedShopId && sessionStore.currentShiftId
          ? shiftStore.syncShiftFromUser(sessionStore.assignedShopId, sessionStore.currentShiftId)
          : Promise.resolve()
      ]);
    }
  } catch (err) {
    console.warn('[App] Session initialization error:', err);
  } finally {
    // Гарантируем плавное время отображения splash screen (250-300мс минимум)
    const elapsed = Date.now() - startTime;
    const minDelay = Math.max(0, 300 - elapsed);
    setTimeout(() => {
      isAppReady.value = true;
    }, minDelay);
  }
});

// Реактивная подгрузка заведения и подписка на задачи при готовности assignedShopId
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
    } else {
      shiftStore.clearActiveShift();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.splash-fade-enter-active,
.splash-fade-leave-active {
  transition: opacity 0.3s ease;
}

.splash-fade-enter-from,
.splash-fade-leave-to {
  opacity: 0;
}
</style>
