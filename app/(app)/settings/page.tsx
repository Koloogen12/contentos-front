"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { getBrandContext, updateBrandContext } from "@/lib/brand-context";
import type { BrandContextOut } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

const schema = z.object({
  author_name: z.string().optional(),
  author_handle: z.string().optional(),
  manifesto: z.string().optional(),
  voice_rules: z.string().optional(),
  taboo_list: z.string().optional(),
  cta_keywords: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function SettingsPage() {
  const query = useQuery({
    queryKey: ["brand-context"],
    queryFn: getBrandContext,
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Brand context</h1>
        <p className="text-sm text-muted-foreground">
          The voice, taboos, and manifesto that get injected into every AI
          prompt run from this org.
        </p>
      </div>

      <div className="mt-8">
        {query.isPending ? (
          <SettingsSkeleton />
        ) : query.isError ? (
          <ErrorBlock
            detail={
              query.error instanceof ApiError
                ? query.error.detail
                : "Could not load brand context."
            }
            onRetry={() => query.refetch()}
          />
        ) : query.data ? (
          <BrandContextForm context={query.data} />
        ) : null}
      </div>
    </div>
  );
}

function BrandContextForm({ context }: { context: BrandContextOut }) {
  const qc = useQueryClient();
  const data = context.data ?? {};
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      author_name: data.author_name ?? "",
      author_handle: data.author_handle ?? "",
      manifesto: data.manifesto ?? "",
      voice_rules: data.voice_rules ?? "",
      taboo_list: data.taboo_list ?? "",
      cta_keywords: (data.cta_keywords ?? []).join(", "),
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...data,
        author_name: values.author_name?.trim() || undefined,
        author_handle: values.author_handle?.trim() || undefined,
        manifesto: values.manifesto ?? "",
        voice_rules: values.voice_rules ?? "",
        taboo_list: values.taboo_list ?? "",
        cta_keywords: values.cta_keywords
          ? values.cta_keywords
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      };
      return updateBrandContext(payload);
    },
    onSuccess: (updated) => {
      qc.setQueryData(["brand-context"], updated);
      reset({
        author_name: updated.data.author_name ?? "",
        author_handle: updated.data.author_handle ?? "",
        manifesto: updated.data.manifesto ?? "",
        voice_rules: updated.data.voice_rules ?? "",
        taboo_list: updated.data.taboo_list ?? "",
        cta_keywords: (updated.data.cta_keywords ?? []).join(", "),
      });
      toast.success("Brand context saved");
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.detail : "Could not save"),
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="author_name">Author name</Label>
          <Input id="author_name" {...register("author_name")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="author_handle">Author handle</Label>
          <Input
            id="author_handle"
            placeholder="@yourhandle"
            {...register("author_handle")}
          />
        </div>
      </div>

      <Field
        id="voice_rules"
        label="Voice rules"
        description="Sentence length, vocabulary, signature phrases."
        rows={4}
        register={register("voice_rules")}
        error={errors.voice_rules?.message}
      />

      <Field
        id="taboo_list"
        label="Taboos"
        description="Words and topics to avoid. Plain prose."
        rows={4}
        register={register("taboo_list")}
        error={errors.taboo_list?.message}
      />

      <Field
        id="manifesto"
        label="Manifesto / core beliefs"
        description="The 3–5 ideas you keep coming back to."
        rows={5}
        register={register("manifesto")}
        error={errors.manifesto?.message}
      />

      <div className="space-y-1.5">
        <Label htmlFor="cta_keywords">
          CTA keywords{" "}
          <span className="text-muted-foreground">(comma-separated)</span>
        </Label>
        <Input
          id="cta_keywords"
          placeholder="STACK, QUESTIONS, WORK"
          {...register("cta_keywords")}
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

      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="text-xs text-muted-foreground">
          <Sparkles className="mr-1 inline h-3 w-3" />
          Version {context.version}
        </div>
        <Button type="submit" disabled={!isDirty || mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  description,
  rows,
  register,
  error,
}: {
  id: string;
  label: string;
  description?: string;
  rows: number;
  register: ReturnType<ReturnType<typeof useForm<FormValues>>["register"]>;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <Textarea id={id} rows={rows} {...register} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-32" />
      <Skeleton className="h-16" />
    </div>
  );
}

function ErrorBlock({
  detail,
  onRetry,
}: {
  detail: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-medium text-foreground">
            Couldn&apos;t load brand context
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
      <div className="mt-5">
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    </div>
  );
}
