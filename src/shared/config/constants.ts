/**
 * src/shared/config/constants.ts
 * Базовые константы и параметры проекта BaqLike
 */

/** Допустимый радиус нахождения сотрудника у заведения (в метрах) */
export const ALLOWED_RADIUS_METERS = 150.0;

/** Радиус Земли для формулы гаверсинусов (в метрах) */
export const EARTH_RADIUS_METERS = 6371000.0;

/** Статусы выполнения задач чек-листа */
export const TASK_STATUS = {
  NOT_DONE: 'Not_Done',
  ACTIVE: 'Active',
  OVERDUE: 'Overdue',
  IN_REVIEW: 'In_Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
} as const;

/** Типы задач чек-листа */
export const TASK_TYPE = {
  CHECKBOX: 'checkbox',
  PHOTO: 'photo'
} as const;

/** Статусы смены сотрудника */
export const SHIFT_STATUS = {
  OPEN: 'Open',
  CLOSED: 'Closed'
} as const;

/** Фирменная палитра BaqLike */
export const BRAND_COLORS = {
  PRIMARY: '#6C3CE1',
  PURPLE: '#6C3CE1',
  SECONDARY: '#3B82F6',
  BLUE: '#3B82F6',
  BACKGROUND: '#F8F9FA'
} as const;

/** Семантические стили для статусов задач и смен */
export const STATUS_THEMES = {
  Active: {
    label: 'Активная',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/50',
    borderColor: 'border-indigo-200 dark:border-indigo-800/60',
    dotColor: 'bg-indigo-500'
  },
  Overdue: {
    label: 'Просрочено',
    textColor: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    borderColor: 'border-amber-200 dark:border-amber-800/60',
    dotColor: 'bg-amber-500'
  },
  In_Review: {
    label: 'На проверке',
    textColor: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    borderColor: 'border-amber-200 dark:border-amber-800/60',
    dotColor: 'bg-amber-500'
  },
  Approved: {
    label: 'Принято',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    borderColor: 'border-emerald-200 dark:border-emerald-800/60',
    dotColor: 'bg-emerald-500'
  },
  ApprovedOverdue: {
    label: 'С опозданием',
    textColor: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    borderColor: 'border-amber-200 dark:border-amber-800/60',
    dotColor: 'bg-amber-500'
  },
  Rejected: {
    label: 'Отклонено',
    textColor: 'text-rose-700 dark:text-rose-300',
    bgColor: 'bg-rose-50 dark:bg-rose-950/50',
    borderColor: 'border-rose-200 dark:border-rose-800/60',
    dotColor: 'bg-rose-500'
  },
  Open: {
    label: 'Смена открыта',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    borderColor: 'border-emerald-200 dark:border-emerald-800/60',
    dotColor: 'bg-emerald-500'
  },
  Closed: {
    label: 'Смена закрыта',
    textColor: 'text-gray-700 dark:text-slate-300',
    bgColor: 'bg-gray-100 dark:bg-slate-800',
    borderColor: 'border-gray-200 dark:border-slate-700',
    dotColor: 'bg-gray-400 dark:bg-slate-500'
  }
} as const;

/** Конфигурация Firebase по умолчанию (из спецификации) */
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC72h_Cs8_ivnI73XErAG5vMQHcWBggOts',
  authDomain: 'checklistcoffeeshop.firebaseapp.com',
  projectId: 'checklistcoffeeshop',
  storageBucket: 'checklistcoffeeshop.firebasestorage.app',
  messagingSenderId: '785653380290',
  appId: '1:785653380290:web:coffeeshop_web'
} as const;
