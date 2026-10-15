<template>
  <div class="min-h-[100dvh] bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col justify-center px-4 py-8 select-none transition-colors">
    <div class="w-full max-w-md mx-auto">
      <!-- 0. Карточка блокировки для администраторов -->
      <div
        v-if="sessionStore.isAdminForbidden"
        class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-amber-200 dark:border-amber-900/50 shadow-sm space-y-6 text-center select-none transition-colors"
      >
        <div class="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/40 mx-auto flex items-center justify-center text-amber-500 dark:text-amber-400 shadow-sm">
          <ShieldAlert class="w-8 h-8" />
        </div>

        <div class="space-y-2">
          <h2 class="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
            {{ $t('auth.adminForbiddenTitle') }}
          </h2>
          <p class="text-xs text-gray-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            {{ $t('auth.adminForbiddenDesc') }}
          </p>
        </div>

        <div class="space-y-3 pt-2">
          <AppButton
            variant="primary"
            size="large"
            class="w-full"
            @click="handleOpenAdminBot"
          >
            {{ $t('auth.openAdminBot') }}
          </AppButton>

          <AppButton
            variant="secondary"
            size="large"
            class="w-full"
            @click="handleCloseTelegram"
          >
            {{ $t('common.close') }}
          </AppButton>
        </div>
      </div>

      <!-- 1. Карточка отказа в доступе (аккаунт не зарегистрирован в Users) -->
      <div
        v-else-if="sessionStore.isUserNotFound"
        class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-rose-100 dark:border-rose-950/40 shadow-sm space-y-6 text-center select-none transition-colors"
      >
        <div class="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/40 mx-auto flex items-center justify-center text-rose-500 dark:text-rose-400 shadow-sm">
          <Lock class="w-8 h-8" />
        </div>

        <div class="space-y-2">
          <h2 class="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
            {{ $t('auth.userNotFoundTitle') }}
          </h2>
          <p class="text-xs text-gray-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            {{ $t('auth.userNotFoundDesc') }}
          </p>
        </div>

        <div class="space-y-3 pt-2">
          <AppButton
            variant="primary"
            size="large"
            class="w-full"
            @click="handleRetryAfterNotFound"
          >
            {{ $t('auth.retry') }}
          </AppButton>

          <AppButton
            v-if="isTelegramMode"
            variant="secondary"
            size="large"
            class="w-full"
            @click="handleCloseTelegram"
          >
            {{ $t('common.close') }}
          </AppButton>
        </div>
      </div>

      <!-- 2. Карточка отказа в доступе (аккаунт Telegram не найден в Users) -->
      <div
        v-else-if="sessionStore.isAccessDenied"
        class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-rose-100 dark:border-rose-950/40 shadow-sm space-y-6 text-center select-none"
      >
        <div class="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/40 mx-auto flex items-center justify-center text-rose-500 dark:text-rose-400 shadow-sm">
          <Lock class="w-8 h-8" />
        </div>

        <div class="space-y-2">
          <h2 class="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
            {{ $t('auth.accessDeniedTitle') }}
          </h2>
          <p class="text-xs text-gray-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            {{ $t('auth.accessDeniedDesc', { username: telegramUserDisplay }) }}
          </p>
        </div>

        <div class="space-y-3 pt-2">
          <AppButton
            variant="primary"
            size="large"
            :loading="isChecking"
            class="w-full"
            @click="handleTelegramLogin"
          >
            {{ $t('auth.retry') }}
          </AppButton>

          <AppButton
            variant="secondary"
            size="large"
            class="w-full"
            @click="handleCloseTelegram"
          >
            {{ $t('common.close') }}
          </AppButton>
        </div>
      </div>

      <!-- 2. Форма входа по Email (если переключено пользователем) -->
      <div v-else-if="showEmailForm" class="space-y-4">
        <AuthEmailForm @success="handleSuccess" />

        <div v-if="isTelegramMode" class="text-center">
          <button
            type="button"
            class="text-xs font-semibold text-brand dark:text-brand-300 hover:underline transition"
            @click="showEmailForm = false"
          >
            ← {{ $t('auth.backToTelegram') }}
          </button>
        </div>
      </div>

      <!-- 3. Основной экран входа: Кнопка входа через Telegram -->
      <div
        v-else-if="isTelegramMode"
        class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 text-center select-none transition-colors"
      >
        <!-- Шапка -->
        <div class="space-y-3">
          <img
            src="/logo-staff-baqlike.png"
            alt="BaqLike Staff"
            class="w-16 h-16 rounded-2xl shadow-lg shadow-purple-500/15 mx-auto object-contain"
          >
          <div class="space-y-1">
            <h2 class="text-xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
              {{ $t('auth.title') }}
            </h2>
            <p class="text-xs text-gray-500 dark:text-slate-400">
              {{ $t('auth.subtitle') }}
            </p>
          </div>
        </div>

        <!-- Превью аккаунта Telegram -->
        <div class="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700/60 flex items-center justify-center gap-2.5">
          <div class="w-7 h-7 rounded-full bg-[#24A1DE] text-white flex items-center justify-center shrink-0 shadow-xs">
            <svg class="w-3.5 h-3.5 fill-current -translate-x-[0.5px]" viewBox="0 0 24 24">
              <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.693c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>
            </svg>
          </div>
          <span class="text-xs font-semibold text-gray-800 dark:text-slate-200">
            {{ telegramUserDisplay }}
          </span>
        </div>

        <!-- Кнопка «Войти через Telegram» -->
        <button
          type="button"
          :disabled="isChecking || sessionStore.loading"
          class="w-full py-4 px-6 rounded-2xl bg-[#24A1DE] hover:bg-[#2092cb] active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-sky-500/25 transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          @click="handleTelegramLogin"
        >
          <RotateCw v-if="isChecking || sessionStore.loading" class="w-5 h-5 animate-spin" />
          <svg v-else class="w-5 h-5 fill-current shrink-0 -translate-x-[0.5px]" viewBox="0 0 24 24">
            <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.693c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>
          </svg>
          <span>{{ $t('auth.loginViaTelegram') }}</span>
        </button>

        <!-- Разделитель и кнопка перехода на вход по Email -->
        <div class="pt-2">
          <button
            type="button"
            class="text-xs text-gray-500 hover:text-brand dark:text-slate-400 dark:hover:text-brand-300 font-medium transition"
            @click="showEmailForm = true"
          >
            {{ $t('auth.orEmailLogin') }}
          </button>
        </div>
      </div>

      <!-- 4. Вне Telegram (обычный браузер) -->
      <div v-else class="space-y-4">
        <AuthEmailForm @success="handleSuccess" />
      </div>

      <!-- Нижняя сноска о политике конфиденциальности -->
      <!-- <div class="text-center mt-6">
        <a
          href="https://baqlike-admin.netlify.app/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-gray-400 dark:text-slate-500 hover:text-brand dark:hover:text-brand-300 underline transition"
        >
          {{ $t('auth.privacyPolicy') }}
        </a>
      </div> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { RotateCw, Lock, ShieldAlert } from 'lucide-vue-next';
import { AppButton } from '@shared/ui';
import { useSessionStore } from '@entities/session';
import { AuthEmailForm } from '@features/auth-by-email';

const router = useRouter();
const sessionStore = useSessionStore();

const isChecking = ref(false);
const showEmailForm = ref(false);

const getTgUser = () => {
  if (typeof window === 'undefined') return null;
  const tg = (window as any).Telegram?.WebApp;
  return tg?.initDataUnsafe?.user || null;
};

const isTelegramMode = computed(() => {
  const tgUser = getTgUser();
  return Boolean(tgUser && tgUser.id);
});

const telegramUserDisplay = computed(() => {
  const user = getTgUser();
  if (!user) return '@staff';
  if (user.username) {
    const clean = String(user.username).replace(/^@/, '');
    return `@${clean}`;
  }
  return user.first_name ? `@${user.first_name}` : `ID ${user.id}`;
});

const handleTelegramLogin = async () => {
  if (isChecking.value) return;
  isChecking.value = true;
  try {
    const success = await sessionStore.loginViaTelegram();
    if (success) {
      router.replace('/shift');
    }
  } catch (err) {
    console.warn('[Auth] Telegram login error:', err);
  } finally {
    isChecking.value = false;
  }
};

const handleOpenAdminBot = () => {
  const adminBotUrl = 'https://t.me/baqlike_admin_bot';
  if (typeof window !== 'undefined') {
    const tg = (window as any).Telegram?.WebApp;
    if (typeof tg?.openTelegramLink === 'function') {
      tg.openTelegramLink(adminBotUrl);
    } else {
      window.open(adminBotUrl, '_blank');
    }
  }
};

const handleRetryAfterNotFound = () => {
  sessionStore.isUserNotFound = false;
  if (isTelegramMode.value) {
    handleTelegramLogin();
  }
};

const handleCloseTelegram = () => {
  sessionStore.isAdminForbidden = false;
  sessionStore.isUserNotFound = false;
  sessionStore.isAccessDenied = false;
  if (typeof window !== 'undefined') {
    const tg = (window as any).Telegram?.WebApp;
    if (typeof tg?.close === 'function') {
      tg.close();
    }
  }
};

const handleSuccess = () => {
  router.replace('/shift');
};

onMounted(() => {
  if (sessionStore.isAuthenticated && !sessionStore.isUserNotFound && !sessionStore.isAdminForbidden && !sessionStore.isAccessDenied) {
    router.replace('/shift');
  }
});
</script>
