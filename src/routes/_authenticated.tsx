import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  PlusSquare,
  History,
  Target,
  LogOut,
  TrendingUp,
  Menu,
  FileText,
  Megaphone,
  Briefcase,
  DollarSign,
  Cog,
  Wrench,
  ShieldCheck,
  Trophy,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useMe, hasModule, type AppModule } from "@/hooks/use-me";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

const allNav: { to: string; label: string; icon: typeof LayoutDashboard; mod: AppModule }[] = [
  { to: "/dashboard",   label: "Dashboard",       icon: LayoutDashboard, mod: "dashboard" },
  { to: "/lancamento",  label: "Lançamento",       icon: PlusSquare,      mod: "lancamento" },
  { to: "/historico",   label: "Histórico",        icon: History,         mod: "historico" },
  { to: "/metas",       label: "Metas",            icon: Target,          mod: "metas" },
  { to: "/relatorio",   label: "Relatório",        icon: FileText,        mod: "relatorio" },
  { to: "/top-produtos",label: "TOP 10 Produtos",  icon: Trophy,          mod: "top_produtos" },
  { to: "/marketing",   label: "Marketing",        icon: Megaphone,       mod: "marketing" },
  { to: "/comercial",   label: "Comercial",        icon: Briefcase,       mod: "comercial" },
  { to: "/financeiro",  label: "Financeiro",       icon: DollarSign,      mod: "financeiro" },
  { to: "/engenharia",  label: "Engenharia",       icon: Wrench,          mod: "engenharia" },
  { to: "/configuracoes",label: "Configurações",   icon: Cog,             mod: "configuracoes" },
  { to: "/usuarios",    label: "Usuários",         icon: ShieldCheck,     mod: "usuarios" },
];

function Layout() {
  const navigate  = useNavigate();
  const pathname  = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { data: me } = useMe();

  const isMaster = me?.roles.includes("admin_master") ?? false;
  const nav = allNav.filter((n) => hasModule(me?.permissions, n.mod, isMaster));

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/40">
        <div className="logo-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg animate-float">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[15px] font-bold leading-tight text-foreground tracking-tight">
            Isoflex
          </div>
          <div className="text-[11px] text-muted-foreground leading-tight font-medium">
            Gestão Corporativa
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map((n, i) => {
          const Icon   = n.icon;
          const active = pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              style={{ animationDelay: `${i * 40}ms` }}
              className={cn(
                "nav-item animate-enter flex items-center gap-3 px-3 py-2.5 text-sm font-medium w-full",
                active
                  ? "nav-item-active text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-muted/60 text-muted-foreground group-hover:bg-primary/10",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer user */}
      <div className="border-t border-white/30 p-3 space-y-1">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/40">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">
            {(me?.profile?.full_name || me?.email || "U")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-foreground">
              {me?.profile?.full_name || me?.email}
            </div>
            {isMaster && (
              <span className="inline-block rounded-full bg-primary/12 px-1.5 py-px text-[10px] font-bold text-primary">
                MASTER
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors duration-200"
        >
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      <div className="flex">

        {/* ── Sidebar desktop ── */}
        <aside className="hidden lg:flex sticky top-0 h-screen w-64 shrink-0 flex-col glass-sidebar animate-enter">
          <SidebarContent />
        </aside>

        {/* ── Mobile overlay ── */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* ── Mobile sidebar drawer ── */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 flex flex-col glass-strong shadow-2xl lg:hidden",
            "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <SidebarContent />
        </aside>

        {/* ── Main content ── */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Header */}
          <header className="sticky top-0 z-30 glass-strong border-b border-white/40 px-4 py-3 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Mobile menu toggle */}
                <button
                  className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted transition-all duration-200 active:scale-95"
                  onClick={() => setOpen(true)}
                >
                  <Menu className="h-5 w-5 text-muted-foreground" />
                </button>

                {/* Mobile logo */}
                <div className="lg:hidden flex items-center gap-2">
                  <div className="logo-gradient flex h-8 w-8 items-center justify-center rounded-lg text-white shadow">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold">Isoflex</span>
                </div>

                {/* Desktop breadcrumb */}
                <div className="hidden lg:flex items-center gap-2">
                  <span className="text-sm text-muted-foreground/60 font-medium">Isoflex</span>
                  <span className="text-muted-foreground/30">/</span>
                  <span className="text-sm font-semibold text-foreground capitalize">
                    {pathname.replace("/", "") || "Dashboard"}
                  </span>
                </div>
              </div>

              {/* Date */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-white/40">
                <span>
                  {new Date().toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
