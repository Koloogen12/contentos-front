// Mirrors the backend contract in tools/content-os-backend/CONTRACTS.md.

export type UUID = string;

export interface User {
  id: UUID;
  organization_id: UUID;
  email: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  created_at: string;
}

export interface MeResponse {
  user: User;
  organization: Organization;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

export interface CanvasOut {
  id: UUID;
  organization_id: UUID;
  project_id: UUID | null;
  name: string;
  description: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export type NodeType = "source" | "extract" | "format";
export type NodeStatus = "idle" | "running" | "done" | "error";

export interface NodeOut {
  id: UUID;
  canvas_id: UUID;
  type: NodeType;
  position_x: number;
  position_y: number;
  data: Record<string, unknown>;
  status: NodeStatus;
  created_at: string;
  updated_at: string;
}

export interface EdgeOut {
  id: UUID;
  canvas_id: UUID;
  source_node_id: UUID;
  target_node_id: UUID;
  created_at: string;
}

export interface CanvasDetail extends CanvasOut {
  nodes: NodeOut[];
  edges: EdgeOut[];
}

// ----- Node data shapes (per CONTRACTS.md §0/3) -----

export type SourceInputType = "text" | "url" | "youtube" | "file_upload";

export interface SourceNodeData {
  input_type?: SourceInputType;
  content?: string;
  url?: string | null;
  youtube_url?: string | null;
  youtube_video_id?: string | null;
  youtube_title?: string | null;
  youtube_duration_seconds?: number | null;
  file_name?: string | null;
  file_size_bytes?: number | null;
  file_type?: string | null;
  transcript_method?: "youtube_captions" | "whisper" | null;
  transcript_language?: string | null;
  platform?: string | null;
  author?: string | null;
  notes?: string | null;
}

export interface TalkingPointScoreBreakdown {
  audience_fit: number;
  engagement_trigger: number;
  uniqueness: number;
  author_fit: number;
}

export interface TalkingPoint {
  text: string;
  score_breakdown: TalkingPointScoreBreakdown;
  viral_score: number;
  category: string;
  reasoning: string;
}

export interface ExtractNodeData {
  talking_points?: TalkingPoint[];
  selected_index?: number | null;
}

export type FormatPlatform =
  | "telegram"
  | "linkedin"
  | "carousel"
  | "reels"
  | "hooks"
  | "article";

export interface CarouselSlide {
  title: string;
  body: string;
  is_cover?: boolean;
}

export interface ReelsBeat {
  script: string;
  visual: string;
  duration_sec: number;
}

export type HookTrigger =
  | "paradox"
  | "number"
  | "contrast"
  | "provocation"
  | "story"
  | "dissonance"
  | "question"
  | "other";

export interface HookEntry {
  text: string;
  trigger: HookTrigger;
}

export interface ArticleSection {
  heading: string;
  body: string;
}

export interface FormatNodeData {
  platform?: FormatPlatform;
  talking_point_text?: string;
  /**
   * Per-format-node selection of which upstream extract talking-point this
   * format generates from. Set client-side; backend ignores it (extra JSON
   * keys are accepted). The frontend uses it as the source of truth and
   * patches the parent extract's `selected_index` to match before each run
   * — the worker still reads the parent's `selected_index` to assemble
   * skill input. See `FormatNode.tsx` and `CanvasEditor.tsx#runAll`.
   */
  source_talking_point_index?: number;
  hooks?: string[];
  selected_hook_index?: number;
  body?: string;
  cta?: string;
  full_text?: string;
  // Carousel-specific
  slides?: CarouselSlide[];
  summary?: string;
  // Reels-specific
  beats?: ReelsBeat[];
  caption?: string;
  duration_sec?: number;
  // Hooks-specific
  hooks_bank?: HookEntry[];
  // Article-specific
  title?: string;
  slug?: string;
  hook?: string;
  intro?: string;
  sections?: ArticleSection[];
  conclusion?: string;
  meta_description?: string;
  word_count?: number;
}

// ----- Skill runs -----

export type SkillRunStatus = "pending" | "running" | "completed" | "failed";

export interface SkillRunOut {
  id: UUID;
  node_id: UUID;
  skill: string;
  status: SkillRunStatus;
  error: string | null;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface SkillRunStartResponse {
  skill_run_id: UUID;
  status: SkillRunStatus;
}

// ----- Knowledge -----

export type KnowledgeType =
  | "tezis"
  | "reference"
  | "audience"
  | "voice_rule"
  | "content_theme";

export interface KnowledgeItemOut {
  id: UUID;
  project_id: UUID | null;
  type: KnowledgeType;
  title: string;
  body: string;
  tags: string[];
  viral_score: number | null;
  source_file: string | null;
  is_dormant: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

// ----- Brand context -----

export interface BrandContextData {
  author_name?: string;
  author_handle?: string;
  author_bio?: string;
  active_products?: string;
  voice_rules?: string;
  taboo_list?: string;
  manifesto?: string;
  cta_keywords?: string[];
  // Set by `POST /voice-samples/extract-traits` (Iter B).
  voice_traits?: string[];
  voice_avoid?: string[];
  recurring_phrases?: string[];
  tone_calibration?: string;
  voice_extracted_at?: string;
  [key: string]: unknown;
}

export interface BrandContextOut {
  id: UUID;
  data: BrandContextData;
  version: number;
  created_at: string;
  updated_at: string;
}

// ----- Transcription -----

export interface YoutubeMeta {
  title: string | null;
  duration_seconds: number | null;
  channel: string | null;
  video_id: string | null;
}

/**
 * Mirrors `SkillRunStartResponse` shape (the backend reuses it for transcription
 * and publishing async kickoffs). Aliased here so call sites read clearly.
 */
export interface SkillRunStarted {
  skill_run_id: UUID;
  status: SkillRunStatus;
}

// ----- Telegram targets / publishing -----

export interface TelegramTargetOut {
  id: UUID;
  title: string;
  chat_id: string;
  /** Whether a custom bot token is configured for this target. */
  has_bot_token?: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TelegramTargetCreate {
  title: string;
  chat_id: string;
  bot_token?: string | null;
  is_default?: boolean;
}

export interface TelegramTargetUpdate {
  title?: string;
  chat_id?: string;
  bot_token?: string | null;
  is_default?: boolean;
}

export type PublishStatus = "pending" | "sending" | "sent" | "failed";

export interface PublishLogOut {
  id: UUID;
  node_id: UUID;
  target_id: UUID;
  status: PublishStatus;
  error: string | null;
  message_id: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface PublishStarted {
  publish_log_id: UUID;
  status: PublishStatus;
}

// ----- Voice training -----

export interface VoiceSampleOut {
  id: UUID;
  organization_id: UUID;
  project_id: UUID | null;
  platform: string | null;
  text: string;
  meta: Record<string, unknown>;
  has_embedding: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoiceSampleCreate {
  text: string;
  platform?: string | null;
  project_id?: string | null;
  meta?: Record<string, unknown>;
}

export interface VoiceSampleBulkResult {
  created: number;
  skipped: number;
  items: VoiceSampleOut[];
}

export interface VoiceTraitsExtracted {
  voice_traits: string[];
  voice_avoid: string[];
  recurring_phrases: string[];
  tone_calibration: string;
  samples_analyzed: number;
}

// ----- Projects -----

export interface ProjectContext {
  product_description?: string;
  target_audience?: string;
  key_themes?: string[] | string;
  tone_notes?: string;
  [key: string]: unknown;
}

export interface ProjectOut {
  id: UUID;
  organization_id: UUID;
  name: string;
  color: string;
  context: ProjectContext;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  color?: string;
  context?: ProjectContext;
}

export interface ProjectUpdate {
  name?: string;
  color?: string;
  context?: ProjectContext;
}

// ----- Iter D bulk run-all -----

/**
 * Each entry in the run-all response carries the node_id alongside the
 * standard SkillRunStarted shape so the caller can wire each run up to its
 * node's status / refetch lifecycle.
 *
 * If the backend doesn't include `node_id`, we resolve it lazily via
 * `GET /skill-runs/{id}`.
 */
export interface BulkRunSkillRunStarted extends SkillRunStarted {
  node_id?: UUID;
}

export interface BulkRunStarted {
  skill_runs: BulkRunSkillRunStarted[];
  skipped: number;
}

// ----- Sharing & cross-org cloning (CONTRACTS.md §7.2) -----

export interface CanvasShareTokenOut {
  id: UUID;
  canvas_id: UUID;
  token: string;
  created_by_user_id: UUID;
  created_at: string;
  revoked_at: string | null;
}

export interface CanvasShareTokenCreated {
  id: UUID;
  token: string;
  url_path: string;
}

export interface PublicCanvasOut {
  id: UUID;
  name: string;
  description: string | null;
  organization_name: string;
  nodes: NodeOut[];
  edges: EdgeOut[];
  created_at: string;
}

// ----- Content Plan -----

export type PostPlatform =
  | "telegram"
  | "instagram"
  | "linkedin"
  | "twitter"
  | "article"
  | "carousel"
  | "reels"
  | "hooks";

export type PostStatus =
  | "draft"
  | "ready"
  | "scheduled"
  | "published"
  | "skipped";

export type ContentPillar = "R1" | "R2" | "R3" | "R4";

export interface PlannedPostOut {
  id: UUID;
  organization_id: UUID;
  canvas_id: UUID | null;
  node_id: UUID | null;
  project_id: UUID | null;
  platform: PostPlatform;
  hook: string;
  body: string;
  cta: string;
  full_text: string;
  talking_point_text: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: PostStatus;
  pillar: ContentPillar | null;
  tags: string[];
  notes: string | null;
  published_at: string | null;
  metrics: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PlannedPostCreate {
  platform: PostPlatform;
  hook?: string;
  body?: string;
  cta?: string;
  full_text?: string;
  talking_point_text?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  status?: PostStatus;
  pillar?: ContentPillar | null;
  tags?: string[];
  notes?: string | null;
  canvas_id?: string | null;
  node_id?: string | null;
  project_id?: string | null;
}

export interface PlannedPostUpdate {
  platform?: PostPlatform;
  hook?: string;
  body?: string;
  cta?: string;
  full_text?: string;
  talking_point_text?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  status?: PostStatus;
  pillar?: ContentPillar | null;
  tags?: string[];
  notes?: string | null;
  metrics?: Record<string, unknown>;
}

export interface WeekDay {
  date: string;
  day_name: string;
  posts: PlannedPostOut[];
  is_empty: boolean;
}

export interface WeekStats {
  total_scheduled: number;
  total_ready: number;
  empty_days: number;
  platforms: Record<string, number>;
  pillars: Record<string, number>;
}

export interface WeekResponse {
  week_start: string;
  week_end: string;
  days: WeekDay[];
  stats: WeekStats;
}

export interface TopPost {
  id: UUID;
  platform: PostPlatform;
  hook: string;
  full_text: string;
  pillar: ContentPillar | null;
  published_at: string | null;
  metrics: Record<string, unknown>;
}

export interface StatsResponse {
  publishing_streak: number;
  total_published: number;
  this_week_published: number;
  this_month_published: number;
  content_mix: Record<string, number>;
  platform_mix: Record<string, number>;
  top_posts: TopPost[];
}

export type WhatToWriteRecommendationType =
  | "dormant_gem"
  | "pillar_balance"
  | "top_score";

export interface WhatToWriteRecommendation {
  type: WhatToWriteRecommendationType;
  title: string;
  knowledge_item_id: string | null;
  knowledge_item_title: string | null;
  knowledge_item_body: string | null;
  pillar: ContentPillar | null;
  viral_score: number | null;
}

export interface WhatToWriteResponse {
  date: string;
  priority_pillar: ContentPillar;
  pillar_reason: string;
  recommendations: WhatToWriteRecommendation[];
}

export interface ScheduleFromNodeRequest {
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  pillar?: ContentPillar | null;
  tags?: string[];
}
