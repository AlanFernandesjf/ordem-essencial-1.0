import { MainLayout } from "@/components/layout/MainLayout";
import { DollarSign, TrendingDown, CreditCard, PiggyBank, Calculator, Pencil, Plus, Trash2, Calendar as CalendarIcon, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { CrudModal, FormField } from "@/components/ui/crud-modal";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format, parseISO, getMonth, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthData {
  id?: string;
  month_index: number;
  mes: string;
  receitas: number;
  custos_fixos: number;
  custos_variaveis: number;
  dividas: number;
  investimentos: number;
}

interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: 'receita' | 'custo_fixo' | 'custo_variavel' | 'divida' | 'investimento';
  category?: string;
  date: string;
  created_at: string;
}

interface SummaryCard {
  id?: string;
  card_id: number;
  label: string;
  value: string;
  icon: keyof typeof iconMap;
  color: string;
}

const iconMap = {
  DollarSign,
  TrendingDown,
  CreditCard,
  PiggyBank,
};

const initialSummaryCards: SummaryCard[] = [
  { card_id: 1, label: "RECEITAS", value: "R$ 0,00", icon: "DollarSign", color: "notion-yellow" },
  { card_id: 2, label: "DESPESAS", value: "R$ 0,00", icon: "TrendingDown", color: "notion-red" },
  { card_id: 3, label: "DÍVIDAS", value: "R$ 0,00", icon: "CreditCard", color: "notion-blue" },
  { card_id: 4, label: "INVESTIMENTOS", value: "R$ 0,00", icon: "PiggyBank", color: "notion-purple" },
];

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const generateEmptyMonths = (): MonthData[] => {
  return monthNames.map((name, index) => ({
    month_index: index + 1,
    mes: name,
    receitas: 0,
    custos_fixos: 0,
    custos_variaveis: 0,
    dividas: 0,
    investimentos: 0
  }));
};

interface BudgetItem {
  id?: string;
  month_index: number;
  mes: string;
  valor: string;
}

const generateEmptyBudget = (): BudgetItem[] => {
  return monthNames.map((name, index) => ({
    month_index: index + 1,
    mes: name,
    valor: ""
  }));
};

const Financas = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [calcDisplay, setCalcDisplay] = useState("0");
  
  const [summaryCards, setSummaryCards] = useState<SummaryCard[]>(initialSummaryCards);
  const [balancoAnual, setBalancoAnual] = useState<MonthData[]>(generateEmptyMonths());
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(generateEmptyBudget());
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Modal states
  const [monthModal, setMonthModal] = useState(false);
  const [summaryModal, setSummaryModal] = useState(false);
  const [budgetModal, setBudgetModal] = useState(false);
  const [transactionModal, setTransactionModal] = useState(false);

  // Edit states
  const [editingMonth, setEditingMonth] = useState<MonthData | null>(null);
  const [editingSummary, setEditingSummary] = useState<SummaryCard | null>(null);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form states
  const [formReceitas, setFormReceitas] = useState("");
  const [formCustosFixos, setFormCustosFixos] = useState("");
  const [formCustosVariaveis, setFormCustosVariaveis] = useState("");
  const [formDividas, setFormDividas] = useState("");
  const [formInvestimentos, setFormInvestimentos] = useState("");
  
  const [formSummaryLabel, setFormSummaryLabel] = useState("");
  const [formSummaryValue, setFormSummaryValue] = useState("");
  const [formSummaryColor, setFormSummaryColor] = useState("");
  const [formBudgetValor, setFormBudgetValor] = useState("");

  // Transaction Form
  const [formTransDesc, setFormTransDesc] = useState("");
  const [formTransAmount, setFormTransAmount] = useState("");
  const [formTransType, setFormTransType] = useState("despesa"); // receita, custo_fixo, custo_variavel, divida, investimento
  const [formTransCategory, setFormTransCategory] = useState("");
  const [formTransDate, setFormTransDate] = useState(new Date().toISOString().split('T')[0]);

  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    updateSummaryCards();
  }, [transactions, selectedMonth]);

  const updateSummaryCards = () => {
    if (!transactions.length) {
      // If no transactions, reset to 0 or keep static if they are custom.
      // But user wants "always summing".
      // Let's reset values to 0 for the standard cards.
      setSummaryCards(prev => prev.map(card => {
        if (["RECEITAS", "DESPESAS", "DÍVIDAS", "INVESTIMENTOS"].includes(card.label.toUpperCase())) {
           return { ...card, value: formatCurrency(0) };
        }
        return card;
      }));
      return;
    }

    const currentMonthIndex = parseInt(selectedMonth);
    const currentYear = new Date().getFullYear();

    const monthTransactions = transactions.filter(t => {
      const d = parseISO(t.date);
      return getMonth(d) + 1 === currentMonthIndex && getYear(d) === currentYear;
    });

    const totalReceitas = monthTransactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + t.amount, 0);
    const totalDespesas = monthTransactions.filter(t => ['custo_fixo', 'custo_variavel'].includes(t.type)).reduce((sum, t) => sum + t.amount, 0);
    const totalDividas = monthTransactions.filter(t => t.type === 'divida').reduce((sum, t) => sum + t.amount, 0);
    const totalInvestimentos = monthTransactions.filter(t => t.type === 'investimento').reduce((sum, t) => sum + t.amount, 0);

    setSummaryCards(prev => prev.map(card => {
      const label = card.label.toUpperCase();
      if (label === "RECEITAS") return { ...card, value: formatCurrency(totalReceitas) };
      if (label === "DESPESAS") return { ...card, value: formatCurrency(totalDespesas) };
      if (label === "DÍVIDAS") return { ...card, value: formatCurrency(totalDividas) };
      if (label === "INVESTIMENTOS") return { ...card, value: formatCurrency(totalInvestimentos) };
      return card;
    }));
  };

  const initializeData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Summary Cards
      const { data: summaryData, error: summaryError } = await supabase
        .from('finance_summaries')
        .select('*')
        .eq('user_id', user.id);

      if (summaryError) throw summaryError;

      if (summaryData && summaryData.length > 0) {
        setSummaryCards(prev => prev.map(card => {
          const found = summaryData.find(d => d.card_id === card.card_id);
          // Only update from DB if it's NOT one of the standard calculated cards
          // OR if we decide custom labels are allowed but values are calculated.
          // User wants "sempre tem que ir somando", so values must be calculated.
          // We can allow custom labels/icons/colors, but value should be ignored if we calculate it.
          // But wait, updateSummaryCards will overwrite the value anyway.
          // So loading from DB is fine for persistence of labels/colors, but value will be fixed by the effect.
          if (found) {
            return { ...card, id: found.id, label: found.label || card.label, value: found.value || card.value };
          }
          return card;
        }));
      }

      // 2. Fetch Months Data
      const { data: monthsData, error: monthsError } = await supabase
        .from('finance_months')
        .select('*')
        .eq('user_id', user.id);

      if (monthsError) throw monthsError;

      if (monthsData && monthsData.length > 0) {
        setBalancoAnual(prev => prev.map(m => {
          const found = monthsData.find(d => d.month_index === m.month_index);
          if (found) {
            return {
              ...m,
              id: found.id,
              receitas: found.receitas,
              custos_fixos: found.custos_fixos,
              custos_variaveis: found.custos_variaveis,
              dividas: found.dividas,
              investimentos: found.investimentos || 0
            };
          }
          return m;
        }));
      }

      // 3. Fetch Budget Data
      const { data: budgetData, error: budgetError } = await supabase
        .from('finance_budgets')
        .select('*')
        .eq('user_id', user.id);

      if (budgetError) throw budgetError;

      if (budgetData && budgetData.length > 0) {
        setBudgetItems(prev => prev.map(b => {
          const found = budgetData.find(d => d.month_index === b.month_index);
          if (found) {
            return {
              ...b,
              id: found.id,
              valor: found.valor ? found.valor.toString() : ""
            };
          }
          return b;
        }));
      }

      // 4. Fetch Transactions
      const { data: transData, error: transError } = await supabase
        .from('finance_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (transError) {
         // If table doesn't exist, this might fail. We should handle it gracefully or let it throw.
         // Assuming migration is applied.
         console.error("Error fetching transactions", transError);
      } else {
        setTransactions(transData as any[]);
      }

    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCalcClick = (value: string) => {
    if (value === "C") {
      setCalcDisplay("0");
    } else if (value === "=") {
      try {
        // Safe calculation
        const sanitized = calcDisplay.replace(/[^0-9+\-*/.]/g, '');
        // eslint-disable-next-line no-new-func
        setCalcDisplay(new Function('return ' + sanitized)().toString());
      } catch {
        setCalcDisplay("Erro");
      }
    } else {
      setCalcDisplay(prev => prev === "0" ? value : prev + value);
    }
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const calculateBalanco = (m: MonthData) => {
    return m.receitas - m.custos_fixos - m.custos_variaveis - m.dividas - m.investimentos;
  };

  const totalReceitas = balancoAnual.reduce((sum, m) => sum + m.receitas, 0);
  const totalCustosFixos = balancoAnual.reduce((sum, m) => sum + m.custos_fixos, 0);
  const totalCustosVariaveis = balancoAnual.reduce((sum, m) => sum + m.custos_variaveis, 0);
  const totalDividas = balancoAnual.reduce((sum, m) => sum + m.dividas, 0);
  const totalInvestimentos = balancoAnual.reduce((sum, m) => sum + m.investimentos, 0);

  // Month CRUD
  const openMonthModal = (month: MonthData) => {
    setEditingMonth(month);
    setFormReceitas(month.receitas.toString());
    setFormCustosFixos(month.custos_fixos.toString());
    setFormCustosVariaveis(month.custos_variaveis.toString());
    setFormDividas(month.dividas.toString());
    setFormInvestimentos(month.investimentos.toString());
    setMonthModal(true);
  };

  const saveMonth = async () => {
    if (!editingMonth) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        user_id: user.id,
        month_index: editingMonth.month_index,
        receitas: parseFloat(formReceitas) || 0,
        custos_fixos: parseFloat(formCustosFixos) || 0,
        custos_variaveis: parseFloat(formCustosVariaveis) || 0,
        dividas: parseFloat(formDividas) || 0,
        investimentos: parseFloat(formInvestimentos) || 0,
      };

      const { data, error } = await supabase
        .from('finance_months')
        .upsert(updates, { onConflict: 'user_id, month_index' })
        .select()
        .single();

      if (error) throw error;

      setBalancoAnual(prev => prev.map(m =>
        m.month_index === editingMonth.month_index
          ? {
              ...m,
              id: data.id,
              receitas: updates.receitas,
              custos_fixos: updates.custos_fixos,
              custos_variaveis: updates.custos_variaveis,
              dividas: updates.dividas,
              investimentos: updates.investimentos
            }
          : m
      ));
      
      toast({ title: "Mês atualizado com sucesso!" });
      setMonthModal(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar mês",
        description: error.message
      });
    }
  };

  const recalculateMonth = async (monthIndex: number, currentTransactions: Transaction[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Filter transactions for this month (regardless of year, assuming single year context or matching current year logic)
      // Since finance_months is just 1-12, we aggregate all transactions for that month index.
      // Ideally we should filter by year too, but finance_months schema doesn't seem to have year.
      // Let's assume we only care about transactions in the current year if we want to be precise, 
      // OR we just aggregate everything with that month index if the app is year-agnostic (which is bad).
      // Given the "Annual Budget" context, it likely resets or is for "Current Year".
      // Let's filter transactions by current year and month index.
      
      const currentYear = new Date().getFullYear();
      
      const monthTransactions = currentTransactions.filter(t => {
        const d = parseISO(t.date);
        return getMonth(d) + 1 === monthIndex && getYear(d) === currentYear;
      });

      const receitas = monthTransactions.filter(t => t.type === 'receita').reduce((sum, t) => sum + t.amount, 0);
      const custos_fixos = monthTransactions.filter(t => t.type === 'custo_fixo').reduce((sum, t) => sum + t.amount, 0);
      const custos_variaveis = monthTransactions.filter(t => t.type === 'custo_variavel').reduce((sum, t) => sum + t.amount, 0);
      const dividas = monthTransactions.filter(t => t.type === 'divida').reduce((sum, t) => sum + t.amount, 0);
      const investimentos = monthTransactions.filter(t => t.type === 'investimento').reduce((sum, t) => sum + t.amount, 0);

      const updates = {
        user_id: user.id,
        month_index: monthIndex,
        receitas,
        custos_fixos,
        custos_variaveis,
        dividas,
        investimentos
      };

      const { data, error } = await supabase
        .from('finance_months')
        .upsert(updates, { onConflict: 'user_id, month_index' })
        .select()
        .single();

      if (error) throw error;

      setBalancoAnual(prev => prev.map(m =>
        m.month_index === monthIndex
          ? {
              ...m,
              id: data.id,
              receitas,
              custos_fixos,
              custos_variaveis,
              dividas,
              investimentos
            }
          : m
      ));

    } catch (error) {
      console.error("Error recalculating month:", error);
    }
  };

  // Transaction CRUD
  const openTransactionModal = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormTransDesc(transaction.description);
      setFormTransAmount(transaction.amount.toString());
      setFormTransType(transaction.type);
      setFormTransCategory(transaction.category || "");
      setFormTransDate(transaction.date);
    } else {
      setEditingTransaction(null);
      setFormTransDesc("");
      setFormTransAmount("");
      setFormTransType("despesa");
      setFormTransCategory("");
      setFormTransDate(new Date().toISOString().split('T')[0]);
    }
    setTransactionModal(true);
  };

  const saveTransaction = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const amount = parseFloat(formTransAmount.replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
      
      const transactionData = {
        user_id: user.id,
        description: formTransDesc,
        amount,
        type: formTransType,
        category: formTransCategory,
        date: formTransDate
      };

      let savedTransaction: Transaction;

      if (editingTransaction) {
        const { data, error } = await supabase
          .from('finance_transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id)
          .select()
          .single();

        if (error) throw error;
        savedTransaction = data as Transaction;
        
        setTransactions(prev => prev.map(t => t.id === savedTransaction.id ? savedTransaction : t));
      } else {
        const { data, error } = await supabase
          .from('finance_transactions')
          .insert(transactionData)
          .select()
          .single();

        if (error) throw error;
        savedTransaction = data as Transaction;
        
        setTransactions(prev => [savedTransaction, ...prev]);
      }

      // Update month aggregation
      const transDate = parseISO(savedTransaction.date);
      const monthIndex = getMonth(transDate) + 1;
      
      // Need updated list for recalculation. 
      // We can use the state setter callback to ensure we have latest, but recalculateMonth needs the array.
      // We'll reconstruct the array locally for the calculation.
      let updatedTransactions = [...transactions];
      if (editingTransaction) {
        updatedTransactions = updatedTransactions.map(t => t.id === savedTransaction.id ? savedTransaction : t);
      } else {
        updatedTransactions = [savedTransaction, ...updatedTransactions];
      }
      
      await recalculateMonth(monthIndex, updatedTransactions);
      
      // If date changed, we might need to recalculate the old month too?
      if (editingTransaction) {
        const oldDate = parseISO(editingTransaction.date);
        const oldMonthIndex = getMonth(oldDate) + 1;
        if (oldMonthIndex !== monthIndex) {
           await recalculateMonth(oldMonthIndex, updatedTransactions);
        }
      }

      toast({ title: "Transação salva com sucesso!" });
      setTransactionModal(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar transação",
        description: error.message
      });
    }
  };

  const deleteTransaction = async (transaction: Transaction) => {
    try {
      const { error } = await supabase
        .from('finance_transactions')
        .delete()
        .eq('id', transaction.id);

      if (error) throw error;

      const updatedTransactions = transactions.filter(t => t.id !== transaction.id);
      setTransactions(updatedTransactions);

      const transDate = parseISO(transaction.date);
      const monthIndex = getMonth(transDate) + 1;
      await recalculateMonth(monthIndex, updatedTransactions);

      toast({ title: "Transação excluída" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir transação",
        description: error.message
      });
    }
  };

  // Summary CRUD
  const openSummaryModal = (card: SummaryCard) => {
    setEditingSummary(card);
    setFormSummaryLabel(card.label);
    setFormSummaryValue(card.value);
    setSummaryModal(true);
  };

  const saveSummary = async () => {
    if (!editingSummary) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        user_id: user.id,
        card_id: editingSummary.card_id,
        label: formSummaryLabel,
        value: formSummaryValue,
        icon: editingSummary.icon,
        color: editingSummary.color
      };

      const { data, error } = await supabase
        .from('finance_summaries')
        .upsert(updates, { onConflict: 'user_id, card_id' })
        .select()
        .single();

      if (error) throw error;

      setSummaryCards(prev => prev.map(c =>
        c.card_id === editingSummary.card_id
          ? { ...c, id: data.id, label: updates.label, value: updates.value }
          : c
      ));

      toast({ title: "Card atualizado com sucesso!" });
      setSummaryModal(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar card",
        description: error.message
      });
    }
  };

  // Budget CRUD
  const openBudgetModal = (item: BudgetItem) => {
    setEditingBudget(item);
    setFormBudgetValor(item.valor);
    setBudgetModal(true);
  };

  const saveBudget = async () => {
    if (!editingBudget) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        user_id: user.id,
        month_index: editingBudget.month_index,
        valor: parseFloat(formBudgetValor.replace("R$", "").replace(".", "").replace(",", ".")) || 0 // Store as numeric in DB? Schema says numeric.
      };
      
      // But wait, the schema says finance_budgets.valor is numeric.
      // The state uses string for flexibility in UI, but DB is numeric.
      // Let's try to parse it. If user types "1000", it works. If "R$ 1.000,00", we need to parse.
      // Simplest is to just store what we can parse, or just store string in UI and convert.
      // Actually, for simplicity and consistency, let's just store the numeric value in DB.
      
      // Correction: updates.valor should be numeric.
      const numericVal = parseFloat(formBudgetValor.replace(/[^\d,-]/g, '').replace(',', '.')) || 0;

      const { data, error } = await supabase
        .from('finance_budgets')
        .upsert({
            user_id: user.id,
            month_index: editingBudget.month_index,
            valor: numericVal
        }, { onConflict: 'user_id, month_index' })
        .select()
        .single();

      if (error) throw error;

      setBudgetItems(prev => prev.map(b =>
        b.month_index === editingBudget.month_index
          ? { ...b, id: data.id, valor: formBudgetValor } // Keep the formatted string in UI state if preferred, or update from DB?
          // The UI expects a string. Let's keep the user input for now or format it.
          // Better: just keep what user typed in UI state? Or format it?
          // Let's update with the formatted currency of the numeric value to be clean.
          : b
      ));
      
      // Actually, if we want to preserve exactly what user typed (like "R$ 1.000,00"), we might want to store it as text in DB?
      // Schema: valor numeric default 0.
      // So we must store numeric.
      // In UI, we can format it back to currency string or just show the number.
      // Let's stick to storing numeric in DB and handling formatting in UI.
      
      // Refined logic:
      // UI state `valor` is string.
      // When saving, parse to number -> DB.
      // On success, update UI state with formatted number or keep user input?
      // Let's update with user input for continuity, but next reload will show formatted from DB.

      setBudgetItems(prev => prev.map(b =>
        b.month_index === editingBudget.month_index
          ? { ...b, id: data.id, valor: formBudgetValor }
          : b
      ));

      toast({ title: "Orçamento atualizado com sucesso!" });
      setBudgetModal(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar orçamento",
        description: error.message
      });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6 animate-slide-up flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Finanças ✅</h1>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="daily">Controle Diário</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="animate-in fade-in-50 duration-500">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {summaryCards.map((card) => {
              const Icon = iconMap[card.icon];
              return (
                <div
                  key={card.card_id}
                  className="notion-card p-4 cursor-pointer hover:shadow-soft transition-shadow group text-slate-900"
                  style={{
                    backgroundColor: card.color === "notion-yellow" ? "hsl(45 100% 80%)" :
                      card.color === "notion-red" ? "hsl(0 70% 75%)" :
                      card.color === "notion-blue" ? "hsl(210 80% 80%)" :
                      card.color === "notion-purple" ? "hsl(270 60% 80%)" :
                      card.color === "notion-green" ? "hsl(100 60% 75%)" :
                      card.color === "notion-orange" ? "hsl(25 90% 75%)" :
                      card.color === "notion-pink" ? "hsl(330 70% 80%)" :
                      card.color === "notion-gray" ? "hsl(0 0% 80%)" :
                      "hsl(270 60% 80%)"
                  }}
                  onClick={() => openSummaryModal(card)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-semibold">{card.label}</span>
                    <Pencil size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm">{card.value}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Annual Budget Table */}
            <div className="xl:col-span-2 notion-card">
              <div className="notion-card-header notion-header-pink">
                📊 ORÇAMENTO E BALANÇO ANUAL
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-notion-pink-bg">
                      <th className="p-2 text-left text-xs font-semibold border-b border-border">Mês</th>
                      <th className="p-2 text-right text-xs font-semibold border-b border-border">Receitas</th>
                      <th className="p-2 text-right text-xs font-semibold border-b border-border">Custos Fixos</th>
                      <th className="p-2 text-right text-xs font-semibold border-b border-border">Custos Var.</th>
                      <th className="p-2 text-right text-xs font-semibold border-b border-border">Dívidas</th>
                      <th className="p-2 text-right text-xs font-semibold border-b border-border">Invest.</th>
                      <th className="p-2 text-right text-xs font-semibold border-b border-border">Balanço</th>
                      <th className="p-2 text-center text-xs font-semibold border-b border-border w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {balancoAnual.map((row) => {
                      const balanco = calculateBalanco(row);
                      return (
                        <tr key={row.month_index} className="hover:bg-muted/30 group">
                          <td className="p-2 text-xs border-b border-border/50">{row.mes}</td>
                          <td className="p-2 text-xs text-right border-b border-border/50">{formatCurrency(row.receitas)}</td>
                          <td className="p-2 text-xs text-right border-b border-border/50">{formatCurrency(row.custos_fixos)}</td>
                          <td className="p-2 text-xs text-right border-b border-border/50">{formatCurrency(row.custos_variaveis)}</td>
                          <td className="p-2 text-xs text-right border-b border-border/50">{formatCurrency(row.dividas)}</td>
                          <td className="p-2 text-xs text-right border-b border-border/50">{formatCurrency(row.investimentos)}</td>
                          <td className={`p-2 text-xs text-right border-b border-border/50 font-medium ${balanco < 0 ? 'text-destructive' : balanco > 0 ? 'text-success' : ''}`}>
                            {balanco !== 0 ? (balanco > 0 ? '+' : '') + formatCurrency(balanco) : '—'}
                          </td>
                          <td className="p-2 border-b border-border/50">
                            <button
                              onClick={() => openMonthModal(row)}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-all"
                            >
                              <Pencil size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-muted/50 font-semibold">
                      <td className="p-2 text-xs">TOTAL</td>
                      <td className="p-2 text-xs text-right">{formatCurrency(totalReceitas)}</td>
                      <td className="p-2 text-xs text-right">{formatCurrency(totalCustosFixos)}</td>
                      <td className="p-2 text-xs text-right">{formatCurrency(totalCustosVariaveis)}</td>
                      <td className="p-2 text-xs text-right">{formatCurrency(totalDividas)}</td>
                      <td className="p-2 text-xs text-right">{formatCurrency(totalInvestimentos)}</td>
                      <td className="p-2 text-xs text-right"></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Monthly Budget */}
              <div className="notion-card">
                <div className="notion-card-header notion-header-blue">
                  📅 ORÇAMENTO MENSAL
                </div>
                <div className="p-4">
                  <div className="space-y-1">
                    {budgetItems.map((item) => (
                      <div
                        key={item.month_index}
                        className="flex items-center justify-between text-xs py-1 border-b border-border/30 hover:bg-muted/30 cursor-pointer group"
                        onClick={() => openBudgetModal(item)}
                      >
                        <span>{item.mes}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{item.valor || "—"}</span>
                          <Pencil size={10} className="opacity-0 group-hover:opacity-100" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Calculator */}
              <div className="notion-card">
                <div className="notion-card-header notion-header-green">
                  <Calculator className="w-4 h-4" />
                  Calculadora
                </div>
                <div className="p-4">
                  <div className="bg-muted rounded-lg p-3 mb-3 text-right">
                    <span className="text-xl font-mono">{calcDisplay}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "C", "0", "=", "+"].map((btn) => (
                      <button
                        key={btn}
                        onClick={() => handleCalcClick(btn)}
                        className="p-2 text-sm font-medium rounded bg-muted hover:bg-muted-foreground/20 transition-colors"
                      >
                        {btn}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Links */}
              <div className="notion-card">
                <div className="notion-card-header bg-muted">
                  🔗 Links Importantes
                </div>
                <div className="p-4 text-sm text-muted-foreground">
                  Adicione links úteis aqui...
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="daily" className="animate-in fade-in-50 duration-500 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((name, i) => (
                        <SelectItem key={i+1} value={(i+1).toString()}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
            <Button onClick={() => openTransactionModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Transação
            </Button>
          </div>

          <div className="notion-card">
            <div className="notion-card-header notion-header-blue flex justify-between items-center">
              <span>📄 Transações de {monthNames[parseInt(selectedMonth)-1]}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b border-border">
                    <th className="p-3 text-left">Data</th>
                    <th className="p-3 text-left">Descrição</th>
                    <th className="p-3 text-left">Tipo</th>
                    <th className="p-3 text-left">Categoria</th>
                    <th className="p-3 text-right">Valor</th>
                    <th className="p-3 w-20 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.filter(t => {
                      const d = parseISO(t.date);
                      return getMonth(d) + 1 === parseInt(selectedMonth);
                  }).map(t => (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 group text-sm transition-colors">
                        <td className="p-3 whitespace-nowrap text-muted-foreground text-xs">{format(parseISO(t.date), "dd/MM/yyyy")}</td>
                        <td className="p-3 font-medium">{t.description}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            t.type === 'receita' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            t.type === 'investimento' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                            t.type === 'divida' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {t.type === 'custo_fixo' ? 'Fixo' : t.type === 'custo_variavel' ? 'Variável' : t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">{t.category || "-"}</td>
                        <td className={`p-3 text-right font-medium ${
                          t.type === 'receita' ? 'text-success' : 'text-destructive'
                        }`}>
                          {t.type === 'receita' ? '+' : '-'} {formatCurrency(t.amount)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openTransactionModal(t)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => deleteTransaction(t)} className="p-1.5 hover:bg-muted rounded text-destructive hover:text-destructive/80 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                    </tr>
                  ))}
                  {transactions.filter(t => getMonth(parseISO(t.date)) + 1 === parseInt(selectedMonth)).length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <div className="p-3 bg-muted rounded-full">
                                <DollarSign className="w-6 h-6 text-muted-foreground" />
                              </div>
                              <p>Nenhuma transação encontrada neste mês.</p>
                            </div>
                        </td>
                      </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Month Modal */}
      <CrudModal
        open={monthModal}
        onOpenChange={setMonthModal}
        title={`Editar ${editingMonth?.mes || ""}`}
        onSave={saveMonth}
      >
        <FormField label="Receitas" value={formReceitas} onChange={setFormReceitas} type="number" placeholder="0" />
        <FormField label="Custos Fixos" value={formCustosFixos} onChange={setFormCustosFixos} type="number" placeholder="0" />
        <FormField label="Custos Var." value={formCustosVariaveis} onChange={setFormCustosVariaveis} type="number" placeholder="0" />
        <FormField label="Dívidas" value={formDividas} onChange={setFormDividas} type="number" placeholder="0" />
        <FormField label="Investimentos" value={formInvestimentos} onChange={setFormInvestimentos} type="number" placeholder="0" />
      </CrudModal>

      {/* Summary Modal */}
      <CrudModal
        open={summaryModal}
        onOpenChange={setSummaryModal}
        title="Editar Card"
        onSave={saveSummary}
      >
        <FormField label="Label" value={formSummaryLabel} onChange={setFormSummaryLabel} />
        <FormField label="Valor" value={formSummaryValue} onChange={setFormSummaryValue} />
      </CrudModal>

      {/* Budget Modal */}
      <CrudModal
        open={budgetModal}
        onOpenChange={setBudgetModal}
        title={`Editar ${editingBudget?.mes || ""}`}
        onSave={saveBudget}
      >
        <FormField label="Valor" value={formBudgetValor} onChange={setFormBudgetValor} placeholder="R$ 0,00" />
      </CrudModal>

      {/* Transaction Modal */}
      <CrudModal
        open={transactionModal}
        onOpenChange={setTransactionModal}
        title={editingTransaction ? "Editar Transação" : "Nova Transação"}
        onSave={saveTransaction}
      >
        <FormField label="Descrição" value={formTransDesc} onChange={setFormTransDesc} placeholder="Ex: Salário, Mercado..." />
        
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Valor</label>
          <Input 
            value={formTransAmount} 
            onChange={e => setFormTransAmount(e.target.value)} 
            placeholder="0,00" 
            className="h-8"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Data</label>
          <Input 
            type="date" 
            value={formTransDate} 
            onChange={e => setFormTransDate(e.target.value)} 

            className="h-8"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <Select value={formTransType} onValueChange={setFormTransType}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="custo_fixo">Custo Fixo</SelectItem>
              <SelectItem value="custo_variavel">Custo Variável</SelectItem>
              <SelectItem value="divida">Dívida</SelectItem>
              <SelectItem value="investimento">Investimento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <FormField label="Categoria (Opcional)" value={formTransCategory} onChange={setFormTransCategory} placeholder="Ex: Alimentação" />
      </CrudModal>
    </MainLayout>
  );
};

export default Financas;
