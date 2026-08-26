import { useEffect, useState } from "react";
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
import { api } from "@/lib/api";
import { parseBRL } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSalary: number; // centavos
  onSaved: () => void;
}

export function SalaryDialog({ open, onOpenChange, currentSalary, onSaved }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setText(currentSalary > 0 ? (currentSalary / 100).toFixed(2).replace(".", ",") : "");
      setError("");
    }
  }, [open, currentSalary]);

  async function save() {
    const amount = text.trim() === "" ? 0 : parseBRL(text);
    if (amount === null) return setError("Valor inválido. Ex.: 5000,00");
    setSaving(true);
    try {
      await api.setSalary(amount);
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Salário mensal</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="salary">Valor líquido (R$)</Label>
          <Input
            id="salary"
            inputMode="decimal"
            placeholder="0,00"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <p className="text-xs text-muted-foreground">
            Receitas variáveis podem ser lançadas como “Receita extra”.
          </p>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
