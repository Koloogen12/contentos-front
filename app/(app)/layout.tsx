import { AppShell } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
// Стилевой слой кабинета — портирован из прототипа хендоффа. Подключён здесь,
// а не в globals.css: Next режет CSS по роутам, и на лендинг он не попадёт.
import "./workspace.css";
import "./launches.css";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
