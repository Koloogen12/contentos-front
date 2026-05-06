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
import { decidePostAuthRoute } from "@/lib/post-auth-redirect";
import { AuthCard } from "@/components/AuthCard";
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

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const payload = {
        email: values.email,
        password: values.password,
        ...(values.display_name?.trim()
          ? { display_name: values.display_name.trim() }
          : {}),
        ...(values.organization_name?.trim()
          ? { organization_name: values.organization_name.trim() }
          : {}),
      };
      const tokens = await registerRequest(payload);
      setTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });
      const me = await fetchMe();
      setMe({ user: me.user, organization: me.organization });
      setHydrating(false);
      const route = await decidePostAuthRoute({ next });
      router.replace(route);
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

  return (
    <AuthCard
      title="Создать воркспейс"
      subtitle="Начни строить контент-пайплайны в THE CONTENT."
      footer={
        <>
          Уже есть аккаунт?{" "}
          <Link
            href={
              next ? `/login?next=${encodeURIComponent(next)}` : "/login"
            }
            className="font-medium text-foreground hover:text-primary"
          >
            Войти
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
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
            <Label htmlFor="display_name">
              Имя{" "}
              <span className="text-muted-foreground">(необязательно)</span>
            </Label>
            <Input
              id="display_name"
              autoComplete="name"
              placeholder="Данил"
              {...register("display_name")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization_name">
              Организация{" "}
              <span className="text-muted-foreground">(необязательно)</span>
            </Label>
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
