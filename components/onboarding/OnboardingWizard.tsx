"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { getBrandContext, updateBrandContext } from "@/lib/brand-context";
import {
  createCanvas,
  createCanvasFromTemplate,
  listCanvasTemplates,
  listCanvases,
} from "@/lib/canvases";
import { bulkCreateVoiceSamples } from "@/lib/voice";
import type { BrandContextData, CanvasOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const STEPS = [1, 2, 3] as const;
type Step = (typeof STEPS)[number];

const LOCAL_STORAGE_KEY = "contentos.onboarding.brand-stash";

interface BrandStashed {
  author_name: string;
  author_handle: string;
  author_bio: string;
  voice_rules: string;
  cta_keywords: string;
}

const EMPTY_STASH: BrandStashed = {
  author_name: "",
  author_handle: "",
  author_bio: "",
  voice_rules: "",
  cta_keywords: "",
};

function readStash(): BrandStashed {
  if (typeof window === "undefined") return EMPTY_STASH;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return EMPTY_STASH;
    const parsed = JSON.parse(raw) as Partial<BrandStashed>;
    return { ...EMPTY_STASH, ...parsed };
  } catch {
    return EMPTY_STASH;
  }
}

function writeStash(values: BrandStashed) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(values));
  } catch {
    // best-effort only
  }
}

function clearStash() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // best-effort only
  }
}

export function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = Number(searchParams.get("step") ?? "1");
  const step: Step =
    stepParam === 2 || stepParam === 3 ? (stepParam as Step) : 1;

  const setStep = React.useCallback(
    (next: Step) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === 1) params.delete("step");
      else params.set("step", String(next));
      const qs = params.toString();
      router.replace(`/onboarding${qs ? `?${qs}` : ""}`);
    },
    [router, searchParams],
  );

  // ----- Freshness check ----------------------------------------------
  const brandQuery = useQuery({
    queryKey: ["brand-context"],
    queryFn: getBrandContext,
  });
  const userCanvasesQuery = useQuery({
    queryKey: ["canvases", { is_template: false }],
    queryFn: () => listCanvases({ is_template: false }),
  });

  const checkComplete =
    !brandQuery.isPending &&
    !userCanvasesQuery.isPending &&
    !brandQuery.isError &&
    !userCanvasesQuery.isError;

  const isFresh = React.useMemo(() => {
    if (!checkComplete) return null;
    const noAuthor = !brandQuery.data?.data.author_name?.trim();
    const noCanvases = (userCanvasesQuery.data ?? []).length === 0;
    return noAuthor && noCanvases;
  }, [
    checkComplete,
    brandQuery.data,
    userCanvasesQuery.data,
  ]);

  React.useEffect(() => {
    if (isFresh === false) {
      router.replace("/dashboard");
    }
  }, [isFresh, router]);

  // ----- New-canvas id captured at step 2 ------------------------------
  const [newCanvasId, setNewCanvasId] = React.useState<string | null>(null);

  // While freshness is undecided or the user is being redirected, show a
  // spinner. Once fresh confirmed, render the wizard chrome.
  if (isFresh === null || isFresh === false) {
    return (
      <BareLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner size={20} label="Loading…" />
        </div>
      </BareLayout>
    );
  }

  return (
    <BareLayout>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
        <ProgressDots current={step} />
        {step === 1 && (
          <Step1AboutYou
            onNext={() => setStep(2)}
            onSkip={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2PickTemplate
            onBack={() => setStep(1)}
            onNext={(canvasId) => {
              setNewCanvasId(canvasId);
              setStep(3);
            }}
          />
        )}
        {step === 3 && (
          <Step3VoiceSamples
            onBack={() => setStep(2)}
            onFinish={() => {
              clearStash();
              if (newCanvasId) {
                router.replace(`/canvas/${newCanvasId}`);
              } else {
                router.replace("/dashboard");
              }
            }}
          />
        )}
      </div>
    </BareLayout>
  );
}

function BareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-14 items-center gap-2 border-b border-border px-6">
        <Sparkles className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold tracking-tight">ContentOS</span>
      </div>
      {children}
    </div>
  );
}

function ProgressDots({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((s) => (
        <span
          key={s}
          className={cn(
            "h-2 rounded-full transition-all",
            current === s
              ? "w-8 bg-primary"
              : current > s
                ? "w-2 bg-primary/60"
                : "w-2 bg-muted",
          )}
          aria-label={`Step ${s}${current === s ? " (current)" : ""}`}
        />
      ))}
    </div>
  );
}

// ----- Step 1: About you ---------------------------------------------

function Step1AboutYou({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  const [stash, setStash] = React.useState<BrandStashed>(() => readStash());

  React.useEffect(() => {
    writeStash(stash);
  }, [stash]);

  const mutation = useMutation({
    mutationFn: () => {
      const data: BrandContextData = {};
      if (stash.author_name.trim()) data.author_name = stash.author_name.trim();
      if (stash.author_handle.trim())
        data.author_handle = stash.author_handle.trim();
      if (stash.author_bio.trim()) data.author_bio = stash.author_bio.trim();
      if (stash.voice_rules.trim()) data.voice_rules = stash.voice_rules.trim();
      const ctas = stash.cta_keywords
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (ctas.length > 0) data.cta_keywords = ctas;
      return updateBrandContext(data);
    },
    onSuccess: () => {
      onNext();
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not save brand context",
      ),
  });

  return (
    <Card>
      <h1 className="text-2xl font-semibold tracking-tight">About you</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Just the essentials — we&apos;ll inject these into every AI prompt so
        the output sounds like you.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="mt-6 space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-name">Name</Label>
            <Input
              id="onboarding-name"
              value={stash.author_name}
              onChange={(e) =>
                setStash((s) => ({ ...s, author_name: e.target.value }))
              }
              placeholder="Danil Kochnev"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="onboarding-handle">Handle</Label>
            <Input
              id="onboarding-handle"
              value={stash.author_handle}
              onChange={(e) =>
                setStash((s) => ({ ...s, author_handle: e.target.value }))
              }
              placeholder="@kochnefff"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-bio">Short bio</Label>
          <Textarea
            id="onboarding-bio"
            rows={2}
            value={stash.author_bio}
            onChange={(e) =>
              setStash((s) => ({ ...s, author_bio: e.target.value }))
            }
            placeholder="One-liner about who you are and what you build."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-voice">Voice rules</Label>
          <Textarea
            id="onboarding-voice"
            rows={3}
            value={stash.voice_rules}
            onChange={(e) =>
              setStash((s) => ({ ...s, voice_rules: e.target.value }))
            }
            placeholder="Short sentences. No corporate fluff. Words you use, words you don't."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-cta">
            CTA keywords{" "}
            <span className="text-muted-foreground">(comma-separated)</span>
          </Label>
          <Input
            id="onboarding-cta"
            value={stash.cta_keywords}
            onChange={(e) =>
              setStash((s) => ({ ...s, cta_keywords: e.target.value }))
            }
            placeholder="STACK, QUESTIONS, WORK"
          />
        </div>

        {mutation.error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {mutation.error instanceof ApiError
              ? mutation.error.detail
              : "Could not save."}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            disabled={mutation.isPending}
          >
            <X className="h-4 w-4" /> Skip for now
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                Continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ----- Step 2: Pick a starting template ------------------------------

function Step2PickTemplate({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: (canvasId: string) => void;
}) {
  const [selected, setSelected] = React.useState<CanvasOut | "blank" | null>(
    null,
  );

  const templatesQuery = useQuery({
    queryKey: ["canvas-templates"],
    queryFn: listCanvasTemplates,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (selected === "blank") {
        return createCanvas({ name: "Мой первый канвас" });
      }
      if (selected) {
        return createCanvasFromTemplate(selected.id, {
          name: "Мой первый канвас",
        });
      }
      throw new Error("No template selected");
    },
    onSuccess: (canvas) => {
      onNext(canvas.id);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Could not create canvas",
      ),
  });

  return (
    <Card>
      <h1 className="text-2xl font-semibold tracking-tight">
        Pick a starting template
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Templates wire up sources, extracts, and formats for common pipelines.
        You can edit any of it after.
      </p>

      <div className="mt-6 space-y-2">
        <button
          type="button"
          onClick={() => setSelected("blank")}
          className={cn(
            "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors",
            selected === "blank"
              ? "border-primary bg-primary/10"
              : "border-border bg-card/40 hover:border-primary/40",
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">
              Start blank
            </div>
            <div className="text-xs text-muted-foreground">
              Empty canvas — drag in your own nodes.
            </div>
          </div>
        </button>

        {templatesQuery.isPending ? (
          <TemplatesSkeleton />
        ) : templatesQuery.isError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {templatesQuery.error instanceof ApiError
              ? templatesQuery.error.detail
              : "Could not load templates."}
          </div>
        ) : (
          (templatesQuery.data ?? []).map((t) => {
            const isSelected =
              selected !== "blank" && selected?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card/40 hover:border-primary/40",
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {t.name}
                  </div>
                  {t.description && (
                    <div className="text-xs text-muted-foreground">
                      {t.description}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || selected === null}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating…
            </>
          ) : (
            <>
              Continue <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

function TemplatesSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card/40 p-4"
          aria-hidden
        >
          <div className="flex gap-3">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ----- Step 3: Voice samples ----------------------------------------

function Step3VoiceSamples({
  onBack,
  onFinish,
}: {
  onBack: () => void;
  onFinish: () => void;
}) {
  const [text, setText] = React.useState("");
  const [platform, setPlatform] = React.useState("telegram");

  const mutation = useMutation({
    mutationFn: () => {
      const samples = text
        .split(/\n\s*---\s*\n/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 20)
        .map((s) => ({
          text: s,
          platform: platform.trim() || null,
        }));
      if (samples.length === 0) {
        throw new Error("Need at least one post of 20+ characters");
      }
      return bulkCreateVoiceSamples(samples);
    },
    onSuccess: (result) => {
      toast.success(
        `Saved ${result.created} ${result.created === 1 ? "sample" : "samples"}`,
      );
      onFinish();
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Could not save samples",
      ),
  });

  return (
    <Card>
      <h1 className="text-2xl font-semibold tracking-tight">
        Train your voice
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Optional. Paste a few of your best posts (separated by{" "}
        <code className="rounded bg-muted/60 px-1 py-0.5 text-[11px]">---</code>
        ) so the AI mirrors how you actually write.
      </p>

      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-platform">Default platform</Label>
          <Input
            id="onboarding-platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="telegram"
            className="max-w-[200px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-samples">Posts</Label>
          <Textarea
            id="onboarding-samples"
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Post one\n\n---\n\nPost two\n\n---\n\nPost three`}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onFinish}>
            Skip for now
          </Button>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || text.trim() === ""}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Finish"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ----- Shared shell --------------------------------------------------

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-xl">
      {children}
    </div>
  );
}
