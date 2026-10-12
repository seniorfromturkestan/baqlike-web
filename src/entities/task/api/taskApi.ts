/**
 * src/entities/task/api/taskApi.ts
 * API операций с задачами чек-листа в Firestore: coffeeshops/{shopId}/task_results
 */
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseFirestore, getFirebaseStorage } from '@shared/api';
import type { TaskResultFirebase, TaskResultUi, TaskStatus } from '@shared/types';

/**
 * Границы текущего дня в миллисекундах (начало дня 00:00:00 и конец 23:59:59.999)
 */
export const getTodayBounds = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDayMs = today.getTime();

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endOfDayMs = tomorrow.getTime();

  return { startOfDayMs, endOfDayMs };
};

/**
 * Преобразование TaskResultFirebase в TaskResultUi
 */
export const mapTaskFirebaseToUi = (id: string, data: Partial<TaskResultFirebase>): TaskResultUi => {
  const parseMs = (val: any): number | null => {
    if (typeof val === 'number') return val;
    if (val && typeof val.toMillis === 'function') return val.toMillis();
    if (val && typeof val.toDate === 'function') return val.toDate().getTime();
    return null;
  };

  return {
    id,
    taskId: data.task_id || id,
    title: data.title || 'Задача чек-листа',
    type: data.type || 'checkbox',
    status: (data.status as TaskStatus) || 'Not_Done',
    timestamp: parseMs(data.timestamp) || undefined,
    expectedFinishTime: parseMs(data.expected_finish_time) || Date.now(),
    actualFinishTime: parseMs(data.actual_finish_time),
    userId: data.user_id || null,
    userName: data.user_name || null,
    photoUrl: data.photo_url || null,
    reviewComment: data.review_comment || null
  };
};

/**
 * Получение задач на сегодня со статусом Not_Done
 */
export const fetchTodayNotDoneTasks = async (shopId: string): Promise<TaskResultUi[]> => {
  if (!shopId) return [];

  const cleanShopId = String(shopId).trim();
  const { startOfDayMs, endOfDayMs } = getTodayBounds();

  console.log('[taskApi] Fetching tasks for shopId:', cleanShopId, 'Day start ms:', startOfDayMs);

  try {
    const firestore = getFirebaseFirestore();
    const tasksRef = collection(firestore, 'coffeeshops', cleanShopId, 'task_results');

    const snapshot = await getDocs(tasksRef);
    if (!snapshot.empty) {
      let list = snapshot.docs.map((d) => mapTaskFirebaseToUi(d.id, d.data() as TaskResultFirebase));

      list = list.filter((t) => {
        if (t.status !== 'Not_Done') return false;
        const taskTime = typeof t.timestamp === 'number' ? t.timestamp : t.expectedFinishTime;
        if (!taskTime) return true;
        return taskTime >= startOfDayMs && taskTime < endOfDayMs;
      });

      list.sort((a, b) => a.expectedFinishTime - b.expectedFinishTime);
      return list;
    }
  } catch (err) {
    console.warn('[taskApi] Ошибка загрузки задач из Firestore:', err);
  }

  return [];
};

/**
 * Real-time подписка на общие задачи кофейни из коллекции coffeeshops/{shopId}/task_results
 * Задачи принадлежат кофейне на текущий день (без фильтрации по user_id и shift_id)
 */
export const subscribeToShopTasks = (
  shopId: string,
  callback: (tasks: TaskResultUi[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  if (!shopId) {
    callback([]);
    return () => {};
  }

  const cleanShopId = String(shopId).trim();
  const { startOfDayMs, endOfDayMs } = getTodayBounds();

  console.log('[taskApi] Fetching tasks for shopId:', cleanShopId, 'Day start ms:', startOfDayMs);

  const firestore = getFirebaseFirestore();
  const tasksRef = collection(firestore, 'coffeeshops', cleanShopId, 'task_results');

  return onSnapshot(
    tasksRef,
    (snapshot) => {
      console.log(`[taskApi] Snapshot received for shopId ${cleanShopId}: ${snapshot.docs.length} total docs`);

      if (snapshot.empty) {
        callback([]);
        return;
      }

      let list = snapshot.docs.map((d) => mapTaskFirebaseToUi(d.id, d.data() as TaskResultFirebase));

      // Фильтруем задачи на текущий день
      list = list.filter((t) => {
        const taskTime = typeof t.timestamp === 'number' ? t.timestamp : t.expectedFinishTime;
        if (!taskTime) return true;
        return taskTime >= startOfDayMs && taskTime < endOfDayMs;
      });

      // Сортировка по времени завершения (ближайшие сверху)
      list.sort((a, b) => a.expectedFinishTime - b.expectedFinishTime);

      console.log(`[taskApi] Filtered tasks for today (${cleanShopId}): ${list.length}`);
      callback(list);
    },
    (err) => {
      console.error(`[taskApi] Error in subscribeToShopTasks for ${cleanShopId}:`, err);
      if (onError) onError(err);
      callback([]);
    }
  );
};

/**
 * Загрузка фото-отчета в Cloud Storage
 */
export const uploadTaskPhotoApi = async (
  shiftId: string,
  taskId: string,
  photoBlob: Blob | File
): Promise<string> => {
  const storage = getFirebaseStorage();
  const timestamp = Date.now();
  const filePath = `shifts/${shiftId || 'current_shift'}/tasks/${taskId}_${timestamp}.webp`;
  const fileRef = storageRef(storage, filePath);

  await uploadBytes(fileRef, photoBlob);
  return await getDownloadURL(fileRef);
};

/**
 * Обновление чекбокс-задачи (статус Approved)
 * Фиксирует исполнителя currentUserId и время завершения
 */
export const completeCheckboxTaskApi = async (
  shopId: string,
  taskId: string,
  userId: string,
  userName?: string
): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const cleanShopId = String(shopId).trim();
  const docRef = doc(firestore, 'coffeeshops', cleanShopId, 'task_results', taskId);

  const payload: Record<string, any> = {
    status: 'Approved',
    user_id: userId,
    actual_finish_time: Date.now()
  };

  if (userName) {
    payload.user_name = userName;
  }

  await updateDoc(docRef, payload);
};

/**
 * Обновление фото-задачи (статус In_Review с photo_url)
 * Фиксирует исполнителя currentUserId, ссылку на фото и время
 */
export const completePhotoTaskApi = async (
  shopId: string,
  taskId: string,
  userId: string,
  photoUrl: string,
  userName?: string
): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const cleanShopId = String(shopId).trim();
  const docRef = doc(firestore, 'coffeeshops', cleanShopId, 'task_results', taskId);

  const payload: Record<string, any> = {
    status: 'In_Review',
    user_id: userId,
    photo_url: photoUrl,
    actual_finish_time: Date.now()
  };

  if (userName) {
    payload.user_name = userName;
  }

  await updateDoc(docRef, payload);
};
