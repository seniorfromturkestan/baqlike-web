<template>
  <SafeLayout>
    <!-- Шапка страницы -->
    <template #header>
      <div class="px-5 py-3.5 flex items-center justify-between">
        <h1 class="text-base font-bold text-gray-900 dark:text-slate-100 leading-tight">
          {{ $t('profile.title') }}
        </h1>
        <span class="text-xs text-gray-400 dark:text-slate-500">
          {{ $t('profile.subtitle') }}
        </span>
      </div>
    </template>

    <!-- Виджет профиля -->
    <div class="pb-8">
      <UserProfileCard />
    </div>
  </SafeLayout>
</template>

<script setup lang="ts">
import { SafeLayout } from '@shared/ui';
import { UserProfileCard } from '@widgets/user-profile-card';
</script>
