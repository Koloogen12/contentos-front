"use client";

/**
 * Редполитика — вторая половина настройки голоса.
 *
 * Образцы отвечают на «как звучит автор». Они не отвечают, кто читатель,
 * где живёт текст и на что текст опирается, — а от этого зависят длина,
 * прямота и то, можно ли вообще писать без дополнительного материала.
 *
 * Собрано по методу редполитики (Людмила Сарычева). Два решения оттуда,
 * которые здесь важнее прочего:
 *
 *  1. Это интервью, а не анкета. Часть ответов восстанавливается из уже
 *     написанных текстов, поэтому кнопка «Собрать по моим текстам» делает
 *     черновик, и человеку остаётся править, а не заполнять пустые поля.
 *  2. Дыры показываются явно. Черновик возвращает `gaps` — то, чего в
 *     текстах не видно, — и мы выводим их вопросами. Придуманный читатель
 *     хуже отсутствующего: редполитике начинают доверять.
 */

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HelpCircle, Loader2, Sparkles } from "lucide-react";

import { ApiError } from "@/lib/api";
import { draftRedpolitika, getRedpolitika, saveRedpolitika } from "@/lib/voice";
import type { Redpolitika } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EMPTY: Redpolitika = {
  reader: "",
  platforms: {},
  register: "",
  register_exceptions: "",
  lexicon_forbidden: [],
  lexicon_required: [],
  evidence_base: [],
};

/** Списки правим как текст: строка на пункт — быстрее, чем чипы с крестиками. */
const toText = (items: string[]) => items.join("\n");
const fromText = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const platformsToText = (map: Record<string, string>) =>
  Object.entries(map)
    .map(([name, rule]) => `${name}: ${rule}`)
    .join("\n");

const platformsFromText = (text: string) => {
  const out: Record<string, string> = {};
  for (const line of fromText(text)) {
    const at = line.indexOf(":");
    if (at <= 0) continue;
    const name = line.slice(0, at).trim();
    const rule = line.slice(at + 1).trim();
    if (name && rule) out[name] = rule;
  }
  return out;
};

export function RedpolitikaSection({ sampleCount }: { sampleCount: number }) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["redpolitika"], queryFn: getRedpolitika });

  const [form, setForm] = React.useState<Redpolitika>(EMPTY);
  const [gaps, setGaps] = React.useState<string[]>([]);
  const [dirty, setDirty] = React.useState(false);

  // Серверное значение подхватываем, пока пользователь не начал править:
  // иначе фоновый рефетч затрёт наполовину заполненную форму.
  React.useEffect(() => {
    if (query.data && !dirty) setForm(query.data);
  }, [query.data, dirty]);

  const patch = (next: Partial<Redpolitika>) => {
    setDirty(true);
    setForm((prev) => ({ ...prev, ...next }));
  };

  const draftMutation = useMutation({
    mutationFn: draftRedpolitika,
    onSuccess: ({ gaps: found, samples_analyzed, ...draft }) => {
      setForm(draft);
      setGaps(found);
      setDirty(true);
      toast.success(
        found.length
          ? `Черновик по ${samples_analyzed} текстам. ${found.length} вопрос(ов) — за тобой`
          : `Черновик по ${samples_analyzed} текстам`,
      );
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось собрать черновик",
      ),
  });

  const saveMutation = useMutation({
    mutationFn: () => saveRedpolitika(form),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["redpolitika"] });
      qc.invalidateQueries({ queryKey: ["brand-context"] });
      toast.success("Редполитика сохранена — пойдёт во все генерации");
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось сохранить",
      ),
  });

  const canDraft = sampleCount >= 3;

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold">Редполитика</h2>
          <p className="text-[13px] text-[color:var(--text-tertiary)]">
            Образцы дают только звучание. Здесь — кто читатель, где живёт
            текст и на что он опирается.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => draftMutation.mutate()}
            disabled={!canDraft || draftMutation.isPending}
            title={
              canDraft
                ? "Вывести из загруженных текстов всё, что из них видно"
                : "Нужно минимум 3 текста"
            }
          >
            {draftMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            Собрать по моим текстам
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={!dirty || saveMutation.isPending}
          >
            {saveMutation.isPending && (
              <Loader2 size={14} className="animate-spin" />
            )}
            Сохранить
          </Button>
        </div>
      </div>

      {gaps.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-amber-600">
            <HelpCircle size={13} /> Из текстов этого не видно
          </div>
          <ul className="flex flex-col gap-1 text-[13px] text-foreground">
            {gaps.map((g) => (
              <li key={g}>— {g}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-foreground/[0.02] p-4">
        <Field
          label="Читатель"
          hint="Живой человек в конкретной ситуации, а не сегмент. «Все предприниматели» — мимо; «основатели, которые сами пишут посты и не успевают» — то, что нужно."
        >
          <Textarea
            rows={2}
            value={form.reader}
            onChange={(e) => patch({ reader: e.target.value })}
            placeholder="Кто читает и в какой ситуации"
          />
        </Field>

        <Field
          label="Площадки и регистр"
          hint="Строка на площадку в формате «площадка: как там звучит». Одна мысль в статье и в посте звучит по-разному — поэтому регистр держим по площадке."
        >
          <Textarea
            rows={3}
            value={platformsToText(form.platforms)}
            onChange={(e) =>
              patch({ platforms: platformsFromText(e.target.value) })
            }
            placeholder={"телеграм: коротко, от первого лица\nvc.ru: разбор с цифрами, без призывов"}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Регистр по умолчанию"
            hint="Строгий — третье лицо, факты вперёд. Авторский — первое лицо, живой разговор."
          >
            <Input
              value={form.register}
              onChange={(e) => patch({ register: e.target.value })}
              placeholder="авторский: первое лицо, короткие фразы"
            />
          </Field>
          <Field label="Исключения" hint="Где регистр меняется.">
            <Input
              value={form.register_exceptions}
              onChange={(e) => patch({ register_exceptions: e.target.value })}
              placeholder="в документации — строгий"
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Слов быть не должно"
            hint="Строка на слово или оборот."
          >
            <Textarea
              rows={4}
              value={toText(form.lexicon_forbidden)}
              onChange={(e) =>
                patch({ lexicon_forbidden: fromText(e.target.value) })
              }
              placeholder={"синергия\nинновационное решение"}
            />
          </Field>
          <Field
            label="Принятые названия"
            hint="Как называем продукт, разделы, роли, аудиторию. Модель обязана использовать именно эти слова и не подбирать синонимы."
          >
            <Textarea
              rows={4}
              value={toText(form.lexicon_required)}
              onChange={(e) =>
                patch({ lexicon_required: fromText(e.target.value) })
              }
              placeholder={"канвас, а не доска\nтезис, а не идея"}
            />
          </Field>
        </div>

        <Field
          label="На что опираются тексты"
          hint="Личный опыт, цифры продукта, чужие исследования, клиентские истории. Если опоры нет, генерация честно скажет, какой фактуры не хватает, вместо того чтобы её придумать."
        >
          <Textarea
            rows={3}
            value={toText(form.evidence_base)}
            onChange={(e) =>
              patch({ evidence_base: fromText(e.target.value) })
            }
            placeholder={"свой опыт запуска продуктов\nцифры из THE MONO"}
          />
        </Field>
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[13px] font-medium">{label}</Label>
      <p className="text-[12px] leading-snug text-[color:var(--text-tertiary)]">
        {hint}
      </p>
      {children}
    </div>
  );
}
