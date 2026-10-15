<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border select-none transition-colors',
      badgeTheme.bgColor,
      badgeTheme.textColor,
      badgeTheme.borderColor
    ]"
  >
    <!-- Lucide Icon -->
    <component
      :is="statusIcon"
      class="w-3.5 h-3.5 shrink-0"
    />

    <!-- Текстовая метка -->
    <span>{{ customLabel || localizedLabel }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  PlayCircle,
  Lock
} from 'lucide-vue-next';
import { STATUS_THEMES } from '../../config/constants';
import type { StatusBadgeType } from '../../types';

interface Props {
  status: StatusBadgeType;
  customLabel?: string;
}

const props = defineProps<Props>();
const { t, te } = useI18n();

const normalizedStatus = computed<string>(() => {
  if (props.status === 'Not_Done') return 'Active';
  return props.status;
});

const localizedLabel = computed(() => {
  if (normalizedStatus.value === 'Active') {
    if (te('tasks.status.active')) return t('tasks.status.active');
    if (te('status.Active')) return t('status.Active');
    return 'Активная';
  }
  if (normalizedStatus.value === 'Overdue') {
    if (te('tasks.status.overdue')) return t('tasks.status.overdue');
    if (te('status.Overdue')) return t('status.Overdue');
    return 'Просрочено';
  }
  if (normalizedStatus.value === 'ApprovedOverdue') {
    if (te('tasks.status.approvedOverdue')) return t('tasks.status.approvedOverdue');
    if (te('status.ApprovedOverdue')) return t('status.ApprovedOverdue');
    return 'С опозданием';
  }
  const key = `status.${normalizedStatus.value}`;
  return te(key) ? t(key) : badgeTheme.value.label;
});

const badgeTheme = computed(() => {
  const theme = STATUS_THEMES[normalizedStatus.value as keyof typeof STATUS_THEMES];
  if (theme) return theme;
  return {
    label: normalizedStatus.value,
    textColor: 'text-gray-700 dark:text-slate-300',
    bgColor: 'bg-gray-100 dark:bg-slate-800',
    borderColor: 'border-gray-200 dark:border-slate-700',
    dotColor: 'bg-gray-400 dark:bg-slate-500'
  };
});

const statusIcon = computed(() => {
  switch (normalizedStatus.value) {
    case 'Approved':
      return CheckCircle2;
    case 'ApprovedOverdue':
      return AlertCircle;
    case 'In_Review':
      return Clock;
    case 'Rejected':
      return XCircle;
    case 'Active':
      return Clock;
    case 'Overdue':
      return AlertCircle;
    case 'Open':
      return PlayCircle;
    case 'Closed':
      return Lock;
    default:
      return Clock;
  }
});
</script>
