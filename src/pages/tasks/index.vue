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
          v-if="shiftStore.isOpen"
          :check-in="shiftStore.activeShift?.checkIn"
        />
      </div>
    </template>

    <!-- Основной контент с Pull-to-Refresh -->
    <van-pull-refresh
      v-model="isRefreshing"
      class="min-h-[calc(100vh-140px)]"
      @refresh="onRefresh"
    >
      <div class="space-y-4 pb-8">
        <!-- Заглушка, если смена еще НЕ открыта -->
        <div
          v-if="!shiftStore.isOpen"
          class="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-gray-100 dark:border-slate-800 shadow-sm text-center space-y-4 my-6 transition-colors"
        >
          <div class="w-16 h-16 mx-auto rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-brand dark:text-brand-300 flex items-center justify-center">
            <Clock class="w-8 h-8 text-brand dark:text-brand-300 animate-pulse" />
          </div>
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
import { Clock } from 'lucide-vue-next';
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
});

const onRefresh = async () => {
  haptic.impact('light');
  try {
    const shopId = sessionStore.assignedShopId || '10';
    taskStore.subscribeTasks(shopId);
    await taskStore.loadTasks(shopId);
  } finally {
    isRefreshing.value = false;
  }
};
</script>
