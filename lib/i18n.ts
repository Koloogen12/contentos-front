/**
 * ContentOS — Russian string catalog.
 * Source of truth: /tools/content-os/THE CONTENT-2 prototype JSX files.
 * Default and only language is `ru`. Use these constants instead of inlining
 * Russian literals in JSX so the catalog stays auditable.
 */

export const t = {
  // ----- Brand -----
  brandName: "THE CONTENT",

  // ----- Auth -----
  auth: {
    signIn: "Войти",
    signUp: "Регистрация",
    email: "Email",
    password: "Пароль",
    displayName: "Имя",
    organizationName: "Организация",
    signInLink: "Войти",
    signUpLink: "Создать аккаунт",
    signOut: "Выйти",
  },

  // ----- App shell -----
  shell: {
    home: "Главная",
    knowledge: "База знаний",
    settings: "Настройки",
    projects: "Проекты",
    all: "Все",
    soon: "Скоро",
    newProject: "Новый проект",
  },

  // ----- Dashboard -----
  dash: {
    h1Line1: "Контент-пайплайн на одной доске.",
    h1Line2: "Источник → тезисы → готовый пост.",
    sub: "Бесконечный канвас, AI-скиллы, твой голос. Без копирования между Telegram, Claude и заметками.",
    searchPlaceholder: "Поиск канвасов...",
    newCanvas: "Новый канвас",
    tour: "Тур",
    sectionRecent: "НЕДАВНИЕ",
    sectionTemplates: "ШАБЛОНЫ",
    cardCreateTitle: "Новый канвас",
    cardCreateSub: "Пустая доска",
    nodes: (n: number) => `${n} ${plural(n, "нода", "ноды", "нод")}`,
    nodesAndTime: (n: number, time: string) =>
      `${n} ${plural(n, "нода", "ноды", "нод")} · ${time}`,
    emptyTitle: "Пока нет канвасов",
    emptyDesc: "Создай первый или начни с шаблона.",
    useTemplate: "Использовать шаблон",
    couldNotLoad: "Не удалось загрузить канвасы",
    retry: "Повторить",
  },

  // ----- Canvas top bar -----
  canvas: {
    backToDashboard: "К канвасам",
    versions: "Версии",
    template: "Шаблон",
    share: "Поделиться",
    settings: "Настройки",
    runAll: "Запустить всё",
    pipelineRunning: "Выполняется...",
    pipelineStarted: "Запускаю пайплайн...",
    skillStarted: "Скилл запущен",
    skillCompleted: "Готово",
    transcriptionDone: "Транскрипция готова",
    couldNotStartRun: "Не удалось запустить скилл",
    couldNotSaveTitle: "Не удалось переименовать",
  },

  // ----- Toolbar -----
  toolbar: {
    select: "Выбор",
    pan: "Pan",
    note: "Заметка",
    comment: "Комментарий",
    text: "Текст",
    arrow: "Стрелка",
    addNode: "Добавить ноду",
    fitToScreen: "По размеру",
    zoomIn: "Приблизить",
    zoomOut: "Отдалить",
  },

  // ----- Node picker -----
  picker: {
    searchPlaceholder: "Поиск нод...",
    nothing: "Ничего не найдено",
    category: "Ноды",
    items: {
      sourceText: { label: "Источник: текст", desc: "Вставить текст вручную" },
      sourceUrl: { label: "Источник: URL", desc: "Ссылка на статью / пост" },
      sourceYoutube: {
        label: "Источник: YouTube",
        desc: "Транскрипция видео",
      },
      sourceFile: {
        label: "Источник: файл",
        desc: "Аудио или видео файл",
      },
      extract: {
        label: "Извлечение идей",
        desc: "AI вытащит тезисы со скором",
      },
      format: { label: "Контент", desc: "Готовый пост для платформы" },
    },
  },

  // ----- Source node -----
  source: {
    label: "Источник",
    tabs: {
      text: "Текст",
      url: "URL",
      youtube: "YouTube",
      file: "Файл",
    },
    placeholders: {
      text: "Вставь текст поста или статьи...",
      url: "https://...",
      youtube: "youtube.com/watch?v=...",
      handle: "@kochnefff",
    },
    transcribe: "Транскрибировать",
    progress: {
      captions: "Ищу субтитры...",
      audio: "Скачиваю аудио...",
      transcribing: "Транскрибирую...",
      whisper: (pct: number) => `Whisper транскрибирует... ${pct}%`,
    },
    captionsBadge: "субтитры YouTube",
    whisperBadge: "Whisper AI",
    dropzone: {
      title: "Перетащи файл или нажми",
      hint: "mp3 · mp4 · m4a · wav · ogg · webm",
    },
    platformLabel: "Платформа",
    authorLabel: "Автор",
    platformOptions: [
      { value: "", label: "—" },
      { value: "telegram", label: "Telegram" },
      { value: "instagram", label: "Instagram" },
      { value: "linkedin", label: "LinkedIn" },
      { value: "twitter", label: "X / Twitter" },
      { value: "web", label: "Web / статья" },
      { value: "manual", label: "Своя идея" },
    ] as ReadonlyArray<{ value: string; label: string }>,
  },

  // ----- Extract node -----
  extract: {
    label: "Извлечение идей",
    placeholderConnect: "Подключи источник",
    runButton: "Извлечь идеи",
    runningStatus: "Анализирую тезисы...",
    foundCount: (n: number) => `Найдено ${n} ${plural(n, "тезис", "тезиса", "тезисов")}`,
    used: "Используется →",
    error: "Ошибка AI. Попробуй ещё раз",
    actions: {
      reextract: "Переизвлечь",
      amplify: "Усилить",
      rephrase: "Перефразировать",
    },
  },

  // ----- Format node -----
  format: {
    label: "Контент",
    placeholderConnect: "Подключи тезис или источник",
    runButton: "Написать пост",
    runningStatus: (platform: string) => `Пишу ${platform}-пост...`,
    error: "Ошибка AI. Попробуй ещё раз",
    hookHeader: "Хук — выбери один",
    bodyLabel: "Тело поста",
    ctaLabel: "CTA",
    actions: {
      regenerate: "Перегенерировать",
      copy: "Скопировать",
      copied: "Скопировано",
      rehook: "Другой хук",
      shorten: "Сократить",
      amplifyVoice: "Усилить голос",
      platform: "Под платформу",
    },
    copySuccess: "Скопировано в буфер",
    copyError: "Не удалось скопировать",
  },

  // ----- Versions dialog -----
  versions: {
    title: "История версий",
    sub: "Каждое значимое изменение — точка во времени. Откатиться можно одним кликом.",
    createSnapshot: "Создать снимок",
    snapshotLabel: "Название (необязательно)",
    snapshotPlaceholder: "Например: «Перед рерайтом хука»",
    save: "Сохранить",
    cancel: "Отмена",
    untitled: "Без названия",
    auto: "авто",
    restore: "Восстановить",
    delete: "Удалить",
    confirmRestore:
      "Восстановить эту версию? Текущее состояние будет автоматически сохранено как снимок.",
    confirmDelete: "Удалить этот снимок? Действие необратимо.",
    confirmDeleteTitle: "Удалить снимок?",
    confirmRestoreTitle: "Восстановить?",
    restored: "Восстановлено",
    saved: "Снимок сохранён",
    deleted: "Удалено",
    empty:
      "У этого канваса ещё нет снимков. Сохрани первый, чтобы вернуться к нему позже.",
    couldNotLoad: "Не удалось загрузить версии",
  },

  // ----- Settings -----
  settings: {
    title: "Настройки",
    back: "Назад",
    sections: {
      profile: "Профиль",
      voice: "Мой голос",
      ai: "AI-провайдер",
      billing: "Подписка",
      appearance: "Внешний вид",
      shortcuts: "Горячие клавиши",
    },
    profile: {
      sub: "Информация, которую видят соавторы и подписчики.",
      replaceAvatar: "Заменить аватар",
      fields: {
        name: "Имя",
        email: "Email",
        handle: "Tg-handle",
        bio: "Bio",
      },
    },
    voice: {
      sub: "Тон, стиль и принципы письма. Используется во всех Format-нодах для адаптации текста под ваш голос.",
      trained: "Голос обучен",
      retrain: "Дообучить",
      sectionGood: "Что характерно",
      sectionAvoid: "Что избегать",
      sectionSamples: "Образцы текста (samples)",
      addSample: "Добавить",
      addTrait: "Добавить",
    },
    ai: {
      sub: "Какая модель используется для всех нод по умолчанию. Можно переопределить на уровне отдельной ноды.",
      apiKeyHeader: "API-ключ",
      apiKeyHint:
        "Ключ хранится зашифрованно и используется только для запросов с вашего аккаунта.",
      providers: [
        {
          id: "claude",
          name: "Claude Sonnet 4.5",
          sub: "Anthropic · рекомендовано для длинных текстов",
          badge: "ПО УМОЛЧАНИЮ",
        },
        {
          id: "gpt5",
          name: "GPT-5",
          sub: "OpenAI · быстрая генерация коротких форматов",
        },
        {
          id: "gemini",
          name: "Gemini 2.5 Pro",
          sub: "Google · мультимодальный, видео/аудио",
        },
      ] as ReadonlyArray<{
        id: string;
        name: string;
        sub: string;
        badge?: string;
      }>,
    },
    billing: {
      sub: "Тариф, использование и история платежей.",
      pro: "PRO",
      perMonth: "/ мес",
      monthlyUsage: "Использование в этом месяце",
    },
    appearance: {
      sub: "Тема, плотность и стиль карточек на канвасе.",
      stub: "Скоро здесь будут настройки темы и плотности.",
    },
    shortcuts: {
      sub: "Полный список на канвасе доступен по кнопке «?» внизу справа.",
      groups: [
        {
          title: "Канвас",
          rows: [
            ["Pan", "Space + drag · средняя кнопка мыши"],
            ["Zoom", "Cmd / Ctrl + scroll"],
            ["Run pipeline", "Cmd / Ctrl + R"],
          ],
        },
        {
          title: "Ноды",
          rows: [
            ["Создать", "Double-click · Cmd + N"],
            ["Удалить", "Backspace · Delete"],
            ["Скопировать", "Cmd / Ctrl + C"],
            ["Вставить", "Cmd / Ctrl + V"],
          ],
        },
        {
          title: "История",
          rows: [
            ["Версии канваса", "Cmd / Ctrl + H"],
          ],
        },
      ] as ReadonlyArray<{ title: string; rows: ReadonlyArray<readonly [string, string]> }>,
    },
  },

  // ----- Share -----
  share: {
    title: "Поделиться канвасом",
    sub: "Любой со ссылкой может смотреть канвас и клонировать в свой воркспейс.",
    publicLinks: "Публичные ссылки",
    createLink: "Создать новую публичную ссылку",
    copy: "Скопировать",
    copied: "Скопировано",
    revoke: "Отозвать",
    revokeConfirm: "Подтвердить",
    revokeCancel: "Отмена",
    showRevoked: (n: number) => `Показать ${n} отозванных`,
    hideRevoked: (n: number) => `Скрыть ${n} отозванных`,
    empty: "Пока нет публичных ссылок.",
  },

  // ----- Common -----
  common: {
    cancel: "Отмена",
    save: "Сохранить",
    delete: "Удалить",
    confirm: "Подтвердить",
    loading: "Загрузка...",
    untitled: "Без названия",
    error: "Ошибка",
    edit: "Редактировать",
    rename: "Переименовать",
    duplicate: "Дублировать",
    new: "Новый",
    close: "Закрыть",
    create: "Создать",
    saving: "Сохраняем…",
    creating: "Создаём…",
    deleting: "Удаляем…",
    actions: "Действия",
  },

  // ----- Create / Rename / Delete canvas dialogs -----
  createCanvas: {
    title: "Новый канвас",
    sub: "Дай канвасу название. Переименовать можно потом.",
    nameLabel: "Название",
    namePlaceholder: "Напр.: Неделя 20 — обзор источников",
    descriptionLabel: "Описание",
    descriptionOptional: "(необязательно)",
    descriptionPlaceholder: "Для чего этот канвас?",
    projectLabel: "Проект",
    projectOptional: "(необязательно)",
    projectNone: "— Без проекта —",
    fromTemplate: "Начать с шаблона",
    submit: "Создать канвас",
    submitting: "Создаём…",
    couldNotCreate: "Не удалось создать канвас. Попробуй ещё раз.",
    nameRequired: "Введи название",
    nameTooLong: "Не больше 255 символов",
  },
  renameCanvas: {
    title: "Переименовать канвас",
    sub: (current: string) => `Дай канвасу более точное название «${current}».`,
    couldNotRename: "Не удалось переименовать.",
  },
  deleteCanvas: {
    title: "Удалить канвас?",
    sub: (name: string) =>
      `«${name}» и все его ноды будут удалены. Действие необратимо.`,
    submit: "Удалить канвас",
    couldNotDelete: "Не удалось удалить канвас.",
  },

  // ----- Public canvas viewer -----
  publicView: {
    title: "Публичная копия (только чтение)",
    publishedBy: (org: string) => `Опубликовано ${org}`,
    cloneCta: "Скопировать в свой workspace",
    loginToClone: "Войди, чтобы скопировать",
    loading: "Загрузка...",
    notFoundTitle: "Ссылка не найдена или отозвана",
    notFoundSub:
      "Эта публичная ссылка больше неактивна. Возможно, владелец её отозвал.",
    backHome: "Вернуться на главную",
    networkErrTitle: "Не удалось загрузить канвас",
    networkErrFallback: "Не удалось загрузить канвас.",
    retry: "Повторить",
    cloneDialogTitle: "Назови копию",
    cloneDialogSub:
      "Создадим копию этого канваса в твоём workspace. Результаты скиллов сохранятся, но статус сбросится.",
    cloneNameLabel: "Название канваса",
    cloneNamePlaceholder: "Моя копия",
    cloneProjectLabel: "Проект",
    cloneProjectsLoading: "Загрузка проектов…",
    cloneProjectsError: "Не удалось загрузить проекты.",
    cloneNoProject: "Без проекта",
    cloneSubmit: "Скопировать канвас",
    cloning: "Копируем…",
    cloneSuccess: "Канвас скопирован в твой workspace",
    cloneError: "Не удалось скопировать канвас",
    copySuffix: "(копия)",
  },

  // ----- Share dialog -----
  shareDialog: {
    title: "Поделиться канвасом",
    sub: "Любой со ссылкой может смотреть канвас и клонировать в свой workspace.",
    publicLinks: "Публичные ссылки",
    create: "Создать новую публичную ссылку",
    creating: "Создаём ссылку…",
    created: "Публичная ссылка создана",
    couldNotCreate: "Не удалось создать ссылку",
    couldNotLoad: "Не удалось загрузить ссылки.",
    empty:
      "Публичных ссылок ещё нет. Любой со ссылкой сможет смотреть канвас и клонировать его себе.",
    copy: "Скопировать",
    copied: "Скопировано",
    copySuccess: "Ссылка скопирована",
    copyError: "Не удалось скопировать",
    revoke: "Отозвать",
    revokeConfirm: "Подтвердить",
    revokeCancel: "Отмена",
    revoked: "Ссылка отозвана",
    couldNotRevoke: "Не удалось отозвать ссылку",
    revokedAt: (when: string) => `Отозвано ${when}`,
    createdAt: (when: string) => `Создано ${when}`,
    showRevoked: (n: number) => `Показать ${n} отозванных`,
    hideRevoked: (n: number) => `Скрыть ${n} отозванных`,
  },

  // ----- Knowledge -----
  knowledge: {
    title: "База знаний",
    sub: "Тезисы, ссылки, заметки про аудиторию и правила голоса — память AI на всех канвасах.",
    new: "Новый элемент",
    searchPlaceholder: "Поиск по названию, тексту, тегам…",
    all: "Все",
    typeFilter: {
      tezis: "тезис",
      reference: "ссылка",
      audience: "аудитория",
      voice_rule: "голос",
      content_theme: "тема",
    },
    couldNotLoadTitle: "Не удалось загрузить базу знаний",
    couldNotLoadDetail: "Не удалось загрузить базу знаний.",
    retry: "Повторить",
    emptyTitle: "Пока пусто",
    emptyMatchTitle: "Ничего не найдено",
    emptyDesc: "Добавь первый тезис, ссылку или правило голоса.",
    emptyMatchDesc: "Попробуй другие слова или сбрось фильтр.",
    score: (n: number) => `Скор ${n}`,
    dormant: "В спячке",
    updated: (when: string) => `Обновлено ${when}`,
    edit: "Редактировать",
    delete: "Удалить",
    createTitle: "Новый элемент",
    editTitle: "Редактировать элемент",
    formSub:
      "Тезисы и ссылки добавляются в промпт AI, когда привязаны к ноде.",
    typeLabel: "Тип",
    titleLabel: "Название",
    titleRequired: "Введи название",
    bodyLabel: "Текст",
    bodyRequired: "Введи текст",
    tagsLabel: "Теги",
    tagsHint: "(через запятую)",
    tagsPlaceholder: "founders, ai, b2b",
    couldNotSave: "Не удалось сохранить.",
    couldNotSaveToast: "Не удалось сохранить",
    saved: "Элемент сохранён",
    created: "Элемент создан",
    deleteTitle: "Удалить элемент?",
    deleteSub: (title: string) =>
      `«${title}» будет удалён везде, где привязан. Действие необратимо.`,
    deleted: "Элемент удалён",
    couldNotDelete: "Не удалось удалить",
    sidebarTitle: "База знаний",
    sidebarSelectedNode: "Выбрана нода",
    sidebarAttached: (n: number) => `Привязано (${n})`,
    sidebarNew: "Новый",
    sidebarNothingAttached:
      "Пока ничего не привязано. Выбери ниже, чтобы добавить контекст.",
    sidebarBrowse: "Библиотека",
    sidebarSearchPlaceholder: "Поиск по названию, тексту, тегам…",
    sidebarNoMatches: "Ничего не найдено.",
    sidebarPickToAttach: "Выбери ноду, чтобы привязать. Ниже — общая библиотека.",
    sidebarNoItems: "Пока пусто. Нажми «Новый», чтобы добавить.",
    sidebarHide: "Скрыть",
    sidebarAttach: "Привязать к ноде",
    sidebarDetach: "Отвязать",
    sidebarAttached1: "Привязано к ноде",
    couldNotAttach: "Не удалось привязать",
    couldNotDetach: "Не удалось отвязать",
    bodyPlaceholder: "Полный текст этого элемента…",
    sidebarCreateSub: "Добавь тезис, ссылку, правило голоса или заметку об аудитории.",
  },

  // ----- Publish dialog -----
  publish: {
    title: "Опубликовать в Telegram",
    sub: "Выбери канал или чат. Бот должен быть админом.",
    couldNotLoad: "Не удалось загрузить адресатов.",
    noTargetsTitle: "Telegram-адресаты не настроены.",
    noTargetsSub: "Добавь в",
    settingsLink: "Настройках",
    sent: "Отправлено",
    failed: "Ошибка",
    sentMessage: (id: number | string) => `Message ID ${id}.`,
    sentDelivered: "Telegram подтвердил доставку.",
    failedFallback: "Telegram отклонил сообщение.",
    starting: "Отправляем…",
    sending: "Отправка…",
    publish: "Опубликовать",
    couldNotStart: "Не удалось начать публикацию",
    default: "По умолчанию",
    close: "Закрыть",
  },

  // ----- Onboarding -----
  onboarding: {
    skip: "Пропустить",
    loading: "Загрузка…",
    couldNotSaveBrand: "Не удалось сохранить контекст бренда",
    couldNotSave: "Не удалось сохранить.",
    couldNotCreateCanvas: "Не удалось создать канвас",
    couldNotLoadTemplates: "Не удалось загрузить шаблоны.",
    couldNotSaveSamples: "Не удалось сохранить образцы",
  },

  // ----- Voice training -----
  voice: {
    couldNotLoad: "Не удалось загрузить образцы голоса.",
    couldNotSaveSamples: "Не удалось сохранить образцы",
    couldNotSaveSample: "Не удалось сохранить образец",
    couldNotDeleteSample: "Не удалось удалить образец",
    ready: "Готов",
    pending: "Не готов",
    couldNotExtractTraits: "Не удалось извлечь черты голоса",
    traitsTitle: "Черты голоса",
    traitsEmpty: "Черт пока нет.",
    phrasesTitle: "Повторяющиеся фразы",
    phrasesEmpty: "Фраз пока не обнаружено.",
  },

  // ----- Telegram targets -----
  telegram: {
    couldNotLoad: "Не удалось загрузить адресатов Telegram.",
    couldNotAdd: "Не удалось добавить адресата",
    couldNotUpdate: "Не удалось обновить адресата",
    couldNotDelete: "Не удалось удалить адресата",
    addTitle: "Добавить Telegram-адресата",
    editTitle: "Редактировать Telegram-адресата",
    addBtn: "Добавить",
    saveBtn: "Сохранить",
    deleteBtn: "Удалить",
  },

  // ----- Projects -----
  projects: {
    couldNotSave: "Не удалось сохранить проект",
    editTitle: "Редактировать проект",
    newTitle: "Новый проект",
    create: "Создать проект",
  },

  // ----- Templates -----
  templates: {
    title: "Шаблоны",
    sub: "Выбери стартовый пайплайн. Потом можно редактировать, сохранять и клонировать.",
    couldNotLoad: "Не удалось загрузить шаблоны.",
    couldNotCreate: "Не удалось создать канвас из шаблона",
    create: "Создать канвас",
  },

  // ----- Auth guard -----
  authGuard: {
    loading: "Загрузка workspace…",
  },

  // ----- Node statuses -----
  nodeStatus: {
    idle: "Ожидание",
    running: "Выполняется",
    done: "Готово",
    error: "Ошибка",
  },

  // ----- Dashboard extras -----
  dashboard: {
    duplicateSuccess: "Канвас продублирован",
    duplicateError: "Не удалось продублировать",
    rename: "Переименовать",
    duplicate: "Дублировать",
    delete: "Удалить",
    actions: "Действия",
    noTemplates: "Шаблонов пока нет",
  },
} as const;

/**
 * Russian plural form picker.
 *  - one — 1, 21, 31...
 *  - few — 2..4, 22..24...
 *  - many — 0, 5..20, 25..30...
 */
function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

/** Format a date as "X мин назад" / "X ч назад" / "X дн назад" / absolute. */
export function formatRelativeRu(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = Date.now() - date.getTime();
  const sec = Math.round(diffMs / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 60) return "сейчас";
  if (min < 60)
    return `${min} ${plural(min, "минуту", "минуты", "минут")} назад`;
  if (hr < 24) return `${hr} ${plural(hr, "час", "часа", "часов")} назад`;
  if (day < 7) return `${day} ${plural(day, "день", "дня", "дней")} назад`;
  return date.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format a duration in seconds — `1ч 23м` / `45 мин`. */
export function formatDurationRu(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h) return `${h}ч ${m}м`;
  return `${m} мин`;
}
