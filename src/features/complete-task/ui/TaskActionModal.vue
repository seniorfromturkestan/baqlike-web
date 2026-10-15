<template>
  <!-- Мобильная шторка задачи (Bottom Sheet через van-popup как в QR-коде) -->
  <van-popup
    :show="Boolean(modelValue && task)"
    round
    :closeable="false"
    position="bottom"
    :z-index="100"
    teleport="body"
    :style="{ maxHeight: '90%' }"
    class="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
    safe-area-inset-bottom
    @update:show="onPopupUpdateShow"
  >
    <div v-if="task" class="pl-4 pr-4 pb-4 space-y-4 max-w-md mx-auto select-none relative">
      <!-- Кнопка закрытия (X) -->
      <button
        type="button"
        class="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition active:scale-90 z-20"
        aria-label="Close"
        @click="handleClose"
      >
        <X class="w-5 h-5" />
      </button>

      <!-- Индикатор свайпа -->
      <div class="w-10 h-1 bg-gray-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

      <!-- Шапка модалки -->
      <div class="pr-8 space-y-1">
        <div class="flex items-center gap-2">
          <span
            :class="[
              'text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md border',
              task.type === 'checkbox'
                ? 'bg-purple-50 dark:bg-purple-950/50 text-brand dark:text-brand-300 border-purple-200 dark:border-purple-800'
                : 'bg-blue-50 dark:bg-blue-950/50 text-accent dark:text-blue-300 border-blue-200 dark:border-blue-800'
            ]"
          >
            {{ task.type === 'checkbox' ? $t('tasks.checkbox') : $t('tasks.photoReport') }}
          </span>
          <StatusBadge :status="taskDisplayStatus" />
        </div>
        <h3 class="text-base font-bold text-gray-900 dark:text-slate-100 leading-snug">
          {{ task.title }}
        </h3>
      </div>

      <!-- Комментарий ревьюера (если есть и задача не отклонена) -->
      <div
        v-if="task.reviewComment && task.status !== 'Rejected'"
        class="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-200 space-y-0.5"
      >
        <span class="font-semibold">{{ $t('tasks.reviewerComment') }}</span>
        <p>{{ task.reviewComment }}</p>
      </div>

      <!-- Содержимое задачи -->
      <div class="space-y-3 pt-1">
        <!-- Сценарий 0: Задача ОТКЛОНЕНА (Строго Read-Only) -->
        <div
          v-if="task.status === 'Rejected'"
          class="p-4 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-2xl space-y-4"
        >
          <!-- Блок с причиной отклонения -->
          <div
            v-if="task.reviewComment"
            class="p-3 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-900 dark:text-rose-200 space-y-1 shadow-xs"
          >
            <span class="font-bold text-rose-700 dark:text-rose-400">{{ $t('tasks.rejectionReason') }}:</span>
            <p class="leading-relaxed">{{ task.reviewComment }}</p>
          </div>

          <!-- Превью фото без обрезки (если прикреплено) -->
          <div
            v-if="task.photoUrl"
            class="w-full max-h-[55vh] flex items-center justify-center bg-slate-100/60 dark:bg-slate-800/60 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative p-1"
          >
            <!-- Скелетон во время загрузки -->
            <div
              v-if="isImageLoading"
              class="w-full h-48 flex flex-col items-center justify-center gap-2 animate-pulse"
            >
              <van-skeleton-image class="!w-12 !h-12 text-slate-300 dark:text-slate-600" />
            </div>

            <!-- Натуральное фото без обрезки -->
            <img
              v-show="!isImageLoading"
              :src="task.photoUrl"
              :alt="$t('tasks.photoReport')"
              class="max-h-[55vh] w-auto max-w-full object-contain rounded-xl transition-opacity duration-300"
              @load="isImageLoading = false"
            >
          </div>

          <button
            type="button"
            class="w-full py-3 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 font-semibold text-xs active:scale-98 transition"
            @click="handleClose"
          >
            {{ $t('common.close') }}
          </button>
        </div>

        <!-- Сценарий 1: Задача уже ВЫПОЛНЕНА -->
        <div
          v-else-if="task.status === 'Approved' || task.status === 'In_Review'"
          class="p-4 bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60 rounded-2xl text-center space-y-3"
        >
          <p class="text-xs text-gray-600 dark:text-slate-300">
            {{ $t('tasks.taskSentBy', { name: task.userName || $t('shift.barista') }) }}
          </p>

          <!-- Превью фото без обрезки с адаптивным контейнером и скелетоном Vant -->
          <div
            v-if="task.photoUrl"
            class="w-full max-h-[55vh] flex items-center justify-center bg-slate-100/60 dark:bg-slate-800/60 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative p-1"
          >
            <!-- Скелетон во время загрузки -->
            <div
              v-if="isImageLoading"
              class="w-full h-48 flex flex-col items-center justify-center gap-2 animate-pulse"
            >
              <van-skeleton-image class="!w-12 !h-12 text-slate-300 dark:text-slate-600" />
            </div>

            <!-- Натуральное фото без обрезки -->
            <img
              v-show="!isImageLoading"
              :src="task.photoUrl"
              :alt="$t('tasks.photoReport')"
              class="max-h-[55vh] w-auto max-w-full object-contain rounded-xl transition-opacity duration-300"
              @load="isImageLoading = false"
            >
          </div>

          <button
            type="button"
            class="w-full py-3 px-4 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-semibold text-xs active:scale-98 transition"
            @click="handleClose"
          >
            {{ $t('common.close') }}
          </button>
        </div>

        <!-- Сценарий 2: ЧЕКБОКС задача НЕ выполнена -->
        <div
          v-else-if="task.type === 'checkbox'"
          class="space-y-4"
        >
          <div class="p-3.5 bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 rounded-xl text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
            {{ $t('tasks.checkboxConfirmPrompt') }}
          </div>

          <div class="space-y-2">
            <AppButton
              variant="primary"
              :icon="CheckCircle"
              :loading="isSubmitting"
              @click="submitCheckbox"
            >
              {{ $t('tasks.confirmCompletion') }}
            </AppButton>
            <AppButton
              variant="ghost"
              :disabled="isSubmitting"
              @click="handleClose"
            >
              {{ $t('common.cancel') }}
            </AppButton>
          </div>
        </div>

        <!-- Сценарий 3: ФОТО задача НЕ выполнена -->
        <div
          v-else-if="task.type === 'photo'"
          class="space-y-4"
        >
          <div class="text-xs text-gray-500 dark:text-slate-400">
            {{ $t('tasks.photoTaskPrompt') }}
          </div>

          <!-- Компонент PhotoUploader из Shared UI -->
          <PhotoUploader
            v-model="chosenPhoto"
            :uploading="isSubmitting"
            :upload-progress="uploadProgress"
          />

          <div class="space-y-2 pt-1">
            <AppButton
              variant="primary"
              :icon="UploadCloud"
              :disabled="!chosenPhoto || isSubmitting"
              :loading="isSubmitting"
              @click="submitPhoto"
            >
              {{ $t('tasks.sendPhotoReport') }}
            </AppButton>
            <AppButton
              variant="ghost"
              :disabled="isSubmitting"
              @click="handleClose"
            >
              {{ $t('common.cancel') }}
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { CheckCircle, UploadCloud, X } from 'lucide-vue-next';
import { AppButton, StatusBadge, PhotoUploader } from '@shared/ui';
import { useTelegramHaptic } from '@shared/lib';
import type { TaskResultUi, StatusBadgeType } from '@shared/types';
import { getTaskDisplayStatus } from '@entities/task';
import { useCompleteTask } from '../model/useCompleteTask';

interface Props {
  modelValue: boolean;
  task: TaskResultUi | null;
  shopId?: string;
  shiftId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  shopId: 'shop_astana_1',
  shiftId: 'shift_demo_1'
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'completed', task: TaskResultUi): void;
}>();

const taskDisplayStatus = computed<StatusBadgeType>(() => {
  if (!props.task) return 'Active';
  return getTaskDisplayStatus(props.task);
});

const haptic = useTelegramHaptic();
const { isSubmitting, uploadProgress, executeCheckboxTask, executePhotoTask } = useCompleteTask();
const chosenPhoto = ref<File | null>(null);
const isImageLoading = ref(true);

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      haptic.impact('light');
      isImageLoading.value = true;
    } else {
      chosenPhoto.value = null;
    }
  }
);

watch(
  () => props.task?.photoUrl,
  () => {
    isImageLoading.value = true;
  }
);

const onPopupUpdateShow = (val: boolean) => {
  if (!val) {
    handleClose();
  }
};

const handleClose = () => {
  if (isSubmitting.value) return;
  haptic.impact('light');
  emit('update:modelValue', false);
};

const submitCheckbox = async () => {
  if (!props.task) return;
  haptic.impact('medium');
  const ok = await executeCheckboxTask(props.task, props.shopId);
  if (ok) {
    emit('completed', props.task);
    handleClose();
  }
};

const submitPhoto = async () => {
  if (!props.task || !chosenPhoto.value) return;
  haptic.impact('medium');
  const ok = await executePhotoTask(props.task, props.shopId, props.shiftId, chosenPhoto.value);
  if (ok) {
    emit('completed', props.task);
    handleClose();
  }
};
</script>
