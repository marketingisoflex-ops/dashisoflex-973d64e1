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
  PhoneCall,
  ShoppingCart,
  Plus,
  Trash2,
  Calendar,
  CheckCircle,
  AlertCircle,
  Truck,
  FileSpreadsheet,
  AlertOctagon,
  LifeBuoy,
  Users,
  TrendingUp,
  DollarSign,
  Package,
  ArrowRight,
  ShieldCheck,
  Scale,
  Award,
} from "lucide-react";
import { fmtBRL } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: SacComprasPage,
});

// Interfaces
interface SacOrder {
  id: string;
  client_name: string;
  order_code: string;
  dispatch_date: string;
  status: "faturamento" | "expedido" | "entregue";
  carrier: string;
}

interface SacFreight {
  id: string;
  carrier_name: string;
  tracking_code: string;
  value: number;
  status: "coletado" | "em_transito" | "entregue" | "atrasado";
  delivery_date: string;
}

interface SacRnc {
  id: string;
  rnc_code: string;
  item_desc: string;
  non_conformity: string;
  responsible: string;
  status: "analise" | "acao_corretiva" | "encerrado";
  created_at: string;
}

interface SacGlpi {
  id: string;
  ticket_number: string;
  title: string;
  requester: string;
  priority: "baixa" | "media" | "alta";
  tech_agent: string;
  status: "novo" | "em_atendimento" | "pendente" | "solucionado";
  created_at: string;
}

interface PurchaseOrder {
  id: string;
  item_name: string;
  supplier_name: string;
  price: number;
  quantity: number;
  total_cost: number;
  status: "cotacao" | "aprovado" | "entregue";
  delivery_date: string;
  responsible: string;
}

interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  contact: string;
  phone: string;
  quality_score: number; // 1 to 5
}

function SacComprasPage() {
  const { data: me } = useMe();
  const isMaster = me?.roles.includes("admin_master") ?? false;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("sac");
  const [sacSubTab, setSacSubTab] = useState("pedidos");
  const [compSubTab, setCompSubTab] = useState("planilha");

  // Modals state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isFreightModalOpen, setIsFreightModalOpen] = useState(false);
  const [isRncModalOpen, setIsRncModalOpen] = useState(false);
  const [isGlpiModalOpen, setIsGlpiModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Form States - SAC Pedidos
  const [orderForm, setOrderForm] = useState({
    client_name: "",
    order_code: "",
    dispatch_date: new Date().toISOString().split("T")[0],
    status: "faturamento" as "faturamento" | "expedido" | "entregue",
    carrier: "",
  });

  // Form States - SAC Fretes
  const [freightForm, setFreightForm] = useState({
    carrier_name: "",
    tracking_code: "",
    value: "",
    status: "coletado" as "coletado" | "em_transito" | "entregue" | "atrasado",
    delivery_date: new Date().toISOString().split("T")[0],
  });

  // Form States - SAC RNC
  const [rncForm, setRncForm] = useState({
    item_desc: "",
    non_conformity: "",
    responsible: "",
    status: "analise" as "analise" | "acao_corretiva" | "encerrado",
  });

  // Form States - SAC GLPI
  const [glpiForm, setGlpiForm] = useState({
    ticket_number: "",
    title: "",
    requester: "",
    priority: "media" as "baixa" | "media" | "alta",
    tech_agent: "",
    status: "novo" as "novo" | "em_atendimento" | "pendente" | "solucionado",
  });

  // Form States - Compras Planilha
  const [purchaseForm, setPurchaseForm] = useState({
    item_name: "",
    supplier_name: "",
    price: "",
    quantity: "",
    status: "cotacao" as "cotacao" | "aprovado" | "entregue",
    delivery_date: new Date().toISOString().split("T")[0],
    responsible: "",
  });

  // Form States - Compras Fornecedores
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    cnpj: "",
    contact: "",
    phone: "",
    quality_score: "5",
  });

  // Form States - Supplier Comparison Tool
  const [compTool, setCompTool] = useState({
    itemName: "",
    supp1Name: "",
    supp1Price: "",
    supp1Days: "",
    supp1Quality: "5",
    supp2Name: "",
    supp2Price: "",
    supp2Days: "",
    supp2Quality: "5",
  });

  // ── LocalStorage Queries ──
  const { data: sacOrders = [] } = useQuery<SacOrder[]>({
    queryKey: ["sac_orders"],
    queryFn: async () => {
      const stored = localStorage.getItem("sac_orders_fallback");
      return stored ? JSON.parse(stored) : [];
    },
  });

  const { data: sacFreights = [] } = useQuery<SacFreight[]>({
    queryKey: ["sac_freights"],
    queryFn: async () => {
      const stored = localStorage.getItem("sac_freights_fallback");
      return stored ? JSON.parse(stored) : [];
    },
  });

  const { data: sacRncs = [] } = useQuery<SacRnc[]>({
    queryKey: ["sac_rncs"],
    queryFn: async () => {
      const stored = localStorage.getItem("sac_rncs_fallback");
      return stored ? JSON.parse(stored) : [];
    },
  });

  const { data: sacGlpi = [] } = useQuery<SacGlpi[]>({
    queryKey: ["sac_glpi"],
    queryFn: async () => {
      const stored = localStorage.getItem("sac_glpi_fallback");
      return stored ? JSON.parse(stored) : [];
    },
  });

  const { data: purchases = [] } = useQuery<PurchaseOrder[]>({
    queryKey: ["comp_purchases"],
    queryFn: async () => {
      const stored = localStorage.getItem("comp_purchases_fallback");
      return stored ? JSON.parse(stored) : [];
    },
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["comp_suppliers"],
    queryFn: async () => {
      const stored = localStorage.getItem("comp_suppliers_fallback");
      return stored ? JSON.parse(stored) : [];
    },
  });

  // ── Mutations ──
  const addOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      const stored = localStorage.getItem("sac_orders_fallback");
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: `ord_${Date.now()}`,
        ...payload,
      });
      localStorage.setItem("sac_orders_fallback", JSON.stringify(list));
    },
    onSuccess: () => {
      toast.success("Pedido registrado para acompanhamento!");
      qc.invalidateQueries({ queryKey: ["sac_orders"] });
      setIsOrderModalOpen(false);
      setOrderForm({ client_name: "", order_code: "", dispatch_date: new Date().toISOString().split("T")[0], status: "faturamento", carrier: "" });
    },
  });

  const addFreightMutation = useMutation({
    mutationFn: async (payload: any) => {
      const stored = localStorage.getItem("sac_freights_fallback");
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: `frt_${Date.now()}`,
        ...payload,
        value: Number(payload.value || 0),
      });
      localStorage.setItem("sac_freights_fallback", JSON.stringify(list));
    },
    onSuccess: () => {
      toast.success("Controle de frete adicionado!");
      qc.invalidateQueries({ queryKey: ["sac_freights"] });
      setIsFreightModalOpen(false);
      setFreightForm({ carrier_name: "", tracking_code: "", value: "", status: "coletado", delivery_date: new Date().toISOString().split("T")[0] });
    },
  });

  const addRncMutation = useMutation({
    mutationFn: async (payload: any) => {
      const stored = localStorage.getItem("sac_rncs_fallback");
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: `rnc_${Date.now()}`,
        rnc_code: `RNC-2026-${list.length + 101}`,
        created_at: new Date().toISOString(),
        ...payload,
      });
      localStorage.setItem("sac_rncs_fallback", JSON.stringify(list));
    },
    onSuccess: () => {
      toast.success("Relatório de Não Conformidade registrado!");
      qc.invalidateQueries({ queryKey: ["sac_rncs"] });
      setIsRncModalOpen(false);
      setRncForm({ item_desc: "", non_conformity: "", responsible: "", status: "analise" });
    },
  });

  const addGlpiMutation = useMutation({
    mutationFn: async (payload: any) => {
      const stored = localStorage.getItem("sac_glpi_fallback");
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: `glp_${Date.now()}`,
        created_at: new Date().toISOString(),
        ...payload,
      });
      localStorage.setItem("sac_glpi_fallback", JSON.stringify(list));
    },
    onSuccess: () => {
      toast.success("Chamado GLPI vinculado com sucesso!");
      qc.invalidateQueries({ queryKey: ["sac_glpi"] });
      setIsGlpiModalOpen(false);
      setGlpiForm({ ticket_number: "", title: "", requester: "", priority: "media", tech_agent: "", status: "novo" });
    },
  });

  const addPurchaseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const stored = localStorage.getItem("comp_purchases_fallback");
      const list = stored ? JSON.parse(stored) : [];
      const qty = Number(payload.quantity || 1);
      const prc = Number(payload.price || 0);
      list.push({
        id: `pur_${Date.now()}`,
        ...payload,
        price: prc,
        quantity: qty,
        total_cost: qty * prc,
      });
      localStorage.setItem("comp_purchases_fallback", JSON.stringify(list));
    },
    onSuccess: () => {
      toast.success("Pedido de compra registrado!");
      qc.invalidateQueries({ queryKey: ["comp_purchases"] });
      setIsPurchaseModalOpen(false);
      setPurchaseForm({ item_name: "", supplier_name: "", price: "", quantity: "", status: "cotacao", delivery_date: new Date().toISOString().split("T")[0], responsible: "" });
    },
  });

  const addSupplierMutation = useMutation({
    mutationFn: async (payload: any) => {
      const stored = localStorage.getItem("comp_suppliers_fallback");
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: `spl_${Date.now()}`,
        ...payload,
        quality_score: Number(payload.quality_score),
      });
      localStorage.setItem("comp_suppliers_fallback", JSON.stringify(list));
    },
    onSuccess: () => {
      toast.success("Fornecedor cadastrado!");
      qc.invalidateQueries({ queryKey: ["comp_suppliers"] });
      setIsSupplierModalOpen(false);
      setSupplierForm({ name: "", cnpj: "", contact: "", phone: "", quality_score: "5" });
    },
  });

  // ── Delete mutations ──
  const deleteItem = (key: string, queryKey: string, msg: string) => {
    return {
      mutationFn: async (id: string) => {
        const stored = localStorage.getItem(key);
        if (stored) {
          let list = JSON.parse(stored);
          list = list.filter((item: any) => item.id !== id);
          localStorage.setItem(key, JSON.stringify(list));
        }
      },
      onSuccess: () => {
        toast.success(msg);
        qc.invalidateQueries({ queryKey: [queryKey] });
      }
    };
  };

  const delOrder = useMutation(deleteItem("sac_orders_fallback", "sac_orders", "Registro removido!"));
  const delFreight = useMutation(deleteItem("sac_freights_fallback", "sac_freights", "Frete removido!"));
  const delRnc = useMutation(deleteItem("sac_rncs_fallback", "sac_rncs", "RNC removido!"));
  const delGlpi = useMutation(deleteItem("sac_glpi_fallback", "sac_glpi", "Ticket GLPI desvinculado!"));
  const delPurchase = useMutation(deleteItem("comp_purchases_fallback", "comp_purchases", "Compra deletada!"));
  const delSupplier = useMutation(deleteItem("comp_suppliers_fallback", "comp_suppliers", "Fornecedor removido!"));

  // Cost analysis stats
  const costStats = useMemo(() => {
    const total = purchases.reduce((acc, curr) => acc + curr.total_cost, 0);
    const completed = purchases.filter(p => p.status === "entregue").reduce((acc, curr) => acc + curr.total_cost, 0);
    const active = purchases.filter(p => p.status !== "entregue").reduce((acc, curr) => acc + curr.total_cost, 0);
    return { total, completed, active };
  }, [purchases]);

  // Comparison logic
  const comparisonResult = useMemo(() => {
    if (!compTool.itemName || !compTool.supp1Name || !compTool.supp2Name) return null;
    
    const p1 = Number(compTool.supp1Price || 0);
    const p2 = Number(compTool.supp2Price || 0);
    const d1 = Number(compTool.supp1Days || 0);
    const d2 = Number(compTool.supp2Days || 0);
    const q1 = Number(compTool.supp1Quality);
    const q2 = Number(compTool.supp2Quality);

    // Score calculations
    const priceScore1 = p1 > 0 ? (Math.min(p1, p2) / p1) * 40 : 0;
    const priceScore2 = p2 > 0 ? (Math.min(p1, p2) / p2) * 40 : 0;
    const daysScore1 = d1 > 0 ? (Math.min(d1, d2) / d1) * 30 : 0;
    const daysScore2 = d2 > 0 ? (Math.min(d1, d2) / d2) * 30 : 0;
    const qualScore1 = (q1 / 5) * 30;
    const qualScore2 = (q2 / 5) * 30;

    const total1 = Math.round(priceScore1 + daysScore1 + qualScore1);
    const total2 = Math.round(priceScore2 + daysScore2 + qualScore2);

    const winner = total1 >= total2 ? compTool.supp1Name : compTool.supp2Name;
    const diffPct = p1 > 0 && p2 > 0 ? Math.abs((p1 - p2) / Math.max(p1, p2) * 100).toFixed(0) : "0";

    return {
      total1,
      total2,
      winner,
      diffPct,
      p1,
      p2,
      d1,
      d2
    };
  }, [compTool]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600 shadow-inner">
            <PhoneCall className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">SAC / COMPRAS</h1>
            <p className="text-xs text-muted-foreground">
              Acompanhamento de fretes, RNC, chamados GLPI, cadastro de fornecedores e comparativo de cotação.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {activeTab === "sac" ? (
            <>
              {sacSubTab === "pedidos" && (
                <Button onClick={() => setIsOrderModalOpen(true)} className="hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" /> Acompanhar Pedido
                </Button>
              )}
              {sacSubTab === "fretes" && (
                <Button onClick={() => setIsFreightModalOpen(true)} className="hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" /> Registrar Frete
                </Button>
              )}
              {sacSubTab === "rncs" && (
                <Button onClick={() => setIsRncModalOpen(true)} className="hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" /> Abrir RNC
                </Button>
              )}
              {sacSubTab === "glpi" && (
                <Button onClick={() => setIsGlpiModalOpen(true)} className="hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" /> Vincular Chamado GLPI
                </Button>
              )}
            </>
          ) : (
            <>
              {compSubTab === "planilha" && (
                <Button onClick={() => setIsPurchaseModalOpen(true)} className="hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" /> Registrar Compra
                </Button>
              )}
              {compSubTab === "fornecedores" && (
                <Button onClick={() => setIsSupplierModalOpen(true)} className="hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" /> Cadastrar Fornecedor
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-200/50 p-1 border border-slate-300/30">
          <TabsTrigger value="sac" className="gap-2">
            <PhoneCall className="h-4 w-4" /> SAC & Atendimento
          </TabsTrigger>
          <TabsTrigger value="compras" className="gap-2">
            <ShoppingCart className="h-4 w-4" /> Compras
          </TabsTrigger>
        </TabsList>

        {/* ── SAC Tab Content ── */}
        <TabsContent value="sac" className="space-y-6 mt-4">
          <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
            <button 
              onClick={() => setSacSubTab("pedidos")}
              className={`pb-3 px-4 text-xs font-bold transition-all relative ${
                sacSubTab === "pedidos" ? "text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Acompanhamento de Pedidos
            </button>
            <button 
              onClick={() => setSacSubTab("fretes")}
              className={`pb-3 px-4 text-xs font-bold transition-all relative ${
                sacSubTab === "fretes" ? "text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Controle de Fretes
            </button>
            <button 
              onClick={() => setSacSubTab("rncs")}
              className={`pb-3 px-4 text-xs font-bold transition-all relative ${
                sacSubTab === "rncs" ? "text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Planilha de RNC
            </button>
            <button 
              onClick={() => setSacSubTab("glpi")}
              className={`pb-3 px-4 text-xs font-bold transition-all relative ${
                sacSubTab === "glpi" ? "text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Acompanhamento Sistema GLPI
            </button>
          </div>

          {/* Sub-tab 1: Acompanhamento de Pedidos */}
          {sacSubTab === "pedidos" && (
            <Card className="glass border-white/40">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Package className="h-5 w-5 text-indigo-500" /> Acompanhamento de Pedidos
                </CardTitle>
                <CardDescription className="text-xs">Monitore os prazos de faturamento, frotas e entrega aos clientes.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data Expedição</TableHead>
                      <TableHead>Transportadora</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sacOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs font-medium">
                          Nenhum pedido cadastrado para acompanhamento.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sacOrders.map((ord) => (
                        <TableRow key={ord.id}>
                          <TableCell className="font-bold text-xs text-slate-800 font-mono">{ord.order_code}</TableCell>
                          <TableCell className="text-xs font-bold text-slate-700">{ord.client_name}</TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {new Date(ord.dispatch_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 font-semibold">{ord.carrier || "—"}</TableCell>
                          <TableCell>
                            <Badge className={
                              ord.status === "entregue" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                              ord.status === "expedido" ? "bg-blue-100 text-blue-800 border-blue-200" :
                              "bg-amber-100 text-amber-800 border-amber-200"
                            }>
                              {ord.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button size="icon" variant="ghost" className="hover:bg-rose-50 h-7 w-7" onClick={() => delOrder.mutate(ord.id)}>
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Sub-tab 2: Controle de Fretes */}
          {sacSubTab === "fretes" && (
            <Card className="glass border-white/40">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-500" /> Controle de Fretes
                </CardTitle>
                <CardDescription className="text-xs">Registro de fretes para faturamento de transportadoras e cotações de entrega.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transportadora</TableHead>
                      <TableHead>Código Rastreio</TableHead>
                      <TableHead>Valor do Frete</TableHead>
                      <TableHead>Previsão de Entrega</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sacFreights.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs font-medium">
                          Nenhum registro de frete disponível.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sacFreights.map((frt) => (
                        <TableRow key={frt.id}>
                          <TableCell className="text-xs font-bold text-slate-800">{frt.carrier_name}</TableCell>
                          <TableCell className="text-xs font-mono text-slate-500">{frt.tracking_code || "—"}</TableCell>
                          <TableCell className="text-xs font-bold text-slate-700">{fmtBRL(frt.value)}</TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {new Date(frt.delivery_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              frt.status === "entregue" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                              frt.status === "atrasado" ? "bg-rose-100 text-rose-800 border-rose-200" :
                              frt.status === "em_transito" ? "bg-indigo-100 text-indigo-800 border-indigo-200" :
                              "bg-slate-100 text-slate-700 border-slate-200"
                            }>
                              {frt.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button size="icon" variant="ghost" className="hover:bg-rose-50 h-7 w-7" onClick={() => delFreight.mutate(frt.id)}>
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Sub-tab 3: Planilha de RNC */}
          {sacSubTab === "rncs" && (
            <Card className="glass border-white/40">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <AlertOctagon className="h-5 w-5 text-amber-500" /> Relatório de Não Conformidades (RNC)
                </CardTitle>
                <CardDescription className="text-xs">Monitore os defeitos de fábrica, problemas no produto e plano de ação corretiva.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código RNC</TableHead>
                      <TableHead>Item Atingido</TableHead>
                      <TableHead>Não Conformidade</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Cadastro</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sacRncs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-xs font-medium">
                          Nenhum relatório de RNC aberto.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sacRncs.map((rnc) => (
                        <TableRow key={rnc.id}>
                          <TableCell className="font-bold text-xs text-amber-600 font-mono">{rnc.rnc_code}</TableCell>
                          <TableCell className="text-xs font-bold text-slate-800">{rnc.item_desc}</TableCell>
                          <TableCell className="text-xs text-slate-600 max-w-xs truncate">{rnc.non_conformity}</TableCell>
                          <TableCell className="text-xs text-slate-600 font-semibold">{rnc.responsible}</TableCell>
                          <TableCell>
                            <Badge className={
                              rnc.status === "encerrado" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                              rnc.status === "acao_corretiva" ? "bg-amber-100 text-amber-800 border-amber-200" :
                              "bg-blue-100 text-blue-800 border-blue-200"
                            }>
                              {rnc.status === "acao_corretiva" ? "AÇÃO CORRETIVA" : rnc.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">
                            {new Date(rnc.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button size="icon" variant="ghost" className="hover:bg-rose-50 h-7 w-7" onClick={() => delRnc.mutate(rnc.id)}>
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Sub-tab 4: Acompanhamento Sistema GLPI */}
          {sacSubTab === "glpi" && (
            <Card className="glass border-white/40">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5 text-rose-500" /> Integração de Chamados GLPI
                </CardTitle>
                <CardDescription className="text-xs">Acompanhe os tickets de suporte técnico e desenvolvimento de sistemas integrados.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número Ticket</TableHead>
                      <TableHead>Título do Chamado</TableHead>
                      <TableHead>Requerente</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Técnico Responsável</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sacGlpi.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-xs font-medium">
                          Nenhum chamado GLPI vinculado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sacGlpi.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-bold text-xs text-slate-700 font-mono">#{ticket.ticket_number}</TableCell>
                          <TableCell className="text-xs font-bold text-slate-800">{ticket.title}</TableCell>
                          <TableCell className="text-xs text-slate-500">{ticket.requester}</TableCell>
                          <TableCell>
                            <Badge className={
                              ticket.priority === "alta" ? "bg-rose-100 text-rose-800 border-rose-200" :
                              ticket.priority === "media" ? "bg-amber-100 text-amber-800 border-amber-200" :
                              "bg-slate-100 text-slate-700 border-slate-200"
                            }>
                              {ticket.priority.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-indigo-600 font-semibold">{ticket.tech_agent || "—"}</TableCell>
                          <TableCell>
                            <Badge className={
                              ticket.status === "solucionado" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                              ticket.status === "em_atendimento" ? "bg-blue-100 text-blue-800 border-blue-200" :
                              ticket.status === "pendente" ? "bg-amber-100 text-amber-800 border-amber-200" :
                              "bg-slate-100 text-slate-600 border-slate-200"
                            }>
                              {ticket.status === "em_atendimento" ? "EM ATENDIMENTO" : ticket.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button size="icon" variant="ghost" className="hover:bg-rose-50 h-7 w-7" onClick={() => delGlpi.mutate(ticket.id)}>
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── COMPRAS Tab Content ── */}
        <TabsContent value="compras" className="space-y-6 mt-4">
          <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
            <button 
              onClick={() => setCompSubTab("planilha")}
              className={`pb-3 px-4 text-xs font-bold transition-all relative ${
                compSubTab === "planilha" ? "text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Planilha de Pedidos & Compras
            </button>
            <button 
              onClick={() => setCompSubTab("fornecedores")}
              className={`pb-3 px-4 text-xs font-bold transition-all relative ${
                compSubTab === "fornecedores" ? "text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Fornecedores
            </button>
            <button 
              onClick={() => setCompSubTab("custos")}
              className={`pb-3 px-4 text-xs font-bold transition-all relative ${
                compSubTab === "custos" ? "text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Custo das Compras
            </button>
            <button 
              onClick={() => setCompSubTab("comparativo")}
              className={`pb-3 px-4 text-xs font-bold transition-all relative ${
                compSubTab === "comparativo" ? "text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Comparativo Cotações
            </button>
          </div>

          {/* Sub-tab 1: Planilha de Pedidos */}
          {compSubTab === "planilha" && (
            <Card className="glass border-white/40">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-indigo-500" /> Planilha de Compras Realizadas
                </CardTitle>
                <CardDescription className="text-xs">Histórico de insumos, matérias-primas e ferramentas cotadas/adquiridas.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Insumo / Item</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Preço Unitário</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Custo Total</TableHead>
                      <TableHead>Data Previsão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-slate-400 text-xs font-medium">
                          Nenhuma compra registrada na planilha.
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchases.map((pur) => (
                        <TableRow key={pur.id}>
                          <TableCell className="text-xs font-bold text-slate-800">{pur.item_name}</TableCell>
                          <TableCell className="text-xs text-indigo-600 font-semibold">{pur.supplier_name}</TableCell>
                          <TableCell className="text-xs text-slate-500 font-mono">{fmtBRL(pur.price)}</TableCell>
                          <TableCell className="text-xs text-slate-600 font-bold">{pur.quantity}</TableCell>
                          <TableCell className="text-xs text-slate-800 font-bold font-mono">{fmtBRL(pur.total_cost)}</TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {new Date(pur.delivery_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              pur.status === "entregue" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                              pur.status === "aprovado" ? "bg-blue-100 text-blue-800 border-blue-200" :
                              "bg-amber-100 text-amber-800 border-amber-200"
                            }>
                              {pur.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button size="icon" variant="ghost" className="hover:bg-rose-50 h-7 w-7" onClick={() => delPurchase.mutate(pur.id)}>
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Sub-tab 2: Fornecedores */}
          {compSubTab === "fornecedores" && (
            <Card className="glass border-white/40">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-500" /> Catálogo de Fornecedores
                </CardTitle>
                <CardDescription className="text-xs">Registro e score de qualidade dos fornecedores homologados da Isoflex.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Contato Comercial</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Qualidade (1-5)</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs font-medium">
                          Nenhum fornecedor registrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      suppliers.map((sup) => (
                        <TableRow key={sup.id}>
                          <TableCell className="text-xs font-bold text-slate-800">{sup.name}</TableCell>
                          <TableCell className="text-xs font-mono text-slate-500">{sup.cnpj || "—"}</TableCell>
                          <TableCell className="text-xs text-slate-600 font-semibold">{sup.contact || "—"}</TableCell>
                          <TableCell className="text-xs text-slate-500">{sup.phone || "—"}</TableCell>
                          <TableCell>
                            <Badge className="bg-amber-100 text-amber-800 font-bold border-amber-200">
                              ★ {sup.quality_score} / 5
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button size="icon" variant="ghost" className="hover:bg-rose-50 h-7 w-7" onClick={() => delSupplier.mutate(sup.id)}>
                              <Trash2 className="h-4 w-4 text-rose-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Sub-tab 3: Custo das Compras */}
          {compSubTab === "custos" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="glass border-white/40">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Custo Total Acumulado</span>
                        <div className="text-2xl font-black text-slate-800">{fmtBRL(costStats.total)}</div>
                      </div>
                      <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-200">
                        <DollarSign className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass border-white/40">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Custo Entregue / Finalizado</span>
                        <div className="text-2xl font-black text-emerald-600">{fmtBRL(costStats.completed)}</div>
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
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Em Cotação / Trânsito</span>
                        <div className="text-2xl font-black text-blue-600">{fmtBRL(costStats.active)}</div>
                      </div>
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="glass border-white/40">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-slate-800">Maiores Lotes de Insumos Comprados</CardTitle>
                  <CardDescription className="text-xs">Listagem ordenada por valor do lote.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Insumo</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Custo Lote</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                            Nenhuma compra cadastrada.
                          </TableCell>
                        </TableRow>
                      ) : (
                        [...purchases]
                          .sort((a, b) => b.total_cost - a.total_cost)
                          .map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="text-xs font-bold text-slate-800">{p.item_name}</TableCell>
                              <TableCell className="text-xs text-slate-500">{p.supplier_name}</TableCell>
                              <TableCell className="text-xs font-bold">{p.quantity}</TableCell>
                              <TableCell className="text-xs font-bold font-mono text-indigo-600">{fmtBRL(p.total_cost)}</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sub-tab 4: Comparativo de Fornecedores */}
          {compSubTab === "comparativo" && (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Tool Input Box */}
              <Card className="glass border-white/40 md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-slate-800">Calculadora de Cotação</CardTitle>
                  <CardDescription className="text-[10px]">Insira os valores cotados para comparar e encontrar o fornecedor ideal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-slate-500">Insumo / Item</Label>
                    <Input 
                      placeholder="Ex: Bobina de Aço Galvanizado" 
                      value={compTool.itemName}
                      onChange={(e) => setCompTool({...compTool, itemName: e.target.value})}
                      className="h-8 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Opção de Fornecedor A</span>
                    <div className="space-y-2">
                      <Input 
                        placeholder="Nome Fornecedor A" 
                        value={compTool.supp1Name}
                        onChange={(e) => setCompTool({...compTool, supp1Name: e.target.value})}
                        className="h-8 text-xs"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Input 
                          placeholder="Preço R$" 
                          type="number"
                          value={compTool.supp1Price}
                          onChange={(e) => setCompTool({...compTool, supp1Price: e.target.value})}
                          className="h-8 text-xs text-center font-bold"
                        />
                        <Input 
                          placeholder="Prazo (Dias)" 
                          type="number"
                          value={compTool.supp1Days}
                          onChange={(e) => setCompTool({...compTool, supp1Days: e.target.value})}
                          className="h-8 text-xs text-center"
                        />
                        <select 
                          value={compTool.supp1Quality}
                          onChange={(e) => setCompTool({...compTool, supp1Quality: e.target.value})}
                          className="h-8 text-xs text-center border border-input bg-background rounded-md"
                        >
                          <option value="5">★ 5 Quality</option>
                          <option value="4">★ 4 Quality</option>
                          <option value="3">★ 3 Quality</option>
                          <option value="2">★ 2 Quality</option>
                          <option value="1">★ 1 Quality</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Opção de Fornecedor B</span>
                    <div className="space-y-2">
                      <Input 
                        placeholder="Nome Fornecedor B" 
                        value={compTool.supp2Name}
                        onChange={(e) => setCompTool({...compTool, supp2Name: e.target.value})}
                        className="h-8 text-xs"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Input 
                          placeholder="Preço R$" 
                          type="number"
                          value={compTool.supp2Price}
                          onChange={(e) => setCompTool({...compTool, supp2Price: e.target.value})}
                          className="h-8 text-xs text-center font-bold"
                        />
                        <Input 
                          placeholder="Prazo (Dias)" 
                          type="number"
                          value={compTool.supp2Days}
                          onChange={(e) => setCompTool({...compTool, supp2Days: e.target.value})}
                          className="h-8 text-xs text-center"
                        />
                        <select 
                          value={compTool.supp2Quality}
                          onChange={(e) => setCompTool({...compTool, supp2Quality: e.target.value})}
                          className="h-8 text-xs text-center border border-input bg-background rounded-md"
                        >
                          <option value="5">★ 5 Quality</option>
                          <option value="4">★ 4 Quality</option>
                          <option value="3">★ 3 Quality</option>
                          <option value="2">★ 2 Quality</option>
                          <option value="1">★ 1 Quality</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comparison Results output */}
              <Card className="glass border-white/40 md:col-span-2 flex flex-col justify-center">
                <CardContent className="p-6">
                  {comparisonResult ? (
                    <div className="space-y-6">
                      <div className="text-center space-y-2">
                        <Badge className="bg-primary text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider">
                          Recomendação Gerada
                        </Badge>
                        <h3 className="text-xl font-black text-slate-800 mt-2">
                          Comprar de <span className="text-indigo-600">{comparisonResult.winner}</span>
                        </h3>
                        <p className="text-xs text-slate-500 font-semibold">
                          Esta recomendação considera uma pontuação ponderada de Preço (40%), Prazo (30%) e Qualidade (30%).
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 pt-2">
                        <Card className="border-slate-200 bg-slate-50/50 p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-700">{compTool.supp1Name}</span>
                            <Badge className="bg-slate-900 text-white font-mono text-[10px]">{comparisonResult.total1} pts</Badge>
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-500">
                            <div className="flex justify-between">
                              <span>Preço:</span>
                              <span className="font-bold text-slate-700">{fmtBRL(comparisonResult.p1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Prazo de Entrega:</span>
                              <span className="font-semibold text-slate-700">{comparisonResult.d1} dias</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Nota de Qualidade:</span>
                              <span className="font-semibold text-slate-700">★ {compTool.supp1Quality} / 5</span>
                            </div>
                          </div>
                        </Card>

                        <Card className="border-slate-200 bg-slate-50/50 p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-700">{compTool.supp2Name}</span>
                            <Badge className="bg-slate-900 text-white font-mono text-[10px]">{comparisonResult.total2} pts</Badge>
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-500">
                            <div className="flex justify-between">
                              <span>Preço:</span>
                              <span className="font-bold text-slate-700">{fmtBRL(comparisonResult.p2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Prazo de Entrega:</span>
                              <span className="font-semibold text-slate-700">{comparisonResult.d2} dias</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Nota de Qualidade:</span>
                              <span className="font-semibold text-slate-700">★ {compTool.supp2Quality} / 5</span>
                            </div>
                          </div>
                        </Card>
                      </div>

                      <div className="flex justify-between items-center bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-800 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Scale className="h-4 w-4" /> Margem de variação da cotação:
                        </span>
                        <span>{comparisonResult.diffPct}% de diferença de preço</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col justify-center items-center text-center text-slate-400">
                      <Scale className="h-10 w-10 text-indigo-500 mb-2 opacity-55 animate-pulse" />
                      <h4 className="text-sm font-bold text-slate-700">Aguardando dados de entrada</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
                        Preencha o nome do insumo e as cotações de ambos os fornecedores à esquerda para receber a recomendação ideal.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Add Order Dialog (SAC) ── */}
      {isOrderModalOpen && (
        <Dialog open onOpenChange={setIsOrderModalOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-800">Acompanhar Pedido</DialogTitle>
              <DialogDescription className="text-xs">Registre um pedido de cliente para gerenciar o status de expedição e faturamento.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addOrderMutation.mutate(orderForm); }} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Código Pedido</Label>
                  <Input 
                    placeholder="Ex: PED-40552" 
                    value={orderForm.order_code}
                    onChange={(e) => setOrderForm({...orderForm, order_code: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Transportadora</Label>
                  <Input 
                    placeholder="Ex: Braspress" 
                    value={orderForm.carrier}
                    onChange={(e) => setOrderForm({...orderForm, carrier: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cliente / Razão Social</Label>
                <Input 
                  placeholder="Ex: Isoflex Montagens" 
                  value={orderForm.client_name}
                  onChange={(e) => setOrderForm({...orderForm, client_name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Data de Expedição</Label>
                  <Input 
                    type="date"
                    value={orderForm.dispatch_date}
                    onChange={(e) => setOrderForm({...orderForm, dispatch_date: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status do Pedido</Label>
                  <select 
                    value={orderForm.status} 
                    onChange={(e: any) => setOrderForm({...orderForm, status: e.target.value})}
                    className="block w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="faturamento">Faturamento</option>
                    <option value="expedido">Expedido</option>
                    <option value="entregue">Entregue</option>
                  </select>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsOrderModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Lançar Acompanhamento</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Add Freight Dialog (SAC) ── */}
      {isFreightModalOpen && (
        <Dialog open onOpenChange={setIsFreightModalOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-800">Registrar Controle de Frete</DialogTitle>
              <DialogDescription className="text-xs">Cadastre a rota, valor do frete cobrado e previsão de entrega.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addFreightMutation.mutate(freightForm); }} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Transportadora</Label>
                  <Input 
                    placeholder="Ex: Jadlog" 
                    value={freightForm.carrier_name}
                    onChange={(e) => setFreightForm({...freightForm, carrier_name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Código de Rastreio</Label>
                  <Input 
                    placeholder="Ex: JDL-778844" 
                    value={freightForm.tracking_code}
                    onChange={(e) => setFreightForm({...freightForm, tracking_code: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Valor do Frete (R$)</Label>
                  <Input 
                    type="number"
                    placeholder="Ex: 350" 
                    value={freightForm.value}
                    onChange={(e) => setFreightForm({...freightForm, value: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status Entrega</Label>
                  <select 
                    value={freightForm.status} 
                    onChange={(e: any) => setFreightForm({...freightForm, status: e.target.value})}
                    className="block w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="coletado">Coletado</option>
                    <option value="em_transito">Em Trânsito</option>
                    <option value="entregue">Entregue</option>
                    <option value="atrasado">Atrasado</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Previsão de Entrega</Label>
                <Input 
                  type="date"
                  value={freightForm.delivery_date}
                  onChange={(e) => setFreightForm({...freightForm, delivery_date: e.target.value})}
                  required
                />
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsFreightModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar Frete</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Add RNC Dialog (SAC) ── */}
      {isRncModalOpen && (
        <Dialog open onOpenChange={setIsRncModalOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-800">Registrar Não Conformidade (RNC)</DialogTitle>
              <DialogDescription className="text-xs">Abra um chamado de problema na peça, material ou serviço e defina as ações.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addRncMutation.mutate(rncForm); }} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Item Atingido / Produto</Label>
                <Input 
                  placeholder="Ex: Bobina Inox A2" 
                  value={rncForm.item_desc}
                  onChange={(e) => setRncForm({...rncForm, item_desc: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descrição da Não Conformidade</Label>
                <Input 
                  placeholder="Ex: Fissura superficial no lote recebido" 
                  value={rncForm.non_conformity}
                  onChange={(e) => setRncForm({...rncForm, non_conformity: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Responsável</Label>
                  <Input 
                    placeholder="Ex: Eng. Roberto" 
                    value={rncForm.responsible}
                    onChange={(e) => setRncForm({...rncForm, responsible: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status do RNC</Label>
                  <select 
                    value={rncForm.status} 
                    onChange={(e: any) => setRncForm({...rncForm, status: e.target.value})}
                    className="block w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="analise">Em Análise</option>
                    <option value="acao_corretiva">Ação Corretiva</option>
                    <option value="encerrado">Encerrado</option>
                  </select>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsRncModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Abrir Ticket RNC</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Add GLPI Dialog (SAC) ── */}
      {isGlpiModalOpen && (
        <Dialog open onOpenChange={setIsGlpiModalOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-800">Vincular Chamado GLPI</DialogTitle>
              <DialogDescription className="text-xs">Vincule os chamados do sistema GLPI local de tecnologia ou suporte de TI.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addGlpiMutation.mutate(glpiForm); }} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Número do Chamado (#)</Label>
                  <Input 
                    placeholder="Ex: 10452" 
                    value={glpiForm.ticket_number}
                    onChange={(e) => setGlpiForm({...glpiForm, ticket_number: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Requerente</Label>
                  <Input 
                    placeholder="Ex: Comercial Fabiana" 
                    value={glpiForm.requester}
                    onChange={(e) => setGlpiForm({...glpiForm, requester: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Assunto / Título do Chamado</Label>
                <Input 
                  placeholder="Ex: Ajuste na integração de notas fiscais" 
                  value={glpiForm.title}
                  onChange={(e) => setGlpiForm({...glpiForm, title: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1">
                  <Label className="text-xs">Prioridade</Label>
                  <select 
                    value={glpiForm.priority} 
                    onChange={(e: any) => setGlpiForm({...glpiForm, priority: e.target.value})}
                    className="block w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div className="col-span-1 space-y-1">
                  <Label className="text-xs">Técnico TI</Label>
                  <Input 
                    placeholder="Ex: Marcos" 
                    value={glpiForm.tech_agent}
                    onChange={(e) => setGlpiForm({...glpiForm, tech_agent: e.target.value})}
                    required
                  />
                </div>
                <div className="col-span-1 space-y-1">
                  <Label className="text-xs">Status</Label>
                  <select 
                    value={glpiForm.status} 
                    onChange={(e: any) => setGlpiForm({...glpiForm, status: e.target.value})}
                    className="block w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="novo">Novo</option>
                    <option value="em_atendimento">Atendimento</option>
                    <option value="pendente">Pendente</option>
                    <option value="solucionado">Solucionado</option>
                  </select>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsGlpiModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Vincular Ticket</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Add Purchase Dialog (COMPRAS) ── */}
      {isPurchaseModalOpen && (
        <Dialog open onOpenChange={setIsPurchaseModalOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-800">Lançar Compra Realizada</DialogTitle>
              <DialogDescription className="text-xs">Registre itens e insumos faturados ou orçados na planilha.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addPurchaseMutation.mutate(purchaseForm); }} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Descrição do Item</Label>
                <Input 
                  placeholder="Ex: Tintas Esmalte Azul Ral 5010" 
                  value={purchaseForm.item_name}
                  onChange={(e) => setPurchaseForm({...purchaseForm, item_name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Fornecedor</Label>
                  <Input 
                    placeholder="Ex: Metalurgica Alfa" 
                    value={purchaseForm.supplier_name}
                    onChange={(e) => setPurchaseForm({...purchaseForm, supplier_name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Comprador Resp.</Label>
                  <Input 
                    placeholder="Ex: Renata Santos" 
                    value={purchaseForm.responsible}
                    onChange={(e) => setPurchaseForm({...purchaseForm, responsible: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Preço Unitário (R$)</Label>
                  <Input 
                    type="number"
                    placeholder="Ex: 45.90" 
                    value={purchaseForm.price}
                    onChange={(e) => setPurchaseForm({...purchaseForm, price: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Quantidade</Label>
                  <Input 
                    type="number"
                    placeholder="Ex: 10" 
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm({...purchaseForm, quantity: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Prazo / Previsão Entrega</Label>
                  <Input 
                    type="date"
                    value={purchaseForm.delivery_date}
                    onChange={(e) => setPurchaseForm({...purchaseForm, delivery_date: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status da Compra</Label>
                  <select 
                    value={purchaseForm.status} 
                    onChange={(e: any) => setPurchaseForm({...purchaseForm, status: e.target.value})}
                    className="block w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="cotacao">Cotação</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="entregue">Entregue</option>
                  </select>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsPurchaseModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Adicionar Planilha</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Add Supplier Dialog (COMPRAS) ── */}
      {isSupplierModalOpen && (
        <Dialog open onOpenChange={setIsSupplierModalOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-800">Cadastrar Fornecedor</DialogTitle>
              <DialogDescription className="text-xs">Adicione novos parceiros comerciais à base de homologação da Isoflex.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addSupplierMutation.mutate(supplierForm); }} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Razão Social / Nome Fantasia</Label>
                <Input 
                  placeholder="Ex: Tubos e Perfis Votorantim" 
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">CNPJ</Label>
                  <Input 
                    placeholder="Ex: 12.345.678/0001-99" 
                    value={supplierForm.cnpj}
                    onChange={(e) => setSupplierForm({...supplierForm, cnpj: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Contato Comercial</Label>
                  <Input 
                    placeholder="Ex: Carlos Silva" 
                    value={supplierForm.contact}
                    onChange={(e) => setSupplierForm({...supplierForm, contact: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Telefone / WhatsApp</Label>
                  <Input 
                    placeholder="Ex: (11) 99887-6655" 
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nota de Qualidade (Score)</Label>
                  <select 
                    value={supplierForm.quality_score} 
                    onChange={(e) => setSupplierForm({...supplierForm, quality_score: e.target.value})}
                    className="block w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="5">★ 5 - Excelente</option>
                    <option value="4">★ 4 - Ótimo</option>
                    <option value="3">★ 3 - Regular</option>
                    <option value="2">★ 2 - Ruim</option>
                    <option value="1">★ 1 - Insuficiente</option>
                  </select>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsSupplierModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Cadastrar Fornecedor</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
