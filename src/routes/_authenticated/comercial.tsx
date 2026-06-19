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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { fmtBRL } from "@/lib/calc";
import {
  Briefcase,
  Plus,
  Users,
  MapPin,
  TrendingUp,
  UserPlus,
  Trash2,
  FolderKanban,
  CheckCircle,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/comercial")({
  component: ComercialPage,
});

const KANBAN_STAGES = [
  { id: "contato", label: "Contato", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "reuniao", label: "Reunião", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { id: "proposta", label: "Proposta", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { id: "negociacao", label: "Negociação", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { id: "ganho", label: "Ganho", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { id: "perdido", label: "Perdido", color: "bg-rose-100 text-rose-800 border-rose-200" },
];

function ComercialPage() {
  const { data: me } = useMe();
  const isMaster = me?.roles.includes("admin_master") ?? false;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("pipeline");
  const [isOppModalOpen, setIsOppModalOpen] = useState(false);
  const [isSaleswomanModalOpen, setIsSaleswomanModalOpen] = useState(false);

  // Form States - Opportunity
  const [oppForm, setOppForm] = useState({
    client_name: "",
    saleswoman_id: "",
    value: "",
    stage: "contato",
    notes: "",
  });

  // Form States - Saleswoman
  const [saleswomanForm, setSaleswomanForm] = useState({
    name: "",
    region: "",
    email: "",
    phone: "",
  });

  // ── Queries - Saleswomen ──
  const { data: saleswomen = [] } = useQuery({
    queryKey: ["comercial_saleswomen"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("comercial_saleswomen")
          .select("*")
          .order("name", { ascending: true });
        if (error) throw error;
        return data ?? [];
      } catch (err) {
        console.warn("Supabase query for comercial_saleswomen failed, using localStorage fallback:", err);
        const stored = localStorage.getItem("com_saleswomen_fallback");
        return stored ? JSON.parse(stored) : [];
      }
    },
  });

  // ── Queries - Opportunities ──
  const { data: opportunities = [] } = useQuery({
    queryKey: ["comercial_opportunities"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("comercial_opportunities")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data ?? [];
      } catch (err) {
        console.warn("Supabase query for comercial_opportunities failed, using localStorage fallback:", err);
        const stored = localStorage.getItem("com_opportunities_fallback");
        return stored ? JSON.parse(stored) : [];
      }
    },
  });

  // ── Mutations - Add Opportunity ──
  const addOppMutation = useMutation({
    mutationFn: async (payload: any) => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Usuário não autenticado");

        const { error } = await supabase
          .from("comercial_opportunities")
          .insert({
            user_id: u.user.id,
            client_name: payload.client_name,
            saleswoman_id: payload.saleswoman_id || null,
            value: Number(payload.value || 0),
            stage: payload.stage,
            notes: payload.notes,
          });
        if (error) throw error;
      } catch (err) {
        console.warn("Fallback to localStorage for addOpportunity:", err);
        const stored = localStorage.getItem("com_opportunities_fallback");
        const list = stored ? JSON.parse(stored) : [];
        list.push({
          id: `o_${Date.now()}`,
          client_name: payload.client_name,
          saleswoman_id: payload.saleswoman_id,
          value: Number(payload.value || 0),
          stage: payload.stage,
          ref_date: new Date().toISOString().split("T")[0],
          notes: payload.notes,
        });
        localStorage.setItem("com_opportunities_fallback", JSON.stringify(list));
      }
    },
    onSuccess: () => {
      toast.success("Oportunidade adicionada com sucesso!");
      qc.invalidateQueries({ queryKey: ["comercial_opportunities"] });
      setIsOppModalOpen(false);
      setOppForm({ client_name: "", saleswoman_id: "", value: "", stage: "contato", notes: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Mutations - Add Saleswoman ──
  const addSaleswomanMutation = useMutation({
    mutationFn: async (payload: any) => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Usuário não autenticado");

        const { error } = await supabase
          .from("comercial_saleswomen")
          .insert({
            user_id: u.user.id,
            name: payload.name,
            region: payload.region,
            email: payload.email,
            phone: payload.phone,
          });
        if (error) throw error;
      } catch (err) {
        console.warn("Fallback to localStorage for addSaleswoman:", err);
        const stored = localStorage.getItem("com_saleswomen_fallback");
        const list = stored ? JSON.parse(stored) : [];
        list.push({
          id: `v_${Date.now()}`,
          name: payload.name,
          region: payload.region,
          email: payload.email,
          phone: payload.phone,
          active: true,
        });
        localStorage.setItem("com_saleswomen_fallback", JSON.stringify(list));
      }
    },
    onSuccess: () => {
      toast.success("Vendedora cadastrada com sucesso!");
      qc.invalidateQueries({ queryKey: ["comercial_saleswomen"] });
      setIsSaleswomanModalOpen(false);
      setSaleswomanForm({ name: "", region: "", email: "", phone: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Mutation - Update Opportunity Stage ──
  const updateOppStageMutation = useMutation({
    mutationFn: async ({ oppId, newStage }: { oppId: string; newStage: string }) => {
      try {
        const { error } = await supabase
          .from("comercial_opportunities")
          .update({ stage: newStage })
          .eq("id", oppId);
        if (error) throw error;
      } catch (err) {
        console.warn("Fallback to localStorage for updateOppStage:", err);
        const stored = localStorage.getItem("com_opportunities_fallback");
        if (stored) {
          const list = JSON.parse(stored);
          const idx = list.findIndex((item: any) => item.id === oppId);
          if (idx !== -1) {
            list[idx].stage = newStage;
            localStorage.setItem("com_opportunities_fallback", JSON.stringify(list));
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comercial_opportunities"] });
      toast.success("Estágio da oportunidade atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Calculate Pipeline statistics
  const kanbanColumns = useMemo(() => {
    const cols: Record<string, { opportunities: any[]; totalValue: number }> = {};
    KANBAN_STAGES.forEach((stg) => {
      cols[stg.id] = { opportunities: [], totalValue: 0 };
    });

    opportunities.forEach((opp: any) => {
      const stage = opp.stage;
      if (cols[stage]) {
        cols[stage].opportunities.push(opp);
        cols[stage].totalValue += Number(opp.value || 0);
      }
    });

    return cols;
  }, [opportunities]);

  // Aggregate Metrics for Analytics Tab
  const chartData = useMemo(() => {
    // 1. Performance by Saleswoman
    const saleswomanMap: Record<string, number> = {};
    saleswomen.forEach((sw: any) => {
      saleswomanMap[sw.id] = 0;
    });

    opportunities.forEach((opp: any) => {
      if (opp.stage === "ganho") {
        const swId = opp.saleswoman_id;
        if (swId && saleswomanMap[swId] !== undefined) {
          saleswomanMap[swId] += Number(opp.value || 0);
        }
      }
    });

    const performance = saleswomen.map((sw: any) => ({
      name: sw.name,
      faturamento: saleswomanMap[sw.id] || 0,
    })).sort((a: any, b: any) => b.faturamento - a.faturamento);

    // 2. Division by Region
    const regionMap: Record<string, number> = {};
    opportunities.forEach((opp: any) => {
      const sw = saleswomen.find((w: any) => w.id === opp.saleswoman_id);
      const region = sw?.region || "Sem Região";
      regionMap[region] = (regionMap[region] || 0) + Number(opp.value || 0);
    });

    const regionData = Object.keys(regionMap).map((region, idx) => ({
      name: region,
      value: regionMap[region],
      color: ["#1a4fd6", "#10b981", "#6366f1", "#f59e0b", "#ef4444"][idx % 5],
    }));

    return {
      performance,
      regionData,
    };
  }, [saleswomen, opportunities]);

  const totalPipelineValue = useMemo(() => {
    return opportunities
      .filter((opp: any) => opp.stage !== "ganho" && opp.stage !== "perdido")
      .reduce((acc, curr) => acc + Number(curr.value || 0), 0);
  }, [opportunities]);

  const totalWonValue = useMemo(() => {
    return opportunities
      .filter((opp: any) => opp.stage === "ganho")
      .reduce((acc, curr) => acc + Number(curr.value || 0), 0);
  }, [opportunities]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 shadow-inner">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Comercial & Vendas</h1>
            <p className="text-xs text-muted-foreground">
              Acompanhamento de oportunidades de vendas, equipe comercial e pipeline.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isMaster && (
            <>
              <Button variant="outline" onClick={() => setIsSaleswomanModalOpen(true)} className="glass border-slate-300 hover:scale-[1.02] transition-all text-slate-700 bg-white">
                <UserPlus className="mr-2 h-4 w-4" /> Nova Vendedora
              </Button>
              <Button onClick={() => setIsOppModalOpen(true)} className="hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground">
                <Plus className="mr-2 h-4 w-4" /> Nova Oportunidade
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass border-white/40">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Valor em Aberto</span>
                <div className="text-2xl font-black text-slate-800">{fmtBRL(totalPipelineValue)}</div>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <FolderKanban className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/40">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Faturamento Ganho</span>
                <div className="text-2xl font-black text-emerald-600">{fmtBRL(totalWonValue)}</div>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/40">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Vendedoras Ativas</span>
                <div className="text-2xl font-black text-slate-800">{saleswomen.length}</div>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-200/50 p-1 border border-slate-300/30">
          <TabsTrigger value="pipeline">Pipeline Kanban</TabsTrigger>
          <TabsTrigger value="team">Equipe Comercial</TabsTrigger>
          <TabsTrigger value="analytics">Análise Comercial</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6 mt-4">
          {/* Kanban Board */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 overflow-x-auto pb-4">
            {KANBAN_STAGES.map((col) => {
              const columnData = kanbanColumns[col.id] || { opportunities: [], totalValue: 0 };
              return (
                <div key={col.id} className="bg-slate-100/50 p-3 rounded-2xl border border-slate-200/60 flex flex-col gap-3 min-w-[200px]">
                  <div className="flex items-center justify-between">
                    <Badge className={col.color}>{col.label}</Badge>
                    <span className="text-[10px] font-bold text-slate-500">{columnData.opportunities.length}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-600">{fmtBRL(columnData.totalValue)}</div>
                  
                  <div className="flex flex-col gap-2 min-h-[350px]">
                    {columnData.opportunities.map((opp: any) => {
                      const sw = saleswomen.find((w: any) => w.id === opp.saleswoman_id);
                      return (
                        <Card key={opp.id} className="p-3 border border-slate-200 bg-white shadow-xs relative group hover:border-indigo-400/80 transition-all">
                          <h4 className="font-bold text-xs text-slate-800">{opp.client_name}</h4>
                          <p className="text-[10px] text-indigo-600 font-bold mt-1">{fmtBRL(opp.value)}</p>
                          <div className="flex items-center justify-between mt-3 text-[9px] text-muted-foreground">
                            <span className="truncate max-w-[90px] font-semibold">{sw?.name || "Sem vendedora"}</span>
                            <span className="bg-slate-100 px-1 py-0.5 rounded text-[8px]">{sw?.region}</span>
                          </div>

                          {/* Fast Action Stage Shift */}
                          {isMaster && (
                            <div className="hidden group-hover:flex absolute right-1.5 top-1.5 bg-slate-50 border rounded shadow-xs p-0.5 gap-1 z-10">
                              <select
                                className="text-[8px] font-semibold border-0 bg-transparent py-0 px-1 focus:ring-0 outline-none"
                                value={opp.stage}
                                onChange={(e) => updateOppStageMutation.mutate({ oppId: opp.id, newStage: e.target.value })}
                              >
                                {KANBAN_STAGES.map((stg) => (
                                  <option key={stg.id} value={stg.id}>{stg.label}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-6 mt-4">
          <Card className="glass border-white/40">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-800 font-sans">Equipe Comercial</CardTitle>
              <CardDescription className="text-xs">Lista de vendedoras ativas e as regiões correspondentes que atendem.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedora</TableHead>
                    <TableHead>Região Atendida</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Celular</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleswomen.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                        Nenhuma vendedora cadastrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    saleswomen.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-semibold text-xs text-slate-800">{row.name}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50/50">
                            <MapPin className="h-3 w-3 mr-1 inline" /> {row.region}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.email || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.phone || "—"}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Ativa</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Chart 1: Performance by Saleswoman */}
            <Card className="glass border-white/40">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800">Faturamento Fechado por Vendedora</CardTitle>
                <CardDescription className="text-xs">Soma de faturamento fechado de oportunidades ganhas por comercial</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {chartData.performance.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={chartData.performance}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                      <YAxis tickFormatter={(v) => `R$ ${v}`} stroke="#64748b" fontSize={10} />
                      <Tooltip formatter={(v) => fmtBRL(Number(v))} />
                      <Bar dataKey="faturamento" fill="#1a4fd6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Division by Region */}
            <Card className="glass border-white/40">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800">Divisão de Portfólio por Região</CardTitle>
                <CardDescription className="text-xs">Percentual financeiro de oportunidades ativas em cada região geográfica</CardDescription>
              </CardHeader>
              <CardContent className="h-72 flex items-center justify-center">
                {chartData.regionData.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={chartData.regionData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {chartData.regionData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => fmtBRL(Number(v))} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Opportunity Dialog */}
      {isOppModalOpen && (
        <Dialog open onOpenChange={setIsOppModalOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-800">Lançar Nova Oportunidade</DialogTitle>
              <DialogDescription className="text-xs">Insira os dados do lead comercial para carregar na pipeline.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addOppMutation.mutate(oppForm);
              }}
              className="space-y-4 py-2"
            >
              <div className="space-y-1">
                <Label htmlFor="client_name" className="text-xs">Cliente / Razão Social</Label>
                <Input
                  id="client_name"
                  type="text"
                  placeholder="Ex: Embraer S.A."
                  value={oppForm.client_name}
                  onChange={(e) => setOppForm({ ...oppForm, client_name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="saleswoman" className="text-xs">Vendedora Responsável</Label>
                  <select
                    id="saleswoman"
                    value={oppForm.saleswoman_id}
                    onChange={(e) => setOppForm({ ...oppForm, saleswoman_id: e.target.value })}
                    required
                    className="block w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="">Selecione...</option>
                    {saleswomen.map((sw: any) => (
                      <option key={sw.id} value={sw.id}>{sw.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="value" className="text-xs">Valor Estimado (R$)</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 55000.00"
                    value={oppForm.value}
                    onChange={(e) => setOppForm({ ...oppForm, value: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="stage" className="text-xs">Estágio Inicial</Label>
                  <select
                    id="stage"
                    value={oppForm.stage}
                    onChange={(e) => setOppForm({ ...oppForm, stage: e.target.value })}
                    className="block w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    {KANBAN_STAGES.map((stg) => (
                      <option key={stg.id} value={stg.id}>{stg.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes" className="text-xs">Observações</Label>
                <Input
                  id="notes"
                  type="text"
                  placeholder="Ex: Reunião técnica com engenharia agendada..."
                  value={oppForm.notes}
                  onChange={(e) => setOppForm({ ...oppForm, notes: e.target.value })}
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsOppModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={addOppMutation.isPending}>
                  {addOppMutation.isPending ? "Salvando..." : "Salvar Oportunidade"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Saleswoman Dialog */}
      {isSaleswomanModalOpen && (
        <Dialog open onOpenChange={setIsSaleswomanModalOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-800">Cadastrar Nova Vendedora</DialogTitle>
              <DialogDescription className="text-xs">Cadastre os dados da comercial para associar oportunidades.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addSaleswomanMutation.mutate(saleswomanForm);
              }}
              className="space-y-4 py-2"
            >
              <div className="space-y-1">
                <Label htmlFor="sw_name" className="text-xs">Nome Completo</Label>
                <Input
                  id="sw_name"
                  type="text"
                  placeholder="Ex: Fernanda Abreu"
                  value={saleswomanForm.name}
                  onChange={(e) => setSaleswomanForm({ ...saleswomanForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sw_region" className="text-xs">Região Geográfica</Label>
                <select
                  id="sw_region"
                  value={saleswomanForm.region}
                  onChange={(e) => setSaleswomanForm({ ...saleswomanForm, region: e.target.value })}
                  required
                  className="block w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="">Selecione...</option>
                  <option value="Sul">Sul</option>
                  <option value="Sudeste">Sudeste</option>
                  <option value="Centro-Oeste">Centro-Oeste</option>
                  <option value="Nordeste & Norte">Nordeste & Norte</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="sw_email" className="text-xs">E-mail Corporativo</Label>
                  <Input
                    id="sw_email"
                    type="email"
                    placeholder="fernanda@isoflex.com.br"
                    value={saleswomanForm.email}
                    onChange={(e) => setSaleswomanForm({ ...saleswomanForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sw_phone" className="text-xs">Celular</Label>
                  <Input
                    id="sw_phone"
                    type="text"
                    placeholder="(41) 99999-0000"
                    value={saleswomanForm.phone}
                    onChange={(e) => setSaleswomanForm({ ...saleswomanForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsSaleswomanModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={addSaleswomanMutation.isPending}>
                  {addSaleswomanMutation.isPending ? "Cadastrando..." : "Cadastrar Vendedora"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center flex-col text-slate-400">
      <Clock className="h-9 w-9 mb-2 opacity-40 animate-pulse" />
      <span className="text-xs font-semibold">Sem dados suficientes para gerar o gráfico</span>
    </div>
  );
}
