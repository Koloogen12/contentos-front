"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import {
  ApiError,
  EMAIL_NOT_VERIFIED,
  fetchMe,
  loginRequest,
  resendCodeRequest,
} from "@/lib/api";
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
  password: z.string().min(1, "Пароль обязателен"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const setTokens = useAuthStore((s) => s.setTokens);
  const setMe = useAuthStore((s) => s.setMe);
  const setHydrating = useAuthStore((s) => s.setHydrating);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Адрес зарегистрирован, но не подтверждён: показываем шаг с кодом вместо
  // «неверный пароль» — пароль-то верный, не хватает подтверждения.
  const [pending, setPending] = React.useState<VerificationRequired | null>(null);

  // Ошибка вернулась редиректом от бэкенда после OAuth-круга.
  const yandexError = searchParams.get("yandex_error");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
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
      await finishAuth(await loginRequest(values));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403 && err.detail === EMAIL_NOT_VERIFIED) {
          // Досылаем код и уводим на шаг подтверждения. Если отправка
          // упирается в кулдаун — прошлый код ещё жив, шаг всё равно нужен.
          try {
            setPending(await resendCodeRequest({ email: values.email }));
          } catch {
            setPending({
              email: values.email,
              verification_required: true,
              code_delivered: true,
              resend_cooldown_seconds: 60,
              code_ttl_minutes: 15,
            });
          }
          return;
        }
        setServerError(err.detail || "Не удалось войти. Попробуй ещё раз.");
      } else {
        setServerError("Ошибка сети. Попробуй ещё раз.");
      }
    }
  });

  if (pending) {
    return (
      <AuthCard
        title="Подтверди адрес"
        subtitle="Аккаунт создан, но адрес не подтверждён."
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
      title="С возвращением"
      subtitle="Войди в свой воркспейс THE DRAFT."
      footer={
        <>
          Впервые здесь?{" "}
          <Link
            href={
              next
                ? `/register?next=${encodeURIComponent(next)}`
                : "/register"
            }
            className="font-medium text-foreground hover:text-primary"
          >
            Создать аккаунт
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {yandexError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {yandexError === "no_email"
              ? "Яндекс не отдал адрес почты — разреши доступ к email или войди по паролю."
              : yandexError === "cancelled"
                ? "Вход через Яндекс отменён."
                : "Не удалось войти через Яндекс. Попробуй ещё раз или войди по паролю."}
          </div>
        )}
        <YandexButton next={next} />
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
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
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
              <Loader2 className="h-4 w-4 animate-spin" /> Вход…
            </>
          ) : (
            "Войти"
          )}
        </Button>
      </form>
    </AuthCard>
  );
}
