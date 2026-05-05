"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Loader2,
  Mic,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { getBrandContext } from "@/lib/brand-context";
import {
  bulkCreateVoiceSamples,
  createVoiceSample,
  deleteVoiceSample,
  extractTraits,
  listVoiceSamples,
} from "@/lib/voice";
import type {
  BrandContextOut,
  VoiceSampleCreate,
  VoiceSampleOut,
  VoiceTraitsExtracted,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatRelativeDate } from "@/lib/utils";

const SAMPLES_QUERY_KEY = ["voice-samples"] as const;
const BRAND_QUERY_KEY = ["brand-context"] as const;
const MIN_SAMPLE_CHARS = 20;
const MIN_SAMPLES_FOR_EXTRACT = 3;
const DEFAULT_SEPARATOR = "---";

type AddTab = "paste" | "single";

export function VoiceTrainingSection() {
  const samplesQuery = useQuery({
    queryKey: SAMPLES_QUERY_KEY,
    queryFn: listVoiceSamples,
  });
  const brandQuery = useQuery({
    queryKey: BRAND_QUERY_KEY,
    queryFn: getBrandContext,
  });

  return (
    <section className="space-y-6">
      <SectionHeader
        samples={samplesQuery.data ?? null}
        brand={brandQuery.data ?? null}
        loading={samplesQuery.isPending}
      />

      <AddSamplesCard />

      <SamplesListCard
        samples={samplesQuery.data}
        isPending={samplesQuery.isPending}
        isError={samplesQuery.isError}
        errorDetail={
          samplesQuery.error instanceof ApiError
            ? samplesQuery.error.detail
            : "Could not load voice samples."
        }
        onRetry={() => samplesQuery.refetch()}
      />

      <ExtractTraitsCard
        samplesTotal={samplesQuery.data?.length ?? 0}
        brand={brandQuery.data ?? null}
      />
    </section>
  );
}

// -------------------- Header --------------------

function SectionHeader({
  samples,
  brand,
  loading,
}: {
  samples: VoiceSampleOut[] | null;
  brand: BrandContextOut | null;
  loading: boolean;
}) {
  const total = samples?.length ?? 0;
  const embedded = samples?.filter((s) => s.has_embedding).length ?? 0;
  const lastExtractRaw = brand?.data.voice_extracted_at;

  let lastExtract = "never";
  if (lastExtractRaw) {
    const d = new Date(lastExtractRaw);
    if (!Number.isNaN(d.getTime())) {
      lastExtract = formatRelativeDate(d);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Mic className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold tracking-tight">Voice training</h2>
      </div>
      {loading ? (
        <Skeleton className="h-4 w-72" />
      ) : (
        <p className="text-sm text-muted-foreground">
          {total} voice {total === 1 ? "sample" : "samples"} loaded.{" "}
          {embedded} {embedded === 1 ? "has" : "have"} embeddings. Last
          extract: {lastExtract}.
        </p>
      )}
    </div>
  );
}

// -------------------- Add samples --------------------

function AddSamplesCard() {
  const [tab, setTab] = React.useState<AddTab>("paste");

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-medium text-foreground">
            Add samples
          </h3>
          <p className="text-xs text-muted-foreground">
            Paste a batch of your best posts, or add one at a time.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-border bg-background/40 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setTab("paste")}
            className={cn(
              "rounded px-2.5 py-1 font-medium transition-colors",
              tab === "paste"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Paste posts
          </button>
          <button
            type="button"
            onClick={() => setTab("single")}
            className={cn(
              "rounded px-2.5 py-1 font-medium transition-colors",
              tab === "single"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Single post
          </button>
        </div>
      </div>

      {tab === "paste" ? <PasteForm /> : <SingleForm />}
    </div>
  );
}

function PasteForm() {
  const qc = useQueryClient();
  const [text, setText] = React.useState("");
  const [platform, setPlatform] = React.useState("telegram");
  const [separator, setSeparator] = React.useState(DEFAULT_SEPARATOR);

  const mutation = useMutation({
    mutationFn: (samples: VoiceSampleCreate[]) =>
      bulkCreateVoiceSamples(samples),
    onSuccess: (result) => {
      toast.success(
        `Created ${result.created} · Skipped ${result.skipped}`,
      );
      qc.invalidateQueries({ queryKey: SAMPLES_QUERY_KEY });
      setText("");
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not save samples",
      ),
  });

  const splitPreview = React.useMemo(() => {
    return splitPosts(text, separator).filter(
      (t) => t.length >= MIN_SAMPLE_CHARS,
    );
  }, [text, separator]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (splitPreview.length === 0) {
      toast.error(
        `Need at least one post of ${MIN_SAMPLE_CHARS}+ characters.`,
      );
      return;
    }
    const trimmedPlatform = platform.trim();
    const samples: VoiceSampleCreate[] = splitPreview.map((textPiece) => ({
      text: textPiece,
      platform: trimmedPlatform === "" ? null : trimmedPlatform,
    }));
    mutation.mutate(samples);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          <Label htmlFor="paste-text">Posts</Label>
          <Textarea
            id="paste-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder={`Post one\n\n---\n\nPost two\n\n---\n\nPost three`}
            disabled={mutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            {splitPreview.length} valid{" "}
            {splitPreview.length === 1 ? "post" : "posts"} detected. Pieces
            shorter than {MIN_SAMPLE_CHARS} characters are dropped.
          </p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="paste-platform">Default platform</Label>
            <Input
              id="paste-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="telegram"
              disabled={mutation.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paste-separator">Separator</Label>
            <Input
              id="paste-separator"
              value={separator}
              onChange={(e) => setSeparator(e.target.value)}
              placeholder={DEFAULT_SEPARATOR}
              disabled={mutation.isPending}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={
            mutation.isPending || splitPreview.length === 0 || text.trim() === ""
          }
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add {splitPreview.length || ""}{" "}
              {splitPreview.length === 1 ? "sample" : "samples"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function SingleForm() {
  const qc = useQueryClient();
  const [text, setText] = React.useState("");
  const [platform, setPlatform] = React.useState("telegram");

  const mutation = useMutation({
    mutationFn: (input: VoiceSampleCreate) => createVoiceSample(input),
    onSuccess: () => {
      toast.success("Sample added");
      qc.invalidateQueries({ queryKey: SAMPLES_QUERY_KEY });
      setText("");
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not save sample",
      ),
  });

  const trimmed = text.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_SAMPLE_CHARS;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmed.length < MIN_SAMPLE_CHARS) {
      toast.error(`Sample must be at least ${MIN_SAMPLE_CHARS} characters.`);
      return;
    }
    const trimmedPlatform = platform.trim();
    mutation.mutate({
      text: trimmed,
      platform: trimmedPlatform === "" ? null : trimmedPlatform,
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          <Label htmlFor="single-text">Text</Label>
          <Textarea
            id="single-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="One of your favorite posts…"
            disabled={mutation.isPending}
            aria-invalid={tooShort}
          />
          {tooShort && (
            <p className="text-xs text-destructive">
              Need {MIN_SAMPLE_CHARS - trimmed.length} more characters.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="single-platform">Platform</Label>
          <Input
            id="single-platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="telegram"
            disabled={mutation.isPending}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={mutation.isPending || trimmed.length < MIN_SAMPLE_CHARS}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add sample
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// -------------------- Samples list --------------------

function SamplesListCard({
  samples,
  isPending,
  isError,
  errorDetail,
  onRetry,
}: {
  samples: VoiceSampleOut[] | undefined;
  isPending: boolean;
  isError: boolean;
  errorDetail: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-medium text-foreground">Samples</h3>
          <p className="text-xs text-muted-foreground">
            Ordered most recent first. Embeddings populate asynchronously.
          </p>
        </div>
      </div>

      {isPending ? (
        <SamplesSkeleton />
      ) : isError ? (
        <ErrorBlock detail={errorDetail} onRetry={onRetry} />
      ) : samples && samples.length > 0 ? (
        <SamplesTable samples={samples} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
            <Mic className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-medium text-foreground">
            No samples yet
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Paste a few of your best posts above to seed your voice.
          </p>
        </div>
      )}
    </div>
  );
}

function SamplesTable({ samples }: { samples: VoiceSampleOut[] }) {
  const qc = useQueryClient();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVoiceSample(id),
    onMutate: (id) => setPendingId(id),
    onSuccess: () => {
      toast.success("Sample deleted");
      qc.invalidateQueries({ queryKey: SAMPLES_QUERY_KEY });
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not delete sample",
      ),
    onSettled: () => setPendingId(null),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/40">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-card/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Platform</th>
            <th className="px-4 py-2 font-medium">Text</th>
            <th className="px-4 py-2 font-medium">Embedding</th>
            <th className="px-4 py-2 font-medium">Added</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {samples.map((s) => (
            <tr
              key={s.id}
              className="border-t border-border/60 first:border-t-0"
            >
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {s.platform ? (
                  <span className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-foreground">
                    {s.platform}
                  </span>
                ) : (
                  <span className="text-muted-foreground/60">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="block max-w-md truncate text-foreground">
                  {previewText(s.text, 80)}
                </span>
              </td>
              <td className="px-4 py-3">
                <EmbeddingPill ready={s.has_embedding} />
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {formatRelativeDate(s.created_at)}
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Delete sample"
                  disabled={pendingId === s.id}
                  onClick={() => deleteMutation.mutate(s.id)}
                >
                  {pendingId === s.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmbeddingPill({ ready }: { ready: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        ready
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-muted/60 text-muted-foreground",
      )}
      title={ready ? "Embedding ready" : "Embedding pending"}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          ready ? "bg-emerald-400" : "bg-muted-foreground/60",
        )}
      />
      {ready ? "Ready" : "Pending"}
    </span>
  );
}

function SamplesSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
    </div>
  );
}

// -------------------- Extract traits --------------------

function ExtractTraitsCard({
  samplesTotal,
  brand,
}: {
  samplesTotal: number;
  brand: BrandContextOut | null;
}) {
  const qc = useQueryClient();
  const [latest, setLatest] = React.useState<VoiceTraitsExtracted | null>(null);

  const mutation = useMutation({
    mutationFn: () => extractTraits(),
    onSuccess: (result) => {
      setLatest(result);
      qc.invalidateQueries({ queryKey: BRAND_QUERY_KEY });
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError
          ? err.detail
          : "Could not extract voice traits",
      ),
  });

  const disabled =
    mutation.isPending || samplesTotal < MIN_SAMPLES_FOR_EXTRACT;

  // Fall back to whatever's already stored on the brand context if we don't
  // have a fresh local result yet — keeps the panel useful on revisit.
  const display: VoiceTraitsExtracted | null =
    latest ??
    (brand?.data.tone_calibration ||
    (brand?.data.voice_traits && brand.data.voice_traits.length > 0)
      ? {
          voice_traits: brand?.data.voice_traits ?? [],
          voice_avoid: brand?.data.voice_avoid ?? [],
          recurring_phrases: brand?.data.recurring_phrases ?? [],
          tone_calibration: brand?.data.tone_calibration ?? "",
          samples_analyzed: 0,
        }
      : null);

  const showFreshBanner = latest !== null;

  return (
    <div className="space-y-4 rounded-2xl border border-primary/30 bg-primary/[0.04] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            <h3 className="text-base font-medium text-foreground">
              Extract traits
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Analyze the loaded samples and extract your voice traits. Saved
            into your Brand Context.
          </p>
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={disabled}
          title={
            samplesTotal < MIN_SAMPLES_FOR_EXTRACT
              ? `Need at least ${MIN_SAMPLES_FOR_EXTRACT} samples`
              : undefined
          }
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Run analysis
            </>
          )}
        </Button>
      </div>

      {samplesTotal < MIN_SAMPLES_FOR_EXTRACT && (
        <p className="text-xs text-muted-foreground">
          Need at least {MIN_SAMPLES_FOR_EXTRACT} samples ({samplesTotal}/
          {MIN_SAMPLES_FOR_EXTRACT}).
        </p>
      )}

      {mutation.isError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {mutation.error instanceof ApiError
            ? mutation.error.detail
            : "Could not extract voice traits."}
        </div>
      )}

      {display && (
        <ExtractedTraitsPanel
          data={display}
          showFreshBanner={showFreshBanner}
        />
      )}
    </div>
  );
}

function ExtractedTraitsPanel({
  data,
  showFreshBanner,
}: {
  data: VoiceTraitsExtracted;
  showFreshBanner: boolean;
}) {
  const scrollToBrandContext = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById("brand-context-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-border bg-background/40 p-4">
      {showFreshBanner && (
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" />
          Analyzed {data.samples_analyzed}{" "}
          {data.samples_analyzed === 1 ? "sample" : "samples"}.
        </div>
      )}

      <TraitsBlock title="Voice traits" empty="No traits yet.">
        {data.voice_traits.length > 0 && (
          <ul className="ml-4 list-disc space-y-1 text-sm text-foreground">
            {data.voice_traits.map((t, i) => (
              <li key={`trait-${i}`}>{t}</li>
            ))}
          </ul>
        )}
      </TraitsBlock>

      <TraitsBlock title="Voice avoid" empty="Nothing flagged yet.">
        {data.voice_avoid.length > 0 && (
          <ul className="ml-4 list-disc space-y-1 text-sm text-foreground">
            {data.voice_avoid.map((t, i) => (
              <li key={`avoid-${i}`}>{t}</li>
            ))}
          </ul>
        )}
      </TraitsBlock>

      <TraitsBlock title="Recurring phrases" empty="No phrases detected yet.">
        {data.recurring_phrases.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.recurring_phrases.map((p, i) => (
              <span
                key={`phrase-${i}`}
                className="rounded-full bg-muted/60 px-2 py-0.5 text-xs text-foreground"
              >
                {p}
              </span>
            ))}
          </div>
        )}
      </TraitsBlock>

      <TraitsBlock title="Tone calibration" empty="Not calibrated yet.">
        {data.tone_calibration && (
          <p className="text-sm italic text-muted-foreground">
            {data.tone_calibration}
          </p>
        )}
      </TraitsBlock>

      <p className="text-xs text-muted-foreground">
        These have been saved to your Brand Context.{" "}
        <a
          href="#brand-context-section"
          onClick={scrollToBrandContext}
          className="text-primary underline-offset-4 hover:underline"
        >
          Scroll up
        </a>
        .
      </p>
    </div>
  );
}

function TraitsBlock({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  // We pass `children` only when content exists (caller short-circuits with
  // `&&`), so a falsy / null child means "render the placeholder line".
  const hasContent = !(
    children === null ||
    children === undefined ||
    children === false ||
    children === ""
  );
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {hasContent ? (
        children
      ) : (
        <p className="text-xs text-muted-foreground/70">{empty}</p>
      )}
    </div>
  );
}

// -------------------- Helpers --------------------

function splitPosts(raw: string, separator: string): string[] {
  if (raw.trim() === "") return [];
  // If a separator was given, split on that. Otherwise fall back to two
  // consecutive blank lines as a sane default.
  const sep = separator.trim();
  let parts: string[];
  if (sep === "") {
    parts = raw.split(/\n\s*\n\s*\n/);
  } else {
    // Match the separator only when it sits on its own line (with optional
    // surrounding whitespace), to avoid eating it from inside a post body.
    const escaped = sep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*(?:\\n|$)`, "g");
    parts = raw.split(re);
  }
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

function previewText(value: string, limit: number): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit).trimEnd()}…`;
}

function ErrorBlock({
  detail,
  onRetry,
}: {
  detail: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Couldn&apos;t load samples
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      <div className="mt-4">
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    </div>
  );
}
