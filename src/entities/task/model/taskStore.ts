/**
 * src/entities/task/model/taskStore.ts
 * Pinia-стор управления задачами чек-листа смены
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { TaskResultUi, TaskStatus } from '@shared/types';
import { fetchTodayNotDoneTasks, subscribeToShopTasks } from '../api/taskApi';
import type { Unsubscribe } from 'firebase/firestore';

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<TaskResultUi[]>([]);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  let tasksUnsubscribe: Unsubscribe | null = null;

  // ==========================================
  // Геттеры
  // ==========================================

  const totalCount = computed<number>(() => {
    return tasks.value.length;
  });

  const completedCount = computed<number>(() => {
    return tasks.value.filter((t) => t.status !== 'Not_Done').length;
  });

  const progressPercent = computed<number>(() => {
    if (totalCount.value === 0) return 100;
    return Math.round((completedCount.value / totalCount.value) * 100);
  });

  const pendingApprovalCount = computed<number>(() => {
    return tasks.value.filter((t) => t.status === 'In_Review').length;
  });

  const approvedCount = computed<number>(() => {
    return tasks.value.filter((t) => t.status === 'Approved').length;
  });

  const notDoneTasks = computed<TaskResultUi[]>(() => {
    return tasks.value.filter((t) => t.status === 'Not_Done');
  });

  const doneTasks = computed<TaskResultUi[]>(() => {
    return tasks.value.filter((t) => t.status !== 'Not_Done');
  });

  // ==========================================
  // Действия (Actions)
  // ==========================================

  const loadTasks = async (shopId: string): Promise<void> => {
    if (!shopId) return;

    loading.value = true;
    error.value = null;
    try {
      const result = await fetchTodayNotDoneTasks(shopId);
      tasks.value = result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки задач';
      error.value = message;
    } finally {
      loading.value = false;
    }
  };

  const subscribeTasks = (shopId: string): void => {
    if (!shopId) return;

    if (tasksUnsubscribe) {
      tasksUnsubscribe();
      tasksUnsubscribe = null;
    }

    loading.value = true;
    tasksUnsubscribe = subscribeToShopTasks(
      shopId,
      (updatedList) => {
        tasks.value = updatedList;
        loading.value = false;
      },
      (err: Error) => {
        console.error('Ошибка подписки на задачи:', err);
        loading.value = false;
      }
    );
  };

  const unsubscribeTasks = () => {
    if (tasksUnsubscribe) {
      tasksUnsubscribe();
      tasksUnsubscribe = null;
    }
  };

  /**
   * Локальное оптимистичное обновление статуса задачи
   */
  const updateLocalTaskStatus = (
    taskId: string,
    status: TaskStatus,
    patch: Partial<TaskResultUi> = {}
  ) => {
    const target = tasks.value.find((t) => t.id === taskId);
    if (target) {
      target.status = status;
      target.actualFinishTime = Date.now();
      Object.assign(target, patch);
    }
  };

  const setTasks = (newTasks: TaskResultUi[]) => {
    tasks.value = newTasks;
  };

  return {
    tasks,
    loading,
    error,
    totalCount,
    completedCount,
    progressPercent,
    pendingApprovalCount,
    approvedCount,
    notDoneTasks,
    doneTasks,
    loadTasks,
    subscribeTasks,
    unsubscribeTasks,
    updateLocalTaskStatus,
    setTasks
  };
});
