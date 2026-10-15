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
    <div v-if="taskStore.totalCount > 0 || taskStore.rejectedCount > 0" class="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-800/80 rounded-2xl text-xs overflow-x-auto no-scrollbar transition-colors">
      <button
        type="button"
        class="flex-1 py-2 px-2.5 rounded-xl font-medium transition text-center whitespace-nowrap"
        :class="activeFilter === 'not_done' ? 'bg-white dark:bg-slate-700 text-brand dark:text-brand-300 shadow-xs font-semibold' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'"
        @click="setFilter('not_done')"
      >
        {{ $t('tasks.filters.active') }} ({{ taskStore.notDoneTasks.length }})
      </button>

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

      <button
        type="button"
        class="flex-1 py-2 px-2.5 rounded-xl font-medium transition text-center whitespace-nowrap flex items-center justify-center gap-1.5"
        :class="activeFilter === 'rejected' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-semibold' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'"
        @click="setFilter('rejected')"
      >
        <span>{{ $t('tasks.tabRejected') }}</span>
        <span
          v-if="taskStore.rejectedCount > 0"
          class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white leading-none"
        >
          {{ taskStore.rejectedCount }}
        </span>
      </button>
    </div>

    <!-- 3. Список задач с плавной анимацией v-auto-animate -->
    <div v-auto-animate class="space-y-2.5">
      <!-- Пустой экран (Empty States) -->
      <div v-if="filteredTasks.length === 0" class="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6 space-y-3 transition-colors">
        <client-only>
          <div class="flex justify-center items-center">
            <Vue3Lottie
              :key="activeFilter"
              :animation-data="emptyStateAnimation"
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
          <h4 class="text-sm font-bold text-gray-800 dark:text-slate-200">
            {{ emptyStateTitle }}
          </h4>
          <p v-if="emptyStateDescription" class="text-xs text-gray-400 dark:text-slate-500 max-w-[260px] mx-auto leading-relaxed">
            {{ emptyStateDescription }}
          </p>
        </div>
      </div>

      <!-- Список обычных активных/завершенных задач -->
      <template v-if="activeFilter !== 'rejected'">
        <TaskItemRow
          v-for="task in filteredTasks"
          :key="task.id"
          :task="task"
          @click="handleTaskClick"
        />
      </template>

      <!-- Список отклонённых задач (строго Read-Only карточка с причиной) -->
      <template v-else>
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 border border-rose-100 dark:border-rose-900/40 shadow-xs space-y-3 cursor-pointer select-none active:scale-[0.99] transition-all"
          @click="handleTaskClick(task)"
        >
          <!-- Верхняя строка: иконка, название, время отклонения, бейдж Отклонено -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0 flex-1">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60"
              >
                <CheckSquare v-if="task.type === 'checkbox'" class="w-5 h-5" />
                <Camera v-else class="w-5 h-5" />
              </div>

              <div class="min-w-0 flex-1">
                <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-100 leading-snug line-clamp-2">
                  {{ task.title }}
                </h4>
                <div class="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-slate-500">
                  <span v-if="task.reviewedAt || task.actualFinishTime || task.timestamp">
                    {{ formatRejectionTime(task.reviewedAt || task.actualFinishTime || task.timestamp) }}
                  </span>
                  <span v-if="task.userName" class="text-gray-300 dark:text-slate-600">•</span>
                  <span v-if="task.userName" class="truncate text-gray-500 dark:text-slate-400 font-medium">
                    {{ task.userName }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Красный бейдж статуса: Отклонено / Қабылданбады -->
            <div class="shrink-0">
              <StatusBadge status="Rejected" />
            </div>
          </div>

          <!-- Выделенный блок с комментарием управляющего (причина отклонения) -->
          <div
            v-if="task.reviewComment"
            class="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300 leading-relaxed"
          >
            <span class="font-bold">{{ $t('tasks.rejectionReason') }}:</span>
            <span class="ml-1.5">{{ task.reviewComment }}</span>
          </div>

          <!-- Превью прикрепленного фото (если есть) -->
          <div
            v-if="task.photoUrl"
            class="flex items-center justify-between pt-1 text-xs text-gray-500 dark:text-slate-400"
          >
            <div class="flex items-center gap-1.5 text-brand dark:text-brand-300 font-semibold text-xs">
              <Camera class="w-3.5 h-3.5" />
              <span>Фото прикреплено (нажмите для просмотра)</span>
            </div>
            <ChevronRight class="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </template>
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
import { useI18n } from 'vue-i18n';
import { CheckSquare, Camera, ChevronRight } from 'lucide-vue-next';
import noTasksAnimation from '@/assets/animations/no-tasks.json';
import noAllAnimation from '@/assets/animations/no-all.json';
import { useTelegramHaptic } from '@shared/lib';
import { formatTime, formatDate } from '@shared/lib/date';
import { StatusBadge } from '@shared/ui';
import { useTaskStore, TaskItemRow } from '@entities/task';
import { useSessionStore } from '@entities/session';
import { TaskActionModal } from '@features/complete-task';
import type { TaskResultUi } from '@shared/types';

type FilterType = 'not_done' | 'all' | 'in_review' | 'approved' | 'rejected';

const { t } = useI18n();
const taskStore = useTaskStore();
const sessionStore = useSessionStore();
const haptic = useTelegramHaptic();

onMounted(() => {
  const shopId = sessionStore.assignedShopId || '10';
  taskStore.subscribeTasks(shopId);
  taskStore.loadRejectedTasks(shopId);
});

const activeFilter = ref<FilterType>('not_done');
const isModalOpen = ref(false);
const activeTask = ref<TaskResultUi | null>(null);

const setFilter = (filter: FilterType) => {
  haptic.selection();
  activeFilter.value = filter;
};

const emptyStateAnimation = computed(() => {
  if (activeFilter.value === 'not_done' || activeFilter.value === 'all') {
    return noTasksAnimation;
  }
  return noAllAnimation;
});

const emptyStateTitle = computed(() => {
  switch (activeFilter.value) {
    case 'not_done':
      if (taskStore.totalCount === 0) return t('tasks.emptyShiftTasks');
      return t('tasks.allCompleted');
    case 'all':
      return t('tasks.emptyShiftTasks');
    case 'in_review':
      return t('tasks.emptyReview');
    case 'approved':
      return t('tasks.emptyApproved');
    case 'rejected':
      return t('tasks.emptyRejected');
    default:
      return t('tasks.empty');
  }
});

const emptyStateDescription = computed(() => {
  switch (activeFilter.value) {
    case 'not_done':
      if (taskStore.totalCount === 0) return t('tasks.emptyShiftTasksDesc');
      return t('tasks.allCompletedDesc');
    case 'all':
      return t('tasks.emptyShiftTasksDesc');
    case 'in_review':
      return t('tasks.emptyReviewDesc');
    case 'approved':
      return t('tasks.emptyApprovedDesc');
    case 'rejected':
      return t('tasks.emptyRejectedDesc');
    default:
      return '';
  }
});

const filteredTasks = computed(() => {
  switch (activeFilter.value) {
    case 'not_done':
      return taskStore.notDoneTasks;
    case 'in_review':
      return taskStore.tasks.filter((t) => t.status === 'In_Review');
    case 'approved':
      return taskStore.tasks.filter((t) => t.status === 'Approved');
    case 'rejected':
      return taskStore.rejectedTasks;
    case 'all':
    default:
      return taskStore.tasks.filter((t) => t.status !== 'Rejected');
  }
});

const formatRejectionTime = (timestamp?: number | null): string => {
  if (!timestamp) return '';
  const time = formatTime(timestamp);
  const date = formatDate(timestamp);
  return `${time} (${date})`;
};

const handleTaskClick = (task: TaskResultUi) => {
  haptic.impact('light');
  activeTask.value = task;
  isModalOpen.value = true;
};
</script>
