"use client";

/**
 * Подключения площадок.
 *
 * Раньше Telegram и LinkedIn жили в настройках внутри раздела «Подписка» —
 * там их не искали, и они не имели отношения к тарифу. Теперь это отдельный
 * модуль: подключение аккаунта — регулярная задача, а не настройка.
 *
 * Главное решение экрана: статус площадки считает сервер, а не клиент.
 * Кнопка «Подключить» появляется только когда у сервера есть ключи
 * приложения; если ключей нет — вместо служебной ошибки «LinkedIn OAuth не
 * сконфигурирован (нет CLIENT_ID)» показывается, что именно нужно сделать.
 * Ошибка была правдой, но адресованной владельцу продукта: нажавший кнопку
 * сделать с ней ничего не мог.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, Clock, Plug } from "lucide-react";

import { ApiError } from "@/lib/api";
import { listIntegrations } from "@/lib/integrations";
import type { IntegrationOut, IntegrationStatus } from "@/lib/types";
import { TelegramTargetsSection } from "@/components/TelegramTargetsSection";
import { LinkedInAccountsSection } from "@/components/LinkedInAccountsSection";
import { GatewayAccounts } from "@/components/connections/GatewayAccounts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrialRedirect } from "@/components/TrialRedirect";

const STATUS_CHIP: Record<IntegrationStatus, { cls: string; label: string }> = {
  ready: { cls: "chip green", label: "готово к подключению" },
  needs_setup: { cls: "chip amber", label: "нужны ключи приложения" },
  planned: { cls: "chip", label: "ещё не подключено" },
};

const STATUS_ICON: Record<IntegrationStatus, React.ReactNode> = {
  ready: <Check size={13} />,
  needs_setup: <AlertTriangle size={13} />,
  planned: <Clock size={13} />,
};

export default function ConnectionsPage() {
  const query = useQuery({
    queryKey: ["integrations"],
    queryFn: listIntegrations,
  });

  const byId = React.useMemo(() => {
    const map: Record<string, IntegrationOut> = {};
    for (const it of query.data ?? []) map[it.id] = it;
    return map;
  }, [query.data]);

  return (
    <div className="pad">
      <TrialRedirect />
      <div className="ph">
        <span
          className="ph-ic"
          style={{ background: "var(--p-or-soft)", color: "var(--p-or)" }}
        >
          <Plug size={20} />
        </span>
        <div>
          <h1>Подключения</h1>
          <p>
            Куда THE DRAFT может публиковать и откуда собирает метрики. Аккаунт
            подключается один раз — дальше посты уходят из плана.
          </p>
        </div>
      </div>

      {query.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : query.isError ? (
        <div className="empty">
          <span className="empty-ic">
            <AlertTriangle size={20} />
          </span>
          <h3>Не удалось загрузить список площадок</h3>
          <p>
            {query.error instanceof ApiError
              ? query.error.detail
              : "Попробуй ещё раз."}
          </p>
          <button
            type="button"
            className="btn btn-w"
            onClick={() => query.refetch()}
          >
            Повторить
          </button>
        </div>
      ) : (
        <>
          {/* Telegram и LinkedIn имеют свои экраны подключения — показываем
              их целиком, а карточка статуса идёт шапкой над каждым. */}
          <IntegrationCard item={byId.telegram}>
            {byId.telegram?.status === "ready" && <TelegramTargetsSection />}
          </IntegrationCard>

          <IntegrationCard item={byId.linkedin}>
            {byId.linkedin?.status === "ready" && <LinkedInAccountsSection />}
          </IntegrationCard>

          {/* Площадки через шлюз: подключение одинаковое, поэтому и
              компонент один — отличается только идентификатор. */}
          {["instagram", "threads", "x"].map((id) => {
            const item = byId[id];
            return (
              <IntegrationCard key={id} item={item}>
                {item?.status === "ready" && (
                  <GatewayAccounts platform={id} platformName={item.name} />
                )}
              </IntegrationCard>
            );
          })}
        </>
      )}
    </div>
  );
}

function IntegrationCard({
  item,
  children,
}: {
  item?: IntegrationOut;
  children?: React.ReactNode;
}) {
  if (!item) return null;
  const chip = STATUS_CHIP[item.status];

  return (
    <div className="kcard">
      <div className="kcard-hd">
        <span className="kcard-t">{item.name}</span>
        <span className={chip.cls}>
          {STATUS_ICON[item.status]}
          {chip.label}
        </span>
      </div>
      <p className="kcard-b">{item.capability}</p>

      {item.setup_hint && (
        <div
          className="kcard-b"
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            background: "var(--p-card-2)",
            border: "1px solid var(--p-line)",
            fontSize: 13.5,
          }}
        >
          <div className="cap" style={{ marginBottom: 6 }}>
            что нужно, чтобы заработало
          </div>
          {item.setup_hint}
        </div>
      )}

      {item.caveat && <div className="kmeta">{item.caveat}</div>}

      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}
