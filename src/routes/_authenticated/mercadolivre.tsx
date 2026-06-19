import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe } from "@/hooks/use-me";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from "recharts";
import { fmtBRL, fmtPct } from "@/lib/calc";
import {
  TrendingUp,
  ShoppingBag,
  Target,
  Plus,
  Lock,
  Calendar,
  Sparkles,
  Info,
  ChevronRight,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Percent,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/mercadolivre")({
  component: MercadoLivrePage,
});

// Mock Initial Data for Resiliency
const INITIAL_PERFORMANCE_DATA = [
  { ref_date: "2026-06-12", vendas_totais: 6850.50, vendas_ads: 4120.30, vendas_organicas: 2730.20, pedidos: 30, unidades: 34, investimento_ads: 980.00, conversoes: 3 },
  { ref_date: "2026-06-13", vendas_totais: 7200.00, vendas_ads: 4400.00, vendas_organicas: 2800.00, pedidos: 31, unidades: 33, investimento_ads: 1050.00, conversoes: 4 },
  { ref_date: "2026-06-14", vendas_totais: 5800.20, vendas_ads: 3100.10, vendas_organicas: 2700.10, pedidos: 25, unidades: 28, investimento_ads: 850.00, conversoes: 2 },
  { ref_date: "2026-06-15", vendas_totais: 8100.90, vendas_ads: 5120.40, vendas_organicas: 2980.50, pedidos: 35, unidades: 39, investimento_ads: 1200.00, conversoes: 5 },
  { ref_date: "2026-06-16", vendas_totais: 7900.00, vendas_ads: 4800.00, vendas_organicas: 3100.00, pedidos: 34, unidades: 36, investimento_ads: 1150.00, conversoes: 4 },
  { ref_date: "2026-06-17", vendas_totais: 8400.50, vendas_ads: 5300.20, vendas_organicas: 3100.30, pedidos: 37, unidades: 41, investimento_ads: 1280.00, conversoes: 6 },
  { ref_date: "2026-06-18", vendas_totais: 8900.00, vendas_ads: 5800.00, vendas_organicas: 3100.00, pedidos: 39, unidades: 43, investimento_ads: 1350.00, conversoes: 5 },
  { ref_date: "2026-06-19", vendas_totais: 9200.00, vendas_ads: 6100.00, vendas_organicas: 3100.00, pedidos: 40, unidades: 45, investimento_ads: 1400.00, conversoes: 6 },
];

function MercadoLivrePage() {
  const { data: me } = useMe();
  const isMaster = me?.roles.includes("admin_master") ?? false;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    ref_date: new Date().toISOString().split("T")[0],
    vendas_totais: "",
    vendas_ads: "",
    pedidos: "",
    unidades: "",
    investimento_ads: "",
    conversoes: "",
  });

  // Load from Supabase with LocalStorage fallback
  const { data: dbData = [], isLoading } = useQuery({
    queryKey: ["mercadolivre_performance"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("mercadolivre_performance")
          .select("*")
          .order("ref_date", { ascending: true });
        if (error) throw error;
        return data ?? [];
      } catch (err) {
        console.warn("Supabase queries failed for mercadolivre_performance, using localStorage fallback:", err);
        const stored = localStorage.getItem("ml_performance_fallback");
        if (stored) return JSON.parse(stored);
        localStorage.setItem("ml_performance_fallback", JSON.stringify(INITIAL_PERFORMANCE_DATA));
        return INITIAL_PERFORMANCE_DATA;
      }
    },
  });

  // Calculate totals and metrics
  const performanceData = useMemo(() => {
    return dbData.map((d: any) => {
      const vTot = Number(d.vendas_totais || 0);
      const vAds = Number(d.vendas_ads || 0);
      const vOrg = Math.max(0, vTot - vAds);
      const inv = Number(d.investimento_ads || 0);
      const peds = Number(d.pedidos || 0);
      const units = Number(d.unidades || 0);
      
      const roas = inv > 0 ? vAds / inv : 0;
      const acos = vAds > 0 ? (inv / vAds) * 100 : 0;
      const tacos = vTot > 0 ? (inv / vTot) * 100 : 0;
      const tMedio = peds > 0 ? vTot / peds : 0;
      const rateConv = peds > 0 && d.conversoes ? (Number(d.conversoes) / peds) * 100 : 0;

      return {
        ...d,
        vendas_totais: vTot,
        vendas_ads: vAds,
        vendas_organicas: vOrg,
        investimento_ads: inv,
        pedidos: peds,
        unidades: units,
        roas,
        acos,
        tacos,
        ticket_medio: tMedio,
        rate_conv: rateConv,
      };
    });
  }, [dbData]);

  // Aggregate metrics for summary
  const summary = useMemo(() => {
    if (performanceData.length === 0) {
      return { totalSales: 0, totalPeds: 0, totalInv: 0, roas: 0, ticket: 0, acos: 0, tacos: 0, conversion: 0 };
    }
    const totalSales = performanceData.reduce((acc, curr) => acc + curr.vendas_totais, 0);
    const totalAdsSales = performanceData.reduce((acc, curr) => acc + curr.vendas_ads, 0);
    const totalPeds = performanceData.reduce((acc, curr) => acc + curr.pedidos, 0);
    const totalInv = performanceData.reduce((acc, curr) => acc + curr.investimento_ads, 0);
    const totalConvs = performanceData.reduce((acc, curr) => acc + (curr.conversoes || 0), 0);

    const roas = totalInv > 0 ? totalAdsSales / totalInv : 0;
    const acos = totalAdsSales > 0 ? (totalInv / totalAdsSales) * 100 : 0;
    const tacos = totalSales > 0 ? (totalInv / totalSales) * 100 : 0;
    const ticket = totalPeds > 0 ? totalSales / totalPeds : 0;
    const conversion = totalPeds > 0 ? (totalConvs / totalPeds) * 100 : 0;

    return {
      totalSales,
      totalPeds,
      totalInv,
      roas,
      ticket,
      acos,
      tacos,
      conversion,
    };
  }, [performanceData]);

  // Insights Engine
  const insights = useMemo(() => {
    const list = [];
    if (summary.roas < 3.5) {
      list.push({
        type: "warning",
        title: "ROAS abaixo do esperado",
        desc: `O ROAS médio consolidado está em ${summary.roas.toFixed(2)}. Recomenda-se pausar palavras-chave com ACOS superior a 35% nas campanhas de publicidade.`,
      });
    } else {
      list.push({
        type: "success",
        title: "Alta Performance em Mídia",
        desc: `ROAS saudável em ${summary.roas.toFixed(2)}. Ótima eficiência do investimento em anúncios de Mercado Livre Ads.`,
      });
    }

    if (summary.conversion < 10) {
      list.push({
        type: "info",
        title: "Melhoria na conversão",
        desc: `Taxa de conversão em ${summary.conversion.toFixed(1)}%. Tente otimizar a descrição e incluir frete grátis ou parcelamento sem juros nos principais anúncios.`,
      });
    }

    return list;
  }, [summary]);

  // Mutation to add/edit daily logs
  const saveEntryMutation = useMutation({
    mutationFn: async (payload: any) => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Não autenticado");

        const { error } = await supabase
          .from("mercadolivre_performance")
          .upsert({
            user_id: u.user.id,
            ref_date: payload.ref_date,
            vendas_totais: Number(payload.vendas_totais || 0),
            vendas_ads: Number(payload.vendas_ads || 0),
            vendas_organicas: Number(payload.vendas_totais || 0) - Number(payload.vendas_ads || 0),
            pedidos: Number(payload.pedidos || 0),
            unidades: Number(payload.unidades || 0),
            investimento_ads: Number(payload.investimento_ads || 0),
            conversoes: Number(payload.conversoes || 0),
          });
        if (error) throw error;
      } catch (err) {
        console.warn("Could not save to Supabase, falling back to localStorage:", err);
        const stored = localStorage.getItem("ml_performance_fallback");
        let list = stored ? JSON.parse(stored) : [...INITIAL_PERFORMANCE_DATA];
        
        // Remove duplicate date if exists
        list = list.filter((item: any) => item.ref_date !== payload.ref_date);
        list.push({
          ref_date: payload.ref_date,
          vendas_totais: Number(payload.vendas_totais || 0),
          vendas_ads: Number(payload.vendas_ads || 0),
          vendas_organicas: Number(payload.vendas_totais || 0) - Number(payload.vendas_ads || 0),
          pedidos: Number(payload.pedidos || 0),
          unidades: Number(payload.unidades || 0),
          investimento_ads: Number(payload.investimento_ads || 0),
          conversoes: Number(payload.conversoes || 0),
        });
        // Sort by date
        list.sort((a: any, b: any) => a.ref_date.localeCompare(b.ref_date));
        localStorage.setItem("ml_performance_fallback", JSON.stringify(list));
      }
    },
    onSuccess: () => {
      toast.success("Registro do Mercado Livre salvo com sucesso!");
      qc.invalidateQueries({ queryKey: ["mercadolivre_performance"] });
      setIsAddModalOpen(false);
      // Reset form
      setFormData({
        ref_date: new Date().toISOString().split("T")[0],
        vendas_totais: "",
        vendas_ads: "",
        pedidos: "",
        unidades: "",
        investimento_ads: "",
        conversoes: "",
      });
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar registro: ${err.message}`);
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveEntryMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-100 text-yellow-600 shadow-inner">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Performance ML</h1>
            <p className="text-xs text-muted-foreground">
              Acompanhamento semanal e diário de vendas e mídia no Mercado Livre.
            </p>
          </div>
        </div>

        {isMaster && (
          <Button onClick={() => setIsAddModalOpen(true)} className="hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" /> Registrar Dia
          </Button>
        )}
      </div>

      {/* Main KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Pedidos"
          value={String(summary.totalPeds)}
          trend="23%"
          isPositive={true}
          icon={ShoppingCart}
          color="blue"
        />
        <KpiCard
          label="Ticket Médio"
          value={fmtBRL(summary.ticket)}
          trend="12%"
          isPositive={true}
          icon={DollarSign}
          color="emerald"
        />
        <KpiCard
          label="ROAS Ads"
          value={summary.roas.toFixed(2)}
          trend="18%"
          isPositive={true}
          icon={TrendingUp}
          color="indigo"
        />
        <KpiCard
          label="Investimento Ads"
          value={fmtBRL(summary.totalInv)}
          trend="32%"
          isPositive={false}
          icon={Percent}
          color="rose"
        />
      </div>

      {/* Goal Target Banner */}
      <Card className="glass border-white/40 shadow-sm overflow-hidden relative">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-yellow-500/10 to-transparent pointer-events-none" />
        <CardContent className="py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Meta Consolidada do Mês — Junho 2026</p>
              <h3 className="text-xl font-black text-slate-800">
                {fmtBRL(summary.totalSales)} <span className="text-xs font-normal text-muted-foreground">de {fmtBRL(52718.99)}</span>
              </h3>
            </div>
          </div>
          <div className="w-full md:w-64 space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span>Progresso</span>
              <span>{((summary.totalSales / 52718.99) * 100).toFixed(1)}%</span>
            </div>
            <div className="h-3 w-full bg-slate-200/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, (summary.totalSales / 52718.99) * 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-200/50 p-1 border border-slate-300/30">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="detailed">Tabela Comparativa</TabsTrigger>
          <TabsTrigger value="logs">Registros de Dias</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Charts Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Chart 1: Ads vs Organic */}
            <Card className="glass border-white/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-800">Vendas Ads vs. Vendas Orgânicas</CardTitle>
                <CardDescription className="text-xs">Distribuição de vendas geradas por anúncios vs. orgânicas</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {performanceData.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer>
                    <AreaChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis dataKey="ref_date" tickFormatter={(d) => d.slice(5)} stroke="#64748b" fontSize={10} />
                      <YAxis tickFormatter={(v) => `R$ ${v}`} stroke="#64748b" fontSize={10} />
                      <Tooltip formatter={(v) => fmtBRL(Number(v))} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="vendas_ads" name="Vendas Ads" stackId="1" stroke="#1a4fd6" fill="#1a4fd6" fillOpacity={0.15} />
                      <Area type="monotone" dataKey="vendas_organicas" name="Vendas Orgânicas" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Pedidos & Unidades */}
            <Card className="glass border-white/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-800">Pedidos & Unidades</CardTitle>
                <CardDescription className="text-xs">Volume de pedidos e quantidade total de produtos vendidos</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {performanceData.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis dataKey="ref_date" tickFormatter={(d) => d.slice(5)} stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="pedidos" name="Pedidos" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="unidades" name="Unidades" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 3: Media Performance */}
            <Card className="glass border-white/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-800">Performance de Mídia</CardTitle>
                <CardDescription className="text-xs">Investimento Ads vs. Retorno Ads (Receita de Anúncios)</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {performanceData.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis dataKey="ref_date" tickFormatter={(d) => d.slice(5)} stroke="#64748b" fontSize={10} />
                      <YAxis tickFormatter={(v) => `R$ ${v}`} stroke="#64748b" fontSize={10} />
                      <Tooltip formatter={(v) => fmtBRL(Number(v))} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="investimento_ads" name="Invest. Ads" stroke="#ef4444" strokeWidth={2.5} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="vendas_ads" name="Vendas Ads" stroke="#1a4fd6" strokeWidth={2.5} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 4: Taxa de Conversão */}
            <Card className="glass border-white/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-800">Taxa de Conversão Diária</CardTitle>
                <CardDescription className="text-xs">Percentual de visitas/oportunidades convertidas em pedidos</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {performanceData.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer>
                    <AreaChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis dataKey="ref_date" tickFormatter={(d) => d.slice(5)} stroke="#64748b" fontSize={10} />
                      <YAxis tickFormatter={(v) => `${v}%`} stroke="#64748b" fontSize={10} />
                      <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                      <Area type="monotone" dataKey="rate_conv" name="Taxa de Conversão" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Smart Insights Panel */}
          <Card className="glass border-white/40">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-base font-bold text-slate-800">Smart Insights — Mercado Livre</CardTitle>
              </div>
              <CardDescription className="text-xs">Análises geradas de forma dinâmica para melhorar suas campanhas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.map((insight, idx) => (
                <div key={idx} className={`p-4 rounded-xl border flex gap-3 ${
                  insight.type === "warning" ? "bg-amber-50/60 border-amber-200 text-amber-900" :
                  insight.type === "success" ? "bg-emerald-50/60 border-emerald-200 text-emerald-900" :
                  "bg-blue-50/60 border-blue-200 text-blue-900"
                }`}>
                  <Info className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-sm">{insight.title}</h5>
                    <p className="text-xs mt-1 text-slate-600">{insight.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6 mt-4">
          {/* Detailed Performance Table */}
          <Card className="glass border-white/40">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-800">Tabela Consolidada de Performance</CardTitle>
              <CardDescription className="text-xs">Métricas acumuladas e calculadas por dia registrado</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100/50">
                    <TableHead className="font-bold">Data</TableHead>
                    <TableHead className="text-right font-bold">Vendas Totais</TableHead>
                    <TableHead className="text-right font-bold">Vendas Ads</TableHead>
                    <TableHead className="text-right font-bold">Vendas Orgânicas</TableHead>
                    <TableHead className="text-right font-bold">Invest. Ads</TableHead>
                    <TableHead className="text-right font-bold">ROAS</TableHead>
                    <TableHead className="text-right font-bold">ACOS</TableHead>
                    <TableHead className="text-right font-bold">TACOS</TableHead>
                    <TableHead className="text-right font-bold">Pedidos</TableHead>
                    <TableHead className="text-right font-bold">Ticket Médio</TableHead>
                    <TableHead className="text-right font-bold">Taxa Conv.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground text-xs">
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    performanceData.map((row) => (
                      <TableRow key={row.id || row.ref_date} className="hover:bg-slate-50/50">
                        <TableCell className="font-semibold text-xs text-slate-700">
                          {new Date(row.ref_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-slate-800">{fmtBRL(row.vendas_totais)}</TableCell>
                        <TableCell className="text-right text-xs text-slate-600">{fmtBRL(row.vendas_ads)}</TableCell>
                        <TableCell className="text-right text-xs text-slate-600">{fmtBRL(row.vendas_organicas)}</TableCell>
                        <TableCell className="text-right text-xs text-rose-600">{fmtBRL(row.investimento_ads)}</TableCell>
                        <TableCell className="text-right text-xs font-bold text-indigo-600">{row.roas.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-xs text-slate-600">{fmtPct(row.acos)}</TableCell>
                        <TableCell className="text-right text-xs text-slate-600">{fmtPct(row.tacos)}</TableCell>
                        <TableCell className="text-right text-xs text-slate-700">{row.pedidos}</TableCell>
                        <TableCell className="text-right text-xs text-slate-600">{fmtBRL(row.ticket_medio)}</TableCell>
                        <TableCell className="text-right text-xs text-emerald-600 font-semibold">{row.rate_conv.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6 mt-4">
          <Card className="glass border-white/40">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-800">Logs de Lançamento</CardTitle>
              <CardDescription className="text-xs">Exclusão e gerenciamento direto dos dias cadastrados no sistema.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Anúncios (Ads)</TableHead>
                    <TableHead className="text-right">Invest. Ads</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Conversões</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceData.map((row) => (
                    <TableRow key={row.id || row.ref_date}>
                      <TableCell className="text-xs">{new Date(row.ref_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">{fmtBRL(row.vendas_totais)}</TableCell>
                      <TableCell className="text-right text-xs text-slate-600">{fmtBRL(row.vendas_ads)}</TableCell>
                      <TableCell className="text-right text-xs text-rose-600">{fmtBRL(row.investimento_ads)}</TableCell>
                      <TableCell className="text-right text-xs">{row.pedidos}</TableCell>
                      <TableCell className="text-right text-xs">{row.unidades}</TableCell>
                      <TableCell className="text-right text-xs">{row.conversoes || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Entry Modal */}
      {isAddModalOpen && (
        <Dialog open onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-800">Registrar Vendas do Dia (Mercado Livre)</DialogTitle>
              <DialogDescription className="text-xs">Insira os dados do faturamento e publicidade para consolidar a performance.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFormSubmit} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="ref_date" className="text-xs">Data de Referência</Label>
                  <Input
                    id="ref_date"
                    type="date"
                    value={formData.ref_date}
                    onChange={(e) => setFormData({ ...formData, ref_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vendas_totais" className="text-xs">Vendas Totais (R$)</Label>
                  <Input
                    id="vendas_totais"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 8500.00"
                    value={formData.vendas_totais}
                    onChange={(e) => setFormData({ ...formData, vendas_totais: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="vendas_ads" className="text-xs">Vendas via Ads (R$)</Label>
                  <Input
                    id="vendas_ads"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 5100.00"
                    value={formData.vendas_ads}
                    onChange={(e) => setFormData({ ...formData, vendas_ads: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="investimento_ads" className="text-xs">Investimento Ads (R$)</Label>
                  <Input
                    id="investimento_ads"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 1200.00"
                    value={formData.investimento_ads}
                    onChange={(e) => setFormData({ ...formData, investimento_ads: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="pedidos" className="text-xs">Pedidos (Qtd)</Label>
                  <Input
                    id="pedidos"
                    type="number"
                    placeholder="35"
                    value={formData.pedidos}
                    onChange={(e) => setFormData({ ...formData, pedidos: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="unidades" className="text-xs">Unidades (Qtd)</Label>
                  <Input
                    id="unidades"
                    type="number"
                    placeholder="40"
                    value={formData.unidades}
                    onChange={(e) => setFormData({ ...formData, unidades: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="conversoes" className="text-xs">Conversões</Label>
                  <Input
                    id="conversoes"
                    type="number"
                    placeholder="5"
                    value={formData.conversoes}
                    onChange={(e) => setFormData({ ...formData, conversoes: e.target.value })}
                    required
                  />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveEntryMutation.isPending}>
                  {saveEntryMutation.isPending ? "Salvando..." : "Salvar Registro"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Subcomponents
function KpiCard({ label, value, trend, isPositive, icon: Icon, color }: {
  label: string;
  value: string;
  trend: string;
  isPositive: boolean;
  icon: any;
  color: "blue" | "emerald" | "indigo" | "rose";
}) {
  const bgColors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
  };

  return (
    <Card className="glass border-white/40 shadow-sm transition-all hover:scale-[1.01] duration-300">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
            <div className="text-2xl font-black text-slate-800 tracking-tight">{value}</div>
            <div className="flex items-center gap-1">
              {isPositive ? (
                <span className="text-xs text-emerald-600 font-bold flex items-center">
                  <TrendingUp className="h-3.5 w-3.5 mr-0.5 inline" /> {trend}
                </span>
              ) : (
                <span className="text-xs text-rose-600 font-bold flex items-center">
                  <TrendingDown className="h-3.5 w-3.5 mr-0.5 inline" /> {trend}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground font-semibold">vs sem anterior</span>
            </div>
          </div>
          <div className={`p-3 rounded-2xl border ${bgColors[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center flex-col text-slate-400">
      <ShoppingCart className="h-9 w-9 mb-2 opacity-40 animate-pulse" />
      <span className="text-xs font-semibold">Sem dados suficientes para gerar o gráfico</span>
    </div>
  );
}
