/**
 * src/entities/task/model/taskStore.ts
 * Pinia-стор управления задачами чек-листа смены
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { TaskResultUi, TaskStatus } from '@shared/types';
import { fetchTodayNotDoneTasks, fetchTodayRejectedTasksApi, subscribeToShopTasks } from '../api/taskApi';
import type { Unsubscribe } from 'firebase/firestore';

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<TaskResultUi[]>([]);
  const rejectedTasks = ref<TaskResultUi[]>([]);
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
    return tasks.value.filter((t) => t.status === 'Approved').length;
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

  const rejectedCount = computed<number>(() => {
    return rejectedTasks.value.length;
  });

  const activeTasks = computed<TaskResultUi[]>(() => {
    return tasks.value.filter((t) => t.status !== 'Approved' && t.status !== 'Rejected');
  });

  const notDoneTasks = computed<TaskResultUi[]>(() => {
    return tasks.value.filter((t) => t.status !== 'Approved' && t.status !== 'Rejected' && t.status !== 'In_Review');
  });

  const doneTasks = computed<TaskResultUi[]>(() => {
    return tasks.value.filter((t) => t.status === 'Approved' || t.status === 'In_Review');
  });

  // ==========================================
  // Действия (Actions)
  // ==========================================

  const loadTasks = async (shopId: string): Promise<void> => {
    if (!shopId) return;

    loading.value = true;
    error.value = null;
    try {
      const [notDoneResult] = await Promise.all([
        fetchTodayNotDoneTasks(shopId),
        loadRejectedTasks(shopId)
      ]);
      tasks.value = notDoneResult;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки задач';
      error.value = message;
    } finally {
      loading.value = false;
    }
  };

  const loadRejectedTasks = async (shopId: string): Promise<void> => {
    if (!shopId) return;
    try {
      const result = await fetchTodayRejectedTasksApi(shopId);
      rejectedTasks.value = result;
    } catch (err: unknown) {
      console.warn('Ошибка загрузки отклонённых задач:', err);
    }
  };

  const subscribeTasks = (shopId: string): void => {
    if (!shopId) return;

    if (tasksUnsubscribe) {
      tasksUnsubscribe();
      tasksUnsubscribe = null;
    }

    loading.value = true;
    // Сразу же подтягиваем отклонённые задачи за сегодня
    loadRejectedTasks(shopId);

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

  const removeLocalTask = (taskId: string) => {
    tasks.value = tasks.value.filter((t) => t.id !== taskId);
  };

  const setTasks = (newTasks: TaskResultUi[]) => {
    tasks.value = newTasks;
  };

  return {
    tasks,
    rejectedTasks,
    loading,
    error,
    totalCount,
    completedCount,
    progressPercent,
    pendingApprovalCount,
    approvedCount,
    rejectedCount,
    activeTasks,
    notDoneTasks,
    doneTasks,
    loadTasks,
    loadRejectedTasks,
    subscribeTasks,
    unsubscribeTasks,
    updateLocalTaskStatus,
    removeLocalTask,
    setTasks
  };
});
