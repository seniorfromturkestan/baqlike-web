<template>
  <SafeLayout>
    <!-- Шапка страницы смены -->
    <template #header>
      <div class="px-5 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl overflow-hidden bg-gradient-to-tr from-brand to-accent text-white font-bold text-sm flex items-center justify-center shadow-md shrink-0">
            <img
              v-if="sessionStore.user?.avatarUrl"
              :src="sessionStore.user.avatarUrl"
              alt="Avatar"
              class="w-full h-full object-cover"
            >
            <span v-else>{{ sessionStore.userInitials }}</span>
          </div>
          <div>
            <h2 class="text-sm font-bold text-gray-900 dark:text-slate-100 leading-tight">
              {{ sessionStore.user?.name || $t('shift.barista') }}
            </h2>
            <p class="text-xs text-gray-500 dark:text-slate-400">
              {{ shopStore.shopName }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <!-- Основной контент с Pull-to-Refresh -->
    <van-pull-refresh
      v-model="isRefreshing"
      class="min-h-[calc(100vh-140px)]"
      @refresh="onRefresh"
    >
      <div class="space-y-5 pb-6">
        <!-- 1. Главный виджет смены: статус, GPS контроль, Check-in / Check-out -->
        <ShiftStatusCard />

        <!-- 2. Блок превью задач (когда смена открыта) -->
        <div v-if="shiftStore.isOpen" class="space-y-3">
          <div class="flex items-center justify-between px-1">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {{ $t('shift.nearestTasks') }} ({{ taskStore.notDoneTasks.length }})
            </h3>
            <NuxtLink
              to="/tasks"
              class="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
            >
              <span>{{ $t('shift.allTasks') }}</span>
              <ChevronRight class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>

          <!-- До 3 задач с плавной анимацией -->
          <div v-auto-animate class="space-y-2">
            <div
              v-if="topTasks.length === 0"
              class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 text-center text-xs text-gray-400 dark:text-slate-500 flex items-center justify-center gap-1.5 transition-colors"
            >
              <template v-if="taskStore.totalCount === 0">
                <ClipboardList class="w-4 h-4 text-gray-400 shrink-0" />
                <span>{{ $t('tasks.emptyShiftTasks') }}</span>
              </template>
              <template v-else>
                <CheckCircle2 class="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{{ $t('shift.allDone') }}</span>
              </template>
            </div>

            <TaskItemRow
              v-for="task in topTasks"
              :key="task.id"
              :task="task"
              @click="handleTaskClick(task)"
            />
          </div>
        </div>
      </div>
    </van-pull-refresh>

    <!-- Модалка выполнения задачи -->
    <TaskActionModal
      v-model="isModalOpen"
      :task="activeTask"
      :shop-id="sessionStore.assignedShopId"
      :shift-id="sessionStore.currentShiftId || 'shift_active'"
    />
  </SafeLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ChevronRight, CheckCircle2, ClipboardList } from 'lucide-vue-next';
import { SafeLayout } from '@shared/ui';
import { useTelegramHaptic } from '@shared/lib';
import { useSessionStore } from '@entities/session';
import { useShopStore } from '@entities/shop';
import { useShiftStore } from '@entities/shift';
import { useTaskStore, TaskItemRow } from '@entities/task';
import { ShiftStatusCard } from '@widgets/shift-status-card';
import { TaskActionModal } from '@features/complete-task';
import type { TaskResultUi } from '@shared/types';

const sessionStore = useSessionStore();
const shopStore = useShopStore();
const shiftStore = useShiftStore();
const taskStore = useTaskStore();
const haptic = useTelegramHaptic();

const isRefreshing = ref(false);

const topTasks = computed(() => {
  return taskStore.notDoneTasks.slice(0, 3);
});

const isModalOpen = ref(false);
const activeTask = ref<TaskResultUi | null>(null);

const handleTaskClick = (task: TaskResultUi) => {
  haptic.impact('light');
  activeTask.value = task;
  isModalOpen.value = true;
};

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
    if (sessionStore.user?.id && sessionStore.currentShiftId) {
      await shiftStore.syncShiftFromUser(shopId, sessionStore.currentShiftId);
    }
  } finally {
    isRefreshing.value = false;
  }
};
</script>
