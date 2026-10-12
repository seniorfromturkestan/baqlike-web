<template>
  <div class="w-full space-y-4 select-none">
    <!-- 1. Состояние: ДО СМЕНЫ (Смена закрыта) -->
    <div v-if="!shiftStore.isOpen" class="space-y-4">
      <!-- Баннер готовности -->
      <div class="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
        <div class="relative z-10 space-y-1">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-400" />
            <span class="text-xs font-semibold text-purple-200 uppercase tracking-wider">
              {{ $t('shift.shiftInactive') }}
            </span>
          </div>
          <h2 class="text-xl font-bold tracking-tight">
            {{ shopStore.shopName }}
          </h2>
          <p class="text-xs text-purple-100/90 leading-relaxed max-w-[280px]">
            {{ $t('shift.geoPrompt') }}
          </p>
        </div>
        <div class="absolute -right-3 -bottom-4 opacity-15 pointer-events-none select-none">
          <Coffee class="w-24 h-24 text-white" />
        </div>
      </div>

      <!-- Виджет контроля дистанции (GeoIndicator с нативным GPS) -->
      <div class="space-y-2">
        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-1.5">
            <h3 class="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              {{ $t('shift.gpsValidation') }}
            </h3>
            <button
              type="button"
              class="p-1 rounded-full text-gray-400 hover:text-brand dark:hover:text-brand-300 transition"
              :disabled="isLocating"
              :title="$t('geo.refresh')"
              @click="updateLocation"
            >
              <RotateCw class="w-3.5 h-3.5" :class="isLocating ? 'animate-spin text-brand' : ''" />
            </button>
          </div>
          <span class="text-[11px] text-gray-400 dark:text-slate-500">{{ $t('shift.gpsThreshold') }}</span>
        </div>

        <GeoIndicator
          :distance-meters="realDistance"
          :is-allowed="isAllowed"
          :loading="isLocating"
          :accuracy-meters="realAccuracy"
        />
      </div>

      <!-- Кнопка Check-In -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-xs transition-colors">
        <CheckInOutButton @check-in-success="$emit('shiftStarted')" />
      </div>
    </div>

    <!-- 2. Состояние: НА СМЕНЕ (Смена активна) -->
    <div v-else class="space-y-4">
      <!-- Активная плашка смены -->
      <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-emerald-100 dark:border-emerald-900/40 shadow-sm space-y-4 relative overflow-hidden transition-colors">
        <div class="flex items-start justify-between">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span class="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                {{ $t('shift.shiftActive') }}
              </span>
            </div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-slate-100">
              {{ shopStore.shopName }}
            </h2>
            <div class="flex items-center gap-2 mt-1">
              <div class="w-5 h-5 rounded-full overflow-hidden bg-gradient-to-tr from-brand to-accent text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                <img
                  v-if="sessionStore.user?.avatarUrl"
                  :src="sessionStore.user.avatarUrl"
                  alt="Avatar"
                  class="w-full h-full object-cover"
                >
                <span v-else>{{ sessionStore.userInitials }}</span>
              </div>
              <p class="text-xs text-gray-400 dark:text-slate-500">
                {{ $t('shift.barista') }}: <span class="font-medium text-gray-700 dark:text-slate-300">{{ sessionStore.user?.name }}</span>
              </p>
            </div>
          </div>

          <!-- Живой таймер смены -->
          <ShiftDurationTimer :check-in="shiftStore.activeShift?.checkIn" />
        </div>

        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-slate-800 text-xs">
          <div class="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60">
            <div class="text-gray-400 dark:text-slate-500 text-[10px]">{{ $t('shift.checkInTime') }}</div>
            <div class="font-semibold text-gray-800 dark:text-slate-200 mt-0.5">
              {{ formattedCheckInTime }}
            </div>
          </div>
          <div class="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60">
            <div class="text-gray-400 dark:text-slate-500 text-[10px]">{{ $t('shift.networkPoint') }}</div>
            <div class="font-semibold text-gray-800 dark:text-slate-200 truncate mt-0.5">
              {{ shopStore.shopAddress }}
            </div>
          </div>
        </div>

        <!-- Кнопка закрытия смены -->
        <div class="pt-1">
          <CheckInOutButton @check-out-success="$emit('shiftEnded')" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Coffee, RotateCw } from 'lucide-vue-next';
import { GeoIndicator } from '@shared/ui';
import { formatTime } from '@shared/lib/date';
import { getBrowserLocation, calculateDistance, validateCheckInRadius } from '@shared/lib/geo';
import { useSessionStore } from '@entities/session';
import { useShopStore } from '@entities/shop';
import { useShiftStore, ShiftDurationTimer } from '@entities/shift';
import { CheckInOutButton } from '@features/check-in-out';

defineEmits<{
  (e: 'shiftStarted'): void;
  (e: 'shiftEnded'): void;
}>();

const sessionStore = useSessionStore();
const shopStore = useShopStore();
const shiftStore = useShiftStore();

const realDistance = ref<number | null>(null);
const isAllowed = ref<boolean>(false);
const realAccuracy = ref<number | null>(null);
const isLocating = ref<boolean>(false);

const updateLocation = async () => {
  if (isLocating.value) return;
  isLocating.value = true;
  try {
    const { coordinates, accuracy } = await getBrowserLocation();
    const shopCoords = shopStore.shopCoordinates || { latitude: 51.1282, longitude: 71.4305 };
    const distance = calculateDistance(coordinates, shopCoords);
    const validation = validateCheckInRadius(coordinates, shopCoords);

    realDistance.value = distance;
    isAllowed.value = validation.canCheckIn;
    realAccuracy.value = accuracy;
  } catch (err) {
    // В случае отказа в доступе к GPS
    realDistance.value = null;
    isAllowed.value = false;
    realAccuracy.value = null;
  } finally {
    isLocating.value = false;
  }
};

onMounted(() => {
  if (!shiftStore.isOpen) {
    updateLocation();
  }
});

const formattedCheckInTime = computed(() => {
  if (!shiftStore.activeShift?.checkIn) return '--:--';
  return formatTime(shiftStore.activeShift.checkIn);
});
</script>
