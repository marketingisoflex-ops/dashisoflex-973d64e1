import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { fmtBRL } from "@/lib/calc";
import {
  TrendingUp,
  TrendingDown,
  Globe,
  ShoppingCart,
  Plus,
  Sparkles,
  Trash2,
  Edit2,
  Search,
  Download,
  FileText,
  Activity,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Percent,
  Coins,
  Star,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/lojavirtual")({
  component: LojaVirtualPage,
});

interface LVPerformanceEntry {
  id: string;
  ref_date: string;
  meta_dia: number;
  vendas_totais: number;
  pedidos: number;
  unidades: number;
  visitas: number;
  produto_mais_vendido: string;
  observacoes: string;
  invest_ads: number;
  vendas_ads: number;
}

const INITIAL_LV_DATA: LVPerformanceEntry[] = [
  { id: "lv1", ref_date: "2026-06-12", meta_dia: 6000.00, vendas_totais: 5200.80, pedidos: 22, unidades: 28, visitas: 680, produto_mais_vendido: "Flow Rack Modular Isoflex", observacoes: "Dia comum, tráfego orgânico estável.", invest_ads: 300.00, vendas_ads: 1500.00 },
  { id: "lv2", ref_date: "2026-06-13", meta_dia: 6000.00, vendas_totais: 6400.50, pedidos: 27, unidades: 33, visitas: 750, produto_mais_vendido: "Suporte de Monitor Ergonômico", observacoes: "Fim de semana positivo, promoção ativa.", invest_ads: 350.00, vendas_ads: 1900.00 },
  { id: "lv3", ref_date: "2026-06-14", meta_dia: 6000.00, vendas_totais: 4900.20, pedidos: 19, unidades: 24, visitas: 590, produto_mais_vendido: "Flow Rack Modular Isoflex", observacoes: "Domingo com tráfego abaixo do esperado.", invest_ads: 270.00, vendas_ads: 1200.00 },
  { id: "lv4", ref_date: "2026-06-15", meta_dia: 8000.00, vendas_totais: 8800.90, pedidos: 34, unidades: 41, visitas: 920, produto_mais_vendido: "Carrinho de Armazenamento Industrial", observacoes: "Segunda excelente, volta da semana impulsionou vendas.", invest_ads: 480.00, vendas_ads: 2900.00 },
  { id: "lv5", ref_date: "2026-06-16", meta_dia: 8000.00, vendas_totais: 7600.00, pedidos: 29, unidades: 36, visitas: 840, produto_mais_vendido: "Suporte de Monitor Ergonômico", observacoes: "Quase batemos meta, boa performance geral.", invest_ads: 420.00, vendas_ads: 2400.00 },
  { id: "lv6", ref_date: "2026-06-17", meta_dia: 8000.00, vendas_totais: 8100.50, pedidos: 31, unidades: 38, visitas: 860, produto_mais_vendido: "Flow Rack Modular Isoflex", observacoes: "Meta batida, campanha de e-mail funcionou bem.", invest_ads: 440.00, vendas_ads: 2600.00 },
  { id: "lv7", ref_date: "2026-06-18", meta_dia: 8000.00, vendas_totais: 9200.00, pedidos: 37, unidades: 45, visitas: 980, produto_mais_vendido: "Carrinho de Armazenamento Industrial", observacoes: "Melhor dia da semana, remarketing ativo.", invest_ads: 510.00, vendas_ads: 3200.00 },
  { id: "lv8", ref_date: "2026-06-19", meta_dia: 8000.00, vendas_totais: 10100.00, pedidos: 40, unidades: 49, visitas: 1100, produto_mais_vendido: "Carrinho de Armazenamento Industrial", observacoes: "Pico histórico da loja, promoção especial Isoflex.", invest_ads: 570.00, vendas_ads: 3800.00 },
];

const DAYS_OF_WEEK = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

const MONTHS = [
  { value: "all", label: "Todos os meses" },
  { value: "1", label: "Janeiro" }, { value: "2", label: "Fevereiro" }, { value: "3", label: "Março" },
  { value: "4", label: "Abril" }, { value: "5", label: "Maio" }, { value: "6", label: "Junho" },
  { value: "7", label: "Julho" }, { value: "8", label: "Agosto" }, { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" }, { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
];

function getDayOfWeek(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return DAYS_OF_WEEK[new Date(year, month - 1, day).getDay()];
}

function getStartOfWeek(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const diff = date.getDate() - date.getDay();
  const start = new Date(date.setDate(diff));
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}

const STORAGE_KEY = "lv_performance_v1_fallback";
const QUERY_KEY = "lojavirtual_performance_v1";

function LojaVirtualPage() {
  const { data: me } = useMe();
  const isMaster = me?.roles.includes("admin_master") ?? false;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"daily" | "weekly">("daily");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [currentMonthTotalSelect, setCurrentMonthTotalSelect] = useState("6");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("ref_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LVPerformanceEntry | null>(null);

  const [formData, setFormData] = useState({
    ref_date: new Date().toISOString().split("T")[0],
    meta_dia: "", vendas_totais: "", pedidos: "", unidades: "",
    visitas: "", produto_mais_vendido: "", observacoes: "",
    invest_ads: "", vendas_ads: "",
  });

  const { data: dbData = [], isLoading } = useQuery<LVPerformanceEntry[]>({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((item: any) => ({
          ...item,
          produto_mais_vendido: item.produto_mais_vendido || "Flow Rack Modular Isoflex",
          observacoes: item.observacoes || "",
          invest_ads: item.invest_ads !== undefined ? Number(item.invest_ads) : 300.00,
          vendas_ads: item.vendas_ads !== undefined ? Number(item.vendas_ads) : 1500.00,
        }));
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_LV_DATA));
      return INITIAL_LV_DATA;
    },
  });

  useEffect(() => {
    if (dbData.length > 0 && !dateStart && !dateEnd) {
      const dates = dbData.map((d) => d.ref_date).sort();
      setDateStart(dates[0]);
      setDateEnd(dates[dates.length - 1]);
    }
  }, [dbData]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDirection("desc"); }
  };

  const filteredDailyData = useMemo(() => {
    let result = dbData.map((d) => {
      const atingido = Number(d.vendas_totais || 0);
      const meta = Number(d.meta_dia || 0);
      const peds = Number(d.pedidos || 0);
      const units = Number(d.unidades || 0);
      const visits = Number(d.visitas || 0);
      const adsInv = Number(d.invest_ads || 0);
      const adsRev = Number(d.vendas_ads || 0);
      return {
        ...d, dia_semana: getDayOfWeek(d.ref_date),
        vendas_totais: atingido, meta_dia: meta, pedidos: peds,
        unidades: units, visitas: visits, invest_ads: adsInv, vendas_ads: adsRev,
        ticket_medio: peds > 0 ? atingido / peds : 0,
        rate_conv: visits > 0 ? (peds / visits) * 100 : 0,
      };
    });
    if (dateStart) result = result.filter((d) => d.ref_date >= dateStart);
    if (dateEnd) result = result.filter((d) => d.ref_date <= dateEnd);
    if (selectedMonth !== "all") result = result.filter((d) => String(Number(d.ref_date.split("-")[1])) === selectedMonth);
    if (selectedYear !== "all") result = result.filter((d) => d.ref_date.split("-")[0] === selectedYear);
    return result.sort((a, b) => a.ref_date.localeCompare(b.ref_date));
  }, [dbData, dateStart, dateEnd, selectedMonth, selectedYear]);

  const weeklyData = useMemo(() => {
    const weeksMap: Record<string, any> = {};
    filteredDailyData.forEach((d) => {
      const weekStart = getStartOfWeek(d.ref_date);
      if (!weeksMap[weekStart]) {
        weeksMap[weekStart] = { ref_date: weekStart, meta_dia: 0, vendas_totais: 0, pedidos: 0, unidades: 0, visitas: 0, invest_ads: 0, vendas_ads: 0, produtos: [], obs: [] };
      }
      weeksMap[weekStart].meta_dia += d.meta_dia;
      weeksMap[weekStart].vendas_totais += d.vendas_totais;
      weeksMap[weekStart].pedidos += d.pedidos;
      weeksMap[weekStart].unidades += d.unidades;
      weeksMap[weekStart].visitas += d.visitas;
      weeksMap[weekStart].invest_ads += d.invest_ads;
      weeksMap[weekStart].vendas_ads += d.vendas_ads;
      if (d.produto_mais_vendido && !weeksMap[weekStart].produtos.includes(d.produto_mais_vendido))
        weeksMap[weekStart].produtos.push(d.produto_mais_vendido);
      if (d.observacoes && !weeksMap[weekStart].obs.includes(d.observacoes))
        weeksMap[weekStart].obs.push(d.observacoes);
    });
    return Object.values(weeksMap).map((w: any, index) => {
      const [year, month, day] = w.ref_date.split("-").map(Number);
      const start = new Date(year, month - 1, day);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      const label = `Semana ${index + 1} (${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} a ${end.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })})`;
      return {
        id: `week_${w.ref_date}`, ref_date: w.ref_date, label, dia_semana: "Semanal",
        meta_dia: w.meta_dia, vendas_totais: w.vendas_totais, pedidos: w.pedidos,
        unidades: w.unidades, visitas: w.visitas, invest_ads: w.invest_ads, vendas_ads: w.vendas_ads,
        ticket_medio: w.pedidos > 0 ? w.vendas_totais / w.pedidos : 0,
        rate_conv: w.visitas > 0 ? (w.pedidos / w.visitas) * 100 : 0,
        produto_mais_vendido: w.produtos.join(", ") || "N/A",
        observacoes: w.obs.join(" | "),
      };
    });
  }, [filteredDailyData]);

  const displayData = useMemo(() => analysisMode === "daily" ? filteredDailyData : weeklyData, [analysisMode, filteredDailyData, weeklyData]);

  const processedTableData = useMemo(() => {
    let list = [...displayData];
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      list = list.filter((row) =>
        row.ref_date.toLowerCase().includes(query) ||
        (row.dia_semana && row.dia_semana.toLowerCase().includes(query)) ||
        (row.produto_mais_vendido && row.produto_mais_vendido.toLowerCase().includes(query)) ||
        (row.observacoes && row.observacoes.toLowerCase().includes(query))
      );
    }
    list.sort((a: any, b: any) => {
      const valA = a[sortField], valB = b[sortField];
      if (typeof valA === "number" && typeof valB === "number")
        return sortDirection === "asc" ? valA - valB : valB - valA;
      return sortDirection === "asc" ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
    return list;
  }, [displayData, searchQuery, sortField, sortDirection]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedTableData.slice(startIndex, startIndex + pageSize);
  }, [processedTableData, currentPage]);

  const totalPages = Math.ceil(processedTableData.length / pageSize) || 1;

  const metrics = useMemo(() => {
    if (filteredDailyData.length === 0) {
      return {
        totalRevenue: 0, totalOrders: 0, avgTicket: 0, topProduct: "Nenhum",
        investAds: 0, roas: 0, acos: 0, vendasAds: 0, totalVisits: 0, avgConversion: 0,
        ordersGrowth: 0, isOrdersPositive: true, revenueGrowth: 0, isRevenuePositive: true,
        visitsGrowth: 0, isVisitsPositive: true, conversionGrowth: 0, isConversionPositive: true,
        roasGrowth: 0, isRoasPositive: true, adsGrowth: 0, isAdsPositive: true,
      };
    }
    const totalRevenue = filteredDailyData.reduce((acc, curr) => acc + curr.vendas_totais, 0);
    const totalOrders = filteredDailyData.reduce((acc, curr) => acc + curr.pedidos, 0);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const investAds = filteredDailyData.reduce((acc, curr) => acc + curr.invest_ads, 0);
    const vendasAds = filteredDailyData.reduce((acc, curr) => acc + curr.vendas_ads, 0);
    const roas = investAds > 0 ? vendasAds / investAds : 0;
    const acos = vendasAds > 0 ? (investAds / vendasAds) * 100 : 0;
    const totalVisits = filteredDailyData.reduce((acc, curr) => acc + Number(curr.visitas || 0), 0);
    const avgConversion = totalVisits > 0 ? (totalOrders / totalVisits) * 100 : 0;

    const productCounts: Record<string, number> = {};
    filteredDailyData.forEach((d) => {
      if (d.produto_mais_vendido) productCounts[d.produto_mais_vendido] = (productCounts[d.produto_mais_vendido] || 0) + d.unidades;
    });
    let topProduct = "Nenhum", maxUnits = 0;
    Object.entries(productCounts).forEach(([prod, count]) => { if (count > maxUnits) { maxUnits = count; topProduct = prod; } });

    let ordersGrowth = 0, isOrdersPositive = true, revenueGrowth = 0, isRevenuePositive = true;
    let visitsGrowth = 0, isVisitsPositive = true, conversionGrowth = 0, isConversionPositive = true;
    let roasGrowth = 0, isRoasPositive = true, adsGrowth = 0, isAdsPositive = true;

    if (dateStart && dateEnd) {
      const currStart = new Date(dateStart), currEnd = new Date(dateEnd);
      const diffMs = currEnd.getTime() - currStart.getTime();
      const prevEnd = new Date(currStart.getTime() - 86400000);
      const prevStart = new Date(prevEnd.getTime() - diffMs);
      const prevStartIso = prevStart.toISOString().split("T")[0];
      const prevEndIso = prevEnd.toISOString().split("T")[0];
      const prevData = dbData.filter((d) => d.ref_date >= prevStartIso && d.ref_date <= prevEndIso);
      const prevRevenue = prevData.reduce((acc, c) => acc + Number(c.vendas_totais || 0), 0);
      const prevOrders = prevData.reduce((acc, c) => acc + Number(c.pedidos || 0), 0);
      const prevAds = prevData.reduce((acc, c) => acc + Number(c.invest_ads || 0), 0);
      const prevVendasAds = prevData.reduce((acc, c) => acc + Number(c.vendas_ads || 0), 0);
      const prevRoas = prevAds > 0 ? prevVendasAds / prevAds : 0;
      const prevVisits = prevData.reduce((acc, c) => acc + Number(c.visitas || 0), 0);
      const prevConversion = prevVisits > 0 ? (prevOrders / prevVisits) * 100 : 0;
      if (prevOrders > 0) { ordersGrowth = ((totalOrders - prevOrders) / prevOrders) * 100; isOrdersPositive = ordersGrowth >= 0; }
      if (prevRevenue > 0) { revenueGrowth = ((totalRevenue - prevRevenue) / prevRevenue) * 100; isRevenuePositive = revenueGrowth >= 0; }
      if (prevVisits > 0) { visitsGrowth = ((totalVisits - prevVisits) / prevVisits) * 100; isVisitsPositive = visitsGrowth >= 0; }
      if (prevConversion > 0) { conversionGrowth = avgConversion - prevConversion; isConversionPositive = conversionGrowth >= 0; }
      if (prevRoas > 0) { roasGrowth = ((roas - prevRoas) / prevRoas) * 100; isRoasPositive = roasGrowth >= 0; }
      if (prevAds > 0) { adsGrowth = ((investAds - prevAds) / prevAds) * 100; isAdsPositive = adsGrowth >= 0; }
    }

    return {
      totalRevenue, totalOrders, avgTicket, topProduct, investAds, roas, acos, vendasAds, totalVisits, avgConversion,
      ordersGrowth: Math.abs(ordersGrowth), isOrdersPositive,
      revenueGrowth: Math.abs(revenueGrowth), isRevenuePositive,
      visitsGrowth: Math.abs(visitsGrowth), isVisitsPositive,
      conversionGrowth: Math.abs(conversionGrowth), isConversionPositive,
      roasGrowth: Math.abs(roasGrowth), isRoasPositive,
      adsGrowth: Math.abs(adsGrowth), isAdsPositive,
    };
  }, [filteredDailyData, dbData, dateStart, dateEnd]);

  const monthlyTotals = useMemo(() => {
    const monthData = dbData.filter((d) => {
      const parts = d.ref_date.split("-");
      return parts[0] === "2026" && String(Number(parts[1])) === currentMonthTotalSelect;
    });
    if (monthData.length === 0) return { revenue: 0, orders: 0, unidades: 0, ticket: 0, investAds: 0, vendasAds: 0, vendasOrg: 0, roas: 0, acos: 0, semanasCount: 0 };
    const revenue = monthData.reduce((acc, c) => acc + c.vendas_totais, 0);
    const orders = monthData.reduce((acc, c) => acc + c.pedidos, 0);
    const unidades = monthData.reduce((acc, c) => acc + c.unidades, 0);
    const ticket = orders > 0 ? revenue / orders : 0;
    const investAds = monthData.reduce((acc, c) => acc + c.invest_ads, 0);
    const vendasAds = monthData.reduce((acc, c) => acc + c.vendas_ads, 0);
    const vendasOrg = Math.max(0, revenue - vendasAds);
    const roas = investAds > 0 ? vendasAds / investAds : 0;
    const acos = vendasAds > 0 ? (investAds / vendasAds) * 100 : 0;
    const uniqueWeeks = new Set(monthData.map((d) => getStartOfWeek(d.ref_date)));
    return { revenue, orders, unidades, ticket, investAds, vendasAds, vendasOrg, roas, acos, semanasCount: uniqueWeeks.size };
  }, [dbData, currentMonthTotalSelect]);

  const smartAlerts = useMemo(() => {
    if (filteredDailyData.length === 0) return [];
    const alerts: Array<{ type: "success" | "warning" | "destructive"; text: string }> = [];
    if (metrics.revenueGrowth > 0) alerts.push({ type: metrics.isRevenuePositive ? "success" : "destructive", text: metrics.isRevenuePositive ? `Vendas cresceram ${metrics.revenueGrowth.toFixed(1)}% vs período anterior.` : `Vendas caíram ${metrics.revenueGrowth.toFixed(1)}% vs período anterior.` });
    if (metrics.acos > 15) alerts.push({ type: "warning", text: `ACOS acima de 15% (${metrics.acos.toFixed(1)}%) — eficiência de campanhas em alerta.` });
    if (metrics.roas < 5 && metrics.roas > 0) alerts.push({ type: "warning", text: `ROAS abaixo de 5 (${metrics.roas.toFixed(2)}) — revisar campanhas da loja.` });
    if (metrics.avgConversion >= 3) alerts.push({ type: "success", text: `Conversão excelente: ${metrics.avgConversion.toFixed(2)}% — acima da média de mercado.` });
    return alerts;
  }, [filteredDailyData, metrics]);

  const productShareData = useMemo(() => {
    const share: Record<string, number> = {};
    filteredDailyData.forEach((d) => { if (d.produto_mais_vendido) share[d.produto_mais_vendido] = (share[d.produto_mais_vendido] || 0) + d.unidades; });
    const colors = ["#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];
    return Object.entries(share).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
  }, [filteredDailyData]);

  const cumulativeChartData = useMemo(() => {
    let sum = 0;
    return filteredDailyData.map((d) => { sum += d.vendas_totais; return { ref_date: d.ref_date, faturamento_acumulado: sum }; });
  }, [filteredDailyData]);

  const saveEntryMutation = useMutation({
    mutationFn: async (payload: any) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      let list = stored ? JSON.parse(stored) : [...INITIAL_LV_DATA];
      const entryPayload = {
        ref_date: payload.ref_date, meta_dia: Number(payload.meta_dia || 0),
        vendas_totais: Number(payload.vendas_totais || 0), pedidos: Number(payload.pedidos || 0),
        unidades: Number(payload.unidades || 0), visitas: Number(payload.visitas || 0),
        produto_mais_vendido: payload.produto_mais_vendido.trim(), observacoes: payload.observacoes.trim(),
        invest_ads: Number(payload.invest_ads || 0), vendas_ads: Number(payload.vendas_ads || 0),
      };
      if (editingEntry) list = list.map((item: any) => item.id === editingEntry.id ? { ...item, ...entryPayload } : item);
      else { list = list.filter((item: any) => item.ref_date !== payload.ref_date); list.push({ id: `lv_${Date.now()}`, ...entryPayload }); }
      list.sort((a: any, b: any) => a.ref_date.localeCompare(b.ref_date));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    },
    onSuccess: () => {
      toast.success(editingEntry ? "Lançamento editado!" : "Dia registrado com sucesso!");
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      setIsAddModalOpen(false);
      setEditingEntry(null);
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        let list = JSON.parse(stored);
        list = list.filter((item: any) => item.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
    },
    onSuccess: () => { toast.success("Registro removido."); qc.invalidateQueries({ queryKey: [QUERY_KEY] }); },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.produto_mais_vendido.trim()) { toast.error("O produto mais vendido é obrigatório."); return; }
    saveEntryMutation.mutate(formData);
  };

  const startEdit = (entry: LVPerformanceEntry) => {
    setEditingEntry(entry);
    setFormData({
      ref_date: entry.ref_date, meta_dia: String(entry.meta_dia), vendas_totais: String(entry.vendas_totais),
      pedidos: String(entry.pedidos), unidades: String(entry.unidades), visitas: String(entry.visitas),
      produto_mais_vendido: entry.produto_mais_vendido, observacoes: entry.observacoes,
      invest_ads: String(entry.invest_ads || ""), vendas_ads: String(entry.vendas_ads || ""),
    });
    setIsAddModalOpen(true);
  };

  const handleExportExcel = () => {
    if (processedTableData.length === 0) { toast.error("Nenhum dado para exportar."); return; }
    const headers = ["Data", "Dia", "Unidades", "Faturamento (R$)", "Pedidos", "Ticket (R$)", "Invest. Ads (R$)", "Vendas Ads (R$)", "ROAS", "ACOS (%)", "Produto", "Observações"];
    const rows = processedTableData.map((row: any) => [
      row.ref_date, row.dia_semana || row.label || "", row.unidades, row.vendas_totais.toFixed(2),
      row.pedidos, row.ticket_medio.toFixed(2), (row.invest_ads || 0).toFixed(2), (row.vendas_ads || 0).toFixed(2),
      ((row.vendas_ads || 0) / (row.invest_ads || 1)).toFixed(2), ((row.invest_ads || 0) / (row.vendas_ads || 1) * 100).toFixed(2),
      `"${(row.produto_mais_vendido || "").replace(/"/g, '""')}"`,
      `"${(row.observacoes || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `loja_virtual_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success("CSV exportado!");
  };

  return (
    <div className="space-y-6 animate-fade-in p-1">
      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 45%, #3b82f6 100%)" }}
        className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm text-white shadow-md border border-white/30">
            <Globe className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              Loja Virtual
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/30 font-bold text-[10px]">PAINEL BI</Badge>
            </h1>
            <p className="text-sm text-blue-100 font-medium">
              Acompanhamento de conversão, faturamento, pedidos e métricas da loja própria Isoflex.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isMaster && (
            <Button
              onClick={() => {
                setEditingEntry(null);
                setFormData({ ref_date: new Date().toISOString().split("T")[0], meta_dia: "", vendas_totais: "", pedidos: "", unidades: "", visitas: "", produto_mais_vendido: "", observacoes: "", invest_ads: "", vendas_ads: "" });
                setIsAddModalOpen(true);
              }}
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold transition-all shadow-md border border-blue-200"
            >
              <Plus className="mr-2 h-4 w-4" /> Registrar Dia
            </Button>
          )}
          <Button variant="outline" onClick={handleExportExcel} className="bg-white/10 text-white border-white/30 hover:bg-white/20 font-semibold">
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      {/* SMART ALERTS */}
      {smartAlerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {smartAlerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border ${alert.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : alert.type === "warning" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-red-50 border-red-200 text-red-700"}`}>
              {alert.type === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {alert.text}
            </div>
          ))}
        </div>
      )}

      {/* FILTERS */}
      <Card className="border border-blue-100 shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Filter className="h-4 w-4 text-blue-600" /> Filtros de Análise
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 items-end">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">De</Label>
              <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="h-9 border-blue-200" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Até</Label>
              <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="h-9 border-blue-200" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Mês</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9 border-blue-200"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Ano</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9 border-blue-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Visualização</Label>
              <div className="flex bg-blue-50 rounded-lg p-0.5 border border-blue-200 h-9">
                <button type="button" onClick={() => setAnalysisMode("daily")} className={`flex-1 text-xs font-bold rounded-md transition-all ${analysisMode === "daily" ? "bg-blue-600 text-white shadow-sm" : "text-blue-400 hover:text-blue-700"}`}>Diário</button>
                <button type="button" onClick={() => setAnalysisMode("weekly")} className={`flex-1 text-xs font-bold rounded-md transition-all ${analysisMode === "weekly" ? "bg-blue-600 text-white shadow-sm" : "text-blue-400 hover:text-blue-700"}`}>Semanal</button>
              </div>
            </div>
            <Button variant="outline" className="h-9 text-xs font-semibold border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={() => { setDateStart(""); setDateEnd(""); setSelectedMonth("all"); setSelectedYear("all"); setSearchQuery(""); }}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI CARDS */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (<Card key={i} className="animate-pulse border-blue-100"><CardContent className="h-28 pt-6 bg-blue-50/30" /></Card>))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <LvKpiCard label={`FATURAMENTO (${analysisMode === "weekly" ? "SEMANA" : "PERÍODO"})`} value={fmtBRL(metrics.totalRevenue)} trend={`${metrics.revenueGrowth.toFixed(1)}% vs anterior`} isPositive={metrics.isRevenuePositive} icon={Coins} />
          <LvKpiCard label={`PEDIDOS (${analysisMode === "weekly" ? "SEMANA" : "PERÍODO"})`} value={String(metrics.totalOrders)} trend={`${metrics.ordersGrowth.toFixed(1)}% vs anterior`} isPositive={metrics.isOrdersPositive} icon={ShoppingCart} />
          <LvKpiCard label={`CONVERSÃO (${analysisMode === "weekly" ? "SEMANA" : "PERÍODO"})`} value={`${metrics.avgConversion.toFixed(2)}%`} trend={`${metrics.conversionGrowth >= 0 ? "+" : ""}${metrics.conversionGrowth.toFixed(2)}pp vs anterior`} isPositive={metrics.isConversionPositive} icon={Sparkles} />
          <LvKpiCard label={`VISITAS (${analysisMode === "weekly" ? "SEMANA" : "PERÍODO"})`} value={String(metrics.totalVisits)} trend={`${metrics.visitsGrowth.toFixed(1)}% vs anterior`} isPositive={metrics.isVisitsPositive} icon={Activity} />
          <LvKpiCard label={`ROAS (${analysisMode === "weekly" ? "SEMANA" : "PERÍODO"})`} value={metrics.roas.toFixed(2)} trend={`${metrics.roasGrowth.toFixed(1)}% vs anterior`} isPositive={metrics.isRoasPositive} icon={TrendingUp} highlightAlert={metrics.roas < 5} />
          <LvKpiCard label={`INVEST. ADS (${analysisMode === "weekly" ? "SEMANA" : "PERÍODO"})`} value={fmtBRL(metrics.investAds)} trend={`${metrics.adsGrowth.toFixed(1)}% vs anterior`} isPositive={!metrics.isAdsPositive} icon={Percent} />
        </div>
      )}

      {/* TOTAL DO MES */}
      {!isLoading && (
        <Card className="border border-blue-100 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-blue-50 flex flex-row flex-wrap items-center justify-between gap-4" style={{ background: "linear-gradient(to right, #eff6ff, white)" }}>
            <div>
              <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Star className="h-4 w-4 text-blue-500" />
                Total do Mês — Loja Virtual
              </CardTitle>
              <CardDescription className="text-[11px] font-semibold text-slate-500">
                {monthlyTotals.semanasCount} semanas em {MONTHS.find((m) => m.value === currentMonthTotalSelect)?.label || "Junho"}
              </CardDescription>
            </div>
            <Select value={currentMonthTotalSelect} onValueChange={setCurrentMonthTotalSelect}>
              <SelectTrigger className="h-8.5 w-36 text-xs font-bold border-blue-200"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.filter(m => m.value !== "all").map((m) => <SelectItem key={m.value} value={m.value} className="text-xs font-bold">{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "VENDAS NO MÊS", main: fmtBRL(monthlyTotals.revenue), sub: `${fmtBRL(monthlyTotals.vendasAds)} Ads · ${fmtBRL(monthlyTotals.vendasOrg)} Orgânico` },
              { label: "PEDIDOS", main: String(monthlyTotals.orders), sub: `${monthlyTotals.unidades} unidades` },
              { label: "TICKET MÉDIO", main: fmtBRL(monthlyTotals.ticket), sub: "Média geral do mês" },
              { label: "ROAS / ACOS", main: monthlyTotals.roas.toFixed(2), sub: `ACOS ${monthlyTotals.acos.toFixed(1)}% · Invest. ${fmtBRL(monthlyTotals.investAds)}` },
            ].map(({ label, main, sub }) => (
              <div key={label} className="border border-blue-100 rounded-xl p-3.5 bg-blue-50/40">
                <span className="text-[10px] font-bold text-blue-400 block tracking-wider">{label}</span>
                <span className="text-lg font-black text-slate-800 mt-1 block">{main}</span>
                <span className="text-[10px] font-bold text-slate-400 block mt-1">{sub}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── WEEKLY SMART CONVERSION ANALYSIS ─────────────────────── */}
      {!isLoading && weeklyData.length > 0 && (
        <Card className="border border-blue-200/70 shadow-sm rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50/60 to-white">
          <CardHeader className="pb-3 border-b border-blue-100/60 flex flex-row flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-blue-100/40 to-white">
            <div>
              <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-blue-500" />
                Análise Semanal Inteligente — Conversão
              </CardTitle>
              <CardDescription className="text-[11px] font-semibold text-slate-500">
                Breakdown automático semana a semana com métricas de conversão e tendências da Loja Virtual
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {weeklyData.map((week: any, idx: number) => {
                const conv = week.rate_conv || 0;
                const prevWeek = idx > 0 ? weeklyData[idx - 1] : null;
                const prevConv = prevWeek ? (prevWeek as any).rate_conv || 0 : 0;
                const convDelta = prevWeek ? conv - prevConv : 0;
                const isConvUp = convDelta >= 0;
                const metaPct = week.meta_dia > 0 ? (week.vendas_totais / week.meta_dia) * 100 : 0;
                const roas = week.invest_ads > 0 ? week.vendas_ads / week.invest_ads : 0;

                // Find best conversion day within this week
                const weekStart = week.ref_date;
                const [wy, wm, wd] = weekStart.split("-").map(Number);
                const weekStartDate = new Date(wy, wm - 1, wd);
                const weekEndDate = new Date(weekStartDate);
                weekEndDate.setDate(weekStartDate.getDate() + 6);
                const weekEndIso = `${weekEndDate.getFullYear()}-${String(weekEndDate.getMonth() + 1).padStart(2, "0")}-${String(weekEndDate.getDate()).padStart(2, "0")}`;

                const daysInWeek = filteredDailyData.filter(
                  (d) => d.ref_date >= weekStart && d.ref_date <= weekEndIso
                );
                const bestDay = daysInWeek.length > 0
                  ? daysInWeek.reduce((best, d) => {
                      const dConv = d.visitas > 0 ? (d.pedidos / d.visitas) * 100 : 0;
                      const bConv = best.visitas > 0 ? (best.pedidos / best.visitas) * 100 : 0;
                      return dConv > bConv ? d : best;
                    })
                  : null;
                const bestDayConv = bestDay && bestDay.visitas > 0 ? (bestDay.pedidos / bestDay.visitas) * 100 : 0;

                return (
                  <div key={week.id} className="border border-blue-200/60 rounded-xl p-4 bg-white hover:shadow-md transition-all duration-200">
                    {/* Week Header */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-slate-700">
                        {week.label || `Semana ${idx + 1}`}
                      </span>
                      <Badge className={`text-[9px] font-bold border-none ${metaPct >= 100 ? "bg-emerald-100 text-emerald-700" : metaPct >= 80 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {metaPct.toFixed(0)}% META
                      </Badge>
                    </div>

                    {/* Conversion Highlight */}
                    <div className="flex items-center gap-3 mb-3 p-2.5 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200/40">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-600">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-blue-600 tracking-wider block">TAXA DE CONVERSÃO</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-slate-800">{conv.toFixed(2)}%</span>
                          {prevWeek && (
                            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isConvUp ? "text-emerald-600" : "text-rose-600"}`}>
                              {isConvUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {convDelta >= 0 ? "+" : ""}{convDelta.toFixed(2)}pp
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center p-2 rounded-lg bg-slate-50/60">
                        <span className="text-[8px] font-bold text-slate-400 block tracking-wider">FATURAMENTO</span>
                        <span className="text-xs font-black text-slate-800">{fmtBRL(week.vendas_totais)}</span>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-slate-50/60">
                        <span className="text-[8px] font-bold text-slate-400 block tracking-wider">PEDIDOS</span>
                        <span className="text-xs font-black text-slate-800">{week.pedidos}</span>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-slate-50/60">
                        <span className="text-[8px] font-bold text-slate-400 block tracking-wider">VISITAS</span>
                        <span className="text-xs font-black text-slate-800">{week.visitas}</span>
                      </div>
                    </div>

                    {/* ROAS + Best Day */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-500">ROAS: <span className={`${roas >= 5 ? "text-emerald-600" : "text-amber-600"}`}>{roas.toFixed(2)}</span></span>
                      {bestDay && (
                        <span className="font-bold text-slate-500 truncate ml-2">
                          Melhor dia: <span className="text-blue-600">{bestDay.ref_date.slice(5)} ({bestDayConv.toFixed(1)}%)</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Weekly Conversion Chart */}
            <div className="mt-4 border-t border-blue-100 pt-4">
              <span className="text-xs font-black text-slate-700 block mb-2">📊 Tendência de Conversão Semanal</span>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="convGradientLV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: "#64748b" }}
                    tickFormatter={(v) => v.split(" ")[1] || v}
                  />
                  <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} contentStyle={{ borderRadius: "12px", border: "1px solid #bfdbfe", fontSize: "11px" }} />
                  <Area type="monotone" dataKey="rate_conv" name="Conversão (%)" stroke="#2563eb" fill="url(#convGradientLV)" strokeWidth={2.5} dot={{ fill: "#2563eb", r: 4, strokeWidth: 2, stroke: "#fff" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MAIN TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-blue-50 border border-blue-200 p-1 rounded-xl">
          <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold text-xs rounded-lg">Visão Geral</TabsTrigger>
          <TabsTrigger value="charts" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold text-xs rounded-lg">Gráficos</TabsTrigger>
          <TabsTrigger value="table" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold text-xs rounded-lg">Tabela Detalhada</TabsTrigger>
        </TabsList>

        {/* TAB OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          {filteredDailyData.length === 0 ? <LvEmptyState /> : (
            <>
              <Card className="border border-blue-100 shadow-sm">
                <CardHeader className="pb-3 border-b border-blue-50">
                  <CardTitle className="text-sm font-black text-slate-800">Faturamento Diário vs Meta</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Barras de faturamento real comparadas à linha de meta diária</CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={displayData} margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis dataKey="ref_date" tick={{ fontSize: 10, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => fmtBRL(value)} contentStyle={{ borderRadius: "12px", border: "1px solid #bfdbfe", fontSize: "11px" }} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="vendas_totais" name="Faturamento" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="meta_dia" name="Meta" stroke="#f97316" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border border-blue-100 shadow-sm">
                  <CardHeader className="pb-3 border-b border-blue-50">
                    <CardTitle className="text-sm font-black text-slate-800">Taxa de Conversão (%)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={displayData}>
                        <defs>
                          <linearGradient id="convGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                        <XAxis dataKey="ref_date" tick={{ fontSize: 9, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} contentStyle={{ borderRadius: "12px", border: "1px solid #bfdbfe", fontSize: "11px" }} />
                        <Area type="monotone" dataKey="rate_conv" name="Conversão" stroke="#2563eb" fill="url(#convGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border border-blue-100 shadow-sm">
                  <CardHeader className="pb-3 border-b border-blue-50">
                    <CardTitle className="text-sm font-black text-slate-800">Mix de Produtos — Unidades</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex items-center justify-center">
                    {productShareData.length > 0 ? (
                      <div className="flex items-center gap-4 w-full">
                        <ResponsiveContainer width={160} height={160}>
                          <PieChart>
                            <Pie data={productShareData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                              {productShareData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${value} unidades`} contentStyle={{ borderRadius: "12px", fontSize: "11px" }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 flex-1 text-xs">
                          {productShareData.map((item) => (
                            <div key={item.name} className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="text-slate-600 font-medium truncate">{item.name}</span>
                              <span className="text-blue-700 font-black ml-auto">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : <LvEmptyState />}
                  </CardContent>
                </Card>
              </div>

              <Card className="border border-blue-100 shadow-sm">
                <CardHeader className="pb-3 border-b border-blue-50">
                  <CardTitle className="text-sm font-black text-slate-800">Faturamento Acumulado</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Crescimento cumulativo no período filtrado</CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={cumulativeChartData}>
                      <defs>
                        <linearGradient id="cumulGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis dataKey="ref_date" tick={{ fontSize: 9, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => fmtBRL(value)} contentStyle={{ borderRadius: "12px", border: "1px solid #bfdbfe", fontSize: "11px" }} />
                      <Area type="monotone" dataKey="faturamento_acumulado" name="Acumulado" stroke="#1d4ed8" fill="url(#cumulGradient)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB CHARTS */}
        <TabsContent value="charts" className="space-y-4">
          {filteredDailyData.length === 0 ? <LvEmptyState /> : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border border-blue-100 shadow-sm">
                  <CardHeader className="pb-3 border-b border-blue-50">
                    <CardTitle className="text-sm font-black text-slate-800">Invest. Ads vs Vendas via Ads</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={displayData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                        <XAxis dataKey="ref_date" tick={{ fontSize: 9, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value: number) => fmtBRL(value)} contentStyle={{ borderRadius: "12px", fontSize: "11px" }} />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Bar dataKey="invest_ads" name="Investimento Ads" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="vendas_ads" name="Vendas via Ads" fill="#2563eb" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border border-blue-100 shadow-sm">
                  <CardHeader className="pb-3 border-b border-blue-50">
                    <CardTitle className="text-sm font-black text-slate-800">Ticket Médio (R$)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={displayData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                        <XAxis dataKey="ref_date" tick={{ fontSize: 9, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v) => `R$${v.toFixed(0)}`} />
                        <Tooltip formatter={(value: number) => fmtBRL(value)} contentStyle={{ borderRadius: "12px", fontSize: "11px" }} />
                        <Line type="monotone" dataKey="ticket_medio" name="Ticket Médio" stroke="#1d4ed8" strokeWidth={2.5} dot={{ fill: "#1d4ed8", r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="border border-blue-100 shadow-sm">
                <CardHeader className="pb-3 border-b border-blue-50">
                  <CardTitle className="text-sm font-black text-slate-800">Visitas vs Pedidos</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={displayData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis dataKey="ref_date" tick={{ fontSize: 9, fill: "#64748b" }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "#64748b" }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#64748b" }} />
                      <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "11px" }} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar yAxisId="left" dataKey="visitas" name="Visitas" fill="#bfdbfe" radius={[3, 3, 0, 0]} />
                      <Bar yAxisId="right" dataKey="pedidos" name="Pedidos" fill="#1d4ed8" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB TABLE */}
        <TabsContent value="table" className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-400" />
              <Input
                placeholder="Buscar por data, produto ou observações..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-9 h-9 text-xs border-blue-200"
              />
            </div>
            <Button variant="outline" className="h-9 text-xs font-semibold border-blue-200 text-blue-700 hover:bg-blue-50" onClick={handleExportExcel}>
              <FileText className="mr-1.5 h-3.5 w-3.5" /> Exportar CSV
            </Button>
          </div>

          {processedTableData.length === 0 ? <LvEmptyState /> : (
            <Card className="border border-blue-100 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-50 hover:bg-blue-100/60">
                    {[
                      { key: "ref_date", label: "Data" }, { key: "dia_semana", label: "Dia" },
                      { key: "unidades", label: "Unidades" }, { key: "vendas_totais", label: "Faturamento" },
                      { key: "pedidos", label: "Pedidos" }, { key: "visitas", label: "Visitas" },
                      { key: "rate_conv", label: "Conversão" }, { key: "ticket_medio", label: "Ticket Médio" },
                      { key: "invest_ads", label: "Invest. Ads" }, { key: "vendas_ads", label: "Vendas Ads" },
                    ].map(({ key, label }) => (
                      <TableHead key={key} className="text-[10px] font-black text-blue-700 uppercase tracking-wider cursor-pointer select-none hover:text-blue-900 whitespace-nowrap" onClick={() => handleSort(key)}>
                        <span className="flex items-center gap-1">{label}<ArrowUpDown className="h-3 w-3 opacity-50" /></span>
                      </TableHead>
                    ))}
                    <TableHead className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Produto</TableHead>
                    {isMaster && <TableHead className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row: any, i) => (
                    <TableRow key={row.id} className={`hover:bg-blue-50/50 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}>
                      <TableCell className="text-xs font-bold text-slate-700 whitespace-nowrap">{row.ref_date}</TableCell>
                      <TableCell className="text-xs text-slate-600">{row.dia_semana || row.label || "—"}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-700">{row.unidades}</TableCell>
                      <TableCell className="text-xs font-black">
                        <span className={row.vendas_totais >= row.meta_dia ? "text-emerald-600" : "text-slate-800"}>{fmtBRL(row.vendas_totais)}</span>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-700">{row.pedidos}</TableCell>
                      <TableCell className="text-xs text-slate-600">{row.visitas}</TableCell>
                      <TableCell className="text-xs font-bold text-blue-600">{row.rate_conv?.toFixed(2)}%</TableCell>
                      <TableCell className="text-xs text-slate-600">{fmtBRL(row.ticket_medio)}</TableCell>
                      <TableCell className="text-xs text-slate-600">{fmtBRL(row.invest_ads || 0)}</TableCell>
                      <TableCell className="text-xs text-slate-600">{fmtBRL(row.vendas_ads || 0)}</TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-[140px] truncate" title={row.produto_mais_vendido}>{row.produto_mais_vendido}</TableCell>
                      {isMaster && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <button onClick={() => startEdit(row as LVPerformanceEntry)} className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                            <button onClick={() => deleteEntryMutation.mutate(row.id)} className="p-1 hover:bg-red-100 rounded text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between px-4 py-2 border-t border-blue-50 bg-blue-50/40">
                <span className="text-[10px] font-bold text-slate-500">{processedTableData.length} registros · Pág. {currentPage} / {totalPages}</span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-blue-200 text-blue-600" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-blue-200 text-blue-600" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ADD/EDIT MODAL */}
      {isAddModalOpen && (
        <Dialog open={isAddModalOpen} onOpenChange={(open) => { if (!open) { setIsAddModalOpen(false); setEditingEntry(null); } }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-800">
                {editingEntry ? "Editar Registro" : "Novo Registro — Loja Virtual"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Preencha os dados de performance da sua Loja Virtual Isoflex.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFormSubmit} className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="lv-ref_date" className="text-xs font-semibold text-slate-700">Data</Label>
                  <Input id="lv-ref_date" type="date" value={formData.ref_date} onChange={(e) => setFormData({ ...formData, ref_date: e.target.value })} className="h-9" required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Meta do Dia (R$)</Label>
                  <Input type="number" step="0.01" placeholder="Ex: 8000.00" value={formData.meta_dia} onChange={(e) => setFormData({ ...formData, meta_dia: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Faturamento (R$)</Label>
                  <Input type="number" step="0.01" placeholder="Ex: 7500.00" value={formData.vendas_totais} onChange={(e) => setFormData({ ...formData, vendas_totais: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Pedidos</Label>
                  <Input type="number" placeholder="Ex: 30" value={formData.pedidos} onChange={(e) => setFormData({ ...formData, pedidos: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Unidades Vendidas</Label>
                  <Input type="number" placeholder="Ex: 35" value={formData.unidades} onChange={(e) => setFormData({ ...formData, unidades: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Visitas</Label>
                  <Input type="number" placeholder="Ex: 900" value={formData.visitas} onChange={(e) => setFormData({ ...formData, visitas: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Invest. Ads (R$)</Label>
                  <Input type="number" step="0.01" placeholder="Ex: 400.00" value={formData.invest_ads} onChange={(e) => setFormData({ ...formData, invest_ads: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Vendas via Ads (R$)</Label>
                  <Input type="number" step="0.01" placeholder="Ex: 2500.00" value={formData.vendas_ads} onChange={(e) => setFormData({ ...formData, vendas_ads: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Produto Mais Vendido *</Label>
                  <Input placeholder="Ex: Flow Rack Modular Isoflex" value={formData.produto_mais_vendido} onChange={(e) => setFormData({ ...formData, produto_mais_vendido: e.target.value })} className="h-9" required />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Observações</Label>
                  <textarea rows={2} placeholder="Ex: Promoção de frete grátis ativa." value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} className="w-full text-xs p-2 border rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saveEntryMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
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

function LvKpiCard({ label, value, trend, isPositive, icon: Icon, highlightAlert = false }: {
  label: string; value: string; trend: string; isPositive: boolean; icon: any; highlightAlert?: boolean;
}) {
  return (
    <Card className={`border rounded-2xl shadow-xs transition-all hover:scale-[1.02] duration-300 ${highlightAlert ? "border-red-300" : "border-blue-100"}`}
      style={{ background: highlightAlert ? "rgba(254,242,242,0.5)" : "linear-gradient(145deg, #ffffff 0%, #eff6ff 100%)" }}>
      <CardContent className="p-4 flex flex-col justify-between h-full min-h-[105px]">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-blue-400 tracking-wider block uppercase">{label}</span>
            <div className="text-xl font-black text-slate-800 tracking-tight">{value}</div>
          </div>
          <div className="p-1.5 rounded-lg text-blue-500 bg-blue-100 border border-blue-200">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-2 text-[9px] font-bold">
          {isPositive ? (
            <span className="text-emerald-600 flex items-center"><TrendingUp className="h-3 w-3 mr-0.5" /> {trend}</span>
          ) : (
            <span className="text-rose-600 flex items-center"><TrendingDown className="h-3 w-3 mr-0.5" /> {trend}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LvEmptyState() {
  return (
    <div className="h-60 flex items-center justify-center flex-col text-slate-400 border border-dashed border-blue-200 rounded-xl bg-blue-50/30">
      <Globe className="h-10 w-10 mb-2 opacity-30 animate-pulse text-blue-500" />
      <span className="text-xs font-bold text-slate-500">Nenhum dado disponível no período selecionado</span>
      <span className="text-[10px] text-slate-400 mt-1">Ajuste os filtros de datas acima para visualizar as análises.</span>
    </div>
  );
}
