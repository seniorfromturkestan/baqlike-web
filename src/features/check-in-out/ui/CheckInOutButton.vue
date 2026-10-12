<template>
  <div class="w-full space-y-3 select-none">
    <!-- Когда смена ЗАКРЫТА: кнопка «Начать смену» -->
    <div v-if="!shiftStore.isOpen" class="space-y-2">
      <AppButton
        variant="primary"
        size="large"
        :icon="Play"
        :loading="isCheckingLocation || isOperatingShift"
        @click="onCheckInClick"
      >
        <span>{{ isCheckingLocation ? $t('shift.checkingGps') : $t('shift.startShift') }}</span>
      </AppButton>

      <div class="flex items-center justify-center px-1 text-[11px] text-gray-500 dark:text-slate-400">
        <span>{{ $t('shift.radiusCheck') }}</span>
      </div>
    </div>

    <!-- Когда смена ОТКРЫТА: кнопка «Завершить смену» -->
    <div v-else class="w-full">
      <AppButton
        variant="danger"
        size="large"
        :icon="LogOut"
        :loading="isOperatingShift"
        class="w-full"
        @click="onCheckOutClick"
      >
        {{ $t('shift.endShift') }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Play, LogOut } from 'lucide-vue-next';
import { AppButton } from '@shared/ui';
import { useTelegramHaptic } from '@shared/lib';
import { useShiftStore } from '@entities/shift';
import { useCheckInOut } from '../model/useCheckInOut';

const shiftStore = useShiftStore();
const haptic = useTelegramHaptic();
const { isCheckingLocation, isOperatingShift, handleCheckIn, handleCheckOut } = useCheckInOut();

const emit = defineEmits<{
  (e: 'checkInSuccess'): void;
  (e: 'checkOutSuccess'): void;
}>();

const onCheckInClick = async () => {
  haptic.impact('medium');
  const success = await handleCheckIn();
  if (success) emit('checkInSuccess');
};

const onCheckOutClick = async () => {
  haptic.impact('medium');
  const success = await handleCheckOut();
  if (success) emit('checkOutSuccess');
};
</script>
