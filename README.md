# Gestão de Salário

App simples e responsivo para controlar salário, receitas extras e despesas.

- **Frontend:** React + TypeScript + Vite + Tailwind + shadcn/ui
- **Backend:** Python (apenas biblioteca padrão — sem `pip install`)
- **Banco:** SQLite local em `data/salario.db` — seus dados ficam no seu computador

## Como usar

### Modo completo (recomendado no dia a dia)

Depois de compilado o frontend, só é preciso Python:

```bash
python3 server.py
```

Abra http://127.0.0.1:8471 — o backend serve a API e o app junto.

### Modo desenvolvimento (frontend com hot-reload)

```bash
python3 server.py          # terminal 1: API em 127.0.0.1:8471
npm run dev                # terminal 2: frontend em 127.0.0.1:3000
```

### Recompilar o frontend após mudanças

```bash
npm install   # só na primeira vez
npm run build # gera dist/, servido pelo server.py
```

## Usar em outro computador

Copie a pasta inteira (incluindo `data/salario.db`, que tem seus dados).
No computador novo:

1. Instale Node.js 20+ e Python 3.10+
2. `npm install && npm run build` (só na primeira vez)
3. `python3 server.py`

## Segurança

- O servidor escuta **somente em 127.0.0.1** — ninguém na rede acessa seus dados.
- Nenhuma dependência Python externa, nenhum dado sai do computador.
- Queries SQL parametrizadas (sem injeção) e payloads limitados a 64 KB.
- Faça backup copiando o arquivo `data/salario.db`. Para exportar tudo em JSON: `curl http://127.0.0.1:8471/api/export`

## API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/month?m=AAAA-MM` | Salário + lançamentos do mês (inclui recorrentes) |
| POST | `/api/transaction` | Novo lançamento (valores em centavos) |
| PUT | `/api/transaction/{id}` | Atualizar lançamento |
| DELETE | `/api/transaction/{id}` | Excluir lançamento |
| POST | `/api/salary` | Definir salário mensal |
| GET | `/api/export` | Exportar tudo em JSON |

## App Android (APK)

O projeto inclui [Capacitor](https://capacitorjs.com) — o mesmo frontend vira um
app Android nativo. No celular **não é preciso Python**: os dados ficam no
armazenamento local do próprio app (`src/lib/local-api.ts`).

### Gerar o APK pelo GitHub (recomendado, sem instalar nada)

O workflow `.github/workflows/android-apk.yml` compila o APK automaticamente:

1. Faça push do código para o GitHub
2. Vá em **Actions → Build APK Android → Run workflow** (ou apenas faça push na `main`)
3. Ao terminar, baixe o artifact **gestao-salarial-apk**
4. Envie o `.apk` para o celular e instale (permita "instalar apps de fontes desconhecidas")

### Gerar localmente (precisa do Android Studio instalado)

```bash
npm run build
npx cap sync android
npx cap open android   # abre no Android Studio → Build > Build APK
```

### Observações

- O APK gerado em modo debug já funciona para uso pessoal. Para publicar na
  Play Store seria preciso assinar com uma keystore própria.
- Os dados do celular e do computador são **independentes** (não há sincronização
  entre dispositivos — tudo fica local em cada aparelho).

## Repositório público

O código pode ficar público sem problema: não há senhas, chaves ou tokens nele.
Seus dados financeiros ficam em `data/salario.db`, que está no `.gitignore` —
**nunca** será commitado. Confira com:

```bash
git check-ignore data/salario.db   # deve imprimir o caminho (ignorado)
```
