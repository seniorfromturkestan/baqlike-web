<template>
  <button
    :type="type"
    :disabled="isDisabled"
    :class="[
      'relative select-none font-medium rounded-xl flex items-center justify-center transition-all duration-150',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand',
      sizeClasses,
      variantClasses,
      block ? 'w-full' : 'inline-flex',
      isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'active:scale-[0.98] cursor-pointer'
    ]"
    @click="handleClick"
  >
    <!-- Индикатор загрузки -->
    <span
      v-if="loading"
      class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"
    />

    <!-- Кастомная иконка -->
    <component
      :is="icon"
      v-else-if="icon"
      class="w-4 h-4 mr-2 shrink-0"
    />

    <!-- Контент кнопки -->
    <span class="truncate">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';
import type { ButtonVariant } from '../../types';

interface Props {
  variant?: ButtonVariant;
  size?: 'small' | 'normal' | 'large';
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  icon?: Component | string;
  type?: 'button' | 'submit' | 'reset';
  debounceMs?: number;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'normal',
  loading: false,
  disabled: false,
  block: true,
  icon: undefined,
  type: 'button',
  debounceMs: 350
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const isDisabled = computed(() => props.disabled || props.loading);

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'small':
      return 'py-2 px-3 text-xs';
    case 'large':
      return 'py-4 px-6 text-base font-semibold';
    case 'normal':
    default:
      return 'py-3.5 px-4 text-sm';
  }
});

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'secondary':
      return 'bg-blue-50 dark:bg-blue-950/50 text-accent dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/80 dark:border-blue-800 shadow-sm';
    case 'danger':
      return 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 shadow-sm';
    case 'ghost':
      return 'bg-transparent text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-transparent';
    case 'primary':
    default:
      return 'bg-brand hover:bg-brand-600 dark:bg-brand dark:hover:bg-brand-500 text-white shadow-[0_2px_8px_rgba(108,60,225,0.25)] border border-brand-600';
  }
});

let lastClickTime = 0;

const handleClick = (event: MouseEvent) => {
  if (isDisabled.value) return;

  const now = Date.now();
  if (now - lastClickTime < props.debounceMs) {
    event.preventDefault();
    return;
  }
  lastClickTime = now;

  emit('click', event);
};
</script>
