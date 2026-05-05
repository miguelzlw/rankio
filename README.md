# Rankio

Calculadora de pontuação para torneios multi-esportes. Single-user, sem autenticação.

- **Frontend**: React + Vite + Tailwind
- **Banco**: Firebase Firestore (em tempo real)
- **Hospedagem**: Vercel

## Como rodar localmente

### 1. Crie o projeto Firebase (só para o banco)

1. Acesse [console.firebase.google.com](https://console.firebase.google.com) e crie um projeto.
2. No menu lateral, abra **Build > Firestore Database** e clique em **Criar banco de dados**. Escolha o modo **produção** (vamos ajustar as regras a seguir).
3. Em **Configurações do projeto > Geral > Seus apps**, clique no ícone `</>` para adicionar um app web. Copie os valores do `firebaseConfig`.

### 2. Configure as regras do Firestore

Na aba **Regras** do Firestore, cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> **Aviso**: como o app não tem autenticação e os dados não são sensíveis (times, pontuações), as regras estão abertas. Para evitar abuso da API key, ative **App Check** com reCAPTCHA v3 no console do Firebase.

### 3. Configure as variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com os valores do `firebaseConfig` que você copiou:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Instale e rode

```bash
npm install
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173).

## Deploy na Vercel

1. Faça push do projeto pra um repositório GitHub.
2. Em [vercel.com](https://vercel.com), clique em **Add New > Project** e importe o repositório.
3. A Vercel detecta automaticamente o Vite (build = `npm run build`, output = `dist`).
4. Em **Environment Variables**, adicione as mesmas variáveis `VITE_FIREBASE_*` do `.env.local`.
5. Clique em **Deploy**.

O `vercel.json` na raiz já configura o rewrite pra que rotas internas (`/ranking`, `/esportes/...`) funcionem com SPA.

## Estrutura

```
src/
├── components/
│   ├── common/        # Button, Modal, Badge, BottomNav, ColorPicker, ConfirmDialog, TimeChip
│   ├── ranking/
│   ├── esportes/
│   ├── configuracao/  # TimesManager, EsporteWizard, EsportesManager, JogosManager, BackupSection
│   └── chaveamento/   # BracketMataMata, GrupoTable, RodadasColetivo
├── hooks/
│   ├── useFirestoreCollection.js   # listener genérico do Firestore
│   ├── useDados.js                 # useTimes, useEsportes, useJogos, useRanking
│   └── useCronometro.js            # progressivo, em memória
├── services/
│   ├── firebase.js     # initializeApp + getFirestore (lê env vars)
│   ├── firestore.js    # CRUD wrappers e operações em batch
│   ├── scoring.js      # cálculos puros de placar/ranking/classificação
│   ├── brackets.js     # geradores de chaveamento puros
│   └── backup.js       # export/import JSON e reset total
└── pages/
    ├── Ranking.jsx
    ├── Esportes.jsx, EsporteDetalhe.jsx, JogoDetalhe.jsx
    ├── Configuracao.jsx
    └── Chaveamento.jsx
```

## Modelo de dados (Firestore)

### `times`
```
{ id, nome, cor, criadoEm }
```

### `esportes`
```
{
  id, nome,
  tipo: '1v1' | 'coletivo',
  formato: 'mata-mata' | 'grupos-mata-mata' | null,
  config: { numGrupos?, timesQueAvancam?, numRodadas?, grupos? },
  regras: [{ id, nome, pontosACausa, pontosBSofre }],
  timesParticipantes: [timeId],
  criadoEm
}
```

### `jogos`
```
{
  id, esporteId, timeAId, timeBId,
  status: 'agendado' | 'ao_vivo' | 'finalizado',
  fase: 'grupos' | 'mata-mata' | 'rodada-N',
  grupoId?, ordem,
  eventos: [{ id, regraId, regraNome, timeAfetado: 'A'|'B', timestamp, timestampCronometro }],
  pontosTimeA, pontosTimeB, vencedor,
  proximoJogoId, slot,
  criadoEm, finalizadoEm
}
```

## Regras de negócio

- Pontuação só vai pro ranking depois que um jogo é **finalizado**.
- Jogo finalizado é **imutável**.
- Cronômetro é só client-side (não persiste).
- Avanço no mata-mata é **automático** ao finalizar.
- Empate em mata-mata 1v1: botão "Finalizar" fica desabilitado até desempate.
- Coletivo com nº ímpar de times: um time aleatório joga 2x na rodada.
- Critério de desempate em grupos: **pontos → saldo → confronto direto → ordem de cadastro**.
- Reset total exige confirmação tripla.
