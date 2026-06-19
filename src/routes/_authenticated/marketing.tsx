import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe, hasModule } from "@/hooks/use-me";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Megaphone,
  Users,
  BarChart3,
  Plus,
  Filter,
  DollarSign,
  TrendingUp,
  MousePointerClick,
  CheckCircle,
  Calendar,
  Sparkles,
  Search,
  MessageSquare,
  Facebook,
  Instagram,
  Mail,
  Video,
  Globe,
  Loader2,
  Trash2,
  Lock,
  Construction,
} from "lucide-react";
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
  AreaChart,
  Area,
} from "recharts";
import { fmtBRL, fmtPct } from "@/lib/calc";

export function makePlaceholder(title: string, description: string) {
  return function Page() {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Card className="glass border-white/40">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Construction className="h-7 w-7" />
            </div>
            <p className="text-base font-semibold">Módulo em construção</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Este módulo já está listado no menu e protegido por permissões.
              <br />
              Solicite a implementação do conteúdo quando desejar.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };
}

export const Route = createFileRoute("/_authenticated/marketing")({
  component: MarketingPage,
});

const CHANNEL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  google_ads: "Google Ads",
  facebook: "Facebook",
  email: "E-mail",
  tiktok: "TikTok",
  organico: "Orgânico",
  whatsapp: "WhatsApp",
  outro: "Outro",
};

const CHANNEL_ICONS: Record<string, any> = {
  instagram: Instagram,
  google_ads: Globe,
  facebook: Facebook,
  email: Mail,
  tiktok: Video,
  organico: Sparkles,
  whatsapp: MessageSquare,
  outro: Megaphone,
};

const STAGE_LABELS: Record<string, string> = {
  novo: "Novo Lead",
  contato: "Em Contato",
  qualificado: "Qualificado",
  proposta: "Proposta Enviada",
  fechado: "Venda Fechada",
  perdido: "Perdido",
};

const STAGE_COLORS: Record<string, string> = {
  novo: "bg-blue-100 text-blue-800 border-blue-200",
  contato: "bg-amber-100 text-amber-800 border-amber-200",
  qualificado: "bg-purple-100 text-purple-800 border-purple-200",
  proposta: "bg-indigo-100 text-indigo-800 border-indigo-200",
  fechado: "bg-emerald-100 text-emerald-800 border-emerald-200",
  perdido: "bg-rose-100 text-rose-800 border-rose-200",
};

const COLORS = ["#1a4fd6", "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#a855f7", "#ec4899", "#64748b"];

function MarketingPage() {
  const { data: me } = useMe();
  const isMaster = me?.roles.includes("admin_master") ?? false;
  const hasAccess = hasModule(me?.permissions, "marketing", isMaster);

  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Filter States
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignChannelFilter, setCampaignChannelFilter] = useState("all");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadStageFilter, setLeadStageFilter] = useState("all");

  if (me && !hasAccess) {
    return (
      <Card className="glass border-white/40">
        <CardContent className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <Lock className="h-7 w-7" />
          </div>
          <p className="text-base font-semibold">Acesso Restrito</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Você não possui permissão para acessar o módulo de Marketing.
            <br />
            Entre em contato com o administrador do sistema se precisar de acesso.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Modal States
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  // Form States - Campaign
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    channel: "instagram",
    status: "ativa",
    budget: "",
    spent: "",
    revenue: "",
    impressions: "",
    clicks: "",
    conversions: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
  });

  // Form States - Lead
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    channel: "organico",
    campaign_id: "",
    stage: "novo",
    value: "",
    notes: "",
    lead_date: new Date().toISOString().split("T")[0],
  });

  // ── Queries ──
  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ["marketing_campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: leads = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ["marketing_leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_leads")
        .select(`
          *,
          marketing_campaigns (
            name
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Mutations ──
  const createCampaignMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("marketing_campaigns")
        .insert({
          ...payload,
          user_id: u.user.id,
          budget: Number(payload.budget) || 0,
          spent: Number(payload.spent) || 0,
          revenue: Number(payload.revenue) || 0,
          impressions: Number(payload.impressions) || 0,
          clicks: Number(payload.clicks) || 0,
          conversions: Number(payload.conversions) || 0,
          end_date: payload.end_date || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campanha criada com sucesso!");
      qc.invalidateQueries({ queryKey: ["marketing_campaigns"] });
      setIsCampaignModalOpen(false);
      setNewCampaign({
        name: "",
        channel: "instagram",
        status: "ativa",
        budget: "",
        spent: "",
        revenue: "",
        impressions: "",
        clicks: "",
        conversions: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
      });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateCampaignStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("marketing_campaigns")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status da campanha atualizado!");
      qc.invalidateQueries({ queryKey: ["marketing_campaigns"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_campaigns")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campanha excluída com sucesso!");
      qc.invalidateQueries({ queryKey: ["marketing_campaigns"] });
      qc.invalidateQueries({ queryKey: ["marketing_leads"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createLeadMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("marketing_leads")
        .insert({
          ...payload,
          user_id: u.user.id,
          campaign_id: payload.campaign_id || null,
          value: Number(payload.value) || 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead cadastrado com sucesso!");
      qc.invalidateQueries({ queryKey: ["marketing_leads"] });
      setIsLeadModalOpen(false);
      setNewLead({
        name: "",
        email: "",
        phone: "",
        channel: "organico",
        campaign_id: "",
        stage: "novo",
        value: "",
        notes: "",
        lead_date: new Date().toISOString().split("T")[0],
      });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateLeadStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from("marketing_leads")
        .update({ stage })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estágio do lead atualizado!");
      qc.invalidateQueries({ queryKey: ["marketing_leads"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_leads")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead excluído com sucesso!");
      qc.invalidateQueries({ queryKey: ["marketing_leads"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Calculated KPIs ──
  const kpis = useMemo(() => {
    let budget = 0;
    let spent = 0;
    let revenue = 0;
    let conversions = 0;
    let clicks = 0;

    campaigns.forEach((c) => {
      budget += Number(c.budget);
      spent += Number(c.spent);
      revenue += Number(c.revenue);
      conversions += Number(c.conversions);
      clicks += Number(c.clicks);
    });

    const leadCount = leads.length;
    const cpl = leadCount > 0 ? spent / leadCount : 0;
    const roi = spent > 0 ? ((revenue - spent) / spent) * 100 : 0;
    const ctr = clicks > 0 ? (conversions / clicks) * 100 : 0;

    return {
      budget,
      spent,
      revenue,
      leadCount,
      conversions,
      cpl,
      roi,
      ctr,
    };
  }, [campaigns, leads]);

  // ── Filtered Collections ──
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(campaignSearch.toLowerCase());
      const matchChannel = campaignChannelFilter === "all" || c.channel === campaignChannelFilter;
      return matchSearch && matchChannel;
    });
  }, [campaigns, campaignSearch, campaignChannelFilter]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        (l.name && l.name.toLowerCase().includes(leadSearch.toLowerCase())) ||
        (l.email && l.email.toLowerCase().includes(leadSearch.toLowerCase())) ||
        (l.phone && l.phone.includes(leadSearch));
      const matchStage = leadStageFilter === "all" || l.stage === leadStageFilter;
      return matchSearch && matchStage;
    });
  }, [leads, leadSearch, leadStageFilter]);

  // ── Channel performance calculations ──
  const channelData = useMemo(() => {
    const channelMap: Record<string, { leads: number; clicks: number; spent: number; revenue: number; conversions: number }> = {};

    // Initialize map
    Object.keys(CHANNEL_LABELS).forEach((ch) => {
      channelMap[ch] = { leads: 0, clicks: 0, spent: 0, revenue: 0, conversions: 0 };
    });

    // Aggregate campaigns
    campaigns.forEach((c) => {
      if (channelMap[c.channel]) {
        channelMap[c.channel].spent += Number(c.spent);
        channelMap[c.channel].revenue += Number(c.revenue);
        channelMap[c.channel].clicks += Number(c.clicks);
        channelMap[c.channel].conversions += Number(c.conversions);
      }
    });

    // Aggregate leads
    leads.forEach((l) => {
      if (channelMap[l.channel]) {
        channelMap[l.channel].leads += 1;
      }
    });

    return Object.entries(channelMap)
      .map(([channel, metrics]) => ({
        channel,
        label: CHANNEL_LABELS[channel] || channel,
        ...metrics,
        roi: metrics.spent > 0 ? ((metrics.revenue - metrics.spent) / metrics.spent) * 100 : 0,
        cpl: metrics.leads > 0 ? metrics.spent / metrics.leads : 0,
      }))
      .filter((ch) => ch.leads > 0 || ch.spent > 0 || ch.clicks > 0);
  }, [campaigns, leads]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 animate-enter">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary animate-float" />
            Marketing & Aquisição
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe o desempenho de canais, campanhas pagas e geração de leads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isCampaignModalOpen} onOpenChange={setIsCampaignModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="hover:scale-[1.02] active:scale-[0.98] transition-all">
                <Plus className="h-4 w-4 mr-1.5" />
                Nova Campanha
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md glass-strong border-white/50">
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Campanha</DialogTitle>
                <DialogDescription>Insira as métricas iniciais da sua campanha.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label>Nome da Campanha</Label>
                  <Input
                    placeholder="Ex: Black Friday 2026"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Canal</Label>
                    <Select
                      value={newCampaign.channel}
                      onValueChange={(v) => setNewCampaign({ ...newCampaign, channel: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CHANNEL_LABELS).map(([val, lbl]) => (
                          <SelectItem key={val} value={val}>
                            {lbl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={newCampaign.status}
                      onValueChange={(v) => setNewCampaign({ ...newCampaign, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativa">Ativa</SelectItem>
                        <SelectItem value="pausada">Pausada</SelectItem>
                        <SelectItem value="encerrada">Encerrada</SelectItem>
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Orçamento (R$)</Label>
                    <Input
                      type="number"
                      placeholder="1000.00"
                      value={newCampaign.budget}
                      onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gasto Atual (R$)</Label>
                    <Input
                      type="number"
                      placeholder="150.00"
                      value={newCampaign.spent}
                      onChange={(e) => setNewCampaign({ ...newCampaign, spent: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Receita Gerada (R$)</Label>
                  <Input
                    type="number"
                    placeholder="4500.00"
                    value={newCampaign.revenue}
                    onChange={(e) => setNewCampaign({ ...newCampaign, revenue: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>Impressões</Label>
                    <Input
                      type="number"
                      placeholder="10000"
                      value={newCampaign.impressions}
                      onChange={(e) => setNewCampaign({ ...newCampaign, impressions: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cliques</Label>
                    <Input
                      type="number"
                      placeholder="450"
                      value={newCampaign.clicks}
                      onChange={(e) => setNewCampaign({ ...newCampaign, clicks: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conversões</Label>
                    <Input
                      type="number"
                      placeholder="22"
                      value={newCampaign.conversions}
                      onChange={(e) => setNewCampaign({ ...newCampaign, conversions: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Data de Início</Label>
                    <Input
                      type="date"
                      value={newCampaign.start_date}
                      onChange={(e) => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Fim (Opcional)</Label>
                    <Input
                      type="date"
                      value={newCampaign.end_date}
                      onChange={(e) => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCampaignModalOpen(false)}
                  disabled={createCampaignMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => createCampaignMutation.mutate(newCampaign)}
                  disabled={createCampaignMutation.isPending || !newCampaign.name}
                >
                  {createCampaignMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isLeadModalOpen} onOpenChange={setIsLeadModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="glass border-white/50 hover:scale-[1.02] active:scale-[0.98] transition-all">
                <Users className="h-4 w-4 mr-1.5" />
                Novo Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md glass-strong border-white/50">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Lead</DialogTitle>
                <DialogDescription>Cadastre um lead manualmente no funil de marketing.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label>Nome do Lead</Label>
                  <Input
                    placeholder="Ex: João da Silva"
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      placeholder="joao@empresa.com"
                      value={newLead.email}
                      onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone / WhatsApp</Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={newLead.phone}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Canal de Origem</Label>
                    <Select
                      value={newLead.channel}
                      onValueChange={(v) => setNewLead({ ...newLead, channel: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CHANNEL_LABELS).map(([val, lbl]) => (
                          <SelectItem key={val} value={val}>
                            {lbl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estágio Inicial</Label>
                    <Select
                      value={newLead.stage}
                      onValueChange={(v) => setNewLead({ ...newLead, stage: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STAGE_LABELS).map(([val, lbl]) => (
                          <SelectItem key={val} value={val}>
                            {lbl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Campanha Associada (Opcional)</Label>
                    <Select
                      value={newLead.campaign_id}
                      onValueChange={(v) => setNewLead({ ...newLead, campaign_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhuma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">Nenhuma</SelectItem>
                        {campaigns.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Estimado (R$)</Label>
                    <Input
                      type="number"
                      placeholder="1500.00"
                      value={newLead.value}
                      onChange={(e) => setNewLead({ ...newLead, value: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notas / Observações</Label>
                  <Textarea
                    placeholder="Detalhes adicionais sobre as necessidades do cliente..."
                    value={newLead.notes}
                    onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Entrada</Label>
                  <Input
                    type="date"
                    value={newLead.lead_date}
                    onChange={(e) => setNewLead({ ...newLead, lead_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsLeadModalOpen(false)}
                  disabled={createLeadMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    const payload = { ...newLead };
                    if (payload.campaign_id === "_none_") payload.campaign_id = "";
                    createLeadMutation.mutate(payload);
                  }}
                  disabled={createLeadMutation.isPending || !newLead.name}
                >
                  {createLeadMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Cadastrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="glass border border-white/40 shadow-sm p-1 h-auto flex flex-wrap gap-1 w-fit">
          <TabsTrigger value="overview" className="flex items-center gap-1.5 font-semibold py-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-1.5 font-semibold py-2">
            <Megaphone className="h-4 w-4" />
            Campanhas ({filteredCampaigns.length})
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-1.5 font-semibold py-2">
            <Users className="h-4 w-4" />
            Leads ({filteredLeads.length})
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center gap-1.5 font-semibold py-2">
            <TrendingUp className="h-4 w-4" />
            Desempenho de Canais
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Visão Geral ── */}
        <TabsContent value="overview" className="space-y-6 animate-enter-1">
          {/* KPI Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card className="glass card-hover-effect custom-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Investido</p>
                    <h3 className="text-xl font-bold mt-1 text-foreground">{fmtBRL(kpis.spent)}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Orçamento: {fmtBRL(kpis.budget)}</p>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass card-hover-effect custom-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Receita de Marketing</p>
                    <h3 className="text-xl font-bold mt-1 text-foreground">{fmtBRL(kpis.revenue)}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">ROI Geral: <span className="font-semibold text-emerald-600">{kpis.roi.toFixed(1)}%</span></p>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass card-hover-effect custom-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Leads Totais</p>
                    <h3 className="text-xl font-bold mt-1 text-foreground">{kpis.leadCount}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Custo por Lead (CPL): <span className="font-semibold">{fmtBRL(kpis.cpl)}</span></p>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass card-hover-effect custom-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Conversões</p>
                    <h3 className="text-xl font-bold mt-1 text-foreground">{kpis.conversions}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Taxa de Conversão: <span className="font-semibold text-primary">{kpis.ctr.toFixed(1)}%</span></p>
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                    <MousePointerClick className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glass border-white/40">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Leads & Conversões por Canal</CardTitle>
                <CardDescription>Quantidade de captações integradas em cada canal</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {channelData.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                    Nenhum dado registrado
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={channelData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid rgba(255,255,255,0.6)",
                          background: "rgba(255,255,255,0.95)",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                          fontSize: "12px",
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="leads" name="Leads" fill="#1a4fd6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="conversions" name="Conversões" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="glass border-white/40">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Gasto vs Receita por Canal</CardTitle>
                <CardDescription>Retorno financeiro por canal de captação</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {channelData.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                    Nenhum dado registrado
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <AreaChart data={channelData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip
                        formatter={(v) => fmtBRL(Number(v))}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid rgba(255,255,255,0.6)",
                          background: "rgba(255,255,255,0.95)",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                          fontSize: "12px",
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                      <Area type="monotone" dataKey="revenue" name="Receita" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                      <Area type="monotone" dataKey="spent" name="Investido" stroke="#ef4444" fill="#ef4444" fillOpacity={0.08} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab: Campanhas ── */}
        <TabsContent value="campaigns" className="space-y-4 animate-enter-1">
          {/* Filters */}
          <Card className="glass border-white/40 shadow-sm">
            <CardContent className="py-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campanhas..."
                  className="pl-9 glass border-white/40"
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={campaignChannelFilter} onValueChange={setCampaignChannelFilter}>
                  <SelectTrigger className="w-40 glass border-white/40">
                    <SelectValue placeholder="Canais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Canais</SelectItem>
                    {Object.entries(CHANNEL_LABELS).map(([ch, label]) => (
                      <SelectItem key={ch} value={ch}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Campaigns Grid */}
          {isLoadingCampaigns ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <Card className="glass border-white/40 text-center py-12">
              <p className="text-muted-foreground">Nenhuma campanha encontrada</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCampaigns.map((c) => {
                const Icon = CHANNEL_ICONS[c.channel] || Megaphone;
                const roi = Number(c.spent) > 0 ? ((Number(c.revenue) - Number(c.spent)) / Number(c.spent)) * 100 : 0;
                return (
                  <Card key={c.id} className="glass card-hover-effect custom-shadow relative overflow-hidden flex flex-col justify-between">
                    <div className="p-5 space-y-4">
                      {/* Name & Channel Icon */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-base text-foreground truncate">{c.name}</h3>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Icon className="h-3.5 w-3.5" />
                            <span>{CHANNEL_LABELS[c.channel]}</span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            c.status === "ativa"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : c.status === "pausada"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-zinc-50 text-zinc-800 border-zinc-200"
                          }
                        >
                          {c.status.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Values Grid */}
                      <div className="grid grid-cols-2 gap-3 text-xs border-t border-b border-black/5 py-3">
                        <div>
                          <span className="text-muted-foreground block">Orçamento</span>
                          <span className="font-semibold text-foreground">{fmtBRL(c.budget)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Gasto Realizado</span>
                          <span className="font-semibold text-foreground">{fmtBRL(c.spent)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Receita Gerada</span>
                          <span className="font-semibold text-foreground">{fmtBRL(c.revenue)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">ROI</span>
                          <span className={roi >= 0 ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>
                            {roi.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Secondary metrics */}
                      <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground text-center">
                        <div className="bg-muted/40 p-1.5 rounded">
                          <span className="block font-semibold text-foreground">{c.impressions}</span>
                          <span>Imp.</span>
                        </div>
                        <div className="bg-muted/40 p-1.5 rounded">
                          <span className="block font-semibold text-foreground">{c.clicks}</span>
                          <span>Cliques</span>
                        </div>
                        <div className="bg-muted/40 p-1.5 rounded">
                          <span className="block font-semibold text-foreground">{c.conversions}</span>
                          <span>Conv.</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="border-t border-black/5 px-5 py-3 bg-muted/20 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Início: {new Date(c.start_date).toLocaleDateString("pt-BR")}
                      </span>
                      <div className="flex gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Alternar status"
                          onClick={() => {
                            const newStatus = c.status === "ativa" ? "pausada" : "ativa";
                            updateCampaignStatusMutation.mutate({ id: c.id, status: newStatus });
                          }}
                        >
                          <Loader2 className={updateCampaignStatusMutation.isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Excluir campanha"
                          onClick={() => {
                            if (confirm(`Deseja realmente excluir a campanha "${c.name}"? Isso também removerá a associação a leads.`)) {
                              deleteCampaignMutation.mutate(c.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Leads ── */}
        <TabsContent value="leads" className="space-y-4 animate-enter-1">
          {/* Filters */}
          <Card className="glass border-white/40 shadow-sm">
            <CardContent className="py-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar leads por nome, e-mail..."
                  className="pl-9 glass border-white/40"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={leadStageFilter} onValueChange={setLeadStageFilter}>
                  <SelectTrigger className="w-44 glass border-white/40">
                    <SelectValue placeholder="Estágios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Estágios</SelectItem>
                    {Object.entries(STAGE_LABELS).map(([stage, label]) => (
                      <SelectItem key={stage} value={stage}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Leads Table */}
          {isLoadingLeads ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <Card className="glass border-white/40 text-center py-12">
              <p className="text-muted-foreground">Nenhum lead encontrado</p>
            </Card>
          ) : (
            <Card className="glass border-white/40 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Estágio do Funil</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((l) => {
                    const ChannelIcon = CHANNEL_ICONS[l.channel] || Sparkles;
                    return (
                      <TableRow key={l.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <div className="font-semibold text-foreground">{l.name || "Sem Nome"}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Entrada: {new Date(l.lead_date).toLocaleDateString("pt-BR")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">{l.email || "-"}</div>
                          <div className="text-[10px] text-muted-foreground">{l.phone || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs">
                            <ChannelIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{CHANNEL_LABELS[l.channel] || l.channel}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={l.stage}
                            onValueChange={(val) => updateLeadStageMutation.mutate({ id: l.id, stage: val })}
                          >
                            <SelectTrigger className="h-8 w-40 text-xs py-1 px-2 border-white/40 bg-white/40 shadow-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STAGE_LABELS).map(([val, lbl]) => (
                                <SelectItem key={val} value={val} className="text-xs">
                                  {lbl}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs truncate max-w-[120px] block">
                            {l.marketing_campaigns?.name || <span className="text-muted-foreground/50">—</span>}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          {fmtBRL(l.value)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => {
                              if (confirm(`Deseja realmente excluir o lead "${l.name}"?`)) {
                                deleteLeadMutation.mutate(l.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Canais ── */}
        <TabsContent value="channels" className="space-y-6 animate-enter-1">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glass border-white/40">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Retorno (ROI) por Canal</CardTitle>
                <CardDescription>Compara a eficiência de retorno sobre o gasto em cada canal</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {channelData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Sem dados registrados
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={channelData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        formatter={(v) => `${Number(v).toFixed(1)}%`}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid rgba(255,255,255,0.6)",
                          background: "rgba(255,255,255,0.95)",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="roi" name="ROI" fill="#6366f1">
                        {channelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.roi >= 0 ? "#10b981" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="glass border-white/40">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Custo por Lead (CPL) por Canal</CardTitle>
                <CardDescription>Custo médio financeiro para captar cada lead por canal</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {channelData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Sem dados registrados
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={channelData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip
                        formatter={(v) => fmtBRL(Number(v))}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid rgba(255,255,255,0.6)",
                          background: "rgba(255,255,255,0.95)",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="cpl" name="CPL (R$)" fill="#1a4fd6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
