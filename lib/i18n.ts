/**
 * ContentOS — Russian string catalog.
 * Source of truth: /tools/content-os/THE CONTENT-2 prototype JSX files.
 * Default and only language is `ru`. Use these constants instead of inlining
 * Russian literals in JSX so the catalog stays auditable.
 */

export const t = {
  // ----- Brand -----
  brandName: "THE DRAFT",

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
    // Stronger framing for first-time preview visitors landing from the
    // marketing site / /try. Variant C — productivity-led headline. Body
    // copy is short on purpose; the canvas itself is the proof.
    previewH1Line1: "Контент-конвейер",
    previewH1Line2: "для серьёзных авторов.",
    previewSub:
      "Источник → тезисы → формат → публикация. На одной канве. Без перебежек между ChatGPT, Notion и Telegram.",
    previewBadge: "Превью без регистрации · 1 канвас бесплатно",
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
      llm: {
        label: "LLM-ассистент",
        desc: "Чат с Opus 4.8 по подключённым нодам",
      },
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
    fetchUrl: "Загрузить",
    refetchUrl: "Перезагрузить с новой ссылки",
    progress: {
      captions: "Ищу субтитры...",
      audio: "Скачиваю аудио...",
      transcribing: "Транскрибирую...",
      whisper: (pct: number) => `Whisper транскрибирует... ${pct}%`,
      fetchingUrl: "Загружаю статью...",
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
    runButtonByPlatform: {
      telegram: "Написать пост",
      linkedin: "Написать пост",
      twitter: "Написать твит",
      instagram: "Написать пост",
      carousel: "Собрать карусель",
      reels: "Написать сценарий",
      hooks: "Сгенерить хуки",
      article: "Написать статью",
      review: "Написать рецензию",
      vc: "Написать на vc.ru",
    } as Record<string, string>,
    runningStatusByPlatform: {
      review: "Разбираю материал...",
      vc: "Пишу материал для vc...",
      telegram: "Пишу пост...",
      linkedin: "Пишу пост...",
      twitter: "Пишу твит...",
      instagram: "Пишу пост...",
      carousel: "Собираю карусель...",
      reels: "Пишу сценарий...",
      hooks: "Генерю хуки...",
      article: "Пишу статью...",
    } as Record<string, string>,
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
      editText: "Редактура",
      platform: "Под платформу",
    },
    copySuccess: "Скопировано в буфер",
    copyError: "Не удалось скопировать",
    visualDirection: "КАДР / VISUAL DIRECTION",
    twitterThread: "ТРЕД",
    twitterSingle: "СОЛО",
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
      sub: "Модель, на которой работают все ноды. Выбор модели на уровне аккаунта появится позже — сейчас она задаётся на сервере.",
      soonNote:
        "Переключение моделей и свой API-ключ — в разработке. Сейчас все ноды работают на модели ниже.",
      providers: [
        {
          id: "opus48",
          name: "Claude Opus 4.8",
          sub: "Anthropic · и креатив, и структурный JSON",
          badge: "АКТИВНА",
        },
        {
          id: "grok43",
          name: "Grok 4.3",
          sub: "xAI · рубленый стиль для коротких форматов",
          badge: "СКОРО",
        },
        {
          id: "gpt54",
          name: "GPT-5.4",
          sub: "OpenAI · длинные структурированные форматы",
          badge: "СКОРО",
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
  ideas: {
    // Экран называется «Идеи», как в прототипе: это банк тезисов и заметок.
    // Раньше под этим именем жил отдельный разбор мысли, а банк — под
    // «Базой знаний»; типы записей (тезис, ссылка, аудитория, голос, тема)
    // с самого начала были идеями, а не справочником фактов.
    title: "Идеи",
    sub: "Тезисы из твоих материалов плюс заметки про аудиторию, темы и правила голоса — общая память AI на всех канвасах.",
    brainDump: "Разобрать мысль",
  },
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
      manifesto: "манифест",
    },
    pillarLabel: "Столб",
    pillarNone: "Не указан",
    pillarFilterAll: "Все",
    bulkSelected: (n: number) => `${n} выбрано`,
    bulkDelete: "Удалить",
    bulkMove: "Перенести в проект",
    bulkClear: "Снять выделение",
    bulkDeleteConfirmTitle: "Удалить выбранные?",
    bulkDeleteConfirmDesc: (n: number) =>
      `${n} ${plural(n, "элемент", "элемента", "элементов")} будут удалены. Действие необратимо.`,
    bulkDeleted: (n: number) => `Удалено ${n}`,
    bulkMoved: (n: number) => `Перенесено ${n}`,
    bulkFailed: "Не удалось выполнить",
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
    noTargetsTitle: "Ни одной площадки не подключено.",
    noTargetsSub: "Подключи аккаунт в разделе",
    settingsLink: "Подключения",
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

  // ----- Content plan -----
  plan: {
    nav: "Контент-план",
    title: "Контент-план",
    addBtn: "Добавить",
    today: "Сегодня",
    showAll: "Показать все",
    showOnlyUsed: "Скрыть пустые",
    views: {
      week: "Неделя",
      month: "Месяц",
      list: "Список",
      analytics: "Аналитика",
    },
    stub: "В разработке. Скоро будет.",
    empty: {
      title: "Здесь будет твой контент-план",
      desc: "Создай пост в канвасе → нажми «Запланировать» → он появится здесь.",
      openCanvas: "Открыть канвас",
      addManual: "Добавить вручную",
    },
    queue: {
      title: "ОЧЕРЕДЬ",
      addManual: "+ Добавить вручную",
      empty: "В очереди пока пусто.",
      noDate: "нет даты",
      draft: "черновик",
    },
    insights: {
      thisWeek: "ЭТА НЕДЕЛЯ",
      nextWeek: "СЛЕДУЮЩАЯ НЕДЕЛЯ",
      mix: "КОНТЕНТ-МИКС",
      mix30days: "(последние 30 дней)",
      platforms: "ПЛАТФОРМЫ",
      streak: "STREAK",
      streakDays: (n: number) => `${n} ${plural(n, "день", "дня", "дней")}`,
      streakRecord: "Рекорд",
      topPosts: "ЛУЧШИЕ ПОСТЫ",
      topPostsSub: "(по метрикам)",
      gapAlert: "Заполнить",
      gapEmpty: "Нет контента",
      mixHint: (pillar: string) => `↑ Мало ${pillar}`,
      nextWeekWarning: (n: number) =>
        `⚠ ${n} ${plural(n, "пост", "поста", "постов")}`,
      postsCount: (n: number) => `${n} ${plural(n, "пост", "поста", "постов")}`,
      platformsCount: (n: number) =>
        `${n} ${plural(n, "платформа", "платформы", "платформ")}`,
      views: (n: number) => `↗ ${formatThousands(n)} просм.`,
      saves: (n: number) => `↗ ${formatThousands(n)} сохр.`,
      noTopPosts: "Пока нет опубликованных.",
      noStreak: "—",
    },
    statuses: {
      draft: "Черновик",
      ready: "Готов",
      scheduled: "В плане",
      published: "Опубликован",
      skipped: "Пропущен",
    },
    pillars: {
      R1: "Как строить продукт",
      R2: "Психология фаундера",
      R3: "Путь к $1M MRR",
      R4: "Венчурные сделки",
    },
    pillarsShort: {
      R1: "R1",
      R2: "R2",
      R3: "R3",
      R4: "R4",
    },
    schedule: {
      title: "Запланировать пост",
      dateLabel: "Дата:",
      timeLabel: "Время:",
      pillarLabel: "Столб:",
      pillarNone: "Не указан",
      submit: "Поставить в план",
      cancel: "Отмена",
      scheduled: (date: string) => `Запланировано на ${date}`,
      failed: "Не удалось запланировать",
      inPlanBadge: (date: string) => `В плане · ${date}`,
    },
    drawer: {
      fromCanvas: "ИЗ КАНВАСА",
      hook: "ХУК",
      body: "ТЕЛО",
      cta: "CTA",
      pillar: "СТОЛБ",
      tags: "ТЕГИ",
      tagsPlaceholder: "tag1, tag2, …",
      notes: "ЗАМЕТКИ",
      notesPlaceholder: "Заметки…",
      metrics: "МЕТРИКИ",
      metricsViews: "Просмотры",
      metricsSaves: "Сохранения",
      metricsReposts: "Репосты",
      metricsComments: "Комментарии",
      metricsClicks: "Клики",
      saveMetrics: "Сохранить метрики",
      metricsSaved: "Метрики сохранены",
      markPublished: "Отметить опубликованным",
      skip: "Пропустить",
      delete: "Удалить",
      deleteConfirmTitle: "Удалить пост?",
      deleteConfirmDesc:
        "Запланированный пост будет удалён. Канвас и тезис останутся.",
      openCanvas: "Открыть канвас",
    },
    quickAdd: {
      title: "Быстро добавить пост",
      platformLabel: "ПЛАТФОРМА",
      hookLabel: "ХУК / ИДЕЯ",
      hookPlaceholder: "Напиши первую строку…",
      pillarLabel: "СТОЛБ",
      statusLabel: "СТАТУС",
      statusReady: "Готов",
      statusDraft: "Черновик",
      add: "Добавить",
      openInAi: "Открыть в AI →",
      created: "Пост создан",
      failed: "Не удалось создать пост",
    },
    toasts: {
      scheduled: "Запланировано",
      published: "Опубликовано",
      skipped: "Пропущено",
      deleted: "Удалено",
      saveFailed: "Не удалось сохранить",
      scheduleFailed: "Не удалось запланировать",
    },
    whatToWrite: {
      title: "Что писать сегодня?",
      open: "Открыть",
      empty: "Пока нет рекомендаций",
      types: {
        dormant_gem: "Забытый тезис",
        pillar_balance: "Балансировка столбов",
        top_score: "Топ из базы",
      },
    },
  },

  // ----- Global search -----
  search: {
    placeholder: "Поиск...",
    triggerHint: "Cmd K",
    dialogTitle: "Поиск",
    dialogPlaceholder: "Поиск по знаниям, канвасам и постам...",
    empty: "Ничего не найдено",
    typeHint: "Начни вводить запрос",
    groups: {
      knowledge: "База знаний",
      canvas: "Канвасы",
      planned_post: "Запланированные посты",
    } as Record<string, string>,
    showMore: (n: number) => `Показать ещё ${n}`,
    failed: "Не удалось найти",
  },

  // ----- Plan view: drag adapt warning -----
  dragAdapt: {
    title: (src: string, target: string) =>
      `Текст написан для ${src}. Адаптировать под ${target}?`,
    sub: "Если оставить — пост сохранит платформу и переедет в её строку.",
    adapt: "Адаптировать",
    keep: "Оставить как есть",
    cancel: "Отмена",
    note: "AI пока не переписывает автоматически — текст останется как есть.",
  },

  // ----- Plan: monthly -----
  monthly: {
    today: "Сегодня",
  },

  // ----- Plan: list -----
  list: {
    cols: {
      num: "#",
      date: "Дата",
      hook: "Хук",
      platform: "Платформа",
      pillar: "Столб",
      status: "Статус",
      actions: "Действия",
    },
    filters: {
      platform: "Платформа",
      status: "Статус",
      pillar: "Столб",
      from: "От",
      to: "До",
      search: "Поиск",
      reset: "Сбросить",
    },
    empty: "Постов не найдено",
  },

  // ----- Plan: analytics -----
  analytics: {
    monthLabel: "Месяц",
    platformLabel: "Платформы",
    cards: {
      frequency: "ЧАСТОТА",
      mix: "КОНТЕНТ-МИКС",
      platforms: "ПЛАТФОРМЫ",
      topPosts: "ЛУЧШИЕ ПОСТЫ",
      streak: "PUBLISHING STREAK",
    },
    totalPublished: "Всего опубликовано",
    thisMonth: "В этом месяце",
    streakCurrent: (n: number) =>
      `${n} ${plural(n, "день", "дня", "дней")} подряд`,
    streakRecord: (n: number) =>
      `Рекорд: ${n} ${plural(n, "день", "дня", "дней")}`,
    last14days: "Последние 14 дней",
    underrepresented: (pillar: string) => `↑ Мало ${pillar}`,
  },

  // ----- Settings: browser extension stub -----
  extension: {
    title: "Browser extension",
    desc: "Вырезать в THE DRAFT со страницы — скоро будет.",
    soon: "Скоро",
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

/** Format a number compactly — 1234 → "1.2K", 12345 → "12K". */
export function formatThousands(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  if (abs < 1000) return String(Math.round(value));
  if (abs < 10_000) return `${(value / 1000).toFixed(1).replace(".0", "")}K`;
  if (abs < 1_000_000) return `${Math.round(value / 1000)}K`;
  return `${(value / 1_000_000).toFixed(1).replace(".0", "")}M`;
}

/** Format a duration in seconds — `1ч 23м` / `45 мин`. */
export function formatDurationRu(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h) return `${h}ч ${m}м`;
  return `${m} мин`;
}
