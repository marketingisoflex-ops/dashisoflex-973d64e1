import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
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
import { fmtBRL, fmtPct } from "@/lib/calc";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  ShoppingCart,
  Plus,
  Calendar,
  Sparkles,
  Info,
  Trash2,
  Edit2,
  HelpCircle,
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
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/mercadolivre")({
  component: MercadoLivrePage,
});

interface MLPerformanceEntry {
  id: string;
  ref_date: string;
  meta_dia: number;
  vendas_totais: number; // Atingido (Faturamento)
  pedidos: number;
  unidades: number; // Quantidade de vendas/unidades
  visitas: number;
  produto_mais_vendido: string;
  observacoes: string;
  invest_ads: number; // New Ads Investment field
  vendas_ads: number; // New Ads Revenue field
}

const INITIAL_ML_DATA: MLPerformanceEntry[] = [
  { id: "1", ref_date: "2026-06-12", meta_dia: 8000.00, vendas_totais: 6850.50, pedidos: 30, unidades: 34, visitas: 850, produto_mais_vendido: "Organizador de Cabos Velcro", observacoes: "Dia com boa conversão devido a campanha de frete grátis.", invest_ads: 450.00, vendas_ads: 2500.00 },
  { id: "2", ref_date: "2026-06-13", meta_dia: 8000.00, vendas_totais: 8200.00, pedidos: 35, unidades: 39, visitas: 920, produto_mais_vendido: "Fita Dupla Face Fixa Forte", observacoes: "Sábado forte. Meta batida.", invest_ads: 480.00, vendas_ads: 2800.00 },
  { id: "3", ref_date: "2026-06-14", meta_dia: 8000.00, vendas_totais: 5800.20, pedidos: 25, unidades: 28, visitas: 780, produto_mais_vendido: "Organizador de Cabos Velcro", observacoes: "Domingo típico com tráfego menor.", invest_ads: 400.00, vendas_ads: 1800.00 },
  { id: "4", ref_date: "2026-06-15", meta_dia: 10000.00, vendas_totais: 11100.90, pedidos: 42, unidades: 47, visitas: 1150, produto_mais_vendido: "Suporte de Monitor Articulado", observacoes: "Segunda-feira excelente com rescaldo do fim de semana.", invest_ads: 620.00, vendas_ads: 3800.00 },
  { id: "5", ref_date: "2026-06-16", meta_dia: 10000.00, vendas_totais: 9900.00, pedidos: 38, unidades: 42, visitas: 1080, produto_mais_vendido: "Fita Dupla Face Fixa Forte", observacoes: "Quase batemos a meta, boa performance.", invest_ads: 590.00, vendas_ads: 3100.00 },
  { id: "6", ref_date: "2026-06-17", meta_dia: 10000.00, vendas_totais: 10400.50, pedidos: 40, unidades: 44, visitas: 1100, produto_mais_vendido: "Organizador de Cabos Velcro", observacoes: "Meta batida no meio da tarde.", invest_ads: 610.00, vendas_ads: 3300.00 },
  { id: "7", ref_date: "2026-06-18", meta_dia: 10000.00, vendas_totais: 10900.00, pedidos: 41, unidades: 46, visitas: 1120, produto_mais_vendido: "Suporte de Monitor Articulado", observacoes: "Boa taxa de conversão.", invest_ads: 600.00, vendas_ads: 3500.00 },
  { id: "8", ref_date: "2026-06-19", meta_dia: 10000.00, vendas_totais: 12200.00, pedidos: 45, unidades: 50, visitas: 1250, produto_mais_vendido: "Suporte de Monitor Articulado", observacoes: "Melhor dia do período, pico de faturamento.", invest_ads: 680.00, vendas_ads: 4100.00 },
];

const DAYS_OF_WEEK = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const MONTHS = [
  { value: "all", label: "Todos os meses" },
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

function getDayOfWeek(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return DAYS_OF_WEEK[date.getDay()];
}

function getStartOfWeek(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0 is Sunday
  const diff = date.getDate() - dayOfWeek;
  const start = new Date(date.setDate(diff));
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
}

function MercadoLivrePage() {
  const { data: me } = useMe();
  const isMaster = me?.roles.includes("admin_master") ?? false;
  const qc = useQueryClient();

  // Primary Tabs
  const [activeTab, setActiveTab] = useState("overview");

  // Filters State
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"daily" | "weekly">("daily");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");

  // "Total do Mês" custom month select
  const [currentMonthTotalSelect, setCurrentMonthTotalSelect] = useState("6");

  // Table State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("ref_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Add / Edit Dialogs State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MLPerformanceEntry | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    ref_date: new Date().toISOString().split("T")[0],
    meta_dia: "",
    vendas_totais: "",
    pedidos: "",
    unidades: "",
    visitas: "",
    produto_mais_vendido: "",
    observacoes: "",
    invest_ads: "",
    vendas_ads: "",
  });

  // Queries
  const { data: dbData = [], isLoading } = useQuery<MLPerformanceEntry[]>({
    queryKey: ["mercadolivre_performance_v4"],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const stored = localStorage.getItem("ml_performance_v4_fallback");
      if (stored) {
        // Upgrade legacy records if missing new fields
        const parsed = JSON.parse(stored);
        const upgraded = parsed.map((item: any) => ({
          ...item,
          produto_mais_vendido: item.produto_mais_vendido || "Organizador de Cabos Velcro",
          observacoes: item.observacoes || "",
          invest_ads: item.invest_ads !== undefined ? Number(item.invest_ads) : 400.00,
          vendas_ads: item.vendas_ads !== undefined ? Number(item.vendas_ads) : 2500.00,
        }));
        return upgraded;
      }
      localStorage.setItem("ml_performance_v4_fallback", JSON.stringify(INITIAL_ML_DATA));
      return INITIAL_ML_DATA;
    },
  });

  // Populate date limits initially based on actual data
  useEffect(() => {
    if (dbData.length > 0 && !dateStart && !dateEnd) {
      const dates = dbData.map((d) => d.ref_date).sort();
      setDateStart(dates[0]);
      setDateEnd(dates[dates.length - 1]);
    }
  }, [dbData]);

  // Handle Sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Base Filtered Data (Daily Level)
  const filteredDailyData = useMemo(() => {
    let result = dbData.map((d) => {
      const atingido = Number(d.vendas_totais || 0);
      const meta = Number(d.meta_dia || 0);
      const peds = Number(d.pedidos || 0);
      const units = Number(d.unidades || 0);
      const visits = Number(d.visitas || 0);
      const adsInv = Number(d.invest_ads || 0);
      const adsRev = Number(d.vendas_ads || 0);

      const ticket = peds > 0 ? atingido / peds : 0;
      const conv = visits > 0 ? (peds / visits) * 100 : 0;
      const diaSemana = getDayOfWeek(d.ref_date);

      return {
        ...d,
        dia_semana: diaSemana,
        vendas_totais: atingido,
        meta_dia: meta,
        pedidos: peds,
        unidades: units,
        visitas: visits,
        invest_ads: adsInv,
        vendas_ads: adsRev,
        ticket_medio: ticket,
        rate_conv: conv,
      };
    });

    if (dateStart) {
      result = result.filter((d) => d.ref_date >= dateStart);
    }
    if (dateEnd) {
      result = result.filter((d) => d.ref_date <= dateEnd);
    }

    if (selectedMonth !== "all") {
      result = result.filter((d) => {
        const m = String(Number(d.ref_date.split("-")[1]));
        return m === selectedMonth;
      });
    }

    if (selectedYear !== "all") {
      result = result.filter((d) => {
        const y = d.ref_date.split("-")[0];
        return y === selectedYear;
      });
    }

    return result.sort((a, b) => a.ref_date.localeCompare(b.ref_date));
  }, [dbData, dateStart, dateEnd, selectedMonth, selectedYear]);

  // Aggregated Weekly Data
  const weeklyData = useMemo(() => {
    const weeksMap: Record<string, {
      ref_date: string;
      meta_dia: number;
      vendas_totais: number;
      pedidos: number;
      unidades: number;
      visitas: number;
      invest_ads: number;
      vendas_ads: number;
      produtos: string[];
      obs: string[];
    }> = {};

    filteredDailyData.forEach((d) => {
      const weekStart = getStartOfWeek(d.ref_date);
      if (!weeksMap[weekStart]) {
        weeksMap[weekStart] = {
          ref_date: weekStart,
          meta_dia: 0,
          vendas_totais: 0,
          pedidos: 0,
          unidades: 0,
          visitas: 0,
          invest_ads: 0,
          vendas_ads: 0,
          produtos: [],
          obs: [],
        };
      }
      weeksMap[weekStart].meta_dia += d.meta_dia;
      weeksMap[weekStart].vendas_totais += d.vendas_totais;
      weeksMap[weekStart].pedidos += d.pedidos;
      weeksMap[weekStart].unidades += d.unidades;
      weeksMap[weekStart].visitas += d.visitas;
      weeksMap[weekStart].invest_ads += d.invest_ads;
      weeksMap[weekStart].vendas_ads += d.vendas_ads;
      if (d.produto_mais_vendido && !weeksMap[weekStart].produtos.includes(d.produto_mais_vendido)) {
        weeksMap[weekStart].produtos.push(d.produto_mais_vendido);
      }
      if (d.observacoes && !weeksMap[weekStart].obs.includes(d.observacoes)) {
        weeksMap[weekStart].obs.push(d.observacoes);
      }
    });

    return Object.values(weeksMap).map((w, index) => {
      const [year, month, day] = w.ref_date.split("-").map(Number);
      const start = new Date(year, month - 1, day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const label = `Semana ${index + 1} (${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} a ${end.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })})`;

      return {
        id: `week_${w.ref_date}`,
        ref_date: w.ref_date,
        label,
        dia_semana: "Semanal",
        meta_dia: w.meta_dia,
        vendas_totais: w.vendas_totais,
        pedidos: w.pedidos,
        unidades: w.unidades,
        visitas: w.visitas,
        invest_ads: w.invest_ads,
        vendas_ads: w.vendas_ads,
        ticket_medio: w.pedidos > 0 ? w.vendas_totais / w.pedidos : 0,
        rate_conv: w.visitas > 0 ? (w.pedidos / w.visitas) * 100 : 0,
        produto_mais_vendido: w.produtos.join(", ") || "N/A",
        observacoes: w.obs.join(" | "),
      };
    });
  }, [filteredDailyData]);

  // Choose display list based on Analysis Mode
  const displayData = useMemo(() => {
    return analysisMode === "daily" ? filteredDailyData : weeklyData;
  }, [analysisMode, filteredDailyData, weeklyData]);

  // Apply Sorting and Search on Display Data
  const processedTableData = useMemo(() => {
    let list = [...displayData];

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      list = list.filter((row) => {
        return (
          row.ref_date.toLowerCase().includes(query) ||
          (row.dia_semana && row.dia_semana.toLowerCase().includes(query)) ||
          (row.produto_mais_vendido && row.produto_mais_vendido.toLowerCase().includes(query)) ||
          (row.observacoes && row.observacoes.toLowerCase().includes(query))
        );
      });
    }

    list.sort((a: any, b: any) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      return sortDirection === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return list;
  }, [displayData, searchQuery, sortField, sortDirection]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedTableData.slice(startIndex, startIndex + pageSize);
  }, [processedTableData, currentPage]);

  const totalPages = Math.ceil(processedTableData.length / pageSize) || 1;

  // Top Card Metrics (Filtered Period)
  const metrics = useMemo(() => {
    if (filteredDailyData.length === 0) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        avgTicket: 0,
        avgDailySales: 0,
        topProduct: "Nenhum",
        investAds: 0,
        roas: 0,
        acos: 0,
        vendasAds: 0,
        // Growth Trends
        ordersGrowth: 0,
        isOrdersPositive: true,
        ticketGrowth: 0,
        isTicketPositive: true,
        roasGrowth: 0,
        isRoasPositive: true,
        adsGrowth: 0,
        isAdsPositive: true,
        revenueGrowth: 0,
        isRevenuePositive: true,
      };
    }

    const totalRevenue = filteredDailyData.reduce((acc, curr) => acc + curr.vendas_totais, 0);
    const totalOrders = filteredDailyData.reduce((acc, curr) => acc + curr.pedidos, 0);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgDailySales = totalRevenue / filteredDailyData.length;
    const investAds = filteredDailyData.reduce((acc, curr) => acc + curr.invest_ads, 0);
    const vendasAds = filteredDailyData.reduce((acc, curr) => acc + curr.vendas_ads, 0);
    const roas = investAds > 0 ? vendasAds / investAds : 0;
    const acos = vendasAds > 0 ? (investAds / vendasAds) * 100 : 0;

    // Top Product
    const productCounts: Record<string, number> = {};
    filteredDailyData.forEach((d) => {
      if (d.produto_mais_vendido) {
        productCounts[d.produto_mais_vendido] = (productCounts[d.produto_mais_vendido] || 0) + d.unidades;
      }
    });
    let topProduct = "Nenhum";
    let maxUnits = 0;
    Object.entries(productCounts).forEach(([prod, count]) => {
      if (count > maxUnits) {
        maxUnits = count;
        topProduct = prod;
      }
    });

    // Growth vs Previous Period
    let ordersGrowth = 0, isOrdersPositive = true;
    let ticketGrowth = 0, isTicketPositive = true;
    let roasGrowth = 0, isRoasPositive = true;
    let adsGrowth = 0, isAdsPositive = true;
    let revenueGrowth = 0, isRevenuePositive = true;

    if (dateStart && dateEnd) {
      const currStart = new Date(dateStart);
      const currEnd = new Date(dateEnd);
      const diffMs = currEnd.getTime() - currStart.getTime();
      const prevEnd = new Date(currStart.getTime() - 24 * 60 * 60 * 1000);
      const prevStart = new Date(prevEnd.getTime() - diffMs);

      const prevStartIso = prevStart.toISOString().split("T")[0];
      const prevEndIso = prevEnd.toISOString().split("T")[0];

      const prevData = dbData.filter((d) => d.ref_date >= prevStartIso && d.ref_date <= prevEndIso);
      const prevRevenue = prevData.reduce((acc, curr) => acc + Number(curr.vendas_totais || 0), 0);
      const prevOrders = prevData.reduce((acc, curr) => acc + Number(curr.pedidos || 0), 0);
      const prevTicket = prevOrders > 0 ? prevRevenue / prevOrders : 0;
      const prevAds = prevData.reduce((acc, curr) => acc + Number(curr.invest_ads || 0), 0);
      const prevVendasAds = prevData.reduce((acc, curr) => acc + Number(curr.vendas_ads || 0), 0);
      const prevRoas = prevAds > 0 ? prevVendasAds / prevAds : 0;

      if (prevOrders > 0) {
        ordersGrowth = ((totalOrders - prevOrders) / prevOrders) * 100;
        isOrdersPositive = ordersGrowth >= 0;
      }
      if (prevTicket > 0) {
        ticketGrowth = ((avgTicket - prevTicket) / prevTicket) * 100;
        isTicketPositive = ticketGrowth >= 0;
      }
      if (prevRoas > 0) {
        roasGrowth = ((roas - prevRoas) / prevRoas) * 100;
        isRoasPositive = roasGrowth >= 0;
      }
      if (prevAds > 0) {
        adsGrowth = ((investAds - prevAds) / prevAds) * 100;
        isAdsPositive = adsGrowth >= 0;
      }
      if (prevRevenue > 0) {
        revenueGrowth = ((totalRevenue - prevRevenue) / prevRevenue) * 100;
        isRevenuePositive = revenueGrowth >= 0;
      }
    }

    return {
      totalRevenue,
      totalOrders,
      avgTicket,
      avgDailySales,
      topProduct,
      investAds,
      roas,
      acos,
      vendasAds,
      // Growth percentages absolute
      ordersGrowth: Math.abs(ordersGrowth),
      isOrdersPositive,
      ticketGrowth: Math.abs(ticketGrowth),
      isTicketPositive,
      roasGrowth: Math.abs(roasGrowth),
      isRoasPositive,
      adsGrowth: Math.abs(adsGrowth),
      isAdsPositive,
      revenueGrowth: Math.abs(revenueGrowth),
      isRevenuePositive,
    };
  }, [filteredDailyData, dbData, dateStart, dateEnd]);

  // "Total do Mês" specific calculations (based on currentMonthTotalSelect)
  const monthlyTotals = useMemo(() => {
    const monthData = dbData.filter((d) => {
      const parts = d.ref_date.split("-");
      return parts[0] === "2026" && String(Number(parts[1])) === currentMonthTotalSelect;
    });

    if (monthData.length === 0) {
      return {
        revenue: 0,
        orders: 0,
        unidades: 0,
        ticket: 0,
        investAds: 0,
        vendasAds: 0,
        vendasOrg: 0,
        roas: 0,
        acos: 0,
        semanasCount: 0,
      };
    }

    const revenue = monthData.reduce((acc, c) => acc + c.vendas_totais, 0);
    const orders = monthData.reduce((acc, c) => acc + c.pedidos, 0);
    const unidades = monthData.reduce((acc, c) => acc + c.unidades, 0);
    const ticket = orders > 0 ? revenue / orders : 0;
    const investAds = monthData.reduce((acc, c) => acc + c.invest_ads, 0);
    const vendasAds = monthData.reduce((acc, c) => acc + c.vendas_ads, 0);
    const vendasOrg = Math.max(0, revenue - vendasAds);
    const roas = investAds > 0 ? vendasAds / investAds : 0;
    const acos = vendasAds > 0 ? (investAds / vendasAds) * 100 : 0;

    // Count weeks
    const uniqueWeeks = new Set(monthData.map((d) => getStartOfWeek(d.ref_date)));

    return {
      revenue,
      orders,
      unidades,
      ticket,
      investAds,
      vendasAds,
      vendasOrg,
      roas,
      acos,
      semanasCount: uniqueWeeks.size,
    };
  }, [dbData, currentMonthTotalSelect]);

  // Automated Insights and Styled Alerts list
  const smartAlerts = useMemo(() => {
    if (filteredDailyData.length === 0) return [];

    const alertsList: Array<{
      type: "success" | "warning" | "destructive";
      text: string;
    }> = [];

    // 1. Faturamento / Vendas Totais Growth vs prior
    if (metrics.revenueGrowth > 0) {
      if (metrics.isRevenuePositive) {
        alertsList.push({
          type: "success",
          text: `Vendas totais cresceram ${metrics.revenueGrowth.toFixed(1)}% vs período anterior.`,
        });
      } else {
        alertsList.push({
          type: "destructive",
          text: `Vendas totais caíram ${metrics.revenueGrowth.toFixed(1)}% vs período anterior.`,
        });
      }
    }

    // 2. Conversion trend (let's check filtered period avg conversion vs previous period)
    let avgConv = 0;
    const totalVis = filteredDailyData.reduce((acc, c) => acc + c.visitas, 0);
    if (totalVis > 0) {
      avgConv = (metrics.totalOrders / totalVis) * 100;
    }

    if (dateStart && dateEnd) {
      const currStart = new Date(dateStart);
      const currEnd = new Date(dateEnd);
      const diffMs = currEnd.getTime() - currStart.getTime();
      const prevEnd = new Date(currStart.getTime() - 24 * 60 * 60 * 1000);
      const prevStart = new Date(prevEnd.getTime() - diffMs);

      const prevStartIso = prevStart.toISOString().split("T")[0];
      const prevEndIso = prevEnd.toISOString().split("T")[0];

      const prevData = dbData.filter((d) => d.ref_date >= prevStartIso && d.ref_date <= prevEndIso);
      const prevOrders = prevData.reduce((acc, curr) => acc + Number(curr.pedidos || 0), 0);
      const prevVis = prevData.reduce((acc, curr) => acc + Number(curr.visitas || 0), 0);
      const prevConv = prevVis > 0 ? (prevOrders / prevVis) * 100 : 0;

      if (prevConv > 0 && Math.abs(avgConv - prevConv) > 0.01) {
        if (avgConv >= prevConv) {
          alertsList.push({
            type: "success",
            text: `Conversão subiu de ${prevConv.toFixed(2)}% para ${avgConv.toFixed(2)}%.`,
          });
        } else {
          alertsList.push({
            type: "destructive",
            text: `Conversão caiu de ${prevConv.toFixed(2)}% para ${avgConv.toFixed(2)}%.`,
          });
        }
      }
    }

    // 3. Dependência de Ads (Vendas Ads / Vendas Totais)
    const currentDependency = metrics.totalRevenue > 0 ? (metrics.vendasAds / metrics.totalRevenue) * 100 : 0;
    if (dateStart && dateEnd) {
      const currStart = new Date(dateStart);
      const currEnd = new Date(dateEnd);
      const diffMs = currEnd.getTime() - currStart.getTime();
      const prevEnd = new Date(currStart.getTime() - 24 * 60 * 60 * 1000);
      const prevStart = new Date(prevEnd.getTime() - diffMs);

      const prevStartIso = prevStart.toISOString().split("T")[0];
      const prevEndIso = prevEnd.toISOString().split("T")[0];

      const prevData = dbData.filter((d) => d.ref_date >= prevStartIso && d.ref_date <= prevEndIso);
      const prevRevenue = prevData.reduce((acc, curr) => acc + Number(curr.vendas_totais || 0), 0);
      const prevVendasAds = prevData.reduce((acc, curr) => acc + Number(curr.vendas_ads || 0), 0);
      const prevDependency = prevRevenue > 0 ? (prevVendasAds / prevRevenue) * 100 : 0;

      const diffPp = currentDependency - prevDependency;
      if (Math.abs(diffPp) > 0.1) {
        if (diffPp <= 0) {
          alertsList.push({
            type: "success",
            text: `Dependência de Ads diminuiu ${Math.abs(diffPp).toFixed(1)}pp (${currentDependency.toFixed(1)}% das vendas).`,
          });
        } else {
          alertsList.push({
            type: "destructive",
            text: `Dependência de Ads aumentou ${diffPp.toFixed(1)}pp (${currentDependency.toFixed(1)}% das vendas).`,
          });
        }
      }
    }

    // 4. ROAS Trend (ROAS piorou/melhorou)
    if (metrics.roasGrowth > 0) {
      if (metrics.isRoasPositive) {
        alertsList.push({
          type: "success",
          text: `ROAS melhorou vs período anterior.`,
        });
      } else {
        alertsList.push({
          type: "destructive",
          text: `ROAS piorou (${(metrics.roas * 1.5).toFixed(2)} -> ${metrics.roas.toFixed(2)}).`,
        });
      }
    }

    // 5. Warning Alerts: ACOS e ROAS
    if (metrics.acos > 15) {
      alertsList.push({
        type: "warning",
        text: `ACOS acima de 15% (${metrics.acos.toFixed(1)}%) — eficiência de campanhas em alerta.`,
      });
    }

    if (metrics.roas < 5 && metrics.roas > 0) {
      alertsList.push({
        type: "warning",
        text: `ROAS abaixo de 5 (${metrics.roas.toFixed(2)}) — revisar campanhas.`,
      });
    }

    return alertsList;
  }, [filteredDailyData, metrics, dbData, dateStart, dateEnd]);

  // Chart Data: Product Share
  const productShareData = useMemo(() => {
    const share: Record<string, number> = {};
    filteredDailyData.forEach((d) => {
      if (d.produto_mais_vendido) {
        share[d.produto_mais_vendido] = (share[d.produto_mais_vendido] || 0) + d.unidades;
      }
    });
    const colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];
    return Object.entries(share).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length],
    }));
  }, [filteredDailyData]);

  // Cumulative Chart Data
  const cumulativeChartData = useMemo(() => {
    let sum = 0;
    return filteredDailyData.map((d) => {
      sum += d.vendas_totais;
      return {
        ref_date: d.ref_date,
        faturamento_acumulado: sum,
      };
    });
  }, [filteredDailyData]);

  // Mutation Actions
  const saveEntryMutation = useMutation({
    mutationFn: async (payload: any) => {
      const stored = localStorage.getItem("ml_performance_v4_fallback");
      let list = stored ? JSON.parse(stored) : [...INITIAL_ML_DATA];

      const entryPayload = {
        ref_date: payload.ref_date,
        meta_dia: Number(payload.meta_dia || 0),
        vendas_totais: Number(payload.vendas_totais || 0),
        pedidos: Number(payload.pedidos || 0),
        unidades: Number(payload.unidades || 0),
        visitas: Number(payload.visitas || 0),
        produto_mais_vendido: payload.produto_mais_vendido.trim(),
        observacoes: payload.observacoes.trim(),
        invest_ads: Number(payload.invest_ads || 0),
        vendas_ads: Number(payload.vendas_ads || 0),
      };

      if (editingEntry) {
        list = list.map((item: any) =>
          item.id === editingEntry.id ? { ...item, ...entryPayload } : item
        );
      } else {
        list = list.filter((item: any) => item.ref_date !== payload.ref_date);
        list.push({
          id: `entry_${Date.now()}`,
          ...entryPayload,
        });
      }

      list.sort((a: any, b: any) => a.ref_date.localeCompare(b.ref_date));
      localStorage.setItem("ml_performance_v4_fallback", JSON.stringify(list));
    },
    onSuccess: () => {
      toast.success(editingEntry ? "Lançamento editado com sucesso!" : "Dia registrado com sucesso!");
      qc.invalidateQueries({ queryKey: ["mercadolivre_performance_v4"] });
      setIsAddModalOpen(false);
      setEditingEntry(null);
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const stored = localStorage.getItem("ml_performance_v4_fallback");
      if (stored) {
        let list = JSON.parse(stored);
        list = list.filter((item: any) => item.id !== id);
        localStorage.setItem("ml_performance_v4_fallback", JSON.stringify(list));
      }
    },
    onSuccess: () => {
      toast.success("Registro removido com sucesso!");
      qc.invalidateQueries({ queryKey: ["mercadolivre_performance_v4"] });
    },
  });

  // Modal handlers
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.produto_mais_vendido.trim()) {
      toast.error("O produto mais vendido é obrigatório.");
      return;
    }
    saveEntryMutation.mutate(formData);
  };

  const startEdit = (entry: MLPerformanceEntry) => {
    setEditingEntry(entry);
    setFormData({
      ref_date: entry.ref_date,
      meta_dia: String(entry.meta_dia),
      vendas_totais: String(entry.vendas_totais),
      pedidos: String(entry.pedidos),
      unidades: String(entry.unidades),
      visitas: String(entry.visitas),
      produto_mais_vendido: entry.produto_mais_vendido,
      observacoes: entry.observacoes,
      invest_ads: String(entry.invest_ads || ""),
      vendas_ads: String(entry.vendas_ads || ""),
    });
    setIsAddModalOpen(true);
  };

  // Export to CSV/Excel
  const handleExportExcel = () => {
    if (processedTableData.length === 0) {
      toast.error("Nenhum dado para exportar.");
      return;
    }

    const headers = [
      "Data/Período",
      "Dia/Semana",
      "Vendas (Unidades)",
      "Faturamento (R$)",
      "Pedidos",
      "Ticket Médio (R$)",
      "Invest. Ads (R$)",
      "Vendas Ads (R$)",
      "ROAS",
      "ACOS (%)",
      "Produto Mais Vendido",
      "Observações",
    ];

    const rows = processedTableData.map((row) => [
      row.ref_date,
      row.dia_semana || row.label || "",
      row.unidades,
      row.vendas_totais.toFixed(2),
      row.pedidos,
      row.ticket_medio.toFixed(2),
      (row.invest_ads || 0).toFixed(2),
      (row.vendas_ads || 0).toFixed(2),
      ((row.vendas_ads || 0) / (row.invest_ads || 1)).toFixed(2),
      ((row.invest_ads || 0) / (row.vendas_ads || 1) * 100).toFixed(2),
      `"${(row.produto_mais_vendido || "").replace(/"/g, '""')}"`,
      `"${(row.observacoes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `performance_ml_${analysisMode}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel/CSV exportado com sucesso!");
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in p-1">
      {/* Print Friendly Style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Banner / Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-yellow-300 via-yellow-100 to-white p-6 rounded-2xl border border-yellow-200/60 shadow-sm no-print">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-slate-900 shadow-md">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              Mercado Livre
              <Badge className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 border-none font-bold text-[10px]">
                PAINEL BI
              </Badge>
            </h1>
            <p className="text-sm text-slate-600 font-medium">
              Acompanhamento integrado de conversão, vendas totais, ticket médio e insights do Mercado Livre.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isMaster && (
            <Button
              onClick={() => {
                setEditingEntry(null);
                setFormData({
                  ref_date: new Date().toISOString().split("T")[0],
                  meta_dia: "",
                  vendas_totais: "",
                  pedidos: "",
                  unidades: "",
                  visitas: "",
                  produto_mais_vendido: "",
                  observacoes: "",
                  invest_ads: "",
                  vendas_ads: "",
                });
                setIsAddModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="mr-2 h-4.5 w-4.5" /> Registrar Dia
            </Button>
          )}
        </div>
      </div>

      {/* Filter Options */}
      <Card className="glass border-white/60 shadow-sm no-print">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Filter className="h-4 w-4 text-blue-600" />
            Filtros Inteligentes de Análise
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 items-end">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">De</Label>
              <Input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Até</Label>
              <Input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Mês Específico</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Ano Específico</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os anos</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2027">2027</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-600">Tipo de Visualização</Label>
              <div className="flex bg-slate-100 rounded-lg p-0.5 border h-9">
                <button
                  type="button"
                  onClick={() => setAnalysisMode("daily")}
                  className={`flex-1 text-xs font-bold rounded-md transition-all ${
                    analysisMode === "daily"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Diário
                </button>
                <button
                  type="button"
                  onClick={() => setAnalysisMode("weekly")}
                  className={`flex-1 text-xs font-bold rounded-md transition-all ${
                    analysisMode === "weekly"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Semanal
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-9 flex-1 text-xs font-semibold border-slate-300"
                onClick={() => {
                  setDateStart("");
                  setDateEnd("");
                  setSelectedMonth("all");
                  setSelectedYear("all");
                  setSearchQuery("");
                }}
              >
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Print/Display Container */}
      <div id="print-section" className="space-y-6">
        
        {/* TOP CARDS ROW (PEDIDOS, TICKET MÉDIO, ROAS, INVEST. ADS) */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 no-print">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse border-slate-200">
                <CardContent className="h-28 pt-6 bg-slate-50/50" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCardNew
              label={`PEDIDOS (${analysisMode === "weekly" ? "SEMANA" : "PERÍODO"})`}
              value={String(metrics.totalOrders)}
              trend={`${metrics.ordersGrowth.toFixed(1)}% vs anterior`}
              isPositive={metrics.isOrdersPositive}
              icon={ShoppingCart}
              color="indigo"
            />
            <KpiCardNew
              label={`TICKET MÉDIO (${analysisMode === "weekly" ? "SEMANA" : "PERÍODO"})`}
              value={fmtBRL(metrics.avgTicket)}
              trend={`${metrics.ticketGrowth.toFixed(1)}% vs anterior`}
              isPositive={metrics.isTicketPositive}
              icon={Coins}
              color="indigo"
            />
            <KpiCardNew
              label={`ROAS (${analysisMode === "weekly" ? "SEMANA" : "PERÍODO"})`}
              value={metrics.roas.toFixed(2)}
              trend={`${metrics.roasGrowth.toFixed(1)}% vs anterior`}
              isPositive={metrics.isRoasPositive}
              icon={Activity}
              color="indigo"
              highlightAlert={metrics.roas < 5}
            />
            <KpiCardNew
              label={`INVEST. ADS (${analysisMode === "weekly" ? "SEMANA" : "PERÍODO"})`}
              value={fmtBRL(metrics.investAds)}
              trend={`${metrics.adsGrowth.toFixed(1)}% vs anterior`}
              isPositive={!metrics.isAdsPositive} // Typically down in ads investment could be colored green/red based on preference, keeping simple
              icon={Percent}
              color="indigo"
            />
          </div>
        )}

        {/* MIDDLE SECTION: "Total do Mês" Card */}
        {!isLoading && (
          <Card className="border border-slate-200 shadow-xs rounded-2xl overflow-hidden bg-white">
            <CardHeader className="pb-3 border-b flex flex-row flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-black text-slate-800">Total do Mês</CardTitle>
                <CardDescription className="text-[11px] font-semibold text-slate-500">
                  {monthlyTotals.semanasCount} semanas em {MONTHS.find((m) => m.value === currentMonthTotalSelect)?.label || "Junho"}
                </CardDescription>
              </div>
              <div className="no-print">
                <Select value={currentMonthTotalSelect} onValueChange={setCurrentMonthTotalSelect}>
                  <SelectTrigger className="h-8.5 w-36 text-xs font-bold border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.filter(m => m.value !== "all").map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs font-bold">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Box 1: VENDAS NO MÊS */}
              <div className="border rounded-xl p-3.5 bg-slate-50/40">
                <span className="text-[10px] font-bold text-slate-400 block tracking-wider">VENDAS NO MÊS</span>
                <span className="text-lg font-black text-slate-800 mt-1 block">{fmtBRL(monthlyTotals.revenue)}</span>
                <span className="text-[10px] font-bold text-slate-400 block mt-1">
                  {fmtBRL(monthlyTotals.vendasAds)} Ads - {fmtBRL(monthlyTotals.vendasOrg)} Orgânico
                </span>
              </div>
              {/* Box 2: PEDIDOS */}
              <div className="border rounded-xl p-3.5 bg-slate-50/40">
                <span className="text-[10px] font-bold text-slate-400 block tracking-wider">PEDIDOS</span>
                <span className="text-lg font-black text-slate-800 mt-1 block">{monthlyTotals.orders}</span>
                <span className="text-[10px] font-bold text-slate-400 block mt-1">
                  {monthlyTotals.unidades} unidades
                </span>
              </div>
              {/* Box 3: TICKET MÉDIO */}
              <div className="border rounded-xl p-3.5 bg-slate-50/40">
                <span className="text-[10px] font-bold text-slate-400 block tracking-wider">TICKET MÉDIO</span>
                <span className="text-lg font-black text-slate-800 mt-1 block">{fmtBRL(monthlyTotals.ticket)}</span>
                <span className="text-[10px] font-bold text-slate-400 block mt-1">Média geral do mês</span>
              </div>
              {/* Box 4: ROAS / ACOS */}
              <div className="border rounded-xl p-3.5 bg-slate-50/40">
                <span className="text-[10px] font-bold text-slate-400 block tracking-wider">ROAS / ACOS</span>
                <span className="text-lg font-black text-slate-800 mt-1 block">{monthlyTotals.roas.toFixed(2)}</span>
                <span className="text-[10px] font-bold text-slate-400 block mt-1">
                  ACOS {monthlyTotals.acos.toFixed(1)}% - Invest. {fmtBRL(monthlyTotals.investAds)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* BOTTOM SECTION: "Análise Inteligente" Alerts list */}
        {!isLoading && smartAlerts.length > 0 && (
          <Card className="border border-slate-200 shadow-xs rounded-2xl overflow-hidden bg-white">
            <CardHeader className="pb-2 border-b bg-slate-50/30">
              <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-blue-600" />
                Análise Inteligente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {smartAlerts.map((alert, index) => {
                let alertClass = "";
                let Icon = Info;

                if (alert.type === "success") {
                  alertClass = "bg-emerald-50 text-emerald-800 border-emerald-100";
                  Icon = TrendingUp;
                } else if (alert.type === "destructive") {
                  alertClass = "bg-red-50 text-red-800 border-red-100";
                  Icon = TrendingDown;
                } else {
                  alertClass = "bg-amber-50 text-amber-800 border-amber-100";
                  Icon = AlertTriangle;
                }

                return (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-full border text-xs font-bold ${alertClass}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{alert.text}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Tab Controls for Charts and Tables */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full no-print">
          <TabsList className="bg-slate-100 p-1 border">
            <TabsTrigger value="overview" className="text-xs font-bold">
              Gráficos & Performance
            </TabsTrigger>
            <TabsTrigger value="detailed" className="text-xs font-bold">
              Tabela Analítica & Exportação
            </TabsTrigger>
          </TabsList>

          {/* Gráficos Tab */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="h-80 animate-pulse bg-slate-50/50" />
                <Card className="h-80 animate-pulse bg-slate-50/50" />
              </div>
            ) : filteredDailyData.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                {/* Upper Charts */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Chart 1: Faturamento por Período */}
                  <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-slate-800">
                        1. Faturamento por Período (R$)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Valores {analysisMode === "daily" ? "diários" : "semanais"} totais atingidos no Mercado Livre
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-72 pt-4">
                      <ResponsiveContainer>
                        <BarChart data={displayData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis
                            dataKey="ref_date"
                            tickFormatter={(d) => {
                              if (analysisMode === "weekly") {
                                const found = displayData.find((w: any) => w.ref_date === d);
                                return found ? found.label.split(" ")[1] : d;
                              }
                              return d.slice(8);
                            }}
                            stroke="#64748b"
                            fontSize={10}
                          />
                          <YAxis tickFormatter={(v) => `R$ ${v}`} stroke="#64748b" fontSize={10} />
                          <Tooltip formatter={(v) => fmtBRL(Number(v))} labelFormatter={(lbl) => `Data/Período: ${lbl}`} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="vendas_totais" name="Faturamento Atingido" fill="#3483fa" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="meta_dia" name="Meta Período" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Chart 2: Quantidade de Pedidos */}
                  <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-slate-800">
                        2. Pedidos no Tempo
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Volume total de pedidos fechados
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-72 pt-4">
                      <ResponsiveContainer>
                        <LineChart data={displayData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis
                            dataKey="ref_date"
                            tickFormatter={(d) => {
                              if (analysisMode === "weekly") {
                                const found = displayData.find((w: any) => w.ref_date === d);
                                return found ? found.label.split(" ")[1] : d;
                              }
                              return d.slice(8);
                            }}
                            stroke="#64748b"
                            fontSize={10}
                          />
                          <YAxis stroke="#64748b" fontSize={10} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Line
                            type="monotone"
                            dataKey="pedidos"
                            name="Pedidos"
                            stroke="#ffad00"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Lower Charts */}
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Chart 3: Realizado vs Meta Comparativo */}
                  <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-slate-800">
                        3. Comparativo Meta vs Realizado
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Percentual de atingimento da meta diária
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-72 pt-4">
                      <ResponsiveContainer>
                        <BarChart data={filteredDailyData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="ref_date" tickFormatter={(d) => d.slice(8)} stroke="#64748b" fontSize={10} />
                          <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}%`} />
                          <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                          <Bar
                            dataKey={(row) => (row.meta_dia > 0 ? (row.vendas_totais / row.meta_dia) * 100 : 0)}
                            name="% Meta"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                          >
                            {filteredDailyData.map((entry, idx) => {
                              const pct = entry.meta_dia > 0 ? (entry.vendas_totais / entry.meta_dia) * 100 : 0;
                              return <Cell key={idx} fill={pct >= 100 ? "#10b981" : pct >= 80 ? "#f59e0b" : "#ef4444"} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Chart 4: Donut de Participação de Produtos */}
                  <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-slate-800">
                        4. Participação de Produtos (Donut)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Distribuição das unidades vendidas por produto
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-72 flex items-center justify-center pt-2">
                      {productShareData.length === 0 ? (
                        <span className="text-xs text-slate-400 font-semibold">Sem dados</span>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <div className="h-[75%] w-full">
                            <ResponsiveContainer>
                              <PieChart>
                                <Pie
                                  data={productShareData}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={45}
                                  outerRadius={70}
                                  paddingAngle={3}
                                >
                                  {productShareData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(v) => `${v} unid`} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex flex-wrap justify-center gap-2 max-h-[25%] overflow-y-auto w-full px-2">
                            {productShareData.slice(0, 4).map((d) => (
                              <span key={d.name} className="text-[9px] font-bold text-slate-600 flex items-center gap-1 truncate max-w-[120px]">
                                <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                                {d.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Chart 5: Evolução do Faturamento (Linha Acumulada) */}
                  <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-slate-800">
                        5. Evolução Acumulada
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Faturamento crescendo acumulativamente ao longo do período
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="h-72 pt-4">
                      <ResponsiveContainer>
                        <AreaChart data={cumulativeChartData}>
                          <defs>
                            <linearGradient id="gradientRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3483fa" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#3483fa" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis dataKey="ref_date" tickFormatter={(d) => d.slice(8)} stroke="#64748b" fontSize={10} />
                          <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v) => fmtBRL(Number(v))} />
                          <Area
                            type="monotone"
                            dataKey="faturamento_acumulado"
                            name="Faturamento Acumulado"
                            stroke="#3483fa"
                            strokeWidth={2.5}
                            fill="url(#gradientRev)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Tabela Tab */}
          <TabsContent value="detailed" className="space-y-6 mt-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b flex flex-row flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">Tabela de Performance</CardTitle>
                  <CardDescription className="text-xs">
                    Listagem consolidada das vendas e indicadores.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Pesquisar..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-9 h-9 w-48 text-xs border-slate-300"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcel}
                    className="h-9 font-bold text-xs"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPDF}
                    className="h-9 font-bold text-xs"
                  >
                    <FileText className="mr-1.5 h-3.5 w-3.5 text-blue-600" /> PDF / Imprimir
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                      <TableHead className="font-bold text-xs text-slate-700 h-10 text-center cursor-pointer" onClick={() => handleSort("ref_date")}>
                        <div className="flex items-center justify-center gap-1">
                          Data {sortField === "ref_date" && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 h-10 text-center">
                        Dia/Semana
                      </TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 h-10 text-center cursor-pointer" onClick={() => handleSort("unidades")}>
                        <div className="flex items-center justify-center gap-1">
                          Vendas (Unid) {sortField === "unidades" && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 h-10 text-center cursor-pointer" onClick={() => handleSort("vendas_totais")}>
                        <div className="flex items-center justify-center gap-1">
                          Faturamento {sortField === "vendas_totais" && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 h-10 text-center cursor-pointer" onClick={() => handleSort("pedidos")}>
                        <div className="flex items-center justify-center gap-1">
                          Pedidos {sortField === "pedidos" && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 h-10 text-center cursor-pointer" onClick={() => handleSort("ticket_medio")}>
                        <div className="flex items-center justify-center gap-1">
                          Ticket Médio {sortField === "ticket_medio" && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 h-10 text-center cursor-pointer" onClick={() => handleSort("invest_ads")}>
                        <div className="flex items-center justify-center gap-1">
                          Invest. Ads {sortField === "invest_ads" && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 h-10 text-center">
                        ROAS
                      </TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 h-10 text-center">
                        Prod. Mais Vendido do Dia
                      </TableHead>
                      <TableHead className="font-bold text-xs text-slate-700 h-10 text-center max-w-[150px] truncate">
                        Observações
                      </TableHead>
                      {isMaster && <TableHead className="font-bold text-xs text-slate-700 h-10 text-center">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <TableRow key={idx}>
                          <TableCell colSpan={isMaster ? 11 : 10} className="text-center py-6">
                            <span className="inline-block h-4 w-full bg-slate-100 rounded-sm animate-pulse" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isMaster ? 11 : 10} className="text-center py-8 text-slate-400 text-xs font-semibold">
                          Nenhum registro encontrado correspondente aos filtros/busca.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((row) => {
                        const calculatedRoas = row.invest_ads > 0 ? row.vendas_ads / row.invest_ads : 0;
                        return (
                          <TableRow key={row.id} className="hover:bg-slate-50/80 text-center font-medium border-b border-slate-100">
                            <TableCell className="text-xs font-bold text-slate-800">
                              {analysisMode === "weekly" ? row.ref_date : new Date(row.ref_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">
                              {analysisMode === "weekly" ? row.label : row.dia_semana}
                            </TableCell>
                            <TableCell className="text-xs font-bold text-slate-800">
                              {row.unidades}
                            </TableCell>
                            <TableCell className="text-xs font-black text-blue-700">
                              {fmtBRL(row.vendas_totais)}
                            </TableCell>
                            <TableCell className="text-xs font-bold text-slate-700">
                              {row.pedidos}
                            </TableCell>
                            <TableCell className="text-xs font-bold font-mono text-slate-600">
                              {fmtBRL(row.ticket_medio)}
                            </TableCell>
                            <TableCell className="text-xs font-bold font-mono text-slate-600">
                              {fmtBRL(row.invest_ads)}
                            </TableCell>
                            <TableCell className={`text-xs font-black font-mono ${calculatedRoas < 5 ? "text-rose-600" : "text-emerald-600"}`}>
                              {calculatedRoas.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-600 max-w-[150px] truncate" title={row.produto_mais_vendido}>
                              {row.produto_mais_vendido || "—"}
                            </TableCell>
                            <TableCell className="text-[11px] text-slate-500 text-left max-w-[150px] truncate" title={row.observacoes}>
                              {row.observacoes || "—"}
                            </TableCell>
                            {isMaster && (
                              <TableCell className="py-2">
                                <div className="flex justify-center items-center gap-1.5">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                    onClick={() => startEdit(row as MLPerformanceEntry)}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-rose-600 hover:bg-rose-50 rounded-lg"
                                    onClick={() => {
                                      if (confirm("Tem certeza que deseja excluir este registro?")) {
                                        deleteEntryMutation.mutate(row.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                {processedTableData.length > 0 && (
                  <div className="p-4 border-t flex items-center justify-between bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-500">
                      Mostrando {Math.min(processedTableData.length, (currentPage - 1) * pageSize + 1)} a{" "}
                      {Math.min(processedTableData.length, currentPage * pageSize)} de {processedTableData.length} registros
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs font-bold text-slate-800 px-3">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Register / Edit Dialog Modal */}
      {isAddModalOpen && (
        <Dialog open onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[480px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-bold text-slate-800 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-yellow-500" />
                {editingEntry ? "Editar Vendas do Dia" : "Registrar Vendas do Dia"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Insira os valores diários do Mercado Livre para consolidação nos gráficos e KPIs.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFormSubmit} className="space-y-3 py-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="ref_date" className="text-xs font-semibold text-slate-700">Data de Referência</Label>
                  <Input
                    id="ref_date"
                    type="date"
                    value={formData.ref_date}
                    onChange={(e) => setFormData({ ...formData, ref_date: e.target.value })}
                    required
                    className="h-9.5"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="meta_dia" className="text-xs font-semibold text-slate-700">Meta Dia (R$)</Label>
                  <Input
                    id="meta_dia"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 10000.00"
                    value={formData.meta_dia}
                    onChange={(e) => setFormData({ ...formData, meta_dia: e.target.value })}
                    required
                    className="h-9.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="vendas_totais" className="text-xs font-semibold text-slate-700">Atingido / Faturamento (R$)</Label>
                  <Input
                    id="vendas_totais"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 12200.00"
                    value={formData.vendas_totais}
                    onChange={(e) => setFormData({ ...formData, vendas_totais: e.target.value })}
                    required
                    className="h-9.5"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pedidos" className="text-xs font-semibold text-slate-700">Pedidos (Qtd)</Label>
                  <Input
                    id="pedidos"
                    type="number"
                    placeholder="Ex: 45"
                    value={formData.pedidos}
                    onChange={(e) => setFormData({ ...formData, pedidos: e.target.value })}
                    required
                    className="h-9.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="unidades" className="text-xs font-semibold text-slate-700">Unidades Vendidas (Qtd)</Label>
                  <Input
                    id="unidades"
                    type="number"
                    placeholder="Ex: 50"
                    value={formData.unidades}
                    onChange={(e) => setFormData({ ...formData, unidades: e.target.value })}
                    required
                    className="h-9.5"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="visitas" className="text-xs font-semibold text-slate-700">Visitas (Qtd)</Label>
                  <Input
                    id="visitas"
                    type="number"
                    placeholder="Ex: 1250"
                    value={formData.visitas}
                    onChange={(e) => setFormData({ ...formData, visitas: e.target.value })}
                    required
                    className="h-9.5"
                  />
                </div>
              </div>

              {/* ADS CAMPAIGN FIELDS */}
              <div className="grid grid-cols-2 gap-4 border-t pt-2.5">
                <div className="space-y-1">
                  <Label htmlFor="invest_ads" className="text-xs font-semibold text-slate-700">Investimento Ads (R$)</Label>
                  <Input
                    id="invest_ads"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 600.00"
                    value={formData.invest_ads}
                    onChange={(e) => setFormData({ ...formData, invest_ads: e.target.value })}
                    required
                    className="h-9.5"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="vendas_ads" className="text-xs font-semibold text-slate-700">Vendas Ads (R$)</Label>
                  <Input
                    id="vendas_ads"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 3500.00"
                    value={formData.vendas_ads}
                    onChange={(e) => setFormData({ ...formData, vendas_ads: e.target.value })}
                    required
                    className="h-9.5"
                  />
                </div>
              </div>

              {/* Real-time calculated previews */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 text-[10px] mt-1 font-bold">
                <div>
                  <span className="text-slate-400 block">Ticket Médio</span>
                  <span className="text-slate-700">
                    {Number(formData.pedidos) > 0
                      ? fmtBRL(Number(formData.vendas_totais || 0) / Number(formData.pedidos))
                      : "R$ 0,00"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Conversão</span>
                  <span className="text-slate-700">
                    {Number(formData.visitas) > 0
                      ? `${((Number(formData.pedidos || 0) / Number(formData.visitas)) * 100).toFixed(2)}%`
                      : "0.00%"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">ROAS Previsto</span>
                  <span className={Number(formData.invest_ads) > 0 && (Number(formData.vendas_ads || 0) / Number(formData.invest_ads)) < 5 ? "text-rose-600" : "text-emerald-600"}>
                    {Number(formData.invest_ads) > 0
                      ? (Number(formData.vendas_ads || 0) / Number(formData.invest_ads)).toFixed(2)
                      : "0.00"}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="produto_mais_vendido" className="text-xs font-semibold text-slate-700">
                  Produto Mais Vendido do Dia <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Input
                  id="produto_mais_vendido"
                  type="text"
                  placeholder="Ex: Organizador de Cabos Velcro"
                  value={formData.produto_mais_vendido}
                  onChange={(e) => setFormData({ ...formData, produto_mais_vendido: e.target.value })}
                  required
                  className="h-9.5"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="observacoes" className="text-xs font-semibold text-slate-700">Observações</Label>
                <textarea
                  id="observacoes"
                  rows={2}
                  placeholder="Ex: Desempenho afetado por feriado ou promoções."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full text-xs p-2 border rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Cancelar
                </Button>
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

// Custom New KPI Card matching the user's reference image style
function KpiCardNew({
  label,
  value,
  trend,
  isPositive,
  icon: Icon,
  color,
  highlightAlert = false,
}: {
  label: string;
  value: string;
  trend: string;
  isPositive: boolean;
  icon: any;
  color: "blue" | "emerald" | "indigo" | "rose" | "amber";
  highlightAlert?: boolean;
}) {
  return (
    <Card className={`border rounded-2xl shadow-xs transition-all hover:scale-[1.01] duration-300 bg-white ${highlightAlert ? "border-red-400 bg-red-50/5" : "border-slate-200"}`}>
      <CardContent className="p-4.5 flex flex-col justify-between h-full min-h-[105px]">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-slate-400 tracking-wider block uppercase">
              {label}
            </span>
            <div className="text-xl font-black text-slate-800 tracking-tight font-sans">
              {value}
            </div>
          </div>
          <div className="p-1.5 rounded-lg text-slate-400 bg-slate-50 border">
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center gap-1 mt-2 text-[9px] font-bold">
          {isPositive ? (
            <span className="text-emerald-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-0.5" /> {trend}
            </span>
          ) : (
            <span className="text-rose-600 flex items-center">
              <TrendingDown className="h-3 w-3 mr-0.5" /> {trend}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="h-60 flex items-center justify-center flex-col text-slate-400 border border-dashed rounded-xl">
      <ShoppingCart className="h-10 w-10 mb-2 opacity-30 animate-pulse text-blue-600" />
      <span className="text-xs font-bold text-slate-500">Nenhum dado disponível no período selecionado</span>
      <span className="text-[10px] text-slate-400 mt-1">Ajuste os filtros de datas acima para visualizar as análises.</span>
    </div>
  );
}
