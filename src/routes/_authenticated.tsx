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
  Mouse,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useMe, hasModule, type AppModule } from "@/hooks/use-me";
import {
  setPageTransitionDirection,
  getPageTransitionDirection,
} from "@/lib/page-transition";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

const allNav: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  mod: AppModule;
}[] = [
  { to: "/dashboard",    label: "Dashboard",      icon: LayoutDashboard, mod: "dashboard" },
  { to: "/lancamento",   label: "Lançamento",      icon: PlusSquare,      mod: "lancamento" },
  { to: "/historico",    label: "Histórico",       icon: History,         mod: "historico" },
  { to: "/metas",        label: "Metas",           icon: Target,          mod: "metas" },
  { to: "/relatorio",    label: "Relatório",       icon: FileText,        mod: "relatorio" },
  { to: "/top-produtos", label: "TOP 10 Produtos", icon: Trophy,          mod: "top_produtos" },
  { to: "/marketing",    label: "Marketing",       icon: Megaphone,       mod: "marketing" },
  { to: "/comercial",    label: "Comercial",       icon: Briefcase,       mod: "comercial" },
  { to: "/financeiro",   label: "Financeiro",      icon: DollarSign,      mod: "financeiro" },
  { to: "/engenharia",   label: "Engenharia",      icon: Wrench,          mod: "engenharia" },
  { to: "/configuracoes",label: "Configurações",   icon: Cog,             mod: "configuracoes" },
  { to: "/usuarios",     label: "Usuários",        icon: ShieldCheck,     mod: "usuarios" },
];

/* ── Progress bar shown on every page navigation ── */
function PageProgressBar() {
  return <div className="page-progress-bar" key={Date.now()} />;
}

/* ── Overlay swipe flash on navigation ── */
function PageOverlay() {
  return <div className="page-overlay-swipe" key={Date.now()} />;
}

function Layout() {
  const navigate    = useNavigate();
  const pathname    = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen]                     = useState(false);
  const [showHint, setShowHint]             = useState(false);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [showOverlay, setShowOverlay]         = useState(false);
  const { data: me } = useMe();

  const isMaster = me?.roles.includes("admin_master") ?? false;
  const nav = allNav.filter((n) => hasModule(me?.permissions, n.mod, isMaster));

  // ── Scroll-nav toggle (persistido) ───────────────────────────────────────
  const [scrollNavEnabled, setScrollNavEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem("igloo-scroll-nav") !== "false"; }
    catch { return true; }
  });

  const toggleScrollNav = useCallback(() => {
    setScrollNavEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem("igloo-scroll-nav", String(next)); } catch {}
      return next;
    });
  }, []);

  // ── Refs para debounce ───────────────────────────────────────────────────
  const lastScrollRef   = useRef(0);
  const isNavRef        = useRef(false);
  const COOLDOWN        = 800;
  const DELTA_MIN       = 50;

  const currentIndex = nav.findIndex((n) => pathname.startsWith(n.to));
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < nav.length - 1;

  // ── Flash progress bar + overlay on navigation ──────────────────────────
  const flashTransition = useCallback(() => {
    setShowProgressBar(false);
    setShowOverlay(false);
    // Force re-mount of the effects
    requestAnimationFrame(() => {
      setShowProgressBar(true);
      setShowOverlay(true);
      setTimeout(() => {
        setShowProgressBar(false);
        setShowOverlay(false);
      }, 700);
    });
  }, []);

  const navigateByScroll = useCallback(
    (direction: "prev" | "next") => {
      const now = Date.now();
      if (isNavRef.current || now - lastScrollRef.current < COOLDOWN) return;

      const idx = nav.findIndex((n) => pathname.startsWith(n.to));
      if (idx === -1) return;

      const targetIdx =
        direction === "next"
          ? Math.min(idx + 1, nav.length - 1)
          : Math.max(idx - 1, 0);

      if (targetIdx === idx) return;

      setPageTransitionDirection(direction === "next" ? "down" : "up");
      lastScrollRef.current = now;
      isNavRef.current = true;
      flashTransition();
      navigate({ to: nav[targetIdx].to });
      setTimeout(() => { isNavRef.current = false; }, COOLDOWN);
    },
    [nav, pathname, navigate, flashTransition],
  );

  // ── Listeners de scroll / touch / teclado ───────────────────────────────
  useEffect(() => {
    if (!scrollNavEnabled) return;

    let accumulated = 0;
    let resetTimer: ReturnType<typeof setTimeout>;

    const onWheel = (e: WheelEvent) => {
      // Ignora se dentro de elementos com scroll próprio
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-scroll-ignore]") ||
        target.closest("select") ||
        target.closest("[role='listbox']") ||
        target.closest(".recharts-wrapper") ||
        target.closest("[data-radix-scroll-area-viewport]")
      ) return;

      accumulated += e.deltaY;
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { accumulated = 0; }, 300);

      if (Math.abs(accumulated) < DELTA_MIN) return;
      const dir = accumulated > 0 ? "next" : "prev";
      accumulated = 0;
      navigateByScroll(dir);
    };

    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY; };
    const onTouchEnd   = (e: TouchEvent) => {
      const dy = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(dy) < 60) return;
      navigateByScroll(dy > 0 ? "next" : "prev");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowDown" || e.key === "PageDown") navigateByScroll("next");
      if (e.key === "ArrowUp"   || e.key === "PageUp")   navigateByScroll("prev");
    };

    window.addEventListener("wheel",      onWheel,      { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend",   onTouchEnd,   { passive: true });
    window.addEventListener("keydown",    onKeyDown);
    return () => {
      window.removeEventListener("wheel",      onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend",   onTouchEnd);
      window.removeEventListener("keydown",    onKeyDown);
      clearTimeout(resetTimer);
    };
  }, [scrollNavEnabled, navigateByScroll]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // ── Sidebar compartilhada ─────────────────────────────────────────────────
  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/40">
        <div className="logo-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg animate-float shrink-0">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[15px] font-bold leading-tight text-foreground tracking-tight">Isoflex</div>
          <div className="text-[11px] text-muted-foreground leading-tight font-medium">Gestão Corporativa</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" data-scroll-ignore>
        {nav.map((n, i) => {
          const Icon   = n.icon;
          const active = pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => {
                const idx = nav.findIndex((x) => x.to === n.to);
                setPageTransitionDirection(idx >= currentIndex ? "down" : "up");
                flashTransition();
                setOpen(false);
              }}
              style={{ animationDelay: `${i * 35}ms` }}
              className={cn(
                "nav-item animate-enter flex items-center gap-3 px-3 py-2.5 text-sm font-medium w-full",
                active
                  ? "nav-item-active text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 shrink-0",
                  active ? "bg-white/20 text-white" : "bg-muted/60 text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/30 p-3 space-y-1">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/40">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0 uppercase">
            {(me?.profile?.full_name || me?.email || "U")[0]}
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
      {/* ── Global progress bar + overlay swipe ── */}
      {showProgressBar && <PageProgressBar />}
      {showOverlay      && <PageOverlay />}

      <div className="flex">

        {/* ── Sidebar desktop ── */}
        <aside className="hidden lg:flex sticky top-0 h-screen w-64 shrink-0 flex-col glass-sidebar animate-enter">
          <SidebarContent />
        </aside>

        {/* ── Overlay mobile ── */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* ── Mobile drawer ── */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 flex flex-col glass-strong shadow-2xl lg:hidden",
            "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors z-10"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <SidebarContent />
        </aside>

        {/* ── Main ── */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Header */}
          <header className="sticky top-0 z-30 glass-strong border-b border-white/40 px-4 py-3 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted transition-all duration-200 active:scale-95"
                  onClick={() => setOpen(true)}
                >
                  <Menu className="h-5 w-5 text-muted-foreground" />
                </button>
                <div className="lg:hidden flex items-center gap-2">
                  <div className="logo-gradient flex h-8 w-8 items-center justify-center rounded-lg text-white shadow">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold">Isoflex</span>
                </div>
                <div className="hidden lg:flex items-center gap-2">
                  <span className="text-sm text-muted-foreground/60 font-medium">Isoflex</span>
                  <span className="text-muted-foreground/30 select-none">/</span>
                  <span className="text-sm font-semibold text-foreground capitalize">
                    {pathname.replace("/", "") || "Dashboard"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Data */}
                <div className="hidden sm:flex items-center text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-white/40">
                  {new Date().toLocaleDateString("pt-BR", {
                    weekday: "short", day: "2-digit", month: "short", year: "numeric",
                  })}
                </div>

                {/* ── Botão toggle scroll-nav (igloo style) ── */}
                <div className="relative">
                  <button
                    id="scroll-nav-toggle"
                    onClick={toggleScrollNav}
                    onMouseEnter={() => setShowHint(true)}
                    onMouseLeave={() => setShowHint(false)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
                      "transition-all duration-250 hover:scale-105 active:scale-95 select-none cursor-pointer",
                      scrollNavEnabled
                        ? "scroll-toggle-on"
                        : "bg-muted/60 text-muted-foreground border-white/40 hover:bg-muted",
                    )}
                  >
                    <Mouse className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">
                      {scrollNavEnabled ? "Scroll ON" : "Scroll OFF"}
                    </span>
                  </button>

                  {/* Tooltip */}
                  {showHint && (
                    <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl glass-strong border border-white/50 p-3 shadow-xl animate-scale-in pointer-events-none">
                      <p className="text-[11px] font-semibold text-foreground mb-1">
                        {scrollNavEnabled ? "🖱️ Navegação por scroll ativa" : "🖱️ Navegação por scroll inativa"}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {scrollNavEnabled
                          ? "Role o mouse para navegar entre as páginas — efeito igloo.inc."
                          : "Clique para ativar a navegação por scroll entre páginas."}
                      </p>
                      {scrollNavEnabled && (
                        <div className="mt-2 space-y-1 text-[10px] text-muted-foreground/70 border-t border-black/5 pt-2">
                          <div className="flex items-center gap-1.5">
                            <ChevronUp className="h-3 w-3 text-primary" />
                            <span>Scroll ↑ = página anterior (desliza p/ baixo)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <ChevronDown className="h-3 w-3 text-primary" />
                            <span>Scroll ↓ = próxima página (desliza p/ cima)</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground/50">
                            <span className="font-mono bg-muted px-1 rounded text-[9px]">↑↓</span>
                            <span>Setas do teclado também funcionam</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground/50">
                            <span className="font-mono bg-muted px-1 rounded text-[9px]">👆</span>
                            <span>Swipe vertical no mobile</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* ── Conteúdo com transição igloo.inc ── */}
          <main className="flex-1 relative overflow-hidden">
            <div
              key={pathname}
              className={cn(
                "page-transition-enter",
                getPageTransitionDirection() === "down"
                  ? "page-enter-from-bottom"
                  : "page-enter-from-top",
              )}
            >
              <div className="p-4 pb-20 lg:p-8 lg:pb-24" data-scroll-ignore>
                <Outlet />
              </div>
            </div>
          </main>

          {/* ── Controles flutuantes igloo-style ── */}
          {scrollNavEnabled && nav.length > 0 && (
            <div className="fixed right-5 bottom-6 z-40 flex flex-col items-center gap-3">

              {/* Botão para cima */}
              <button
                disabled={!hasPrev}
                onClick={() => navigateByScroll("prev")}
                className="igloo-nav-btn"
                title="Página anterior"
              >
                <ChevronUp className="h-4 w-4" />
              </button>

              {/* Dots de paginação — igloo style */}
              <div className="flex flex-col items-center gap-[6px]">
                {nav.map((n, i) => (
                  <button
                    key={n.to}
                    onClick={() => {
                      setPageTransitionDirection(i >= currentIndex ? "down" : "up");
                      flashTransition();
                      navigate({ to: n.to });
                    }}
                    title={n.label}
                    className={cn(
                      "igloo-dot relative group",
                      i === currentIndex && "igloo-dot-active",
                    )}
                  >
                    {/* Label tooltip on hover */}
                    <span className="igloo-dot-label">
                      {n.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Botão para baixo */}
              <button
                disabled={!hasNext}
                onClick={() => navigateByScroll("next")}
                className="igloo-nav-btn"
                title="Próxima página"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── Scroll hint — bottom center (apenas quando scroll ON e não é última página) ── */}
          {scrollNavEnabled && hasNext && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 pointer-events-none select-none opacity-50">
              <span className="text-[10px] font-semibold text-muted-foreground">scroll</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground igloo-scroll-hint" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
