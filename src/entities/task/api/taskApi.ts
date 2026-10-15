/**
 * src/entities/task/api/taskApi.ts
 * API операций с задачами чек-листа в Firestore: coffeeshops/{shopId}/task_results
 */
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  type Unsubscribe
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseFirestore, getFirebaseStorage } from '@shared/api';
import type { TaskResultFirebase, TaskResultUi, TaskStatus, TaskDisplayStatus } from '@shared/types';

/**
 * Определение отображаемого статуса задачи:
 * - Если задача еще не завершена сотрудником:
 *   - Date.now() <= expected_finish_time -> 'Active' (нейтральный/активный стиль)
 *   - Date.now() > expected_finish_time -> 'Overdue' (янтарный/красный индикатор)
 */
export const getTaskDisplayStatus = (
  task: {
    status: string;
    expectedFinishTime?: number;
    expected_finish_time?: number;
    is_overdue?: boolean;
    isOverdue?: boolean;
  },
  now = Date.now()
): TaskDisplayStatus => {
  if (task.status === 'In_Review') return 'In_Review';
  if (task.status === 'Approved') {
    if (task.is_overdue || task.isOverdue) {
      return 'ApprovedOverdue';
    }
    return 'Approved';
  }
  if (task.status === 'Rejected') return 'Rejected';

  const deadline = task.expectedFinishTime ?? (task as any).expected_finish_time ?? 0;
  if (deadline > 0 && now > deadline) {
    return 'Overdue';
  }
  return 'Active';
};

/**
 * Хелпер текущей даты по часовому поясу Asia/Almaty (формат "YYYY-MM-DD")
 */
export const getTodayDateString = (): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Almaty',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date()); // Возвращает "YYYY-MM-DD"
};

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
 * Преобразование TaskResultFirebase в TaskResultUi (строго из snake_case)
 */
export const mapTaskFirebaseToUi = (id: string, data: Partial<TaskResultFirebase>): TaskResultUi => {
  const parseMs = (val: any): number | null => {
    if (typeof val === 'number') return val;
    if (val && typeof val.toMillis === 'function') return val.toMillis();
    if (val && typeof val.toDate === 'function') return val.toDate().getTime();
    if (typeof val === 'string') {
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) return parsed;
    }
    return null;
  };

  const isOverdue = Boolean(data.is_overdue);
  const delayMinutes = typeof data.delay_minutes === 'number' ? data.delay_minutes : 0;

  return {
    id,
    taskId: data.task_id || id,
    title: data.title || 'Задача чек-листа',
    type: data.type || 'checkbox',
    status: (data.status as TaskStatus) || 'Not_Done',
    date: data.date || getTodayDateString(),
    isOverdue,
    is_overdue: isOverdue,
    delayMinutes,
    delay_minutes: delayMinutes,
    timestamp: parseMs(data.timestamp) || undefined,
    expectedFinishTime: parseMs(data.expected_finish_time) || Date.now(),
    actualFinishTime: parseMs(data.actual_finish_time),
    userId: data.user_id || null,
    userName: data.user_name || null,
    photoUrl: data.photo_url || null,
    reviewComment: data.review_comment || null,
    reviewedAt: parseMs((data as any).reviewed_at) || parseMs(data.actual_finish_time) || null
  };
};

/**
 * Получение активных задач на сегодня (точечная выборка по date == todayStr)
 */
export const fetchTodayNotDoneTasks = async (shopId: string): Promise<TaskResultUi[]> => {
  if (!shopId) return [];

  const cleanShopId = String(shopId).trim();
  const todayStr = getTodayDateString();
  const { startOfDayMs, endOfDayMs } = getTodayBounds();

  try {
    const firestore = getFirebaseFirestore();
    const tasksRef = collection(firestore, 'coffeeshops', cleanShopId, 'task_results');

    // Точечная выборка: только задачи на сегодня
    const q = query(tasksRef, where('date', '==', todayStr));
    let snapshot = await getDocs(q);

    // Fallback для старых задач (если поле date ещё отсутствует в документе)
    if (snapshot.empty) {
      const allSnap = await getDocs(tasksRef);
      if (!allSnap.empty) {
        const legacyList = allSnap.docs
          .map((d) => mapTaskFirebaseToUi(d.id, d.data() as TaskResultFirebase))
          .filter((t) => {
            if (t.status === 'Approved' || t.status === 'Rejected') return false;
            const taskTime = typeof t.timestamp === 'number' ? t.timestamp : t.expectedFinishTime;
            return taskTime ? taskTime >= startOfDayMs && taskTime < endOfDayMs : false;
          });
        legacyList.sort((a, b) => a.expectedFinishTime - b.expectedFinishTime);
        return legacyList;
      }
      return [];
    }

    let list = snapshot.docs.map((d) => mapTaskFirebaseToUi(d.id, d.data() as TaskResultFirebase));

    // Исключаем только завершенные задачи
    list = list.filter((t) => t.status !== 'Approved' && t.status !== 'Rejected');
    list.sort((a, b) => a.expectedFinishTime - b.expectedFinishTime);
    return list;
  } catch (err) {
    console.warn('[taskApi] Ошибка загрузки задач из Firestore:', err);
  }

  return [];
};

/**
 * Получение отклонённых задач за текущий день из архива: coffeeshops/{shopId}/history
 * Точечная выборка: date == todayStr и status == 'Rejected'
 */
export const fetchTodayRejectedTasksApi = async (shopId: string): Promise<TaskResultUi[]> => {
  if (!shopId) return [];

  const cleanShopId = String(shopId).trim();
  const todayStr = getTodayDateString();
  const { startOfDayMs, endOfDayMs } = getTodayBounds();

  try {
    const firestore = getFirebaseFirestore();
    const historyRef = collection(firestore, 'coffeeshops', cleanShopId, 'history');

    const q = query(
      historyRef,
      where('date', '==', todayStr),
      where('status', '==', 'Rejected')
    );
    let snapshot = await getDocs(q);

    // Fallback для старых документов без поля date
    if (snapshot.empty) {
      const legacyQ = query(historyRef, where('status', '==', 'Rejected'));
      const legacySnap = await getDocs(legacyQ);
      return legacySnap.docs
        .map((d) => mapTaskFirebaseToUi(d.id, d.data() as TaskResultFirebase))
        .filter((t) => {
          const taskTime = t.reviewedAt || t.actualFinishTime || (typeof t.timestamp === 'number' ? t.timestamp : null);
          return taskTime ? taskTime >= startOfDayMs && taskTime < endOfDayMs : false;
        })
        .sort((a, b) => {
          const timeA = a.reviewedAt || a.actualFinishTime || (typeof a.timestamp === 'number' ? a.timestamp : 0) || 0;
          const timeB = b.reviewedAt || b.actualFinishTime || (typeof b.timestamp === 'number' ? b.timestamp : 0) || 0;
          return timeB - timeA;
        });
    }

    let list = snapshot.docs.map((d) => mapTaskFirebaseToUi(d.id, d.data() as TaskResultFirebase));
    list.sort((a, b) => {
      const timeA = a.reviewedAt || a.actualFinishTime || (typeof a.timestamp === 'number' ? a.timestamp : 0) || 0;
      const timeB = b.reviewedAt || b.actualFinishTime || (typeof b.timestamp === 'number' ? b.timestamp : 0) || 0;
      return timeB - timeA;
    });
    return list;
  } catch (err) {
    console.warn('[taskApi] Ошибка загрузки отклонённых задач из Firestore:', err);
  }

  return [];
};

/**
 * Real-time подписка на общие задачи заведения только на сегодняшний день (date == todayStr)
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
  const todayStr = getTodayDateString();
  const { startOfDayMs, endOfDayMs } = getTodayBounds();

  const firestore = getFirebaseFirestore();
  const tasksRef = collection(firestore, 'coffeeshops', cleanShopId, 'task_results');
  const historyRef = collection(firestore, 'coffeeshops', cleanShopId, 'history');

  // Точечные запросы: только задачи на сегодняшний день
  const qTasks = query(tasksRef, where('date', '==', todayStr));
  const qHistory = query(historyRef, where('date', '==', todayStr));

  let activeList: TaskResultUi[] = [];
  let historyList: TaskResultUi[] = [];

  const notify = () => {
    const map = new Map<string, TaskResultUi>();
    for (const h of historyList) {
      map.set(h.id, h);
    }
    for (const a of activeList) {
      if (!map.has(a.id)) {
        map.set(a.id, a);
      }
    }
    const combined = Array.from(map.values());
    combined.sort((a, b) => a.expectedFinishTime - b.expectedFinishTime);
    callback(combined);
  };

  const unsubTasks = onSnapshot(
    qTasks,
    async (snapshot) => {
      if (snapshot.empty) {
        // Fallback для старых задач без поля date
        try {
          const allSnap = await getDocs(tasksRef);
          activeList = allSnap.docs
            .map((d) => mapTaskFirebaseToUi(d.id, d.data() as TaskResultFirebase))
            .filter((t) => {
              if (t.status === 'Rejected') return false;
              const taskTime = typeof t.timestamp === 'number' ? t.timestamp : t.expectedFinishTime;
              return taskTime ? taskTime >= startOfDayMs && taskTime < endOfDayMs : false;
            });
        } catch {
          activeList = [];
        }
      } else {
        let list = snapshot.docs.map((d) => mapTaskFirebaseToUi(d.id, d.data() as TaskResultFirebase));
        list = list.filter((t) => t.status !== 'Rejected');
        activeList = list;
      }
      notify();
    },
    (err) => {
      console.error(`[taskApi] Error in subscribeToShopTasks for ${cleanShopId}:`, err);
      if (onError) onError(err);
      callback([]);
    }
  );

  const unsubHistory = onSnapshot(
    qHistory,
    (snapshot) => {
      if (snapshot.empty) {
        historyList = [];
      } else {
        let list = snapshot.docs.map((d) => mapTaskFirebaseToUi(d.id, {
          ...(d.data() as any),
          status: (d.data() as any).status || 'Approved'
        }));
        list = list.filter((t) => t.status !== 'Rejected');
        historyList = list;
      }
      notify();
    },
    (err) => {
      console.warn(`[taskApi] Optional history subscription notice for ${cleanShopId}:`, err);
    }
  );

  return () => {
    unsubTasks();
    unsubHistory();
  };
};

/**
 * Загрузка фото-отчета в Cloud Storage
 */
export const uploadTaskPhotoApi = async (
  shiftId: string,
  taskId: string,
  photoBlob: Blob
): Promise<string> => {
  const storage = getFirebaseStorage();
  const filename = `${taskId}_${Date.now()}.webp`;
  const path = `shifts/${shiftId}/tasks/${filename}`;
  const fileRef = storageRef(storage, path);

  await uploadBytes(fileRef, photoBlob);
  return await getDownloadURL(fileRef);
};

/**
 * Перенос выполненной задачи в историю:
 * 1. Запись в coffeeshops/{shopId}/history/{taskId} со статусом Approved, date и чистым snake_case
 * 2. Обновление статуса в task_results
 */
export const moveToHistoryAndCompleteTaskApi = async (
  shopId: string,
  task: TaskResultUi | { id: string; [key: string]: any },
  currentUser: { uid: string; name: string },
  photoUrl: string | null = null
): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const cleanShopId = String(shopId).trim();
  const now = Date.now();
  const taskId = task.id;
  const todayStr = getTodayDateString();

  const historyRef = doc(firestore, 'coffeeshops', cleanShopId, 'history', taskId);
  const taskResultRef = doc(firestore, 'coffeeshops', cleanShopId, 'task_results', taskId);

  const taskData = typeof task === 'object' ? task : { id: taskId };
  const deadline = Number(
    (taskData as any).expected_finish_time ||
    (taskData as any).expectedFinishTime ||
    0
  );
  const isOverdue = deadline > 0 && now > deadline;
  const delayMinutes = isOverdue ? Math.round((now - deadline) / 60000) : 0;

  // 1. Записать в history, сохраняя дату, флаг просрочки и строгий snake_case
  await setDoc(historyRef, {
    id: taskId,
    task_id: (taskData as any).taskId || (taskData as any).task_id || taskId,
    title: taskData.title || 'Задача чек-листа',
    type: taskData.type || 'checkbox',
    status: 'Approved',
    date: (taskData as any).date || todayStr,
    is_overdue: isOverdue,
    delay_minutes: delayMinutes,
    user_id: currentUser.uid,
    user_name: currentUser.name,
    expected_finish_time: deadline || null,
    actual_finish_time: now,
    photo_url: photoUrl || (taskData as any).photoUrl || (taskData as any).photo_url || null,
    completed_at: now
  }, { merge: true });

  // 2. Обновить в task_results (не удаляя дедлайн)
  try {
    await updateDoc(taskResultRef, {
      status: 'Approved',
      date: (taskData as any).date || todayStr,
      is_overdue: isOverdue,
      delay_minutes: delayMinutes,
      user_id: currentUser.uid,
      user_name: currentUser.name,
      actual_finish_time: now,
      completed_at: now
    });
  } catch (err) {
    console.warn('[taskApi] updateDoc task_results notice:', err);
  }
};

/**
 * Завершение чекбокс-задачи (обновление статуса на Approved с фиксацией времени и даты)
 */
export const completeCheckboxTaskApi = async (
  shopId: string,
  taskOrId: TaskResultUi | string,
  userOrId: { uid: string; name?: string } | string,
  userName?: string
): Promise<void> => {
  const firestore = getFirebaseFirestore();
  const cleanShopId = String(shopId).trim();
  const taskId = typeof taskOrId === 'object' ? taskOrId.id : taskOrId;
  const userId = typeof userOrId === 'object' ? userOrId.uid : userOrId;
  const name = typeof userOrId === 'object' ? (userOrId.name || userName || 'Сотрудник') : (userName || 'Сотрудник');
  const now = Date.now();
  const todayStr = getTodayDateString();

  const deadline = typeof taskOrId === 'object'
    ? Number((taskOrId as any).expected_finish_time || taskOrId.expectedFinishTime || 0)
    : 0;
  const isOverdue = deadline > 0 && now > deadline;
  const delayMinutes = isOverdue ? Math.round((now - deadline) / 60000) : 0;

  const taskResultRef = doc(firestore, 'coffeeshops', cleanShopId, 'task_results', taskId);

  // 1. Обновляем статус задачи в task_results (в чистом snake_case)
  try {
    await updateDoc(taskResultRef, {
      status: 'Approved',
      date: typeof taskOrId === 'object' && taskOrId.date ? taskOrId.date : todayStr,
      is_overdue: isOverdue,
      delay_minutes: delayMinutes,
      user_id: userId,
      user_name: name,
      actual_finish_time: now
    });
  } catch (err) {
    console.warn('[taskApi] updateDoc in task_results failed, using moveToHistory:', err);
  }

  // 2. Дублируем в history для архивной выборки
  if (typeof taskOrId === 'object') {
    await moveToHistoryAndCompleteTaskApi(shopId, taskOrId, { uid: userId, name });
  } else {
    await moveToHistoryAndCompleteTaskApi(
      shopId,
      { id: taskId, title: 'Задача чек-листа', type: 'checkbox', status: 'Approved', date: todayStr },
      { uid: userId, name }
    );
  }
};

/**
 * Обновление фото-задачи (статус In_Review с photo_url в task_results)
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
    user_name: userName || null,
    photo_url: photoUrl,
    actual_finish_time: Date.now()
  };

  await updateDoc(docRef, payload);
};
