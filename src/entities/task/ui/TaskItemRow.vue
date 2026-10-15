<template>
  <div
    :class="[
      'w-full bg-white dark:bg-slate-900 rounded-2xl p-4 border shadow-xs flex items-center justify-between gap-3 active:scale-[0.99] transition-all cursor-pointer select-none',
      isOverdue
        ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/20 dark:bg-amber-950/20 hover:border-amber-400'
        : 'border-gray-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800'
    ]"
    @click="$emit('click', task)"
  >
    <!-- Левая колонка: Иконка типа и Заголовок -->
    <div class="flex items-start gap-3 min-w-0 flex-1">
      <div
        :class="[
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs transition-colors',
          isOverdue
            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
            : task.type === 'checkbox'
              ? 'bg-purple-50 dark:bg-purple-950/50 text-brand dark:text-brand-300 border-purple-100 dark:border-purple-900/50'
              : 'bg-blue-50 dark:bg-blue-950/50 text-accent dark:text-blue-300 border-blue-100 dark:border-blue-900/50'
        ]"
      >
        <CheckSquare v-if="task.type === 'checkbox'" class="w-5 h-5" />
        <Camera v-else class="w-5 h-5" />
      </div>

      <div class="min-w-0 flex-1">
        <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-100 leading-snug line-clamp-2">
          {{ task.title }}
        </h4>

        <div class="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-slate-500">
          <span :class="isOverdue ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''">
            {{ $t('tasks.dueTo') }} {{ formatDeadline(task.expectedFinishTime) }}
          </span>
          <span v-if="task.userName" class="text-gray-300 dark:text-slate-600">•</span>
          <span v-if="task.userName" class="truncate text-gray-500 dark:text-slate-400 font-medium">
            {{ task.userName }}
          </span>
        </div>
      </div>
    </div>

    <!-- Правая колонка: Бейдж статуса и стрелка -->
    <div class="flex items-center gap-2 shrink-0">
      <StatusBadge :status="taskDisplayStatus" />
      <ChevronRight class="w-4 h-4 text-gray-300 dark:text-slate-600" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CheckSquare, Camera, ChevronRight } from 'lucide-vue-next';
import { StatusBadge } from '@shared/ui';
import { formatTime, formatDate } from '@shared/lib/date';
import type { TaskResultUi, StatusBadgeType } from '@shared/types';
import { getTaskDisplayStatus } from '../api/taskApi';

interface Props {
  task: TaskResultUi;
}

const props = defineProps<Props>();

defineEmits<{
  (e: 'click', task: TaskResultUi): void;
}>();

const taskDisplayStatus = computed<StatusBadgeType>(() => {
  return getTaskDisplayStatus(props.task);
});

const isOverdue = computed<boolean>(() => {
  return taskDisplayStatus.value === 'Overdue';
});

const formatDeadline = (timestamp: number): string => {
  if (!timestamp) return '';
  const time = formatTime(timestamp);
  const date = formatDate(timestamp);
  return `${time} (${date})`;
};
</script>
