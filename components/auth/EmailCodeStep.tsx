"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { ApiError, resendCodeRequest, verifyEmailRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TokenPair } from "@/lib/types";

/**
 * Второй шаг регистрации: подтверждение адреса кодом из письма.
 *
 * Переиспользуется на входе: если человек зарегистрировался, но не подтвердил
 * адрес, /auth/login отвечает `email_not_verified` — и вместо неправдивого
 * «неверный пароль» показываем этот же шаг.
 */

const CODE_LENGTH = 6;

interface Props {
  email: string;
  /** false — SMTP на сервере не настроен, письмо не ушло. */
  codeDelivered: boolean;
  cooldownSeconds: number;
  ttlMinutes: number;
  onVerified: (tokens: TokenPair) => void | Promise<void>;
  /** Вернуться и исправить адрес. */
  onChangeEmail: () => void;
}

export function EmailCodeStep({
  email,
  codeDelivered,
  cooldownSeconds,
  ttlMinutes,
  onVerified,
  onChangeEmail,
}: Props) {
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(cooldownSeconds);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const submit = React.useCallback(
    async (value: string) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        const tokens = await verifyEmailRequest({ email, code: value });
        await onVerified(tokens);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.detail || "Не удалось подтвердить код."
            : "Ошибка сети. Попробуй ещё раз.",
        );
        // Очищаем поле, чтобы не пришлось стирать шесть цифр руками.
        setCode("");
        inputRef.current?.focus();
      } finally {
        setBusy(false);
      }
    },
    [email, onVerified],
  );

  // Автоотправка на полном коде: набирать шесть цифр и потом искать кнопку —
  // лишний шаг, который на этом экране ничего не защищает.
  const onChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH && !busy) void submit(digits);
  };

  const resend = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await resendCodeRequest({ email });
      setCooldown(res.resend_cooldown_seconds);
      setNotice(
        res.code_delivered
          ? "Новый код отправлен."
          : "Почта на сервере не настроена — код в логах сервера.",
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.detail : "Не удалось отправить код заново.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <p className="text-sm text-muted-foreground">
          {codeDelivered ? (
            <>
              Отправили код на <span className="text-foreground">{email}</span>. Он
              действует {ttlMinutes} минут.
            </>
          ) : (
            <>
              Почта на сервере пока не настроена, поэтому письмо не ушло. Код для{" "}
              <span className="text-foreground">{email}</span> записан в логи
              сервера.
            </>
          )}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">Код из письма</Label>
        <Input
          id="code"
          ref={inputRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          // inputMode + autoComplete: на телефоне сразу цифровая клавиатура,
          // а код из письма предлагается к автозаполнению.
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="______"
          maxLength={CODE_LENGTH}
          disabled={busy}
          aria-invalid={!!error}
          className="text-center text-lg tracking-[0.5em]"
        />
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        {notice && !error && (
          <p className="text-xs text-muted-foreground">{notice}</p>
        )}
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={busy || code.length < CODE_LENGTH}
        onClick={() => void submit(code)}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Проверяем…
          </>
        ) : (
          "Подтвердить"
        )}
      </Button>

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={onChangeEmail}
          className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Изменить адрес
        </button>
        <button
          type="button"
          onClick={() => void resend()}
          disabled={busy || cooldown > 0}
          className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:no-underline"
        >
          {cooldown > 0 ? `Отправить снова через ${cooldown} с` : "Отправить снова"}
        </button>
      </div>
    </div>
  );
}
