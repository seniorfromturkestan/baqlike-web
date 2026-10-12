/**
 * src/shared/types/index.ts
 * Полный набор типов и интерфейсов для Web-фронтенда BaqLike Staff
 * В соответствии с методологией FSD (слой Shared)
 */

// ==========================================
// 1. Базовые типы геопозиции
// ==========================================

export interface FirestoreGeoPoint {
  latitude: number;
  longitude: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationCheckResult {
  canCheckIn: boolean;
  isInside: boolean;
  isTestAccount: boolean;
  distance: number;
  allowedRadiusMeters: number;
  userCoordinates?: Coordinates;
  shopCoordinates?: Coordinates;
  accuracy?: number | null;
}

// ==========================================
// 2. Статусы и перечисления
// ==========================================

export type TaskStatus = 'Not_Done' | 'In_Review' | 'Approved' | 'Rejected';

export type TaskType = 'checkbox' | 'photo';

export type ShiftStatus = 'Open' | 'Closed';

// ==========================================
// 3. Сущности базы данных (Firestore Documents)
// ==========================================

/**
 * Документ в коллекции /Users/{userId}
 */
export interface UserFirebase {
  id?: string;
  name: string;
  phone?: string;
  role: string;
  coffeeshop_id?: string;
  shop_id?: string;
  shift_id: string | null;
  telegram_id?: number | null;
  telegram_username?: string | null;
  avatar_url?: string | null;
  created_at?: any;
}

/**
 * Документ в коллекции /coffeeshops/{shopId}
 */
export interface ShopFirebase {
  id?: string;
  name: string;
  location: FirestoreGeoPoint;
  radius?: number;
}

/**
 * Документ в подколлекции /coffeeshops/{shopId}/shifts/{shiftId}
 */
export interface ShiftFirebase {
  id: string;
  user_id: string;
  user_name?: string;
  check_in: any;
  check_out: any;
  status?: string;
  date?: string;
}

/**
 * Документ в подколлекции /coffeeshops/{shopId}/task_results/{taskResultId}
 */
export interface TaskResultFirebase {
  id: string;
  task_id: string | null;
  title: string;
  type: TaskType;
  status: TaskStatus;
  timestamp?: number; // epoch milliseconds (start of day)
  expected_finish_time: number; // epoch milliseconds
  actual_finish_time: number | null; // epoch milliseconds
  user_id: string | null;
  user_name: string | null;
  photo_url: string | null;
  review_comment: string | null;
}

// ==========================================
// 4. Модели UI / Состояния фронтенда
// ==========================================

export interface UserUi {
  id: string;
  name: string;
  role: string;
  coffeeShopId: string;
  shiftId: string | null;
  telegramId?: number | null;
  telegramUsername?: string | null;
  avatarUrl?: string | null;
}

export interface ShiftUi {
  id: string;
  userId: string;
  shopId?: string;
  userName?: string;
  checkIn: Date | null;
  checkOut: Date | null;
  isActive?: boolean;
}

export interface TaskResultUi {
  id: string;
  taskId: string | null;
  title: string;
  type: TaskType;
  status: TaskStatus;
  timestamp?: number;
  expectedFinishTime: number;
  actualFinishTime: number | null;
  userId: string | null;
  userName: string | null;
  photoUrl: string | null;
  reviewComment: string | null;
}

// ==========================================
// 5. Контракты запросов и мутаций (Service DTOs)
// ==========================================

export interface CheckInPayload {
  userId: string;
  userName: string;
  shopId: string;
  checkInTimestamp?: number;
  latitude?: number;
  longitude?: number;
}

export interface CheckOutPayload {
  userId: string;
  shopId: string;
  shiftId: string;
  checkOutTimestamp?: number;
  latitude?: number;
  longitude?: number;
}

export interface CompleteCheckboxTaskPayload {
  userId: string;
  userName: string;
  shopId: string;
  taskResultId: string;
  finishTime: number;
}

export interface CompletePhotoTaskPayload {
  userId: string;
  userName: string;
  shopId: string;
  taskResultId: string;
  finishTime: number;
  photoFile: File | Blob;
}

// ==========================================
// 6. Конфигурация Firebase
// ==========================================

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// ==========================================
// 7. Типы UI компонентов
// ==========================================

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export type StatusBadgeType = TaskStatus | ShiftStatus;
