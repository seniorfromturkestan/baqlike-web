<template>
  <div class="w-full space-y-4 select-none">
    <!-- 1. Верхний блок прогресса чек-листа (когда есть задачи) -->
    <div v-if="taskStore.totalCount > 0" class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">
            {{ $t('tasks.progress') }}
          </span>
          <h3 class="text-lg font-bold text-gray-900 dark:text-slate-100 mt-0.5">
            {{ $t('tasks.progressCount', { completed: taskStore.completedCount, total: taskStore.totalCount }) }}
          </h3>
        </div>
        <span class="text-xl font-mono font-bold text-brand dark:text-brand-300">
          {{ taskStore.progressPercent }}%
        </span>
      </div>

      <!-- Прогресс-бар -->
      <div class="w-full h-2.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-brand to-accent transition-all duration-300 rounded-full"
          :style="{ width: `${taskStore.progressPercent}%` }"
        />
      </div>
    </div>

    <!-- 2. Вкладки фильтрации (Категории задач) -->
    <div v-if="taskStore.totalCount > 0" class="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-800/80 rounded-2xl text-xs overflow-x-auto no-scrollbar transition-colors">
      <button
        type="button"
        class="flex-1 py-2 px-2.5 rounded-xl font-medium transition text-center whitespace-nowrap"
        :class="activeFilter === 'all' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs font-semibold' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'"
        @click="setFilter('all')"
      >
        {{ $t('tasks.filters.all') }} ({{ taskStore.totalCount }})
      </button>

      <button
        type="button"
        class="flex-1 py-2 px-2.5 rounded-xl font-medium transition text-center whitespace-nowrap"
        :class="activeFilter === 'not_done' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-semibold' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'"
        @click="setFilter('not_done')"
      >
        {{ $t('tasks.filters.pending') }} ({{ taskStore.notDoneTasks.length }})
      </button>

      <button
        type="button"
        class="flex-1 py-2 px-2.5 rounded-xl font-medium transition text-center whitespace-nowrap"
        :class="activeFilter === 'in_review' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-semibold' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'"
        @click="setFilter('in_review')"
      >
        {{ $t('tasks.filters.review') }} ({{ taskStore.pendingApprovalCount }})
      </button>

      <button
        type="button"
        class="flex-1 py-2 px-2.5 rounded-xl font-medium transition text-center whitespace-nowrap"
        :class="activeFilter === 'approved' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'"
        @click="setFilter('approved')"
      >
        {{ $t('tasks.filters.completed') }} ({{ taskStore.approvedCount }})
      </button>
    </div>

    <!-- 3. Список задач с плавной анимацией v-auto-animate -->
    <div v-auto-animate class="space-y-2.5">
      <div v-if="filteredTasks.length === 0" class="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6 space-y-2 transition-colors">
        <template v-if="taskStore.totalCount === 0">
          <ClipboardList class="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto" />
          <h4 class="text-sm font-bold text-gray-800 dark:text-slate-200">{{ $t('tasks.emptyShiftTasks') }}</h4>
          <p class="text-xs text-gray-400 dark:text-slate-500 max-w-[240px] mx-auto leading-relaxed">
            {{ $t('tasks.emptyShiftTasksDesc') }}
          </p>
        </template>
        <template v-else>
          <CheckCircle2 class="w-10 h-10 text-emerald-500 mx-auto" />
          <h4 class="text-sm font-bold text-gray-800 dark:text-slate-200">{{ $t('tasks.empty') }}</h4>
          <p class="text-xs text-gray-400 dark:text-slate-500 max-w-[220px] mx-auto">
            {{ $t('tasks.allCompleted') }}
          </p>
        </template>
      </div>

      <TaskItemRow
        v-for="task in filteredTasks"
        :key="task.id"
        :task="task"
        @click="handleTaskClick"
      />
    </div>

    <!-- 4. Интеграция модалки выполнения задачи (Фича complete-task) -->
    <TaskActionModal
      v-model="isModalOpen"
      :task="activeTask"
      :shop-id="sessionStore.assignedShopId"
      :shift-id="sessionStore.currentShiftId || 'shift_current'"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { CheckCircle2, ClipboardList } from 'lucide-vue-next';
import { useTelegramHaptic } from '@shared/lib';
import { useTaskStore, TaskItemRow } from '@entities/task';
import { useSessionStore } from '@entities/session';
import { TaskActionModal } from '@features/complete-task';
import type { TaskResultUi } from '@shared/types';

type FilterType = 'all' | 'not_done' | 'in_review' | 'approved';

const taskStore = useTaskStore();
const sessionStore = useSessionStore();
const haptic = useTelegramHaptic();

onMounted(() => {
  const shopId = sessionStore.assignedShopId || '10';
  taskStore.subscribeTasks(shopId);
});

const activeFilter = ref<FilterType>('all');
const isModalOpen = ref(false);
const activeTask = ref<TaskResultUi | null>(null);

const setFilter = (filter: FilterType) => {
  haptic.selection();
  activeFilter.value = filter;
};

const filteredTasks = computed(() => {
  switch (activeFilter.value) {
    case 'not_done':
      return taskStore.notDoneTasks;
    case 'in_review':
      return taskStore.tasks.filter((t) => t.status === 'In_Review');
    case 'approved':
      return taskStore.tasks.filter((t) => t.status === 'Approved');
    case 'all':
    default:
      return taskStore.tasks;
  }
});

const handleTaskClick = (task: TaskResultUi) => {
  haptic.impact('light');
  activeTask.value = task;
  isModalOpen.value = true;
};
</script>
