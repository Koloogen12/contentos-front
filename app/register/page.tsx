"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { ApiError, fetchMe, registerRequest } from "@/lib/api";
import type { VerificationRequired } from "@/lib/api";
import type { TokenPair } from "@/lib/types";
import { decidePostAuthRoute } from "@/lib/post-auth-redirect";
import { AuthCard } from "@/components/AuthCard";
import { AuthDivider, YandexButton } from "@/components/auth/YandexButton";
import { EmailCodeStep } from "@/components/auth/EmailCodeStep";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email("Введи корректный email"),
  password: z
    .string()
    .min(8, "Минимум 8 символов")
    .max(128, "Максимум 128 символов"),
  display_name: z.string().max(80).optional(),
  organization_name: z.string().max(80).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  return (
    <React.Suspense fallback={null}>
      <RegisterForm />
    </React.Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const setTokens = useAuthStore((s) => s.setTokens);
  const setMe = useAuthStore((s) => s.setMe);
  const setHydrating = useAuthStore((s) => s.setHydrating);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Пока не null — показываем шаг подтверждения кодом. Аккаунт на бэкенде уже
  // создан, но не активен: токены выдаются только после верного кода.
  const [pending, setPending] = React.useState<VerificationRequired | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      display_name: "",
      organization_name: "",
    },
  });

  const finishAuth = React.useCallback(
    async (tokens: TokenPair) => {
      setTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });
      const me = await fetchMe();
      setMe({ user: me.user, organization: me.organization });
      setHydrating(false);
      router.replace(await decidePostAuthRoute({ next }));
    },
    [next, router, setHydrating, setMe, setTokens],
  );

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const result = await registerRequest({
        email: values.email,
        password: values.password,
        ...(values.display_name?.trim()
          ? { display_name: values.display_name.trim() }
          : {}),
        ...(values.organization_name?.trim()
          ? { organization_name: values.organization_name.trim() }
          : {}),
      });
      setPending(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          err.detail || "Не удалось создать аккаунт. Попробуй ещё раз.",
        );
      } else {
        setServerError("Ошибка сети. Попробуй ещё раз.");
      }
    }
  });

  if (pending) {
    return (
      <AuthCard
        title="Подтверди адрес"
        subtitle="Остался один шаг — и воркспейс твой."
        footer={
          <>
            Письма нет? Проверь папку со спамом или{" "}
            <button
              type="button"
              onClick={() => setPending(null)}
              className="font-medium text-foreground hover:text-primary"
            >
              вернись к форме
            </button>
            .
          </>
        }
      >
        <EmailCodeStep
          email={pending.email}
          codeDelivered={pending.code_delivered}
          cooldownSeconds={pending.resend_cooldown_seconds}
          ttlMinutes={pending.code_ttl_minutes}
          onVerified={finishAuth}
          onChangeEmail={() => setPending(null)}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Создать воркспейс"
      subtitle="Начни строить контент-пайплайны в THE DRAFT."
      footer={
        <>
          Уже есть аккаунт?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="font-medium text-foreground hover:text-primary"
          >
            Войти
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <YandexButton next={next} label="Продолжить с Яндексом" />
        <AuthDivider text="или по почте" />
      </div>
      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@studio.com"
            {...register("email")}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Пароль</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Минимум 8 символов"
            {...register("password")}
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="display_name">Имя</Label>
            <Input
              id="display_name"
              autoComplete="name"
              placeholder="Данил"
              {...register("display_name")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization_name">Организация</Label>
            <Input
              id="organization_name"
              autoComplete="organization"
              placeholder="Личный"
              {...register("organization_name")}
            />
          </div>
        </div>
        {serverError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {serverError}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Создание…
            </>
          ) : (
            "Создать аккаунт"
          )}
        </Button>
      </form>
    </AuthCard>
  );
}
