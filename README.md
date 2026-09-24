# OS Móveis

App web de ordens de serviço para marcenaria de móveis planejados de alto padrão.

- Login multi-empresa (cada empresa só vê os próprios dados)
- Projetos por cliente: contrato e detalhamentos (PDF, Word, Excel, foto) lidos automaticamente
- Ata da reunião ao vivo pelo microfone, organizada por ambiente e por móvel, ignorando conversas paralelas
- OS gerada automaticamente e editável, com busca no catálogo de MDF, fitas, ferragens e puxadores
- Preenchimento da OS por voz
- Bloqueio de OS repetida (número único e comparação de conteúdo)
- Importação de OSs antigas (PDF, Word, Excel, foto) para o layout novo

## Como funciona

- `server.js`: servidor Node 18+ sem dependências. Entrega a pasta `public` e a rota `/api/ia`.
- `public/`: o app (React + htm via CDN, Firebase Auth + Firestore).
- `firestore.rules`: regras do banco (isolamento entre empresas).

## Variáveis no Render

| Nome | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | chave da API da Anthropic (console.anthropic.com) |
| `FIREBASE_PROJECT_ID` | ID do projeto Firebase |
| `ANTHROPIC_MODEL` | opcional, padrão `claude-sonnet-5` |

## Firebase

1. Criar projeto, adicionar app Web e colar a configuração em `public/config.js`.
2. Authentication → Método de login → ativar **E-mail/senha**.
3. Firestore Database → criar banco → Regras → colar `firestore.rules` → Publicar.

O microfone (ata ao vivo e voz) funciona no Google Chrome e no Microsoft Edge.
