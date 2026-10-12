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

const localizedLabel = computed(() => {
  const key = `status.${props.status}`;
  return te(key) ? t(key) : badgeTheme.value.label;
});

const badgeTheme = computed(() => {
  return STATUS_THEMES[props.status] || {
    label: props.status,
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    dotColor: 'bg-gray-400'
  };
});

const statusIcon = computed(() => {
  switch (props.status) {
    case 'Approved':
      return CheckCircle2;
    case 'In_Review':
      return Clock;
    case 'Rejected':
      return XCircle;
    case 'Not_Done':
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
