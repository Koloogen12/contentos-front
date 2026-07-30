"use client";

/**
 * Аккаунты площадок, подключённых через внешний шлюз (Instagram, Threads, X).
 *
 * Отдельно от Telegram и LinkedIn, у которых свои экраны: там подключение
 * идёт нашими ручками. Здесь весь список приходит от шлюза, поэтому кнопка
 * называется «Обновить», а не «Загрузить» — состояние может измениться без
 * нашего участия, если пользователь отзовёт доступ на стороне площадки.
 */

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import {
  connectSocialAccount,
  disconnectSocialAccount,
  listSocialAccounts,
  syncSocialAccounts,
} from "@/lib/integrations";
import type { SocialAccountOut } from "@/lib/types";

const QUERY_KEY = ["social-accounts"];

export function GatewayAccounts({
  platform,
  platformName,
}: {
  platform: string;
  platformName: string;
}) {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: listSocialAccounts });

  const accounts = (query.data ?? []).filter((a) => a.platform === platform);

  const syncMutation = useMutation({
    mutationFn: syncSocialAccounts,
    onSuccess: (data) => {
      qc.setQueryData(QUERY_KEY, data);
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось обновить список",
      ),
  });

  // Шлюз возвращает пользователя на /connections?connected=<платформа>.
  // Своего состояния этот редирект не несёт, поэтому просто спрашиваем
  // шлюз заново — так же, как по кнопке.
  const connected = searchParams.get("connected");
  const syncedRef = React.useRef(false);
  React.useEffect(() => {
    if (connected && !syncedRef.current) {
      syncedRef.current = true;
      syncMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const connectMutation = useMutation({
    mutationFn: () => connectSocialAccount(platform),
    onSuccess: ({ authorize_url }) => {
      window.location.href = authorize_url;
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось начать подключение",
      ),
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => disconnectSocialAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Аккаунт отключён");
    },
    onError: (err) =>
      toast.error(
        err instanceof ApiError ? err.detail : "Не удалось отключить",
      ),
  });

  return (
    <div className="flex flex-col gap-3">
      {accounts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {accounts.map((a) => (
            <AccountRow
              key={a.id}
              account={a}
              onDisconnect={() => disconnectMutation.mutate(a.id)}
              disabled={disconnectMutation.isPending}
            />
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-or btn-sm"
          onClick={() => connectMutation.mutate()}
          disabled={connectMutation.isPending}
        >
          {connectMutation.isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Plus size={13} />
          )}
          Подключить {platformName}
        </button>
        <button
          type="button"
          className="btn btn-w btn-sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          title="Спросить у шлюза актуальный список — на случай, если доступ отозвали на стороне площадки"
        >
          {syncMutation.isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          Обновить
        </button>
      </div>
    </div>
  );
}

function AccountRow({
  account,
  onDisconnect,
  disabled,
}: {
  account: SocialAccountOut;
  onDisconnect: () => void;
  disabled: boolean;
}) {
  return (
    <li className="flex items-center gap-3 rounded-[12px] border border-[color:var(--p-line)] bg-[color:var(--p-card-2)] px-3 py-2.5">
      {account.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={account.avatar_url}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="av" style={{ width: 32, height: 32, fontSize: 13 }}>
          {account.display_name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium">
          {account.display_name}
        </div>
        {account.username && (
          <div className="kmeta" style={{ marginTop: 2 }}>
            @{account.username}
          </div>
        )}
      </div>
      {!account.is_active && (
        <span className="chip amber">доступ отозван</span>
      )}
      <button
        type="button"
        className="ib tt"
        data-tt="Отключить аккаунт"
        aria-label="Отключить аккаунт"
        onClick={onDisconnect}
        disabled={disabled}
      >
        <Unplug size={14} />
      </button>
    </li>
  );
}
