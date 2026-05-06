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
