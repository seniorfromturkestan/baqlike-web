<template>
  <header class="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-[#0B132B] border-b border-slate-100 dark:border-slate-800/80 pt-[max(env(safe-area-inset-top),12px)] transition-colors">
    <div class="h-11 flex items-center justify-center px-16 relative">
      <h1 class="text-sm font-semibold text-slate-900 dark:text-white tracking-wide select-none truncate">
        {{ title }}
      </h1>
    </div>
  </header>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
}

withDefaults(defineProps<Props>(), {
  title: 'BaqLike Staff'
});
</script>
