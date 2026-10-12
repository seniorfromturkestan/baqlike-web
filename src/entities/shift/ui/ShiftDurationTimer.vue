<template>
  <div
    :class="[
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold select-none border transition-colors',
      active
        ? 'bg-purple-50 dark:bg-purple-950/50 text-brand dark:text-brand-300 border-purple-200 dark:border-purple-800 shadow-xs'
        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700'
    ]"
  >
    <Clock class="w-3.5 h-3.5 shrink-0" :class="active ? 'text-brand dark:text-brand-300 animate-pulse' : 'text-gray-400 dark:text-slate-500'" />
    <span>{{ formattedTime }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { Clock } from 'lucide-vue-next';
import { formatDuration, parseToTimestamp } from '@shared/lib/date';

interface Props {
  checkIn?: any;
  checkOut?: any;
  active?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  checkIn: null,
  checkOut: null,
  active: true
});

const now = ref(Date.now());
let timerInterval: any = null;

const startTimestamp = computed(() => {
  return parseToTimestamp(props.checkIn);
});

const endTimestamp = computed(() => {
  return parseToTimestamp(props.checkOut);
});

const durationMs = computed(() => {
  if (!startTimestamp.value) return 0;
  const currentEnd = endTimestamp.value || now.value;
  return Math.max(0, currentEnd - startTimestamp.value);
});

const formattedTime = computed(() => {
  return formatDuration(durationMs.value);
});

const startTimer = () => {
  stopTimer();
  now.value = Date.now();
  if (props.active && !props.checkOut) {
    timerInterval = setInterval(() => {
      now.value = Date.now();
    }, 1000);
  }
};

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

watch(
  () => [props.checkIn, props.checkOut, props.active],
  () => {
    startTimer();
  },
  { immediate: true }
);

onMounted(() => {
  startTimer();
});

onBeforeUnmount(() => {
  stopTimer();
});
</script>
