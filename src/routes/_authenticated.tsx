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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

const allNav: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  mod: AppModule;
}[] = [
  { to: "/dashboard",     label: "Dashboard",      icon: LayoutDashboard, mod: "dashboard" },
  { to: "/lancamento",    label: "Lançamento",      icon: PlusSquare,      mod: "lancamento" },
  { to: "/historico",     label: "Histórico",       icon: History,         mod: "historico" },
  { to: "/metas",         label: "Metas",           icon: Target,          mod: "metas" },
  { to: "/relatorio",     label: "Relatório",       icon: FileText,        mod: "relatorio" },
  { to: "/top-produtos",  label: "TOP 10 Produtos", icon: Trophy,          mod: "top_produtos" },
  { to: "/mercadolivre",  label: "Mercado Livre",   icon: TrendingUp,      mod: "top_produtos" },
  { to: "/marketing",     label: "Marketing",       icon: Megaphone,       mod: "marketing" },
  { to: "/comercial",     label: "Comercial",       icon: Briefcase,       mod: "comercial" },
  { to: "/financeiro",    label: "Financeiro",      icon: DollarSign,      mod: "financeiro" },
  { to: "/engenharia",    label: "Engenharia",      icon: Wrench,          mod: "engenharia" },
  { to: "/configuracoes", label: "Configurações",   icon: Cog,             mod: "configuracoes" },
  { to: "/usuarios",      label: "Usuários",        icon: ShieldCheck,     mod: "usuarios" },
];

// ── Framer Motion variants ────────────────────────────────────────────────────
const makeVariants = (dir: "up" | "down") => ({
  initial: {
    opacity: 0,
    y: dir === "down" ? 60 : -60,
    scale: 0.97,
    filter: "blur(8px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.65,
      ease: [0.76, 0, 0.24, 1],
    },
  },
  exit: {
    opacity: 0,
    y: dir === "down" ? -50 : 50,
    scale: 0.97,
    filter: "blur(6px)",
    transition: {
      duration: 0.42,
      ease: [0.76, 0, 0.24, 1],
    },
  },
});

function Layout() {
  const navigate  = useNavigate();
  const pathname  = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen]         = useState(false);
  const [showHint, setShowHint] = useState(false);
  const { data: me } = useMe();

  // ── Sidebar collapse (persistido) ────────────────────────────────────────
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; }
    catch { return false; }
  });

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  }, []);

  // ── Sidebar hide/show completely (persistido) ────────────────────────────
  const [sidebarHidden, setSidebarHidden] = useState<boolean>(() => {
    try { return localStorage.getItem("sidebar-hidden") === "true"; }
    catch { return false; }
  });

  const toggleSidebarHidden = useCallback(() => {
    setSidebarHidden((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebar-hidden", String(next)); } catch {}
      return next;
    });
  }, []);

  // ── Scroll-nav toggle (persistido) ────────────────────────────────────────
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

  // ── Transition direction state ────────────────────────────────────────────
  const [transDir, setTransDir] = useState<"up" | "down">("down");

  const isMaster  = me?.roles.includes("admin_master") ?? false;
  const nav       = allNav.filter((n) => hasModule(me?.permissions, n.mod, isMaster));
  const currentIndex = nav.findIndex((n) => pathname.startsWith(n.to));
  const hasPrev   = currentIndex > 0;
  const hasNext   = currentIndex < nav.length - 1;

  // ── SCROLL FIX: useRef estável para nav e pathname ─────────────────────────
  // Esses refs são atualizados a cada render mas não causam re-registro do listener
  const navRef          = useRef(nav);
  const pathnameRef     = useRef(pathname);
  const lastScrollRef   = useRef(0);
  const isNavRef        = useRef(false);
  const navigateRef     = useRef(navigate);
  const transDirRef     = useRef(setTransDir);
  const scrollEnabledRef = useRef(scrollNavEnabled);

  useEffect(() => { navRef.current = nav; });
  useEffect(() => { pathnameRef.current = pathname; });
  useEffect(() => { navigateRef.current = navigate; });
  useEffect(() => { scrollEnabledRef.current = scrollNavEnabled; });

  const COOLDOWN  = 650;
  const DELTA_MIN = 30; // reduzido — mais sensível

  // navigateByScroll usa apenas refs — sem dependências de closure stale
  const navigateByScroll = useCallback((direction: "prev" | "next") => {
    const now = Date.now();
    if (isNavRef.current || now - lastScrollRef.current < COOLDOWN) return;

    const currentNav  = navRef.current;
    const currentPath = pathnameRef.current;
    const idx = currentNav.findIndex((n) => currentPath.startsWith(n.to));
    if (idx === -1) return;

    const targetIdx =
      direction === "next"
        ? Math.min(idx + 1, currentNav.length - 1)
        : Math.max(idx - 1, 0);
    if (targetIdx === idx) return;

    const dir = direction === "next" ? "down" : "up";
    setTransDir(dir);
    lastScrollRef.current = now;
    isNavRef.current = true;
    navigateRef.current({ to: currentNav[targetIdx].to });
    setTimeout(() => { isNavRef.current = false; }, COOLDOWN);
  }, []); // ← zero deps: seguro, usa só refs

  // ── Listeners registrados UMA ÚNICA VEZ ──────────────────────────────────
  useEffect(() => {
    let accumulated = 0;
    let resetTimer: ReturnType<typeof setTimeout>;

    const onWheel = (e: WheelEvent) => {
      if (!scrollEnabledRef.current) return;

      const target = e.target as HTMLElement;
      if (
        target.closest("[data-scroll-ignore]") ||
        target.closest("select")               ||
        target.closest("[role='listbox']")     ||
        target.closest(".recharts-wrapper")    ||
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
      if (!scrollEnabledRef.current) return;
      navigateByScroll(dy > 0 ? "next" : "prev");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!scrollEnabledRef.current) return;
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
  }, [navigateByScroll]); // navigateByScroll tem zero deps → estável

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  // ── Sidebar content ───────────────────────────────────────────────────────
  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {/* Logo */}
      <div className={cn(
        "flex items-center justify-between border-b border-white/40 shrink-0 relative",
        collapsed && !mobile ? "px-3 py-5 justify-center" : "px-5 py-5",
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="logo-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg animate-float shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          {(!collapsed || mobile) && (
            <div>
              <div className="text-[15px] font-bold leading-tight text-foreground tracking-tight text-left">Isoflex</div>
              <div className="text-[11px] text-muted-foreground leading-tight font-medium text-left">Gestão Corporativa</div>
            </div>
          )}
        </div>
        {!mobile && !collapsed && (
          <button
            onClick={toggleSidebarHidden}
            className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-all duration-200 select-none cursor-pointer"
            title="Ocultar menu"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={cn(
        "flex-1 overflow-y-auto py-4 space-y-0.5",
        collapsed && !mobile ? "px-1.5" : "px-3",
      )} data-scroll-ignore>
        {nav.map((n, i) => {
          const Icon   = n.icon;
          const active = pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => {
                const idx = nav.findIndex((x) => x.to === n.to);
                setTransDir(idx >= currentIndex ? "down" : "up");
                setOpen(false);
              }}
              style={{ animationDelay: `${i * 30}ms` }}
              title={collapsed && !mobile ? n.label : undefined}
              className={cn(
                "nav-item animate-enter flex items-center gap-3 px-3 py-2.5 text-sm font-medium w-full",
                collapsed && !mobile && "justify-center px-2",
                active
                  ? "nav-item-active text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 shrink-0",
                active ? "bg-white/20 text-white" : "bg-muted/60 text-muted-foreground",
              )}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              {(!collapsed || mobile) && <span className="truncate">{n.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/30 p-3 space-y-1 shrink-0">
        {(!collapsed || mobile) && (
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
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          title={collapsed && !mobile ? "Sair" : undefined}
          className={cn(
            "w-full text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors duration-200",
            collapsed && !mobile ? "justify-center px-0" : "justify-start",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {(!collapsed || mobile) && <span className="ml-2">Sair</span>}
        </Button>

        {/* ── Botão colapsar (desktop only) ── */}
        {!mobile && (
          <button
            onClick={toggleCollapse}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40 transition-all duration-200 select-none"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed
              ? <ChevronRight className="h-3.5 w-3.5" />
              : (
                <>
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Recolher</span>
                </>
              )
            }
          </button>
        )}
      </div>
    </>
  );

  const variants = makeVariants(transDir);

  return (
    <div className="min-h-screen">
      <div className="flex">

        {/* Botão flutuante para mostrar a sidebar quando oculta */}
        <AnimatePresence>
          {sidebarHidden && (
            <motion.button
              key="show-sidebar-btn"
              initial={{ opacity: 0, scale: 0.8, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={toggleSidebarHidden}
              className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/55 bg-white/88 text-foreground shadow-lg backdrop-blur-md cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 hover:text-primary hover:border-primary/35"
              title="Mostrar menu"
            >
              <ChevronRight className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Sidebar desktop — animação de largura ── */}
        <motion.aside
          layout
          animate={{ width: sidebarHidden ? 0 : (collapsed ? 68 : 256) }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:flex sticky top-0 h-screen shrink-0 flex-col glass-sidebar animate-enter overflow-hidden"
        >
          <SidebarContent />
        </motion.aside>

        {/* ── Mobile overlay ── */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* ── Mobile drawer ── */}
        <AnimatePresence>
          {open && (
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col glass-strong shadow-2xl lg:hidden"
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors z-10"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
              <SidebarContent mobile />
            </motion.aside>
          )}
        </AnimatePresence>

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
                    {nav.find((n) => pathname.startsWith(n.to))?.label || "Dashboard"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-white/40">
                  {new Date().toLocaleDateString("pt-BR", {
                    weekday: "short", day: "2-digit", month: "short", year: "numeric",
                  })}
                </div>

                {/* Scroll toggle */}
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

                  <AnimatePresence>
                    {showHint && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl glass-strong border border-white/50 p-3 shadow-xl pointer-events-none"
                      >
                        <p className="text-[11px] font-semibold text-foreground mb-1">
                          {scrollNavEnabled ? "🖱️ Scroll ativo — igloo style" : "🖱️ Scroll inativo"}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {scrollNavEnabled
                            ? "Role o mouse para navegar entre páginas com efeito cinematográfico."
                            : "Clique para ativar a navegação por scroll."}
                        </p>
                        {scrollNavEnabled && (
                          <div className="mt-2 space-y-1 text-[10px] text-muted-foreground/70 border-t border-black/5 pt-2">
                            <div className="flex items-center gap-1.5">
                              <ChevronUp className="h-3 w-3 text-primary" /><span>Scroll ↑ = página anterior</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <ChevronDown className="h-3 w-3 text-primary" /><span>Scroll ↓ = próxima página</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground/50">
                              <span className="font-mono bg-muted px-1 rounded text-[9px]">↑↓</span>
                              <span>Setas do teclado também funcionam</span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </header>

          {/* ── Conteúdo com Framer Motion AnimatePresence ── */}
          <main className="flex-1 relative overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={pathname}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute inset-0 overflow-y-auto"
              >
                <div className="p-4 pb-24 lg:p-8 lg:pb-28">
                  <Outlet />
                </div>
              </motion.div>
            </AnimatePresence>
          </main>

          {/* ── Controles flutuantes igloo-style ── */}
          {scrollNavEnabled && nav.length > 0 && (
            <div className="fixed right-5 bottom-6 z-40 flex flex-col items-center gap-3">
              <button
                disabled={!hasPrev}
                onClick={() => { setTransDir("up"); navigateByScroll("prev"); }}
                className="igloo-nav-btn"
                title="Página anterior"
              >
                <ChevronUp className="h-4 w-4" />
              </button>

              <div className="flex flex-col items-center gap-[6px]">
                {nav.map((n, i) => (
                  <button
                    key={n.to}
                    onClick={() => {
                      setTransDir(i >= currentIndex ? "down" : "up");
                      navigateByScroll(i > currentIndex ? "next" : "prev");
                      navigateRef.current({ to: n.to });
                    }}
                    title={n.label}
                    className={cn(
                      "igloo-dot relative group",
                      i === currentIndex && "igloo-dot-active",
                    )}
                  >
                    <span className="igloo-dot-label">{n.label}</span>
                  </button>
                ))}
              </div>

              <button
                disabled={!hasNext}
                onClick={() => { setTransDir("down"); navigateByScroll("next"); }}
                className="igloo-nav-btn"
                title="Próxima página"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Scroll hint */}
          {scrollNavEnabled && hasNext && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 pointer-events-none select-none opacity-40">
              <span className="text-[10px] font-semibold text-muted-foreground">scroll</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground igloo-scroll-hint" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
