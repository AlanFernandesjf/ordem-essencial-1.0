import { Wallet, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { Link } from "react-router-dom";

export function FinanceCard() {
  const balance = 2450.0;
  const income = 4500.0;
  const expenses = 2050.0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <DashboardCard
      title="Resumo Financeiro"
      icon={<Wallet size={18} />}
      action={
        <Link
          to="/financas"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Ver mais <ArrowRight size={12} />
        </Link>
      }
    >
      {/* Balance */}
      <div className="text-center p-4 bg-primary-light rounded-xl mb-4">
        <p className="text-xs text-muted-foreground mb-1">Saldo do mês</p>
        <p className="text-2xl font-bold text-primary">{formatCurrency(balance)}</p>
      </div>

      {/* Income and Expenses */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-success-light rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-success" />
            <span className="text-xs text-muted-foreground">Receitas</span>
          </div>
          <p className="font-semibold text-success">{formatCurrency(income)}</p>
        </div>
        <div className="p-3 bg-destructive/10 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} className="text-destructive" />
            <span className="text-xs text-muted-foreground">Despesas</span>
          </div>
          <p className="font-semibold text-destructive">{formatCurrency(expenses)}</p>
        </div>
      </div>
    </DashboardCard>
  );
}
