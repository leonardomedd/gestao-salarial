import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  api,
  type Categories,
  type NewTransaction,
  type Transaction,
} from "@/lib/api";
import { parseBRL, todayISO } from "@/lib/format";

const EXPENSE_CATEGORIES = [
  "Moradia",
  "Alimentação",
  "Transporte",
  "Saúde",
  "Lazer",
  "Educação",
  "Contas",
  "Outros",
];
const INCOME_CATEGORIES = ["Freelance", "Bônus", "Investimentos", "Vendas", "Outros"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string; // mês visível na tela (para datas padrão)
  editing?: Transaction | null; // quando definido, o dialog edita este lançamento
  onSaved: () => void;
}

export function TransactionDialog({ open, onOpenChange, month, editing, onSaved }: Props) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amountText, setAmountText] = useState("");
  const [date, setDate] = useState(todayISO());
  const [recurring, setRecurring] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // categorias personalizadas
  const [custom, setCustom] = useState<Categories>({ expense: [], income: [] });
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");

  useEffect(() => {
    if (open) {
      if (editing) {
        // modo edição: pré-preenche com o lançamento existente
        setType(editing.type);
        setDescription(editing.description);
        setCategory(editing.category);
        setAmountText((editing.amount / 100).toFixed(2).replace(".", ","));
        setDate(editing.date);
        setRecurring(editing.recurring);
      } else {
        setType("expense");
        setDescription("");
        setCategory(EXPENSE_CATEGORIES[0]);
        setAmountText("");
        // data padrão: hoje se for o mês atual, senão dia 1 do mês selecionado
        const today = todayISO();
        setDate(today.startsWith(month) ? today : `${month}-01`);
        setRecurring(false);
      }
      setError("");
      setCreatingCategory(false);
      setNewCategoryName("");
      setCategoryError("");
      api.getCategories().then(setCustom).catch(() => {});
    }
  }, [open, month, editing]);

  const defaults = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  // garante que a categoria do item editado apareça mesmo se for custom antiga
  const categories = [
    ...defaults,
    ...custom[type],
    ...(category && !defaults.includes(category) && !custom[type].includes(category)
      ? [category]
      : []),
  ];

  function changeType(t: "income" | "expense") {
    setType(t);
    setCategory(t === "expense" ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
    setCreatingCategory(false);
    setCategoryError("");
  }

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return setCategoryError("Digite o nome da categoria.");
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase()))
      return setCategoryError("Essa categoria já existe.");
    setCategoryError("");
    try {
      const updated = await api.addCategory(type, name);
      setCustom(updated);
      setCategory(name);
      setCreatingCategory(false);
      setNewCategoryName("");
    } catch (e) {
      setCategoryError(e instanceof Error ? e.message : "Erro ao criar categoria.");
    }
  }

  async function save() {
    const amount = parseBRL(amountText);
    if (!description.trim()) return setError("Informe uma descrição.");
    if (amount === null) return setError("Valor inválido. Ex.: 150,00");
    if (!date) return setError("Informe a data.");
    setError("");
    setSaving(true);
    const tx: NewTransaction = {
      type,
      description: description.trim(),
      category,
      amount,
      date,
      recurring,
    };
    try {
      if (editing) {
        await api.updateTransaction(editing.id, tx);
      } else {
        await api.addTransaction(tx);
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar lançamento" : "Novo lançamento"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={type === "expense" ? "default" : "outline"}
            className={type === "expense" ? "bg-red-600 hover:bg-red-700" : ""}
            onClick={() => changeType("expense")}
          >
            Despesa
          </Button>
          <Button
            type="button"
            variant={type === "income" ? "default" : "outline"}
            className={type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            onClick={() => changeType("income")}
          >
            Receita extra
          </Button>
        </div>

        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="tx-desc">Descrição</Label>
            <Input
              id="tx-desc"
              placeholder={type === "expense" ? "Ex.: Supermercado" : "Ex.: Freela de design"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Valor (R$)</Label>
              <Input
                id="tx-amount"
                inputMode="decimal"
                placeholder="0,00"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Data</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Categoria</Label>
              {!creatingCategory && (
                <button
                  type="button"
                  onClick={() => setCreatingCategory(true)}
                  className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  <Plus className="h-3.5 w-3.5" /> Nova categoria
                </button>
              )}
            </div>

            {creatingCategory ? (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    placeholder="Nome da nova categoria"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
                    maxLength={40}
                  />
                  <Button type="button" size="sm" onClick={addCategory}>
                    Criar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCreatingCategory(false);
                      setCategoryError("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
                {categoryError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{categoryError}</p>
                )}
              </div>
            ) : (
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Repete todo mês</p>
              <p className="text-xs text-muted-foreground">
                Aparece automaticamente nos meses seguintes
              </p>
            </div>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>

          {editing?.recurring && (
            <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              Atenção: este lançamento se repete todo mês — a edição vale para
              todos os meses, passados e futuros.
            </p>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Salvando…" : editing ? "Salvar alterações" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
