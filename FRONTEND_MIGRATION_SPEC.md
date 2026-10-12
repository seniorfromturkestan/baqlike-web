# Техническая спецификация (ТЗ), архитектурный разбор и карта интеграций с Firebase
## Миграция мобильного приложения BaqLike («Чек-лист кофейни») на Web-фронтенд

> **Важное архитектурное уточнение:**  
> Исследованный исходный код проекта представляет собой **Kotlin Multiplatform (KMP) / Compose Multiplatform** проект (поддерживающий Android и iOS с общей кодовой базой на Compose/Decompose), а не Flutter. В репозитории отсутствуют `pubspec.yaml` и директория `lib/`. Фактический стек и зависимости определены в `gradle/libs.versions.toml` и `composeApp/build.gradle.kts`, а бизнес-логика и UI сосредоточены в `composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/`.  
> Ниже представлен исчерпывающий реверс-инжиниринг всей кодовой базы с прямыми ссылками на исходный код, схемами данных, алгоритмами и готовыми TypeScript-контрактами для создания Web-версии.

---

## 1. Архитектурный обзор и стек

### 1.1. Архитектурный паттерн
- **Component-Driven Architecture / MVI-like Decomposition:** В проекте используется библиотека **Decompose** (`com.arkivanov.decompose:decompose:3.4.0` в связке с `decompose-extensions-compose`).
- **Разделение слоев:**
  - **Компоненты логики (`*Component.kt`):** Управляют состоянием (`MutableValue`, `Value`, корутины, подписки на потоки) и инкапсулируют бизнес-правила (см. [LoginComponent.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/auth/LoginComponent.kt), [MainComponent.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/main/MainComponent.kt), [CheckInComponent.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/checkIn/CheckInComponent.kt), [TaskListComponent.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/tasks/taskList/TaskListComponent.kt)).
  - **Декларативный UI (`*Screen.kt`):** Экраны Compose Multiplatform подписываются на состояние компонентов через `subscribeAsState()` и вызывают методы-интенты компонентов (см. [LoginScreen.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/auth/LoginScreen.kt), [MainScreen.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/main/MainScreen.kt)).
  - **Репозиторий данных:** [FirebaseRepository.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/FirebaseRepository.kt) — единая точка входа для работы с Firebase Firestore, Auth и Storage.
  - **Обработка состояний и ошибок:** Модели `Resource<T>` ([Resource.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/models/ui/Resource.kt)), `ApiResponse<T>` и хелпер `safeFirebaseCall` ([SafeCall.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/network/SafeCall.kt)).

### 1.2. Используемый стейт-менеджмент
- **Decompose Values:** Реактивные контейнеры состояний `Value<T>` и `MutableValue<T>`.
- **Kotlin Coroutines & Flow:** Асинхронные потоки `Flow<T>`, `StateFlow<T>`, `MutableStateFlow<T>` с привязкой к жизненному циклу компонента через Essenty Coroutines (`com.arkivanov.essenty:lifecycle-coroutines:2.5.0`).
- **Compose State:** `collectAsStateWithLifecycle()` и `subscribeAsState()`.

### 1.3. Навигация и роутинг
Навигация строго иерархическая и управляется через стэк конфигураций Decompose `StackNavigation`:
1. **Корневой стэк (`RootComponent.kt` L27-L45):**
   - `Configuration.LoadingConfig` -> `Child.Loading` (FullScreen индикатор загрузки).
   - `Configuration.LoginConfig` -> `Child.Login(LoginComponent)` (Экран авторизации).
   - `Configuration.MainConfig(userId)` -> `Child.Main(MainComponent)` (Основной контейнер приложения).
   - *Переключение:* слушает `firebaseRepository.firebaseUser` (AuthState). Если `user != null` -> `MainConfig(user.uid)`, иначе -> `LoginConfig`.
2. **Основной стэк (`MainComponent.kt` L37-L76, L147-L157):**
   - `Configuration.Loading` -> Экран загрузки.
   - `Configuration.CheckIn(user)` -> [CheckInScreen](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/checkIn/CheckInScreen.kt) (показывается, если `user.shiftId == null`).
   - `Configuration.Home(user)` -> [HomeScreen](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/home/HomeScreen.kt) (показывается, если `user.shiftId != null`).
   - `Configuration.TaskList(user)` -> [TaskListScreen](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/tasks/taskList/TaskListScreen.kt) (список невыполненных задач на сегодня, открывается по кнопке с Home).
   - `Configuration.TaskListDone(user)` -> [TaskListDoneScreen](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/tasks/taskListDone/TaskListDoneScreen.kt) (история и выполненные задачи с вкладками-фильтрами).
   - `Configuration.Error(message)` -> Экран ошибки с кнопкой "Повторить".

### 1.4. Ключевые сторонние пакеты
- `dev.gitlive:firebase-firestore:2.4.0` — кроссплатформенный клиент Firestore (документы, коллекции, real-time слушатели через `snapshots`).
- `dev.gitlive:firebase-auth:2.4.0` — авторизация по Email/Password.
- `dev.gitlive:firebase-storage:2.4.0` — загрузка файлов в бакет Cloud Storage и генерация URL.
- `dev.jordond.compass:geolocation:3.0.0` & `geolocation-mobile` — геолокация на мобильных платформах.
- `io.coil-kt.coil3:coil-compose:3.3.0` & `coil-network-ktor3:3.3.0` — загрузка и кэширование сетевых изображений.
- `io.github.ismoy:imagepickerkmp:1.0.32` & `androidx.camera:camera-view:1.5.3` — интерфейс камеры и захват фото.
- `org.jetbrains.kotlinx:kotlinx-datetime:0.7.1` — манипуляции со временем (эпоха в миллисекундах, локальные даты, начало/конец дня).

---

## 2. Полное ТЗ и пользовательские сценарии (User Stories)

### 2.1. Описание экранов

#### Экран 1: Вход в систему (`LoginScreen`)
- **Файл:** [LoginScreen.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/auth/LoginScreen.kt), [LoginComponent.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/auth/LoginComponent.kt)
- **Назначение:** Аутентификация сотрудника кофейни.
- **Входные параметры:** Нет (стартовый экран при отсутствии сессии).
- **Отображаемые данные:**
  - Заголовок: «С возвращением» (`Res.string.welcome_back`).
  - Подзаголовок: «Войдите, чтобы продолжить» (`Res.string.sign_in_to_continue`).
  - Поле Email (с иконкой почты).
  - Поле Password (с переключателем видимости пароля `Visibility` / `VisibilityOff`).
  - Сообщение об ошибке (красный текст).
  - Кнопка «Войти» с индикатором загрузки (`CircularProgressIndicator`).
  - Кнопка-ссылка: «Политика конфиденциальности» (открывает URL: `https://baqlike-admin.netlify.app/privacy-policy`).
- **Валидация формы:**
  - Проверка на заполненность: если email или password пустые — вывод сообщения «Заполните все поля» ([LoginComponent.kt:L63-L69](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/auth/LoginComponent.kt#L63-L69)).
  - Кнопка «Войти» `disabled`, если идет загрузка либо поля пусты.

#### Экран 2: Главный контейнер (`MainScreen`)
- **Файл:** [MainScreen.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/main/MainScreen.kt), [MainComponent.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/main/MainComponent.kt)
- **Назначение:** Оболочка (Shell layout) приложения с TopAppBar и динамическим переключением экранов в зависимости от статуса смены.
- **Отображаемые данные в TopAppBar:**
  - Аватар: фиолетово-синий градиентный круг с инициалами пользователя (первые 2 заглавные буквы имени, например «Иван Иванов» -> «ИИ»).
  - Имя пользователя (`user.name`) и его роль/должность (`user.role`).
  - Кнопка «Выйти» с иконкой выхода.
- **Бизнес-правило выхода из аккаунта (`signOut`):**
  - При нажатии «Выйти» вызывается проверка: [MainComponent.kt:L171-L181](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/main/MainComponent.kt#L171-L181).
  - Если у пользователя `shiftId != null` (активна открытая смена), выход блокируется и показывается модальное окно с текстом: **«Чтобы выйти вы должны завершить смену»**.
  - Если `shiftId == null`, выполняется `firebaseRepository.signOut()`.

#### Экран 3: Регистрация присутствия (`CheckInScreen`)
- **Файл:** [CheckInScreen.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/checkIn/CheckInScreen.kt), [CheckInComponent.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/checkIn/CheckInComponent.kt)
- **Назначение:** Верификация нахождения сотрудника в кофейне по GPS и открытие рабочей смены.
- **Входные параметры:** Объект `user: UserUi`.
- **Отображаемые элементы:**
  - Иконка входа `Login`, заголовок «Регистрация присутствия», подзаголовок «Подтвердите ваше присутствие, нажав кнопку ниже».
  - Карточка ошибки (показывается анимацией при наличии ошибки геолокации).
  - Градиентная интерактивная кнопка «Начать смену» с эффектом отклика (`scale 0.94`, тень, лоадер).
  - Пояснение: «Присутствие будет зафиксировано автоматически».
- **Логика выполнения Check-in:**
  1. Запрашиваются текущие координаты устройства (`Priority.HighAccuracy`).
  2. Загружаются координаты привязанной к сотруднику кофейни из `/coffeeshops/{user.coffeeShopId}`.
  3. Вычисляется расстояние между сотрудником и точкой кофейни по формуле гаверсинусов ([LocationCheckService.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/services/LocationCheckService.kt)).
  4. Если дистанция `<= 50.0` метров — чек-ин разрешается. Иначе выводится ошибка: **«Вы не находитесь в кофейне»**.
  5. **Исключение для тестов (Backdoor):** если имя пользователя `userUi.name == "Test"`, проверка дистанции игнорируется, чек-ин разрешен из любой точки!
  6. При успешной проверке создается документ в `/coffeeshops/{shopId}/shifts` и обновляется поле `shift_id` пользователя.

#### Экран 4: Главный экран активной смены (`HomeScreen`)
- **Файл:** [HomeScreen.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/home/HomeScreen.kt), [HomeComponent.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/home/HomeComponent.kt)
- **Назначение:** Меню действий сотрудника на активной смене.
- **Отображаемые элементы и действия:**
  1. Кнопка **«Задачи на сегодня»** (фиолетово-синий градиент, иконка `ChecklistRtl`) -> переход к `TaskListScreen`.
  2. Кнопка **«Сделанные задачи»** (фиолетово-синий градиент, иконка `Done`) -> переход к `TaskListDoneScreen`.
  3. Кнопка **«Завершить смену»** (красно-оранжевый danger градиент `#EF4444 -> #F97316`, иконка `ExitToApp`) -> вызов `checkOut()`.
  4. Текстовая кнопка **«Удалить аккаунт»** (красный цвет, иконка `DeleteForever`) -> открывает модальное окно: «Ваш аккаунт будет удален через 7 дней.» с кнопками «ОК» и «Отмена». При подтверждении в текущей реализации вызывается `signOut()`.
  5. Текстовая ссылка **«Политика конфиденциальности»** -> открывает URL `https://checklist-admin.netlify.app/privacy-policy`.
- **Логика завершения смены (Check-out):**
  - Берется текущее время `checkOut = System.currentTimeMillis()`.
  - В `/coffeeshops/{shopId}/shifts/{shiftId}` обновляется поле `check_out = checkOut`.
  - В `/Users/{userId}` поле `shift_id` выставляется в `null`.
  - Поток слушателя пользователя автоматически триггерит редирект с `HomeScreen` обратно на `CheckInScreen`.

#### Экран 5: Задачи на сегодня (`TaskListScreen`)
- **Файл:** [TaskListScreen.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/tasks/taskList/TaskListScreen.kt), [TaskListComponent.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/tasks/taskList/TaskListComponent.kt)
- **Назначение:** Отображение назначенных на текущие сутки и еще не закрытых задач кофейни со статусом `Not_Done`.
- **Состояния списка:**
  - Скелетонная загрузка: 5 анимированных шиммер-карточек с разной шириной строк.
  - Пустое состояние (`EmptyScreen`): «Нет задач», «У вас пока нет активных задач. Они появятся здесь, когда будут назначены».
  - Список карточек задач:
    - Иконка типа задачи: Чекбокс (`#6C3CE1`) или Фотоотчёт (`#3B82F6`).
    - Название задачи (`task.title`).
    - Ожидаемое время завершения в формате `ДД.ММ.ГГГГ ЧЧ:ММ`.
    - Бейдж статуса: «Не сделано» (серый `#9CA3AF`).
- **Сценарий выполнения задачи:**
  - При клике на карточку открывается шторка `ModalBottomSheet`:
    - Показывает название, бейдж, тип, дедлайн и комментарий ревьюера (если есть).
    - Кнопка «Готово» (фиолетово-синий градиент):
      - **Если тип `CHECK_BOX`:** открывается диалог подтверждения: «Задача "{taskTitle}" выполнена?». При нажатии «Подтвердить» статус сразу меняется на `Approved`, записывается время, ID и имя пользователя.
      - **Если тип `PHOTO`:** открывается камера. Пользователь делает снимок, попадает на экран предпросмотра («Переснять» / «Готово»). При подтверждении снимок загружается в Firebase Storage, статус задачи переходит в `In_Review`, записывается `photo_url`.
  - После отправки появляется Snackbar: *«Задача успешно загружена! Вы можете найти её в разделе "Сделанные задачи"»*.

#### Экран 6: Сделанные задачи (`TaskListDoneScreen`)
- **Файл:** [TaskListDoneScreen.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/tasks/taskListDone/TaskListDoneScreen.kt), [TaskListDoneComponent.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/tasks/taskListDone/TaskListDoneComponent.kt)
- **Назначение:** Просмотр истории отправленных сотрудником задач с фильтрацией по статусу.
- **Вкладки фильтрации (Filter Chips):**
  1. `NOT_DONE` (метка: «Все задачи», в запросе Firestore: `status != "Not_Done"`).
  2. `IN_REVIEW` (метка: «На проверке», желтый `#F59E0B`).
  3. `APPROVED` (метка: «Одобрено», зеленый `#10B981`).
  4. `REJECTED` (метка: «Отклонено», красный `#EF4444`).
- **Компоновка:**
  - Горизонтальный пейджер `HorizontalPager` с анимацией перелистывания между фильтрами.
  - Каждая страница содержит собственный реактивный поток задач, отсортированных по `expected_finish_time DESC`.
- **Просмотр деталей задачи:**
  - Открытие `ModalBottomSheet`:
    - Название, статус, тип.
    - Ожидаемое время завершения и фактическое время завершения (`actualFinishTime`).
    - Фотография (если есть) высотой 200dp с закруглением 12dp.
    - Клик по фотографии открывает полноэкранный диалог просмотра изображения (`ImageViewerDialog`) на черном фоне 90% opacity с кнопкой закрытия.
    - Комментарий проверяющего (`review_comment`) в карточке (критично для отклоненных задач).

### 2.2. Роли пользователей
- В кодовой базе поле `role` содержится в модели пользователя `UserFirebase` ([UserFirebase.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/models/firebase/UserFirebase.kt)).
- Данное клиентское приложение предназначено для **линейных сотрудников кофейни (бариста)**.
- Роль администратора/управляющего вынесена во внешнюю веб-систему (упоминается в коде как `baqlike-admin` / `checklist-admin`), которая осуществляет генерацию ежедневных задач, проверку фотоотчетов (`In_Review` -> `Approved` / `Rejected`) и написание `review_comment`.

---

## 3. Интеграция с Firebase (Подробная спецификация)

### 3.1. Firebase Auth
- **Метод аутентификации:** исключительно **Email & Password** через `firebaseAuth.signInWithEmailAndPassword(email, password)` ([FirebaseRepository.kt:L67-L68](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/FirebaseRepository.kt#L67-L68)).
- **Управление сессией:**
  - Отслеживание изменений через поток `firebaseAuth.authStateChanged` ([FirebaseRepository.kt:L187](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/FirebaseRepository.kt#L187)).
  - `signOut()`: метод `firebaseAuth.signOut()` ([FirebaseRepository.kt:L70-L72](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/FirebaseRepository.kt#L70-L72)).
  - Дополнительные данные пользователя (имя, привязка к кофейне, статус смены) не дублируются в Auth metadata, а хранятся в документе Firestore `/Users/{uid}`.

### 3.2. Схема коллекций и документов Firestore

```mermaid
erDiagram
    USERS ||--o| COFFEESHOPS : "works at (coffeeshop_id)"
    USERS ||--o| SHIFTS : "has active (shift_id)"
    COFFEESHOPS ||--o{ SHIFTS : "subcollection: shifts"
    COFFEESHOPS ||--o{ TASK_RESULTS : "subcollection: task_results"

    USERS {
        string id PK
        string name
        string role
        string coffeeshop_id FK
        string shift_id FK
    }

    COFFEESHOPS {
        string id PK
        string name
        GeoPoint location
    }

    SHIFTS {
        string id PK
        string user_id FK
        string user_name
        number check_in
        number check_out
    }

    TASK_RESULTS {
        string id PK
        string task_id
        string title
        string type
        string status
        number expected_finish_time
        number actual_finish_time
        string user_id FK
        string user_name
        string photo_url
        string review_comment
    }
```

#### Коллекция 1: `Users` (Корневая)
- **Путь:** `/Users/{userId}` (где `userId` равен Firebase Auth UID).
- **Поля документа:**
  | Поле в базе | Тип Firestore | Nullable | Описание |
  | :--- | :--- | :--- | :--- |
  | `id` | `String` | Нет | Идентификатор пользователя (совпадает с doc ID) |
  | `name` | `String` | Нет | ФИО / отображаемое имя сотрудника |
  | `role` | `String` | Нет | Должность (например, "Бариста") |
  | `coffeeshop_id` | `String` | Нет | ID документа привязанной кофейни |
  | `shift_id` | `String` | Да (`null`) | ID активной смены или `null`, если смена закрыта |

#### Коллекция 2: `coffeeshops` (Корневая)
- **Путь:** `/coffeeshops/{shopId}`
- **Поля документа:**
  | Поле в базе | Тип Firestore | Nullable | Описание |
  | :--- | :--- | :--- | :--- |
  | `name` | `String` | Нет | Название кофейни |
  | `location` | `GeoPoint` | Нет | Географические координаты точки кофейни (`latitude`, `longitude`) |

#### Подколлекция 2.1: `shifts`
- **Путь:** `/coffeeshops/{shopId}/shifts/{shiftId}`
- **Поля документа:**
  | Поле в базе | Тип Firestore | Nullable | Описание |
  | :--- | :--- | :--- | :--- |
  | `id` | `String` | Нет | ID документа смены (записывается после `add()`) |
  | `user_id` | `String` | Нет | ID сотрудника, открывшего смену |
  | `user_name` | `String` | Нет | Имя сотрудника на момент чек-ина |
  | `check_in` | `Integer (Long)` | Нет | Timestamp начала смены (эпоха в мс) |
  | `check_out` | `Integer (Long)` | Да (`null`) | Timestamp закрытия смены (эпоха в мс) |

#### Подколлекция 2.2: `task_results`
- **Путь:** `/coffeeshops/{shopId}/task_results/{taskResultId}`
- **Поля документа:**
  | Поле в базе | Тип Firestore | Nullable | Допустимые значения / Описание |
  | :--- | :--- | :--- | :--- |
  | `id` | `String` | Нет | Уникальный ID результата задачи |
  | `task_id` | `String` | Да | ID шаблона задачи из админки |
  | `title` | `String` | Нет | Название задачи (например, «Протереть столы») |
  | `type` | `String` | Нет | `"checkbox"` или `"photo"` |
  | `status` | `String` | Нет | `"Not_Done"`, `"In_Review"`, `"Approved"`, `"Rejected"` |
  | `expected_finish_time` | `Integer (Long)` | Нет | Плановый дедлайн задачи (эпоха в мс) |
  | `actual_finish_time` | `Integer (Long)` | Да | Фактический timestamp выполнения (эпоха в мс) |
  | `user_id` | `String` | Да | ID сотрудника, выполнившего задачу |
  | `user_name` | `String` | Да | Имя сотрудника, выполнившего задачу |
  | `photo_url` | `String` | Да | Публичный HTTPS URL фотографии в Cloud Storage |
  | `review_comment` | `String` | Да | Комментарий проверяющего менеджера |

### 3.3. Операции чтения (Чтение, фильтры, сортировки, потоки)

1. **Слушатель пользователя в реальном времени (`getUserById`):**
   - **Код:** [FirebaseRepository.kt:L190-L193](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/FirebaseRepository.kt#L190-L193)
   - **Запрос:** `firestore.collection("Users").document(id).snapshots()`
   - **Поведение:** Реактивный стрим. При изменении `shift_id` приложение мгновенно переключает экран между `CheckInScreen` и `HomeScreen`.

2. **Получение данных кофейни (`getShopData`):**
   - **Код:** [FirebaseRepository.kt:L98-L100](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/FirebaseRepository.kt#L98-L100)
   - **Запрос:** `firestore.collection("coffeeshops").document(shopId).get()`
   - **Поведение:** Однократный get-запрос при выполнении чек-ина для считывания `location: GeoPoint`.

3. **Стриминг невыполненных задач на сегодня (`getTaskResultsNotDone`):**
   - **Код:** [FirebaseRepository.kt:L128-L140](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/FirebaseRepository.kt#L128-L140)
   - **Фильтры:**
     - `expected_finish_time >= startOfDayTimestamp` (00:00:00.000 локального дня)
     - `expected_finish_time <= endOfDayTimestamp` (23:59:59.999 локального дня)
     - `status == "Not_Done"`
   - **Сортировка:** `.orderBy("expected_finish_time", Direction.ASCENDING)`
   - **Поведение:** Real-time слушатель `snapshots`.

4. **Стриминг выполненных задач с фильтрацией (`getTaskResultsDone`):**
   - **Код:** [FirebaseRepository.kt:L142-L157](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/FirebaseRepository.kt#L142-L157)
   - **Фильтры:**
     - `user_id == userId`
     - Если фильтр `!= NOT_DONE`: `status == statusFilter`
     - Если фильтр `== NOT_DONE` (вкладка «Все задачи»): `status != "Not_Done"`
   - **Сортировка:** `.orderBy("expected_finish_time", Direction.DESCENDING)`
   - **Поведение:** Real-time слушатель `snapshots`.

### 3.4. Операции записи и транзакционность

1. **Регистрация прихода (`checkIn`):**
   - **Код:** [FirebaseRepository.kt:L74-L96](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/FirebaseRepository.kt#L74-L96)
   - **Шаг 1:** `docRef = collection("coffeeshops").document(shopId).collection("shifts").add(shift)`
   - **Шаг 2:** `docRef.updateFields { "id" to docRef.id, "user_name" to userName }`
   - **Шаг 3:** `collection("Users").document(userId).updateFields { "shift_id" to docRef.id }`

2. **Завершение смены (`checkOut`):**
   - **Код:** [FirebaseRepository.kt:L116-L126](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/FirebaseRepository.kt#L116-L126)
   - **Шаг 1:** `collection("coffeeshops").document(shopId).collection("shifts").document(shiftId).updateFields { "check_out" to checkOutTime }`
   - **Шаг 2:** `collection("Users").document(userId).updateFields { "shift_id" to null }`

3. **Завершение чекбокс-задачи (`setCheckBoxTaskDone`):**
   - **Код:** [FirebaseRepository.kt:L159-L168](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/FirebaseRepository.kt#L159-L168)
   - **Обновление:** `collection("coffeeshops").document(shopId).collection("task_results").document(taskResultId).updateFields`:
     - `actual_finish_time` = timestamp
     - `user_id` = userId
     - `user_name` = userName
     - `status` = `"Approved"` (для чекбокса аппрув ставится автоматически без ревью!)

4. **Завершение фото-задачи (`setPhotoTaskDone`):**
   - **Код:** [FirebaseRepository.kt:L170-L185](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/FirebaseRepository.kt#L170-L185)
   - **Шаг 1:** Загрузка файла в Storage: `firebaseStorage.reference(taskResultId).putFile(photo)`
   - **Шаг 2:** Получение ссылки: `downloadUrl = storageReference.getDownloadUrl()`
   - **Шаг 3:** Обновление документа задачи:
     - `actual_finish_time` = timestamp
     - `user_id` = userId
     - `user_name` = userName
     - `photo_url` = downloadUrl
     - `status` = `"In_Review"` (фото-задача отправляется на модерацию менеджеру!)

### 3.5. Firebase Storage и Cloud Functions
- **Конфигурация бакета:** `checklistcoffeeshop.firebasestorage.app` (из [google-services.json](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/google-services.json)).
- **Путь сохранения файла:** `/${taskResultId}` (файл сохраняется в корень бакета под именем идентификатора задачи).
- **Формат файла:** Изображение JPEG/PNG.
- **Cloud Functions:** В клиентском приложении прямых HTTP/Callable вызовов функций нет. Генерация плановых задач и модерация осуществляются через админ-панель.

---

## 4. Геолокация и картография (Детальный разбор)

### 4.1. Сбор геоданных
- **Используемый плагин:** Библиотека `dev.jordond.compass:geolocation-mobile:3.0.0` ([libs.versions.toml:L50-L52](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/gradle/libs.versions.toml#L50-L52)).
- **Режим сбора:** Запрос выполняется **строго On-Demand** (в момент нажатия кнопки «Начать смену») вызовом `Geolocator.mobile().current(Priority.HighAccuracy)` ([CheckInComponent.kt:L40-L42](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/checkIn/CheckInComponent.kt#L40-L42)).
- **Фоновый трекинг:** **Полностью отсутствует**. Приложение не отслеживает местоположение в фоне.

### 4.2. Формат хранения геоданных
- Координаты кофейни в Firestore хранятся как нативный объект Firestore **`GeoPoint`**:
  ```kotlin
  data class ShopFirebase(
      val location: GeoPoint, // dev.gitlive.firebase.firestore.GeoPoint
      val name: String
  )
  ```
- Поля `latitude` и `longitude` типа `Double`.
- Хеширование (Geohash), массивы `[lng, lat]` или вложенные структуры не используются.

### 4.3. Геозапросы, радиус и алгоритм расчета дистанции
- **Клиентская фильтрация:** Геозапросы по радиусу на стороне Firestore отсутствуют. Приложение берет точечные координаты привязанной кофейни сотрудника.
- **Алгоритм расчета:** В [LocationCheckService.kt](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/src/commonMain/kotlin/aslan/zholmanov/check_list/services/LocationCheckService.kt) реализована **формула гаверсинусов (Haversine formula)**:
  - Радиус Земли: `6 371 000.0` метров.
  - Допустимый радиус (`allowedRadiusMeters`): **50.0 метров**.
  - Формула:
    $$dLat = (lat_2 - lat_1) \cdot \frac{\pi}{180}$$
    $$dLon = (lon_2 - lon_1) \cdot \frac{\pi}{180}$$
    $$a = \sin^2(dLat / 2) + \cos(lat_1 \cdot \frac{\pi}{180}) \cdot \cos(lat_2 \cdot \frac{\pi}{180}) \cdot \sin^2(dLon / 2)$$
    $$c = 2 \cdot \operatorname{atan2}(\sqrt{a}, \sqrt{1 - a})$$
    $$\text{distance} = 6\,371\,000 \cdot c$$
- **Логика разрешения входа:**
  ```kotlin
  val isInside = locationCheckService.isUserInCoffeeShop(user = userCoordinates, shop = shopCoordinates)
  val isTestAccount = userUi.name == "Test"
  val allowCheckIn = isInside || isTestAccount
  ```

### 4.4. Карты и сторонние гео-API
- В приложении **нет интерактивной карты** (Google Maps, Mapbox, Яндекс Карты или OSM не используются для рендеринга).
- Геокодинг адресов и построение маршрутов в мобильном клиенте не производятся.

---

## 5. Модели данных для фронтенда (`types.ts`)

Готовый TypeScript-файл со всеми типами, DTO и контрактами сущностей Firebase:

```typescript
/**
 * types.ts
 * Полный набор типов и интерфейсов для Web-фронтенда BaqLike Checklist
 */

// ==========================================
// 1. Базовые типы Firestore
// ==========================================

export interface FirestoreGeoPoint {
  latitude: number;
  longitude: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// ==========================================
// 2. Статусы и перечисления
// ==========================================

export type TaskStatus = 'Not_Done' | 'In_Review' | 'Approved' | 'Rejected';

export type TaskType = 'checkbox' | 'photo';

// ==========================================
// 3. Сущности базы данных (Firestore Documents)
// ==========================================

/**
 * Документ в коллекции /Users/{userId}
 */
export interface UserFirebase {
  id: string;
  name: string;
  role: string;
  coffeeshop_id: string;
  shift_id: string | null;
}

/**
 * Документ в коллекции /coffeeshops/{shopId}
 */
export interface ShopFirebase {
  name: string;
  location: FirestoreGeoPoint;
}

/**
 * Документ в подколлекции /coffeeshops/{shopId}/shifts/{shiftId}
 */
export interface ShiftFirebase {
  id: string;
  user_id: string;
  user_name?: string;
  check_in: number | null; // epoch milliseconds
  check_out: number | null; // epoch milliseconds
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
}

export interface ShiftUi {
  id: string;
  userId: string;
  userName?: string;
  checkIn: Date | null;
  checkOut: Date | null;
}

export interface TaskResultUi {
  id: string;
  taskId: string | null;
  title: string;
  type: TaskType;
  status: TaskStatus;
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
  checkInTimestamp: number;
}

export interface CheckOutPayload {
  userId: string;
  shopId: string;
  shiftId: string;
  checkOutTimestamp: number;
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
```

---

## 6. Нюансы и рекомендации для Web-версии

### 6.1. Работа с Web Geolocation API
- **Ограничение HTTPS:** Браузерный `navigator.geolocation` работает **исключительно по безопасному протоколу HTTPS** (либо на `localhost` во время разработки). Продакшн-развертывание обязательно должно иметь валидный SSL-сертификат.
- **Ограничение точности на Desktop:**
  - На смартфонах через мобильные браузеры (Mobile Safari / Chrome) API использует реальный аппаратный GPS чип с высокой точностью (до 5–15 метров).
  - На настольных компьютерах и ноутбуках браузер определяет координаты по внешнему IP-адресу или точкам Wi-Fi с погрешностью от 200 метров до нескольких километров. Из-за этого десктопные пользователи не смогут пройти валидацию радиуса 50 метров.
  - **Рекомендация:** Реализовать веб-приложение в формате **Progressive Web App (PWA)** с подсказкой пользователю открывать систему со смартфона, либо добавить понятное сообщение об ошибке, если точность `accuracy > 50m`.

### 6.2. Особенности Firebase Web SDK (v10+)
- **Модульный SDK:** Рекомендуется использовать официальный модульный пакет `@firebase/firestore`, `@firebase/auth`, `@firebase/storage`:
  ```typescript
  import { initializeApp } from 'firebase/app';
  import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
  import { getFirestore, collection, doc, onSnapshot, query, where, orderBy, updateDoc, addDoc } from 'firebase/firestore';
  import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
  ```
- **Индексы Firestore:**
  - Запрос в `getTaskResultsDone`:
    ```typescript
    query(
      collection(firestore, `coffeeshops/${shopId}/task_results`),
      where("user_id", "==", userId),
      where("status", "!=", "Not_Done"),
      orderBy("expected_finish_time", "desc")
    )
    ```
    В Firestore запросы с неравенством (`!=`) и сортировкой по другому полю требуют **композитного составного индекса (Composite Index)** по полям `user_id ASC`, `status ASC`, `expected_finish_time DESC`.
  - При первом выполнении запроса в консоли браузера появится прямая ссылка на автогенерацию этого индекса в Firebase Console.

### 6.3. Камера и съемка фото в Web
- В KMP-приложении на Android использовался `CameraX` с полноэкранным видоискателем и кнопкой затвора.
- Для Web-версии есть 2 архитектурных решения:
  1. **Нативное мобильное открытие камеры через HTML File Input (Рекомендуется для PWA):**
     ```html
     <input type="file" accept="image/*" capture="environment" />
     ```
     *Плюсы:* Идеально работает на iOS и Android, использует нативное приложение камеры операционной системы со всеми аппаратными оптимизациями и постобработкой.
  2. **Полноэкранный WebRTC видоискатель:**
     Использование `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` со стримом в `<video>` и захватом кадра через `<canvas>`.
     *Минусы:* Требует сложной обработки ориентации кадра, разрешений браузера и плохо работает в ряде мобильных webview.

### 6.4. Настройка CORS для Firebase Storage
- При прямом скачивании или отображении фотографий через `fetch` / `canvas` из Web-домена с бакета `checklistcoffeeshop.firebasestorage.app` может возникнуть ошибка CORS.
- Необходимо настроить файл `cors.json` через Google Cloud CLI (`gsutil`):
  ```json
  [
    {
      "origin": ["*"],
      "method": ["GET", "PUT", "POST", "HEAD"],
      "responseHeader": ["*"],
      "maxAgeSeconds": 3600
    }
  ]
  ```
  Команда: `gsutil cors set cors.json gs://checklistcoffeeshop.firebasestorage.app`

### 6.5. Конфигурация Firebase для Web
Данные проекта, извлеченные из [google-services.json](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/composeApp/google-services.json) и [GoogleService-Info.plist](file:///Users/erasylassyltaevicloud.com/Desktop/kmp_coffeeshop_checklist/iosApp/iosApp/GoogleService-Info.plist):
```typescript
export const firebaseConfig = {
  apiKey: "AIzaSyC72h_Cs8_ivnI73XErAG5vMQHcWBggOts",
  authDomain: "checklistcoffeeshop.firebaseapp.com",
  projectId: "checklistcoffeeshop",
  storageBucket: "checklistcoffeeshop.firebasestorage.app",
  messagingSenderId: "785653380290",
  appId: "1:785653380290:web:coffeeshop_web"
};
```
