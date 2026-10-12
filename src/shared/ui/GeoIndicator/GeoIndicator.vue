<template>
  <div
    :class="[
      'rounded-2xl p-4 border transition-all duration-200 select-none',
      containerClasses
    ]"
  >
    <div class="flex items-start justify-between gap-3">
      <!-- Иконка и статус -->
      <div class="flex items-start gap-3">
        <div
          :class="[
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-xs',
            iconContainerClasses
          ]"
        >
          <Radio v-if="loading" class="w-5 h-5 text-accent animate-pulse" />
          <component
            :is="statusIcon"
            v-else
            class="w-5 h-5"
          />
        </div>

        <div>
          <h4 :class="['text-sm font-semibold tracking-tight', titleColorClass]">
            {{ statusTitle }}
          </h4>
          <p :class="['text-xs mt-0.5 leading-relaxed', descriptionColorClass]">
            {{ statusDescription }}
          </p>

          <!-- Дополнительная информация о точности GPS -->
          <div
            v-if="accuracyMeters !== null && accuracyMeters !== undefined && !loading"
            class="flex items-center gap-1.5 mt-2 text-[11px] text-gray-500 dark:text-slate-400"
          >
            <span
              class="w-2 h-2 rounded-full"
              :class="accuracyMeters <= 50 ? 'bg-emerald-500' : 'bg-amber-500'"
            />
            <span>{{ $t('geo.accuracyGps', { accuracy: Math.round(accuracyMeters) }) }}</span>
            <span
              v-if="accuracyMeters > 50"
              class="text-amber-600 dark:text-amber-400 font-medium ml-1"
            >
              {{ $t('geo.weakSignal') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Бейдж расстояния в метрах -->
      <div
        v-if="distanceMeters !== null && !loading"
        class="text-right shrink-0"
      >
        <span
          :class="[
            'inline-block px-2.5 py-1 rounded-lg text-xs font-bold border',
            isAllowed
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
          ]"
        >
          {{ formatDistance(distanceMeters) }}
        </span>
        <div class="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
          {{ $t('geo.radiusLimit', { radius: allowedRadiusMeters }) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { MapPin, AlertTriangle, Radio } from 'lucide-vue-next';
import { ALLOWED_RADIUS_METERS } from '../../config/constants';

interface Props {
  distanceMeters: number | null;
  isAllowed: boolean;
  loading?: boolean;
  accuracyMeters?: number | null;
  allowedRadiusMeters?: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  accuracyMeters: null,
  allowedRadiusMeters: ALLOWED_RADIUS_METERS
});

const { t } = useI18n();

const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} ${t('geo.meters')}`;
  }
  return `${(meters / 1000).toFixed(1)} км`;
};

const statusIcon = computed(() => {
  if (props.loading) return Radio;
  return props.isAllowed ? MapPin : AlertTriangle;
});

const statusTitle = computed(() => {
  if (props.loading) return t('geo.detectingCoordinates');
  if (props.isAllowed) return t('geo.insideShop');
  return t('geo.outOfRadiusTitle');
});

const statusDescription = computed(() => {
  if (props.loading) return t('geo.connectingSatellites');
  if (props.isAllowed) {
    return t('geo.insideShopDesc', { radius: props.allowedRadiusMeters });
  }
  return t('geo.outOfShopDesc', { radius: props.allowedRadiusMeters });
});

const containerClasses = computed(() => {
  if (props.loading) {
    return 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-800/60';
  }
  if (props.isAllowed) {
    return 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60';
  }
  return 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60';
});

const iconContainerClasses = computed(() => {
  if (props.loading) {
    return 'bg-blue-100 dark:bg-blue-900/60 text-accent dark:text-blue-300 border-blue-200 dark:border-blue-700';
  }
  if (props.isAllowed) {
    return 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700';
  }
  return 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700';
});

const titleColorClass = computed(() => {
  if (props.loading) return 'text-blue-900 dark:text-blue-100';
  if (props.isAllowed) return 'text-emerald-900 dark:text-emerald-100';
  return 'text-rose-900 dark:text-rose-100';
});

const descriptionColorClass = computed(() => {
  if (props.loading) return 'text-blue-700 dark:text-blue-300';
  if (props.isAllowed) return 'text-emerald-700 dark:text-emerald-300';
  return 'text-rose-700 dark:text-rose-300';
});
</script>
