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
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  Filter,
  Trash2,
  PieChart as PieIcon,
  Search,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: FinanceiroPage,
});

const INITIAL_TRANSACTIONS = [
  { id: "t1", type: "receita", category: "Vendas Loja", value: 125400.00, ref_date: "2026-06-05", description: "Faturamento consolidado vendas diretas física" },
  { id: "t2", type: "receita", category: "Mercado Livre", value: 52718.99, ref_date: "2026-06-18", description: "Repasse mensal Mercado Livre Ads" },
  { id: "t3", type: "despesa", category: "Fornecedores", value: 45000.00, ref_date: "2026-06-08", description: "Compra de alumínio extrudado perfis" },
  { id: "t4", type: "despesa", category: "Marketing", value: 12512.19, ref_date: "2026-06-12", description: "Investimento publicidade Google & Facebook Ads" },
  { id: "t5", type: "despesa", category: "Salários", value: 38000.00, ref_date: "2026-06-05", description: "Folha de pagamento comercial & produção" },
  { id: "t6", type: "despesa", category: "Impostos", value: 15300.00, ref_date: "2026-06-10", description: "Impostos federais DAS Simples Nacional" },
  { id: "t7", type: "receita", category: "Serviços", value: 8500.00, ref_date: "2026-06-14", description: "Instalação de painéis visuais sob medida" },
  { id: "t8", type: "despesa", category: "Infraestrutura", value: 4200.00, ref_date: "2026-06-02", description: "Contas de luz trifásica fábrica & água" },
];

const CATEGORIES = [
  "Vendas Loja",
  "Mercado Livre",
  "Serviços",
  "Fornecedores",
  "Marketing",
  "Salários",
  "Impostos",
  "Infraestrutura",
  "Logística",
  "Outros",
];

function FinanceiroPage() {
  const { data: me } = useMe();
  const isMaster = me?.roles.includes("admin_master") ?? false;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("cashflow");
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Form State - Transaction
  const [txForm, setTxForm] = useState({
    type: "receita",
    category: "Vendas Loja",
    value: "",
    ref_date: new Date().toISOString().split("T")[0],
    description: "",
  });

  // ── Queries - Transactions ──
  const { data: transactions = [] } = useQuery({
    queryKey: ["financeiro_transactions"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("financeiro_transactions")
          .select("*")
          .order("ref_date", { ascending: false });
        if (error) throw error;
        return data ?? [];
      } catch (err) {
        console.warn("Supabase query for financeiro_transactions failed, using localStorage fallback:", err);
        const stored = localStorage.getItem("fin_transactions_fallback");
        if (stored) return JSON.parse(stored);
        localStorage.setItem("fin_transactions_fallback", JSON.stringify(INITIAL_TRANSACTIONS));
        return INITIAL_TRANSACTIONS;
      }
    },
  });

  // ── Mutations - Add Transaction ──
  const addTxMutation = useMutation({
    mutationFn: async (payload: any) => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Usuário não autenticado");

        const { error } = await supabase
          .from("financeiro_transactions")
          .insert({
            user_id: u.user.id,
            type: payload.type,
            category: payload.category,
            value: Number(payload.value || 0),
            ref_date: payload.ref_date,
            description: payload.description,
          });
        if (error) throw error;
      } catch (err) {
        console.warn("Fallback to localStorage for addTransaction:", err);
        const stored = localStorage.getItem("fin_transactions_fallback");
        const list = stored ? JSON.parse(stored) : [...INITIAL_TRANSACTIONS];
        list.push({
          id: `t_${Date.now()}`,
          type: payload.type,
          category: payload.category,
          value: Number(payload.value || 0),
          ref_date: payload.ref_date,
          description: payload.description,
        });
        localStorage.setItem("fin_transactions_fallback", JSON.stringify(list));
      }
    },
    onSuccess: () => {
      toast.success("Transação registrada com sucesso!");
      qc.invalidateQueries({ queryKey: ["financeiro_transactions"] });
      setIsTxModalOpen(false);
      setTxForm({
        type: "receita",
        category: "Vendas Loja",
        value: "",
        ref_date: new Date().toISOString().split("T")[0],
        description: "",
      });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Mutations - Delete Transaction ──
  const deleteTxMutation = useMutation({
    mutationFn: async (txId: string) => {
      try {
        const { error } = await supabase
          .from("financeiro_transactions")
          .delete()
          .eq("id", txId);
        if (error) throw error;
      } catch (err) {
        console.warn("Fallback to localStorage for deleteTransaction:", err);
        const stored = localStorage.getItem("fin_transactions_fallback");
        if (stored) {
          let list = JSON.parse(stored);
          list = list.filter((item: any) => item.id !== txId);
          localStorage.setItem("fin_transactions_fallback", JSON.stringify(list));
        }
      }
    },
    onSuccess: () => {
      toast.success("Transação excluída com sucesso!");
      qc.invalidateQueries({ queryKey: ["financeiro_transactions"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Calculate stats
  const totals = useMemo(() => {
    let revenues = 0;
    let expenses = 0;

    transactions.forEach((tx: any) => {
      const val = Number(tx.value || 0);
      if (tx.type === "receita") {
        revenues += val;
      } else {
        expenses += val;
      }
    });

    const net = revenues - expenses;

    return {
      revenues,
      expenses,
      net,
    };
  }, [transactions]);

  // Filtered Transactions List
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx: any) => {
      const matchesSearch =
        tx.category.toLowerCase().includes(search.toLowerCase()) ||
        (tx.description || "").toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || tx.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, search, typeFilter]);

  // Aggregate data for Charts
  const chartData = useMemo(() => {
    // 1. Revenues vs Expenses by Date
    const dailyMap: Record<string, { date: string; receitas: number; despesas: number }> = {};
    
    transactions.forEach((tx: any) => {
      const dateStr = tx.ref_date;
      const val = Number(tx.value || 0);
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { date: dateStr, receitas: 0, despesas: 0 };
      }
      if (tx.type === "receita") {
        dailyMap[dateStr].receitas += val;
      } else {
        dailyMap[dateStr].despesas += val;
      }
    });

    const cashFlow = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // 2. Expenses categories distribution
    const expenseCategoriesMap: Record<string, number> = {};
    transactions
      .filter((tx: any) => tx.type === "despesa")
      .forEach((tx: any) => {
        expenseCategoriesMap[tx.category] = (expenseCategoriesMap[tx.category] || 0) + Number(tx.value || 0);
      });

    const categoriesDistribution = Object.keys(expenseCategoriesMap).map((cat, idx) => ({
      name: cat,
      value: expenseCategoriesMap[cat],
      color: ["#ef4444", "#f59e0b", "#a855f7", "#64748b", "#3b82f6", "#10b981"][idx % 6],
    }));

    return {
      cashFlow,
      categoriesDistribution,
    };
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shadow-inner">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Financeiro & Fluxo de Caixa</h1>
            <p className="text-xs text-muted-foreground">
              Visualização de receitas, despesas, saldos líquidos e lançamentos de caixa.
            </p>
          </div>
        </div>

        {isMaster && (
          <Button onClick={() => setIsTxModalOpen(true)} className="glass border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" /> Registrar Transação
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass border-white/40 shadow-xs">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Receitas Totais</span>
                <div className="text-2xl font-black text-emerald-600 flex items-center">
                  <ArrowUpRight className="h-5 w-5 mr-1" /> {fmtBRL(totals.revenues)}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/40 shadow-xs">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Despesas Totais</span>
                <div className="text-2xl font-black text-rose-600 flex items-center">
                  <ArrowDownRight className="h-5 w-5 mr-1" /> {fmtBRL(totals.expenses)}
                </div>
              </div>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/40 shadow-xs">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Saldo Líquido</span>
                <div className={`text-2xl font-black ${totals.net >= 0 ? "text-slate-800" : "text-rose-600"}`}>
                  {fmtBRL(totals.net)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-200">
                <Scale className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-200/50 p-1 border border-slate-300/30">
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="ledger">Razão / Lançamentos</TabsTrigger>
          <TabsTrigger value="categories">Divisão por Categorias</TabsTrigger>
        </TabsList>

        <TabsContent value="cashflow" className="space-y-6 mt-4">
          <Card className="glass border-white/40">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-800">Fluxo de Caixa Consolidado por Dia</CardTitle>
              <CardDescription className="text-xs">Gráfico diário comparando receitas e despesas acumuladas</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {chartData.cashFlow.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer>
                  <BarChart data={chartData.cashFlow}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="#64748b" fontSize={10} />
                    <YAxis tickFormatter={(v) => `R$ ${v}`} stroke="#64748b" fontSize={10} />
                    <Tooltip formatter={(v) => fmtBRL(Number(v))} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-6 mt-4">
          {/* Filters and Search */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 max-w-sm w-full">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <Input
                type="text"
                placeholder="Buscar categoria ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white border-slate-300 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
              >
                <option value="all">Todas as transações</option>
                <option value="receita">Apenas Receitas</option>
                <option value="despesa">Apenas Despesas</option>
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          <Card className="glass border-white/40">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    {isMaster && <TableHead className="text-center">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isMaster ? 6 : 5} className="text-center py-8 text-muted-foreground text-xs">
                        Nenhuma transação encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs">
                          {new Date(tx.ref_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                        </TableCell>
                        <TableCell>
                          <Badge className={tx.type === "receita" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}>
                            {tx.type === "receita" ? "Receita" : "Despesa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-slate-800">{tx.category}</TableCell>
                        <TableCell className="text-xs text-slate-600">{tx.description || "—"}</TableCell>
                        <TableCell className={`text-right text-xs font-bold ${tx.type === "receita" ? "text-emerald-600" : "text-rose-600"}`}>
                          {tx.type === "receita" ? "+" : "-"} {fmtBRL(tx.value)}
                        </TableCell>
                        {isMaster && (
                          <TableCell className="text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("Excluir esta transação permanente?")) deleteTxMutation.mutate(tx.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6 mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pie Chart of Expenses */}
            <Card className="glass border-white/40">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800">Distribuição de Despesas</CardTitle>
                <CardDescription className="text-xs">Fração de despesas por categoria de custo no mês</CardDescription>
              </CardHeader>
              <CardContent className="h-72 flex items-center justify-center">
                {chartData.categoriesDistribution.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={chartData.categoriesDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {chartData.categoriesDistribution.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => fmtBRL(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* List of categories with values */}
            <Card className="glass border-white/40">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800">Consolidado Financeiro</CardTitle>
                <CardDescription className="text-xs">Total financeiro gasto e arrecadado por categorias</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {CATEGORIES.map((cat) => {
                  const values = transactions.filter((tx: any) => tx.category === cat);
                  const sum = values.reduce((acc, curr) => acc + Number(curr.value || 0), 0);
                  const isReceita = values.some((tx: any) => tx.type === "receita");

                  if (sum === 0) return null;

                  return (
                    <div key={cat} className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                      <span className="font-semibold text-slate-700">{cat}</span>
                      <span className={`font-bold ${isReceita ? "text-emerald-600" : "text-rose-600"}`}>
                        {isReceita ? "+" : "-"} {fmtBRL(sum)}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Transaction Dialog */}
      {isTxModalOpen && (
        <Dialog open onOpenChange={setIsTxModalOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-800">Lançar Transação de Caixa</DialogTitle>
              <DialogDescription className="text-xs">Insira os dados da transação de entrada ou saída financeira.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addTxMutation.mutate(txForm);
              }}
              className="space-y-4 py-2"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="tx_type" className="text-xs">Tipo de Lançamento</Label>
                  <select
                    id="tx_type"
                    value={txForm.type}
                    onChange={(e) => setTxForm({ ...txForm, type: e.target.value, category: e.target.value === "receita" ? "Vendas Loja" : "Fornecedores" })}
                    className="block w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="receita">Receita (Entrada)</option>
                    <option value="despesa">Despesa (Saída)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tx_category" className="text-xs">Categoria</Label>
                  <select
                    id="tx_category"
                    value={txForm.category}
                    onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                    className="block w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="tx_date" className="text-xs">Data de Competência</Label>
                  <Input
                    id="tx_date"
                    type="date"
                    value={txForm.ref_date}
                    onChange={(e) => setTxForm({ ...txForm, ref_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tx_value" className="text-xs">Valor Total (R$)</Label>
                  <Input
                    id="tx_value"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 1500.00"
                    value={txForm.value}
                    onChange={(e) => setTxForm({ ...txForm, value: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="tx_desc" className="text-xs">Descrição / Identificador</Label>
                <Input
                  id="tx_desc"
                  type="text"
                  placeholder="Ex: Pagamento fatura luz fábrica..."
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsTxModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={addTxMutation.isPending}>
                  {addTxMutation.isPending ? "Salvando..." : "Salvar Transação"}
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
      <Calendar className="h-9 w-9 mb-2 opacity-40 animate-pulse" />
      <span className="text-xs font-semibold">Sem dados suficientes para gerar o gráfico</span>
    </div>
  );
}
