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
} from "recharts";
import {
  Wrench,
  Plus,
  Layers,
  FileText,
  Calendar,
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  TrendingUp,
  Activity,
  Trash2,
  Box,
  RotateCcw,
  Maximize2,
  Trash,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/engenharia")({
  component: EngenhariaPage,
});

const STATUS_OPTIONS = [
  { id: "planejamento", label: "Planejamento", color: "bg-slate-100 text-slate-800 border-slate-200" },
  { id: "detalhamento", label: "Detalhamento", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "aprovacao", label: "Aprovação", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { id: "producao", label: "Em Produção", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { id: "concluido", label: "Concluído", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { id: "suspenso", label: "Suspenso", color: "bg-rose-100 text-rose-800 border-rose-200" },
];

const PCP_STATUS_OPTIONS = [
  { id: "aguardando", label: "Aguardando", color: "bg-slate-100 text-slate-700" },
  { id: "programado", label: "Programado", color: "bg-blue-100 text-blue-700" },
  { id: "em_execucao", label: "Em Execução", color: "bg-amber-100 text-amber-700" },
  { id: "concluido", label: "Concluído", color: "bg-emerald-100 text-emerald-700" },
];

// Predefined colors for the 3D model builder cubes/modules
const PALETTE_COLORS = [
  { hex: "#ef4444", label: "Vermelho" },
  { hex: "#3b82f6", label: "Azul" },
  { hex: "#10b981", label: "Verde" },
  { hex: "#f59e0b", label: "Amarelo" },
  { hex: "#8b5cf6", label: "Roxo" },
  { hex: "#f97316", label: "Laranja" },
  { hex: "#64748b", label: "Cinza Metálico" },
  { hex: "#000000", label: "Preto" },
  { hex: "#ffffff", label: "Branco" },
];

interface ThreeDBlock {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  type: "painel" | "perfil" | "suporte" | "porta_folha" | "display";
}

function EngenhariaPage() {
  const { data: me } = useMe();
  const isMaster = me?.roles.includes("admin_master") ?? false;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("projects");
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);

  // 3D Canvas Editor States
  const [selectedColor, setSelectedColor] = useState("#3b82f6");
  const [selectedTool, setSelectedTool] = useState<"painel" | "perfil" | "suporte" | "porta_folha" | "display">("painel");
  const [blocks, setBlocks] = useState<ThreeDBlock[]>([]);
  const [cameraRot, setCameraRot] = useState({ pitch: 25, yaw: 45 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Form State - Project
  const [projForm, setProjForm] = useState({
    name: "",
    code: "",
    client: "",
    progress: "0",
    status: "planejamento",
    drawings_url: "",
    pcp_status: "aguardando",
    start_date: new Date().toISOString().split("T")[0],
    delivery_date: "",
  });

  // ── Queries - Projects ──
  const { data: projects = [] } = useQuery({
    queryKey: ["engenharia_projects"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("engenharia_projects")
          .select("*")
          .order("delivery_date", { ascending: true });
        if (error) throw error;
        return data ?? [];
      } catch (err) {
        console.warn("Supabase query for engenharia_projects failed, using localStorage fallback:", err);
        const stored = localStorage.getItem("eng_projects_fallback");
        if (stored) return JSON.parse(stored);
        localStorage.setItem("eng_projects_fallback", JSON.stringify([]));
        return [];
      }
    },
  });

  // ── Mutations - Add Project ──
  const addProjMutation = useMutation({
    mutationFn: async (payload: any) => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Usuário não autenticado");

        const { error } = await supabase
          .from("engenharia_projects")
          .insert({
            user_id: u.user.id,
            name: payload.name,
            code: payload.code,
            client: payload.client,
            progress: Number(payload.progress || 0),
            status: payload.status,
            drawings_url: payload.drawings_url,
            pcp_status: payload.pcp_status,
            start_date: payload.start_date || null,
            delivery_date: payload.delivery_date || null,
          });
        if (error) throw error;
      } catch (err) {
        console.warn("Fallback to localStorage for addProject:", err);
        const stored = localStorage.getItem("eng_projects_fallback");
        const list = stored ? JSON.parse(stored) : [];
        list.push({
          id: `p_${Date.now()}`,
          name: payload.name,
          code: payload.code,
          client: payload.client,
          progress: Number(payload.progress || 0),
          status: payload.status,
          drawings_url: payload.drawings_url,
          pcp_status: payload.pcp_status,
          start_date: payload.start_date,
          delivery_date: payload.delivery_date,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem("eng_projects_fallback", JSON.stringify(list));
      }
    },
    onSuccess: () => {
      toast.success("Projeto registrado com sucesso!");
      qc.invalidateQueries({ queryKey: ["engenharia_projects"] });
      setIsProjModalOpen(false);
      setProjForm({
        name: "",
        code: "",
        client: "",
        progress: "0",
        status: "planejamento",
        drawings_url: "",
        pcp_status: "aguardando",
        start_date: new Date().toISOString().split("T")[0],
        delivery_date: "",
      });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Mutations - Update Project Progress/Status ──
  const updateProjMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      try {
        const { error } = await supabase
          .from("engenharia_projects")
          .update(updates)
          .eq("id", id);
        if (error) throw error;
      } catch (err) {
        console.warn("Fallback to localStorage for updateProject:", err);
        const stored = localStorage.getItem("eng_projects_fallback");
        if (stored) {
          const list = JSON.parse(stored);
          const idx = list.findIndex((item: any) => item.id === id);
          if (idx !== -1) {
            list[idx] = { ...list[idx], ...updates };
            localStorage.setItem("eng_projects_fallback", JSON.stringify(list));
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engenharia_projects"] });
      toast.success("Projeto atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Mutations - Delete Project ──
  const deleteProjMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from("engenharia_projects")
          .delete()
          .eq("id", id);
        if (error) throw error;
      } catch (err) {
        console.warn("Fallback to localStorage for deleteProject:", err);
        const stored = localStorage.getItem("eng_projects_fallback");
        if (stored) {
          let list = JSON.parse(stored);
          list = list.filter((item: any) => item.id !== id);
          localStorage.setItem("eng_projects_fallback", JSON.stringify(list));
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engenharia_projects"] });
      toast.success("Projeto excluído permanente!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Statistics
  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p: any) => p.status !== "concluido" && p.status !== "suspenso").length;
    const completed = projects.filter((p: any) => p.status === "concluido").length;
    
    // Average progress
    const avgProgress = total > 0 
      ? Math.round(projects.reduce((acc: number, curr: any) => acc + Number(curr.progress || 0), 0) / total)
      : 0;

    return {
      total,
      active,
      completed,
      avgProgress,
    };
  }, [projects]);

  // Aggregate PCP Timeline Data
  const pcpData = useMemo(() => {
    return projects.map((p: any) => ({
      name: p.code || p.name.slice(0, 10),
      progresso: Number(p.progress || 0),
    }));
  }, [projects]);

  // ── 3D Interactive grid mechanics ──
  const handleGridClick = (gridX: number, gridZ: number) => {
    // Find the height (Y) to stack on
    const existingAtSpot = blocks.filter((b) => b.x === gridX && b.z === gridZ);
    let targetY = 0;
    if (existingAtSpot.length > 0) {
      targetY = Math.max(...existingAtSpot.map((b) => b.y)) + 1;
    }

    if (targetY > 6) {
      toast.error("Limite de altura máxima empilhável atingido!");
      return;
    }

    const newBlock: ThreeDBlock = {
      id: `b_${Date.now()}_${Math.random()}`,
      x: gridX,
      y: targetY,
      z: gridZ,
      color: selectedColor,
      type: selectedTool,
    };

    setBlocks([...blocks, newBlock]);
  };

  const removeTopBlock = (gridX: number, gridZ: number) => {
    const atSpot = blocks.filter((b) => b.x === gridX && b.z === gridZ);
    if (atSpot.length === 0) return;
    const highestY = Math.max(...atSpot.map((b) => b.y));
    setBlocks(blocks.filter((b) => !(b.x === gridX && b.z === gridZ && b.y === highestY)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setCameraRot((prev) => ({
      pitch: Math.min(80, Math.max(10, prev.pitch - dy * 0.5)),
      yaw: prev.yaw + dx * 0.5,
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Isometric projections calculations
  const projectedGrid = useMemo(() => {
    const size = 7;
    const cells = [];
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        cells.push({ x, z });
      }
    }
    return cells;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-inner">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Engenharia, Projetos & PCP</h1>
            <p className="text-xs text-muted-foreground">
              Acompanhamento de desenhos técnicos, cronograma de fabricação, priorização PCP e modelagem 3D.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setActiveTab("builder3d")} variant="outline" className="glass border-blue-200 text-blue-600 hover:bg-blue-50">
            <Box className="mr-2 h-4 w-4" /> Criar em 3D
          </Button>
          {isMaster && (
            <Button onClick={() => setIsProjModalOpen(true)} className="glass border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Registrar Projeto
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass border-white/40 shadow-xs">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Projetos Totais</span>
                <div className="text-2xl font-black text-slate-800">{stats.total}</div>
              </div>
              <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-200">
                <Layers className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/40 shadow-xs">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Em Execução</span>
                <div className="text-2xl font-black text-blue-600">{stats.active}</div>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/40 shadow-xs">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Concluídos</span>
                <div className="text-2xl font-black text-emerald-600">{stats.completed}</div>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/40 shadow-xs">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Progresso Médio</span>
                <div className="text-2xl font-black text-indigo-600">{stats.avgProgress}%</div>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-200/50 p-1 border border-slate-300/30">
          <TabsTrigger value="projects">Painel de Projetos</TabsTrigger>
          <TabsTrigger value="drawings">Desenhos Técnicos</TabsTrigger>
          <TabsTrigger value="pcp">PCP (Produção)</TabsTrigger>
          <TabsTrigger value="builder3d">Protótipo 3D Inteligente</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-6 mt-4">
          {projects.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl bg-slate-50 text-slate-400">
              <Layers className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm font-semibold">Nenhum projeto cadastrado.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Use o botão "Registrar Projeto" para iniciar.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {projects.map((proj: any) => {
                const currentStatus = STATUS_OPTIONS.find((s) => s.id === proj.status) || STATUS_OPTIONS[0];
                const currentPcp = PCP_STATUS_OPTIONS.find((s) => s.id === proj.pcp_status) || PCP_STATUS_OPTIONS[0];
                return (
                  <Card key={proj.id} className="glass border-white/40 relative group hover:border-blue-400/80 transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block">{proj.code || "SEM CÓDIGO"}</span>
                          <CardTitle className="text-base font-bold text-slate-800">{proj.name}</CardTitle>
                          <CardDescription className="text-xs">{proj.client}</CardDescription>
                        </div>
                        <Badge className={currentStatus.color}>{currentStatus.label}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-600">Progresso</span>
                          <span className="font-bold text-blue-600">{proj.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full transition-all duration-300"
                            style={{ width: `${proj.progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Entrega Estimada</span>
                          <span className="font-semibold text-slate-700">
                            {proj.delivery_date ? new Date(proj.delivery_date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Status PCP</span>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mt-0.5 ${currentPcp.color}`}>
                            {currentPcp.label}
                          </span>
                        </div>
                      </div>

                      {/* Inline Quick Action Edits */}
                      {isMaster && (
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex gap-2">
                            <select
                              className="h-8 rounded border border-slate-300 bg-white px-2 text-[10px] font-semibold outline-none focus:ring-1 focus:ring-blue-400"
                              value={proj.status}
                              onChange={(e) => updateProjMutation.mutate({ id: proj.id, updates: { status: e.target.value } })}
                            >
                              {STATUS_OPTIONS.map((stg) => (
                                <option key={stg.id} value={stg.id}>{stg.label}</option>
                              ))}
                            </select>

                            <select
                              className="h-8 rounded border border-slate-300 bg-white px-2 text-[10px] font-semibold outline-none focus:ring-1 focus:ring-blue-400"
                              value={proj.pcp_status}
                              onChange={(e) => updateProjMutation.mutate({ id: proj.id, updates: { pcp_status: e.target.value } })}
                            >
                              {PCP_STATUS_OPTIONS.map((stg) => (
                                <option key={stg.id} value={stg.id}>{stg.label}</option>
                              ))}
                            </select>

                            <Input
                              type="number"
                              min="0"
                              max="100"
                              className="h-8 w-16 text-[10px] font-bold text-center"
                              placeholder="Prog."
                              defaultValue={proj.progress}
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                if (!isNaN(val) && val >= 0 && val <= 100) {
                                  updateProjMutation.mutate({ id: proj.id, updates: { progress: val } });
                                }
                              }}
                            />
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:bg-rose-50"
                            onClick={() => {
                              if (confirm("Excluir este projeto permanente?")) {
                                deleteProjMutation.mutate(proj.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-rose-600" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drawings" className="space-y-6 mt-4">
          <Card className="glass border-white/40">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-800">Diretório de Desenhos Técnicos</CardTitle>
              <CardDescription className="text-xs">Links para arquivos CAD, PDFs de engenharia e status de aprovação de protótipos.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código do Projeto</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Status de Engenharia</TableHead>
                    <TableHead>Desenho Técnico</TableHead>
                    <TableHead>Última Modificação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs py-8 text-muted-foreground">
                        Nenhum desenho técnico disponível. Registre um projeto primeiro.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((proj: any) => {
                      const currentStatus = STATUS_OPTIONS.find((s) => s.id === proj.status) || STATUS_OPTIONS[0];
                      return (
                        <TableRow key={proj.id}>
                          <TableCell className="font-semibold text-xs text-slate-800">{proj.code || "—"}</TableCell>
                          <TableCell className="text-xs font-semibold text-slate-700">{proj.name}</TableCell>
                          <TableCell>
                            <Badge className={currentStatus.color}>{currentStatus.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {proj.drawings_url ? (
                              <a
                                href={proj.drawings_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-semibold"
                              >
                                <FileText className="h-4 w-4" /> PDF Técnico <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4 text-amber-500" /> Aguardando Desenho
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(proj.created_at || Date.now()).toLocaleDateString("pt-BR")}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pcp" className="space-y-6 mt-4">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Timeline Column 1: Aguardando / Planejado */}
            <Card className="glass border-white/40">
              <CardHeader className="bg-slate-50/50 pb-3">
                <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" /> Backlog & Planejado
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {projects.filter((p: any) => p.pcp_status === "aguardando" || p.pcp_status === "programado").length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">Nenhum projeto programado</p>
                ) : (
                  projects.filter((p: any) => p.pcp_status === "aguardando" || p.pcp_status === "programado").map((proj: any) => (
                    <div key={proj.id} className="p-3 border border-slate-200 rounded-xl bg-white space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-slate-400">{proj.code || "—"}</span>
                        <Badge variant="outline" className="text-[9px]">{proj.pcp_status}</Badge>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">{proj.name}</h4>
                      <p className="text-[10px] text-muted-foreground">Entrega: {proj.delivery_date ? new Date(proj.delivery_date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Timeline Column 2: Em Execução */}
            <Card className="glass border-white/40">
              <CardHeader className="bg-amber-50/40 pb-3">
                <CardTitle className="text-sm font-bold text-amber-700 flex items-center gap-2">
                  <Play className="h-4 w-4 text-amber-500 fill-amber-500" /> Em Fabricação / Montagem
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {projects.filter((p: any) => p.pcp_status === "em_execucao").length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">Nenhum projeto em fabricação</p>
                ) : (
                  projects.filter((p: any) => p.pcp_status === "em_execucao").map((proj: any) => (
                    <div key={proj.id} className="p-3 border border-amber-200 rounded-xl bg-amber-50/10 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-amber-600">{proj.code || "—"}</span>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px]">Produzindo</Badge>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">{proj.name}</h4>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                        <div className="bg-amber-500 h-full" style={{ width: `${proj.progress}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Timeline Column 3: Concluído */}
            <Card className="glass border-white/40">
              <CardHeader className="bg-emerald-50/40 pb-3">
                <CardTitle className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Expedido & Concluído
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {projects.filter((p: any) => p.pcp_status === "concluido").length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">Nenhum projeto finalizado</p>
                ) : (
                  projects.filter((p: any) => p.pcp_status === "concluido").map((proj: any) => (
                    <div key={proj.id} className="p-3 border border-emerald-200 rounded-xl bg-emerald-50/10 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-emerald-600">{proj.code || "—"}</span>
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px]">Pronto</Badge>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">{proj.name}</h4>
                      <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Expedição finalizada
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recharts PCP timeline chart */}
          <Card className="glass border-white/40 mt-6">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-800">Gráfico de Progresso por Código de Projeto</CardTitle>
              <CardDescription className="text-xs">Soma do percentual de fabricação e PCP concluído por item.</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {pcpData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400">Sem projetos ativos</div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={pcpData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                    <YAxis tickFormatter={(v) => `${v}%`} stroke="#64748b" fontSize={10} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="progresso" name="Progresso" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builder3d" className="space-y-6 mt-4">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Control Sidebar Panel */}
            <Card className="glass border-white/40 flex flex-col gap-4 p-5 lg:col-span-1">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Estruturador 3D</h3>
                <p className="text-[10px] text-muted-foreground">Clique nas células do grid para adicionar blocos de montagem Isoflex.</p>
              </div>

              {/* Tool Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Componente</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["painel", "perfil", "suporte", "porta_folha", "display"] as const).map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      variant={selectedTool === t ? "default" : "outline"}
                      onClick={() => setSelectedTool(t)}
                      className="text-[10px] p-2 capitalize"
                    >
                      {t.replace("_", " ")}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Color Palette */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Cor do Acabamento</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {PALETTE_COLORS.map((col) => (
                    <button
                      key={col.hex}
                      onClick={() => setSelectedColor(col.hex)}
                      className={`h-7 w-7 rounded-lg border-2 transition-all ${
                        selectedColor === col.hex ? "border-indigo-600 scale-110 shadow-md" : "border-slate-200"
                      }`}
                      style={{ backgroundColor: col.hex }}
                      title={col.label}
                    />
                  ))}
                </div>
              </div>

              {/* Utility actions */}
              <div className="space-y-2 mt-auto pt-4 border-t border-slate-200/60">
                <Button
                  onClick={() => setBlocks([])}
                  variant="destructive"
                  className="w-full text-xs flex items-center justify-center gap-1.5"
                >
                  <Trash className="h-4.5 w-4.5" /> Limpar Modelo
                </Button>
                <Button
                  onClick={() => setCameraRot({ pitch: 25, yaw: 45 })}
                  variant="outline"
                  className="w-full text-xs flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" /> Resetar Câmera
                </Button>
              </div>
            </Card>

            {/* Interactive isometric Canvas */}
            <Card
              className="lg:col-span-3 h-[500px] bg-slate-900 border-0 shadow-2xl relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Floating Camera indicators */}
              <div className="absolute top-4 left-4 text-[10px] text-white/50 space-y-0.5 pointer-events-none font-mono">
                <div>Yaw (Rotação H): {Math.round(cameraRot.yaw)}°</div>
                <div>Pitch (Inclinação V): {Math.round(cameraRot.pitch)}°</div>
                <div>Blocos criados: {blocks.length}</div>
              </div>

              <div className="absolute top-4 right-4 flex gap-2">
                <Badge className="bg-slate-800 text-white/90 border-slate-700 font-mono text-[10px]">
                  Isometric Projection
                </Badge>
              </div>

              {/* Instructions Banner */}
              <div className="absolute bottom-4 left-4 right-4 pointer-events-none text-center">
                <span className="inline-block bg-slate-950/70 border border-white/10 px-3 py-1 rounded-full text-[10px] text-slate-300">
                  🖱️ Arraste na área escura para rotacionar a câmera • Clique no grid para construir • Botão Direito/Shift+Clique para remover o topo
                </span>
              </div>

              {/* 3D Representation viewport */}
              <div
                className="relative origin-center transition-transform duration-75"
                style={{
                  transform: `scale(1.2)`,
                }}
              >
                {/* 3D Grid cells */}
                <div className="relative w-0 h-0">
                  {projectedGrid.map(({ x, z }) => {
                    // Isometric coordinate mapping
                    // Convert cameraRot yaw/pitch to rotation factors
                    const radYaw = (cameraRot.yaw * Math.PI) / 180;
                    const radPitch = (cameraRot.pitch * Math.PI) / 180;

                    // Rotated local coordinates
                    const rotX = x * Math.cos(radYaw) - z * Math.sin(radYaw);
                    const rotZ = x * Math.sin(radYaw) + z * Math.cos(radYaw);

                    // Perspective/isometric compression
                    const screenX = rotX * 36;
                    const screenY = rotZ * 36 * Math.sin(radPitch);

                    const zIndex = Math.round((x + 4) * 10 + (z + 4));

                    return (
                      <div
                        key={`cell_${x}_${z}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (e.shiftKey || e.button === 2) {
                            removeTopBlock(x, z);
                          } else {
                            handleGridClick(x, z);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          removeTopBlock(x, z);
                        }}
                        className="absolute w-8 h-8 -ml-4 -mt-4 border border-white/5 hover:bg-white/10 transition-colors flex items-center justify-center rounded-sm bg-white/2 hover:scale-[1.05]"
                        style={{
                          transform: `translate(${screenX}px, ${screenY}px) skewX(-20deg) rotate(-15deg)`,
                          zIndex: zIndex,
                        }}
                      />
                    );
                  })}

                  {/* Rendered Cubes/Structures */}
                  {blocks.map((block) => {
                    const radYaw = (cameraRot.yaw * Math.PI) / 180;
                    const radPitch = (cameraRot.pitch * Math.PI) / 180;

                    const rotX = block.x * Math.cos(radYaw) - block.z * Math.sin(radYaw);
                    const rotZ = block.x * Math.sin(radYaw) + block.z * Math.cos(radYaw);

                    const screenX = rotX * 36;
                    // subtract Y height to stack vertically on screen
                    const screenY = rotZ * 36 * Math.sin(radPitch) - block.y * 22;

                    // Compute dynamic layered zIndex based on depth (z+x) and height (y)
                    const zIndex = Math.round((block.x + 5) * 10 + (block.z + 5) + block.y * 100);

                    return (
                      <div
                        key={block.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTopBlock(block.x, block.z);
                        }}
                        className="absolute w-8 h-8 -ml-4 -mt-4 transition-all"
                        style={{
                          transform: `translate(${screenX}px, ${screenY}px)`,
                          zIndex: zIndex,
                        }}
                      >
                        {/* 3D Cube faces emulation */}
                        <div className="absolute inset-0 relative w-8 h-8">
                          {/* Top Face */}
                          <div
                            className="absolute inset-0 w-8 h-8 filter brightness-110"
                            style={{
                              backgroundColor: block.color,
                              transform: `translateY(-11px) rotateX(60deg) rotateZ(45deg) scale(0.707)`,
                              border: "1px solid rgba(0,0,0,0.15)",
                            }}
                          />
                          {/* Left Face */}
                          <div
                            className="absolute inset-0 w-8 h-5 filter brightness-75 origin-top-left"
                            style={{
                              backgroundColor: block.color,
                              transform: `rotateY(-45deg) skewY(30deg) scaleX(0.707) translateY(8px) translateX(-2px)`,
                              border: "1px solid rgba(0,0,0,0.15)",
                            }}
                          />
                          {/* Right Face */}
                          <div
                            className="absolute inset-0 w-8 h-5 filter brightness-90 origin-top-right"
                            style={{
                              backgroundColor: block.color,
                              transform: `rotateY(45deg) skewY(-30deg) scaleX(0.707) translateY(8px) translateX(2px)`,
                              border: "1px solid rgba(0,0,0,0.15)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Project Dialog */}
      {isProjModalOpen && (
        <Dialog open onOpenChange={setIsProjModalOpen}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-800">Lançar Novo Projeto</DialogTitle>
              <DialogDescription className="text-xs">Cadastre a ordem de fabricação de engenharia e PCP.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addProjMutation.mutate(projForm);
              }}
              className="space-y-4 py-2"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="proj_code" className="text-xs">Código do Projeto</Label>
                  <Input
                    id="proj_code"
                    type="text"
                    placeholder="Ex: PRJ-2026-005"
                    value={projForm.code}
                    onChange={(e) => setProjForm({ ...projForm, code: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="proj_client" className="text-xs">Cliente</Label>
                  <Input
                    id="proj_client"
                    type="text"
                    placeholder="Ex: Petrobras"
                    value={projForm.client}
                    onChange={(e) => setProjForm({ ...projForm, client: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="proj_name" className="text-xs">Nome / Descrição do Projeto</Label>
                <Input
                  id="proj_name"
                  type="text"
                  placeholder="Ex: Quadro Kanban sob medida"
                  value={projForm.name}
                  onChange={(e) => setProjForm({ ...projForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="proj_status" className="text-xs">Status Inicial</Label>
                  <select
                    id="proj_status"
                    value={projForm.status}
                    onChange={(e) => setProjForm({ ...projForm, status: e.target.value })}
                    className="block w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    {STATUS_OPTIONS.map((stg) => (
                      <option key={stg.id} value={stg.id}>{stg.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="proj_pcp" className="text-xs">PCP Status</Label>
                  <select
                    id="proj_pcp"
                    value={projForm.pcp_status}
                    onChange={(e) => setProjForm({ ...projForm, pcp_status: e.target.value })}
                    className="block w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    {PCP_STATUS_OPTIONS.map((stg) => (
                      <option key={stg.id} value={stg.id}>{stg.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="proj_progress" className="text-xs">Progresso %</Label>
                  <Input
                    id="proj_progress"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={projForm.progress}
                    onChange={(e) => setProjForm({ ...projForm, progress: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="proj_start" className="text-xs">Data de Início</Label>
                  <Input
                    id="proj_start"
                    type="date"
                    value={projForm.start_date}
                    onChange={(e) => setProjForm({ ...projForm, start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="proj_delivery" className="text-xs">Data de Entrega</Label>
                  <Input
                    id="proj_delivery"
                    type="date"
                    value={projForm.delivery_date}
                    onChange={(e) => setProjForm({ ...projForm, delivery_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="proj_drawings" className="text-xs">URL Desenho Técnico (opcional)</Label>
                <Input
                  id="proj_drawings"
                  type="text"
                  placeholder="https://isoflex.com.br/desenhos/..."
                  value={projForm.drawings_url}
                  onChange={(e) => setProjForm({ ...projForm, drawings_url: e.target.value })}
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsProjModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={addProjMutation.isPending}>
                  {addProjMutation.isPending ? "Salvando..." : "Salvar Projeto"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
