<template>
  <div class="w-full select-none">
    <!-- 1. Блок предварительного просмотра (если фото уже выбрано) -->
    <div
      v-if="previewUrl"
      class="w-full max-h-[55vh] flex items-center justify-center bg-slate-100/60 dark:bg-slate-800/60 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative p-1 shadow-sm"
    >
      <!-- Скелетон во время загрузки превью -->
      <div
        v-if="isPreviewLoading"
        class="w-full h-48 flex flex-col items-center justify-center gap-2 animate-pulse"
      >
        <van-skeleton-image class="!w-12 !h-12 text-slate-300 dark:text-slate-600" />
      </div>

      <img
        v-show="!isPreviewLoading"
        :src="previewUrl"
        alt="Фотоотчет"
        class="max-h-[55vh] w-auto max-w-full object-contain rounded-xl transition-opacity duration-300"
        @load="isPreviewLoading = false"
      >

      <!-- Оверлей загрузки/обработки -->
      <div
        v-if="isProcessing || uploading"
        class="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4"
      >
        <span class="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin mb-2" />
        <span class="text-xs font-medium">
          {{ isProcessing ? $t('photo.compressing') : $t('photo.uploading', { percent: uploadProgress }) }}
        </span>
      </div>

      <!-- Кнопки управления (Переснять / Удалить) -->
      <div
        v-else
        class="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2"
      >
        <button
          type="button"
          :disabled="disabled"
          class="flex-1 py-2 px-3 rounded-xl bg-black/65 backdrop-blur-md text-white text-xs font-medium flex items-center justify-center gap-1.5 active:scale-95 transition"
          @click="handleStartCapture"
        >
          <Camera class="w-3.5 h-3.5" />
          <span>{{ $t('photo.retake') }}</span>
        </button>

        <button
          type="button"
          :disabled="disabled"
          class="p-2 rounded-xl bg-black/65 backdrop-blur-md text-rose-300 text-xs font-medium flex items-center justify-center active:scale-95 transition"
          @click="handleRemove"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- 2. Область вызова камеры (когда фото еще не выбрано) -->
    <div
      v-else
      class="relative w-full aspect-4/3 rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-brand dark:hover:border-brand-400 bg-purple-50/20 dark:bg-slate-800/40 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition active:scale-[0.99]"
      :class="[
        disabled ? 'opacity-50 pointer-events-none' : '',
        isProcessing ? 'border-brand bg-purple-50/40' : ''
      ]"
      @click="handleStartCapture"
    >
      <div
        class="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-xs border border-purple-100 dark:border-slate-700 text-brand dark:text-brand-300 flex items-center justify-center mb-3"
      >
        <span v-if="isProcessing" class="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        <Camera v-else class="w-7 h-7" />
      </div>

      <span class="text-sm font-semibold text-gray-800 dark:text-slate-200">
        {{ isProcessing ? $t('photo.processing') : $t('photo.takePhoto') }}
      </span>
      <span class="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-[220px]">
        {{ $t('photo.cameraStrict') }}
      </span>

      <!-- Скрытый нативный input со строгим захватом камеры capture="environment" без галереи -->
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        capture="environment"
        :multiple="false"
        class="hidden"
        :disabled="disabled || isProcessing"
        @change="handleFileChange"
      >
    </div>

    <!-- 3. Полноэкранный видоискатель камеры через WebRTC (getUserMedia) -->
    <div
      v-if="isLiveCameraOpen"
      class="fixed inset-0 z-[3000] bg-black flex flex-col justify-between select-none"
    >
      <!-- Верхняя панель видоискателя -->
      <div class="px-5 pt-safe pt-4 pb-3 flex items-center justify-between text-white bg-gradient-to-b from-black/80 to-transparent z-10">
        <div class="flex items-center gap-2">
          <Camera class="w-5 h-5 text-brand-300" />
          <span class="text-sm font-semibold">{{ $t('photo.cameraTitle') }}</span>
        </div>
        <button
          type="button"
          class="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition active:scale-90"
          @click="stopLiveCamera"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Видеопоток камеры -->
      <div class="relative flex-1 w-full overflow-hidden flex items-center justify-center bg-black">
        <video
          ref="videoRef"
          autoplay
          playsinline
          muted
          class="w-full h-full object-cover"
        />

        <!-- Рамка видоискателя для фокусировки бариста -->
        <div class="absolute inset-8 rounded-3xl border-2 border-white/40 pointer-events-none flex flex-col justify-between p-4">
          <div class="flex justify-between">
            <div class="w-6 h-6 border-t-2 border-l-2 border-brand-400" />
            <div class="w-6 h-6 border-t-2 border-r-2 border-brand-400" />
          </div>
          <div class="text-center text-xs text-white/70 bg-black/40 backdrop-blur-xs py-1 px-3 rounded-full mx-auto">
            {{ $t('photo.cameraAim') }}
          </div>
          <div class="flex justify-between">
            <div class="w-6 h-6 border-b-2 border-l-2 border-brand-400" />
            <div class="w-6 h-6 border-b-2 border-r-2 border-brand-400" />
          </div>
        </div>
      </div>

      <!-- Нижняя панель с кнопкой затвора -->
      <div class="px-6 pb-safe pb-8 pt-4 flex items-center justify-around bg-gradient-to-t from-black/90 to-transparent z-10">
        <!-- Кнопка перехода на нативную камеру ОС (fallback) -->
        <button
          type="button"
          class="text-xs text-white/80 hover:text-white px-3 py-2 rounded-xl bg-white/10 active:scale-95 transition"
          @click="fallbackToNativeInput"
        >
          {{ $t('photo.nativeCamera') }}
        </button>

        <!-- Круглая кнопка спуска затвора -->
        <button
          type="button"
          class="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 active:scale-90 transition shadow-lg"
          @click="capturePhotoFromStream"
        >
          <div class="w-full h-full rounded-full bg-white hover:bg-gray-100 transition" />
        </button>

        <div class="w-20 text-center text-[10px] text-white/50">
          {{ $t('photo.backCamera') }}
        </div>
      </div>

      <!-- Скрытый Canvas для захвата кадра -->
      <canvas ref="canvasRef" class="hidden" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { Camera, Trash2, X } from 'lucide-vue-next';
import { useTelegramHaptic } from '../../lib/telegram/useTelegramHaptic';
import { compressImage } from '../../lib/image/compressor';

interface Props {
  modelValue?: File | Blob | null;
  initialUrl?: string | null;
  disabled?: boolean;
  uploading?: boolean;
  uploadProgress?: number;
  autoCompress?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  initialUrl: null,
  disabled: false,
  uploading: false,
  uploadProgress: 0,
  autoCompress: true
});

const emit = defineEmits<{
  (e: 'update:modelValue', file: File | null): void;
  (e: 'change', file: File | null): void;
  (e: 'remove'): void;
}>();

const { t } = useI18n();
const haptic = useTelegramHaptic();

const fileInputRef = ref<HTMLInputElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const previewUrl = ref<string | null>(props.initialUrl || null);
const isPreviewLoading = ref(false);
const isProcessing = ref(false);
const isLiveCameraOpen = ref(false);
const mediaStream = ref<MediaStream | null>(null);

/**
 * Запуск съемки: попытка открыть WebRTC поток (getUserMedia),
 * либо fallback на нативный input capture="environment"
 */
const handleStartCapture = async () => {
  if (props.disabled || isProcessing.value) return;
  haptic.impact('light');

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    triggerFileInput();
    return;
  }

  try {
    let stream: MediaStream;
    try {
      // Приоритет: задняя камера смартфона
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
    } catch {
      // Fallback на любую доступную видеокамеру
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
    }

    mediaStream.value = stream;
    isLiveCameraOpen.value = true;

    await nextTick();
    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      await videoRef.value.play().catch(() => {});
    }
  } catch (err) {
    console.warn('getUserMedia недоступен, переключаем на нативный input capture="environment":', err);
    stopLiveCamera();
    triggerFileInput();
  }
};

/**
 * Спуск затвора видоискателя: захват кадра на canvas
 */
const capturePhotoFromStream = async () => {
  if (!videoRef.value || !canvasRef.value) return;
  haptic.impact('light');

  const video = videoRef.value;
  const canvas = canvasRef.value;
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(video, 0, 0, width, height);

  // Останавливаем стрим камеры
  stopLiveCamera();
  isProcessing.value = true;

  try {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/webp', 0.85);
    });

    if (!blob) throw new Error(t('photo.convertError'));

    const rawFile = new File([blob], `task_photo_${Date.now()}.webp`, { type: 'image/webp' });
    const finalFile = props.autoCompress ? await compressImage(rawFile) : rawFile;

    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value);
    }

    previewUrl.value = URL.createObjectURL(finalFile);
    isPreviewLoading.value = true;
    emit('update:modelValue', finalFile);
    emit('change', finalFile);
  } catch (err) {
    console.error('Ошибка при обработке кадра камеры:', err);
    triggerFileInput();
  } finally {
    isProcessing.value = false;
  }
};

const stopLiveCamera = () => {
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach((track) => track.stop());
    mediaStream.value = null;
  }
  isLiveCameraOpen.value = false;
  haptic.impact('light');
};

const fallbackToNativeInput = () => {
  stopLiveCamera();
  triggerFileInput();
};

const triggerFileInput = () => {
  if (props.disabled || isProcessing.value) return;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
    fileInputRef.value.click();
  }
};

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  try {
    isProcessing.value = true;
    const finalFile = props.autoCompress ? await compressImage(file) : file;

    if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl.value);
    }

    previewUrl.value = URL.createObjectURL(finalFile);
    isPreviewLoading.value = true;
    emit('update:modelValue', finalFile);
    emit('change', finalFile);
  } catch (error) {
    console.error('Ошибка обработки фото:', error);
  } finally {
    isProcessing.value = false;
  }
};

const handleRemove = () => {
  haptic.impact('light');
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = null;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
  emit('update:modelValue', null);
  emit('change', null);
  emit('remove');
};

onBeforeUnmount(() => {
  stopLiveCamera();
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value);
  }
});
</script>
