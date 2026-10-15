<template>
  <div class="relative w-full h-[100dvh] overflow-hidden bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col select-none transition-colors">
    <!-- Системная шапка Telegram WebApp: отцентрированный заголовок BaqLike Staff, фиксированный белый фон -->
    <AppHeader v-if="showHeader" :title="headerTitle" />

    <!-- Subheader Slot (контекстная плашка страницы, например аватар или заголовок раздела) -->
    <div
      v-if="$slots.header"
      class="safe-layout-subheader w-full bg-white/95 dark:bg-[#0B132B]/95 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)] shrink-0 z-10"
      :class="{ 'has-app-header': showHeader }"
    >
      <div class="w-full max-w-md mx-auto">
        <slot name="header" />
      </div>
    </div>

    <!-- Main Content Area (Mobile Container) -->
    <main
      class="app-scroll-container flex-1 w-full max-w-md mx-auto px-4"
      :class="[
        !$slots.header && showHeader ? 'content-with-header' : 'pt-4',
        hasFooter || hasTabbar ? 'pb-tabbar' : 'pb-safe',
        contentClass
      ]"
    >
      <slot />
    </main>

    <!-- Footer Bar Slot (Фиксированная нижняя панель с безопасной зоной) -->
    <footer
      v-if="$slots.footer"
      class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-100 dark:border-slate-800 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)]"
    >
      <div class="w-full max-w-md mx-auto px-4 py-3">
        <slot name="footer" />
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useSlots, computed } from 'vue';
import { AppHeader } from '@widgets/app-header';

interface Props {
  contentClass?: string;
  hasTabbar?: boolean;
  headerTitle?: string;
  showHeader?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  contentClass: '',
  hasTabbar: true,
  headerTitle: 'BaqLike Staff',
  showHeader: true
});

const slots = useSlots();
const hasFooter = computed(() => Boolean(slots.footer));
</script>

<style scoped>
.safe-layout-subheader.has-app-header {
  padding-top: calc(var(--tg-safe-top) + var(--tg-header-height));
}

.content-with-header {
  padding-top: calc(var(--tg-safe-top) + var(--tg-header-height) + 12px);
}
</style>
