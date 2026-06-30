import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  fmtBRL,
  fmtPct,
  daysInMonth,
  monthKey,
  statusColor,
  totalDia,
  isoDate,
  parseISODate,
} from "@/lib/calc";
import {
  ArrowUpRight,
  ArrowDownRight,
  Target,
  TrendingUp,
  Calendar,
  Store,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function DashboardPage() {
  const today = new Date();
  const cur   = monthKey(today);
  const [year,        setYear]        = useState(cur.year);
  const [month,       setMonth]       = useState(cur.month);
  const [selectedDay, setSelectedDay] = useState(isoDate(today));
  const [activeTab,   setActiveTab]   = useState<"faturamento" | "vendas">("faturamento");

  /* ── Queries ── */
  const { data: sales = [] } = useQuery({
    queryKey: ["sales", year, month],
    queryFn: async () => {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const endD  = new Date(year, month, 0);
      const end   = `${year}-${String(month).padStart(2, "0")}-${String(endD.getDate()).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("daily_sales")
        .select("*")
        .gte("sale_date", start)
        .lte("sale_date", end)
        .order("sale_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: goal } = useQuery({
    queryKey: ["goal", year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_goals")
        .select("*")
        .eq("year",  year)
        .eq("month", month)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  /* ── Metas ── */
  const metaLoja      = Number(goal?.meta_loja          ?? 0);
  const metaML        = Number(goal?.meta_mercado_livre ?? 0);
  const diasUteis     = Number(goal?.dias_uteis         ?? 22);
  const totalDiasMes  = daysInMonth(year, month);
  const metaTotal     = metaLoja + metaML;
  const metaDiaLoja   = metaLoja / Math.max(diasUteis,    1);
  const metaDiaML     = metaML   / Math.max(totalDiasMes, 1);

  /* ── Acumulado ── */
  const acumulado = useMemo(() => {
    let loja = 0, ml = 0, full = 0;
    return sales.map((s) => {
      const valorLoja       = activeTab === "faturamento" ? Number(s.faturado_loja) : Number(s.venda_loja);
      const valorMLComFull  = Number(s.mercado_livre) + Number(s.full_value);
      loja  += valorLoja;
      ml    += valorMLComFull;
      full  += Number(s.full_value);
      return {
        date:     parseISODate(s.sale_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        rawDate:  s.sale_date,
        diario:   valorLoja + valorMLComFull,
        loja:     valorLoja,
        ml:       valorMLComFull,
        full:     Number(s.full_value),
        acumLoja: loja,
        acumML:   ml,
        acumFull: full,
        acumTotal: loja + ml,
      };
    });
  }, [sales, activeTab]);

  const totalMes      = acumulado.at(-1)?.acumTotal  ?? 0;
  const totalLojaMes  = acumulado.at(-1)?.acumLoja   ?? 0;
  const totalMLMes    = acumulado.at(-1)?.acumML     ?? 0;

  /* ── KPIs ── */
  const pctMes   = metaTotal > 0 ? (totalMes     / metaTotal) * 100 : 0;
  const pctLoja  = metaLoja  > 0 ? (totalLojaMes / metaLoja)  * 100 : 0;
  const pctML    = metaML    > 0 ? (totalMLMes   / metaML)    * 100 : 0;
  const falta    = Math.max(metaTotal - totalMes, 0);

  const isCurrentMonth  = year === cur.year && month === cur.month;
  const now             = new Date();
  const diaAtual        = isCurrentMonth ? now.getDate() : totalDiasMes;
  const diasRestantes   = Math.max(totalDiasMes - diaAtual, 0);
  const expectedAtual   = metaTotal > 0 ? (metaTotal / totalDiasMes) * diaAtual : 0;
  const pctRitmo        = expectedAtual > 0 ? (totalMes / expectedAtual) * 100 : 0;

  const expectedLoja = metaLoja > 0 ? (metaLoja / Math.max(diasUteis, 1)) * Math.min(diaAtual, diasUteis) : 0;
  const expectedML   = metaML   > 0 ? (metaML   / totalDiasMes)           * diaAtual : 0;
  const ritmoLoja    = expectedLoja > 0 ? (totalLojaMes / expectedLoja) * 100 : 0;
  const ritmoML      = expectedML   > 0 ? (totalMLMes   / expectedML)   * 100 : 0;

  const alertTone: "success" | "warning" | "destructive" | null =
    metaTotal === 0 ? null
    : pctMes >= 100  ? "success"
    : pctRitmo >= 90 ? "warning"
    : "destructive";

  /* ── Dia selecionado ── */
  const dia      = sales.find((s) => s.sale_date === selectedDay);
  const diaLoja  = dia ? (activeTab === "faturamento" ? Number(dia.faturado_loja) : Number(dia.venda_loja)) : 0;
  const diaML    = dia ? Number(dia.mercado_livre) + Number(dia.full_value) : 0;
  const diaFull  = dia ? Number(dia.full_value) : 0;
  const diaTotal = diaLoja + diaML;
  const pctDiaLoja = metaDiaLoja > 0 ? (diaLoja / metaDiaLoja) * 100 : 0;
  const pctDiaML   = metaDiaML   > 0 ? (diaML   / metaDiaML)   * 100 : 0;

  const { data: me } = useMe();

  /* ── Toast alerta ── */
  const alertedRef = useRef(false);
  useEffect(() => {
    if (!alertTone || alertedRef.current || !isCurrentMonth) return;
    const sessionKey = `goal-alert-${year}-${month}`;
    if (sessionStorage.getItem(sessionKey)) return;
    alertedRef.current = true;
    sessionStorage.setItem(sessionKey, "1");
    if (alertTone === "success") {
      toast.success(`🎉 Meta de ${MONTHS[month - 1]} batida! ${fmtPct(pctMes)} atingido`);
    } else if (alertTone === "warning") {
      toast.warning(`Atenção: ${fmtPct(pctMes)} da meta · ${diasRestantes} dia(s) restante(s)`, {
        description: `Faltam ${fmtBRL(falta)} para atingir a meta`,
      });
    } else {
      toast.error(`Abaixo do ritmo: ${fmtPct(pctRitmo)} do esperado para hoje`, {
        description: `${diasRestantes} dia(s) restante(s) · Faltam ${fmtBRL(falta)}`,
      });
    }
  }, [alertTone, year, month, pctMes, pctRitmo, falta, diasRestantes, isCurrentMonth]);

  /* ────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="animate-enter flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard de Vendas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe a performance comercial em tempo real.
          </p>
          {me?.profile?.last_login && (
            <p className="mt-1 text-xs text-muted-foreground/70">
              Último acesso: {new Date(me.profile.last_login).toLocaleString("pt-BR")}
            </p>
          )}
        </div>

        <div className="animate-enter-2 flex flex-wrap gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-36 glass border-white/40 shadow-sm hover:shadow-md transition-shadow">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24 glass border-white/40 shadow-sm hover:shadow-md transition-shadow">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }).map((_, i) => {
                const y = cur.year - 2 + i;
                return <SelectItem key={y} value={String(y)}>{y}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="animate-enter-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "faturamento" | "vendas")}>
          <TabsList className="glass border border-white/40 shadow-sm p-1 h-auto gap-1">
            <TabsTrigger
              value="faturamento"
              className="flex items-center gap-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md px-5 py-2.5 rounded-lg transition-all duration-250 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Faturamento (Faturado)
            </TabsTrigger>
            <TabsTrigger
              value="vendas"
              className="flex items-center gap-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md px-5 py-2.5 rounded-lg transition-all duration-250 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <Store className="h-4 w-4" />
              Venda Loja (Pedidos)
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Sem meta ── */}
      {!goal && (
        <div className="animate-scale-in">
          <Card className="glass border-warning/30 bg-warning/5 shadow-sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Nenhuma meta configurada para {MONTHS[month - 1]}/{year}.
              </div>
              <Link to="/metas">
                <Button size="sm" variant="outline" className="hover:shadow-md transition-shadow">
                  Configurar metas
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Alert de ritmo ── */}
      {alertTone && (
        <div className="alert-card-enter">
          <Card
            className={cn(
              "glass border-l-4 shadow-sm transition-all duration-300 hover:shadow-md",
              alertTone === "success"     && "border-l-emerald-500 bg-emerald-50/50",
              alertTone === "warning"     && "border-l-amber-500   bg-amber-50/50",
              alertTone === "destructive" && "border-l-rose-500    bg-rose-50/50",
            )}
          >
            <CardContent className="flex flex-wrap items-center gap-4 py-4">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full shadow-sm shrink-0",
                  alertTone === "success"     && "bg-emerald-100 text-emerald-600",
                  alertTone === "warning"     && "bg-amber-100   text-amber-600",
                  alertTone === "destructive" && "bg-rose-100    text-rose-600",
                )}
              >
                {alertTone === "success"     ? <CheckCircle2  className="h-5 w-5" />
                : alertTone === "warning"    ? <AlertTriangle className="h-5 w-5" />
                :                              <XCircle       className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-[220px]">
                <div className="text-sm font-semibold text-foreground">
                  {alertTone === "success"
                    ? `Meta de ${MONTHS[month - 1]} batida 🎉`
                    : alertTone === "warning"
                      ? "Atenção: próximo da meta"
                      : "Abaixo do ritmo da meta"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {fmtPct(pctMes)} da meta · ritmo {fmtPct(pctRitmo)} ·{" "}
                  {isCurrentMonth ? `${diasRestantes} dia(s) restante(s)` : "mês encerrado"} ·{" "}
                  Faltam {fmtBRL(falta)}
                </div>
              </div>
              <Link to="/lancamento">
                <Button
                  size="sm"
                  variant={alertTone === "destructive" ? "default" : "outline"}
                  className="shrink-0 transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  Lançar venda
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            title:    activeTab === "faturamento" ? "Faturado no mês" : "Vendido no mês",
            value:    fmtBRL(totalMes),
            icon:     TrendingUp,
            subtitle: `${acumulado.length} dia(s) lançado(s)`,
            delay:    1,
          },
          {
            title:    "Meta mensal",
            value:    fmtBRL(metaTotal),
            icon:     Target,
            subtitle: `Loja ${fmtBRL(metaLoja)} + ML ${fmtBRL(metaML)}`,
            delay:    2,
          },
          {
            title:    "% Atingido",
            value:    fmtPct(pctMes),
            icon:     pctMes >= 100 ? ArrowUpRight : ArrowDownRight,
            tone:     statusColor(pctMes) as "success" | "warning" | "destructive",
            subtitle: pctMes >= 100 ? "Meta batida!" : `Faltam ${fmtPct(100 - pctMes)}`,
            delay:    3,
          },
          {
            title:    "% Dias decorridos",
            value:    fmtPct((diaAtual / totalDiasMes) * 100),
            icon:     Calendar,
            subtitle: `${diaAtual} de ${totalDiasMes} dias${isCurrentMonth ? ` · ${diasRestantes} restantes` : " · encerrado"}`,
            delay:    4,
          },
          {
            title:    "Atingido vs Decorrido",
            value:    `${(pctMes - (diaAtual / totalDiasMes) * 100 >= 0 ? "+" : "")}${fmtPct(pctMes - (diaAtual / totalDiasMes) * 100)}`,
            icon:     pctMes >= (diaAtual / totalDiasMes) * 100 ? ArrowUpRight : ArrowDownRight,
            tone:     (pctMes >= (diaAtual / totalDiasMes) * 100 ? "success" : pctRitmo >= 90 ? "warning" : "destructive") as "success" | "warning" | "destructive",
            subtitle: `Ritmo: ${fmtPct(pctRitmo)} do esperado`,
            delay:    5,
          },
        ].map((card) => (
          <KpiCard key={card.title} {...card} animDelay={card.delay} />
        ))}
      </div>

      {/* ── Canais ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="animate-enter-6">
          <ChannelProgress
            icon={Store}
            title={activeTab === "faturamento" ? "Loja Virtual (Faturamento)" : "Loja Virtual (Venda/Pedidos)"}
            realizado={totalLojaMes}
            meta={metaLoja}
            pct={pctLoja}
            ritmo={ritmoLoja}
            subtitle={`Meta diária (${diasUteis} dias úteis): ${fmtBRL(metaDiaLoja)}`}
          />
        </div>
        <div className="animate-enter-7">
          <ChannelProgress
            icon={ShoppingBag}
            title="Mercado Livre + Full"
            realizado={totalMLMes}
            meta={metaML}
            pct={pctML}
            ritmo={ritmoML}
            subtitle={`Meta diária (${totalDiasMes} dias totais): ${fmtBRL(metaDiaML)}`}
          />
        </div>
      </div>

      {/* ── Detalhamento do dia ── */}
      <div className="animate-enter-8">
        <Card className="glass custom-shadow border-white/40">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Calendar className="h-4 w-4" />
                  </div>
                  Detalhamento do dia
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground/80 mt-1">
                  Veja o resultado de qualquer dia do mês.
                </CardDescription>
              </div>
              <Input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="max-w-[180px] glass border-white/40 text-sm shadow-sm hover:shadow-md transition-shadow"
              />
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <DayMetric
              title={activeTab === "faturamento" ? "Loja Virtual (Faturamento)" : "Loja Virtual (Vendas)"}
              realizado={diaLoja}
              meta={metaDiaLoja}
              pct={pctDiaLoja}
            />
            <DayMetric
              title="Mercado Livre + Full (diário)"
              realizado={diaML}
              meta={metaDiaML}
              pct={pctDiaML}
            />
            <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 via-primary/8 to-indigo-500/8 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/25">
              <div className="text-xs font-semibold text-primary/80 uppercase tracking-wider">
                Total do dia
              </div>
              <div className="mt-2 text-2xl font-black text-primary animate-number">
                {fmtBRL(diaTotal)}
              </div>
              <div className="mt-2 text-xs font-medium text-muted-foreground space-y-0.5">
                <div>Loja: <span className="font-semibold text-foreground">{fmtBRL(diaLoja)}</span></div>
                <div>ML + Full: <span className="font-semibold text-foreground">{fmtBRL(diaML)}</span></div>
                <div className="text-muted-foreground/60">Full isolado: {fmtBRL(diaFull)}</div>
              </div>
              {!dia && (
                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Sem lançamento para este dia.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Gráficos ── */}
      <div className="animate-enter-8 grid gap-4 lg:grid-cols-2">
        <Card className="glass custom-shadow border-white/40 hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              {activeTab === "faturamento" ? "Faturamento diário por canal" : "Volume de venda diário por canal"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground/80">
              Contribuição de cada canal por dia
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={acumulado}>
                <defs>
                  <linearGradient id="colorLoja" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1a4fd6" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#1a4fd6" stopOpacity={0.45}/>
                  </linearGradient>
                  <linearGradient id="colorML" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.45}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis
                  fontSize={11}
                  stroke="#94a3b8"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => fmtBRL(v)}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.6)",
                    background: "rgba(255,255,255,0.95)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <ReferenceLine
                  y={metaDiaLoja + metaDiaML}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: "Meta Diária", position: "insideTopRight", fontSize: 10, fill: "#ef4444", fontWeight: "bold" }}
                />
                <Bar dataKey="loja" name="Loja Virtual"       stackId="a" fill="url(#colorLoja)" radius={[0,0,0,0]} />
                <Bar dataKey="ml"   name="Mercado Livre+Full" stackId="a" fill="url(#colorML)"   radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass custom-shadow border-white/40 hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Evolução acumulada vs meta
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground/80">
              Acumulado no mês comparado à meta e ritmo ideal
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <AreaChart
                data={acumulado.map((a) => {
                  const dayNum = parseISODate(a.rawDate).getDate();
                  return { ...a, meta: metaTotal, esperado: (metaTotal / totalDiasMes) * dayNum };
                })}
              >
                <defs>
                  <linearGradient id="colorAcum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.28}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis
                  fontSize={11}
                  stroke="#94a3b8"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => fmtBRL(v)}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.6)",
                    background: "rgba(255,255,255,0.95)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Area
                  type="monotone"
                  dataKey="acumTotal"
                  name="Realizado Acumulado"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorAcum)"
                />
                <Line type="monotone" dataKey="esperado" name="Ritmo Esperado"    stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="meta"     name="Meta Mensal Total" stroke="#1a4fd6" strokeWidth={2} strokeDasharray="6 6" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════
   KPI CARD
═════════════════════════════════════ */
function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
  animDelay = 1,
}: {
  title:     string;
  value:     string;
  subtitle?: string;
  icon:      React.ComponentType<{ className?: string }>;
  tone?:     "success" | "warning" | "destructive";
  animDelay?: number;
}) {
  const toneClasses =
    tone === "success"     ? "bg-emerald-50  text-emerald-600 border-emerald-100"
    : tone === "warning"   ? "bg-amber-50    text-amber-600   border-amber-100"
    : tone === "destructive" ? "bg-rose-50   text-rose-600    border-rose-100"
    : "bg-primary/8 text-primary border-primary/15";

  const glowColor =
    tone === "success"     ? "hover:shadow-emerald-100"
    : tone === "warning"   ? "hover:shadow-amber-100"
    : tone === "destructive" ? "hover:shadow-rose-100"
    : "";

  return (
    <Card className={cn("kpi-card card-hover-effect custom-shadow glass border-white/50 transition-all duration-300", glowColor, `animate-enter-${animDelay}`)}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground/70">
              {title}
            </div>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-foreground animate-number">
              {value}
            </div>
            {subtitle && (
              <div className="mt-1 text-xs text-muted-foreground/70 leading-relaxed">
                {subtitle}
              </div>
            )}
          </div>
          <div
            className={cn(
              "kpi-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300",
              toneClasses,
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═════════════════════════════════════
   CHANNEL PROGRESS
═════════════════════════════════════ */
function ChannelProgress({
  icon: Icon,
  title,
  realizado,
  meta,
  pct,
  ritmo,
  subtitle,
}: {
  icon:      React.ComponentType<{ className?: string }>;
  title:     string;
  realizado: number;
  meta:      number;
  pct:       number;
  ritmo:     number;
  subtitle:  string;
}) {
  const tone = statusColor(pct);
  const barColor =
    tone === "success"     ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
    : tone === "warning"   ? "bg-gradient-to-r from-amber-500   to-amber-400"
    : "bg-gradient-to-r from-rose-500 to-rose-400";

  const trackColor =
    tone === "success"     ? "bg-emerald-50"
    : tone === "warning"   ? "bg-amber-50"
    : "bg-rose-50";

  return (
    <Card className="card-hover-effect custom-shadow glass border-white/50 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Icon className="h-3.5 w-3.5" />
              </div>
              {title}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground/70 mt-1">{subtitle}</CardDescription>
          </div>
          <PremiumStatusBadge pct={ritmo} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/40 p-2.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Realizado</div>
            <div className="mt-0.5 text-sm font-bold text-foreground">{fmtBRL(realizado)}</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-2.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Meta</div>
            <div className="mt-0.5 text-sm font-bold text-foreground">{fmtBRL(meta)}</div>
          </div>
        </div>
        <div className={cn("h-3 w-full overflow-hidden rounded-full", trackColor)}>
          <div
            className={cn("h-full rounded-full progress-bar-animated shadow-sm", barColor)}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Progresso do mês</span>
          <span className="text-sm font-bold text-foreground">{fmtPct(pct)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═════════════════════════════════════
   DAY METRIC
═════════════════════════════════════ */
function DayMetric({
  title,
  realizado,
  meta,
  pct,
}: {
  title:     string;
  realizado: number;
  meta:      number;
  pct:       number;
}) {
  const tone = statusColor(pct);
  const borderColor =
    tone === "success"     ? "border-emerald-200/60 hover:border-emerald-300/60"
    : tone === "warning"   ? "border-amber-200/60   hover:border-amber-300/60"
    : "border-rose-200/60   hover:border-rose-300/60";
  const bgColor =
    tone === "success"     ? "from-emerald-50/60 to-transparent"
    : tone === "warning"   ? "from-amber-50/60   to-transparent"
    : "from-rose-50/60     to-transparent";

  return (
    <div className={cn(
      "rounded-xl border bg-gradient-to-br p-4 transition-all duration-300",
      "hover:shadow-md hover:-translate-y-0.5 cursor-default",
      borderColor, bgColor,
    )}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-muted-foreground">{title}</div>
        <PremiumStatusBadge pct={pct} />
      </div>
      <div className="mt-2.5 text-xl font-bold text-foreground animate-number">{fmtBRL(realizado)}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Meta: <span className="font-semibold text-foreground">{fmtBRL(meta)}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
        <div
          className={cn(
            "h-full rounded-full progress-bar-animated",
            tone === "success" ? "bg-emerald-500" : tone === "warning" ? "bg-amber-500" : "bg-rose-500",
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="mt-1.5 text-xs">
        {meta - realizado > 0 ? (
          <span className="text-muted-foreground">
            Falta: <span className="font-semibold text-foreground">{fmtBRL(meta - realizado)}</span>
          </span>
        ) : (
          <span className="font-semibold text-emerald-600">
            Meta batida (+{fmtBRL(realizado - meta)})
          </span>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════
   PREMIUM STATUS BADGE
═════════════════════════════════════ */
function PremiumStatusBadge({ pct }: { pct: number }) {
  const tone = statusColor(pct);
  if (tone === "success")
    return <span className="status-badge status-badge-success">✓ Bateu Meta</span>;
  if (tone === "warning")
    return <span className="status-badge status-badge-warning">⚡ Atenção</span>;
  return <span className="status-badge status-badge-danger">↓ Abaixo</span>;
}

} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  fmtBRL,
  fmtPct,
  daysInMonth,
  monthKey,
  statusColor,
  totalDia,
  isoDate,
  parseISODate,
} from "@/lib/calc";
import {
  ArrowUpRight,
  ArrowDownRight,
  Target,
  TrendingUp,
  Calendar,
  Store,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function DashboardPage() {
  const today = new Date();
  const cur   = monthKey(today);
  const [year,        setYear]        = useState(cur.year);
  const [month,       setMonth]       = useState(cur.month);
  const [selectedDay, setSelectedDay] = useState(isoDate(today));
  const [activeTab,   setActiveTab]   = useState<"faturamento" | "vendas">("faturamento");

  /* ── Queries ── */
  const { data: sales = [] } = useQuery({
    queryKey: ["sales", year, month],
    queryFn: async () => {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const endD  = new Date(year, month, 0);
      const end   = `${year}-${String(month).padStart(2, "0")}-${String(endD.getDate()).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("daily_sales")
        .select("*")
        .gte("sale_date", start)
        .lte("sale_date", end)
        .order("sale_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: goal } = useQuery({
    queryKey: ["goal", year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_goals")
        .select("*")
        .eq("year",  year)
        .eq("month", month)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  /* ── Metas ── */
  const metaLoja      = Number(goal?.meta_loja          ?? 0);
  const metaML        = Number(goal?.meta_mercado_livre ?? 0);
  const diasUteis     = Number(goal?.dias_uteis         ?? 22);
  const totalDiasMes  = daysInMonth(year, month);
  const metaTotal     = metaLoja + metaML;
  const metaDiaLoja   = metaLoja / Math.max(diasUteis,    1);
  const metaDiaML     = metaML   / Math.max(totalDiasMes, 1);

  /* ── Acumulado ── */
  const acumulado = useMemo(() => {
    let loja = 0, ml = 0, full = 0;
    return sales.map((s) => {
      const valorLoja       = activeTab === "faturamento" ? Number(s.faturado_loja) : Number(s.venda_loja);
      const valorMLComFull  = Number(s.mercado_livre) + Number(s.full_value);
      loja  += valorLoja;
      ml    += valorMLComFull;
      full  += Number(s.full_value);
      return {
        date:     parseISODate(s.sale_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        rawDate:  s.sale_date,
        diario:   valorLoja + valorMLComFull,
        loja:     valorLoja,
        ml:       valorMLComFull,
        full:     Number(s.full_value),
        acumLoja: loja,
        acumML:   ml,
        acumFull: full,
        acumTotal: loja + ml,
      };
    });
  }, [sales, activeTab]);

  const totalMes      = acumulado.at(-1)?.acumTotal  ?? 0;
  const totalLojaMes  = acumulado.at(-1)?.acumLoja   ?? 0;
  const totalMLMes    = acumulado.at(-1)?.acumML     ?? 0;

  /* ── KPIs ── */
  const pctMes   = metaTotal > 0 ? (totalMes     / metaTotal) * 100 : 0;
  const pctLoja  = metaLoja  > 0 ? (totalLojaMes / metaLoja)  * 100 : 0;
  const pctML    = metaML    > 0 ? (totalMLMes   / metaML)    * 100 : 0;
  const falta    = Math.max(metaTotal - totalMes, 0);

  const isCurrentMonth  = year === cur.year && month === cur.month;
  const now             = new Date();
  const diaAtual        = isCurrentMonth ? now.getDate() : totalDiasMes;
  const diasRestantes   = Math.max(totalDiasMes - diaAtual, 0);
  const expectedAtual   = metaTotal > 0 ? (metaTotal / totalDiasMes) * diaAtual : 0;
  const pctRitmo        = expectedAtual > 0 ? (totalMes / expectedAtual) * 100 : 0;

  const expectedLoja = metaLoja > 0 ? (metaLoja / Math.max(diasUteis, 1)) * Math.min(diaAtual, diasUteis) : 0;
  const expectedML   = metaML   > 0 ? (metaML   / totalDiasMes)           * diaAtual : 0;
  const ritmoLoja    = expectedLoja > 0 ? (totalLojaMes / expectedLoja) * 100 : 0;
  const ritmoML      = expectedML   > 0 ? (totalMLMes   / expectedML)   * 100 : 0;

  const alertTone: "success" | "warning" | "destructive" | null =
    metaTotal === 0 ? null
    : pctMes >= 100  ? "success"
    : pctRitmo >= 90 ? "warning"
    : "destructive";

  /* ── Dia selecionado ── */
  const dia      = sales.find((s) => s.sale_date === selectedDay);
  const diaLoja  = dia ? (activeTab === "faturamento" ? Number(dia.faturado_loja) : Number(dia.venda_loja)) : 0;
  const diaML    = dia ? Number(dia.mercado_livre) + Number(dia.full_value) : 0;
  const diaFull  = dia ? Number(dia.full_value) : 0;
  const diaTotal = diaLoja + diaML;
  const pctDiaLoja = metaDiaLoja > 0 ? (diaLoja / metaDiaLoja) * 100 : 0;
  const pctDiaML   = metaDiaML   > 0 ? (diaML   / metaDiaML)   * 100 : 0;

  const { data: me } = useMe();

  /* ── Toast alerta ── */
  const alertedRef = useRef(false);
  useEffect(() => {
    if (!alertTone || alertedRef.current || !isCurrentMonth) return;
    const sessionKey = `goal-alert-${year}-${month}`;
    if (sessionStorage.getItem(sessionKey)) return;
    alertedRef.current = true;
    sessionStorage.setItem(sessionKey, "1");
    if (alertTone === "success") {
      toast.success(`🎉 Meta de ${MONTHS[month - 1]} batida! ${fmtPct(pctMes)} atingido`);
    } else if (alertTone === "warning") {
      toast.warning(`Atenção: ${fmtPct(pctMes)} da meta · ${diasRestantes} dia(s) restante(s)`, {
        description: `Faltam ${fmtBRL(falta)} para atingir a meta`,
      });
    } else {
      toast.error(`Abaixo do ritmo: ${fmtPct(pctRitmo)} do esperado para hoje`, {
        description: `${diasRestantes} dia(s) restante(s) · Faltam ${fmtBRL(falta)}`,
      });
    }
  }, [alertTone, year, month, pctMes, pctRitmo, falta, diasRestantes, isCurrentMonth]);

  /* ────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="animate-enter flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard de Vendas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe a performance comercial em tempo real.
          </p>
          {me?.profile?.last_login && (
            <p className="mt-1 text-xs text-muted-foreground/70">
              Último acesso: {new Date(me.profile.last_login).toLocaleString("pt-BR")}
            </p>
          )}
        </div>

        <div className="animate-enter-2 flex flex-wrap gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-36 glass border-white/40 shadow-sm hover:shadow-md transition-shadow">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24 glass border-white/40 shadow-sm hover:shadow-md transition-shadow">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }).map((_, i) => {
                const y = cur.year - 2 + i;
                return <SelectItem key={y} value={String(y)}>{y}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="animate-enter-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "faturamento" | "vendas")}>
          <TabsList className="glass border border-white/40 shadow-sm p-1 h-auto gap-1">
            <TabsTrigger
              value="faturamento"
              className="flex items-center gap-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md px-5 py-2.5 rounded-lg transition-all duration-250 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Faturamento (Faturado)
            </TabsTrigger>
            <TabsTrigger
              value="vendas"
              className="flex items-center gap-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md px-5 py-2.5 rounded-lg transition-all duration-250 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <Store className="h-4 w-4" />
              Venda Loja (Pedidos)
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Sem meta ── */}
      {!goal && (
        <div className="animate-scale-in">
          <Card className="glass border-warning/30 bg-warning/5 shadow-sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Nenhuma meta configurada para {MONTHS[month - 1]}/{year}.
              </div>
              <Link to="/metas">
                <Button size="sm" variant="outline" className="hover:shadow-md transition-shadow">
                  Configurar metas
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Alert de ritmo ── */}
      {alertTone && (
        <div className="alert-card-enter">
          <Card
            className={cn(
              "glass border-l-4 shadow-sm transition-all duration-300 hover:shadow-md",
              alertTone === "success"     && "border-l-emerald-500 bg-emerald-50/50",
              alertTone === "warning"     && "border-l-amber-500   bg-amber-50/50",
              alertTone === "destructive" && "border-l-rose-500    bg-rose-50/50",
            )}
          >
            <CardContent className="flex flex-wrap items-center gap-4 py-4">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full shadow-sm shrink-0",
                  alertTone === "success"     && "bg-emerald-100 text-emerald-600",
                  alertTone === "warning"     && "bg-amber-100   text-amber-600",
                  alertTone === "destructive" && "bg-rose-100    text-rose-600",
                )}
              >
                {alertTone === "success"     ? <CheckCircle2  className="h-5 w-5" />
                : alertTone === "warning"    ? <AlertTriangle className="h-5 w-5" />
                :                              <XCircle       className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-[220px]">
                <div className="text-sm font-semibold text-foreground">
                  {alertTone === "success"
                    ? `Meta de ${MONTHS[month - 1]} batida 🎉`
                    : alertTone === "warning"
                      ? "Atenção: próximo da meta"
                      : "Abaixo do ritmo da meta"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {fmtPct(pctMes)} da meta · ritmo {fmtPct(pctRitmo)} ·{" "}
                  {isCurrentMonth ? `${diasRestantes} dia(s) restante(s)` : "mês encerrado"} ·{" "}
                  Faltam {fmtBRL(falta)}
                </div>
              </div>
              <Link to="/lancamento">
                <Button
                  size="sm"
                  variant={alertTone === "destructive" ? "default" : "outline"}
                  className="shrink-0 transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  Lançar venda
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            title:    activeTab === "faturamento" ? "Faturado no mês" : "Vendido no mês",
            value:    fmtBRL(totalMes),
            icon:     TrendingUp,
            subtitle: `${acumulado.length} dia(s) lançado(s)`,
            delay:    1,
          },
          {
            title:    "Meta mensal",
            value:    fmtBRL(metaTotal),
            icon:     Target,
            subtitle: `Loja ${fmtBRL(metaLoja)} + ML ${fmtBRL(metaML)}`,
            delay:    2,
          },
          {
            title:    "% Atingido",
            value:    fmtPct(pctMes),
            icon:     pctMes >= 100 ? ArrowUpRight : ArrowDownRight,
            tone:     statusColor(pctMes) as "success" | "warning" | "destructive",
            subtitle: pctMes >= 100 ? "Meta batida!" : `Faltam ${fmtPct(100 - pctMes)}`,
            delay:    3,
          },
          {
            title:    "% Dias decorridos",
            value:    fmtPct((diaAtual / totalDiasMes) * 100),
            icon:     Calendar,
            subtitle: `${diaAtual} de ${totalDiasMes} dias${isCurrentMonth ? ` · ${diasRestantes} restantes` : " · encerrado"}`,
            delay:    4,
          },
          {
            title:    "Atingido vs Decorrido",
            value:    `${(pctMes - (diaAtual / totalDiasMes) * 100 >= 0 ? "+" : "")}${fmtPct(pctMes - (diaAtual / totalDiasMes) * 100)}`,
            icon:     pctMes >= (diaAtual / totalDiasMes) * 100 ? ArrowUpRight : ArrowDownRight,
            tone:     (pctMes >= (diaAtual / totalDiasMes) * 100 ? "success" : pctRitmo >= 90 ? "warning" : "destructive") as "success" | "warning" | "destructive",
            subtitle: `Ritmo: ${fmtPct(pctRitmo)} do esperado`,
            delay:    5,
          },
        ].map((card) => (
          <KpiCard key={card.title} {...card} animDelay={card.delay} />
        ))}
      </div>

      {/* ── Canais ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="animate-enter-6">
          <ChannelProgress
            icon={Store}
            title={activeTab === "faturamento" ? "Loja Virtual (Faturamento)" : "Loja Virtual (Venda/Pedidos)"}
            realizado={totalLojaMes}
            meta={metaLoja}
            pct={pctLoja}
            ritmo={ritmoLoja}
            subtitle={`Meta diária (${diasUteis} dias úteis): ${fmtBRL(metaDiaLoja)}`}
          />
        </div>
        <div className="animate-enter-7">
          <ChannelProgress
            icon={ShoppingBag}
            title="Mercado Livre + Full"
            realizado={totalMLMes}
            meta={metaML}
            pct={pctML}
            ritmo={ritmoML}
            subtitle={`Meta diária (${totalDiasMes} dias totais): ${fmtBRL(metaDiaML)}`}
          />
        </div>
      </div>

      {/* ── Detalhamento do dia ── */}
      <div className="animate-enter-8">
        <Card className="glass custom-shadow border-white/40">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Calendar className="h-4 w-4" />
                  </div>
                  Detalhamento do dia
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground/80 mt-1">
                  Veja o resultado de qualquer dia do mês.
                </CardDescription>
              </div>
              <Input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="max-w-[180px] glass border-white/40 text-sm shadow-sm hover:shadow-md transition-shadow"
              />
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <DayMetric
              title={activeTab === "faturamento" ? "Loja Virtual (Faturamento)" : "Loja Virtual (Vendas)"}
              realizado={diaLoja}
              meta={metaDiaLoja}
              pct={pctDiaLoja}
            />
            <DayMetric
              title="Mercado Livre + Full (diário)"
              realizado={diaML}
              meta={metaDiaML}
              pct={pctDiaML}
            />
            <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 via-primary/8 to-indigo-500/8 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/25">
              <div className="text-xs font-semibold text-primary/80 uppercase tracking-wider">
                Total do dia
              </div>
              <div className="mt-2 text-2xl font-black text-primary animate-number">
                {fmtBRL(diaTotal)}
              </div>
              <div className="mt-2 text-xs font-medium text-muted-foreground space-y-0.5">
                <div>Loja: <span className="font-semibold text-foreground">{fmtBRL(diaLoja)}</span></div>
                <div>ML + Full: <span className="font-semibold text-foreground">{fmtBRL(diaML)}</span></div>
                <div className="text-muted-foreground/60">Full isolado: {fmtBRL(diaFull)}</div>
              </div>
              {!dia && (
                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Sem lançamento para este dia.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Gráficos ── */}
      <div className="animate-enter-8 grid gap-4 lg:grid-cols-2">
        <Card className="glass custom-shadow border-white/40 hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              {activeTab === "faturamento" ? "Faturamento diário por canal" : "Volume de venda diário por canal"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground/80">
              Contribuição de cada canal por dia
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={acumulado}>
                <defs>
                  <linearGradient id="colorLoja" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1a4fd6" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#1a4fd6" stopOpacity={0.45}/>
                  </linearGradient>
                  <linearGradient id="colorML" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.45}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis
                  fontSize={11}
                  stroke="#94a3b8"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => fmtBRL(v)}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.6)",
                    background: "rgba(255,255,255,0.95)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <ReferenceLine
                  y={metaDiaLoja + metaDiaML}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{ value: "Meta Diária", position: "insideTopRight", fontSize: 10, fill: "#ef4444", fontWeight: "bold" }}
                />
                <Bar dataKey="loja" name="Loja Virtual"       stackId="a" fill="url(#colorLoja)" radius={[0,0,0,0]} />
                <Bar dataKey="ml"   name="Mercado Livre+Full" stackId="a" fill="url(#colorML)"   radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass custom-shadow border-white/40 hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Evolução acumulada vs meta
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground/80">
              Acumulado no mês comparado à meta e ritmo ideal
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <AreaChart
                data={acumulado.map((a) => {
                  const dayNum = parseISODate(a.rawDate).getDate();
                  return { ...a, meta: metaTotal, esperado: (metaTotal / totalDiasMes) * dayNum };
                })}
              >
                <defs>
                  <linearGradient id="colorAcum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.28}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" axisLine={false} tickLine={false} />
                <YAxis
                  fontSize={11}
                  stroke="#94a3b8"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number) => fmtBRL(v)}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.6)",
                    background: "rgba(255,255,255,0.95)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Area
                  type="monotone"
                  dataKey="acumTotal"
                  name="Realizado Acumulado"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorAcum)"
                />
                <Line type="monotone" dataKey="esperado" name="Ritmo Esperado"    stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="meta"     name="Meta Mensal Total" stroke="#1a4fd6" strokeWidth={2} strokeDasharray="6 6" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════
   KPI CARD
═════════════════════════════════════ */
function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
  animDelay = 1,
}: {
  title:     string;
  value:     string;
  subtitle?: string;
  icon:      React.ComponentType<{ className?: string }>;
  tone?:     "success" | "warning" | "destructive";
  animDelay?: number;
}) {
  const toneClasses =
    tone === "success"     ? "bg-emerald-50  text-emerald-600 border-emerald-100"
    : tone === "warning"   ? "bg-amber-50    text-amber-600   border-amber-100"
    : tone === "destructive" ? "bg-rose-50   text-rose-600    border-rose-100"
    : "bg-primary/8 text-primary border-primary/15";

  const glowColor =
    tone === "success"     ? "hover:shadow-emerald-100"
    : tone === "warning"   ? "hover:shadow-amber-100"
    : tone === "destructive" ? "hover:shadow-rose-100"
    : "";

  return (
    <Card className={cn("kpi-card card-hover-effect custom-shadow glass border-white/50 transition-all duration-300", glowColor, `animate-enter-${animDelay}`)}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground/70">
              {title}
            </div>
            <div className="mt-1.5 text-2xl font-bold tracking-tight text-foreground animate-number">
              {value}
            </div>
            {subtitle && (
              <div className="mt-1 text-xs text-muted-foreground/70 leading-relaxed">
                {subtitle}
              </div>
            )}
          </div>
          <div
            className={cn(
              "kpi-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300",
              toneClasses,
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═════════════════════════════════════
   CHANNEL PROGRESS
═════════════════════════════════════ */
function ChannelProgress({
  icon: Icon,
  title,
  realizado,
  meta,
  pct,
  ritmo,
  subtitle,
}: {
  icon:      React.ComponentType<{ className?: string }>;
  title:     string;
  realizado: number;
  meta:      number;
  pct:       number;
  ritmo:     number;
  subtitle:  string;
}) {
  const tone = statusColor(pct);
  const barColor =
    tone === "success"     ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
    : tone === "warning"   ? "bg-gradient-to-r from-amber-500   to-amber-400"
    : "bg-gradient-to-r from-rose-500 to-rose-400";

  const trackColor =
    tone === "success"     ? "bg-emerald-50"
    : tone === "warning"   ? "bg-amber-50"
    : "bg-rose-50";

  return (
    <Card className="card-hover-effect custom-shadow glass border-white/50 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Icon className="h-3.5 w-3.5" />
              </div>
              {title}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground/70 mt-1">{subtitle}</CardDescription>
          </div>
          <PremiumStatusBadge pct={ritmo} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/40 p-2.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Realizado</div>
            <div className="mt-0.5 text-sm font-bold text-foreground">{fmtBRL(realizado)}</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-2.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Meta</div>
            <div className="mt-0.5 text-sm font-bold text-foreground">{fmtBRL(meta)}</div>
          </div>
        </div>
        <div className={cn("h-3 w-full overflow-hidden rounded-full", trackColor)}>
          <div
            className={cn("h-full rounded-full progress-bar-animated shadow-sm", barColor)}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Progresso do mês</span>
          <span className="text-sm font-bold text-foreground">{fmtPct(pct)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═════════════════════════════════════
   DAY METRIC
═════════════════════════════════════ */
function DayMetric({
  title,
  realizado,
  meta,
  pct,
}: {
  title:     string;
  realizado: number;
  meta:      number;
  pct:       number;
}) {
  const tone = statusColor(pct);
  const borderColor =
    tone === "success"     ? "border-emerald-200/60 hover:border-emerald-300/60"
    : tone === "warning"   ? "border-amber-200/60   hover:border-amber-300/60"
    : "border-rose-200/60   hover:border-rose-300/60";
  const bgColor =
    tone === "success"     ? "from-emerald-50/60 to-transparent"
    : tone === "warning"   ? "from-amber-50/60   to-transparent"
    : "from-rose-50/60     to-transparent";

  return (
    <div className={cn(
      "rounded-xl border bg-gradient-to-br p-4 transition-all duration-300",
      "hover:shadow-md hover:-translate-y-0.5 cursor-default",
      borderColor, bgColor,
    )}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-muted-foreground">{title}</div>
        <PremiumStatusBadge pct={pct} />
      </div>
      <div className="mt-2.5 text-xl font-bold text-foreground animate-number">{fmtBRL(realizado)}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Meta: <span className="font-semibold text-foreground">{fmtBRL(meta)}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
        <div
          className={cn(
            "h-full rounded-full progress-bar-animated",
            tone === "success" ? "bg-emerald-500" : tone === "warning" ? "bg-amber-500" : "bg-rose-500",
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

/* ═════════════════════════════════════
   PREMIUM STATUS BADGE
═════════════════════════════════════ */
function PremiumStatusBadge({ pct }: { pct: number }) {
  const tone = statusColor(pct);
  if (tone === "success")
    return <span className="status-badge status-badge-success">✓ Bateu Meta</span>;
  if (tone === "warning")
    return <span className="status-badge status-badge-warning">⚡ Atenção</span>;
  return <span className="status-badge status-badge-danger">↓ Abaixo</span>;
}
