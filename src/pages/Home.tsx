import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, type MonthData, type Transaction } from "@/lib/api";
import {
  currentMonth,
  formatBRL,
  monthLabel,
  shiftMonth,
} from "@/lib/format";
import { TransactionDialog } from "@/components/TransactionDialog";
import { SalaryDialog } from "@/components/SalaryDialog";
import { ThemeToggle } from "@/components/ThemeToggle";

const CHART_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-rose-400",
  "bg-pink-500",
  "bg-purple-500",
  "bg-slate-400",
  "bg-stone-400",
];

export default function Home() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api.getMonth(month));
    } catch (e) {
      setError(
        e instanceof Error
          ? `Não foi possível falar com o backend: ${e.message}. O servidor Python está rodando? (python3 server.py)`
          : "Erro ao carregar."
      );
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const txs = data?.transactions ?? [];
    const income = txs
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expense = txs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const salary = data?.salary ?? 0;
    return { salary, income, expense, balance: salary + income - expense };
  }, [data]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of data?.transactions ?? []) {
      if (t.type !== "expense") continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  async function remove(tx: Transaction) {
    if (!window.confirm(`Excluir "${tx.description}" (${formatBRL(tx.amount)})?`))
      return;
    try {
      await api.deleteTransaction(tx.id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  function openEdit(tx: Transaction) {
    setEditing(tx);
    setTxDialogOpen(true);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:pt-10">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight sm:text-2xl">
                Gestão de Salário
              </h1>
              <p className="text-sm text-muted-foreground">
                Simples, local e só seu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Navegação de mês */}
            <div className="flex flex-1 items-center justify-between gap-2 rounded-xl border bg-white px-2 py-1.5 shadow-sm dark:bg-slate-900 sm:flex-none sm:justify-start">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMonth((m) => shiftMonth(m, -1))}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="min-w-36 text-center text-sm font-semibold">
                {monthLabel(month)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMonth((m) => shiftMonth(m, 1))}
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            {error}
            <Button
              variant="outline"
              size="sm"
              className="ml-3"
              onClick={load}
            >
              <RefreshCcw className="mr-1 h-4 w-4" /> Tentar de novo
            </Button>
          </div>
        )}

        {/* Cards de resumo */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                Salário
                <button
                  onClick={() => setSalaryDialogOpen(true)}
                  className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                  aria-label="Editar salário"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-lg font-bold sm:text-xl">
                {formatBRL(totals.salary)}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Receitas extras
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 sm:text-xl">
                {formatBRL(totals.income)}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ArrowDownCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                Despesas
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-lg font-bold text-red-600 dark:text-red-400 sm:text-xl">
                {formatBRL(totals.expense)}
              </p>
            </CardContent>
          </Card>

          <Card
            className={`shadow-sm ${
              totals.balance < 0
                ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/50"
                : "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/50"
            }`}
          >
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Saldo do mês
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p
                className={`text-lg font-bold sm:text-xl ${
                  totals.balance < 0
                    ? "text-red-700 dark:text-red-300"
                    : "text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {formatBRL(totals.balance)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          {/* Lista de lançamentos */}
          <Card className="shadow-sm lg:col-span-3">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Lançamentos</CardTitle>
              <Button size="sm" onClick={() => setTxDialogOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Novo
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Carregando…
                </p>
              ) : !data || data.transactions.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhum lançamento neste mês.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setTxDialogOpen(true)}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Adicionar o primeiro
                  </Button>
                </div>
              ) : (
                <ul className="divide-y">
                  {data.transactions.map((t) => (
                    <li
                      key={`${t.id}-${t.date}`}
                      className="flex items-center gap-3 py-3"
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          t.type === "income"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                        }`}
                      >
                        {t.type === "income" ? (
                          <ArrowUpCircle className="h-5 w-5" />
                        ) : (
                          <ArrowDownCircle className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {t.description}
                          {t.recurring && (
                            <Badge
                              variant="secondary"
                              className="ml-2 px-1.5 py-0 text-[10px]"
                            >
                              mensal
                            </Badge>
                          )}
                          {(t.installments ?? 1) > 1 && (
                            <Badge
                              variant="secondary"
                              className="ml-2 px-1.5 py-0 text-[10px]"
                            >
                              {t.installment_current ?? "?"}/{t.installments}
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.category} ·{" "}
                          {t.date.split("-").reverse().join("/")}
                        </p>
                      </div>
                      <p
                        className={`text-sm font-semibold ${
                          t.type === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {t.type === "income" ? "+" : "−"}
                        {formatBRL(t.amount)}
                      </p>
                      <button
                        onClick={() => openEdit(t)}
                        className="text-slate-300 transition-colors hover:text-emerald-600 dark:text-slate-600 dark:hover:text-emerald-400"
                        aria-label={`Editar ${t.description}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(t)}
                        className="text-slate-300 transition-colors hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400"
                        aria-label={`Excluir ${t.description}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Gastos por categoria */}
          <Card className="shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Gastos por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseByCategory.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Sem despesas neste mês.
                </p>
              ) : (
                <ul className="space-y-3">
                  {expenseByCategory.map(([cat, value], i) => {
                    const pct =
                      totals.expense > 0
                        ? Math.round((value / totals.expense) * 100)
                        : 0;
                    return (
                      <li key={cat}>
                        <div className="mb-1 flex items-baseline justify-between text-sm">
                          <span className="font-medium">{cat}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatBRL(value)} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full ${
                              CHART_COLORS[i % CHART_COLORS.length]
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Botão flutuante (mobile) */}
      <Button
        size="lg"
        className="fixed bottom-5 right-5 h-14 w-14 rounded-full shadow-lg sm:hidden"
        onClick={() => setTxDialogOpen(true)}
        aria-label="Novo lançamento"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <TransactionDialog
        open={txDialogOpen}
        onOpenChange={(open) => {
          setTxDialogOpen(open);
          if (!open) setEditing(null);
        }}
        month={month}
        editing={editing}
        onSaved={load}
      />
      <SalaryDialog
        open={salaryDialogOpen}
        onOpenChange={setSalaryDialogOpen}
        currentSalary={data?.salary ?? 0}
        onSaved={load}
      />
    </div>
  );
}
