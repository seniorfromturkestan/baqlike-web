<template>
  <div class="w-full space-y-4 select-none">
    <!-- 1. Карточка профиля бариста -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-gray-100 dark:border-slate-800 shadow-sm text-center relative overflow-hidden transition-colors">
      <!-- Фон декорации -->
      <div class="absolute -top-12 -right-12 w-36 h-36 bg-purple-100/50 dark:bg-purple-900/20 rounded-full blur-2xl pointer-events-none" />

      <div class="relative z-10 flex flex-col items-center">
        <!-- Аватар с поддержкой фото и загрузки -->
        <div class="relative group cursor-pointer mb-3" @click="triggerAvatarUpload">
          <div class="w-20 h-20 rounded-3xl overflow-hidden bg-gradient-to-tr from-brand to-accent text-white font-bold text-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 border-2 border-white dark:border-slate-800 relative">
            <img
              v-if="sessionStore.user?.avatarUrl"
              :src="sessionStore.user.avatarUrl"
              alt="Avatar"
              class="w-full h-full object-cover"
            >
            <span v-else>{{ sessionStore.userInitials }}</span>

            <!-- Оверлей загрузки -->
            <div
              v-if="isUploadingAvatar"
              class="absolute inset-0 bg-black/60 flex items-center justify-center text-white"
            >
              <RotateCw class="w-6 h-6 animate-spin" />
            </div>
          </div>

          <!-- Кнопка с иконкой камеры поверх аватара -->
          <div class="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-brand text-white shadow-md border-2 border-white dark:border-slate-900 group-hover:scale-110 active:scale-95 transition">
            <Camera class="w-3.5 h-3.5" />
          </div>

          <input
            ref="avatarFileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            :disabled="isUploadingAvatar"
            @change="handleAvatarFileSelected"
          >
        </div>

        <h2 class="text-lg font-bold text-gray-900 dark:text-slate-100 leading-tight">
          {{ sessionStore.user?.name || $t('profile.role') }}
        </h2>

        <div class="flex items-center gap-1.5 mt-1">
          <span class="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-brand dark:text-brand-300 font-semibold border border-purple-100 dark:border-purple-900/50">
            {{ sessionStore.userRole }}
          </span>
        </div>

        <!-- Торговая точка -->
        <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 mt-3 bg-gray-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-slate-700/60">
          <MapPin class="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
          <span>{{ shopStore.shopName }}</span>
        </div>

        <!-- Кнопка вызова QR-кода -->
        <button
          type="button"
          class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-brand dark:text-brand-300 font-semibold text-xs border border-purple-200/60 dark:border-purple-800/60 transition active:scale-95"
          @click="openQrModal"
        >
          <QrCode class="w-4 h-4" />
          <span>{{ $t('profile.myQrCode') }}</span>
        </button>
      </div>
    </div>

    <!-- 2. Переключатель языка интерфейса (RU / KK) -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100/60 dark:border-slate-700/60">
          <Languages class="w-5 h-5" />
        </div>
        <div>
          <h4 class="text-xs font-semibold text-gray-900 dark:text-slate-100">
            {{ $t('profile.interfaceLanguage') }}
          </h4>
          <p class="text-[11px] text-gray-500 dark:text-slate-400">
            {{ currentLocaleCode === 'ru' ? 'Русский язык' : 'Қазақ тілі' }}
          </p>
        </div>
      </div>

      <!-- Сегментированный переключатель RU / KK -->
      <div class="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-semibold">
        <button
          type="button"
          class="px-3 py-1.5 rounded-xl transition duration-200"
          :class="currentLocaleCode === 'ru' ? 'bg-white dark:bg-slate-700 text-brand dark:text-brand-300 shadow-xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'"
          @click="switchLocale('ru')"
        >
          RU
        </button>
        <button
          type="button"
          class="px-3 py-1.5 rounded-xl transition duration-200"
          :class="currentLocaleCode === 'kk' ? 'bg-white dark:bg-slate-700 text-brand dark:text-brand-300 shadow-xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'"
          @click="switchLocale('kk')"
        >
          KK
        </button>
      </div>
    </div>

    <!-- 3. Настройка внешнего вида (Тёмная тема) -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-slate-800 text-brand dark:text-brand-300 flex items-center justify-center border border-purple-100/60 dark:border-slate-700/60">
          <Moon v-if="isDark" class="w-5 h-5 text-purple-400" />
          <Sun v-else class="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h4 class="text-xs font-semibold text-gray-900 dark:text-slate-100">
            {{ $t('profile.theme') }}
          </h4>
          <p class="text-[11px] text-gray-500 dark:text-slate-400">
            {{ isDark ? $t('profile.dark') : $t('profile.light') }}
          </p>
        </div>
      </div>

      <button
        type="button"
        class="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
        :class="isDark ? 'bg-brand' : 'bg-gray-200 dark:bg-slate-700'"
        @click="handleToggleTheme"
      >
        <span
          class="pointer-events-none inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
          :class="isDark ? 'translate-x-5' : 'translate-x-0'"
        >
          <Moon v-if="isDark" class="w-3.5 h-3.5 text-brand" />
          <Sun v-else class="w-3.5 h-3.5 text-amber-500" />
        </span>
      </button>
    </div>

    <!-- 4. Информационная плашка регламента и правил работы -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
      <div class="flex items-center gap-2">
        <ShieldCheck class="w-4 h-4 text-brand dark:text-brand-300" />
        <h3 class="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider">
          {{ $t('profile.rulesTitle') }}
        </h3>
      </div>

      <ul class="space-y-2.5 text-xs text-gray-600 dark:text-slate-400">
        <li class="flex items-start gap-2.5">
          <span class="w-5 h-5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-brand dark:text-brand-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
            50м
          </span>
          <span>{{ $t('profile.rule1') }}</span>
        </li>
        <li class="flex items-start gap-2.5">
          <span class="w-5 h-5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-accent dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
            <Camera class="w-3 h-3" />
          </span>
          <span>{{ $t('profile.rule2') }}</span>
        </li>
        <li class="flex items-start gap-2.5">
          <span class="w-5 h-5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
            <Check class="w-3 h-3" />
          </span>
          <span>{{ $t('profile.rule3') }}</span>
        </li>
      </ul>
    </div>

    <!-- 5. Кнопка выхода из системы -->
    <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
      <AppButton
        variant="danger"
        :icon="LogOut"
        :loading="isLoggingOut"
        @click="handleLogout"
      >
        {{ $t('profile.logout') }}
      </AppButton>

      <p class="text-[11px] text-gray-400 dark:text-slate-500 text-center leading-relaxed">
        {{ $t('profile.appVersion') }}
      </p>
    </div>

    <!-- Модальное окно: QR-код сотрудника -->
    <van-popup
      v-model:show="isQrModalOpen"
      round
      :closeable="false"
      position="bottom"
      :z-index="100"
      teleport="body"
      :style="{ maxHeight: '85%' }"
      class="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
      safe-area-inset-bottom
      @close="closeQrModal"
    >
      <div class="p-6 pt-5 text-center space-y-4 max-w-md mx-auto relative">
        <!-- Кнопка закрытия (X) -->
        <button
          type="button"
          class="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition active:scale-90 z-20"
          aria-label="Close"
          @click="closeQrModal"
        >
          <X class="w-5 h-5" />
        </button>

        <!-- Индикатор свайпа -->
        <div class="w-10 h-1 bg-gray-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

        <div>
          <h3 class="text-lg font-bold text-gray-900 dark:text-slate-100">
            {{ $t('profile.employeeQr') }}
          </h3>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-[280px] mx-auto">
            {{ $t('profile.scanQrDesc') }}
          </p>
        </div>

        <!-- Контейнер QR-кода -->
        <div class="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-slate-800 inline-block mx-auto">
          <QrcodeVue
            :value="qrCodeData"
            :size="220"
            level="H"
            render-as="svg"
          />
        </div>

        <div class="space-y-1">
          <div class="text-sm font-semibold text-gray-900 dark:text-slate-100">
            {{ sessionStore.user?.name || $t('shift.barista') }}
          </div>
          <div class="text-xs text-brand dark:text-brand-300 font-mono">
            UID: {{ sessionStore.user?.id || 'baqlike-employee' }}
          </div>
          <div class="text-xs text-gray-400 dark:text-slate-500">
            {{ shopStore.shopName }}
          </div>
        </div>

        <button
          type="button"
          class="w-full py-3 px-4 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-semibold text-xs active:scale-98 transition"
          @click="closeQrModal"
        >
          {{ $t('common.close') }}
        </button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { showFailToast, showSuccessToast, showDialog } from 'vant';
import { MapPin, ShieldCheck, LogOut, Sun, Moon, Camera, Check, QrCode, Languages, X, RotateCw } from 'lucide-vue-next';
import QrcodeVue from 'qrcode.vue';
import { AppButton } from '@shared/ui';
import { useAppTheme, useTelegramHaptic } from '@shared/lib';
import { useSessionStore } from '@entities/session';
import { useShopStore } from '@entities/shop';
import { useShiftStore } from '@entities/shift';

const router = useRouter();
const { t, locale, setLocale } = useI18n();
const { isDark, toggleTheme } = useAppTheme();
const haptic = useTelegramHaptic();
const sessionStore = useSessionStore();
const shopStore = useShopStore();
const shiftStore = useShiftStore();

const isLoggingOut = ref(false);
const isQrModalOpen = ref(false);
const isUploadingAvatar = ref(false);
const avatarFileInputRef = ref<HTMLInputElement | null>(null);

const triggerAvatarUpload = () => {
  if (isUploadingAvatar.value) return;
  haptic.impact('light');
  avatarFileInputRef.value?.click();
};

const handleAvatarFileSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  isUploadingAvatar.value = true;
  haptic.impact('medium');
  try {
    await sessionStore.uploadAvatar(file);
    showSuccessToast(t('profile.avatarUpdated', 'Фото профиля обновлено'));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Ошибка загрузки аватара';
    showFailToast(msg);
  } finally {
    isUploadingAvatar.value = false;
    if (avatarFileInputRef.value) {
      avatarFileInputRef.value.value = '';
    }
  }
};

const currentLocaleCode = computed(() => locale.value);

const openQrModal = () => {
  haptic.impact('light');
  isQrModalOpen.value = true;
};

const closeQrModal = () => {
  haptic.impact('light');
  isQrModalOpen.value = false;
};

const handleToggleTheme = () => {
  haptic.selection();
  toggleTheme();
};

const switchLocale = async (code: 'ru' | 'kk') => {
  haptic.selection();
  if (setLocale) {
    await setLocale(code);
  } else {
    locale.value = code;
  }
};

const qrCodeData = computed(() => {
  return JSON.stringify({
    uid: sessionStore.user?.id || 'unknown',
    name: sessionStore.user?.name || '',
    shopId: sessionStore.assignedShopId || '',
    role: sessionStore.user?.role || 'barista',
    timestamp: Date.now()
  });
});

const handleLogout = async () => {
  // Проверка по ТЗ: если смена открыта, выход блокируется
  if (shiftStore.isOpen || sessionStore.currentShiftId) {
    haptic.notification('warning');
    showDialog({
      title: t('profile.logoutWarningTitle'),
      message: t('profile.logoutWarningDesc'),
      confirmButtonText: t('profile.gotIt'),
      confirmButtonColor: '#6C3CE1'
    });
    return;
  }

  haptic.impact('medium');
  isLoggingOut.value = true;
  try {
    await sessionStore.logout();
    haptic.notification('success');
    router.replace('/auth');
  } catch (err: unknown) {
    haptic.notification('error');
    const message = err instanceof Error ? err.message : t('profile.logoutError');
    showFailToast(message);
  } finally {
    isLoggingOut.value = false;
  }
};
</script>
