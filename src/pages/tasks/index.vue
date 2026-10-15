<template>
  <SafeLayout>
    <!-- Шапка страницы -->
    <template #header>
      <div class="px-5 py-3 flex items-center justify-between">
        <div>
          <h1 class="text-base font-bold text-gray-900 dark:text-slate-100 leading-tight">
            {{ $t('tasks.title') }}
          </h1>
          <p class="text-xs text-gray-500 dark:text-slate-400">
            {{ $t('tasks.standardsSubtitle') }}
          </p>
        </div>

        <ShiftDurationTimer
          v-if="shiftStore.isShiftActive"
          :check-in="shiftStore.activeShift?.checkIn"
        />
      </div>
    </template>

    <!-- Основной контент с Pull-to-Refresh -->
    <van-pull-refresh
      v-model="isRefreshing"
      :pulling-text="$t('common.pullToRefresh')"
      :loosing-text="$t('common.releaseToRefresh')"
      :loading-text="$t('common.loading')"
      :success-text="$t('common.refreshSuccess')"
      class="min-h-[calc(100vh-140px)]"
      @refresh="onRefresh"
    >
      <div class="space-y-4 pb-8">
        <!-- Заглушка, если смена еще НЕ открыта -->
        <div
          v-if="!shiftStore.isShiftActive"
          class="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-100 dark:border-slate-800 shadow-sm text-center space-y-4 my-6 transition-colors"
        >
          <client-only>
            <div class="flex justify-center items-center">
              <Vue3Lottie
                :animation-data="noShiftsAnimation"
                :height="140"
                :width="140"
                :loop="true"
                :auto-play="true"
              />
            </div>
            <template #fallback>
              <div class="w-[140px] h-[140px] mx-auto" />
            </template>
          </client-only>
          <div class="space-y-1">
            <h2 class="text-base font-bold text-gray-900 dark:text-slate-100">
              {{ $t('shift.shiftNotStarted') }}
            </h2>
            <p class="text-xs text-gray-500 dark:text-slate-400 max-w-[240px] mx-auto leading-relaxed">
              {{ $t('shift.shiftNotStartedDesc') }}
            </p>
          </div>

          <AppButton
            variant="primary"
            @click="router.push('/shift')"
          >
            {{ $t('shift.goToStartShift') }}
          </AppButton>
        </div>

        <!-- Список задач и фильтры (когда смена открыта) -->
        <TaskListWidget v-else />
      </div>
    </van-pull-refresh>
  </SafeLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import noShiftsAnimation from '@/assets/animations/no-shifts.json';
import { SafeLayout, AppButton } from '@shared/ui';
import { useTelegramHaptic } from '@shared/lib';
import { useSessionStore } from '@entities/session';
import { useShiftStore, ShiftDurationTimer } from '@entities/shift';
import { useTaskStore } from '@entities/task';
import { TaskListWidget } from '@widgets/task-list';

const router = useRouter();
const sessionStore = useSessionStore();
const shiftStore = useShiftStore();
const taskStore = useTaskStore();
const haptic = useTelegramHaptic();

const isRefreshing = ref(false);

onMounted(() => {
  const shopId = sessionStore.assignedShopId || '10';
  taskStore.subscribeTasks(shopId);
  taskStore.loadRejectedTasks(shopId);
});

const onRefresh = async () => {
  haptic.impact('light');
  try {
    const shopId = sessionStore.assignedShopId || '10';
    taskStore.subscribeTasks(shopId);
    await Promise.allSettled([
      taskStore.loadTasks(shopId),
      taskStore.loadRejectedTasks(shopId)
    ]);
  } finally {
    isRefreshing.value = false;
  }
};
</script>
