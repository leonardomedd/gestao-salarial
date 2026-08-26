// Implementação local da API para o app Android (Capacitor).
// No celular não há servidor Python — os dados ficam no armazenamento
// local do próprio app (localStorage do WebView), seguindo a mesma
// lógica do backend em server.py.

import type { MonthData, NewTransaction, Transaction } from "./api";

const TX_KEY = "salario:transactions";
const SALARY_KEY = "salario:salary";

interface StoredTx extends Omit<Transaction, "recurring"> {
  recurring: boolean;
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
      .filter(
        (t) =>
          (t.recurring && t.date.slice(0, 7) <= month) ||
          (!t.recurring && t.date.slice(0, 7) === month)
      )
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
    const salary = Number(localStorage.getItem(SALARY_KEY) || "0");
    return { month, salary, transactions: txs };
  },

  async addTransaction(tx: NewTransaction): Promise<{ id: number }> {
    const txs = readTxs();
    const id = txs.reduce((max, t) => Math.max(max, t.id), 0) + 1;
    txs.push({ ...tx, id });
    writeTxs(txs);
    return { id };
  },

  async deleteTransaction(id: number): Promise<{ ok: boolean }> {
    writeTxs(readTxs().filter((t) => t.id !== id));
    return { ok: true };
  },

  async setSalary(amount: number): Promise<{ salary: number }> {
    localStorage.setItem(SALARY_KEY, String(amount));
    return { salary: amount };
  },
};
