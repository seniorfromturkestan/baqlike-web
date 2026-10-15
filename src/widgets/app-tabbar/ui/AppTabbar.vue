<template>
  <nav
    v-if="isVisible"
    class="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-gray-100 dark:border-slate-800 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)] select-none pb-safe transition-colors"
  >
    <div class="max-w-md mx-auto px-4 h-16 flex items-center justify-around">
      <!-- Таб 1: Смена -->
      <NuxtLink
        to="/shift"
        class="flex-1 flex flex-col items-center justify-center py-1 transition-all group"
        :class="isActive('/shift') ? 'text-brand dark:text-brand-300' : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'"
        @click="onTabClick"
      >
        <div class="relative">
          <Coffee
            class="w-5 h-5 transition-transform group-active:scale-90"
            :class="isActive('/shift') ? 'stroke-[2.5]' : 'stroke-2'"
          />
          <span
            v-if="shiftStore.isShiftActive"
            class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"
          />
        </div>
        <span class="text-[11px] font-medium mt-1">{{ $t('nav.shift') }}</span>
      </NuxtLink>

      <!-- Таб 2: Задачи -->
      <NuxtLink
        to="/tasks"
        class="flex-1 flex flex-col items-center justify-center py-1 transition-all group"
        :class="isActive('/tasks') ? 'text-brand dark:text-brand-300' : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'"
        @click="onTabClick"
      >
        <div class="relative">
          <CheckSquare
            class="w-5 h-5 transition-transform group-active:scale-90"
            :class="isActive('/tasks') ? 'stroke-[2.5]' : 'stroke-2'"
          />
          <!-- Бейдж количества невыполненных задач -->
          <span
            v-if="unreadTasksCount > 0"
            class="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white min-w-4 text-center ring-2 ring-white dark:ring-slate-900"
          >
            {{ unreadTasksCount }}
          </span>
        </div>
        <span class="text-[11px] font-medium mt-1">{{ $t('nav.tasks') }}</span>
      </NuxtLink>

      <!-- Таб 3: Профиль -->
      <NuxtLink
        to="/profile"
        class="flex-1 flex flex-col items-center justify-center py-1 transition-all group"
        :class="isActive('/profile') ? 'text-brand dark:text-brand-300' : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'"
        @click="onTabClick"
      >
        <div class="relative">
          <User
            class="w-5 h-5 transition-transform group-active:scale-90"
            :class="isActive('/profile') ? 'stroke-[2.5]' : 'stroke-2'"
          />
        </div>
        <span class="text-[11px] font-medium mt-1">{{ $t('nav.profile') }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Coffee, CheckSquare, User } from 'lucide-vue-next';
import { useShiftStore } from '@entities/shift';
import { useTaskStore } from '@entities/task';
import { useTelegramHaptic } from '@shared/lib';

const route = useRoute();
const shiftStore = useShiftStore();
const taskStore = useTaskStore();
const haptic = useTelegramHaptic();

const isVisible = computed(() => {
  return route.path !== '/auth' && !route.path.startsWith('/auth/');
});

const onTabClick = () => {
  haptic.selection();
};

const isActive = (path: string): boolean => {
  if (path === '/shift') {
    return route.path === '/shift' || route.path === '/';
  }
  return route.path.startsWith(path);
};

const unreadTasksCount = computed(() => {
  return taskStore.notDoneTasks.length;
});
</script>
