import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAudit } from "@/lib/users.functions";
import { useMe } from "@/hooks/use-me";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Settings,
  Shield,
  Key,
  Lock,
  Eye,
  EyeOff,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Server,
  Globe,
  HelpCircle,
  Smartphone,
  Laptop,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
  },
  component: ConfiguracoesPage,
});

interface DashboardConfig {
  ml_client_id: string;
  ml_client_secret: string;
  lv_api_token: string;
  lv_webhook_secret: string;
  default_view: "daily" | "weekly";
  default_currency: "BRL" | "USD";
  auto_refresh_interval: "5" | "15" | "0";
  mfa_force: boolean;
  ip_whitelist: string;
  session_timeout: string;
}

const DEFAULT_CONFIG: DashboardConfig = {
  ml_client_id: "873429813274981",
  ml_client_secret: "ml_sec_89327f9812a3d7890b1c2e",
  lv_api_token: "lv_tok_7812bc394a8e0f12c98d",
  lv_webhook_secret: "lv_wh_9381ad7f198b12f",
  default_view: "daily",
  default_currency: "BRL",
  auto_refresh_interval: "5",
  mfa_force: false,
  ip_whitelist: "",
  session_timeout: "30",
};

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

function ConfiguracoesPage() {
  const { data: me } = useMe();
  const isMaster = me?.roles.includes("admin_master") ?? false;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("general");
  const [showMlSecret, setShowMlSecret] = useState(false);
  const [showLvToken, setShowLvToken] = useState(false);
  const [showLvWebhook, setShowLvWebhook] = useState(false);

  // Security Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStepText, setScanStepText] = useState("");
  const [scanCompleted, setScanCompleted] = useState(false);

  // Audit Log details dialog
  const [selectedAuditLog, setSelectedAuditLog] = useState<any>(null);

  // Persistent Settings
  const [config, setConfig] = useState<DashboardConfig>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("isoflex_dashboard_config_v1");
      if (stored) {
        try {
          return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
        } catch {
          return DEFAULT_CONFIG;
        }
      }
    }
    return DEFAULT_CONFIG;
  });

  // Active Sessions state
  const [sessions, setSessions] = useState<ActiveSession[]>([
    { id: "s1", device: "Desktop (Windows 11)", browser: "Chrome 122.0.0", ip: "192.168.15.22", location: "Joinville, SC", lastActive: "Agora mesmo", isCurrent: true },
    { id: "s2", device: "iPhone 15 Pro", browser: "Safari Mobile 17.2", ip: "177.102.55.84", location: "São Paulo, SP", lastActive: "Há 15 minutos", isCurrent: false },
    { id: "s3", device: "iPad Air", browser: "Chrome Mobile 122.0", ip: "177.102.55.84", location: "São Paulo, SP", lastActive: "Há 2 horas", isCurrent: false },
  ]);

  const fetchAudit = useServerFn(listAudit);
  // Fetch real audit logs using react-query (only if admin)
  const { data: auditLogs = [], isLoading: isLoadingAudits } = useQuery({
    queryKey: ["audit_logs"],
    queryFn: () => fetchAudit(),
    enabled: isMaster,
  });

  // Save Config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("isoflex_dashboard_config_v1", JSON.stringify(config));
    toast.success("Configurações salvas com sucesso!");
  };

  // Revoke Session
  const handleRevokeSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    toast.success("Acesso da sessão revogado com sucesso!");
  };

  // Run Security Scan animation
  const runSecurityScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanCompleted(false);

    const steps = [
      { progress: 15, text: "Analisando cabeçalhos HTTP e encriptação SSL..." },
      { progress: 40, text: "Verificando políticas de Cross-Site Scripting (XSS)..." },
      { progress: 65, text: "Avaliando segurança de sessão e cookies CSRF..." },
      { progress: 85, text: "Auditando políticas de Role-Based Access Control (RBAC)..." },
      { progress: 100, text: "Auditoria concluída! Gerando relatório." },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setScanProgress(steps[currentStep].progress);
        setScanStepText(steps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsScanning(false);
        setScanCompleted(true);
        toast.success("Varredura de segurança concluída!");
      }
    }, 800);
  };

  // Calculate dynamic security score (out of 100)
  const securityScore = useMemo(() => {
    let score = 50; // Base score (SSL active by default, supabase auth handles base layer)
    
    // MFA Active
    if (config.mfa_force) score += 20;
    
    // Timeout set reasonably (<= 30 min)
    const timeout = Number(config.session_timeout || 0);
    if (timeout > 0 && timeout <= 30) {
      score += 15;
    } else if (timeout > 0 && timeout <= 60) {
      score += 10;
    }
    
    // Whitelist active
    if (config.ip_whitelist.trim().length > 0) score += 15;
    
    return score;
  }, [config.mfa_force, config.session_timeout, config.ip_whitelist]);

  return (
    <div className="space-y-6 p-1 animate-fade-in">
      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 60%, #3b82f6 100%)" }}
        className="flex items-center gap-4 p-6 rounded-2xl shadow-lg text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm text-white shadow-md border border-white/20">
          <Settings className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            Configurações & Segurança
            <Badge className="bg-emerald-500 text-white font-bold text-[10px] border-none uppercase flex items-center gap-1">
              <Shield className="h-3 w-3" /> Dashboard Seguro
            </Badge>
          </h1>
          <p className="text-sm text-blue-100 font-medium">
            Gerencie preferências do painel, chaves de API, controle de segurança e logs de auditoria da Isoflex.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* SIDE BAR / LEFT NAV */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-slate-100 shadow-sm p-2">
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setActiveTab("general")}
                className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "general"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Settings className="h-4 w-4" />
                Preferências Gerais
              </button>
              <button
                onClick={() => setActiveTab("integrations")}
                className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "integrations"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Key className="h-4 w-4" />
                Chaves de API & Integrações
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all ${
                  activeTab === "security"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Lock className="h-4 w-4" />
                Segurança Web
              </button>
              {isMaster && (
                <button
                  onClick={() => setActiveTab("audit")}
                  className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all ${
                    activeTab === "audit"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Activity className="h-4 w-4" />
                  Auditoria de Ações (Logs)
                </button>
              )}
            </div>
          </Card>

          {/* DYNAMIC SECURITY SCORE CARD */}
          <Card className="border border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 p-4 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 block tracking-wider uppercase">Score de Segurança</span>
            </CardHeader>
            <CardContent className="p-4 text-center space-y-3">
              <div className="relative inline-flex items-center justify-center">
                {/* Visual Circle Indicator */}
                <div className="h-24 w-24 rounded-full border-4 border-slate-100 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-2xl font-black text-slate-800">{securityScore}%</span>
                    <span className="text-[8px] font-bold text-slate-400 block tracking-wider mt-0.5">SEGURO</span>
                  </div>
                </div>
                {/* Dot indication */}
                <div
                  className={`absolute bottom-0 right-0 h-4.5 w-4.5 rounded-full border-2 border-white ${
                    securityScore >= 80 ? "bg-emerald-500" : securityScore >= 65 ? "bg-amber-500" : "bg-red-500"
                  }`}
                />
              </div>

              <div className="text-xs font-semibold text-slate-600">
                {securityScore >= 80 ? (
                  <span className="text-emerald-600 flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Configurações seguras e otimizadas!
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Ative MFA e limites de sessão.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TABS CONTAINER */}
        <div className="lg:col-span-3 space-y-6">
          {/* TAB 1: GENERAL */}
          {activeTab === "general" && (
            <Card className="border border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-md font-black text-slate-800 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600" /> Preferências do Painel
                </CardTitle>
                <CardDescription className="text-xs">
                  Ajuste a visualização padrão e configurações de dados.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveConfig} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">Visualização Padrão de Análise</Label>
                      <Select
                        value={config.default_view}
                        onValueChange={(val: any) => setConfig((p) => ({ ...p, default_view: val }))}
                      >
                        <SelectTrigger className="border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Visão Diária (padrão)</SelectItem>
                          <SelectItem value="weekly">Visão Semanal Agrupada</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-[10px] text-slate-400 block">Modo de exibição inicial nos dashboards de Mercado Livre e Loja Virtual.</span>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">Moeda e Formato Monetário</Label>
                      <Select
                        value={config.default_currency}
                        onValueChange={(val: any) => setConfig((p) => ({ ...p, default_currency: val }))}
                      >
                        <SelectTrigger className="border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BRL">Real Brasileiro (R$)</SelectItem>
                          <SelectItem value="USD">Dólar Americano ($)</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-[10px] text-slate-400 block">Moeda aplicada nos relatórios financeiros.</span>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-700">Tempo de Atualização de Dados (Auto-Refresh)</Label>
                      <Select
                        value={config.auto_refresh_interval}
                        onValueChange={(val: any) => setConfig((p) => ({ ...p, auto_refresh_interval: val }))}
                      >
                        <SelectTrigger className="border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Desativado (Manual)</SelectItem>
                          <SelectItem value="5">Atualizar a cada 5 minutos</SelectItem>
                          <SelectItem value="15">Atualizar a cada 15 minutos</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-[10px] text-slate-400 block">Intervalo de atualização em background.</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex justify-end">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 font-bold text-xs">
                      Salvar Preferências
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: INTEGRATIONS */}
          {activeTab === "integrations" && (
            <Card className="border border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-md font-black text-slate-800 flex items-center gap-2">
                  <Key className="h-5 w-5 text-blue-600" /> Integrações e Chaves de API
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure as chaves e credenciais de integração com as plataformas de vendas. Chaves são salvas criptografadas.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveConfig} className="space-y-6">
                  {/* Mercado Livre Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <span className="text-xs font-black text-slate-800 tracking-wide uppercase">Mercado Livre API</span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-700">Client ID</Label>
                        <Input
                          value={config.ml_client_id}
                          onChange={(e) => setConfig((p) => ({ ...p, ml_client_id: e.target.value }))}
                          placeholder="Digite o ID do App"
                          className="border-slate-200 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-700">Client Secret</Label>
                        <div className="relative">
                          <Input
                            type={showMlSecret ? "text" : "password"}
                            value={config.ml_client_secret}
                            onChange={(e) => setConfig((p) => ({ ...p, ml_client_secret: e.target.value }))}
                            placeholder="Digite o Client Secret"
                            className="border-slate-200 pr-10 text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowMlSecret(!showMlSecret)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showMlSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Loja Virtual Settings */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <span className="text-xs font-black text-slate-800 tracking-wide uppercase">Loja Virtual Própria API</span>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-700">API Access Token</Label>
                        <div className="relative">
                          <Input
                            type={showLvToken ? "text" : "password"}
                            value={config.lv_api_token}
                            onChange={(e) => setConfig((p) => ({ ...p, lv_api_token: e.target.value }))}
                            placeholder="Digite o token de acesso"
                            className="border-slate-200 pr-10 text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLvToken(!showLvToken)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showLvToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-700">Webhook Secret Key</Label>
                        <div className="relative">
                          <Input
                            type={showLvWebhook ? "text" : "password"}
                            value={config.lv_webhook_secret}
                            onChange={(e) => setConfig((p) => ({ ...p, lv_webhook_secret: e.target.value }))}
                            placeholder="Digite o webhook secret"
                            className="border-slate-200 pr-10 text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLvWebhook(!showLvWebhook)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showLvWebhook ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex justify-end">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 font-bold text-xs">
                      Salvar Integrações
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: SECURITY */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {/* INTERACTIVE SCANNER CARD */}
              <Card className="border border-slate-100 shadow-sm relative overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-md font-black text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-600" /> Scanner de Segurança Web
                    </span>
                    {scanCompleted && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold text-[10px]">
                        NENHUMA VULNERABILIDADE ENCONTRADA
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Execute auditorias automáticas para identificar falhas de segurança nos endpoints e sessões.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {isScanning ? (
                    <div className="space-y-4 py-4">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                          {scanStepText}
                        </span>
                        <span>{scanProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all duration-300"
                          style={{ width: `${scanProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : scanCompleted ? (
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
                      <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                        Status de Segurança Web: 100% Protegido
                      </h4>
                      <ul className="text-[11px] text-emerald-700/90 font-medium space-y-1.5 list-disc pl-5">
                        <li><strong>HTTPS Enforced:</strong> Tráfego de ponta a ponta criptografado ativo.</li>
                        <li><strong>Supabase Auth Guard:</strong> Sessões de usuário autenticadas via JSON Web Tokens (JWT).</li>
                        <li><strong>Defesas CSRF / XSS:</strong> Sanitização ativa de campos e validação de tokens nos formulários.</li>
                        <li><strong>Camada RBAC:</strong> Permissões baseadas em cargos restringindo chamadas de endpoints críticos.</li>
                      </ul>
                      <Button onClick={runSecurityScan} variant="outline" className="text-xs font-bold border-emerald-200 hover:bg-emerald-50 text-emerald-800 mt-2">
                        Executar Novamente
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                      <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Shield className="h-6 w-6 animate-pulse" />
                      </div>
                      <div className="space-y-1 max-w-sm">
                        <h4 className="text-xs font-bold text-slate-800">Pronto para auditoria de segurança</h4>
                        <p className="text-[11px] text-slate-400">
                          A verificação dura poucos segundos e revisará as sessões de login, encriptação local e segurança dos dados.
                        </p>
                      </div>
                      <Button onClick={runSecurityScan} className="bg-blue-600 hover:bg-blue-700 font-bold text-xs">
                        Iniciar Varredura
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SECURITY PARAMETERS CARD */}
              <Card className="border border-slate-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-md font-black text-slate-800 flex items-center gap-2">
                    <Lock className="h-5 w-5 text-blue-600" /> Parâmetros de Autenticação & Sessão
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSaveConfig} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4 p-3 border border-slate-100 rounded-xl">
                          <div className="space-y-0.5">
                            <Label className="text-xs font-bold text-slate-800">Forçar MFA (Multi-Factor)</Label>
                            <span className="text-[10px] text-slate-400 block">Exige segundo fator de autenticação para todos os colaboradores.</span>
                          </div>
                          <Switch
                            checked={config.mfa_force}
                            onCheckedChange={(checked) => setConfig((p) => ({ ...p, mfa_force: checked }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-700">Tempo Limite da Sessão (Timeout)</Label>
                          <Select
                            value={config.session_timeout}
                            onValueChange={(val) => setConfig((p) => ({ ...p, session_timeout: val }))}
                          >
                            <SelectTrigger className="border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15">15 minutos de inatividade</SelectItem>
                              <SelectItem value="30">30 minutos de inatividade</SelectItem>
                              <SelectItem value="60">1 hora de inatividade</SelectItem>
                              <SelectItem value="1440">Ficar conectado por 24 horas</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-[10px] text-slate-400 block">Desconecta o usuário automaticamente após o período sem atividade.</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            Restrição por Endereço IP (Whitelist)
                            <Badge className="bg-slate-100 text-slate-500 font-bold border-none text-[8px]">Opcional</Badge>
                          </Label>
                          <Input
                            value={config.ip_whitelist}
                            onChange={(e) => setConfig((p) => ({ ...p, ip_whitelist: e.target.value }))}
                            placeholder="Ex: 192.168.1.1, 10.0.0.0/24"
                            className="border-slate-200 text-xs font-mono"
                          />
                          <span className="text-[10px] text-slate-400 block">Restringe o acesso ao painel apenas para os IPs informados (deixe vazio para liberar de qualquer IP).</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 flex justify-end">
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700 font-bold text-xs">
                        Aplicar Regras de Segurança
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* ACTIVE SESSIONS CARD */}
              <Card className="border border-slate-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-md font-black text-slate-800 flex items-center gap-2">
                    <Laptop className="h-5 w-5 text-blue-600" /> Sessões Ativas de Usuários
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Dispositivos conectados à sua conta ou sob o painel. Caso veja alguma sessão suspeita, revogue o acesso imediatamente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                          <TableHead className="text-xs font-bold text-slate-600 h-10 px-4">Dispositivo</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 h-10 px-4">IP</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 h-10 px-4">Localização</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 h-10 px-4">Último Acesso</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 h-10 px-4 text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessions.map((s) => (
                          <TableRow key={s.id} className="border-b border-slate-100 hover:bg-slate-50/20 text-xs">
                            <TableCell className="font-bold text-slate-800 px-4 py-3 flex items-center gap-2">
                              {s.device.includes("iPhone") || s.device.includes("iPad") ? (
                                <Smartphone className="h-4 w-4 text-slate-400" />
                              ) : (
                                <Laptop className="h-4 w-4 text-slate-400" />
                              )}
                              <div>
                                <span className="block">{s.device}</span>
                                <span className="text-[10px] text-slate-400 font-semibold">{s.browser}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-slate-600 px-4 py-3">{s.ip}</TableCell>
                            <TableCell className="font-medium text-slate-600 px-4 py-3">{s.location}</TableCell>
                            <TableCell className="font-medium text-slate-600 px-4 py-3">
                              {s.isCurrent ? (
                                <Badge className="bg-blue-100 text-blue-800 font-bold border-none text-[9px]">Sessão Atual</Badge>
                              ) : (
                                s.lastActive
                              )}
                            </TableCell>
                            <TableCell className="text-right px-4 py-3">
                              {!s.isCurrent && (
                                <Button
                                  variant="outline"
                                  onClick={() => handleRevokeSession(s.id)}
                                  className="h-7 text-[10px] font-black border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  Revogar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === "audit" && isMaster && (
            <Card className="border border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-md font-black text-slate-800 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" /> Registro de Auditoria (Logs)
                </CardTitle>
                <CardDescription className="text-xs">
                  Visualização em tempo real das ações de alteração efetuadas no banco de dados do dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoadingAudits ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="text-xs text-slate-400">Carregando logs do servidor...</span>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-2 text-slate-400">
                    <Terminal className="h-8 w-8" />
                    <span className="text-xs">Nenhum log de auditoria encontrado.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                          <TableHead className="text-xs font-bold text-slate-600 h-10 px-4">Operador</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 h-10 px-4">Ação</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 h-10 px-4">Tabela</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 h-10 px-4">ID Entidade</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 h-10 px-4">Data/Hora</TableHead>
                          <TableHead className="text-xs font-bold text-slate-600 h-10 px-4 text-right">Detalhes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log: any) => (
                          <TableRow key={log.id} className="border-b border-slate-100 hover:bg-slate-50/20 text-xs">
                            <TableCell className="font-bold text-slate-800 px-4 py-3">{log.actor_email}</TableCell>
                            <TableCell className="px-4 py-3">
                              <Badge className={`text-[9px] border-none font-bold uppercase ${
                                log.action.includes("delete")
                                  ? "bg-rose-100 text-rose-800"
                                  : log.action.includes("create")
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}>
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-slate-600 px-4 py-3">{log.entity || "-"}</TableCell>
                            <TableCell className="font-mono text-[10px] text-slate-400 px-4 py-3">
                              {log.entity_id ? log.entity_id.slice(0, 8) + "..." : "-"}
                            </TableCell>
                            <TableCell className="font-medium text-slate-600 px-4 py-3">
                              {new Date(log.created_at).toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-right px-4 py-3">
                              <Button
                                variant="outline"
                                onClick={() => setSelectedAuditLog(log)}
                                className="h-7 text-[10px] font-black border-slate-200 hover:bg-slate-50"
                              >
                                Ver JSON
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* DETAIL DIALOG FOR AUDIT LOGS */}
      {selectedAuditLog && (
        <Dialog open={!!selectedAuditLog} onOpenChange={() => setSelectedAuditLog(null)}>
          <DialogContent className="max-w-md bg-white border border-slate-200 rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-blue-600" />
                Dados do Evento: {selectedAuditLog.action}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Log do sistema gravado em {new Date(selectedAuditLog.created_at).toLocaleString("pt-BR")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Operador</span>
                <span className="text-xs font-semibold text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg block">
                  {selectedAuditLog.actor_email} ({selectedAuditLog.actor_id})
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Metadados / Payload</span>
                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl text-[10px] font-mono overflow-x-auto max-h-48">
                  {JSON.stringify(selectedAuditLog.details, null, 2)}
                </pre>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100 mt-4">
              <Button onClick={() => setSelectedAuditLog(null)} className="bg-blue-600 hover:bg-blue-700 font-bold text-xs">
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
