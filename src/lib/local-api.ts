// Implementação local da API para o app Android (Capacitor).
// No celular não há servidor Python — os dados ficam no armazenamento
// local do próprio app (localStorage do WebView), seguindo a mesma
// lógica do backend em server.py.

import type {
  Categories,
  CategoryType,
  MonthData,
  NewTransaction,
  Transaction,
} from "./api";

const TX_KEY = "salario:transactions";
const SALARY_KEY = "salario:salary";
const CATEGORIES_KEY = "salario:categories";

interface StoredTx extends Omit<Transaction, "recurring"> {
  recurring: boolean;
}

function monthIdx(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + m;
}

function readTxs(): StoredTx[] {
  try {
    return JSON.parse(localStorage.getItem(TX_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeTxs(txs: StoredTx[]) {
  localStorage.setItem(TX_KEY, JSON.stringify(txs));
}

export const localApi = {
  async getMonth(month: string): Promise<MonthData> {
    const txs = readTxs()
      .filter((t) => {
        const start = t.date.slice(0, 7);
        if (monthIdx(start) > monthIdx(month)) return false;
        if (t.recurring) return true;
        const n = t.installments ?? 1;
        if (n > 1) return monthIdx(month) < monthIdx(start) + n;
        return start === month;
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))
      .map((t) => {
        const n = t.installments ?? 1;
        return n > 1
          ? { ...t, installment_current: monthIdx(month) - monthIdx(t.date.slice(0, 7)) + 1 }
          : t;
      });
    const salary = Number(localStorage.getItem(SALARY_KEY) || "0");
    return { month, salary, transactions: txs };
  },

  async addTransaction(tx: NewTransaction): Promise<{ id: number }> {
    const txs = readTxs();
    const id = txs.reduce((max, t) => Math.max(max, t.id), 0) + 1;
    const installments = tx.installments ?? 1;
    // parcelado não pode ser recorrente ao mesmo tempo
    const recurring = installments > 1 ? false : tx.recurring;
    txs.push({ ...tx, id, installments, recurring });
    writeTxs(txs);
    return { id };
  },

  async deleteTransaction(id: number): Promise<{ ok: boolean }> {
    writeTxs(readTxs().filter((t) => t.id !== id));
    return { ok: true };
  },

  async updateTransaction(
    id: number,
    patch: Partial<NewTransaction>
  ): Promise<{ ok: boolean }> {
    const txs = readTxs();
    const i = txs.findIndex((t) => t.id === id);
    if (i === -1) throw new Error("lançamento não encontrado");
    txs[i] = { ...txs[i], ...patch, id };
    writeTxs(txs);
    return { ok: true };
  },

  async setSalary(amount: number): Promise<{ salary: number }> {
    localStorage.setItem(SALARY_KEY, String(amount));
    return { salary: amount };
  },

  async getCategories(): Promise<Categories> {
    try {
      const data = JSON.parse(localStorage.getItem(CATEGORIES_KEY) || "{}");
      return {
        expense: Array.isArray(data.expense) ? data.expense : [],
        income: Array.isArray(data.income) ? data.income : [],
      };
    } catch {
      return { expense: [], income: [] };
    }
  },

  async addCategory(type: CategoryType, name: string): Promise<Categories> {
    const cats = await this.getCategories();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 40) throw new Error("Nome inválido");
    if (cats[type].some((c) => c.toLowerCase() === trimmed.toLowerCase()))
      throw new Error("categoria já existe");
    if (cats[type].length >= 50)
      throw new Error("limite de 50 categorias personalizadas");
    cats[type].push(trimmed);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
    return cats;
  },
};
