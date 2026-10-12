<template>
  <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 select-none transition-colors">
    <!-- Шапка формы -->
    <div class="text-center space-y-2">
      <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand to-accent mx-auto flex items-center justify-center text-white shadow-md shadow-purple-500/20">
        <Coffee class="w-6 h-6" />
      </div>
      <h2 class="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
        {{ $t('auth.title') }}
      </h2>
      <p class="text-xs text-gray-500 dark:text-slate-400">
        {{ $t('auth.subtitle') }}
      </p>
    </div>

    <!-- Форма входа по Email и паролю -->
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-gray-700 dark:text-slate-300">
          {{ $t('auth.emailLabel') }}
        </label>
        <div class="relative">
          <input
            v-model="emailInput"
            type="email"
            required
            autocomplete="email"
            :placeholder="$t('auth.emailPlaceholder')"
            class="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
          >
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-xs font-semibold text-gray-700 dark:text-slate-300">
          {{ $t('auth.passwordLabel') }}
        </label>
        <div class="relative">
          <input
            v-model="passwordInput"
            type="password"
            required
            autocomplete="current-password"
            :placeholder="$t('auth.passwordPlaceholder')"
            class="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
          >
        </div>
      </div>

      <!-- Сообщение об ошибке -->
      <div
        v-if="errorMessage"
        class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300"
      >
        {{ errorMessage }}
      </div>

      <AppButton
        type="submit"
        variant="primary"
        size="large"
        :loading="isSubmitting"
        class="w-full"
      >
        {{ $t('auth.submit') }}
      </AppButton>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Coffee } from 'lucide-vue-next';
import { AppButton } from '@shared/ui';
import { useSessionStore } from '@entities/session';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const { t } = useI18n();
const sessionStore = useSessionStore();

const emailInput = ref('');
const passwordInput = ref('');
const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);

const handleSubmit = async () => {
  errorMessage.value = null;

  if (!emailInput.value || !passwordInput.value) {
    errorMessage.value = t('auth.emailError');
    return;
  }

  isSubmitting.value = true;
  try {
    await sessionStore.loginWithEmail(emailInput.value.trim(), passwordInput.value);
    emit('success');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : t('auth.emailError');
    errorMessage.value = msg;
  } finally {
    isSubmitting.value = false;
  }
};
</script>
