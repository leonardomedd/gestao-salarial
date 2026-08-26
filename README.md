# Gestão de Salário

App simples e responsivo para controlar salário, receitas extras e despesas.

- **Frontend:** React + TypeScript + Vite + Tailwind + shadcn/ui (com dark mode)
- **Backend:** Python (apenas biblioteca padrão — sem `pip install`)
- **Banco:** SQLite local em `data/salario.db` — seus dados ficam no seu computador
- **Android:** Capacitor (mesmo frontend vira APK nativo; dados no armazenamento local do app)

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

### Gerar localmente (ambiente já configurado neste Mac)

O ambiente Android já está instalado nesta máquina:

| Componente | Local |
|---|---|
| Android Studio | `/Applications/Android Studio.app` (via Homebrew) |
| Android SDK 36 + build-tools + platform-tools | `~/Library/Android/sdk` |
| JDK 21 (Temurin, sem sudo) | `~/Library/Java/jdk-21` |

Para compilar o APK **sem abrir o Android Studio**:

```bash
npm run build && npx cap sync android
cd android && JAVA_HOME="$HOME/Library/Java/jdk-21/Contents/Home" ./gradlew assembleDebug
```

O APK sai em `android/app/build/outputs/apk/debug/app-debug.apk`.

⚠️ **Use sempre o JDK 21** (`~/Library/Java/jdk-21`). O Java 25 embutido no
Android Studio (JBR) é novo demais para o Gradle 8.14 e falha com
`Unsupported class file major version 69`.

Se preferir a interface gráfica: `npx cap open android` → *Build > Build APK*.

### Gerar o APK pelo GitHub Actions

O workflow `.github/workflows/android-apk.yml` compila o APK na nuvem a cada
push na `main` (ou manualmente em **Actions → Build APK Android → Run workflow**);
o APK fica disponível como artifact **gestao-salarial-apk** por 30 dias.

⚠️ Em 26/08/2026 o workflow não rodou porque a conta GitHub estava bloqueada
por pendência de cobrança (*"account is locked due to a billing issue"*).
Se acontecer de novo, regularize em
[github.com/settings/billing](https://github.com/settings/billing) e use
**Re-run** na aba Actions. A compilação local acima não depende disso.

### Observações

- **Instalação no celular:** envie o `.apk` para o Android (cabo, Drive, WhatsApp,
  e-mail) e toque nele — autorize "instalar apps de fontes desconhecidas" quando pedido.
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
