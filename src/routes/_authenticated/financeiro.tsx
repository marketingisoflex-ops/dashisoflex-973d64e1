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
  Users,
  Clock,
  Trash2,
  Calendar,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: SacComprasPage,
});

interface SacRecord {
  id: string;
  client_name: string;
  responsible: string;
  issue: string;
  status: "aberto" | "em_atendimento" | "resolvido";
  created_at: string;
}

interface PurchaseRecord {
  id: string;
  item_name: string;
  responsible: string;
  quantity: number;
  status: "cotacao" | "aprovado" | "entregue";
  delivery_date: string;
}

function SacComprasPage() {
  const { data: me } = useMe();
  const isMaster = me?.roles.includes("admin_master") ?? false;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("sac");
  const [isSacModalOpen, setIsSacModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  // Form States - SAC
  const [sacForm, setSacForm] = useState({
    client_name: "",
    responsible: "",
    issue: "",
    status: "aberto",
  });

  // Form States - Compras
  const [purchaseForm, setPurchaseForm] = useState({
    item_name: "",
    responsible: "",
    quantity: "",
    status: "cotacao",
    delivery_date: new Date().toISOString().split("T")[0],
  });

  // ── Queries - SAC Records ──
  const { data: sacRecords = [] } = useQuery<SacRecord[]>({
    queryKey: ["sac_records"],
    queryFn: async () => {
      const stored = localStorage.getItem("sac_records_fallback");
      return stored ? JSON.parse(stored) : [];
    },
  });

  // ── Queries - Purchase Records ──
  const { data: purchaseRecords = [] } = useQuery<PurchaseRecord[]>({
    queryKey: ["purchase_records"],
    queryFn: async () => {
      const stored = localStorage.getItem("purchase_records_fallback");
      return stored ? JSON.parse(stored) : [];
    },
  });

  // ── Mutations - Add SAC ──
  const addSacMutation = useMutation({
    mutationFn: async (payload: any) => {
      const stored = localStorage.getItem("sac_records_fallback");
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: `sac_${Date.now()}`,
        client_name: payload.client_name,
        responsible: payload.responsible,
        issue: payload.issue,
        status: payload.status,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem("sac_records_fallback", JSON.stringify(list));
    },
    onSuccess: () => {
      toast.success("Ticket de SAC registrado com sucesso!");
      qc.invalidateQueries({ queryKey: ["sac_records"] });
      setIsSacModalOpen(false);
      setSacForm({ client_name: "", responsible: "", issue: "", status: "aberto" });
    },
  });

  // ── Mutations - Add Purchase ──
  const addPurchaseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const stored = localStorage.getItem("purchase_records_fallback");
      const list = stored ? JSON.parse(stored) : [];
      list.push({
        id: `pur_${Date.now()}`,
        item_name: payload.item_name,
        responsible: payload.responsible,
        quantity: Number(payload.quantity || 1),
        status: payload.status,
        delivery_date: payload.delivery_date,
      });
      localStorage.setItem("purchase_records_fallback", JSON.stringify(list));
    },
    onSuccess: () => {
      toast.success("Pedido de compra registrado!");
      qc.invalidateQueries({ queryKey: ["purchase_records"] });
      setIsPurchaseModalOpen(false);
      setPurchaseForm({
        item_name: "",
        responsible: "",
        quantity: "",
        status: "cotacao",
        delivery_date: new Date().toISOString().split("T")[0],
      });
    },
  });

  // Delete mutations
  const deleteSacMutation = useMutation({
    mutationFn: async (id: string) => {
      const stored = localStorage.getItem("sac_records_fallback");
      if (stored) {
        let list = JSON.parse(stored);
        list = list.filter((item: any) => item.id !== id);
        localStorage.setItem("sac_records_fallback", JSON.stringify(list));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sac_records"] });
      toast.success("Ticket de SAC removido!");
    },
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const stored = localStorage.getItem("purchase_records_fallback");
      if (stored) {
        let list = JSON.parse(stored);
        list = list.filter((item: any) => item.id !== id);
        localStorage.setItem("purchase_records_fallback", JSON.stringify(list));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase_records"] });
      toast.success("Pedido de compra removido!");
    },
  });

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
              Gerenciamento de chamados de atendimento ao cliente (SAC) e solicitações de compras.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {activeTab === "sac" ? (
            <Button onClick={() => setIsSacModalOpen(true)} className="glass border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Novo Ticket SAC
            </Button>
          ) : (
            <Button onClick={() => setIsPurchaseModalOpen(true)} className="glass border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Nova Solicitação de Compra
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-200/50 p-1 border border-slate-300/30">
          <TabsTrigger value="sac" className="gap-2">
            <PhoneCall className="h-4 w-4" /> SAC / Atendimento
          </TabsTrigger>
          <TabsTrigger value="compras" className="gap-2">
            <ShoppingCart className="h-4 w-4" /> Compras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sac" className="space-y-6 mt-4">
          <Card className="glass border-white/40">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-800">Atendimentos SAC</CardTitle>
              <CardDescription className="text-xs">Controle de chamados abertos e resolvidos.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Responsável pelo SAC</TableHead>
                    <TableHead>Descrição / Problema</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Abertura</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sacRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                        Nenhum ticket de SAC registrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sacRecords.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-semibold text-xs text-slate-800">{rec.client_name}</TableCell>
                        <TableCell className="text-xs font-semibold text-indigo-600">{rec.responsible}</TableCell>
                        <TableCell className="text-xs text-slate-600 max-w-xs truncate">{rec.issue}</TableCell>
                        <TableCell>
                          <Badge className={
                            rec.status === "resolvido" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                            rec.status === "em_atendimento" ? "bg-amber-100 text-amber-800 border-amber-200" :
                            "bg-blue-100 text-blue-800 border-blue-200"
                          }>
                            {rec.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(rec.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="icon" variant="ghost" className="hover:bg-rose-50" onClick={() => deleteSacMutation.mutate(rec.id)}>
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
        </TabsContent>

        <TabsContent value="compras" className="space-y-6 mt-4">
          <Card className="glass border-white/40">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-800">Solicitações de Compras</CardTitle>
              <CardDescription className="text-xs">Orçamentos, cotações e status de mercadorias solicitadas pela empresa.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item / Insumo</TableHead>
                    <TableHead>Responsável Compras</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Previsão de Entrega</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                        Nenhuma solicitação de compra registrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchaseRecords.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-semibold text-xs text-slate-800">{rec.item_name}</TableCell>
                        <TableCell className="text-xs font-semibold text-indigo-600">{rec.responsible}</TableCell>
                        <TableCell className="text-xs text-slate-600 font-bold">{rec.quantity}</TableCell>
                        <TableCell>
                          <Badge className={
                            rec.status === "entregue" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                            rec.status === "aprovado" ? "bg-blue-100 text-blue-800 border-blue-200" :
                            "bg-amber-100 text-amber-800 border-amber-200"
                          }>
                            {rec.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(rec.delivery_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="icon" variant="ghost" className="hover:bg-rose-50" onClick={() => deletePurchaseMutation.mutate(rec.id)}>
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
        </TabsContent>
      </Tabs>

      {/* Add SAC Dialog */}
      {isSacModalOpen && (
        <Dialog open onOpenChange={setIsSacModalOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-800">Lançar Chamado SAC</DialogTitle>
              <DialogDescription className="text-xs">Insira os dados do chamado de atendimento ao cliente.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addSacMutation.mutate(sacForm);
              }}
              className="space-y-4 py-2"
            >
              <div className="space-y-1">
                <Label htmlFor="sac_client" className="text-xs">Cliente</Label>
                <Input
                  id="sac_client"
                  type="text"
                  placeholder="Ex: Coca Cola"
                  value={sacForm.client_name}
                  onChange={(e) => setSacForm({ ...sacForm, client_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sac_resp" className="text-xs">Responsável pelo SAC</Label>
                <Input
                  id="sac_resp"
                  type="text"
                  placeholder="Ex: Ana Souza"
                  value={sacForm.responsible}
                  onChange={(e) => setSacForm({ ...sacForm, responsible: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="sac_issue" className="text-xs">Descrição do Ocorrido</Label>
                <Input
                  id="sac_issue"
                  type="text"
                  placeholder="Ex: Atraso na entrega ou problema de acabamento..."
                  value={sacForm.issue}
                  onChange={(e) => setSacForm({ ...sacForm, issue: e.target.value })}
                  required
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsSacModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Lançar Ticket
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Purchase Dialog */}
      {isPurchaseModalOpen && (
        <Dialog open onOpenChange={setIsPurchaseModalOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-800">Lançar Compra</DialogTitle>
              <DialogDescription className="text-xs">Insira a solicitação de materiais/insumos da fábrica.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addPurchaseMutation.mutate(purchaseForm);
              }}
              className="space-y-4 py-2"
            >
              <div className="space-y-1">
                <Label htmlFor="pur_item" className="text-xs">Insumo / Matéria-Prima</Label>
                <Input
                  id="pur_item"
                  type="text"
                  placeholder="Ex: Perfis de Alumínio Extrudado"
                  value={purchaseForm.item_name}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, item_name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="pur_resp" className="text-xs">Responsável Compras</Label>
                  <Input
                    id="pur_resp"
                    type="text"
                    placeholder="Ex: Marcos Silva"
                    value={purchaseForm.responsible}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, responsible: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pur_qty" className="text-xs">Quantidade</Label>
                  <Input
                    id="pur_qty"
                    type="number"
                    placeholder="10"
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="pur_delivery" className="text-xs">Previsão de Entrega</Label>
                <Input
                  id="pur_delivery"
                  type="date"
                  value={purchaseForm.delivery_date}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, delivery_date: e.target.value })}
                  required
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsPurchaseModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Solicitar Compra
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
