// Cliente da API local do Gestão de Salário.
// Em dev (Vite), chama o backend Python em 127.0.0.1:8471.
// Em produção (frontend servido pelo próprio Python), usa a mesma origem.

const API_BASE = import.meta.env.DEV ? "http://127.0.0.1:8471" : "";

export interface Transaction {
  id: number;
  type: "income" | "expense";
  description: string;
  category: string;
  amount: number; // centavos
  date: string; // YYYY-MM-DD
  recurring: boolean;
}

export interface MonthData {
  month: string;
  salary: number; // centavos
  transactions: Transaction[];
}

export interface NewTransaction {
  type: "income" | "expense";
  description: string;
  category: string;
  amount: number; // centavos
  date: string;
  recurring: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Erro ${res.status}`);
  return body as T;
}

const httpApi = {
  getMonth: (month: string) => request<MonthData>(`/api/month?m=${month}`),
  addTransaction: (tx: NewTransaction) =>
    request<{ id: number }>("/api/transaction", {
      method: "POST",
      body: JSON.stringify(tx),
    }),
  deleteTransaction: (id: number) =>
    request<{ ok: boolean }>(`/api/transaction/${id}`, { method: "DELETE" }),
  setSalary: (amount: number) =>
    request<{ salary: number }>("/api/salary", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
};

// No app Android (Capacitor) não há servidor Python: usa armazenamento local.
// No navegador (PC), fala com o backend Python normalmente.
import { Capacitor } from "@capacitor/core";
import { localApi } from "./local-api";

export const api = Capacitor.isNativePlatform() ? localApi : httpApi;
