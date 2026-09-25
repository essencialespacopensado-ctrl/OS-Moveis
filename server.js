// Servidor do Gestão Pró (sem dependências externas: só Node 18+).
// 1) Entrega o site (pasta public).
// 2) Rota /api/ia: conversa com a IA da Anthropic usando a chave guardada no Render
//    (variável ANTHROPIC_API_KEY). A chave nunca vai para o navegador.
//    Só aceita pedidos de quem está logado no app (confere o token do Firebase).
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');

const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const IA_LIGADA = !!(API_KEY || GEMINI_KEY);

// Chama a IA disponível: Claude (se tiver ANTHROPIC_API_KEY) ou Gemini gratuito (GEMINI_API_KEY).
// messages: [{role:'user'|'assistant', content: string | [{type:'text'|'image',...}]}]
async function chamarModelo({ system, messages, maxTokens }) {
  if (API_KEY) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, ...(system ? { system } : {}), messages }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body?.error?.message || ('erro ' + r.status));
    return { texto: (body.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n'), cortado: body.stop_reason === 'max_tokens' };
  }
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: (typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content).map(c =>
      c.type === 'image' ? { inline_data: { mime_type: c.source.media_type, data: c.source.data } } : { text: c.text }),
  }));
  const pedir = async (modelo) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
    body: JSON.stringify({ contents, ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), generationConfig: { maxOutputTokens: Math.max(maxTokens, 8192) } }),
  });
  // Se um modelo estiver sobrecarregado ou não existir, tenta o próximo (todos gratuitos).
  const modelos = [...new Set([GEMINI_MODEL, 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest'])];
  let r;
  // Até 2 rodadas por todos os modelos, esperando mais a cada tentativa (1s, 2s, 4s… com variação).
  let espera = 1000;
  fora: for (let rodada = 0; rodada < 2; rodada++) {
    for (const modelo of modelos) {
      r = await pedir(modelo);
      if (![404, 429, 500, 503].includes(r.status)) break fora;
      if (r.status !== 404) { await new Promise(ok => setTimeout(ok, espera + Math.random() * 400)); espera = Math.min(espera * 2, 8000); }
    }
  }
  const body = await r.json().catch(() => ({}));
  if (r.status === 503) throw new Error('os servidores gratuitos do Google estão cheios agora. Tente de novo em 1 minuto.');
  if (r.status === 429) throw new Error('limite gratuito do Gemini atingido por agora. Espere um minuto e tente de novo.');
  if (!r.ok) throw new Error(body?.error?.message || ('erro ' + r.status));
  const cand = (body.candidates || [])[0] || {};
  return { texto: (cand.content?.parts || []).map(p => p.text || '').join('\n'), cortado: cand.finishReason === 'MAX_TOKENS' };
}
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || '';

// ---------- Login: confere o token do Firebase (assinatura RS256 do Google) ----------
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let jwksCache = { keys: {}, expira: 0 };
async function chavesGoogle() {
  if (Date.now() < jwksCache.expira) return jwksCache.keys;
  const r = await fetch(JWKS_URL);
  const j = await r.json();
  const maxAge = Number((/max-age=(\d+)/.exec(r.headers.get('cache-control') || '') || [])[1] || 3600);
  const keys = {};
  for (const k of j.keys || []) keys[k.kid] = crypto.createPublicKey({ key: k, format: 'jwk' });
  jwksCache = { keys, expira: Date.now() + maxAge * 1000 };
  return keys;
}
const b64 = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
async function verificarToken(token) {
  const [h, p, sig] = String(token).split('.');
  if (!h || !p || !sig) throw new Error('token');
  const header = JSON.parse(b64(h).toString());
  const payload = JSON.parse(b64(p).toString());
  if (header.alg !== 'RS256') throw new Error('alg');
  let keys = await chavesGoogle();
  if (!keys[header.kid]) { jwksCache.expira = 0; keys = await chavesGoogle(); }
  const key = keys[header.kid];
  if (!key) throw new Error('kid');
  const ok = crypto.verify('RSA-SHA256', Buffer.from(h + '.' + p), key, b64(sig));
  if (!ok) throw new Error('assinatura');
  const agora = Math.floor(Date.now() / 1000);
  if (payload.exp < agora - 30 || payload.iat > agora + 300) throw new Error('expirado');
  if (payload.aud !== FIREBASE_PROJECT_ID || payload.iss !== 'https://securetoken.google.com/' + FIREBASE_PROJECT_ID) throw new Error('projeto');
  if (!payload.sub) throw new Error('sub');
  return payload.sub;
}
async function checkUser(req) {
  if (!FIREBASE_PROJECT_ID) return { ok: false, msg: 'Servidor sem FIREBASE_PROJECT_ID configurado.' };
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return { ok: false, msg: 'Faça login de novo.' };
  try { return { ok: true, uid: await verificarToken(token) }; }
  catch { return { ok: false, msg: 'Sessão expirada. Faça login de novo.' }; }
}

// Limite simples por usuário, pra ninguém gastar a chave sem querer num loop.
const hits = new Map();
function rateOk(uid) {
  const now = Date.now();
  const list = (hits.get(uid) || []).filter(t => now - t < 60_000);
  if (list.length >= 20) return false;
  list.push(now);
  hits.set(uid, list);
  return true;
}

// ---------- Modelos de dados que a IA devolve ----------
const OS_SCHEMA = `{
  "cliente": {"nome": "", "telefone": "", "endereco": "", "obra": ""},
  "prazoEntrega": "dd/mm/aaaa",
  "observacoesGerais": "",
  "responsavel": "", "arquiteto": "", "ambienteResumo": "Cozinha, Suíte",
  "tamponamento": {"tipo": "aparente | nao_aparente | sem", "espessura": "Simples 18 | Duplo 18+18 (padrão nobre) | ..."},
  "padrao": {
    "acab": {
      "interno": {"tipo": "mdf|formica|lamina|madeira|laca", "fabricante": "", "desc": "cor/padrão", "esp": "15", "acabamento": "", "laca": {"marca": "", "brilho": ""}},
      "externo": {"tipo": "mdf", "fabricante": "", "desc": "", "esp": "18", "acabamento": "", "laca": {"marca": "", "brilho": ""}}
    },
    "outras": "",
    "portas": {"modelo": "", "obs": ""},
    "laminas": [""], "perfis": [""], "puxadores": [""],
    "led": {"ativo": false, "fita": "", "temp": "", "perfil": "", "fonte": "", "locais": ""},
    "ferragens": {
      "dobradicas": {"modelo": "", "marca": "", "calco": "", "obs": ""},
      "corredicas": {"modelo": "", "marca": "", "tamanho": "", "obs": ""},
      "correr": {"modelo": "", "marca": "", "perfil": "", "obs": ""},
      "passagem": {"modelo": "", "marca": "", "perfil": "", "obs": ""}
    },
    "fech": {"ativo": false, "onde": "interna|externa|ambas", "modelo": "", "marca": "", "acab": "", "qtd": "", "obs": ""},
    "vidros": {"ativo": false, "tipo": "", "esp": "", "proc": [], "perfil": "", "aplic": "", "obs": ""},
    "tec": {"ativo": false, "tipo": "", "ref": "", "resp": "marcenaria|cliente|tapecaria|arquiteto", "aplic": "", "espuma": "", "obs": ""},
    "parede": {"ativo": false, "espec": "", "paginacao": "", "fixacao": ""}
  },
  "ambientes": [
    {
      "nome": "Cozinha",
      "moveis": [
        {
          "nome": "Balcão da pia",
          "quantidade": 1,
          "largura": "", "altura": "", "profundidade": "",
          "mdfCaixa": {"fabricante": "", "cor": "", "espessura": ""},
          "mdfFrente": {"fabricante": "", "cor": "", "espessura": ""},
          "fitaBorda": "",
          "portas": "",
          "gavetas": "",
          "ferragens": [{"tipo": "Dobradiça", "fabricante": "", "modelo": "", "quantidade": ""}],
          "puxador": "",
          "iluminacao": "",
          "observacoes": "",
          "revisar": ["campos que você não tem certeza"]
        }
      ]
    }
  ]
}`;

const ATA_SCHEMA = `{
  "resumo": "2 a 4 frases com o que foi decidido na reunião",
  "ambientes": [
    {
      "nome": "Cozinha",
      "pontosGerais": ["ponto que vale para o ambiente todo"],
      "moveis": [{"nome": "Balcão da pia", "pontos": ["cor, medida, ferragem, detalhe combinado"]}]
    }
  ],
  "decisoes": ["decisão que vale para o projeto todo (prazo, pagamento, entrega, etc.)"],
  "pendencias": ["o que ficou em aberto ou o cliente vai confirmar depois"]
}`;

const REGRAS_GERAIS = `Você trabalha numa marcenaria de móveis planejados de alto padrão no Brasil.
Medidas sempre em milímetros (converta cm e metros). Espessuras de MDF comuns: 6, 15, 18, 25 mm.
Use nomes reais de fabricantes e padrões de MDF e de ferragens. Quando o texto citar um nome parecido
com um item do catálogo enviado, use exatamente o nome do catálogo.
Nunca invente informação: se algo não foi dito, deixe o campo vazio "" e coloque o nome do campo em "revisar".
Responda SOMENTE com JSON válido, sem texto antes ou depois.`;

function tarefaPrompt(tarefa, d) {
  const cat = d.catalogo ? `\n\nCATÁLOGO DA EMPRESA (use estes nomes quando couber):\n${String(d.catalogo).slice(0, 18000)}` : '';
  switch (tarefa) {
    case 'ata':
      return `${REGRAS_GERAIS}

Você está escrevendo a ATA de uma reunião entre a marcenaria e o cliente, ao vivo, a partir da transcrição
automática do microfone (pode ter erros de reconhecimento de voz: corrija nomes de cores e ferragens pelo contexto).
Organize por AMBIENTE e, dentro de cada ambiente, por MÓVEL.
IGNORE conversas paralelas que não têm relação com o projeto (futebol, família, clima, piadas, café, celular, etc.).
Mantenha tudo o que já está na ata atual, a menos que o novo trecho corrija ou cancele algo (aí atualize).
Frases curtas e objetivas.

ATA ATUAL (JSON):
${JSON.stringify(d.ataAtual || {}, null, 0)}

NOVO TRECHO DA TRANSCRIÇÃO:
"""${String(d.trecho || '').slice(0, 30000)}"""
${cat}

Devolva a ata completa atualizada neste formato:
${ATA_SCHEMA}`;

    case 'gerar_os':
      return `${REGRAS_GERAIS}

Monte uma ORDEM DE SERVIÇO completa para a produção, usando o contrato, os detalhamentos e a ata da reunião.
Cada ambiente com todos os seus móveis. Para cada móvel: medidas, MDF da caixa e da frente (fabricante, cor, espessura),
fita de borda, portas, gavetas, todas as ferragens (dobradiças, corrediças, articuladores, sistemas de gaveta,
aberturas), puxador, iluminação e observações. Se a ata contradizer o contrato, a ata é mais recente e vale ela;
anote a divergência em "observacoes" do móvel.

CLIENTE: ${JSON.stringify(d.cliente || {})}

CONTRATO E DETALHAMENTOS:
"""${String(d.documentos || '').slice(0, 30000)}"""

ATA DA REUNIÃO (JSON):
${JSON.stringify(d.ata || {}, null, 0).slice(0, 12000)}
${cat}

Formato:
${OS_SCHEMA}`;

    case 'voz_os':
      return `${REGRAS_GERAIS}

O usuário está preenchendo uma ORDEM DE SERVIÇO falando. Aplique o que ele disse na OS atual:
crie ambientes ou móveis novos se ele pedir, altere só os campos que ele citou e mantenha todo o resto igual.
Se ele disser para apagar algo, apague.

O QUE ELE FALOU:
"""${String(d.fala || '').slice(0, 8000)}"""

OS ATUAL (JSON):
${JSON.stringify(d.os || {}, null, 0).slice(0, 40000)}
${cat}

Devolva a OS completa atualizada neste formato:
${OS_SCHEMA}`;

    case 'importar_os':
      return `${REGRAS_GERAIS}

Converta esta ORDEM DE SERVIÇO ANTIGA (texto extraído de PDF, Word, Excel ou foto) para o formato novo.
Coloque CADA informação no seu campo certo (acabamentos, portas, puxadores, LED, ferragens, fechaduras, vidros, tecidos no "padrao";
medidas e materiais de cada móvel no móvel). Não perca nenhuma informação: o que não tiver campo próprio vai em "observacoes" do móvel ou em "observacoesGerais".
Também devolva "numeroAntigo" (o número que a OS tinha no documento, se houver) e "dataAntiga" (se houver).

TEXTO DA OS ANTIGA:
"""${String(d.texto || '').slice(0, 40000)}"""
${d.temImagens ? '\nAs imagens enviadas são fotos/páginas da OS antiga. Leia tudo o que estiver escrito nelas.' : ''}
${cat}

Formato (com os campos extras "numeroAntigo" e "dataAntiga" no topo):
${OS_SCHEMA}`;

    case 'organizar_os':
      return `${REGRAS_GERAIS}

Esta ORDEM DE SERVIÇO foi criada num formato antigo e as informações estão misturadas (em observações, nomes de móveis,
campos genéricos). REORGANIZE colocando CADA informação no seu campo certo do formato novo:
- acabamentos internos/externos (MDF, fórmica, lâmina, madeira, laca) no "padrao.acab"; portas em "padrao.portas";
- puxadores, perfis e lâminas nas listas; LED em "padrao.led"; dobradiças, corrediças, portas de correr e de passagem em "padrao.ferragens";
- fechaduras/travas em "padrao.fech"; vidros e espelhos em "padrao.vidros"; tecidos/estofados em "padrao.tec"; painéis de parede em "padrao.parede";
- tamponamento, responsável, arquiteto, prazo e ambientes nos campos de cima.
Informação que vale para a OS toda vai no "padrao"; o que é de um móvel específico fica no móvel.
NÃO perca nada: mantenha os ambientes e móveis, e o que não tiver campo fica em observações. Não invente.

OS ATUAL (JSON):
${JSON.stringify(d.os || {}, null, 0).slice(0, 45000)}
${cat}

Devolva a OS completa neste formato:
${OS_SCHEMA}`;

    case 'contrato_os':
      return `${REGRAS_GERAIS}

Leia o CONTRATO (e anexos/detalhamentos) de móveis planejados e extraia TUDO o que for relevante para a ORDEM DE SERVIÇO:
cliente (nome, telefone, endereço, obra), prazo de entrega, arquiteto, ambientes e móveis contratados com medidas e materiais,
acabamentos, cores de MDF, ferragens, puxadores, LED, vidros, fechaduras, tecidos e observações técnicas.
Coloque cada informação no seu campo. Não invente nada.
Além da OS, devolva no topo "contrato": {"numero": "", "dataAssinatura": "", "valorTotal": "", "formaPagamento": "",
"prazoContratual": "", "garantia": "", "clausulasImportantes": ["multas, condições de entrega, o que NÃO está incluso, etc."]}.

OS ATUAL (para não repetir o que já existe):
${JSON.stringify(d.os || {}, null, 0).slice(0, 15000)}

TEXTO DO CONTRATO:
"""${String(d.texto || '').slice(0, 45000)}"""
${d.temImagens ? '\nAs imagens são páginas do contrato. Leia tudo o que estiver escrito nelas.' : ''}
${cat}

Formato (com "contrato" no topo):
${OS_SCHEMA}`;

    case 'preencher_os':
      return `${REGRAS_GERAIS}

A partir da ATA da reunião, complete a ORDEM DE SERVIÇO. Preencha APENAS os campos que estão vazios na OS atual;
não altere o que já está preenchido. Crie os ambientes e móveis citados na ata que ainda não existem na OS.
Coloque cada informação no seu campo certo (acabamentos, portas, ferragens, LED, fechaduras, vidros, tecidos no "padrao").

ATA (JSON):
${JSON.stringify(d.ata || {}, null, 0).slice(0, 15000)}

OS ATUAL (JSON):
${JSON.stringify(d.os || {}, null, 0).slice(0, 40000)}
${cat}

Devolva a OS completa neste formato:
${OS_SCHEMA}`;

    case 'agenda_semana':
      return `Você organiza a AGENDA SEMANAL de uma fábrica de móveis planejados.
Leia o documento e preencha o modelo JSON abaixo, mantendo o texto original (OS, cliente, ambiente, observações).
- "grades": cada seção tem linhas (pessoa/equipe/viagem) com 5 dias (segunda a sexta). Coloque o texto de cada célula no dia certo;
  se a pessoa não existir no modelo, crie a linha; várias tarefas no mesmo dia vão separadas por quebra de linha "\\n".
  entregas = cronograma de entregas/logística; montagem = equipes de montagem; producao = vidros, madeira e ferros;
  terceirizados = produção terceirizada; marceneiros = cronograma dos marceneiros.
- "listas": entregasObs, usinagens, cortes, fitaExtras, fitaLimpeza, liberado, prontoMontagem (texto, um item por linha).
- "fornecedores": cada fornecedor/pintor/vidraçaria com seus itens (texto, um por linha).
- "prioridades": texto, uma por linha.
- "semanaDetectada": data da segunda-feira da semana do documento no formato AAAA-MM-DD (ano ${new Date().getFullYear()} se não houver ano).
Responda SOMENTE com JSON válido.

MODELO:
${JSON.stringify(d.modelo || {}, null, 0)}

DOCUMENTO:
"""${String(d.texto || '').slice(0, 40000)}"""
${d.temImagens ? 'As imagens são o documento; leia tudo.' : ''}`;

    case 'ler_imagens':
      return `Transcreva TODO o texto destas imagens de documento (contrato, detalhamento ou projeto de móveis),
mantendo a ordem, tabelas como linhas "coluna: valor" e medidas exatamente como estão.
Responda em JSON: {"texto": "..."}`;

    default:
      return null;
  }
}

function extrairJSON(texto) {
  const t = String(texto || '').trim();
  try { return JSON.parse(t); } catch {}
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  return null;
}

// ---------- Respostas HTTP ----------
function enviarJSON(res, status, obj) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function lerCorpo(req, limite = 30 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const partes = []; let total = 0;
    req.on('data', (c) => { total += c.length; if (total > limite) { reject(new Error('grande')); req.destroy(); } else partes.push(c); });
    req.on('end', () => resolve(Buffer.concat(partes).toString('utf8')));
    req.on('error', reject);
  });
}

// ---------- Assistente de IA (chat dentro do app) ----------
const REGRAS_ASSISTENTE = `Você é o assistente de IA do Gestão Pró, app de ordens de serviço (OS) de uma marcenaria de móveis planejados de alto padrão no Brasil.
Fale sempre em português do Brasil, de forma curta e prática.
Você ajuda a equipe a: tirar dúvidas sobre projetos, clientes e OS da empresa (use os DADOS DA EMPRESA abaixo);
sugerir MDF, fitas, ferragens e puxadores compatíveis (use nomes reais de fabricantes como Duratex, Arauco, Guararapes, Berneck, Blum, Hettich, Häfele, Grass, FGV);
conferir OS (medidas incoerentes, ferragem faltando, corrediça x profundidade, dobradiças por altura de porta, fita que não combina);
escrever mensagens para clientes e fornecedores; e explicar como usar o app.
Como usar o app: Projetos (cliente, contrato/detalhamentos, Ata da reunião com microfone), botão "Gerar OS automática" no projeto,
Ordens de serviço (editar, "Preencher falando", imprimir/PDF, status), Importar antigas, Catálogo, Equipe (só administrador).
Se a pergunta depender de um dado que não está nos DADOS DA EMPRESA, diga isso em vez de inventar. Medidas em milímetros.`;

async function assistente(res, dados) {
  const contexto = String(dados.contexto || '').slice(0, 40000);
  const historico = (Array.isArray(dados.historico) ? dados.historico : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim())
    .slice(-20)
    .map(m => ({ role: m.role, content: String(m.content).slice(0, 8000) }));
  while (historico.length && historico[0].role !== 'user') historico.shift();
  if (!historico.length || historico[historico.length - 1].role !== 'user') return enviarJSON(res, 400, { erro: 'Mensagem vazia.' });
  try {
    let texto;
    try { texto = (await chamarModelo({ system: REGRAS_ASSISTENTE + '\n\nDADOS DA EMPRESA (agora):\n' + contexto, messages: historico, maxTokens: 3000 })).texto.trim(); }
    catch (e) { return enviarJSON(res, 502, { erro: 'A IA recusou o pedido: ' + e.message }); }
    enviarJSON(res, 200, { ok: true, resultado: { texto } });
  } catch {
    enviarJSON(res, 502, { erro: 'Sem conexão com a IA agora. Tente de novo em instantes.' });
  }
}

async function rotaIA(req, res) {
  const u = await checkUser(req);
  if (!u.ok) return enviarJSON(res, 401, { erro: u.msg });
  if (!IA_LIGADA) return enviarJSON(res, 503, { erro: 'A chave da IA ainda não foi colocada no servidor (GEMINI_API_KEY).' });
  if (!rateOk(u.uid)) return enviarJSON(res, 429, { erro: 'Muitos pedidos seguidos. Espere um minuto.' });

  let corpo;
  try { corpo = JSON.parse(await lerCorpo(req)); } catch { return enviarJSON(res, 413, { erro: 'Arquivo grande demais. Envie menos páginas por vez.' }); }
  const { tarefa, dados = {}, imagens = [] } = corpo || {};
  if (tarefa === 'assistente') return assistente(res, dados);
  const prompt = tarefaPrompt(tarefa, dados);
  if (!prompt) return enviarJSON(res, 400, { erro: 'Tarefa desconhecida.' });

  const content = [];
  for (const img of (Array.isArray(imagens) ? imagens : []).slice(0, 12)) {
    const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(img || '');
    if (m) content.push({ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } });
  }
  content.push({ type: 'text', text: prompt });

  try {
    let texto, cortado;
    try { ({ texto, cortado } = await chamarModelo({ messages: [{ role: 'user', content }], maxTokens: tarefa === 'ata' ? 6000 : 16000 })); }
    catch (e) { return enviarJSON(res, 502, { erro: 'A IA recusou o pedido: ' + e.message }); }
    const json = extrairJSON(texto);
    if (!json) return enviarJSON(res, 502, { erro: 'A IA respondeu num formato inesperado. Tente de novo.' });
    enviarJSON(res, 200, { ok: true, resultado: json, cortado });
  } catch {
    enviarJSON(res, 502, { erro: 'Sem conexão com a IA agora. Tente de novo em instantes.' });
  }
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
};
async function arquivo(req, res) {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || !path.extname(p)) p = '/index.html';
  const alvo = path.normalize(path.join(PUBLIC, p));
  if (!alvo.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  try {
    const dados = await fs.readFile(alvo);
    res.writeHead(200, { 'content-type': TIPOS[path.extname(alvo)] || 'application/octet-stream', 'cache-control': p === '/index.html' ? 'no-cache' : 'public, max-age=300' });
    res.end(dados);
  } catch { res.writeHead(404); res.end('Não encontrado'); }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/ia' && req.method === 'POST') return await rotaIA(req, res);
    if (url.pathname === '/api/status') return enviarJSON(res, 200, { ok: true, ia: IA_LIGADA, firebase: !!FIREBASE_PROJECT_ID, modelo: API_KEY ? MODEL : GEMINI_MODEL });
    if (req.method === 'GET' || req.method === 'HEAD') return await arquivo(req, res);
    res.writeHead(405); res.end();
  } catch (e) {
    try { enviarJSON(res, 500, { erro: 'Erro no servidor.' }); } catch {}
  }
});
server.requestTimeout = 0;
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Gestão Pró rodando na porta ' + PORT));
