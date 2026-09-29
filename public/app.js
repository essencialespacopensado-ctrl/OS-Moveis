/* Gestão Pró — app principal (React + htm, sem etapa de build) */
const html = htm.bind(React.createElement);
const { useState, useEffect, useMemo, useRef, useCallback } = React;
// Versão carregada (do ?v= do app.js) — usada para avisar quando sair versão nova.
const APP_VERSAO = ((document.currentScript && document.currentScript.src) || '').match(/[?&]v=([\w.-]+)/)?.[1] || '';
function useNovaVersao() {
  const [nova, setNova] = useState('');
  useEffect(() => {
    if (!APP_VERSAO) return;
    const checar = async () => {
      try {
        const t = await (await fetch('/?_=' + Date.now(), { cache: 'no-store' })).text();
        const v = t.match(/app\.js\?v=([\w.-]+)/)?.[1];
        if (v && v !== APP_VERSAO) setNova(v);
      } catch {}
    };
    const id = setInterval(checar, 60000);
    const vis = () => document.visibilityState === 'visible' && checar();
    document.addEventListener('visibilitychange', vis);
    setTimeout(checar, 8000);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, []);
  return nova;
}
// Cor fixa de cada cliente — a mesma em todas as telas.
const PALETA_CLI = ['#1E3A5F', '#B45309', '#15803D', '#9D174D', '#0E7490', '#6B4423', '#7C3AED', '#B91C1C', '#1D4ED8', '#4D7C0F', '#C2410C', '#0F766E', '#86198F', '#374151', '#A16207', '#BE185D', '#3730A3', '#166534', '#9A3412', '#155E75', '#6D28D9', '#854D0E', '#1F2937', '#047857', '#DB2777', '#2563EB', '#65A30D', '#EA580C', '#0891B2', '#7E22CE'];
const chaveCli = (nome) => String(nome || '').split(/\s[-–]\s/)[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
function corCliente(nome) {
  const k = chaveCli(nome);
  const m = window.__CORES_CLI || {};
  if (m[k]) return m[k];
  let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETA_CLI[h % PALETA_CLI.length];
}
// Dá uma cor exclusiva para cada cliente novo e guarda na empresa (fica fixa para sempre).
async function garantirCoresClientes(sessao, nomes) {
  const m = { ...(window.__CORES_CLI || {}) };
  const usadas = Object.values(m);
  let mudou = false;
  for (const n of [...new Set(nomes.map(chaveCli))].filter(Boolean).sort()) {
    if (m[n]) continue;
    const livre = PALETA_CLI.find(c => !usadas.includes(c)) || PALETA_CLI[usadas.length % PALETA_CLI.length];
    m[n] = livre; usadas.push(livre); mudou = true;
  }
  if (mudou) { window.__CORES_CLI = m; try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { coresClientes: m }); } catch {} }
}
const corOS = (o) => corCliente(o?.cliente?.nome || '');
const recarregarApp = async () => { try { const ks = await caches?.keys?.(); ks && ks.forEach(k => caches.delete(k)); } catch {} location.reload(); };

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* =========================================================
   Utilidades
   ========================================================= */
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'empresa';
const rand = (n = 5) => Math.random().toString(36).slice(2, 2 + n);
const clone = (o) => JSON.parse(JSON.stringify(o ?? null));
const fmtData = (v) => {
  if (!v) return '';
  const d = typeof v === 'string' ? new Date(v) : (v.toDate ? v.toDate() : new Date(v));
  return isNaN(d) ? '' : d.toLocaleDateString('pt-BR');
};
const nowIso = () => new Date().toISOString();
const padNum = (n) => String(n || 0).padStart(4, '0');
// Número da OS no padrão ANO.SEQUÊNCIA (ex: 26.001). Vale também para as OSs antigas.
const anoDe = (o) => {
  const d = o && (o.criadoEm || o.dataAntiga);
  const m = String(d || '').match(/(20\d\d)/);
  return m ? m[1].slice(2) : String(new Date().getFullYear()).slice(2);
};
function numOS(o) {
  if (o == null) return '';
  if (typeof o === 'string' && o.includes('.')) return o;
  if (typeof o !== 'object') return String(new Date().getFullYear()).slice(2) + '.' + String(o || 0).padStart(3, '0');
  if (o.codigo) return o.codigo;
  return (o.ano || anoDe(o)) + '.' + String(o.numero || 0).padStart(3, '0');
}

async function sha256(texto) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function waitFirebase() {
  return new Promise((resolve) => {
    if (window.__fb && (window.__fb.ready || window.__fb.error)) return resolve(window.__fb);
    window.addEventListener('fb-done', () => resolve(window.__fb), { once: true });
  });
}

let toastTimer = null;
function useToast() {
  const [msg, setMsg] = useState(null);
  const show = useCallback((texto, tipo = 'info') => {
    setMsg({ texto, tipo });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => setMsg(null), 3800);
  }, []);
  const el = msg ? html`<div class="toast" role="status" style=${{ borderColor: msg.tipo === 'erro' ? 'var(--danger)' : msg.tipo === 'ok' ? 'var(--ok)' : 'var(--line-strong)' }}>${msg.texto}</div>` : null;
  return [show, el];
}

/* =========================================================
   Modelo de OS
   ========================================================= */
const ESPESSURAS = ['6', '15', '18', '25'];
const TIPOS_FERRAGEM = ['Dobradiça', 'Corrediça', 'Sistema de gaveta', 'Articulador', 'Abertura', 'Porta de correr', 'Canto e despenseiro', 'Closet e cozinha', 'Outro'];
const STATUS_OS = [
  { v: 'elaboracao', t: '1. Elaboração', c: 'chip' },
  { v: 'projetos', t: '2. Projetos', c: 'chip chip-azul' },
  { v: 'producao', t: '3. Produção', c: 'chip chip-teal' },
  { v: 'liberacao', t: '4. Aguard. liberação p/ entrega', c: 'chip chip-warn' },
  { v: 'montagem', t: '5. Montagem', c: 'chip chip-roxo' },
  { v: 'concluida', t: '6. Concluída', c: 'chip chip-ok' },
];
const PAPEIS = [
  { v: 'admin', t: 'Administrador' },
  { v: 'projetista', t: 'Projetista' },
  { v: 'vendedor', t: 'Vendedor' },
  { v: 'producao', t: 'Produção' },
];

const novoMovel = (nome = '') => ({
  id: rand(8), nome, quantidade: 1, largura: '', altura: '', profundidade: '',
  mdfCaixa: { fabricante: '', cor: '', espessura: '18' },
  mdfFrente: { fabricante: '', cor: '', espessura: '18' },
  fitaBorda: '', portas: '', gavetas: '',
  ferragens: [], puxador: '', iluminacao: '', observacoes: '', revisar: [],
});
const novoAmbiente = (nome = '') => ({ id: rand(8), nome, moveis: [] });

// Garante que um JSON vindo da IA (ou de uma OS antiga) tenha todos os campos certinhos.
function sanearOS(o) {
  o = o || {};
  const s = (v) => (v == null ? '' : String(v));
  const mdf = (m) => ({ fabricante: s(m?.fabricante), cor: s(m?.cor), espessura: s(m?.espessura || '').replace(/\D/g, '') || '' });
  return {
    cliente: { nome: s(o.cliente?.nome), telefone: s(o.cliente?.telefone), endereco: s(o.cliente?.endereco), obra: s(o.cliente?.obra) },
    prazoEntrega: s(o.prazoEntrega),
    observacoesGerais: s(o.observacoesGerais),
    ...(o.padrao && typeof o.padrao === 'object' ? { padrao: o.padrao } : {}),
    ...(o.tamponamento && typeof o.tamponamento === 'object' ? { tamponamento: o.tamponamento } : {}),
    ...(o.responsavel ? { responsavel: s(o.responsavel) } : {}),
    ...(o.arquiteto ? { arquiteto: s(o.arquiteto) } : {}),
    ...(o.ambienteResumo ? { ambienteResumo: s(o.ambienteResumo) } : {}),
    ambientes: (Array.isArray(o.ambientes) ? o.ambientes : []).map(a => ({
      id: a.id || rand(8),
      nome: s(a.nome),
      moveis: (Array.isArray(a.moveis) ? a.moveis : []).map(m => ({
        ...novoMovel(),
        id: m.id || rand(8),
        nome: s(m.nome),
        quantidade: Number(m.quantidade) || 1,
        largura: s(m.largura), altura: s(m.altura), profundidade: s(m.profundidade),
        mdfCaixa: mdf(m.mdfCaixa), mdfFrente: mdf(m.mdfFrente),
        fitaBorda: s(m.fitaBorda), portas: s(m.portas), gavetas: s(m.gavetas),
        ferragens: (Array.isArray(m.ferragens) ? m.ferragens : []).map(f => ({
          id: f.id || rand(6), tipo: s(f.tipo), fabricante: s(f.fabricante), modelo: s(f.modelo), quantidade: s(f.quantidade),
        })),
        puxador: s(m.puxador), iluminacao: s(m.iluminacao), observacoes: s(m.observacoes),
        revisar: Array.isArray(m.revisar) ? m.revisar.map(s).filter(Boolean) : [],
      })),
    })),
  };
}

// "Impressão digital" da OS: se duas OS tiverem o mesmo cliente e os mesmos móveis,
// medidas e cores, elas geram o mesmo código — é assim que o app barra OS repetida.
async function impressaoDigital(os) {
  const base = {
    c: norm(os.cliente?.nome),
    a: (os.ambientes || []).map(a => ({
      n: norm(a.nome),
      m: (a.moveis || []).map(m => [norm(m.nome), norm(m.largura), norm(m.altura), norm(m.profundidade), norm(m.mdfCaixa?.cor), norm(m.mdfFrente?.cor)].join('|')).sort(),
    })).sort((x, y) => x.n.localeCompare(y.n)),
  };
  return sha256(JSON.stringify(base));
}

/* =========================================================
   Firebase: autenticação e dados
   ========================================================= */
const F = () => window.__fb;
const emailDe = (login, empresaId) => `${norm(login).replace(/[^a-z0-9._-]/g, '')}@${empresaId}.osmoveis.app`;
const col = (...p) => F().fsMod.collection(F().db, ...p);
const docRef = (...p) => F().fsMod.doc(F().db, ...p);

function traduzErroAuth(e) {
  const c = e?.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'Usuário ou senha incorretos.';
  if (c.includes('email-already-in-use')) return 'Esse login já existe nessa empresa. Escolha outro.';
  if (c.includes('weak-password')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (c.includes('too-many-requests')) return 'Muitas tentativas. Espere alguns minutos e tente de novo.';
  if (c.includes('network')) return 'Sem internet. Confira a conexão e tente de novo.';
  if (c.includes('operation-not-allowed')) return 'O login por usuário e senha ainda não foi liberado no Firebase.';
  if (c.includes('permission-denied')) return 'Sem permissão. As regras do banco ainda não foram publicadas.';
  return 'Não foi possível concluir: ' + (e?.message || c || 'erro desconhecido');
}

async function listarEmpresas() {
  const { getDocs } = F().fsMod;
  const snap = await getDocs(col('empresas_publico'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

async function cadastrarEmpresa({ nome, cnpj, cidade, adminNome, login, senha }) {
  const { authMod, fsMod, auth } = F();
  const existentes = await listarEmpresas();
  if (existentes.some(e => norm(e.nome) === norm(nome) && norm(e.cidade) === norm(cidade))) {
    throw new Error('Já existe uma empresa com esse nome nessa cidade. Peça o acesso ao administrador dela.');
  }
  const empresaId = slug(nome) + '-' + rand(4);
  const cred = await authMod.createUserWithEmailAndPassword(auth, emailDe(login, empresaId), senha);
  const uid = cred.user.uid;
  const agora = nowIso();
  await fsMod.setDoc(docRef('usuarios_index', uid), { empresaId, papel: 'admin', nome: adminNome, login: norm(login) });
  await fsMod.setDoc(docRef('empresas', empresaId), { nome, cnpj: cnpj || '', cidade: cidade || '', osSeq: 0, criadoEm: agora });
  await fsMod.setDoc(docRef('empresas', empresaId, 'usuarios', uid), { nome: adminNome, login: norm(login), papel: 'admin', ativo: true, criadoEm: agora });
  await fsMod.setDoc(docRef('empresas_publico', empresaId), { nome, cidade: cidade || '' });
  return empresaId;
}

// Cadastra alguém da equipe sem deslogar o administrador (usa uma segunda conexão).
async function cadastrarUsuario(empresaId, { nome, login, senha, papel }) {
  const { appMod, authMod, fsMod, cfg } = F();
  let sec;
  try { sec = appMod.getApp('secundario'); } catch { sec = appMod.initializeApp(cfg, 'secundario'); }
  const secAuth = authMod.getAuth(sec);
  const cred = await authMod.createUserWithEmailAndPassword(secAuth, emailDe(login, empresaId), senha);
  const uid = cred.user.uid;
  await authMod.signOut(secAuth);
  await fsMod.setDoc(docRef('usuarios_index', uid), { empresaId, papel, nome, login: norm(login) });
  await fsMod.setDoc(docRef('empresas', empresaId, 'usuarios', uid), { nome, login: norm(login), papel, ativo: true, criadoEm: nowIso() });
}

async function chamarIA(tarefa, dados = {}, imagens = []) {
  const user = F().auth.currentUser;
  if (!user) throw new Error('Faça login de novo.');
  const token = await user.getIdToken();
  let r;
  try {
    r = await fetch('/api/ia', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
      body: JSON.stringify({ tarefa, dados, imagens }),
    });
  } catch {
    throw new Error('Sem conexão com o servidor. Confira a internet.');
  }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.erro || 'A IA não respondeu (erro ' + r.status + ').');
  return body.resultado;
}

/* ---------- OS: criar sem repetir, com número único ---------- */
async function acharDuplicada(empresaId, fp, ignorarId) {
  const { getDocs, query, where, limit } = F().fsMod;
  const snap = await getDocs(query(col('empresas', empresaId, 'os'), where('fingerprint', '==', fp), limit(3)));
  const d = snap.docs.find(x => x.id !== ignorarId);
  return d ? { id: d.id, ...d.data() } : null;
}

/* Numeração: sempre segue as OSs que existem (apagou → o número volta a ficar livre) */
async function numerosUsados(empresaId) {
  const snap = await F().fsMod.getDocs(col('empresas', empresaId, 'os'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
function lerCodigo(txt) {
  const t = String(txt || '');
  let m = t.match(/(?:^|[^\d])(\d{2})\s*[.,\-_ ]\s*(\d{1,4})(?!\d)/);
  if (m) return { ano: m[1], numero: parseInt(m[2], 10) };
  m = t.match(/(?:^|[^\d])(\d{2})(\d{3})(?!\d)/);
  if (m) return { ano: m[1], numero: parseInt(m[2], 10) };
  return null;
}
const codigoDe = (ano, n) => ano + '.' + String(n).padStart(3, '0');
function proximoLivre(lista, ano) {
  const usados = lista.filter(o => numOS(o).startsWith(ano + '.')).map(o => parseInt(numOS(o).split('.')[1], 10) || 0);
  return (usados.length ? Math.max(...usados) : 0) + 1;
}
async function ajustarSequencia(sessao) {
  try {
    const lista = await numerosUsados(sessao.empresaId);
    const seq = {};
    lista.forEach(o => { const [a, n] = numOS(o).split('.'); const v = parseInt(n, 10) || 0; if (a && v > (seq[a] || 0)) seq[a] = v; });
    const ano = String(new Date().getFullYear()).slice(2); if (!seq[ano]) seq[ano] = 0;
    await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { seqAno: seq, osSeq: lista.length });
  } catch {}
}
function pedirTexto(titulo, ph) {
  return new Promise(res => {
    const el = document.createElement('div'); document.body.appendChild(el);
    const root = ReactDOM.createRoot(el);
    const fim = (v) => { root.unmount(); el.remove(); res(v); };
    function M() { const [v, setV] = useState(''); return html`<div class="modal-fundo"><div class="card modal-caixa stack" style=${{ width: 'min(420px,100%)' }}>
      <div class="sec-title">${titulo}</div><input class="inp" autoFocus placeholder=${ph} value=${v} onInput=${e => setV(e.target.value)} onKeyDown=${e => e.key === 'Enter' && fim(v)} />
      <div class="row" style=${{ gap: '6px' }}><button class="btn btn-grande" style=${{ flex: 1 }} onClick=${() => fim('')}>Cancelar</button><button class="btn btn-grande btn-primary" style=${{ flex: 1 }} onClick=${() => fim(v)}>OK</button></div></div></div>`; }
    root.render(html`<${M} />`);
  });
}
/* Caixa de escolha (aviso com opções) */
function escolher(titulo, texto, opcoes, links) {
  return new Promise(res => {
    const el = document.createElement('div'); document.body.appendChild(el);
    const root = ReactDOM.createRoot(el);
    const fim = (v) => { root.unmount(); el.remove(); res(v); };
    root.render(html`<div class="modal-fundo"><div class="card modal-caixa stack" style=${{ width: 'min(520px,100%)' }}>
      <div class="sec-title">⚠️ ${titulo}</div><div style=${{ whiteSpace: 'pre-line' }}>${texto}</div>
      ${(links || []).length > 0 && html`<div class="row" style=${{ gap: '6px', flexWrap: 'wrap' }}>${links.map((l, i) => html`<button key=${i} class="btn btn-sm" onClick=${l.fn}>${l.t}</button>`)}</div>`}
      <div class="stack" style=${{ gap: '6px' }}>${opcoes.map((o, i) => html`<button key=${i} class=${'btn btn-grande btn-block ' + (o.cls || '')} onClick=${() => fim(o.v)}>${o.t}${o.d ? html`<small style=${{ display: 'block', fontWeight: 400, opacity: .8 }}>${o.d}</small>` : ''}</button>`)}</div>
    </div></div>`);
  });
}
async function criarOS(sessao, conteudo, extras = {}) {
  const { fsMod } = F();
  const os = sanearOS(conteudo);
  const fp = await impressaoDigital(os);
  const dup = await acharDuplicada(sessao.empresaId, fp);
  if (dup) {
    const err = new Error(`Já existe a OS nº ${numOS(dup)} igual a esta (mesmo cliente, mesmos móveis, medidas e cores). Abra a OS existente em vez de criar outra.`);
    err.duplicada = dup;
    throw err;
  }
  const empRef = docRef('empresas', sessao.empresaId);
  const osRef = fsMod.doc(col('empresas', sessao.empresaId, 'os'));
  const agora = nowIso();
  let numero = 0, codigo = '';
  let ano = String(new Date().getFullYear()).slice(2);
  const existentes = await numerosUsados(sessao.empresaId);
  if (extras.fixo) {
    ano = extras.fixo.ano; numero = extras.fixo.numero;
    if (existentes.some(o => numOS(o) === codigoDe(ano, numero))) throw new Error('O número ' + codigoDe(ano, numero) + ' já está em uso.');
  } else numero = proximoLivre(existentes, ano);
  codigo = codigoDe(ano, numero);
  await fsMod.runTransaction(F().db, async (tx) => {
    const e = await tx.get(empRef);
    const ed = e.data() || {};
    const seqs = ed.seqAno || {};
    tx.update(empRef, { osSeq: existentes.length + 1, seqAno: { ...seqs, [ano]: Math.max(numero, proximoLivre(existentes, ano) - 1) } });
    tx.set(osRef, {
      ...os, numero, ano, codigo, fingerprint: fp, status: STATUS_OS[0]?.v || 'elaboracao', modoExecucao: 'interna',
      projetoId: extras.projetoId || '', origem: extras.origem || 'manual',
      numeroAntigo: extras.numeroAntigo || '', dataAntiga: extras.dataAntiga || '', arquivoOrigem: extras.arquivoOrigem || '',
      criadoPor: sessao.nome, criadoEm: agora, atualizadoEm: agora, atualizadoPor: sessao.nome,
    });
  });
  return { id: osRef.id, numero: codigo, codigo };
}

/* =========================================================
   Leitura de arquivos (PDF, Word, Excel, fotos)
   ========================================================= */
function lerArrayBuffer(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsArrayBuffer(file); });
}
function lerTexto(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); });
}
function canvasParaJpeg(canvas, q = 0.82) { return canvas.toDataURL('image/jpeg', q); }
async function imagemParaJpeg(file, max = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return canvasParaJpeg(c);
  } finally { URL.revokeObjectURL(url); }
}

// Devolve { texto, imagens } de qualquer arquivo aceito.
async function extrairArquivo(file) {
  const nome = file.name.toLowerCase();
  if (nome.endsWith('.pdf')) {
    const pdf = await pdfjsLib.getDocument({ data: await lerArrayBuffer(file) }).promise;
    let texto = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      let linhaY = null, linha = '';
      const linhas = [];
      for (const it of tc.items) {
        const y = Math.round(it.transform[5]);
        if (linhaY !== null && Math.abs(y - linhaY) > 3) { linhas.push(linha); linha = ''; }
        linha += (linha && !linha.endsWith(' ') ? ' ' : '') + it.str;
        linhaY = y;
      }
      if (linha) linhas.push(linha);
      texto += `\n--- Página ${p} ---\n` + linhas.join('\n');
    }
    const imagens = [];
    // PDF escaneado (só imagem): transforma as páginas em fotos pra IA ler.
    if (texto.replace(/--- Página \d+ ---/g, '').trim().length < 80) {
      for (let p = 1; p <= Math.min(pdf.numPages, 10); p++) {
        const page = await pdf.getPage(p);
        const vp = page.getViewport({ scale: 1.6 });
        const c = document.createElement('canvas');
        c.width = vp.width; c.height = vp.height;
        await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        imagens.push(canvasParaJpeg(c, 0.78));
      }
      texto = '';
    }
    return { texto: texto.trim(), imagens, paginas: pdf.numPages };
  }
  if (nome.endsWith('.docx')) {
    const r = await mammoth.extractRawText({ arrayBuffer: await lerArrayBuffer(file) });
    return { texto: r.value.trim(), imagens: [] };
  }
  if (nome.endsWith('.doc')) {
    throw new Error('Arquivo .doc antigo: abra no Word e salve como .docx (ou PDF) para importar.');
  }
  if (/\.(xlsx|xlsm|xls|ods|csv)$/.test(nome)) {
    const wb = XLSX.read(await lerArrayBuffer(file), { type: 'array' });
    const texto = wb.SheetNames.map(n => `--- Planilha ${n} ---\n` + XLSX.utils.sheet_to_csv(wb.Sheets[n], { FS: ' | ' })).join('\n');
    return { texto: texto.trim(), imagens: [] };
  }
  if (/\.(txt|md)$/.test(nome)) return { texto: (await lerTexto(file)).trim(), imagens: [] };
  if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/.test(nome)) {
    return { texto: '', imagens: [await imagemParaJpeg(file)] };
  }
  throw new Error('Formato não suportado. Use PDF, Word (.docx), Excel, texto ou foto.');
}

/* =========================================================
   Voz: reconhecimento pelo microfone (Chrome / Edge)
   ========================================================= */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function useFala({ onFinal, onInterim } = {}) {
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState('');
  const recRef = useRef(null);
  const querRef = useRef(false);
  const cbRef = useRef({ onFinal, onInterim });
  cbRef.current = { onFinal, onInterim };

  const iniciar = useCallback(() => {
    if (!SR) { setErro('Este navegador não reconhece voz. Use o Google Chrome ou o Microsoft Edge.'); return; }
    setErro('');
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) cbRef.current.onFinal?.(r[0].transcript.trim());
        else interim += r[0].transcript;
      }
      cbRef.current.onInterim?.(interim);
    };
    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        querRef.current = false;
        setErro('O navegador bloqueou o microfone. Clique no cadeado ao lado do endereço do site e permita o microfone.');
      } else if (ev.error === 'audio-capture') {
        querRef.current = false;
        setErro('Nenhum microfone encontrado neste aparelho.');
      }
    };
    rec.onend = () => {
      cbRef.current.onInterim?.('');
      // O Chrome para sozinho depois de um tempo; se ainda queremos ouvir, reinicia.
      if (querRef.current) { try { rec.start(); } catch {} } else setOuvindo(false);
    };
    recRef.current = rec;
    querRef.current = true;
    try { rec.start(); setOuvindo(true); } catch (e) { setErro('Não consegui ligar o microfone.'); }
  }, []);

  const parar = useCallback(() => {
    querRef.current = false;
    try { recRef.current?.stop(); } catch {}
    setOuvindo(false);
  }, []);

  useEffect(() => () => { querRef.current = false; try { recRef.current?.abort(); } catch {} }, []);
  return { ouvindo, erro, iniciar, parar, suportado: !!SR };
}

/* =========================================================
   Catálogo (base + itens salvos pela empresa)
   ========================================================= */
let CATALOGO_BASE = [];
const catalogoBasePronto = fetch('/catalogo.json').then(r => r.json()).then(d => { CATALOGO_BASE = d; return d; }).catch(() => []);

function useCatalogo(empresaId) {
  const [base, setBase] = useState(CATALOGO_BASE);
  const [meus, setMeus] = useState([]);
  useEffect(() => { catalogoBasePronto.then(setBase); }, []);
  useEffect(() => {
    if (!empresaId) return;
    const { onSnapshot } = F().fsMod;
    return onSnapshot(col('empresas', empresaId, 'catalogo'), (s) => setMeus(s.docs.map(d => ({ id: d.id, ...d.data(), daEmpresa: true }))));
  }, [empresaId]);
  const todos = useMemo(() => {
    const vistos = new Set();
    const out = [];
    for (const it of [...meus, ...base]) {
      const k = norm(it.tipo + '|' + it.fabricante + '|' + it.nome);
      if (vistos.has(k)) continue;
      vistos.add(k);
      out.push({ ...it, _busca: norm([it.tipo, it.fabricante, it.linha, it.nome].join(' ')) });
    }
    return out;
  }, [base, meus]);
  return todos;
}

function buscarNoCatalogo(itens, termo, filtro = {}) {
  const tokens = norm(termo).split(' ').filter(Boolean);
  const res = [];
  for (const it of itens) {
    if (filtro.tipos && !filtro.tipos.includes(it.tipo)) continue;
    if (filtro.fabricante && norm(it.fabricante) !== norm(filtro.fabricante) && tokens.length === 0) continue;
    if (filtro.linha && it.tipo === 'Ferragem' && norm(it.linha) !== norm(filtro.linha) && tokens.length === 0) continue;
    if (tokens.every(t => it._busca.includes(t))) res.push(it);
    if (res.length >= 60) break;
  }
  if (filtro.fabricante) res.sort((a, b) => (norm(b.fabricante) === norm(filtro.fabricante)) - (norm(a.fabricante) === norm(filtro.fabricante)));
  return res;
}

async function salvarNoCatalogo(empresaId, catalogo, item, autor) {
  if (!item.nome?.trim()) return;
  const k = norm(item.tipo + '|' + (item.fabricante || '') + '|' + item.nome);
  if (catalogo.some(c => norm(c.tipo + '|' + (c.fabricante || '') + '|' + c.nome) === k)) return;
  if (catalogo.some(c => c.tipo === item.tipo && norm(c.nome) === norm(item.nome))) return;
  const { addDoc } = F().fsMod;
  await addDoc(col('empresas', empresaId, 'catalogo'), {
    tipo: item.tipo, fabricante: (item.fabricante || '').trim(), linha: (item.linha || '').trim(), nome: item.nome.trim(),
    criadoPor: autor || '', criadoEm: nowIso(),
  });
}

function resumoCatalogo(itens) {
  const grupos = {};
  for (const it of itens) {
    const k = it.tipo === 'MDF' ? `MDF ${it.fabricante}` : `${it.tipo} ${it.fabricante || ''} ${it.linha || ''}`.trim();
    (grupos[k] = grupos[k] || []).push(it.nome);
  }
  return Object.entries(grupos).map(([k, v]) => `${k}: ${v.join(', ')}`).join('\n');
}

// Campo de texto com busca em tempo real no catálogo.
// O que for digitado e não existir é salvo no catálogo da empresa ao sair do campo.
function CatalogoInput({ value, onChange, onPick, catalogo, filtro, placeholder, salvarComo, sessao, className = 'inp inp-sm', review }) {
  const [aberto, setAberto] = useState(false);
  const [sel, setSel] = useState(0);
  const [termo, setTermo] = useState(null);
  const texto = termo ?? value ?? '';
  const opcoes = useMemo(() => aberto ? buscarNoCatalogo(catalogo, texto, filtro) : [], [aberto, texto, catalogo, filtro?.fabricante, filtro?.linha]);
  const existe = texto.trim() && catalogo.some(c => norm(c.nome) === norm(texto) && (!filtro?.tipos || filtro.tipos.includes(c.tipo)));

  const escolher = (it) => {
    setTermo(null); setAberto(false);
    onChange(it.nome);
    onPick?.(it);
  };
  const aoSair = () => {
    setTimeout(() => {
      setAberto(false);
      if (termo != null) {
        onChange(termo);
        setTermo(null);
        if (termo.trim() && salvarComo && sessao) {
          salvarNoCatalogo(sessao.empresaId, catalogo, { ...salvarComo(termo), nome: termo }, sessao.nome).catch(() => {});
        }
      }
    }, 160);
  };
  const tecla = (e) => {
    if (!aberto) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, opcoes.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && opcoes[sel]) { e.preventDefault(); escolher(opcoes[sel]); }
    else if (e.key === 'Escape') setAberto(false);
  };

  return html`
    <div class="cat-wrap">
      <input class=${className + (review ? ' need-review' : '')} value=${texto} placeholder=${placeholder}
        onFocus=${() => { setAberto(true); setSel(0); }}
        onInput=${e => { setTermo(e.target.value); setAberto(true); setSel(0); }}
        onBlur=${aoSair} onKeyDown=${tecla} autocomplete="off" />
      ${aberto && (opcoes.length > 0 || (texto.trim() && !existe)) && html`
        <div class="cat-drop">
          ${opcoes.map((it, i) => html`
            <div key=${it.id || i} class=${'cat-opt' + (i === sel ? ' sel' : '')} onMouseDown=${e => { e.preventDefault(); escolher(it); }}>
              <span style=${{ flex: 1 }}>${it.nome}</span>
              <span class="fab">${[it.fabricante, it.linha].filter(Boolean).join(' · ')}</span>
            </div>`)}
          ${texto.trim() && !existe && salvarComo && html`
            <div class="cat-opt new" onMouseDown=${e => { e.preventDefault(); }}>
              + “${texto.trim()}” será salvo no catálogo ao sair do campo
            </div>`}
        </div>`}
    </div>`;
}

/* =========================================================
   Tela de login (mesmo estilo do Gerenciador de Culto)
   ========================================================= */
function Marca({ grande }) {
  return html`
    <div class=${grande ? 'login-brand' : 'brand-mini'}>
      <div class=${'brand-mark' + (grande ? ' mark' : '')}>GP</div>
      ${grande ? html`
        <h1><span class="grad-text">Gestão Pró</span></h1>
        <div class="muted" style=${{ fontSize: '14px' }}>Contrato, ata e ordem de serviço de móveis planejados</div>
      ` : html`<div>
        <div style=${{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '17px', lineHeight: 1.1 }}>Gestão Pró</div>
      </div>`}
    </div>`;
}

function Senha({ value, onInput, placeholder = 'Senha', id }) {
  const [ver, setVer] = useState(false);
  return html`
    <div class="pass-wrap">
      <input id=${id} class="inp" type=${ver ? 'text' : 'password'} placeholder=${placeholder} value=${value} onInput=${onInput} style=${{ paddingRight: '42px' }} />
      <button type="button" onClick=${() => setVer(v => !v)} title=${ver ? 'Ocultar senha' : 'Mostrar senha'}>${ver ? '🙈' : '👁️'}</button>
    </div>`;
}

function TelaLogin() {
  const [modo, setModo] = useState('entrar');
  const [empresas, setEmpresas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [esqueci, setEsqueci] = useState(false);
  const [devAberto, setDevAberto] = useState(false);

  const [empresaId, setEmpresaId] = useState(() => { try { return localStorage.getItem('osm_empresa') || ''; } catch { return ''; } });
  const [filtroEmp, setFiltroEmp] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(true);

  const [c, setC] = useState({ nome: '', cnpj: '', cidade: '', adminNome: '', login: '', senha: '', senha2: '' });
  const setCampo = (k) => (e) => setC(v => ({ ...v, [k]: e.target.value }));

  useEffect(() => {
    listarEmpresas().then(setEmpresas).catch(e => setErro(traduzErroAuth(e))).finally(() => setCarregando(false));
  }, []);

  const empresasFiltradas = useMemo(() => {
    const t = norm(filtroEmp);
    return empresas.filter(e => !t || norm(e.nome + ' ' + e.cidade).includes(t));
  }, [empresas, filtroEmp]);

  const entrar = async (e) => {
    e.preventDefault();
    setErro('');
    if (!empresaId) return setErro('Escolha a sua empresa.');
    if (!login.trim() || !senha) return setErro('Digite usuário e senha.');
    setOcupado(true);
    try {
      const { authMod, auth } = F();
      await authMod.setPersistence(auth, lembrar ? authMod.browserLocalPersistence : authMod.browserSessionPersistence);
      await authMod.signInWithEmailAndPassword(auth, emailDe(login, empresaId), senha);
      try { localStorage.setItem('osm_empresa', empresaId); } catch {}
    } catch (e2) { setErro(traduzErroAuth(e2)); }
    setOcupado(false);
  };

  const cadastrar = async (e) => {
    e.preventDefault();
    setErro('');
    if (!c.nome.trim()) return setErro('Informe o nome da empresa.');
    if (!c.cidade.trim()) return setErro('Informe a cidade.');
    if (!c.adminNome.trim()) return setErro('Informe o seu nome.');
    if (!/^[a-zA-Z0-9._-]{3,}$/.test(c.login.trim())) return setErro('O login deve ter pelo menos 3 letras ou números, sem espaços.');
    if (c.senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');
    if (c.senha !== c.senha2) return setErro('As duas senhas estão diferentes.');
    setOcupado(true);
    try {
      const id = await cadastrarEmpresa({ nome: c.nome.trim(), cnpj: c.cnpj.trim(), cidade: c.cidade.trim(), adminNome: c.adminNome.trim(), login: c.login.trim(), senha: c.senha });
      try { localStorage.setItem('osm_empresa', id); } catch {}
    } catch (e2) { setErro(e2.code ? traduzErroAuth(e2) : e2.message); }
    setOcupado(false);
  };

  return html`
    <div class="login-page">
      <div class="fade-up" style=${{ width: '100%', maxWidth: modo === 'cadastrar' ? '480px' : '420px' }}>
        <${Marca} grande=${true} />
        <div class="glass login-card">
          <div class="seg">
            <button class=${modo === 'entrar' ? 'on' : ''} onClick=${() => { setModo('entrar'); setErro(''); }}>Entrar</button>
            <button class=${modo === 'cadastrar' ? 'on' : ''} onClick=${() => { setModo('cadastrar'); setErro(''); }}>Cadastrar Empresa</button>
          </div>
          ${erro && html`<div class="error-box">${erro}</div>`}

          ${modo === 'entrar' ? html`
            <form onSubmit=${entrar} class="stack" style=${{ gap: '10px' }}>
              ${empresas.length > 8 && html`
                <input id="f-busca-emp" class="inp" placeholder="Buscar empresa…" value=${filtroEmp} onInput=${e => setFiltroEmp(e.target.value)} />`}
              <select id="f-empresa" class="inp" value=${empresaId} onChange=${e => setEmpresaId(e.target.value)}>
                <option value="">${carregando ? 'Carregando empresas…' : 'Empresa…'}</option>
                ${empresasFiltradas.map(e => html`<option key=${e.id} value=${e.id}>${e.nome}${e.cidade ? ' — ' + e.cidade : ''}</option>`)}
              </select>
              <input id="f-login" class="inp" placeholder="Usuário" value=${login} onInput=${e => setLogin(e.target.value)} autocomplete="username" />
              <${Senha} id="f-senha" value=${senha} onInput=${e => setSenha(e.target.value)} />
              <label class="row muted" style=${{ fontSize: '13px', gap: '8px' }}>
                <input type="checkbox" checked=${lembrar} onChange=${e => setLembrar(e.target.checked)} style=${{ width: '16px', height: '16px' }} />
                Manter conectado neste aparelho
              </label>
              <button type="submit" class="btn btn-primary btn-lg btn-block" disabled=${ocupado}>${ocupado ? 'Entrando…' : 'Entrar no Sistema'}</button>
              <button type="button" class="btn btn-ghost btn-sm" onClick=${() => setEsqueci(v => !v)}>Esqueci minha senha</button>
              ${esqueci && html`<div class="warn-box">Peça ao administrador da sua empresa. Ele entra em <b>Equipe</b> e cria um novo acesso pra você. Depois de entrar, você troca a senha em <b>Minha conta</b>.</div>`}
              <div class="dim" style=${{ textAlign: 'center' }}>Sua empresa não aparece? Cadastre na aba ao lado.</div>
            </form>
          ` : html`
            <form onSubmit=${cadastrar} class="stack" style=${{ gap: '10px' }}>
              <div class="section-label">Empresa</div>
              <input id="c-nome" class="inp" placeholder="Nome da empresa" value=${c.nome} onInput=${setCampo('nome')} />
              <div class="grid2">
                <input id="c-cnpj" class="inp" placeholder="CNPJ (opcional)" value=${c.cnpj} onInput=${setCampo('cnpj')} />
                <input id="c-cidade" class="inp" placeholder="Cidade" value=${c.cidade} onInput=${setCampo('cidade')} />
              </div>
              <div class="section-label">Administrador</div>
              <input id="c-admin" class="inp" placeholder="Seu nome" value=${c.adminNome} onInput=${setCampo('adminNome')} />
              <input id="c-login" class="inp" placeholder="Login de acesso (ex: paulo)" value=${c.login} onInput=${setCampo('login')} />
              <${Senha} id="c-senha" value=${c.senha} onInput=${setCampo('senha')} placeholder="Senha (mínimo 6)" />
              <${Senha} id="c-senha2" value=${c.senha2} onInput=${setCampo('senha2')} placeholder="Repita a senha" />
              <button type="submit" class="btn btn-primary btn-lg btn-block" disabled=${ocupado}>${ocupado ? 'Cadastrando…' : 'Cadastrar Empresa'}</button>
              <div class="dim">Depois de entrar, você cadastra a equipe (projetistas, vendedores, produção) em <b>Equipe</b>.</div>
            </form>
          `}
        </div>
      </div>
      <button class="dev-corner" title="Acesso do desenvolvedor" aria-label="Acesso do desenvolvedor" onClick=${() => setDevAberto(true)}>⚙</button>
      ${devAberto && html`<${LoginDev} fechar=${() => setDevAberto(false)} />`}
    </div>`;
}

/* =========================================================
   Desenvolvedor: login discreto e painel
   ========================================================= */
const EMAIL_DEV = 'desenvolvedor@painel.gestaopro.app';

function LoginDev({ fechar }) {
  const [existe, setExiste] = useState(null);
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    F().fsMod.getDoc(docRef('config', 'dev')).then(s => setExiste(s.exists())).catch(() => setExiste(true));
  }, []);

  const entrar = async (e) => {
    e.preventDefault(); setErro('');
    if (!senha) return setErro('Digite a senha.');
    setOcupado(true);
    try {
      const { authMod, auth } = F();
      await authMod.setPersistence(auth, authMod.browserLocalPersistence);
      await authMod.signInWithEmailAndPassword(auth, EMAIL_DEV, senha);
    } catch (e2) { setErro(traduzErroAuth(e2)); setOcupado(false); }
  };

  const criar = async (e) => {
    e.preventDefault(); setErro('');
    if (senha.length < 8) return setErro('Use uma senha com pelo menos 8 caracteres.');
    if (senha !== senha2) return setErro('As duas senhas estão diferentes.');
    setOcupado(true);
    try {
      const { authMod, auth, fsMod } = F();
      await authMod.setPersistence(auth, authMod.browserLocalPersistence);
      const cred = await authMod.createUserWithEmailAndPassword(auth, EMAIL_DEV, senha);
      await fsMod.setDoc(docRef('config', 'dev'), { uid: cred.user.uid, criadoEm: nowIso() });
    } catch (e2) { setErro(traduzErroAuth(e2)); setOcupado(false); }
  };

  return html`
    <div class="modal-bg" onClick=${e => e.target === e.currentTarget && fechar()}>
      <form class="modal" onSubmit=${existe === false ? criar : entrar}>
        <h3>Desenvolvedor</h3>
        ${erro && html`<div class="error-box">${erro}</div>`}
        ${existe === null ? html`<div class="dim">Carregando…</div>`
          : existe === false ? html`
            <div class="dim">Primeiro acesso: crie a senha do painel do desenvolvedor. Só existe um acesso desse tipo.</div>
            <${Senha} id="dev-s1" value=${senha} onInput=${e => setSenha(e.target.value)} placeholder="Nova senha (mínimo 8)" />
            <${Senha} id="dev-s2" value=${senha2} onInput=${e => setSenha2(e.target.value)} placeholder="Repita a senha" />
            <button class="btn btn-primary" disabled=${ocupado}>${ocupado ? 'Criando…' : 'Criar acesso'}</button>`
          : html`
            <${Senha} id="dev-s" value=${senha} onInput=${e => setSenha(e.target.value)} placeholder="Senha do desenvolvedor" />
            <button class="btn btn-primary" disabled=${ocupado}>${ocupado ? 'Entrando…' : 'Entrar'}</button>`}
        <button type="button" class="btn btn-ghost btn-sm" onClick=${fechar}>Cancelar</button>
      </form>
    </div>`;
}

function PainelDev({ toast }) {
  const [empresas, setEmpresas] = useState(null);
  const [contagens, setContagens] = useState({});
  const [statusIA, setStatusIA] = useState(null);
  const [confirmar, setConfirmar] = useState(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const { onSnapshot } = F().fsMod;
    return onSnapshot(col('empresas'), s => setEmpresas(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''))),
      () => setEmpresas([]));
  }, []);
  useEffect(() => { fetch('/api/status').then(r => r.json()).then(setStatusIA).catch(() => {}); }, []);
  useEffect(() => {
    if (!empresas) return;
    const { getCountFromServer } = F().fsMod;
    empresas.forEach(async (e) => {
      if (contagens[e.id]) return;
      try {
        const [u, p, o] = await Promise.all(['usuarios', 'projetos', 'os'].map(c => getCountFromServer(col('empresas', e.id, c)).then(r => r.data().count)));
        setContagens(v => ({ ...v, [e.id]: { u, p, o } }));
      } catch {}
    });
  }, [empresas]);

  const pausar = async (e, pausada) => {
    await F().fsMod.updateDoc(docRef('empresas', e.id), { pausada, pausadaEm: pausada ? nowIso() : null });
    toast(pausada ? `${e.nome} pausada.` : `${e.nome} reativada.`, 'ok');
    setConfirmar(null);
  };
  const ocultar = async (e, oculta) => {
    const { deleteDoc, setDoc, updateDoc } = F().fsMod;
    if (oculta) await deleteDoc(docRef('empresas_publico', e.id));
    else await setDoc(docRef('empresas_publico', e.id), { nome: e.nome, cidade: e.cidade || '' });
    await updateDoc(docRef('empresas', e.id), { ocultaNoLogin: oculta });
    toast(oculta ? `${e.nome} não aparece mais no login.` : `${e.nome} voltou a aparecer no login.`, 'ok');
    setConfirmar(null);
  };

  const lista = (empresas || []).filter(e => !busca || norm(e.nome + ' ' + e.cidade + ' ' + e.cnpj).includes(norm(busca)));
  const tot = Object.values(contagens).reduce((a, c) => ({ u: a.u + c.u, p: a.p + c.p, o: a.o + c.o }), { u: 0, p: 0, o: 0 });

  return html`
    <div class="shell">
      <div class="topbar glass">
        <${Marca} />
        <span class="chip chip-accent">Painel do desenvolvedor</span>
        <button class="btn btn-sm btn-ghost" onClick=${() => F().authMod.signOut(F().auth)}>Sair</button>
      </div>
      <div class="page-head">
        <div><h2>Empresas cadastradas</h2>
          <div class="dim">${(empresas || []).length} empresas · ${tot.u} usuários · ${tot.p} projetos · ${tot.o} OS</div></div>
        <div class="row">
          <span class=${'chip ' + (statusIA?.ia ? 'chip-ok' : 'chip-warn')}>IA ${statusIA?.ia ? 'ligada' : 'sem chave'}</span>
          <span class=${'chip ' + (statusIA?.firebase ? 'chip-ok' : 'chip-danger')}>Servidor ${statusIA ? 'ok' : '…'}</span>
        </div>
      </div>
      <input id="dev-busca" class="inp" placeholder="Buscar empresa, cidade ou CNPJ…" value=${busca} onInput=${e => setBusca(e.target.value)} style=${{ marginBottom: '12px' }} />
      <div class="list">
        ${empresas === null && html`<div class="card muted">Carregando…</div>`}
        ${empresas && lista.length === 0 && html`<div class="card muted">Nenhuma empresa ainda.</div>`}
        ${lista.map(e => {
          const c = contagens[e.id];
          const conf = confirmar?.id === e.id ? confirmar.acao : null;
          return html`
            <div key=${e.id} class="list-item" style=${{ cursor: 'default', flexWrap: 'wrap' }}>
              <div class="grow" style=${{ minWidth: '200px' }}>
                <div class="title">${e.nome}</div>
                <div class="dim">${[e.cidade, e.cnpj].filter(Boolean).join(' · ') || '—'} · desde ${fmtData(e.criadoEm)}</div>
                <div class="dim">${c ? `${c.u} usuários · ${c.p} projetos · ${c.o} OS (último nº ${padNum(e.osSeq || 0)})` : 'contando…'}</div>
              </div>
              ${e.pausada && html`<span class="chip chip-danger">Pausada</span>`}
              ${e.ocultaNoLogin && html`<span class="chip">Oculta no login</span>`}
              ${conf ? html`
                <span class="dim">${conf === 'pausar' ? 'Pausar o acesso?' : conf === 'ocultar' ? 'Tirar da lista do login?' : ''}</span>
                <button class="btn btn-sm btn-danger" onClick=${() => conf === 'pausar' ? pausar(e, true) : ocultar(e, true)}>Confirmar</button>
                <button class="btn btn-sm" onClick=${() => setConfirmar(null)}>Não</button>
              ` : html`
                ${e.pausada
                  ? html`<button class="btn btn-sm btn-teal" onClick=${() => pausar(e, false)}>Reativar</button>`
                  : html`<button class="btn btn-sm" onClick=${() => setConfirmar({ id: e.id, acao: 'pausar' })}>Pausar</button>`}
                ${e.ocultaNoLogin
                  ? html`<button class="btn btn-sm" onClick=${() => ocultar(e, false)}>Mostrar no login</button>`
                  : html`<button class="btn btn-sm btn-ghost" onClick=${() => setConfirmar({ id: e.id, acao: 'ocultar' })}>Ocultar do login</button>`}
              `}
            </div>`;
        })}
      </div>
    </div>`;
}

/* =========================================================
   Projetos: cliente, documentos, ata ao vivo
   ========================================================= */
function TelaProjetos({ sessao, catalogo, toast, abrirOS }) {
  const [projetos, setProjetos] = useState([]);
  const [aberto, setAberto] = useState(null);
  const [novo, setNovo] = useState(false);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'projetos'), orderBy('criadoEm', 'desc')), s => setProjetos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [sessao.empresaId]);

  const lista = projetos.filter(p => !busca || norm(p.cliente?.nome + ' ' + p.titulo + ' ' + p.cliente?.obra).includes(norm(busca)));
  const projeto = projetos.find(p => p.id === aberto);
  if (projeto) return html`<${Projeto} projeto=${projeto} sessao=${sessao} catalogo=${catalogo} toast=${toast} voltar=${() => setAberto(null)} abrirOS=${abrirOS} />`;

  return html`
    <div class="fade-up">
      <div class="hero-ia">
        <div>
          <div class="hero-eyebrow">● Inteligência artificial de marcenaria</div>
          <h2>Reuniões & Projetos</h2>
          <div class="hero-sub">Assistente que filtra conversas paralelas, gera atas por ambiente e móvel e preenche a ordem de serviço sozinho.</div>
        </div>
        <button class="btn btn-laranja" onClick=${() => setNovo(true)}>✦ + Nova reunião / projeto</button>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><span class="hs-ico">📄</span><div><b class="mono">${projetos.length}</b><div>Projetos e reuniões registrados</div></div></div>
        <div class="hero-stat"><span class="hs-ico">✅</span><div><b class="mono">${projetos.filter(p => p.temAta).length}</b><div>Com ata da reunião</div></div></div>
        <div class="hero-stat"><span class="hs-ico">🗂️</span><div><b class="mono">${projetos.filter(p => p.osNumero).length}</b><div>Já viraram ordem de serviço</div></div></div>
      </div>
      <div class="page-head" style=${{ marginTop: '4px' }}>
        <div class="sec-title">Histórico (${projetos.length})</div>
      </div>
      <input id="busca-proj" class="inp" placeholder="Buscar cliente ou obra…" value=${busca} onInput=${e => setBusca(e.target.value)} style=${{ marginBottom: '12px' }} />
      <div class="list">
        ${lista.length === 0 && html`<div class="card muted">Nenhum projeto ainda. Clique em <b>+ Novo projeto</b> para começar pelo cliente.</div>`}
        ${lista.map(p => html`
          <div key=${p.id} class="list-item" onClick=${() => setAberto(p.id)}>
            <div class="grow">
              <div class="title">${p.cliente?.nome || 'Sem nome'}</div>
              <div class="dim">${[p.titulo, p.cliente?.obra].filter(Boolean).join(' · ') || '—'} · criado em ${fmtData(p.criadoEm)}</div>
            </div>
            ${p.temAta && html`<span class="chip chip-teal">Ata</span>`}
            ${p.qtdDocs ? html`<span class="chip">${p.qtdDocs} doc.</span>` : null}
            ${p.osNumero ? html`<span class="chip chip-accent">OS ${numOS(p.osNumero)}</span>` : null}
          </div>`)}
      </div>
      ${novo && html`<${NovoProjeto} sessao=${sessao} projetos=${projetos} fechar=${() => setNovo(false)} criado=${(id) => { setNovo(false); setAberto(id); }} toast=${toast} />`}
    </div>`;
}

function NovoProjeto({ sessao, projetos, fechar, criado, toast }) {
  const [f, setF] = useState({ nome: '', telefone: '', endereco: '', obra: '', titulo: '' });
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState(null);
  const set = (k) => (e) => setF(v => ({ ...v, [k]: e.target.value }));
  const salvar = async (forcar) => {
    if (!f.nome.trim()) return setErro('Informe o nome do cliente.');
    const igual = projetos.find(p => norm(p.cliente?.nome) === norm(f.nome) && norm(p.titulo) === norm(f.titulo));
    if (igual && !forcar) { setAviso(igual); return; }
    const { addDoc } = F().fsMod;
    const ref = await addDoc(col('empresas', sessao.empresaId, 'projetos'), {
      cliente: { nome: f.nome.trim(), telefone: f.telefone.trim(), endereco: f.endereco.trim(), obra: f.obra.trim() },
      titulo: f.titulo.trim(), criadoEm: nowIso(), criadoPor: sessao.nome, qtdDocs: 0, temAta: false,
    });
    toast('Projeto criado.', 'ok');
    criado(ref.id);
  };
  return html`
    <div class="modal-bg" onClick=${e => e.target === e.currentTarget && fechar()}>
      <div class="modal">
        <h3>Novo projeto</h3>
        ${erro && html`<div class="error-box">${erro}</div>`}
        ${aviso && html`<div class="warn-box">Já existe um projeto de <b>${aviso.cliente?.nome}</b>${aviso.titulo ? ' (' + aviso.titulo + ')' : ''}. Abra o existente, ou dê um título diferente (ex: "Dormitório casal").
          <div class="row" style=${{ marginTop: '8px' }}>
            <button class="btn btn-sm btn-teal" onClick=${() => criado(aviso.id)}>Abrir o existente</button>
            <button class="btn btn-sm" onClick=${() => salvar(true)}>Criar outro mesmo assim</button>
          </div></div>`}
        <div class="field"><label class="lbl" for="np-nome">Cliente</label><input id="np-nome" class="inp" value=${f.nome} onInput=${set('nome')} autoFocus /></div>
        <div class="field"><label class="lbl" for="np-tit">Título do projeto</label><input id="np-tit" class="inp" placeholder="Ex: Apartamento completo, Cozinha e área gourmet" value=${f.titulo} onInput=${set('titulo')} /></div>
        <div class="grid2">
          <div class="field"><label class="lbl" for="np-tel">Telefone</label><input id="np-tel" class="inp" value=${f.telefone} onInput=${set('telefone')} /></div>
          <div class="field"><label class="lbl" for="np-obra">Obra / Condomínio</label><input id="np-obra" class="inp" value=${f.obra} onInput=${set('obra')} /></div>
        </div>
        <div class="field"><label class="lbl" for="np-end">Endereço da obra</label><input id="np-end" class="inp" value=${f.endereco} onInput=${set('endereco')} /></div>
        <div class="row" style=${{ justifyContent: 'flex-end' }}>
          <button class="btn btn-ghost" onClick=${fechar}>Cancelar</button>
          <button class="btn btn-primary" onClick=${() => salvar(false)}>Criar projeto</button>
        </div>
      </div>
    </div>`;
}

function Projeto({ projeto, sessao, catalogo, toast, voltar, abrirOS }) {
  const [aba, setAba] = useState('docs');
  const [docs, setDocs] = useState([]);
  const [ata, setAta] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [erroGerar, setErroGerar] = useState(null);
  const base = ['empresas', sessao.empresaId, 'projetos', projeto.id];

  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    const u1 = onSnapshot(query(col(...base, 'documentos'), orderBy('criadoEm', 'asc')), s => setDocs(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(docRef(...base, 'ata', 'atual'), s => setAta(s.exists() ? s.data() : { estrutura: null, transcricao: '' }));
    return () => { u1(); u2(); };
  }, [projeto.id]);

  const gerarOS = async () => {
    setErroGerar(null);
    if (!docs.length && !ata?.estrutura) { setErroGerar({ msg: 'Envie o contrato/detalhamento ou faça a ata antes de gerar a OS.' }); return; }
    setGerando(true);
    try {
      const documentos = docs.map(d => `=== ${d.categoria.toUpperCase()}: ${d.nome} ===\n${d.texto || ''}`).join('\n\n');
      const res = await chamarIA('gerar_os', {
        cliente: projeto.cliente, documentos, ata: ata?.estrutura || {}, catalogo: resumoCatalogo(catalogo),
      });
      res.cliente = { ...projeto.cliente, ...Object.fromEntries(Object.entries(res.cliente || {}).filter(([, v]) => v)) };
      const { id, numero } = await criarOS(sessao, res, { projetoId: projeto.id, origem: 'ia' });
      await F().fsMod.updateDoc(docRef(...base), { osId: id, osNumero: numero });
      toast(`OS nº ${numOS(numero)} criada. Confira os campos em amarelo.`, 'ok');
      abrirOS(id);
    } catch (e) {
      setErroGerar({ msg: e.message, dup: e.duplicada });
    }
    setGerando(false);
  };

  return html`
    <div class="fade-up">
      <button class="btn btn-ghost btn-sm" onClick=${voltar} style=${{ marginTop: '6px' }}>← Projetos</button>
      <div class="page-head">
        <div>
          <h2>${projeto.cliente?.nome}</h2>
          <div class="dim">${[projeto.titulo, projeto.cliente?.obra, projeto.cliente?.endereco, projeto.cliente?.telefone].filter(Boolean).join(' · ')}</div>
        </div>
        <div class="row">
          ${projeto.osId && html`<button class="btn" onClick=${() => abrirOS(projeto.osId)}>Abrir OS ${numOS(projeto.osNumero)}</button>`}
          <button class="btn btn-primary" onClick=${gerarOS} disabled=${gerando}>${gerando ? 'Gerando OS… (até 1 min)' : '⚡ Gerar OS automática'}</button>
        </div>
      </div>
      ${erroGerar && html`<div class="error-box" style=${{ marginBottom: '12px' }}>${erroGerar.msg}
        ${erroGerar.dup && html` <button class="btn btn-sm" style=${{ marginLeft: '8px' }} onClick=${() => abrirOS(erroGerar.dup.id)}>Abrir OS ${numOS(erroGerar.dup)}</button>`}</div>`}
      <div class="nav" style=${{ paddingTop: 0 }}>
        <button class=${'nav-tile' + (aba === 'docs' ? ' on' : '')} onClick=${() => setAba('docs')}><span class="ico">📄</span>Contrato e detalhamentos ${docs.length ? `(${docs.length})` : ''}</button>
        <button class=${'nav-tile' + (aba === 'ata' ? ' on' : '')} onClick=${() => setAba('ata')}><span class="ico">🎙️</span>Ata da reunião</button>
      </div>
      ${aba === 'docs'
        ? html`<${Documentos} base=${base} docs=${docs} sessao=${sessao} toast=${toast} />`
        : html`<${AtaAoVivo} base=${base} ata=${ata} catalogo=${catalogo} toast=${toast} />`}
    </div>`;
}

function Documentos({ base, docs, sessao, toast }) {
  const [categoria, setCategoria] = useState('contrato');
  const [fila, setFila] = useState([]);
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);
  const [ver, setVer] = useState(null);

  const enviar = async (files) => {
    const lista = [...files];
    for (const file of lista) {
      const key = rand(6);
      setFila(f => [...f, { key, nome: file.name, status: 'Lendo arquivo…' }]);
      const upd = (status, erro) => setFila(f => f.map(x => x.key === key ? { ...x, status, erro } : x));
      try {
        let { texto, imagens, paginas } = await extrairArquivo(file);
        if (!texto && imagens.length) {
          upd('Lendo a imagem com IA…');
          const r = await chamarIA('ler_imagens', {}, imagens);
          texto = String(r?.texto || '');
        }
        if (!texto.trim()) throw new Error('Não encontrei texto nesse arquivo.');
        const { addDoc, updateDoc, increment } = F().fsMod;
        await addDoc(col(...base, 'documentos'), { nome: file.name, categoria, texto: texto.slice(0, 600000), paginas: paginas || null, criadoEm: nowIso(), criadoPor: sessao.nome });
        await updateDoc(docRef(...base), { qtdDocs: increment(1) });
        upd('Pronto ✓');
        setTimeout(() => setFila(f => f.filter(x => x.key !== key)), 2500);
      } catch (e) { upd('Erro', e.message); }
    }
  };

  const remover = async (d) => {
    const { deleteDoc, updateDoc, increment } = F().fsMod;
    await deleteDoc(docRef(...base, 'documentos', d.id));
    await updateDoc(docRef(...base), { qtdDocs: increment(-1) });
    toast('Documento removido.');
  };

  return html`
    <div class="stack">
      <div class="card stack">
        <div class="row">
          <span class="lbl" style=${{ margin: 0 }}>Tipo do documento:</span>
          ${['contrato', 'detalhamento', 'outro'].map(c => html`
            <button key=${c} class=${'btn btn-sm' + (categoria === c ? ' btn-teal' : '')} onClick=${() => setCategoria(c)}>${c === 'contrato' ? 'Contrato' : c === 'detalhamento' ? 'Detalhamento / projeto' : 'Outro'}</button>`)}
        </div>
        <div class=${'drop-zone' + (over ? ' over' : '')}
          onClick=${() => inputRef.current.click()}
          onDragOver=${e => { e.preventDefault(); setOver(true); }} onDragLeave=${() => setOver(false)}
          onDrop=${e => { e.preventDefault(); setOver(false); enviar(e.dataTransfer.files); }}>
          <div style=${{ fontSize: '28px' }}>📎</div>
          <div style=${{ fontWeight: 700 }}>Arraste aqui ou clique para escolher</div>
          <div class="dim">PDF, Word (.docx), Excel, texto ou foto do documento</div>
          <input ref=${inputRef} type="file" multiple hidden accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,image/*" onChange=${e => { enviar(e.target.files); e.target.value = ''; }} />
        </div>
        ${fila.map(f => html`<div key=${f.key} class=${f.erro ? 'error-box' : 'dim'}>${f.nome}: ${f.status}${f.erro ? ' — ' + f.erro : ''}</div>`)}
      </div>
      <div class="list">
        ${docs.map(d => html`
          <div key=${d.id} class="list-item" style=${{ cursor: 'default' }}>
            <span style=${{ fontSize: '22px' }}>${d.categoria === 'contrato' ? '📝' : d.categoria === 'detalhamento' ? '📐' : '📄'}</span>
            <div class="grow">
              <div class="title">${d.nome}</div>
              <div class="dim">${d.categoria} · ${(d.texto || '').length.toLocaleString('pt-BR')} caracteres lidos · ${fmtData(d.criadoEm)}</div>
            </div>
            <button class="btn btn-sm" onClick=${() => setVer(d)}>Ver texto</button>
            <button class="btn btn-sm btn-danger" onClick=${() => remover(d)}>Remover</button>
          </div>`)}
      </div>
      ${ver && html`
        <div class="modal-bg" onClick=${e => e.target === e.currentTarget && setVer(null)}>
          <div class="modal" style=${{ maxWidth: '760px' }}>
            <div class="row"><h3 style=${{ flex: 1 }}>${ver.nome}</h3><button class="btn btn-sm" onClick=${() => setVer(null)}>Fechar</button></div>
            <pre class="transcript" style=${{ maxHeight: '65vh', whiteSpace: 'pre-wrap', margin: 0 }}>${ver.texto}</pre>
          </div>
        </div>`}
    </div>`;
}

function AtaAoVivo({ base, ata, catalogo, toast }) {
  const [interim, setInterim] = useState('');
  const [transcricao, setTranscricao] = useState('');
  const [estrutura, setEstrutura] = useState(null);
  const [pendente, setPendente] = useState('');
  const [processando, setProcessando] = useState(false);
  const [erroIA, setErroIA] = useState('');
  const [nota, setNota] = useState('');
  const carregado = useRef(false);
  const ultimoEnvio = useRef(Date.now());
  const transcRef = useRef(null);
  const estadoRef = useRef({});
  estadoRef.current = { pendente, estrutura, processando, transcricao };

  // Carrega o que já foi salvo, uma vez.
  useEffect(() => {
    if (ata && !carregado.current) {
      carregado.current = true;
      setTranscricao(ata.transcricao || '');
      setEstrutura(ata.estrutura || null);
    }
  }, [ata]);

  const fala = useFala({
    onFinal: (t) => {
      if (!t) return;
      const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setTranscricao(v => v + (v ? '\n' : '') + `[${hora}] ${t}`);
      setPendente(v => v + ' ' + t);
    },
    onInterim: setInterim,
  });

  useEffect(() => { if (transcRef.current) transcRef.current.scrollTop = transcRef.current.scrollHeight; }, [transcricao, interim]);

  const salvar = async (dados) => {
    const { setDoc, updateDoc } = F().fsMod;
    await setDoc(docRef(...base, 'ata', 'atual'), { ...dados, atualizadoEm: nowIso() }, { merge: true });
    if (dados.estrutura) await updateDoc(docRef(...base), { temAta: true }).catch(() => {});
  };

  const atualizarAta = useCallback(async () => {
    const { pendente: trecho, estrutura: atual, processando: busy, transcricao: tudo } = estadoRef.current;
    if (busy || !trecho.trim()) return;
    setProcessando(true); setErroIA('');
    ultimoEnvio.current = Date.now();
    const enviado = trecho;
    try {
      const nova = await chamarIA('ata', { ataAtual: atual || {}, trecho: enviado, catalogo: resumoCatalogo(catalogo.filter(c => c.tipo !== 'Puxador')).slice(0, 9000) });
      setEstrutura(nova);
      setPendente(v => v.startsWith(enviado) ? v.slice(enviado.length) : v);
      await salvar({ estrutura: nova, transcricao: tudo });
    } catch (e) { setErroIA(e.message); }
    setProcessando(false);
  }, [catalogo]);

  // Atualiza a ata sozinho enquanto o microfone está ligado.
  useEffect(() => {
    if (!fala.ouvindo) return;
    const t = setInterval(() => {
      const p = estadoRef.current.pendente.trim();
      const passou = Date.now() - ultimoEnvio.current;
      if ((p.length >= 400 && passou > 25000) || (p.length >= 40 && passou > 75000)) atualizarAta();
    }, 5000);
    return () => clearInterval(t);
  }, [fala.ouvindo, atualizarAta]);

  // Guarda a transcrição de tempos em tempos (não perde nada se a internet cair).
  useEffect(() => {
    if (!carregado.current) return;
    const t = setTimeout(() => { salvar({ transcricao }).catch(() => {}); }, 8000);
    return () => clearTimeout(t);
  }, [transcricao]);

  const parar = async () => {
    fala.parar();
    setTimeout(() => atualizarAta(), 600);
  };

  const addNota = () => {
    if (!nota.trim()) return;
    setTranscricao(v => v + (v ? '\n' : '') + `[nota] ${nota.trim()}`);
    setPendente(v => v + ' ' + nota.trim());
    setNota('');
  };

  // Edição simples da ata (remover e acrescentar pontos).
  const editarEstrutura = async (fn) => {
    const e = clone(estrutura) || { ambientes: [], decisoes: [], pendencias: [] };
    fn(e);
    setEstrutura(e);
    await salvar({ estrutura: e });
  };

  const [limpar, setLimpar] = useState(false);
  const zerar = async () => {
    setTranscricao(''); setEstrutura(null); setPendente(''); setLimpar(false);
    await F().fsMod.setDoc(docRef(...base, 'ata', 'atual'), { estrutura: null, transcricao: '', atualizadoEm: nowIso() });
    await F().fsMod.updateDoc(docRef(...base), { temAta: false }).catch(() => {});
    toast('Ata apagada.');
  };

  return html`
    <div class="stack">
      <div class="card stack">
        <div class="row">
          ${fala.ouvindo
            ? html`<button class="btn btn-lg btn-mic-on pulse" onClick=${parar}>■ Parar gravação</button>`
            : html`<button class="btn btn-lg btn-primary" onClick=${fala.iniciar}>🎙️ ${transcricao ? 'Continuar ouvindo a reunião' : 'Começar a ouvir a reunião'}</button>`}
          <button class="btn" onClick=${atualizarAta} disabled=${processando || !pendente.trim()}>${processando ? 'Organizando a ata…' : '↻ Atualizar ata agora'}</button>
          <span class="dim" style=${{ marginLeft: 'auto' }}>${fala.ouvindo ? 'Ouvindo · a ata se atualiza sozinha' : pendente.trim() ? 'Há fala nova ainda não organizada' : ''}</span>
        </div>
        ${!fala.suportado && html`<div class="warn-box">Para ouvir a reunião, abra o app no <b>Google Chrome</b> ou no <b>Microsoft Edge</b>.</div>`}
        ${fala.erro && html`<div class="error-box">${fala.erro}</div>`}
        ${erroIA && html`<div class="error-box">${erroIA}</div>`}
        <div>
          <div class="lbl">Transcrição (o que o microfone ouviu)</div>
          <div class="transcript" ref=${transcRef}>
            ${transcricao || (!interim && html`<span class="dim">Deixe o computador ou tablet no centro da mesa. Conversas paralelas ficam na transcrição, mas não entram na ata.</span>`)}
            ${interim && html`<span class="interim">${transcricao ? '\n' : ''}${interim}</span>`}
          </div>
        </div>
        <div class="row" style=${{ flexWrap: 'nowrap' }}>
          <input id="ata-nota" class="inp" placeholder="Anotar algo à mão (ex: cliente vai mandar foto do porcelanato)" value=${nota} onInput=${e => setNota(e.target.value)} onKeyDown=${e => e.key === 'Enter' && addNota()} />
          <button class="btn" onClick=${addNota}>Anotar</button>
        </div>
      </div>

      ${estrutura ? html`
        <div class="stack">
          ${estrutura.resumo && html`<div class="card"><div class="section-label">Resumo</div><div>${estrutura.resumo}</div></div>`}
          ${(estrutura.ambientes || []).map((a, ai) => html`
            <div key=${ai} class="amb">
              <div class="amb-head"><span>🏠</span><h3>${a.nome}</h3></div>
              <div class="amb-body">
                ${(a.pontosGerais || []).length > 0 && html`<ul class="pontos">${a.pontosGerais.map((p, pi) => html`<li key=${pi}>${p} <button class="x-btn" title="Remover" onClick=${() => editarEstrutura(e => e.ambientes[ai].pontosGerais.splice(pi, 1))}>✕</button></li>`)}</ul>`}
                ${(a.moveis || []).map((m, mi) => html`
                  <div key=${mi} class="movel-block">
                    <h4>${m.nome}</h4>
                    <ul class="pontos">${(m.pontos || []).map((p, pi) => html`<li key=${pi}>${p} <button class="x-btn" title="Remover" onClick=${() => editarEstrutura(e => e.ambientes[ai].moveis[mi].pontos.splice(pi, 1))}>✕</button></li>`)}</ul>
                  </div>`)}
              </div>
            </div>`)}
          <div class="grid2">
            <div class="card"><div class="section-label">Decisões gerais</div>
              <ul class="pontos">${(estrutura.decisoes || []).map((p, i) => html`<li key=${i}>${p} <button class="x-btn" onClick=${() => editarEstrutura(e => e.decisoes.splice(i, 1))}>✕</button></li>`)}</ul>
              ${!(estrutura.decisoes || []).length && html`<div class="dim">Nenhuma ainda.</div>`}
            </div>
            <div class="card"><div class="section-label" style=${{ color: 'var(--warn)' }}>Pendências</div>
              <ul class="pontos">${(estrutura.pendencias || []).map((p, i) => html`<li key=${i}>${p} <button class="x-btn" onClick=${() => editarEstrutura(e => e.pendencias.splice(i, 1))}>✕</button></li>`)}</ul>
              ${!(estrutura.pendencias || []).length && html`<div class="dim">Nenhuma.</div>`}
            </div>
          </div>
        </div>
      ` : html`<div class="card muted">A ata aparece aqui organizada por ambiente e por móvel, conforme a reunião acontece.</div>`}

      ${(transcricao || estrutura) && html`
        <div class="row" style=${{ justifyContent: 'flex-end' }}>
          ${limpar
            ? html`<span class="dim">Apagar a ata e a transcrição?</span><button class="btn btn-sm btn-danger" onClick=${zerar}>Sim, apagar</button><button class="btn btn-sm" onClick=${() => setLimpar(false)}>Não</button>`
            : html`<button class="btn btn-sm btn-ghost" onClick=${() => setLimpar(true)}>Apagar ata</button>`}
        </div>`}
    </div>`;
}

/* =========================================================
   Ordens de serviço: lista e editor
   ========================================================= */
function TelaOS({ sessao, catalogo, toast, osAberta, setOsAberta }) {
  const [reab, setReab] = useState(null);
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState(null);
  const [pedirNome, setPedirNome] = useState(false);
  const [nomeCli, setNomeCli] = useState('');
  const [execucao, setExecucao] = useState('');
  const [soPrazo, setSoPrazo] = useState(false);
  const [vista, setVista] = useState(() => { try { return localStorage.getItem('osm_vista2') || 'cliente'; } catch { return 'cliente'; } });
  useEffect(() => { try { localStorage.setItem('osm_vista2', vista); } catch {} }, [vista]);
  const [vozInterim, setVozInterim] = useState('');
  const voz = useFala({ onFinal: t => { setBusca(t.replace(/^(buscar|procurar|abrir)\s+/i, '').replace(/^os\s+/i, '').replace(/[.!?]$/, '')); }, onInterim: setVozInterim });

  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [sessao.empresaId]);

  if (osAberta) return html`<${EditorOS} key=${osAberta} osId=${osAberta} sessao=${sessao} catalogo=${catalogo} toast=${toast} voltar=${() => setOsAberta(null)} />`;

  const stOf = (o) => STATUS_OS.find(x => x.v === o.status) ? o.status : (STATUS_OS[0]?.v || 'elaboracao');
  const execOf = (o) => o.modoExecucao || 'interna';
  const filtradas = lista.filter(o =>
    (!status || (status === 'atrasadas' ? atrasada(o) : stOf(o) === status)) &&
    (!execucao || execOf(o) === execucao) &&
    (!soPrazo || !!lerPrazo(o.prazoEntrega)) &&
    (!busca || norm(`${numOS(o)} ${o.numero} ${o.numeroAntigo} ${o.cliente?.nome} ${o.cliente?.obra} ${(o.ambientes || []).map(a => a.nome).join(' ')} ${(STATUS_OS.find(x => x.v === stOf(o)) || {}).t}`).includes(norm(busca))))
    .sort((x, y) => soPrazo ? ((lerPrazo(x.prazoEntrega) || 0) - (lerPrazo(y.prazoEntrega) || 0)) : 0);

  const nova = async () => {
    setErro(null);
    if (!nomeCli.trim()) { setErro({ message: 'Digite o nome do cliente para criar a OS.' }); return; }
    setCriando(true);
    try {
      const { id } = await criarOS(sessao, { cliente: { nome: nomeCli.trim() }, ambientes: [] }, { origem: 'manual' });
      setPedirNome(false); setNomeCli('');
      setOsAberta(id);
    } catch (e) { setErro(e); }
    setCriando(false);
  };

  // Métricas
  const agora = Date.now(), dia = 86400000;
  const ativas = lista.filter(o => stOf(o) !== 'concluida');
  const prox7 = ativas.filter(o => { const d = lerPrazo(o.prazoEntrega); return d && d.getTime() >= agora && d.getTime() - agora <= 7 * dia; }).length;
  const hoje = new Date();
  const noMes = ativas.filter(o => { const d = lerPrazo(o.prazoEntrega); return d && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear(); }).length;
  const noPrazo = ativas.filter(o => !atrasada(o)).length;
  const nExec = (m) => lista.filter(o => execOf(o) === m).length;
  const pc = (n) => lista.length ? ` (${Math.round(n * 100 / lista.length)}%)` : ' (0%)';
  const clientes = new Set(lista.map(o => norm(o.cliente?.nome)).filter(Boolean)).size;
  const tiposAmb = new Set(lista.flatMap(o => (o.ambientes || []).map(a => norm(a.nome))).filter(Boolean)).size;
  const cnt = (v) => lista.filter(o => stOf(o) === v).length;
  const pf = (n) => lista.length ? Math.round(n * 100 / lista.length) + '% do fluxo' : '0% do fluxo';
  const nAtr = lista.filter(atrasada).length;
  const tiles = [
    { t: 'Total de OSs', n: lista.length, s: '100% da carteira', cls: '' },
    ...STATUS_OS.map(x => ({ t: x.t, n: cnt(x.v), s: pf(cnt(x.v)), cls: ({ elaboracao: '', projetos: 'tile-azul', producao: 'tile-teal', liberacao: 'tile-warn', montagem: 'tile-roxo', concluida: 'tile-ok' })[x.v] || 'tile-cust', f: x.v, cor: x.cor })),
    { t: 'Vencidas', n: nAtr, s: nAtr ? 'Precisa de atenção' : 'Em dia', cls: nAtr ? 'tile-danger' : '', f: 'atrasadas' },
  ];

  const cartao = (o) => {
    const x = STATUS_OS.find(y => y.v === stOf(o)) || STATUS_OS[0];
    const nMov = (o.ambientes || []).reduce((n, a) => n + (a.moveis || []).length, 0);
    const nRev = (o.ambientes || []).reduce((n, a) => n + (a.moveis || []).filter(m => (m.revisar || []).length).length, 0);
    return { x, nMov, nRev };
  };

  return html`
    <div class="fade-up stack" style=${{ gap: '16px' }}>
      <div class="page-head" style=${{ margin: 0 }}>
        <div><h2>Ordens de Serviço</h2><div class="dim">Acompanhe a fabricação, prazos e modo de execução de cada projeto</div></div>
        <button class="btn btn-primary" onClick=${() => setPedirNome(v => !v)} disabled=${criando}>+ Nova OS</button>
      </div>
      ${pedirNome && html`
        <div class="card row" style=${{ flexWrap: 'nowrap' }}>
          <input id="nova-os-cli" class="inp" placeholder="Nome do cliente" value=${nomeCli} onInput=${e => setNomeCli(e.target.value)} onKeyDown=${e => e.key === 'Enter' && nova()} autoFocus />
          <button class="btn btn-primary" onClick=${nova} disabled=${criando}>${criando ? 'Criando…' : 'Criar'}</button>
        </div>`}
      ${erro && html`<div class="error-box">${erro.message}
        ${erro.duplicada && html` <button class="btn btn-sm" style=${{ marginLeft: '8px' }} onClick=${() => setOsAberta(erro.duplicada.id)}>Abrir OS ${numOS(erro.duplicada)}</button>`}</div>`}

      <div class="card page-card">
        <div class="row" style=${{ justifyContent: 'space-between', marginBottom: '12px' }}>
          <div><div class="sec-title">〰 Fluxo & métricas</div><div class="dim">Dados da produção e prazos em tempo real</div></div>
          <span class="chip">${lista.length} OSs cadastradas</span>
        </div>
        <div class="tiles">
          ${tiles.map(t => html`
            <button key=${t.t} class=${'tile ' + t.cls + (t.f && status === t.f ? ' sel' : '')} onClick=${() => t.f && setStatus(v => v === t.f ? '' : t.f)}>
              <div class="tile-t">${t.t}</div><div class="tile-n mono">${t.n}</div><div class="tile-s">${t.s}</div>
            </button>`)}
        </div>
        <div class="paineis">
          <div class="painel"><div class="painel-t">📅 Prazos & entregas</div>
            <div class="kv"><span>Próximos 7 dias</span><b>${prox7} entregas</b></div>
            <div class="kv"><span>Previstas neste mês</span><b>${noMes}</b></div>
            <div class="kv"><span>Ativas no prazo</span><b style=${{ color: 'var(--ok)' }}>${noPrazo}</b></div></div>
          <div class="painel"><div class="painel-t">🔀 Modos de execução</div>
            <div class="kv"><span>Fabricação interna</span><b>${nExec('interna')}${pc(nExec('interna'))}</b></div>
            <div class="kv"><span>Terceirizada</span><b style=${{ color: 'var(--warn)' }}>${nExec('terceirizada')}${pc(nExec('terceirizada'))}</b></div>
            <div class="kv"><span>Híbrida / mista</span><b style=${{ color: 'var(--roxo)' }}>${nExec('mista')}${pc(nExec('mista'))}</b></div></div>
          <div class="painel"><div class="painel-t">📈 Volume & eficiência</div>
            <div class="kv"><span>Clientes atendidos</span><b>${clientes}</b></div>
            <div class="kv"><span>Tipos de ambientes</span><b>${tiposAmb}</b></div>
            <div class="kv"><span>Projetos em andamento</span><b style=${{ color: 'var(--warn)' }}>${ativas.length}</b></div></div>
        </div>
      </div>

      <div class="card page-card">
        <div class="row" style=${{ gap: '8px' }}>
          <div class="busca-voz">
            <input id="busca-os" class="inp" placeholder="🔍 Pesquisar por OS, cliente, obra, ambiente… ou fale" value=${busca + (vozInterim ? ' ' + vozInterim : '')} onInput=${e => setBusca(e.target.value)} />
            ${voz.suportado && html`<button class=${'btn btn-sm' + (voz.ouvindo ? ' btn-mic-on pulse' : '')} onClick=${() => { if (voz.ouvindo) voz.parar(); else { setBusca(''); voz.iniciar(); } }}>🎤 ${voz.ouvindo ? 'Ouvindo…' : 'Falar'}</button>`}
          </div>
          <span class="dim">Execução:</span>
          ${[['', 'Todas'], ['interna', 'Interna'], ['terceirizada', 'Terceirizada'], ['mista', 'Mista']].map(([v, t]) => html`<button key=${t} class=${'pill' + (execucao === v ? ' on' : '')} onClick=${() => setExecucao(v)}>${t}</button>`)}
          <button class=${'pill' + (soPrazo ? ' on' : '')} onClick=${() => setSoPrazo(v => !v)}>📅 Prazos</button>
          <div class="pillnav" style=${{ marginLeft: 'auto' }}>
            ${[['cliente', '👥 Por cliente'], ['grade', '▦ Grade'], ['quadro', '▥ Quadro'], ['galeria', '▣ Galeria'], ['compacta', '☰ Compacta']].map(([v, t]) => html`<button key=${v} class=${vista === v ? 'on' : ''} onClick=${() => setVista(v)}>${t}</button>`)}
          </div>
        </div>
        <div class="row dim" style=${{ gap: '6px', marginTop: '8px', fontSize: '12px' }}>
          Exemplos de fala: ${['Buscar Davi', 'Cozinha', 'OS 0001', 'Em produção'].map(x => html`<button key=${x} class="pill" onClick=${() => setBusca(x.replace(/^Buscar /, '').replace(/^OS /, '').replace('Em produção', 'Produção'))}>🎤 "${x}"</button>`)}
        </div>
      </div>

      ${filtradas.length === 0 ? html`<div class="vazio"><div style=${{ fontSize: '24px' }}>📄</div><b>Nenhuma ordem de serviço encontrada</b><div class="dim">${lista.length ? 'Nenhuma OS corresponde aos filtros.' : 'Crie a primeira OS, gere a partir de uma reunião ou importe as antigas.'}</div></div>`
      : vista === 'cliente' ? (() => {
        const g = {};
        filtradas.forEach(o => { const k = norm(o.cliente?.nome) || '—'; (g[k] = g[k] || { nome: o.cliente?.nome || 'Sem cliente', oss: [] }).oss.push(o); });
        const salvarEt = async (o, k, st, motivo) => {
          const et = { ...(o.execucao?.etapas || {}) }; et[k] = { ...(et[k] || {}), status: st, ...(st === 'pronto' ? { concluidaEm: nowIso(), concluidaPor: sessao.nome } : {}), ...(st === 'andamento' && !et[k]?.iniciadaEm ? { iniciadaEm: nowIso(), iniciadaPor: sessao.nome } : {}) };
          const patch = { execucao: { ...(o.execucao || {}), etapas: et }, atualizadoEm: nowIso(), atualizadoPor: sessao.nome };
          if (motivo) patch.reaberturas = [...(o.reaberturas || []), { oque: 'Etapa ' + (ETAPAS_FAB.find(e => e[0] === k) || [])[1] + ' reaberta', motivo, quem: sessao.nome, quando: nowIso() }];
          const semMont = ETAPAS_FAB.filter(([x]) => x !== 'montagem').every(([x]) => et[x]?.status === 'pronto');
          if (st === 'pronto' && ['elaboracao', 'projetos'].includes(stOf(o))) { patch.status = 'producao'; patch.statusHist = [...(o.statusHist || []), { st: 'producao', em: nowIso(), quem: sessao.nome }]; }
          if (st === 'pronto' && semMont && stOf(o) === 'producao') { patch.status = 'liberacao'; patch.statusHist = [...(o.statusHist || []), { st: 'liberacao', em: nowIso(), quem: sessao.nome }]; }
          if (st === 'pronto' && k === 'montagem' && ETAPAS_FAB.every(([x]) => et[x]?.status === 'pronto')) { patch.status = 'concluida'; patch.statusHist = [...(o.statusHist || []), { st: 'concluida', em: nowIso(), quem: sessao.nome }]; }
          try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), patch); toast((ETAPAS_FAB.find(e => e[0] === k) || [])[1] + (st === 'pronto' ? ' concluída' : ' reaberta'), 'ok'); } catch (e) { toast(e.message, 'erro'); }
        };
        const avancar = async (o) => {
          const i = STATUS_OS.findIndex(x => x.v === stOf(o)); const prox = STATUS_OS[i + 1]; if (!prox) return;
          try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), { status: prox.v, statusHist: [...(o.statusHist || []), { st: prox.v, em: nowIso(), quem: sessao.nome }], atualizadoEm: nowIso(), atualizadoPor: sessao.nome }); toast(numOS(o) + ' → ' + prox.t.replace(/^\d\. /, ''), 'ok'); }
          catch (e) { toast(e.message, 'erro'); }
        };
        const grupos = Object.values(g).map(x => ({ ...x, ini: x.oss.filter(o => stOf(o) !== 'elaboracao' && stOf(o) !== 'concluida').length }))
          .sort((a, b) => (b.ini > 0) - (a.ini > 0) || a.nome.localeCompare(b.nome));
        const voltar = async (o, alvo, motivo) => {
          try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), { status: alvo.v, statusHist: [...(o.statusHist || []), { st: alvo.v, em: nowIso(), quem: sessao.nome }], reaberturas: [...(o.reaberturas || []), { oque: 'Status: ' + (STATUS_OS.find(x => x.v === stOf(o)) || {}).t + ' → ' + alvo.t, motivo, quem: sessao.nome, quando: nowIso() }], atualizadoEm: nowIso(), atualizadoPor: sessao.nome }); toast(numOS(o) + ' voltou para ' + alvo.t.replace(/^\d+\. /, ''), 'ok'); }
          catch (e) { toast(e.message, 'erro'); }
        };
        return html`${reab && html`<${SenhaMotivo} titulo=${numOS(reab.o) + ': voltar para ' + reab.volta.t.replace(/^\d+\. /, '')} texto="Voltar uma etapa pede motivo e senha." botao="Voltar" onOk=${(m) => voltar(reab.o, reab.volta, m)} fechar=${() => setReab(null)} />`}<div class="os-clis">${grupos.map(x => html`
          <div key=${x.nome} class=${'os-cli' + (x.ini ? ' ativo' : '')} style=${{ '--cc': corCliente(x.nome) }}>
            <div class="os-cli-top"><b>${x.nome}</b><span>${x.oss.length} ${x.oss.length === 1 ? 'OS' : 'OSs'}${x.ini ? html` · <em>▶ ${x.ini} em andamento</em>` : ''}</span></div>
            ${x.oss.slice().sort((a, b) => STATUS_OS.findIndex(s => s.v === stOf(b)) - STATUS_OS.findIndex(s => s.v === stOf(a))).map(o => {
              const st = stOf(o), i = STATUS_OS.findIndex(y => y.v === st), prox = STATUS_OS[i + 1], x2 = STATUS_OS[i] || { c: 'chip', t: st || '' };
              const iniciada = st !== 'elaboracao' && st !== 'concluida';
              return html`<div key=${o.id} class=${'os-cli-os st-bg-' + st + (iniciada ? ' iniciada' : '') + (atrasada(o) ? ' atras' : '')}>
                <button class="os-cli-info" onClick=${() => setOsAberta(o.id)}>
                  <span class="mono">${numOS(o)}${bolinhas(o)}</span>
                  <span class="nm"><b>${(o.ambientes || []).map(a => a.nome).filter(Boolean).join(', ') || o.ambienteResumo || '—'}</b>
                    <small>${o.prazoEntrega ? '🚚 ' + o.prazoEntrega : ''}${atrasada(o) ? ' ⚠ atrasada' : ''}</small></span>
                  <span class="os-trilho">${STATUS_OS.map((s2, j) => html`<i key=${s2.v} title=${s2.t} class=${j < i ? 'f' : j === i ? 'a' : ''}></i>`)}</span>
                  <span class=${x2.c + ' mini'}>${x2.t.replace(/^\d\. /, '').replace('Aguard. liberação p/ entrega', 'Aguard. liberação')}</span>
                </button>
                ${i > 0 && html`<button class="btn-voltar" title=${'Voltar para ' + STATUS_OS[i - 1].t} onClick=${(ev) => { ev.stopPropagation(); setReab({ o, volta: STATUS_OS[i - 1] }); }}>◀</button>`}
                ${prox ? html`<button class="btn-avancar" title=${'Avançar para ' + prox.t} onClick=${(ev) => { ev.stopPropagation(); avancar(o); }}>▶<small>${prox.t.replace(/^\d\. /, '').replace('Aguard. liberação p/ entrega', 'Liberação')}</small></button>` : html`<span class="btn-avancar ok">✓</span>`}
              </div>
`; })}
          </div>`)}</div>`; })()
      : vista === 'quadro' ? html`
        <div class="kanban">
          ${STATUS_OS.map(col => html`
            <div key=${col.v} class="kan-col">
              <div class="kan-head"><span class=${col.c}>${col.t}</span><span class="dim">${filtradas.filter(o => stOf(o) === col.v).length}</span></div>
              ${filtradas.filter(o => stOf(o) === col.v).map(o => { const { nMov } = cartao(o); return html`
                <div key=${o.id} class="kan-card" style=${pinta(o)} onClick=${() => setOsAberta(o.id)}>
                  <div class="os-num">${numOS(o)}${bolinhas(o)}</div>
                  <b>${o.cliente?.nome || '—'}</b>
                  <div class="dim">${(o.ambientes || []).map(a => a.nome).join(', ') || 'Sem ambientes'} · ${nMov} móveis</div>
                  ${atrasada(o) && html`<span class="chip chip-danger">Vencida</span>`}
                </div>`; })}
            </div>`)}
        </div>`
      : vista === 'galeria' || vista === 'grade' ? html`
        <div class=${vista === 'galeria' ? 'galeria' : 'grade'}>
          ${filtradas.map(o => { const { x, nMov, nRev } = cartao(o); return html`
            <div key=${o.id} class="os-card" style=${pinta(o)} onClick=${() => setOsAberta(o.id)}>
              <div class="row" style=${{ justifyContent: 'space-between' }}><span class="os-num">OS ${numOS(o)}${bolinhas(o)}</span><span class=${x.c}>${x.t}</span></div>
              <div class="title" style=${{ fontSize: vista === 'galeria' ? '18px' : '15.5px', fontWeight: 700 }}>${o.cliente?.nome || 'Cliente não informado'}</div>
              ${o.cliente?.obra && html`<div class="dim">${o.cliente.obra}</div>`}
              <div class="row" style=${{ gap: '4px' }}>${(o.ambientes || []).slice(0, vista === 'galeria' ? 8 : 4).map(a => html`<span key=${a.id || a.nome} class="chip">${a.nome}</span>`)}</div>
              <div class="dim">${nMov} móveis · ${({ interna: 'Interna', terceirizada: 'Terceirizada', mista: 'Mista' })[execOf(o)]}${o.prazoEntrega ? ' · prazo ' + o.prazoEntrega : ''}</div>
              <div class="row" style=${{ gap: '4px' }}>
                ${atrasada(o) && html`<span class="chip chip-danger">Vencida</span>`}
                ${nRev > 0 && html`<span class="chip chip-warn">${nRev} p/ revisar</span>`}
                ${o.origem === 'importada' && html`<span class="chip">Importada</span>`}
              </div>
            </div>`; })}
        </div>`
      : html`
        <div class="list">
          ${filtradas.map(o => { const { x, nMov, nRev } = cartao(o); return html`
            <div key=${o.id} class="list-item" style=${pinta(o)} onClick=${() => setOsAberta(o.id)}>
              <div class="os-num">${numOS(o)}${bolinhas(o)}</div>
              <div class="grow">
                <div class="title">${o.cliente?.nome || 'Cliente não informado'}</div>
                <div class="dim">${(o.ambientes || []).map(a => a.nome).filter(Boolean).join(', ') || 'Sem ambientes'} · ${nMov} móveis${o.prazoEntrega ? ' · prazo ' + o.prazoEntrega : ''}</div>
              </div>
              ${atrasada(o) && html`<span class="chip chip-danger">Vencida</span>`}
              ${nRev > 0 && html`<span class="chip chip-warn">${nRev} p/ revisar</span>`}
              ${o.revisao?.em && o.revisao.em >= (o.atualizadoEm || '') ? html`<span class="chip chip-ok" title=${'Revisada por ' + o.revisao.por}>✅ Revisada</span>` : html`<span class="chip" title=${'Alterada por ' + (o.atualizadoPor || '')}>✏️ ${o.atualizadoPor || ''}</span>`}
              <span class=${x.c}>${x.t}</span>
            </div>`; })}
        </div>`}
    </div>`;
}

function EditorOS({ osId, sessao, catalogo, toast, voltar }) {
  const [os, setOs] = useState(null);
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [dup, setDup] = useState(null);
  const [falaTexto, setFalaTexto] = useState('');
  const [falaInterim, setFalaInterim] = useState('');
  const [aplicandoVoz, setAplicandoVoz] = useState(false);
  const [erroVoz, setErroVoz] = useState('');
  const [imprimir, setImprimir] = useState(false);
  const [apagar, setApagar] = useState(false);
  const ref = docRef('empresas', sessao.empresaId, 'os', osId);
  const sujoRef = useRef(false);
  sujoRef.current = sujo;
  const versao = useRef(0);

  useEffect(() => {
    const { onSnapshot } = F().fsMod;
    return onSnapshot(ref, (s) => {
      if (!s.exists()) { setOs(false); return; }
      // Não sobrescreve o que está sendo digitado aqui; recebe mudanças de outros aparelhos quando não há edição local.
      if (!sujoRef.current) setOs({ id: s.id, ...s.data() });
    });
  }, [osId]);

  const alterar = (fn0) => {
    const fn = (o) => { const antes = o.status; fn0(o); if (o.status && o.status !== antes) o.statusHist = [...(o.statusHist || []), { st: o.status, em: nowIso(), quem: sessao.nome }]; };
    versao.current++;
    setOs(o => { const n = clone(o); fn(n); return n; });
    setSujo(true);
  };

  // Salva sozinho 1,2 s depois da última alteração.
  useEffect(() => {
    if (!sujo || !os) return;
    const t = setTimeout(async () => {
      const v = versao.current;
      setSalvando(true);
      try {
        const limpo = sanearOS(os);
        const fp = await impressaoDigital(limpo);
        const outra = await acharDuplicada(sessao.empresaId, fp, osId);
        if (outra) { setDup(outra); setSalvando(false); return; }
        setDup(null);
        const { updateDoc } = F().fsMod;
        await updateDoc(ref, { ...limpo, padrao: os.padrao || {}, execucao: os.execucao || {}, tamponamento: os.tamponamento || {}, responsavel: os.responsavel || '', arquiteto: os.arquiteto || '', modoExecucao: os.modoExecucao || 'interna', ambienteResumo: os.ambienteResumo || '', cores: temCores(os) ? os.cores : null, historico: os.historico || [], alteracoes: os.alteracoes || [], reaberturas: os.reaberturas || [], ata: os.ata || null, contrato: os.contrato || null, parceiros: os.parceiros || {}, statusHist: os.statusHist || [], status: os.status || 'elaboracao', fingerprint: fp, atualizadoEm: nowIso(), atualizadoPor: sessao.nome });
        if (versao.current === v) setSujo(false);
      } catch (e) { toast('Não salvou: ' + e.message, 'erro'); }
      setSalvando(false);
    }, 1200);
    return () => clearTimeout(t);
  }, [os, sujo]);

  const fala = useFala({
    onFinal: (t) => setFalaTexto(v => (v ? v + ' ' : '') + t),
    onInterim: setFalaInterim,
  });
  const [etapa, setEtapa] = useState(1);
  const [organizando, setOrganizando] = useState(false);
  const [liberada, setLiberada] = useState(false);
  const [snapLib, setSnapLib] = useState(null);
  const [motivoLib, setMotivoLib] = useState('');
  const [imprimirPedido, setImprimirPedido] = useState(null);
  const [pedirVoltar, setPedirVoltar] = useState(null);
  const [pedirLib, setPedirLib] = useState(false);
  const fabricantesMDF = useMemo(() => [...new Set(catalogo.filter(c => c.tipo === 'MDF').map(c => c.fabricante).filter(Boolean))].sort(), [catalogo]);

  const aplicarVoz = async () => {
    fala.parar();
    const texto = (falaTexto + ' ' + falaInterim).trim();
    if (!texto) return;
    setAplicandoVoz(true); setErroVoz('');
    try {
      const atual = sanearOS(os);
      const nova = sanearOS(await chamarIA('voz_os', { fala: texto, os: atual, catalogo: resumoCatalogo(catalogo) }));
      alterar(o => { o.cliente = nova.cliente; o.prazoEntrega = nova.prazoEntrega; o.observacoesGerais = nova.observacoesGerais; o.ambientes = nova.ambientes; if (nova.padrao) o.padrao = { ...(o.padrao || {}), ...nova.padrao }; if (nova.tamponamento?.tipo) o.tamponamento = nova.tamponamento; });
      setFalaTexto(''); setFalaInterim('');
      toast('Aplicado na OS.', 'ok');
    } catch (e) { setErroVoz(e.message); }
    setAplicandoVoz(false);
  };

  const excluir = async () => {
    await F().fsMod.deleteDoc(ref);
    toast('OS excluída.');
    voltar();
  };

  if (os === null) return html`<div class="card muted">Carregando OS…</div>`;
  if (os === false) return html`<div class="card">Essa OS não existe mais. <button class="btn btn-sm" onClick=${voltar}>Voltar</button></div>`;

  const setCli = (k) => (e) => alterar(o => { o.cliente = o.cliente || {}; o.cliente[k] = e.target.value; });
  const st = STATUS_OS.find(s => s.v === os.status) || STATUS_OS[0];

  const idxSt = Math.max(0, STATUS_OS.findIndex(x => x.v === (os.status || 'elaboracao')));
  const prazoD = lerPrazo(os.prazoEntrega);
  const diasPrazo = prazoD ? Math.ceil((prazoD.getTime() - Date.now()) / 86400000) : null;
  const ETAPAS = [
    { n: 1, t: 'Dados da OS', s: 'Cliente, obra & prazos' },
    { n: 2, t: 'Especificações', s: 'MDF, ferragens, LED & móveis' },
    { n: 3, t: 'Execução', s: 'Interna vs. terceirizada' },
  ];
  const ir = (n) => { setEtapa(n); window.scrollTo(0, 0); };
  const bloqueada = os.status === 'concluida' && !liberada;
  const pdf = () => { setImprimir(true); setTimeout(() => { window.print(); setImprimir(false); }, 150); };
  const P = os.padrao || {};
  const setP = (fn) => alterar(o => { o.padrao = o.padrao || {}; fn(o.padrao); });

  const organizar = async () => {
    setOrganizando(true);
    try {
      const nova = await chamarIA('organizar_os', { os: { ...sanearOS(os), padrao: os.padrao || {}, tamponamento: os.tamponamento || {}, responsavel: os.responsavel || '', arquiteto: os.arquiteto || '' }, catalogo: resumoCatalogo(catalogo) });
      const n = sanearOS(nova);
      alterar(o => {
        o.cliente = { ...o.cliente, ...Object.fromEntries(Object.entries(n.cliente).filter(([, v]) => v)) };
        if (n.ambientes.length) o.ambientes = n.ambientes;
        if (n.observacoesGerais) o.observacoesGerais = n.observacoesGerais;
        if (n.prazoEntrega && !o.prazoEntrega) o.prazoEntrega = n.prazoEntrega;
        if (n.padrao) o.padrao = { ...(o.padrao || {}), ...n.padrao };
        if (n.tamponamento?.tipo && !o.tamponamento?.tipo) o.tamponamento = n.tamponamento;
        ['responsavel', 'arquiteto', 'ambienteResumo'].forEach(k => { if (n[k] && !o[k]) o[k] = n[k]; });
      });
      toast('Pronto: informações colocadas nos campos certos. Confira.', 'ok');
    } catch (e) { toast('Não consegui organizar agora: ' + e.message, 'erro'); }
    setOrganizando(false);
  };
  const cartaoVoz = html`
        <div class="card stack" style=${{ borderColor: fala.ouvindo ? 'var(--danger)' : undefined }}>
          <div class="row">
            ${fala.ouvindo
              ? html`<button class="btn btn-mic-on pulse" onClick=${aplicarVoz}>■ Parar e aplicar na OS</button>`
              : html`<button class="btn btn-teal" onClick=${fala.iniciar} disabled=${aplicandoVoz}>🎤 Preencher falando</button>`}
            ${!fala.ouvindo && falaTexto && html`<button class="btn" onClick=${aplicarVoz} disabled=${aplicandoVoz}>${aplicandoVoz ? 'Aplicando…' : 'Aplicar na OS'}</button>`}
            ${aplicandoVoz && html`<span class="dim">Aplicando o que você falou…</span>`}
          </div>
          ${fala.ouvindo || falaTexto ? html`<div class="transcript" style=${{ maxHeight: '120px' }}>${falaTexto}<span class="interim"> ${falaInterim}</span></div>`
            : html`<div class="dim">Ex.: "Na cozinha, balcão da pia 1800 por 900 por 550, caixa Duratex Branco Diamante 18, frente Arauco Sálvia, três gavetas com Tandem Blum."</div>`}
          ${fala.erro && html`<div class="error-box">${fala.erro}</div>`}
          ${erroVoz && html`<div class="error-box">${erroVoz}</div>`}
        </div>`;
  return html`
    <div class=${'fade-up stack' + (temCores(os) ? ' os-pintada' : '')} style=${{ gap: '14px', ...(temCores(os) ? varsCores(os.cores) : {}) }}>
      <div class="card page-card row" style=${{ justifyContent: 'space-between', padding: '10px 14px' }}>
        <div class="row" style=${{ gap: '6px' }}>
          <button class="btn btn-sm" onClick=${voltar}>← Voltar para lista de OSs</button>
          <span class="dim">${salvando ? 'Salvando…' : dup ? '' : sujo ? 'Alterações pendentes' : 'Tudo salvo ✓'}</span>
        </div>
        <div class="row" style=${{ gap: '6px' }}><span class="os-num num-badge">${numOS(os)}</span><b>${os.cliente?.nome || 'Cliente'}</b><span class="dim">• ${(os.ambientes || []).map(x => x.nome).join(', ') || 'sem ambientes'}</span>
          <${PaletaOS} os=${os} alterar=${alterar} sessao=${sessao} toast=${toast} travada=${bloqueada} />
          <button class="btn btn-sm" onClick=${organizar} disabled=${organizando || bloqueada} title="A IA coloca cada informação no seu campo">${organizando ? 'Organizando…' : '✨ Organizar campos'}</button>
        </div>
      </div>

      <div class="card page-card etapas-bar">
        ${ETAPAS.map((e, i) => html`
          ${i > 0 && html`<span class="dim">›</span>`}
          <button key=${e.n} class=${'etapa-bt' + (etapa === e.n ? ' on' : '')} onClick=${() => ir(e.n)}>
            <span class="etapa-n">${e.n}</span><span><b>Etapa ${e.n}: ${e.t}</b><br/><small>${e.s}</small></span>
          </button>`)}
      </div>

      ${dup && html`<div class="error-box">Esta OS ficou igual à <b>OS nº ${numOS(dup)}</b> (mesmo cliente, móveis, medidas e cores). A alteração não foi salva, pra não duplicar. Mude algo que diferencie as duas.</div>`}

      <div class="card page-card row" style=${{ justifyContent: 'space-between' }}>
        <div>
          ${(() => { const rev = os.revisao; const ok = rev?.em && (!os.atualizadoEm || rev.em >= os.atualizadoEm); return html`<div class="rev-linha">
            <span>✏️ Última alteração: <b>${os.atualizadoPor || os.criadoPor || '—'}</b> · ${os.atualizadoEm ? new Date(os.atualizadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
            ${ok ? html`<span class="rev-ok">✅ Revisada por <b>${rev.por}</b> · ${new Date(rev.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>`
              : html`<button class="btn btn-sm rev-btn" disabled=${sujo || salvando} onClick=${async () => { try { await F().fsMod.updateDoc(ref, { revisao: { por: sessao.nome, em: new Date(Date.now() + 1000).toISOString() }, revisoes: [...(os.revisoes || []), { por: sessao.nome, em: nowIso() }] }); toast('OS marcada como revisada.', 'ok'); } catch (e) { toast(e.message, 'erro'); } }}>☐ Marcar como revisada</button>`}
            ${!ok && rev?.em && html`<small class="dim">(alterada depois da última revisão de ${rev.por})</small>`}
          </div>`; })()}
          <${BarraTempos} o=${os} />
          <div class="row" style=${{ gap: '8px' }}><span class="os-num num-badge">${numOS(os)}</span><span class=${(STATUS_OS[idxSt] || STATUS_OS[0]).c}>${(STATUS_OS[idxSt] || STATUS_OS[0]).t}</span>${os.numeroAntigo && html`<span class="chip">antiga: ${os.numeroAntigo}</span>`}</div>
          <h2 style=${{ fontSize: '24px', marginTop: '6px' }}>${os.cliente?.nome || 'Cliente não informado'}</h2>
          <div class="dim">Ambiente: <b>${(os.ambientes || []).map(x => x.nome).join(', ') || '—'}</b> • Obra: <b>${os.cliente?.obra || '—'}</b></div>
        </div>
        <div class="row">
          <button class="btn" onClick=${pdf}>📄 Exportar PDF</button>
          ${etapa < 3 && html`<button class="btn btn-marrom" onClick=${() => ir(etapa + 1)}>Ir para ${etapa === 1 ? 'Especificações' : 'Execução'} →</button>`}
        </div>
      </div>

      ${bloqueada && html`<div class="card page-card trava-aviso row" style=${{ justifyContent: 'space-between' }}>
        <div><b>🔒 OS pronta — bloqueada para edição.</b><div class="dim">Para editar é preciso a sua senha e o motivo da alteração (fica no histórico).</div></div>
        <button class="btn btn-marrom" onClick=${() => setPedirLib(true)}>🔓 Desbloquear para editar</button></div>`}
      ${(os.historico || []).length > 0 && html`<details class="card page-card"><summary class="dim">📜 Histórico de alterações após pronta (${os.historico.length})</summary>
        ${os.historico.map((h, i) => html`<div key=${i} class="item-lista"><span>${h.motivo}<br/><small class="dim">${h.quem} · ${fmtData(h.quando)}</small></span></div>`)}</details>`}

      ${liberada && snapLib && (() => { const itens = diffOS(snapLib, os); return html`
        <div class="card page-card stack pedido-alt">
          <div class="row" style=${{ justifyContent: 'space-between' }}>
            <div><div class="sec-title">📝 Pedido de alteração em andamento</div><div class="dim">Motivo: <b>${motivoLib}</b></div></div>
            <span class="chip chip-accent">${itens.length} ${itens.length === 1 ? 'alteração' : 'alterações'}</span>
          </div>
          ${itens.length === 0 ? html`<div class="dim">Altere o que precisar na OS. Cada mudança aparece aqui: "estou alterando isso, de … para …".</div>` : html`
            <div class="alt-lista">${itens.map((it, i) => html`<div key=${i} class="alt-item"><b>${it.campo}</b><span class="de">${it.de}</span><span class="seta">→</span><span class="para">${it.para}</span></div>`)}</div>`}
          <div class="row" style=${{ justifyContent: 'flex-end', gap: '6px' }}>
            <button class="btn" onClick=${() => { setLiberada(false); setSnapLib(null); }}>Bloquear sem gerar pedido</button>
            <button class="btn btn-marrom" disabled=${!itens.length} onClick=${() => {
              const pedido = { n: (os.alteracoes || []).length + 1, motivo: motivoLib, quem: sessao.nome, quando: nowIso(), itens };
              alterar(o => { o.alteracoes = [...(o.alteracoes || []), pedido]; });
              setLiberada(false); setSnapLib(null); setImprimirPedido(pedido);
              setTimeout(() => { window.print(); setImprimirPedido(null); }, 250);
              toast('Pedido de alteração nº ' + pedido.n + ' gerado. OS bloqueada de novo.', 'ok');
            }}>✓ Concluir alteração e gerar pedido</button>
          </div>
        </div>`; })()}
      <${LinhaDoTempo} os=${os} sessao=${sessao} />
      ${(os.alteracoes || []).length > 0 && html`<details class="card page-card"><summary class="dim">📝 Pedidos de alteração (${os.alteracoes.length})</summary>
        ${os.alteracoes.slice().reverse().map(p => html`<div key=${p.n} class="item-lista" style=${{ alignItems: 'flex-start' }}><span><b>Nº ${p.n}</b> — ${p.motivo}<br/><small class="dim">${p.itens.length} itens · ${p.quem} · ${fmtData(p.quando)}</small>
          <div class="alt-lista mini">${p.itens.slice(0, 6).map((it, i) => html`<div key=${i} class="alt-item"><b>${it.campo}</b><span class="de">${it.de}</span><span class="seta">→</span><span class="para">${it.para}</span></div>`)}${p.itens.length > 6 ? html`<small class="dim">+${p.itens.length - 6}…</small>` : ''}</div></span>
          <button class="btn btn-sm" onClick=${() => { setImprimirPedido(p); setTimeout(() => { window.print(); setImprimirPedido(null); }, 250); }}>🖨 Imprimir</button></div>`)}</details>`}
      ${imprimirPedido && ReactDOM.createPortal(html`<${ImpressaoPedido} os=${os} pedido=${imprimirPedido} empresa=${sessao.empresaNome} />`, document.getElementById('print-area'))}
      <fieldset class="trava" disabled=${bloqueada}>
      ${etapa === 1 && html`
        <div class="grid2" style=${{ alignItems: 'start' }}>
          <${ContratoOS} os=${os} alterar=${alterar} catalogo=${catalogo} toast=${toast} />
          <${AtaOS} os=${os} alterar=${alterar} catalogo=${catalogo} toast=${toast} />
        </div>
        <div class="card page-card">
          <div class="row" style=${{ justifyContent: 'space-between' }}>
            <div class="sec-title">Fluxo de andamento da marcenaria</div>
            ${diasPrazo !== null && html`<span class=${'chip ' + (diasPrazo < 0 ? 'chip-danger' : '')}>📅 ${diasPrazo < 0 ? Math.abs(diasPrazo) + ' dias de atraso' : diasPrazo + ' dias para o prazo'}</span>`}
          </div>
          <div class="dim" style=${{ margin: '4px 0 14px' }}>Etapa atual: <b>${STATUS_OS[idxSt].t.replace(/^\d\. /, '')}</b> (${idxSt + 1}/${STATUS_OS.length})</div>
          <div class="trilho">
            ${STATUS_OS.map((x, i) => html`
              <button key=${x.v} class=${'trilho-pt' + (i < idxSt ? ' feito' : i === idxSt ? ' atual' : '')} onClick=${() => i < idxSt ? setPedirVoltar(x) : alterar(o => { o.status = x.v; })} title=${'Marcar como ' + x.t}>
                <span class="bola">${i < idxSt ? '✓' : i + 1}</span><small>${x.t.replace(/^\d\. /, '')}</small>
              </button>`)}
            <div class="trilho-linha"><div style=${{ width: (idxSt / (STATUS_OS.length - 1) * 100) + '%' }}></div></div>
          </div>
          ${idxSt < (STATUS_OS.length - 1) && html`<button class="btn btn-marrom btn-block" style=${{ marginTop: '14px' }} onClick=${() => alterar(o => { o.status = STATUS_OS[idxSt + 1].v; })}>✓ Concluir ${STATUS_OS[idxSt].t.replace(/^\d\. /, '')} → Passar para ${STATUS_OS[idxSt + 1].t.replace(/^\d\. /, '')}</button>`}
          ${idxSt === (STATUS_OS.length - 1) && html`<div class="ok-box" style=${{ marginTop: '12px' }}>OS concluída ✓</div>`}
        </div>

        <div class="grid2" style=${{ alignItems: 'start' }}>
          <div class="card page-card stack">
            <div class="sec-title">🏢 Dados da obra & responsáveis</div>
            <div class="field"><label class="lbl" for="os-cli">Cliente</label><input id="os-cli" class="inp" value=${os.cliente?.nome || ''} onInput=${setCli('nome')} /></div>
            <div class="grid2">
              <div class="field"><label class="lbl" for="os-tel">Telefone</label><input id="os-tel" class="inp" value=${os.cliente?.telefone || ''} onInput=${setCli('telefone')} /></div>
              <div class="field"><label class="lbl" for="os-obra">Obra / local</label><input id="os-obra" class="inp" value=${os.cliente?.obra || ''} onInput=${setCli('obra')} /></div>
            </div>
            <div class="field"><label class="lbl" for="os-end">Endereço</label><input id="os-end" class="inp" value=${os.cliente?.endereco || ''} onInput=${setCli('endereco')} /></div>
            <div class="grid2">
              <div class="field"><label class="lbl" for="os-resp">Responsável</label><input id="os-resp" class="inp" value=${os.responsavel || ''} placeholder=${sessao.nome} onInput=${e => alterar(o => { o.responsavel = e.target.value; })} /></div>
              <div class="field"><label class="lbl" for="os-arq">Arquiteto / designer</label><input id="os-arq" class="inp" value=${os.arquiteto || ''} onInput=${e => alterar(o => { o.arquiteto = e.target.value; })} /></div>
            </div>
            <div class="field"><label class="lbl" for="os-amb">Ambiente(s) planejado(s)</label><input id="os-amb" class="inp" placeholder="Ex: Cozinha gourmet, suíte master, closet" value=${os.ambienteResumo || (os.ambientes || []).map(a => a.nome).join(', ')} onInput=${e => alterar(o => { o.ambienteResumo = e.target.value; })} /></div>
            <div class="field"><label class="lbl" for="os-prazo">Prazo de entrega (dd/mm/aaaa)</label><input id="os-prazo" class="inp" placeholder="Ex: 30/11/2026" value=${os.prazoEntrega || ''} onInput=${e => alterar(o => { o.prazoEntrega = e.target.value; })} /></div>
          </div>
          <div class="card page-card stack">
            <div class="sec-title">🧱 Padrões de estrutura & tamponamento</div>
            <span class="lbl">Tipo de tamponamento</span>
            <div class="opcoes3">
              ${[['aparente', 'Aparente', 'Laterais visíveis'], ['nao_aparente', 'Não aparente', 'Portas cobrem caixa'], ['sem', 'Sem tamponam.', 'Caixa simples']].map(([v, t, d]) => html`
                <button key=${v} class=${'opc' + ((os.tamponamento?.tipo || 'sem') === v ? ' on' : '')} onClick=${() => alterar(o => { o.tamponamento = { ...(o.tamponamento || {}), tipo: v }; })}><b>${t}</b><small>${d}</small></button>`)}
            </div>
            ${(os.tamponamento?.tipo || 'sem') !== 'sem' && html`
              <span class="lbl">Espessura do tamponamento</span>
              <div class="row" style=${{ gap: '6px' }}>${(window.OPCOES?.TAMP_ESP || []).map(x => html`<button key=${x} class=${'pill' + (os.tamponamento?.espessura === x ? ' on' : '')} onClick=${() => alterar(o => { o.tamponamento = { ...(o.tamponamento || {}), espessura: x }; })}>${x}</button>`)}</div>`}
            <div class="grid2">
              <div class="field"><label class="lbl">MDF interno (caixaria)</label><input class="inp" placeholder="Ex: MDF Branco TX 15mm" value=${P.acab?.interno?.desc || ''} onInput=${e => setP(p => { p.acab = p.acab || {}; p.acab.interno = { ...(p.acab.interno || {}), desc: e.target.value }; })} /></div>
              <div class="field"><label class="lbl">MDF externo (frentes e tamponamento)</label><input class="inp" placeholder="Ex: MDF Freijó Puro Duratex 18mm" value=${P.acab?.externo?.desc || ''} onInput=${e => setP(p => { p.acab = p.acab || {}; p.acab.externo = { ...(p.acab.externo || {}), desc: e.target.value }; })} /></div>
            </div>
            <div class="field"><label class="lbl" for="os-exec">Modo de execução</label>
              <select id="os-exec" class="inp" value=${os.modoExecucao || 'interna'} onChange=${e => alterar(o => { o.modoExecucao = e.target.value; })}>
                <option value="interna">Execução 100% interna</option><option value="terceirizada">Execução 100% terceirizada</option><option value="mista">Mista / híbrida</option>
              </select></div>
            <div class="field"><label class="lbl" for="os-obs">Observações e detalhes técnicos acordados na reunião</label><textarea id="os-obs" class="inp" rows="3" value=${os.observacoesGerais || ''} onInput=${e => alterar(o => { o.observacoesGerais = e.target.value; })}></textarea></div>
          </div>
        </div>
        ${cartaoVoz}
        ${(() => { const ck = [
            ['1. Cliente & obra', !!(os.cliente?.nome && (os.cliente?.obra || os.cliente?.endereco))],
            ['2. Ambiente & prazo', !!((os.ambienteResumo || (os.ambientes || []).length) && os.prazoEntrega)],
            ['3. Tamponamento & MDF', !!(os.tamponamento?.tipo && (P.acab?.interno?.desc || P.acab?.externo?.desc))],
            ['4. Ferragens', Object.values(P.ferragens || {}).some(f => Object.values(f || {}).some(Boolean))],
          ]; const ok = ck.filter(c => c[1]).length;
          return html`<div class="card page-card stack">
            <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">✅ Checklist de prontidão da OS</div><span class=${'chip ' + (ok === 4 ? 'chip-accent' : '')}>${ok}/4 ${ok === 4 ? 'pronto para concluir' : 'recomendado preencher'}</span></div>
            <div class="opcoes4">${ck.map(([t, v]) => html`<div key=${t} class=${'opc' + (v ? ' on' : '')}><b>${v ? '✓' : '!'} ${t}</b><small>${v ? 'Validado' : 'Incompleto'}</small></div>`)}</div>
            <button class="btn btn-marrom btn-block" onClick=${() => ir(2)}>Salvar e avançar para Etapa 2 (Especificações) →</button>
          </div>`; })()}`}

      ${etapa === 2 && html`
        ${cartaoVoz}
        <${EspecificacoesOS} P=${P} setP=${setP} catalogo=${catalogo} sessao=${sessao} />
        <div class="card page-card">
          <div class="row" style=${{ justifyContent: 'space-between', marginBottom: '10px' }}>
            <div><div class="sec-title"><span class="num-sec">11</span> Conjuntos / ambientes e móveis</div><div class="dim">Cada ambiente com seus móveis, medidas, MDF e ferragens próprias</div></div>
            <button class="btn btn-marrom" onClick=${() => alterar(o => { o.ambientes = o.ambientes || []; o.ambientes.push(novoAmbiente('Novo ambiente')); })}>+ Adicionar conjunto</button>
          </div>
          <div class="stack">
            ${(os.ambientes || []).map((a, ai) => html`<${AmbienteOS} key=${a.id || ai} amb=${a} ai=${ai} alterar=${alterar} catalogo=${catalogo} sessao=${sessao} />`)}
            ${!(os.ambientes || []).length && html`<div class="vazio dim">Nenhum conjunto ainda. Adicione, fale, ou gere a OS a partir de uma reunião.</div>`}
          </div>
        </div>
        <div class="card page-card stack">
          <div class="row" style=${{ justifyContent: 'space-between' }}>
            <div class="sec-title"><span class="num-sec">12</span> Paredes inteiras / painéis revestidos</div>
            <label class="row dim" style=${{ gap: '6px' }}><input type="checkbox" checked=${!!P.parede?.ativo} onChange=${e => setP(p => { p.parede = { ...(p.parede || {}), ativo: e.target.checked }; })} /> Possui parede inteira</label>
          </div>
          ${P.parede?.ativo && html`
            <textarea class="inp" rows="2" placeholder="Especificação da parede inteira" value=${P.parede?.espec || ''} onInput=${e => setP(p => { p.parede.espec = e.target.value; })}></textarea>
            <div class="grid2">
              <input class="inp" placeholder="Paginação / padrão (ex: friso vertical a cada 60cm)" value=${P.parede?.paginacao || ''} onInput=${e => setP(p => { p.parede.paginacao = e.target.value; })} />
              <input class="inp" placeholder="Método de fixação" value=${P.parede?.fixacao || ''} onInput=${e => setP(p => { p.parede.fixacao = e.target.value; })} />
            </div>`}
        </div>`}

      ${etapa === 3 && html`<${ExecucaoOS} os=${os} alterar=${alterar} sessao=${sessao} toast=${toast} />`}
      </fieldset>
      ${pedirVoltar && html`<${SenhaMotivo} titulo=${'Voltar a OS para ' + pedirVoltar.t.replace(/^\d\. /, '')} texto="Voltar um processo que já começou precisa de senha e motivo." botao="Voltar etapa"
        onOk=${async (motivo) => { alterar(o => { o.reaberturas = [...(o.reaberturas || []), { oque: 'Status da OS: ' + (STATUS_OS.find(x => x.v === o.status) || {}).t + ' → ' + pedirVoltar.t, motivo, quem: sessao.nome, quando: nowIso() }]; o.status = pedirVoltar.v; }); toast('Processo reaberto.', 'ok'); }} fechar=${() => setPedirVoltar(null)} />`}
      ${(os.reaberturas || []).length > 0 && html`<details class="card page-card"><summary class="dim">↺ Reaberturas de processo (${os.reaberturas.length})</summary>${os.reaberturas.slice().reverse().map((r, i) => html`<div key=${i} class="item-lista"><span><b>${r.oque}</b><br/>${r.motivo}<br/><small class="dim">${r.quem} · ${fmtData(r.quando)}</small></span></div>`)}</details>`}
      ${pedirLib && html`<${SenhaMotivo} titulo=${'Editar a OS ' + numOS(os) + ' (já pronta)'} texto="Diga o que vai ser alterado e por quê." botao="Desbloquear"
        onOk=${async (motivo) => { setSnapLib(JSON.parse(JSON.stringify(os))); setMotivoLib(motivo); alterar(o => { o.historico = [...(o.historico || []), { motivo, quem: sessao.nome, quando: nowIso() }]; }); setLiberada(true); toast('OS desbloqueada. Tudo o que você mudar vai para o pedido de alteração.', 'ok'); }} fechar=${() => setPedirLib(false)} />`}

      <div class="rodape-escuro">
        <button class="btn btn-ghost" style=${{ color: '#e7e5e4' }} onClick=${() => etapa > 1 ? ir(etapa - 1) : voltar()}>← ${etapa > 1 ? 'Etapa ' + (etapa - 1) : 'Voltar para lista de OSs'}</button>
        <div class="row">
          <button class="btn btn-sm" onClick=${pdf}>📄 PDF da OS</button>
          ${etapa < 3 ? html`<button class="btn btn-amarelo" onClick=${() => ir(etapa + 1)}>Avançar para etapa ${etapa + 1}: ${ETAPAS[etapa].t} →</button>`
            : html`<button class="btn btn-amarelo" onClick=${voltar}>✓ Concluir e voltar para a lista</button>`}
        </div>
      </div>

      <div class="dim" style=${{ textAlign: 'right' }}>Para excluir esta OS use a aba <b>🗑 Excluir OSs</b> (pede senha e motivo).</div>
      ${imprimir && !imprimirPedido && ReactDOM.createPortal(html`<${ImpressaoOS} os=${os} empresa=${sessao.empresaNome} />`, document.getElementById('print-area'))}
      <datalist id="lista-fab-mdf">${fabricantesMDF.map(f => html`<option key=${f} value=${f} />`)}</datalist>
    </div>`;
}


/* ---------- Preencher só o que está vazio ---------- */
const vazio = (v) => v == null || v === '' || v === false || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(vazio));
function preencherVazios(alvo, fonte, cont = { n: 0 }) {
  if (!fonte || typeof fonte !== 'object') return cont;
  for (const [k, v] of Object.entries(fonte)) {
    if (vazio(v) || k === 'revisar' || k === 'id') continue;
    const atual = alvo[k];
    if (vazio(atual)) { alvo[k] = JSON.parse(JSON.stringify(v)); cont.n++; }
    else if (!Array.isArray(v) && typeof v === 'object' && typeof atual === 'object' && !Array.isArray(atual)) preencherVazios(atual, v, cont);
  }
  return cont;
}
function mesclarOS(o, nova) {
  const n = sanearOS(nova);
  const cont = { n: 0 };
  o.cliente = o.cliente || {};
  preencherVazios(o.cliente, n.cliente, cont);
  ['prazoEntrega', 'observacoesGerais', 'responsavel', 'arquiteto', 'ambienteResumo'].forEach(k => { if (vazio(o[k]) && !vazio(n[k])) { o[k] = n[k]; cont.n++; } });
  if (n.tamponamento) { o.tamponamento = o.tamponamento || {}; preencherVazios(o.tamponamento, n.tamponamento, cont); }
  if (n.padrao) { o.padrao = o.padrao || {}; preencherVazios(o.padrao, n.padrao, cont); }
  o.ambientes = o.ambientes || [];
  for (const a of n.ambientes) {
    const ex = o.ambientes.find(x => norm(x.nome) === norm(a.nome));
    if (!ex) { o.ambientes.push(a); cont.n += 1 + a.moveis.length; continue; }
    ex.moveis = ex.moveis || [];
    for (const m of a.moveis) {
      const em = ex.moveis.find(x => norm(x.nome) === norm(m.nome));
      if (!em) { ex.moveis.push(m); cont.n++; } else preencherVazios(em, m, cont);
    }
  }
  return cont.n;
}

/* ---------- Contrato dentro da OS ---------- */
function ContratoOS({ os, alterar, catalogo, toast }) {
  const [rodando, setRodando] = useState('');
  const [erro, setErro] = useState('');
  const inp = useRef(null);
  const c = os.contrato || {};
  const setC = (k, v) => alterar(o => { o.contrato = { ...(o.contrato || {}), [k]: v }; });
  const enviar = async (files) => {
    if (!files?.length) return;
    setErro('');
    try {
      let texto = '', imagens = [];
      for (const f of files) {
        setRodando('Lendo ' + f.name + '…');
        const r = await extrairArquivo(f);
        texto += `\n=== ${f.name} ===\n` + r.texto;
        imagens = imagens.concat(r.imagens || []).slice(0, 12);
      }
      setRodando('A IA está extraindo o que importa…');
      const res = await chamarIA('contrato_os', { texto, temImagens: imagens.length > 0, os: sanearOS(os), catalogo: resumoCatalogo(catalogo) }, imagens);
      let n = 0;
      alterar(o => {
        n = mesclarOS(o, res);
        const k = res.contrato || {};
        o.contrato = { ...(o.contrato || {}) };
        Object.entries(k).forEach(([kk, v]) => { if (vazio(o.contrato[kk]) && !vazio(v)) o.contrato[kk] = Array.isArray(v) ? v.join('\n') : String(v); });
        o.contrato.arquivos = [...(o.contrato.arquivos || []), ...[...files].map(f => ({ nome: f.name, em: nowIso() }))];
      });
      toast(`Contrato lido: ${n} campos da OS preenchidos. Confira.`, 'ok');
    } catch (e) { setErro(e.message); }
    setRodando('');
  };
  return html`
    <div class="card page-card stack">
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div><div class="sec-title">📑 Contrato & documentos</div><div class="dim">Coloque o contrato (PDF, Word, Excel ou foto). A IA preenche a OS só onde ainda está vazio.</div></div>
        <button class="btn btn-marrom" disabled=${!!rodando} onClick=${() => inp.current?.click()}>${rodando ? '⏳ ' + rodando : '⬆ Colocar contrato'}</button>
        <input ref=${inp} type="file" multiple hidden accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,image/*" onChange=${e => { enviar([...e.target.files]); e.target.value = ''; }} />
      </div>
      <div class="drop-mini" onDragOver=${e => e.preventDefault()} onDrop=${e => { e.preventDefault(); enviar([...e.dataTransfer.files]); }}>Ou arraste o contrato aqui</div>
      ${erro && html`<div class="error-box">${erro}</div>`}
      ${(c.arquivos || []).length > 0 && html`<div class="row" style=${{ gap: '5px' }}>${c.arquivos.map((a, i) => html`<span key=${i} class="chip">📄 ${a.nome}</span>`)}</div>`}
      <div class="grid3">
        ${[['numero', 'Nº do contrato'], ['dataAssinatura', 'Data de assinatura'], ['valorTotal', 'Valor total'], ['formaPagamento', 'Forma de pagamento'], ['prazoContratual', 'Prazo contratual'], ['garantia', 'Garantia']].map(([k, t]) => html`
          <div key=${k} class="field"><span class="lbl">${t}</span><input class="inp" value=${c[k] || ''} onInput=${e => setC(k, e.target.value)} /></div>`)}
      </div>
      <div class="field"><span class="lbl">Cláusulas importantes (multas, o que não está incluso, condições de entrega)</span>
        <textarea class="inp" rows="3" value=${c.clausulasImportantes || ''} onInput=${e => setC('clausulasImportantes', e.target.value)}></textarea></div>
    </div>`;
}

/* ---------- Ata da reunião ao vivo dentro da OS ---------- */
function AtaOS({ os, alterar, catalogo, toast }) {
  const [trecho, setTrecho] = useState('');
  const [interim, setInterim] = useState('');
  const [status, setStatus] = useState('');
  const pend = useRef('');
  const rodando = useRef(false);
  const osRef = useRef(os); osRef.current = os;
  const ata = os.ata || {};
  const processar = async (forcar) => {
    const t = pend.current.trim();
    if (rodando.current || (!forcar && t.length < 350) || !t) return;
    rodando.current = true; pend.current = '';
    try {
      setStatus('IA escrevendo a ata…');
      const nova = await chamarIA('ata', { ataAtual: osRef.current.ata || {}, trecho: t, catalogo: resumoCatalogo(catalogo) });
      alterar(o => { o.ata = { ...nova, atualizadaEm: nowIso() }; });
      setStatus('Preenchendo o que falta na OS…');
      const res = await chamarIA('preencher_os', { ata: nova, os: { ...sanearOS(osRef.current), padrao: osRef.current.padrao || {}, tamponamento: osRef.current.tamponamento || {} }, catalogo: resumoCatalogo(catalogo) });
      let n = 0; alterar(o => { n = mesclarOS(o, res); });
      setStatus(n ? `✓ Ata atualizada · ${n} campos preenchidos` : '✓ Ata atualizada');
    } catch (e) { pend.current = t + ' ' + pend.current; setStatus('⚠ ' + e.message); }
    rodando.current = false;
  };
  const fala = useFala({
    onFinal: (t) => { setTrecho(v => (v + ' ' + t).slice(-3000)); pend.current += ' ' + t; processar(false); },
    onInterim: setInterim,
  });
  const parar = () => { fala.parar(); setTimeout(() => processar(true), 400); };
  const setAta = (fn) => alterar(o => { o.ata = o.ata || {}; fn(o.ata); });
  const linhas = (arr) => (arr || []).join('\n');
  const deLinhas = (t) => t.split('\n').map(x => x.trim()).filter(Boolean);
  return html`
    <div class="card page-card stack" style=${{ borderColor: fala.ouvindo ? 'var(--danger)' : undefined }}>
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div><div class="sec-title">🎙 Ata da reunião</div><div class="dim">Ligue durante a reunião: a IA escreve a ata por ambiente, ignora conversa paralela e preenche na OS só o que ainda está vazio.</div></div>
        ${fala.ouvindo ? html`<button class="btn btn-mic-on pulse" onClick=${parar}>■ Parar reunião</button>`
          : html`<button class="btn btn-teal" onClick=${fala.iniciar}>🎤 Iniciar reunião</button>`}
      </div>
      ${fala.erro && html`<div class="error-box">${fala.erro}</div>`}
      ${(fala.ouvindo || trecho) && html`<div class="transcript" style=${{ maxHeight: '90px' }}>${trecho.slice(-600)}<span class="interim"> ${interim}</span></div>`}
      ${status && html`<div class="dim">${status}</div>`}
      <div class="row" style=${{ gap: '6px' }}>
        <button class="btn btn-sm" disabled=${!os.ata} onClick=${async () => { pend.current = pend.current || ' '; setStatus('Preenchendo…'); try { const res = await chamarIA('preencher_os', { ata: os.ata, os: { ...sanearOS(os), padrao: os.padrao || {} }, catalogo: resumoCatalogo(catalogo) }); let n = 0; alterar(o => { n = mesclarOS(o, res); }); setStatus(`✓ ${n} campos preenchidos`); } catch (e) { setStatus('⚠ ' + e.message); } }}>✨ Preencher OS com a ata</button>
        <span class="dim">Tudo abaixo pode ser editado à mão.</span>
      </div>
      <div class="field"><span class="lbl">Resumo</span><textarea class="inp" rows="2" value=${ata.resumo || ''} onInput=${e => setAta(a => { a.resumo = e.target.value; })}></textarea></div>
      ${(ata.ambientes || []).map((a, i) => html`
        <div key=${i} class="acab-box">
          <input class="inp inp-sm" style=${{ fontWeight: 700 }} value=${a.nome || ''} onInput=${e => setAta(x => { x.ambientes[i].nome = e.target.value; })} />
          <textarea class="inp" rows="2" placeholder="Pontos gerais do ambiente (um por linha)" value=${linhas(a.pontosGerais)} onInput=${e => setAta(x => { x.ambientes[i].pontosGerais = deLinhas(e.target.value); })}></textarea>
          ${(a.moveis || []).map((m, j) => html`<div key=${j} class="field"><span class="lbl">${m.nome}</span><textarea class="inp" rows="2" value=${linhas(m.pontos)} onInput=${e => setAta(x => { x.ambientes[i].moveis[j].pontos = deLinhas(e.target.value); })}></textarea></div>`)}
        </div>`)}
      <button class="btn btn-sm btn-ghost" onClick=${() => setAta(a => { a.ambientes = [...(a.ambientes || []), { nome: 'Novo ambiente', pontosGerais: [], moveis: [] }]; })}>+ Ambiente na ata</button>
      <div class="grid2">
        <div class="field"><span class="lbl">Decisões</span><textarea class="inp" rows="3" value=${linhas(ata.decisoes)} onInput=${e => setAta(a => { a.decisoes = deLinhas(e.target.value); })}></textarea></div>
        <div class="field"><span class="lbl">Pendências</span><textarea class="inp" rows="3" value=${linhas(ata.pendencias)} onInput=${e => setAta(a => { a.pendencias = deLinhas(e.target.value); })}></textarea></div>
      </div>
    </div>`;
}

/* ---------- Aba Contratos: lê o contrato e cria/atualiza as OSs ---------- */
// Ordem das OSs: primeiro as áreas com pedra — banheiros/lavabo, lavanderia, cozinhas — depois as demais.
const temPedra = (a) => /pedra|granito|marmore|quartzo|silestone|dekton|porcelanato|bancada|marmoraria|cuba/.test(norm(JSON.stringify(a)));
function ordemAmb(a) {
  const n = norm(a.nome);
  if (/banh|bwc|wc|lavabo|toalete|sanitario|suite.*banho|sala de banho/.test(n)) return 0;
  if (/lavanderia|area de servico|servico/.test(n)) return 1;
  if (/cozinha|copa|gourmet|churrasq|espaco gourmet/.test(n)) return 2;
  if (temPedra(a)) return 3;
  return 4;
}
const ROTULO_ORDEM = ['🚿 Banheiro / lavabo', '🧺 Lavanderia', '🍳 Cozinha', '🪨 Com pedra', 'Demais'];
const ordenarAmbs = (ambs) => ambs.map((a, i) => ({ a, i })).sort((x, y) => ordemAmb(x.a) - ordemAmb(y.a) || x.i - y.i).map(x => x.a);

function TelaContratos({ sessao, catalogo, toast, abrirOS }) {
  const [lista, setLista] = useState([]);
  const [oss, setOss] = useState([]);
  const [rodando, setRodando] = useState('');
  const [erro, setErro] = useState('');
  const [res, setRes] = useState(null); // resultado da IA em revisão
  const [marcados, setMarcados] = useState({});
  const [destino, setDestino] = useState('novas'); // novas | existente
  const [osAlvo, setOsAlvo] = useState('');
  const inp = useRef(null);
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    const a = onSnapshot(query(col('empresas', sessao.empresaId, 'contratos'), orderBy('criadoEm', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([]));
    const b = onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setOss(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setOss([]));
    return () => { a(); b(); };
  }, []);
  const ler = async (files) => {
    if (!files?.length) return;
    setErro(''); setRes(null);
    try {
      let texto = '', imagens = [];
      for (const f of files) { setRodando('Lendo ' + f.name + '…'); const r = await extrairArquivo(f); texto += `\n=== ${f.name} ===\n` + r.texto; imagens = imagens.concat(r.imagens || []).slice(0, 12); }
      setRodando('A IA está extraindo o contrato…');
      const r = await chamarIA('contrato_os', { texto, temImagens: imagens.length > 0, os: {}, catalogo: resumoCatalogo(catalogo) }, imagens);
      const os = sanearOS(r);
      os.ambientes = ordenarAmbs(os.ambientes);
      setRes({ os, contrato: r.contrato || {}, arquivos: [...files].map(f => f.name) });
      setMarcados(Object.fromEntries(os.ambientes.map((_, i) => [i, true])));
      const mesmo = oss.find(o => norm(o.cliente?.nome) && norm(o.cliente?.nome) === norm(os.cliente.nome));
      if (mesmo) { setDestino('existente'); setOsAlvo(mesmo.id); } else setDestino('novas');
    } catch (e) { setErro(e.message); }
    setRodando('');
  };
  const txtC = (v) => Array.isArray(v) ? v.join('\n') : String(v || '');
  const aplicar = async () => {
    const { os, contrato, arquivos } = res;
    const dadosC = Object.fromEntries(Object.entries(contrato).map(([k, v]) => [k, txtC(v)]));
    const ambs = os.ambientes.filter((_, i) => marcados[i]);
    setRodando('Gravando…');
    try {
      const criadas = [];
      if (destino === 'novas') {
        const base = { ...os, ambientes: [] };
        const grupos = ambs.length ? ambs.map(a => [a]) : [[]];
        for (const g of grupos) {
          try {
            const { id, codigo } = await criarOS(sessao, { ...base, ambientes: g, ambienteResumo: g.map(a => a.nome).join(', ') }, { origem: 'contrato' });
            await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', id), { contrato: { ...dadosC, arquivos: arquivos.map(nome => ({ nome, em: nowIso() })) } });
            criadas.push({ id, codigo, amb: g.map(a => a.nome).join(', ') });
          } catch (e) { if (e.duplicada) criadas.push({ id: e.duplicada.id, codigo: numOS(e.duplicada), amb: 'já existia' }); else throw e; }
        }
      } else {
        const alvo = oss.find(o => o.id === osAlvo);
        if (!alvo) throw new Error('Escolha a OS.');
        const o = JSON.parse(JSON.stringify(alvo));
        const n = mesclarOS(o, { ...os, ambientes: ambs });
        o.contrato = { ...(o.contrato || {}) };
        Object.entries(dadosC).forEach(([k, v]) => { if (vazio(o.contrato[k]) && v) o.contrato[k] = v; });
        o.contrato.arquivos = [...(o.contrato.arquivos || []), ...arquivos.map(nome => ({ nome, em: nowIso() }))];
        const { id, ...resto } = o;
        await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', id), { ...resto, atualizadoEm: nowIso(), atualizadoPor: sessao.nome });
        criadas.push({ id, codigo: numOS(alvo), amb: n + ' campos preenchidos' });
      }
      await F().fsMod.addDoc(col('empresas', sessao.empresaId, 'contratos'), {
        cliente: os.cliente.nome || '', obra: os.cliente.obra || '', ...dadosC, arquivos, ambientes: ambs.map(a => a.nome),
        oss: criadas, criadoPor: sessao.nome, criadoEm: nowIso(),
      });
      toast(destino === 'novas' ? `${criadas.length} OS criadas pelo contrato.` : 'OS atualizada pelo contrato.', 'ok');
      setRes(null);
    } catch (e) { setErro(e.message); }
    setRodando('');
  };
  const C = res?.contrato || {};
  return html`
    <div class="fade-up stack">
      <div><h2>Contratos</h2><div class="dim">Coloque o contrato: a IA extrai cliente, ambientes, materiais, prazos e condições, e cria as OSs (uma por ambiente) ou completa uma OS que já existe.</div></div>
      <div class="card page-card stack drop-grande" onDragOver=${e => e.preventDefault()} onDrop=${e => { e.preventDefault(); ler([...e.dataTransfer.files]); }}>
        <div style=${{ fontSize: '30px' }}>📑</div>
        <b>${rodando || 'Arraste o contrato aqui ou toque para escolher'}</b>
        <div class="dim">PDF, Word, Excel ou foto — pode mandar vários arquivos (contrato + anexos)</div>
        <button class="btn btn-marrom" disabled=${!!rodando} onClick=${() => inp.current?.click()}>⬆ Escolher contrato</button>
        <input ref=${inp} type="file" multiple hidden accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,image/*" onChange=${e => { ler([...e.target.files]); e.target.value = ''; }} />
      </div>
      ${erro && html`<div class="error-box">${erro}</div>`}

      ${res && html`
        <div class="card page-card stack" style=${{ borderColor: '#b45309' }}>
          <div class="sec-title">✅ Confira o que a IA encontrou</div>
          <div class="grid3">
            ${[['Cliente', res.os.cliente.nome], ['Telefone', res.os.cliente.telefone], ['Obra', res.os.cliente.obra], ['Endereço', res.os.cliente.endereco], ['Prazo de entrega', res.os.prazoEntrega], ['Nº contrato', txtC(C.numero)], ['Assinatura', txtC(C.dataAssinatura)], ['Valor', txtC(C.valorTotal)], ['Pagamento', txtC(C.formaPagamento)]].map(([k, v]) => html`<div key=${k} class="kv-mini"><small>${k}</small><b>${v || '—'}</b></div>`)}
          </div>
          ${txtC(C.clausulasImportantes) && html`<div class="dica"><b>Cláusulas importantes:</b><div style=${{ whiteSpace: 'pre-wrap' }}>${txtC(C.clausulasImportantes)}</div></div>`}
          <span class="lbl">Ambientes encontrados (${res.os.ambientes.length})</span>
          <div class="dim" style=${{ fontSize: '12px' }}>Cada ambiente vira uma OS, nesta ordem: banheiros/lavabo → lavanderia → cozinhas → demais áreas com pedra → resto.</div>
          ${(() => { let k = 0; return res.os.ambientes.map((a, i) => { const o = ordemAmb(a); const nPrev = marcados[i] && destino === 'novas' ? ++k : null; return html`<label key=${i} class="item-lista" style=${{ cursor: 'pointer' }}><span><input type="checkbox" checked=${!!marcados[i]} onChange=${e => setMarcados({ ...marcados, [i]: e.target.checked })} /> ${nPrev ? html`<span class="chip chip-accent">${nPrev}ª OS</span> ` : ''}<b>${a.nome}</b> <span class="dim">· ${a.moveis.length} móveis</span></span><span class="chip">${ROTULO_ORDEM[o]}${o < 3 && temPedra(a) ? ' · 🪨' : ''}</span></label>`; }); })()}
          <div class="opcoes3" style=${{ gridTemplateColumns: '1fr 1fr' }}>
            <button class=${'opc' + (destino === 'novas' ? ' on' : '')} onClick=${() => setDestino('novas')}><b>Criar OSs novas</b><small>Uma OS para cada ambiente marcado</small></button>
            <button class=${'opc' + (destino === 'existente' ? ' on' : '')} onClick=${() => setDestino('existente')}><b>Completar OS existente</b><small>Preenche só o que estiver vazio</small></button>
          </div>
          ${destino === 'existente' && html`<select class="inp" value=${osAlvo} onChange=${e => setOsAlvo(e.target.value)}><option value="">Escolha a OS…</option>${oss.map(o => html`<option key=${o.id} value=${o.id}>${numOS(o)} — ${o.cliente?.nome || ''} · ${(o.ambientes || []).map(a => a.nome).join(', ')}</option>`)}</select>`}
          <div class="row" style=${{ justifyContent: 'flex-end', gap: '6px' }}>
            <button class="btn" onClick=${() => setRes(null)}>Cancelar</button>
            <button class="btn btn-marrom" disabled=${!!rodando || (destino === 'existente' && !osAlvo)} onClick=${aplicar}>${destino === 'novas' ? `Criar ${Object.values(marcados).filter(Boolean).length || 1} OS` : 'Completar a OS'}</button>
          </div>
        </div>`}

      <div class="card page-card stack">
        <div class="sec-title">📚 Contratos lidos</div>
        ${lista.length === 0 ? html`<div class="dim">Nenhum contrato ainda.</div>` : lista.map(c => html`
          <div key=${c.id} class="item-lista" style=${{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
            <span style=${{ flex: 1, minWidth: '200px' }}><b>${c.cliente || 'Cliente'}</b>${c.numero ? html` · nº ${c.numero}` : ''}${c.valorTotal ? html` · ${c.valorTotal}` : ''}
              <br/><small class="dim">${(c.arquivos || []).join(', ')} · ${c.criadoPor} · ${fmtData(c.criadoEm)}</small></span>
            <span class="row" style=${{ gap: '4px' }}>${(c.oss || []).map(o => html`<button key=${o.id} class="btn btn-sm" onClick=${() => abrirOS(o.id)} title=${o.amb}>OS ${o.codigo}</button>`)}</span>
          </div>`)}
      </div>
    </div>`;
}

/* ---------- Diário de obra por OS (ambiente): pendências faladas + fotos ---------- */
async function fotoCompacta(file) { return imagemParaJpeg(file, 1024); }
function DiarioOS({ sessao, os, toast }) {
  const [itens, setItens] = useState(null);
  const [texto, setTexto] = useState('');
  const [interim, setInterim] = useState('');
  const [fotos, setFotos] = useState([]);
  const [tipo, setTipo] = useState('pendencia');
  const [salvando, setSalvando] = useState(false);
  const [verFoto, setVerFoto] = useState(null);
  const cam = useRef(null), gal = useRef(null);
  const base = ['empresas', sessao.empresaId, 'os', os.id, 'diario'];
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col(...base), orderBy('em', 'desc')), s => setItens(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setItens([]));
  }, [os.id]);
  const fala = useFala({ onFinal: (t) => setTexto(v => (v ? v + ' ' : '') + t), onInterim: setInterim });
  const addFotos = async (files) => {
    const novas = [];
    for (const f of [...files].slice(0, 6 - fotos.length)) { try { novas.push(await fotoCompacta(f)); } catch {} }
    setFotos(v => [...v, ...novas].slice(0, 6));
  };
  const contar = async (lista) => {
    const abertas = lista.filter(i => i.tipo === 'pendencia' && !i.resolvida).length;
    await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', os.id), { pendAbertas: abertas, diarioN: lista.length, diarioEm: nowIso() });
  };
  const salvar = async () => {
    fala.ouvindo && fala.parar();
    const t = (texto + ' ' + interim).trim();
    if (!t && !fotos.length) return toast('Fale, escreva ou tire uma foto.');
    setSalvando(true);
    try {
      const doc = { tipo, texto: t, fotos, quem: sessao.nome, em: nowIso(), resolvida: false };
      if (tipo === 'final' && !fotos.length) { setSalvando(false); return toast('Tire a foto do que foi montado hoje.'); }
      const r = await F().fsMod.addDoc(col(...base), doc);
      if (tipo === 'final') await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', os.id), { ultimoFinal: { em: doc.em, quem: sessao.nome, foto: fotos[0], texto: t } });
      await contar([{ id: r.id, ...doc }, ...(itens || [])]);
      setTexto(''); setInterim(''); setFotos([]);
      registrar(sessao, os.id, tipo === 'pendencia' ? '⚠️' : tipo === 'final' ? '🌇' : '📓', tipo === 'pendencia' ? 'Pendência no diário de obra' : tipo === 'final' ? 'Foto do final do dia' : 'Registro no diário de obra', t.slice(0, 160));
      toast(tipo === 'pendencia' ? 'Pendência registrada.' : 'Registro salvo no diário.', 'ok');
    } catch (e) { toast('Não salvou: ' + e.message, 'erro'); }
    setSalvando(false);
  };
  const resolver = async (it, v) => {
    let motivo = '';
    if (!v) { motivo = await pedirMotivo('Reabrir pendência'); if (!motivo) return; }
    registrar(sessao, os.id, v ? '✅' : '↺', v ? 'Pendência resolvida' : 'Pendência reaberta', (motivo ? motivo + ' — ' : '') + String(it.texto || '').slice(0, 120));
    await F().fsMod.updateDoc(docRef(...base, it.id), { resolvida: v, resolvidaPor: v ? sessao.nome : '', resolvidaEm: v ? nowIso() : '' });
    await contar((itens || []).map(x => x.id === it.id ? { ...x, resolvida: v } : x));
  };
  const abertas = (itens || []).filter(i => i.tipo === 'pendencia' && !i.resolvida);
  return html`
    <div class="sheet-t">📓 Diário de obra</div>
    <div class="dim" style=${{ marginTop: '-6px' }}>${numOS(os)} · ${(os.ambientes || []).map(a => a.nome).join(', ') || os.ambienteResumo || ''}</div>
    <div class="seg-mini dia-tipo">${[['pendencia', '⚠ Pendência'], ['registro', '📝 Registro'], ['final', '🌇 Final do dia'], ['foto', '📷 Só foto']].map(([v, t]) => html`<button key=${v} class=${tipo === v ? 'on' : ''} onClick=${() => setTipo(v)}>${t}</button>`)}</div>
    <div class="dia-box">
      <textarea class="inp" rows="3" placeholder=${tipo === 'pendencia' ? 'Ex: falta 1 dobradiça na porta do balcão, puxador riscado…' : tipo === 'final' ? 'O que foi montado hoje (fale ou escreva) + tire a foto' : 'O que foi feito hoje / observação'} value=${texto + (interim ? ' ' + interim : '')} onInput=${e => { setTexto(e.target.value); setInterim(''); }}></textarea>
      <div class="dia-acoes">
        ${fala.ouvindo ? html`<button class="btn btn-grande btn-mic-on pulse" onClick=${fala.parar}>■ Parar</button>` : html`<button class="btn btn-grande btn-teal" onClick=${fala.iniciar}>🎤 Falar</button>`}
        <button class="btn btn-grande" onClick=${() => cam.current?.click()}>📷 Foto</button>
        <button class="btn btn-grande btn-ghost" onClick=${() => gal.current?.click()}>🖼️</button>
        <input ref=${cam} type="file" accept="image/*" capture="environment" hidden onChange=${e => { addFotos(e.target.files); e.target.value = ''; }} />
        <input ref=${gal} type="file" accept="image/*" multiple hidden onChange=${e => { addFotos(e.target.files); e.target.value = ''; }} />
      </div>
      ${fala.erro && html`<div class="error-box">${fala.erro}</div>`}
      ${fotos.length > 0 && html`<div class="dia-fotos">${fotos.map((f, i) => html`<span key=${i}><img src=${f} /><button onClick=${() => setFotos(fotos.filter((_, j) => j !== i))}>✕</button></span>`)}</div>`}
      <button class="btn btn-grande btn-verde btn-block" disabled=${salvando} onClick=${salvar}>${salvando ? 'Salvando…' : '✓ Salvar no diário'}</button>
    </div>
    ${abertas.length > 0 && html`<div class="sheet-t" style=${{ fontSize: '15px' }}>⚠ Pendências em aberto (${abertas.length})</div>`}
    ${itens === null ? html`<div class="dim">Carregando…</div>` : itens.length === 0 ? html`<div class="dim">Nenhum registro ainda.</div>` : itens.map(it => html`
      <div key=${it.id} class=${'dia-item ' + it.tipo + (it.resolvida ? ' ok' : '')}>
        <div class="dia-cab"><span>${it.tipo === 'pendencia' ? (it.resolvida ? '✅' : '⚠') : it.tipo === 'foto' ? '📷' : it.tipo === 'final' ? '🌇 Final do dia ·' : '📝'} <b>${new Date(it.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</b> · ${it.quem}</span>
          ${it.tipo === 'pendencia' && (it.resolvida ? html`<button class="btn btn-sm" onClick=${() => resolver(it, false)}>Reabrir</button>` : html`<button class="btn btn-sm btn-verde" onClick=${() => resolver(it, true)}>✓ Resolvida</button>`)}</div>
        ${it.texto && html`<div class="dia-txt">${it.texto}</div>`}
        ${(it.fotos || []).length > 0 && html`<div class="dia-fotos">${it.fotos.map((f, i) => html`<span key=${i}><img src=${f} onClick=${() => setVerFoto(f)} /></span>`)}</div>`}
        ${it.resolvida && it.resolvidaPor && html`<small class="dim">Resolvida por ${it.resolvidaPor} · ${fmtData(it.resolvidaEm)}</small>`}
      </div>`)}
    ${verFoto && html`<div class="foto-cheia" onClick=${() => setVerFoto(null)}><img src=${verFoto} /></div>`}`;
}

/* ---------- Pedidos (peças extras, terceiros e compras) ---------- */
const PED_TIPOS = [['interno', '🪵', 'Peça extra', 'Produção interna'], ['terceiro', '🤝', 'Terceirizado', 'Parceiro faz'], ['compra', '🛒', 'Compra', 'Comprar material']];
const PED_ITENS = [['peca', '🟫', 'Peça MDF'], ['cabideiro', '➖', 'Cabideiro'], ['tapafuro', '⚪', 'Tapa-furo'], ['dobradica', '🔩', 'Acab. dobradiça'], ['tinta', '🎨', 'Tinta p/ retoque'], ['frente', '🚪', 'Porta / frente'], ['gaveta', '🗄️', 'Gaveta'], ['prateleira', '📚', 'Prateleira'], ['outro', '📦', 'Outra peça']];
const PED_ST = {
  interno: [['solicitado', 'Solicitado', '#9ca3af'], ['producao', 'Em produção', '#f59e0b'], ['pronto', 'Pronto na fábrica', '#2563eb'], ['entregue', 'Entregue na obra', '#16a34a']],
  terceiro: [['orcar', 'A orçar', '#9ca3af'], ['aguard_orc', 'Aguard. orçamento', '#f59e0b'], ['aguard_aprov', 'Aguard. aprovação', '#ea580c'], ['pedido', 'Pedido feito', '#2563eb'], ['recebido', 'Recebido', '#0d9488'], ['entregue', 'Entregue na obra', '#16a34a']],
};
PED_ST.compra = PED_ST.terceiro;
const stPed = (p) => (PED_ST[p.tipo] || PED_ST.interno).find(s => s[0] === p.st) || (PED_ST[p.tipo] || PED_ST.interno)[0];
const pedAberto = (p) => p.st !== 'entregue';
const resumoPed = (p) => [p.qtd ? p.qtd + '×' : '', (PED_ITENS.find(i => i[0] === p.item) || [])[2] || '', p.cor, p.larg || p.alt ? (p.larg || '?') + '×' + (p.alt || '?') + 'mm' : '', p.esp ? p.esp + 'mm' : '', p.fita && Object.values(p.fita).some(Boolean) ? 'fita ' + ['cima', 'baixo', 'esq', 'dir'].filter(k => p.fita[k]).join('/') : '', p.veio ? 'veio ' + ({ h: '↔', v: '↕', x: 'indif.' })[p.veio] : ''].filter(Boolean).join(' · ');

function NovoPedido({ sessao, os, toast, fechar, catalogo }) {
  const [p, setP] = useState({ tipo: 'interno', item: 'peca', qtd: 1, cor: '', larg: '', alt: '', esp: '18', fita: { cima: false, baixo: false, esq: false, dir: false }, veio: '', prazo: '', obs: '', fotos: [], parceiro: '' });
  const [salvando, setSalvando] = useState(false);
  const cam = useRef(null);
  const set = (k, v) => setP(x => ({ ...x, [k]: v }));
  const fala = useFala({ onFinal: (t) => setP(x => ({ ...x, obs: (x.obs ? x.obs + ' ' : '') + t })) });
  const ehPeca = ['peca', 'frente', 'gaveta', 'prateleira'].includes(p.item);
  const ck = [['Qtd', p.qtd > 0], ['Cor', !!p.cor], ['Tamanho', !ehPeca || (p.larg && p.alt)], ['Espessura', !ehPeca || !!p.esp], ['Fita', !ehPeca || Object.values(p.fita).some(Boolean) || p.semFita], ['Veio', !ehPeca || !!p.veio], ['Prazo', !!p.prazo]];
  const salvar = async () => {
    setSalvando(true);
    try {
      const st = (PED_ST[p.tipo] || PED_ST.interno)[0][0];
      registrar(sessao, os.id, '🪵', 'Pedido de peça extra', (p.obs || '').slice(0, 120));
      await F().fsMod.addDoc(col('empresas', sessao.empresaId, 'pedidos'), { ...p, st, osId: os.id, osCod: numOS(os), cliente: os.cliente?.nome || '', ambiente: (os.ambientes || []).map(a => a.nome).join(', ') || os.ambienteResumo || '', quem: sessao.nome, em: nowIso(), hist: [{ st, quem: sessao.nome, em: nowIso() }] });
      toast('Pedido enviado.', 'ok'); fechar();
    } catch (e) { toast('Não salvou: ' + e.message, 'erro'); }
    setSalvando(false);
  };
  return html`
    <div class="sheet-t">🪵 Pedir peça extra</div>
    <div class="dim" style=${{ marginTop: '-6px' }}>${numOS(os)} · ${os.cliente?.nome} · ${(os.ambientes || []).map(a => a.nome).join(', ')}</div>
    <span class="lbl">O que precisa?</span>
    <div class="ped-itens">${PED_ITENS.map(([k, ic, t]) => html`<button key=${k} class=${'ped-item' + (p.item === k ? ' on' : '')} onClick=${() => set('item', k)}><span>${ic}</span>${t}</button>`)}</div>
    <div class="ped-linha">
      <div class="field"><span class="lbl">Quantidade</span><div class="stepper"><button onClick=${() => set('qtd', Math.max(1, (+p.qtd || 1) - 1))}>−</button><b>${p.qtd}</b><button onClick=${() => set('qtd', (+p.qtd || 0) + 1)}>+</button></div></div>
      <div class="field" style=${{ flex: 1 }}><span class="lbl">Cor / acabamento</span><${CatalogoInput} value=${p.cor} placeholder="Ex: Freijó Duratex, branco TX…" catalogo=${catalogo} filtro=${{ tipos: ['MDF'] }} sessao=${sessao} onChange=${v => set('cor', v)} onPick=${it => set('cor', [it.nome, it.fabricante].filter(Boolean).join(' '))} className="inp" /></div>
    </div>
    ${ehPeca && html`
      <div class="ped-peca">
        <div class="ped-desenho">
          <div class="ped-chapa">
            ${['cima', 'baixo', 'esq', 'dir'].map(l => html`<button key=${l} class=${'fita-l ' + l + (p.fita[l] ? ' on' : '')} title=${'Fita ' + l} onClick=${() => setP(x => ({ ...x, semFita: false, fita: { ...x.fita, [l]: !x.fita[l] } }))}></button>`)}
            <div class=${'veio-marca v-' + (p.veio || 'n')}>${p.veio === 'h' ? '↔' : p.veio === 'v' ? '↕' : ''}</div>
            <input class="med larg" inputmode="numeric" placeholder="Larg." value=${p.larg} onInput=${e => set('larg', e.target.value.replace(/\D/g, ''))} />
            <input class="med alt" inputmode="numeric" placeholder="Alt." value=${p.alt} onInput=${e => set('alt', e.target.value.replace(/\D/g, ''))} />
          </div>
          <small class="dim">Toque nas bordas da peça para marcar a fita. Medidas em mm.</small>
        </div>
        <div class="stack" style=${{ gap: '8px' }}>
          <div><span class="lbl">Espessura</span><div class="row" style=${{ gap: '5px' }}>${['6', '15', '18', '25', '36'].map(e => html`<button key=${e} class=${'pill' + (p.esp === e ? ' on' : '')} onClick=${() => set('esp', e)}>${e}</button>`)}</div></div>
          <div><span class="lbl">Sentido do veio</span><div class="row" style=${{ gap: '5px' }}>${[['h', '↔ Horizontal'], ['v', '↕ Vertical'], ['x', 'Sem veio']].map(([k, t]) => html`<button key=${k} class=${'pill' + (p.veio === k ? ' on' : '')} onClick=${() => set('veio', k)}>${t}</button>`)}</div></div>
          <label class="row dim" style=${{ gap: '5px' }}><input type="checkbox" checked=${!!p.semFita} onChange=${e => setP(x => ({ ...x, semFita: e.target.checked, fita: e.target.checked ? { cima: false, baixo: false, esq: false, dir: false } : x.fita }))} /> Sem fita de borda</label>
        </div>
      </div>`}
    <div class="ped-linha">
      <div class="field"><span class="lbl">Precisa até</span><input class="inp" type="date" value=${p.prazo} onInput=${e => set('prazo', e.target.value)} /></div>
      <div class="field" style=${{ flex: 1 }}><span class="lbl">Observação</span><div class="row" style=${{ flexWrap: 'nowrap', gap: '4px' }}><input class="inp" placeholder="Ex: porta do aéreo riscou na montagem" value=${p.obs} onInput=${e => set('obs', e.target.value)} />
        <button class=${'btn ' + (fala.ouvindo ? 'btn-mic-on pulse' : 'btn-teal')} onClick=${fala.ouvindo ? fala.parar : fala.iniciar}>🎤</button>
        <button class="btn" onClick=${() => cam.current?.click()}>📷</button>
        <input ref=${cam} type="file" accept="image/*" capture="environment" hidden onChange=${async e => { const f = e.target.files[0]; e.target.value = ''; if (f) { const img = await imagemParaJpeg(f, 1024); setP(x => ({ ...x, fotos: [...x.fotos, img].slice(0, 4) })); } }} /></div></div>
    </div>
    ${p.fotos.length > 0 && html`<div class="dia-fotos">${p.fotos.map((f, i) => html`<span key=${i}><img src=${f} /><button onClick=${() => setP(x => ({ ...x, fotos: x.fotos.filter((_, j) => j !== i) }))}>✕</button></span>`)}</div>`}
    <div class="ped-check">${ck.map(([t, ok]) => html`<span key=${t} class=${ok ? 'ok' : ''}>${ok ? '✓' : '○'} ${t}</span>`)}</div>
    <button class="btn btn-grande btn-verde btn-block" disabled=${salvando} onClick=${salvar}>${salvando ? 'Enviando…' : '📦 Enviar pedido'}</button>`;
}

function CartaoPedido({ p, sessao, toast, pedirSenha }) {
  const sts = PED_ST[p.tipo] || PED_ST.interno;
  const i = sts.findIndex(s => s[0] === p.st), prox = sts[i + 1], s = sts[i] || sts[0];
  const mudar = async (st, motivo) => {
    registrar(sessao, p.osId, motivo ? '↺' : '🪵', 'Peça extra: ' + ((PED_ST[p.tipo] || PED_ST.interno).find(x => x[0] === st) || [, st])[1], motivo || '');
    try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'pedidos', p.id), { st, hist: [...(p.hist || []), { st, quem: sessao.nome, em: nowIso(), ...(motivo ? { motivo } : {}) }] }); }
    catch (e) { toast(e.message, 'erro'); }
  };
  const tp = PED_TIPOS.find(t => t[0] === p.tipo) || PED_TIPOS[0];
  return html`
    <div class="ped-card" style=${{ borderLeftColor: s[2] }}>
      <div class="row" style=${{ justifyContent: 'space-between', gap: '6px' }}>
        <span><b>${(PED_ITENS.find(x => x[0] === p.item) || [])[1]} ${(PED_ITENS.find(x => x[0] === p.item) || [])[2]}</b> <small class="dim">${tp[1]} ${tp[2]}</small></span>
        <span class="ped-st" style=${{ background: s[2] }}>${s[1]}</span>
      </div>
      <div class="ped-res">${resumoPed(p)}</div>
      ${p.obs && html`<div class="dim">${p.obs}</div>`}
      ${(p.fotos || []).length > 0 && html`<div class="dia-fotos">${p.fotos.map((f, j) => html`<span key=${j}><img src=${f} onClick=${() => window.open(f)} /></span>`)}</div>`}
      <div class="ped-trilho">${sts.map((x, j) => html`<i key=${x[0]} title=${x[1]} style=${{ background: j <= i ? x[2] : '#e7e5e4' }}></i>`)}</div>
      <div class="row" style=${{ justifyContent: 'space-between', gap: '6px' }}>
        <small class="dim">${p.osCod} · ${p.ambiente} · ${p.quem} · ${fmtData(p.em)}${p.prazo ? ' · até ' + p.prazo.split('-').reverse().slice(0, 2).join('/') : ''}${p.parceiro ? ' · ' + p.parceiro : ''}</small>
        <span class="row" style=${{ gap: '4px' }}>
          ${i > 0 && html`<button class="btn btn-sm btn-ghost" title="Voltar" onClick=${() => pedirSenha('Voltar pedido para "' + sts[i - 1][1] + '"', (m) => mudar(sts[i - 1][0], m))}>↺</button>`}
          ${prox && html`<button class="btn btn-sm btn-verde" onClick=${() => mudar(prox[0])}>✓ ${prox[1]}</button>`}
        </span>
      </div>
    </div>`;
}

function PedidosOS({ sessao, os, toast, catalogo }) {
  const [lista, setLista] = useState(null);
  const [novo, setNovo] = useState(false);
  const [conf, setConf] = useState(null);
  useEffect(() => {
    const { onSnapshot, query, where } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'pedidos'), where('osId', '==', os.id)), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.em).localeCompare(String(a.em)))), () => setLista([]));
  }, [os.id]);
  if (novo) return html`<${NovoPedido} sessao=${sessao} os=${os} toast=${toast} catalogo=${catalogo} fechar=${() => setNovo(false)} />`;
  return html`
    <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sheet-t">🪵 Peças extras</div><button class="btn btn-verde" onClick=${() => setNovo(true)}>＋ Pedir peça</button></div>
    ${lista === null ? html`<div class="dim">Carregando…</div>` : lista.length === 0 ? html`<div class="vazio dim">Nenhuma peça pedida. O marceneiro toca em “Pedir peça” quando precisar de algo na obra.</div>` : lista.map(p => html`<${CartaoPedido} key=${p.id} p=${p} sessao=${sessao} toast=${toast} pedirSenha=${(t, fn) => setConf({ t, fn })} />`)}
    ${conf && html`<${SenhaMotivo} titulo=${conf.t} texto="Voltar uma etapa pede motivo e senha." botao="Voltar" onOk=${conf.fn} fechar=${() => setConf(null)} />`}`;
}

function TelaPedidos({ sessao, toast, abrirOS }) {
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState('abertos');
  const [tipo, setTipo] = useState('');
  const [busca, setBusca] = useState('');
  const [conf, setConf] = useState(null);
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'pedidos'), orderBy('em', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([]));
  }, []);
  const l = (lista || []).filter(p => (p.tipo || 'interno') === 'interno' && (filtro === 'todos' || pedAberto(p)) && (!tipo || p.tipo === tipo) && (!busca || norm([p.cliente, p.osCod, p.ambiente, resumoPed(p), p.obs].join(' ')).includes(norm(busca))));
  const cont = (t) => (lista || []).filter(p => pedAberto(p) && (!t || p.tipo === t)).length;
  return html`
    <div class="fade-up stack qg">
      <div><h2>Peças extras</h2><div class="dim">Peças que os marceneiros pediram na obra. Para pedir: Quadro geral → cliente → ambiente → 🪵 Peças extras.</div></div>
      <div class="qg-filtros">${(PED_ST.interno).map(([k, t, c]) => html`<span key=${k} class="qg-f" style=${{ borderColor: c }}>${t} <b>${(lista || []).filter(p => (p.st || 'solicitado') === k).length}</b></span>`)}</div>
      <div class="row" style=${{ gap: '6px' }}><input class="inp" style=${{ flex: 1 }} placeholder="🔍 Buscar cliente, OS, peça…" value=${busca} onInput=${e => setBusca(e.target.value)} />
        <div class="seg-mini"><button class=${filtro === 'abertos' ? 'on' : ''} onClick=${() => setFiltro('abertos')}>Em aberto</button><button class=${filtro === 'todos' ? 'on' : ''} onClick=${() => setFiltro('todos')}>Todos</button></div></div>
      ${lista === null ? html`<div class="card">Carregando…</div>` : l.length === 0 ? html`<div class="card vazio dim">Nenhum pedido.</div>` : l.map(p => html`<div key=${p.id}><div class="ped-cli" onClick=${() => abrirOS(p.osId)}><b>${p.cliente}</b> · ${p.osCod} ${p.ambiente}</div><${CartaoPedido} p=${p} sessao=${sessao} toast=${toast} pedirSenha=${(t, fn) => setConf({ t, fn })} /></div>`)}
      ${conf && html`<${SenhaMotivo} titulo=${conf.t} texto="Voltar uma etapa pede motivo e senha." botao="Voltar" onOk=${conf.fn} fechar=${() => setConf(null)} />`}
    </div>`;
}

/* ---------- Tempos da obra (por etapa) ---------- */
function temposOS(o) {
  const ini = o.contrato?.dataAssinatura && lerPrazo(o.contrato.dataAssinatura) ? lerPrazo(o.contrato.dataAssinatura).getTime() : Date.parse(o.criadoEm || '') || null;
  if (!ini) return null;
  const fim = o.status === 'concluida' ? (Date.parse((o.statusHist || []).slice().reverse().find(h => h.st === 'concluida')?.em || '') || Date.parse(o.atualizadoEm || '') || Date.now()) : Date.now();
  const hist = (o.statusHist || []).filter(h => h.em).map(h => ({ st: h.st, t: Date.parse(h.em) })).sort((a, b) => a.t - b.t);
  const seg = [];
  let atual = 'elaboracao', t0 = ini;
  for (const h of hist) { if (h.t > t0) seg.push({ st: atual, d: h.t - t0 }); atual = h.st; t0 = Math.max(t0, h.t); }
  if (atual !== 'concluida' && fim > t0) seg.push({ st: atual, d: fim - t0 });
  const porSt = {}; seg.forEach(x => { porSt[x.st] = (porSt[x.st] || 0) + x.d; });
  return { total: fim - ini, porSt, temHist: hist.length > 0 };
}
const dias = (ms) => { const d = ms / 86400000; return d < 1 ? Math.max(1, Math.round(ms / 3600000)) + 'h' : Math.round(d) + (Math.round(d) === 1 ? ' dia' : ' dias'); };
const COR_ST = { elaboracao: '#a8a29e', projetos: '#3b82f6', producao: '#0d9488', liberacao: '#f59e0b', montagem: '#7c3aed', concluida: '#16a34a' };
function BarraTempos({ o }) {
  const t = temposOS(o); if (!t) return null;
  const tot = Object.values(t.porSt).reduce((a, b) => a + b, 0) || 1;
  return html`<div class="tempos">
    <div class="tempos-top"><span>⏱ Obra: <b>${dias(t.total)}</b></span>${t.porSt.projetos ? html`<span>📐 Projeto: <b>${dias(t.porSt.projetos)}</b></span>` : ''}${t.porSt.producao ? html`<span>🏭 Produção: <b>${dias(t.porSt.producao)}</b></span>` : ''}</div>
    <div class="tempos-barra">${STATUS_OS.filter(s => t.porSt[s.v]).map(s => html`<i key=${s.v} title=${s.t + ': ' + dias(t.porSt[s.v])} style=${{ width: (t.porSt[s.v] / tot * 100) + '%', background: COR_ST[s.v] }}></i>`)}</div>
  </div>`;
}

/* ---------- Folha de pendências de finalização (PDF) ---------- */
async function montarFolha(sessao, oss) {
  const { getDocs, query, where } = F().fsMod;
  const out = [];
  for (const o of oss) {
    const d = await getDocs(col('empresas', sessao.empresaId, 'os', o.id, 'diario'));
    const pend = d.docs.map(x => x.data()).filter(x => x.tipo === 'pendencia' && !x.resolvida).sort((a, b) => String(a.em).localeCompare(String(b.em)));
    const pq = await getDocs(query(col('empresas', sessao.empresaId, 'pedidos'), where('osId', '==', o.id)));
    const peds = pq.docs.map(x => x.data()).filter(pedAberto);
    out.push({ o, pend, peds });
  }
  return out;
}
function ImpressaoFolha({ dados, empresa }) {
  const cli = dados[0]?.o.cliente?.nome || '';
  const cor = temCores(dados[0]?.o) ? dados[0].o.cores : ['#1F2937', '#C8A27A', '#B45309'];
  const nP = dados.reduce((n, x) => n + x.pend.length + x.peds.length, 0);
  return html`<div class="po" style=${varsCores(cor)}>
    <div class="po-topo"><div class="row" style=${{ gap: '12px', flexWrap: 'nowrap' }}><${LogoImp} empresa=${empresa} /><div><div class="po-emp">${empresa || ''}</div><div class="po-tit">Pendências de finalização</div><div class="po-sub">${cli} · ${dados.length} ${dados.length === 1 ? 'ambiente' : 'ambientes'}</div></div></div>
      <div class="po-num"><div class="po-cod">${nP}</div><div class="po-meta">itens em aberto · ${new Date().toLocaleDateString('pt-BR')}</div></div></div>
    ${dados.map(({ o, pend, peds }) => html`
      <div key=${o.id} class="po-amb">
        <div class="po-amb-t"><span>${numOS(o)}</span>${(o.ambientes || []).map(a => a.nome).join(', ') || o.ambienteResumo || ''}</div>
        ${pend.length + peds.length === 0 ? html`<div style=${{ padding: '6px 10px', color: '#16a34a' }}>✓ Sem pendências</div>` : html`
        <table><thead><tr><th style=${{ width: '28px' }}>✓</th><th>Pendência / pedido</th><th style=${{ width: '22%' }}>Registrado</th></tr></thead><tbody>
          ${pend.map((p, i) => html`<tr key=${'d' + i}><td><span class="caixa"></span></td><td>⚠ ${p.texto || '(foto)'}${(p.fotos || []).length ? html`<div class="folha-fotos">${p.fotos.slice(0, 3).map((f, j) => html`<img key=${j} src=${f} />`)}</div>` : ''}</td><td>${fmtData(p.em)} · ${p.quem}</td></tr>`)}
          ${peds.map((p, i) => html`<tr key=${'p' + i}><td><span class="caixa"></span></td><td>📦 ${resumoPed(p)}${p.obs ? ' — ' + p.obs : ''} <b>(${stPed(p)[1]})</b></td><td>${fmtData(p.em)} · ${p.quem}</td></tr>`)}
        </tbody></table>`}
      </div>`)}
    <div class="po-obs" style=${{ marginTop: '10px' }}><b>Observações da vistoria</b><div style=${{ height: '60px' }}></div></div>
    <div class="po-ass">${['Montador', 'Responsável técnico', 'Cliente'].map(t => html`<div key=${t}><span></span>${t}</div>`)}</div>
    <div class="po-rod"><span>${empresa || ''} · ${cli}</span><span>Gerado pelo Gestão Pró</span></div>
  </div>`;
}

/* ---------- Folha de compras padrão (importada do PCP Dinabox) ---------- */
const PARC_PADRAO = [
  { nome: 'Laca Nobre', esp: 'Pintura / laca' }, { nome: 'Projetta', esp: 'Vidros' }, { nome: 'Adeblu', esp: 'Esquadrias e lâminas' },
  { nome: 'Pintura Ezequiel', esp: 'Pintura' }, { nome: 'Pintura Celso', esp: 'Pintura' }, { nome: 'Eduardo', esp: '' }, { nome: 'Marmoraria Itália', esp: 'Pedras' },
];
const CAT_COMPRA = ['Chapas', 'Fitas de borda', 'Ferragens', 'Puxadores', 'Perfis', 'Iluminação', 'Vidros', 'Acessórios', 'Químicos', 'Outros'];
const ICO_CAT = { 'Chapas': '🟫', 'Fitas de borda': '🎞️', 'Ferragens': '🔩', 'Puxadores': '🔘', 'Perfis': '📏', 'Iluminação': '💡', 'Vidros': '🪟', 'Acessórios': '🧩', 'Químicos': '🧪', 'Outros': '📦' };
function ComprasOS({ sessao, os, toast }) {
  const [doc, setDoc] = useState(undefined);
  const [lendo, setLendo] = useState('');
  const [prev, setPrev] = useState(null);
  const [novo, setNovo] = useState({ categoria: 'Ferragens', descricao: '', qtd: '', unidade: 'un' });
  const [imprimir, setImprimir] = useState(false);
  const [modo, setModo] = useState('categoria');
  const [escolher, setEscolher] = useState(null); // {ids:[...]} para escolher parceiro
  const [parceiros, setParceiros] = useState([]);
  const [novoParc, setNovoParc] = useState('');
  const inp = useRef(null);
  const ref = docRef('empresas', sessao.empresaId, 'compras', os.id);
  useEffect(() => F().fsMod.onSnapshot(docRef('empresas', sessao.empresaId), d => setParceiros(d.data()?.parceirosLista || PARC_PADRAO), () => {}), []);
  const salvarParceiros = async (l) => { try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { parceirosLista: l }); } catch (e) { toast(e.message, 'erro'); } };
  useEffect(() => F().fsMod.onSnapshot(ref, d => setDoc(d.exists() ? d.data() : null), () => setDoc(null)), [os.id]);
  const itens = doc?.itens || [];
  const gravar = async (novos, extra = {}) => { if (extra.__log) { registrar(sessao, os.id, '🛒', extra.__log); delete extra.__log; } try { await F().fsMod.setDoc(ref, { osId: os.id, osCod: numOS(os), cliente: os.cliente?.nome || '', itens: novos, atualizadoEm: nowIso(), atualizadoPor: sessao.nome, ...extra }, { merge: true }); } catch (e) { toast(e.message, 'erro'); } };
  const importar = async (file) => {
    if (!file) return;
    try {
      setLendo('Lendo ' + file.name + '…');
      const r = await extrairArquivo(file);
      setLendo('A IA está montando a folha…');
      const res = await chamarIA('compras_dinabox', { texto: r.texto, temImagens: (r.imagens || []).length > 0 }, r.imagens || []);
      setPrev({ arquivo: file.name, itens: (res.itens || []).map(i => ({ ...i, categoria: CAT_COMPRA.includes(i.categoria) ? i.categoria : 'Outros', ok: true })) });
    } catch (e) { toast('Não importou: ' + e.message, 'erro'); }
    setLendo('');
  };
  const confirmar = async () => {
    const add = prev.itens.filter(i => i.ok).map(({ ok, ...i }) => ({ ...i, id: rand(6), comprado: false }));
    await gravar([...itens, ...add], { origem: 'Dinabox PCP · ' + prev.arquivo, __log: 'Folha de compras importada (' + add.length + ' itens)' });
    toast(add.length + ' itens na folha de compras.', 'ok'); setPrev(null);
  };
  const marcar = async (id) => { const it = itens.find(i => i.id === id); let mot = ''; if (it?.comprado) { mot = await pedirMotivo('Desmarcar compra', 'Este item já estava comprado. Informe o motivo.'); if (!mot) return; } registrar(sessao, os.id, it?.comprado ? '↺' : '🛒', (it?.comprado ? 'Compra desmarcada: ' : 'Comprado: ') + (it?.descricao || '') + (it?.parceiro ? ' · ' + it.parceiro : ''), mot); return gravar(itens.map(i => i.id === id ? { ...i, comprado: !i.comprado, compradoPor: !i.comprado ? sessao.nome : '', compradoEm: !i.comprado ? nowIso() : '' } : i)); };
  const remover = (id) => gravar(itens.filter(i => i.id !== id));
  const grupos = modo === 'parceiro'
    ? [...new Set(itens.map(i => i.parceiro || ''))].sort((a, b) => (a === '') - (b === '') || a.localeCompare(b)).map(p => [p || 'Sem parceiro definido', itens.filter(i => (i.parceiro || '') === p), p])
    : CAT_COMPRA.map(c => [c, itens.filter(i => i.categoria === c)]).filter(([, l]) => l.length);
  const feitos = itens.filter(i => i.comprado).length;
  if (prev) return html`
    <div class="sheet-t">📥 Conferir importação</div>
    <div class="dim">${prev.arquivo} · ${prev.itens.length} itens encontrados. Desmarque o que não for comprar.</div>
    <div class="compras-lista">${prev.itens.map((i, k) => html`<label key=${k} class=${'compra-i' + (i.ok ? '' : ' off')}><input type="checkbox" checked=${i.ok} onChange=${e => setPrev(p => ({ ...p, itens: p.itens.map((x, j) => j === k ? { ...x, ok: e.target.checked } : x) }))} />
      <span>${ICO_CAT[i.categoria]}</span><span class="grow"><b>${i.descricao}</b><small>${[i.codigo, i.marca, i.categoria].filter(Boolean).join(' · ')}</small></span><b class="compra-q">${i.qtd} ${i.unidade || ''}</b></label>`)}</div>
    <div class="row" style=${{ gap: '6px' }}><button class="btn" onClick=${() => setPrev(null)}>Cancelar</button><button class="btn btn-verde" style=${{ flex: 1 }} onClick=${confirmar}>✓ Colocar ${prev.itens.filter(i => i.ok).length} itens na folha</button></div>`;
  return html`
    <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sheet-t">🛒 Folha de compras</div>
      ${itens.length > 0 && html`<button class="btn btn-sm" onClick=${() => { setImprimir(true); setTimeout(() => { window.print(); setImprimir(false); }, 300); }}>🖨 Imprimir folha padrão</button>`}</div>
    <button class="btn btn-grande btn-block" disabled=${!!lendo} onClick=${() => inp.current?.click()}>${lendo || '📥 Importar folha de compras do PCP (Dinabox)'}</button>
    <input ref=${inp} type="file" hidden accept=".pdf,.xlsx,.xls,.csv,.txt,image/*" onChange=${e => { importar(e.target.files[0]); e.target.value = ''; }} />
    <small class="dim">No Dinabox, exporte a folha de compras do PCP (PDF ou Excel) e escolha o arquivo aqui.</small>
    ${doc === undefined ? html`<div class="dim">Carregando…</div>` : itens.length === 0 ? html`<div class="vazio dim">Nenhum item ainda.</div>` : html`
      <div class="compras-prog"><i style=${{ width: (feitos / itens.length * 100) + '%' }}></i><span>${feitos}/${itens.length} comprados</span></div>
      <div class="row" style=${{ justifyContent: 'space-between', gap: '6px' }}>
        <div class="seg-mini"><button class=${modo === 'categoria' ? 'on' : ''} onClick=${() => setModo('categoria')}>Por categoria</button><button class=${modo === 'parceiro' ? 'on' : ''} onClick=${() => setModo('parceiro')}>🤝 Por parceiro</button></div>
      </div>
      ${grupos.map(([c, l, parcNome]) => html`<div key=${c}><div class="compra-cat row" style=${{ justifyContent: 'space-between' }}><span>${modo === 'parceiro' ? (parcNome ? '🤝' : '❔') : ICO_CAT[c]} ${c} <small>${l.filter(i => i.comprado).length}/${l.length}</small></span>
          <span class="row" style=${{ gap: '4px' }}>
            <button class="btn btn-sm btn-ghost" onClick=${() => setEscolher({ ids: l.map(i => i.id) })}>🤝 ${modo === 'parceiro' ? 'Trocar' : 'Parceiro p/ todos'}</button>
            ${modo === 'parceiro' && parcNome && html`<button class="btn btn-sm" onClick=${() => { setImprimir(parcNome); setTimeout(() => { window.print(); setImprimir(false); }, 300); }}>🖨 Pedido p/ ${parcNome}</button>`}
          </span></div>
        <div class="compras-lista">${l.map(i => html`<div key=${i.id} class=${'compra-i' + (i.comprado ? ' feito' : '')}>
          <button class="compra-ck" onClick=${() => marcar(i.id)}>${i.comprado ? '✓' : ''}</button>
          <span class="grow"><b>${i.descricao}</b><small>${[i.codigo, i.marca, i.obs, i.comprado ? 'comprado por ' + i.compradoPor : ''].filter(Boolean).join(' · ')}</small></span>
          <button class=${'parc-chip' + (i.parceiro ? ' tem' : '')} onClick=${() => setEscolher({ ids: [i.id] })}>${i.parceiro ? '🤝 ' + i.parceiro : '＋ parceiro'}</button>
          <b class="compra-q">${i.qtd} ${i.unidade || ''}</b><button class="x-btn" onClick=${() => remover(i.id)}>✕</button></div>`)}</div></div>`)}`}
    <div class="compra-add">
      <select class="inp inp-sm" value=${novo.categoria} onChange=${e => setNovo({ ...novo, categoria: e.target.value })}>${CAT_COMPRA.map(c => html`<option key=${c}>${c}</option>`)}</select>
      <input class="inp inp-sm" placeholder="Item" value=${novo.descricao} onInput=${e => setNovo({ ...novo, descricao: e.target.value })} />
      <input class="inp inp-sm" placeholder="Qtd" style=${{ width: '60px' }} value=${novo.qtd} onInput=${e => setNovo({ ...novo, qtd: e.target.value })} />
      <button class="btn btn-sm btn-primary" onClick=${() => { if (!novo.descricao) return; gravar([...itens, { ...novo, id: rand(6), comprado: false }]); setNovo({ ...novo, descricao: '', qtd: '' }); }}>＋</button>
    </div>
    ${escolher && ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && setEscolher(null)}>
      <div class="card modal-caixa stack">
        <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">🤝 Comprar de qual parceiro? <small class="dim">(${escolher.ids.length} ${escolher.ids.length === 1 ? 'item' : 'itens'})</small></div><button class="x-btn" onClick=${() => setEscolher(null)}>✕</button></div>
        <div class="parc-grade">
          ${parceiros.map((pa, k) => html`<button key=${k} class="parc-op" onClick=${() => { registrar(sessao, os.id, '🤝', 'Compra com parceiro: ' + pa.nome, itens.filter(i => escolher.ids.includes(i.id)).map(i => i.descricao).join(', ').slice(0, 160)); gravar(itens.map(i => escolher.ids.includes(i.id) ? { ...i, parceiro: pa.nome } : i)); setEscolher(null); }}><b>${pa.nome}</b><small>${pa.esp || ''}</small></button>`)}
          <button class="parc-op sem" onClick=${() => { gravar(itens.map(i => escolher.ids.includes(i.id) ? { ...i, parceiro: '' } : i)); setEscolher(null); }}><b>Nenhum</b><small>limpar</small></button>
        </div>
        <div class="row" style=${{ gap: '5px', flexWrap: 'nowrap' }}><input class="inp inp-sm" placeholder="Novo parceiro / fornecedor" value=${novoParc} onInput=${e => setNovoParc(e.target.value)} />
          <button class="btn btn-sm btn-primary" onClick=${() => { const n = novoParc.trim(); if (!n) return; salvarParceiros([...parceiros, { nome: n, esp: '' }]); setNovoParc(''); }}>＋ Cadastrar</button></div>
        <details><summary class="dim">Gerenciar lista de parceiros</summary>
          ${parceiros.map((pa, k) => html`<div key=${k} class="row" style=${{ gap: '5px', flexWrap: 'nowrap', marginTop: '4px' }}>
            <input class="inp inp-sm" value=${pa.nome} onChange=${e => salvarParceiros(parceiros.map((x, j) => j === k ? { ...x, nome: e.target.value } : x))} />
            <input class="inp inp-sm" placeholder="Especialidade" value=${pa.esp || ''} onChange=${e => salvarParceiros(parceiros.map((x, j) => j === k ? { ...x, esp: e.target.value } : x))} />
            <button class="x-btn" onClick=${() => salvarParceiros(parceiros.filter((_, j) => j !== k))}>✕</button></div>`)}
        </details>
      </div></div>`, document.body)}
    ${imprimir && ReactDOM.createPortal(html`<${ImpressaoCompras} os=${os} doc=${typeof imprimir === 'string' ? { ...doc, itens: itens.filter(i => i.parceiro === imprimir), parceiro: imprimir } : doc} empresa=${sessao.empresaNome} />`, document.getElementById('print-area'))}`;
}
function LogoImp({ empresa }) { return window.__LOGO ? html`<img class="po-logo" src=${window.__LOGO} alt=${empresa || ''} />` : null; }
function ImpressaoCompras({ os, doc, empresa }) {
  const cor = temCores(os) ? os.cores : ['#1F2937', '#C8A27A', '#B45309'];
  const itens = doc?.itens || [];
  return html`<div class="po" style=${varsCores(cor)}>
    <div class="po-topo"><div class="row" style=${{ gap: '12px', flexWrap: 'nowrap' }}><${LogoImp} empresa=${empresa} /><div><div class="po-emp">${empresa || ''}</div><div class="po-tit">${doc?.parceiro ? 'Pedido de compra' : 'Folha de compras'}</div>${doc?.parceiro ? html`<div class="po-sub">Fornecedor: <b>${doc.parceiro}</b></div>` : ''}<div class="po-sub">${os.cliente?.nome || ''} · ${(os.ambientes || []).map(a => a.nome).join(', ')}</div></div></div>
      <div class="po-num"><div class="po-cod">${numOS(os)}</div><div class="po-meta">${itens.length} itens · ${new Date().toLocaleDateString('pt-BR')}${doc?.origem ? ' · ' + doc.origem : ''}</div></div></div>
    ${CAT_COMPRA.map(c => [c, itens.filter(i => i.categoria === c)]).filter(([, l]) => l.length).map(([c, l]) => html`
      <div key=${c} class="po-amb"><div class="po-amb-t"><span>${l.length}</span>${c}</div>
        <table><thead><tr><th style=${{ width: '26px' }}>✓</th><th style=${{ width: '14%' }}>Código</th><th>Descrição</th><th style=${{ width: '14%' }}>Marca</th><th style=${{ width: '12%' }}>Qtd</th><th style=${{ width: '16%' }}>Fornecedor / valor</th></tr></thead>
          <tbody>${l.map(i => html`<tr key=${i.id}><td>${i.comprado ? '✔' : html`<span class="caixa"></span>`}</td><td class="mono">${i.codigo || ''}</td><td><b>${i.descricao}</b>${i.obs ? html`<br/><small>${i.obs}</small>` : ''}</td><td>${i.marca || ''}</td><td class="c"><b>${i.qtd} ${i.unidade || ''}</b></td><td>${i.parceiro || ''}</td></tr>`)}</tbody></table></div>`)}
    <div class="po-ass">${['Solicitado por', 'Compras', 'Recebido na fábrica'].map(t => html`<div key=${t}><span></span>${t}</div>`)}</div>
    <div class="po-rod"><span>${empresa || ''} · OS ${numOS(os)}</span><span>Gerado pelo Gestão Pró</span></div>
  </div>`;
}

/* ---------- Vídeos do móvel montado na marcenaria (para o montador) ---------- */
function embedVideo(url) {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/);
  if (yt) return 'https://www.youtube.com/embed/' + yt[1];
  const dr = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (dr) return 'https://drive.google.com/file/d/' + dr[1] + '/preview';
  return null;
}
function VideosOS({ sessao, os, toast }) {
  const [url, setUrl] = useState(''); const [tit, setTit] = useState('');
  const vids = os.videos || [];
  const salvar = async (lista) => { try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', os.id), { videos: lista }); } catch (e) { toast(e.message, 'erro'); } };
  return html`
    <div class="sheet-t">🎬 Vídeos do móvel montado</div>
    <div class="dim" style=${{ marginTop: '-6px' }}>Grave o móvel montado na marcenaria e cole o link (YouTube ou Google Drive) — o montador assiste aqui antes de montar na obra.</div>
    <div class="dia-box">
      <input class="inp" placeholder="Título (ex: Balcão da pia montado)" value=${tit} onInput=${e => setTit(e.target.value)} />
      <input class="inp" placeholder="Cole o link do vídeo (YouTube / Google Drive)" value=${url} onInput=${e => setUrl(e.target.value)} />
      <button class="btn btn-grande btn-verde btn-block" disabled=${!/^https?:\/\//.test(url.trim())} onClick=${() => { salvar([{ url: url.trim(), titulo: tit.trim() || 'Vídeo de montagem', quem: sessao.nome, em: nowIso() }, ...vids]); setUrl(''); setTit(''); toast('Vídeo adicionado.', 'ok'); }}>＋ Adicionar vídeo</button>
    </div>
    ${vids.length === 0 ? html`<div class="vazio dim">Nenhum vídeo ainda.</div>` : vids.map((v, i) => { const e = embedVideo(v.url); return html`
      <div key=${i} class="video-card">
        <div class="row" style=${{ justifyContent: 'space-between' }}><b>🎬 ${v.titulo}</b><button class="x-btn" onClick=${() => salvar(vids.filter((_, j) => j !== i))}>✕</button></div>
        ${e ? html`<iframe src=${e} allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>` : html`<a class="btn btn-block" href=${v.url} target="_blank" rel="noopener">▶ Abrir vídeo</a>`}
        <small class="dim">${v.quem} · ${fmtData(v.em)}</small>
      </div>`; })}`;
}

/* ---------- Quadro geral: andamento de cada cliente (celular, só botões) ---------- */
const TIPOS_PARC = [
  ['vidros', '🪟', 'Vidros & espelhos'], ['pintura', '🎨', 'Pintura / laca'], ['tapecaria', '🛋️', 'Tapeçaria'],
  ['corte', '✂️', 'Corte terceirizado'], ['lamina', '🌳', 'Lâminas / esquadrias'], ['pedra', '🪨', 'Pedra / marmoraria'],
  ['serralheria', '⚙️', 'Serralheria / metais'], ['outro', '📦', 'Outro parceiro'],
];
const ST_PARC = [
  ['orcar', 'Pedir orçamento', 'A orçar', '#9ca3af'],
  ['aguard_orc', 'Orçamento pedido', 'Aguard. orçamento', '#f59e0b'],
  ['aguard_aprov', 'Orçamento chegou', 'Aguard. aprovação', '#ea580c'],
  ['pedido', 'Aprovado / mandado fazer', 'Mandado fazer', '#2563eb'],
  ['recebido', 'Recebido na fábrica', 'Recebido ✓', '#16a34a'],
];
function parceirosDaOS(o) {
  const P = o.padrao || {}, et = o.execucao?.etapas || {}, salvo = o.parceiros || {};
  const auto = {
    vidros: !!P.vidros?.ativo,
    pintura: P.acab?.interno?.tipo === 'laca' || P.acab?.externo?.tipo === 'laca' || et.pintura?.onde === 'terceirizada',
    tapecaria: !!P.tec?.ativo || et.tapecaria?.onde === 'terceirizada',
    corte: et.corte?.onde === 'terceirizada',
    lamina: P.acab?.interno?.tipo === 'lamina' || P.acab?.externo?.tipo === 'lamina',
  };
  return TIPOS_PARC.filter(([k]) => (auto[k] || salvo[k]) && salvo[k]?.st !== 'nao')
    .map(([k, ic, t]) => ({ k, ic, t, ...(salvo[k] || {}), st: salvo[k]?.st || 'orcar' }));
}
const infoSt = (st) => ST_PARC.find(x => x[0] === st) || ST_PARC[0];

function QuadroGeral({ sessao, abrirOS, toast, catalogo }) {
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [busca, setBusca] = useState('');
  const [sheet, setSheet] = useState(null); // {osId, tipo:'parc'|'prod'|'add', k}
  const [conf, setConf] = useState(null); // {titulo, oque, fazer(motivo)}
  const [cliSel, setCliSel] = useState(null);
  const [folha, setFolha] = useState(null);
  const [pedAb, setPedAb] = useState({});
  useEffect(() => F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'pedidos'), s => { const m = {}; s.docs.forEach(d => { const x = d.data(); if (pedAberto(x)) m[x.osId] = (m[x.osId] || 0) + 1; }); setPedAb(m); }, () => {}), []);
  const imprimirFolha = async (oss) => { toast('Montando a folha…'); try { const dados = await montarFolha(sessao, oss); setFolha(dados); setTimeout(() => { window.print(); setFolha(null); }, 400); } catch (e) { toast(e.message, 'erro'); } };
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([]));
  }, []);
  const salvar = async (o, patch, msg) => {
    if (patch.status && patch.status !== o.status) patch = { ...patch, statusHist: [...(o.statusHist || []), { st: patch.status, em: nowIso(), quem: sessao.nome }] };
    if (patch.execucao?.etapas) { const et = { ...patch.execucao.etapas }; Object.keys(et).forEach(k => { if (et[k]?.status === 'andamento' && !et[k].iniciadaEm) et[k] = { ...et[k], iniciadaEm: nowIso(), iniciadaPor: sessao.nome }; }); patch = { ...patch, execucao: { ...patch.execucao, etapas: et } }; }
    try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', o.id), { ...patch, atualizadoEm: nowIso(), atualizadoPor: sessao.nome }); if (msg) toast(msg, 'ok'); }
    catch (e) { toast('Não salvou: ' + e.message, 'erro'); }
  };
  const setParc = (o, k, patch, msg) => {
    const atual = (o.parceiros || {})[k] || {};
    const hist = patch.st && patch.st !== atual.st ? [...(atual.hist || []), { st: patch.st, quem: sessao.nome, em: nowIso() }] : (atual.hist || []);
    salvar(o, { parceiros: { ...(o.parceiros || {}), [k]: { ...atual, st: atual.st || 'orcar', ...patch, hist } } }, msg);
  };
  const concluirEtapa = (o, k) => {
    const etapas = { ...(o.execucao?.etapas || {}) };
    etapas[k] = { ...(etapas[k] || {}), status: 'pronto', concluidaEm: nowIso() };
    const i = ETAPAS_FAB.findIndex(e => e[0] === k), prox = ETAPAS_FAB[i + 1]?.[0];
    if (prox && prox !== 'montagem' && (etapas[prox]?.status || 'pendente') === 'pendente') etapas[prox] = { ...(etapas[prox] || {}), status: 'andamento' };
    const todas = ETAPAS_FAB.every(([x]) => etapas[x]?.status === 'pronto');
    const semMontagem = ETAPAS_FAB.filter(([x]) => x !== 'montagem').every(([x]) => etapas[x]?.status === 'pronto');
    const status = todas ? 'concluida' : etapas.montagem?.status === 'andamento' ? 'montagem' : semMontagem ? 'liberacao' : 'producao';
    salvar(o, { execucao: { ...(o.execucao || {}), etapas }, status: o.status === 'concluida' ? o.status : status }, '✓ ' + ETAPAS_FAB[i][1] + ' concluída');
  };
  const reab = (o, oque, motivo) => [...(o.reaberturas || []), { oque, motivo, quem: sessao.nome, quando: nowIso() }];
  const voltarEtapa = (o, k) => {
    const t = (ETAPAS_FAB.find(e => e[0] === k) || [])[1];
    setConf({ titulo: 'Reabrir etapa: ' + t, fazer: async (motivo) => {
      const etapas = { ...(o.execucao?.etapas || {}) };
      etapas[k] = { ...(etapas[k] || {}), status: 'andamento' };
      await salvar(o, { execucao: { ...(o.execucao || {}), etapas }, reaberturas: reab(o, 'Etapa ' + t + ' reaberta', motivo) }, 'Etapa reaberta');
    } });
  };
  const voltarParc = (o, p, v) => {
    setConf({ titulo: p.t + ': voltar para "' + infoSt(v)[2] + '"', fazer: async (motivo) => {
      const atual = (o.parceiros || {})[p.k] || {};
      await salvar(o, { parceiros: { ...(o.parceiros || {}), [p.k]: { ...atual, st: v, hist: [...(atual.hist || []), { st: v, quem: sessao.nome, em: nowIso(), motivo }] } }, reaberturas: reab(o, p.t + ': ' + infoSt(atual.st || 'orcar')[2] + ' → ' + infoSt(v)[2], motivo) }, 'Situação voltada');
    } });
  };
  const ativas = (lista || []).filter(o => o.status !== 'concluida');
  const cards = ativas.map(o => {
    const parc = parceirosDaOS(o);
    const et = o.execucao?.etapas || {};
    const feitas = ETAPAS_FAB.filter(([k]) => et[k]?.status === 'pronto').length;
    const pendParc = parc.filter(p => p.st !== 'recebido');
    return { o, parc, et, feitas, pendParc, atras: atrasada(o), aprov: parc.some(p => p.st === 'aguard_aprov') };
  }).filter(c => {
    if (busca && !norm(numOS(c.o) + ' ' + (c.o.cliente?.nome || '') + ' ' + (c.o.ambientes || []).map(a => a.nome).join(' ')).includes(norm(busca))) return false;
    if (filtro === 'parceiros') return c.pendParc.length > 0;
    if (filtro === 'aprovacao') return c.aprov;
    if (filtro === 'atrasadas') return c.atras;
    return true;
  });
  const cont = { parceiros: ativas.filter(o => parceirosDaOS(o).some(p => p.st !== 'recebido')).length, aprovacao: ativas.filter(o => parceirosDaOS(o).some(p => p.st === 'aguard_aprov')).length, atrasadas: ativas.filter(atrasada).length };
  const osSheet = sheet && (lista || []).find(x => x.id === sheet.osId);
  const pSheet = osSheet && sheet.tipo === 'parc' ? parceirosDaOS(osSheet).find(p => p.k === sheet.k) || { k: sheet.k, st: 'orcar', ...(TIPOS_PARC.find(t => t[0] === sheet.k) ? { ic: TIPOS_PARC.find(t => t[0] === sheet.k)[1], t: TIPOS_PARC.find(t => t[0] === sheet.k)[2] } : {}) } : null;

  return html`
    <div class="fade-up stack qg">
      <div><h2>Quadro geral</h2><div class="dim">Toque no cliente para ver o andamento de cada ambiente, parceiros e o diário de obra.</div></div>
      <div class="qg-filtros">
        ${[['todas', 'Todas', ativas.length], ['parceiros', 'Pendências de parceiro', cont.parceiros], ['aprovacao', 'Aguard. aprovação', cont.aprovacao], ['atrasadas', 'Atrasadas', cont.atrasadas]].map(([v, t, n]) => html`
          <button key=${v} class=${'qg-f' + (filtro === v ? ' on' : '') + (v === 'atrasadas' && n ? ' perigo' : '')} onClick=${() => setFiltro(v)}>${t} <b>${n}</b></button>`)}
      </div>
      <input class="inp" placeholder="🔍 Buscar cliente, OS ou ambiente" value=${busca} onInput=${e => setBusca(e.target.value)} />
      <div class="qg-leg">${ST_PARC.map(s => html`<span key=${s[0]}><i style=${{ background: s[3] }}></i>${s[2]}</span>`)}</div>
      ${lista === null ? html`<div class="card">Carregando…</div>` : cards.length === 0 ? html`<div class="card vazio dim">Nada por aqui.</div>` : !cliSel ? (() => {
        const grupos = {};
        cards.forEach(c => { const k = norm(c.o.cliente?.nome) || '—'; (grupos[k] = grupos[k] || { nome: c.o.cliente?.nome || 'Sem cliente', cards: [] }).cards.push(c); });
        return Object.entries(grupos).sort((a, b) => b[1].cards.some(c => c.atras) - a[1].cards.some(c => c.atras) || a[1].nome.localeCompare(b[1].nome)).map(([k, g]) => {
          const tot = g.cards.length * 6, feitas = g.cards.reduce((n, c) => n + c.feitas, 0);
          const pend = g.cards.reduce((n, c) => n + c.pendParc.length, 0), atr = g.cards.filter(c => c.atras).length, pendD = g.cards.reduce((n, c) => n + (c.o.pendAbertas || 0), 0);
          const prazos = g.cards.map(c => lerPrazo(c.o.prazoEntrega)).filter(Boolean).sort((a, b) => a - b);
          const cor = corCliente(g.nome);
          return html`<button key=${k} class=${'qg-cliente' + (atr ? ' atras' : '')} style=${{ '--cc': cor }} onClick=${() => setCliSel(k)}>
            <div class="qg-cli"><b>${g.nome}</b><small>${g.cards.length} ${g.cards.length === 1 ? 'ambiente' : 'ambientes'} · ${g.cards.map(c => (c.o.ambientes || [])[0]?.nome || c.o.ambienteResumo || numOS(c.o)).slice(0, 4).join(', ')}${g.cards.length > 4 ? '…' : ''}</small></div>
            <div class="qg-barra"><i style=${{ width: (tot ? feitas / tot * 100 : 0) + '%' }}></i></div>
            <div class="qg-badges">
              <span title="Produção">🏭 ${Math.round(tot ? feitas / tot * 100 : 0)}%</span>
              ${pend > 0 && html`<span class="b-par" title="Parceiros pendentes">🤝 ${pend}</span>`}
              ${pendD > 0 && html`<span class="b-dia" title="Pendências do diário">📓 ${pendD}</span>`}
              ${atr > 0 && html`<span class="b-atr">⚠ ${atr}</span>`}
              ${prazos[0] && html`<span>🚚 ${prazos[0].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>`}
            </div>
          </button>`; });
      })() : html`
        <div class="row" style=${{ gap: '8px', justifyContent: 'space-between' }}><span class="row" style=${{ gap: '8px' }}><button class="btn btn-sm" onClick=${() => setCliSel(null)}>← Clientes</button><b class="qg-cli-nome" style=${{ '--cc': corCliente(cards.find(c => norm(c.o.cliente?.nome) === cliSel)?.o.cliente?.nome || '') }}>${cards.find(c => norm(c.o.cliente?.nome) === cliSel)?.o.cliente?.nome || ''}</b></span>
          <button class="btn btn-sm" onClick=${() => imprimirFolha(cards.filter(c => (norm(c.o.cliente?.nome) || '—') === cliSel).map(c => c.o))}>🖨 Folha de pendências</button></div>
        ${cards.filter(c => (norm(c.o.cliente?.nome) || '—') === cliSel).map(({ o, parc, et, feitas, atras }) => html`
        <div key=${o.id} class=${'qg-card' + (atras ? ' atras' : '')} style=${{ '--cc': corOS(o) }}>
          <div class="qg-top" onClick=${() => abrirOS(o.id)}>
            <b class="qg-num">${numOS(o)}</b>
            <div class="qg-cli"><b>${o.cliente?.nome || 'Cliente'}</b><small>${(o.ambientes || []).map(a => a.nome).join(', ') || o.ambienteResumo || ''}</small></div>
            <span class=${(STATUS_OS.find(x => x.v === o.status) || STATUS_OS[0]).c + ' qg-st'}>${(STATUS_OS.find(x => x.v === o.status) || STATUS_OS[0]).t.replace(/^\d\. /, '').replace('Aguard. liberação p/ entrega', 'Aguard. liberação')}</span>
            <div class=${'qg-prazo' + (atras ? ' atras' : '')}>${o.prazoEntrega ? (atras ? '⚠ ' : '🚚 ') + o.prazoEntrega.slice(0, 5) : '—'}</div>
          </div>
          <button class="qg-prod" onClick=${() => setSheet({ osId: o.id, tipo: 'prod' })}>
            ${ETAPAS_FAB.map(([k, t]) => { const s = et[k]?.status || 'pendente'; return html`<span key=${k} class=${'qg-seg ' + s}><i></i><small>${t.split(' ')[0]}</small></span>`; })}
            <em>${feitas}/6</em>
          </button>
          <div class="qg-parc">
            ${parc.map(p => { const s = infoSt(p.st); return html`<button key=${p.k} class="qg-chip" style=${{ borderColor: s[3], background: s[3] + '1f' }} onClick=${() => setSheet({ osId: o.id, tipo: 'parc', k: p.k })}>
              <span>${p.ic}</span>${p.t.split(/[ /]/)[0]}<b style=${{ color: s[3] }}>· ${s[2]}</b>${p.previsao ? html`<small>${p.previsao.slice(0, 5)}</small>` : ''}</button>`; })}
            <button class="qg-chip add" onClick=${() => setSheet({ osId: o.id, tipo: 'add' })}>＋ parceiro</button>
          </div>
          <${BarraTempos} o=${o} />
          <div class="qg-acoes">
            <button class=${'qg-diario' + (o.pendAbertas ? ' tem' : '')} onClick=${() => setSheet({ osId: o.id, tipo: 'diario' })}>📓 Diário${o.pendAbertas ? html` · <b>${o.pendAbertas}</b>` : ''}</button>
            <button class=${'qg-diario' + (pedAb[o.id] ? ' tem-ped' : '')} onClick=${() => setSheet({ osId: o.id, tipo: 'pedidos' })}>🪵 Peças${pedAb[o.id] ? html` · <b>${pedAb[o.id]}</b>` : ''}</button>
            <button class="qg-diario" onClick=${() => setSheet({ osId: o.id, tipo: 'compras' })}>🛒 Compras</button>
            <button class=${'qg-diario' + ((o.videos || []).length ? ' tem-vid' : '')} onClick=${() => setSheet({ osId: o.id, tipo: 'videos' })}>🎬 Vídeos${(o.videos || []).length ? html` · <b>${o.videos.length}</b>` : ''}</button>
            <button class="qg-diario" onClick=${() => imprimirFolha([o])}>🖨 Pendências</button>
          </div>
          ${o.ultimoFinal?.foto && html`<button class="final-dia" onClick=${() => setSheet({ osId: o.id, tipo: 'diario' })}><img src=${o.ultimoFinal.foto} /><span>🌇 Final do dia · ${new Date(o.ultimoFinal.em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}${o.ultimoFinal.quem ? ' · ' + o.ultimoFinal.quem : ''}</span></button>`}
        </div>`)}`}

      ${osSheet && ReactDOM.createPortal(html`
        <div class="sheet-fundo" onClick=${e => e.target === e.currentTarget && setSheet(null)}>
          <div class="sheet">
            <div class="sheet-alça"></div>
            <div class="row" style=${{ justifyContent: 'space-between' }}><div><b>${numOS(osSheet)}</b> · ${osSheet.cliente?.nome}</div><button class="x-btn" onClick=${() => setSheet(null)}>✕</button></div>

            ${sheet.tipo === 'prod' && html`
              <div class="sheet-t">🏭 Produção na fábrica</div>
              ${osSheet.status === 'liberacao' && html`<button class="btn btn-grande btn-verde btn-block" onClick=${() => { const et2 = { ...(osSheet.execucao?.etapas || {}) }; et2.montagem = { ...(et2.montagem || {}), status: 'andamento' }; salvar(osSheet, { status: 'montagem', execucao: { ...(osSheet.execucao || {}), etapas: et2 } }, 'Liberado para entrega/montagem'); }}>🚚 Liberar para entrega / montagem</button>`}
              ${ETAPAS_FAB.map(([k, t]) => { const e = osSheet.execucao?.etapas?.[k] || {}; const s = e.status || 'pendente'; return html`
                <div key=${k} class=${'sheet-linha ' + s}>
                  <div><b>${t}</b><small>${s === 'pronto' ? '✓ Pronto' : s === 'andamento' ? 'Em andamento' : 'Pendente'}${e.onde === 'terceirizada' ? ' · terceirizado' : ''}${e.prazo ? ' · até ' + e.prazo : ''}</small></div>
                  ${s === 'pronto' ? html`<button class="btn btn-sm" onClick=${() => voltarEtapa(osSheet, k)}>Reabrir</button>`
                    : html`<button class="btn btn-grande btn-verde" onClick=${() => concluirEtapa(osSheet, k)}>✓ Concluir</button>`}
                </div>`; })}`}

            ${sheet.tipo === 'parc' && pSheet && html`
              <div class="sheet-t">${pSheet.ic} ${pSheet.t}</div>
              ${(() => { const i = ST_PARC.findIndex(x => x[0] === pSheet.st); const prox = ST_PARC[i + 1]; return prox
                ? html`<button class="btn btn-grande btn-verde btn-block" onClick=${() => setParc(osSheet, pSheet.k, { st: prox[0] }, pSheet.t + ': ' + prox[2])}>✓ ${prox[1]}</button>`
                : html`<div class="ok-box">✓ Recebido na fábrica</div>`; })()}
              <div class="sheet-passos">
                ${ST_PARC.map(([v, , t, c], i) => { const at = ST_PARC.findIndex(x => x[0] === pSheet.st); return html`
                  <button key=${v} class=${'sheet-passo' + (i <= at ? ' feito' : '') + (i === at ? ' atual' : '')} style=${i <= at ? { background: c, borderColor: c } : undefined} onClick=${() => i < at ? voltarParc(osSheet, pSheet, v) : setParc(osSheet, pSheet.k, { st: v })}>${i < at ? '✓ ' : ''}${t}</button>`; })}
              </div>
              <div class="grid2">
                <div class="field"><span class="lbl">Parceiro / fornecedor</span><input class="inp" value=${pSheet.parceiro || ''} placeholder="Ex: Projetta" onChange=${e => setParc(osSheet, pSheet.k, { parceiro: e.target.value })} /></div>
                <div class="field"><span class="lbl">Previsão (dd/mm)</span><input class="inp" inputmode="numeric" value=${pSheet.previsao || ''} placeholder="Ex: 03/10" onChange=${e => setParc(osSheet, pSheet.k, { previsao: e.target.value })} /></div>
              </div>
              <div class="field"><span class="lbl">Valor / observação</span><input class="inp" value=${pSheet.obs || ''} placeholder="Ex: R$ 1.850 · 4 portas reflecta bronze" onChange=${e => setParc(osSheet, pSheet.k, { obs: e.target.value })} /></div>
              ${(pSheet.hist || []).length > 0 && html`<details><summary class="dim">Histórico</summary>${pSheet.hist.slice().reverse().map((h, i) => html`<div key=${i} class="dim" style=${{ fontSize: '12px' }}>${infoSt(h.st)[2]} · ${h.quem} · ${fmtData(h.em)}</div>`)}</details>`}
              <button class="btn btn-sm btn-ghost" onClick=${() => { setParc(osSheet, pSheet.k, { st: 'nao' }, 'Removido do quadro'); setSheet(null); }}>Não precisa deste parceiro nesta OS</button>`}

            ${sheet.tipo === 'diario' && html`<${DiarioOS} sessao=${sessao} os=${osSheet} toast=${toast} />`}
            ${sheet.tipo === 'compras' && html`<${ComprasOS} sessao=${sessao} os=${osSheet} toast=${toast} />`}
            ${sheet.tipo === 'videos' && html`<${VideosOS} sessao=${sessao} os=${osSheet} toast=${toast} />`}
            ${sheet.tipo === 'pedidos' && html`<${PedidosOS} sessao=${sessao} os=${osSheet} toast=${toast} catalogo=${catalogo} />`}
            ${sheet.tipo === 'add' && html`
              <div class="sheet-t">Adicionar parceiro nesta OS</div>
              <div class="sheet-grade">
                ${TIPOS_PARC.map(([k, ic, t]) => html`<button key=${k} class="btn btn-grande" onClick=${() => { setParc(osSheet, k, { st: 'orcar' }, t + ' adicionado'); setSheet({ osId: osSheet.id, tipo: 'parc', k }); }}><span style=${{ fontSize: '22px' }}>${ic}</span><br/>${t}</button>`)}
              </div>`}
          </div>
        </div>`, document.body)}
      ${folha && ReactDOM.createPortal(html`<${ImpressaoFolha} dados=${folha} empresa=${sessao.empresaNome} />`, document.getElementById('print-area'))}
      ${conf && html`<${SenhaMotivo} titulo=${conf.titulo} texto="Este processo já foi iniciado. Para reabrir/voltar, informe o motivo e a senha." botao="Confirmar" onOk=${conf.fazer} fechar=${() => setConf(null)} />`}
    </div>`;
}

/* ---------- Cronogramas: agenda semanal (modelo Zonta), mês, produção e entregas ---------- */
const DIAS_SEM = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const GRADES = [
  ['entregas', '🚚 Cronograma de entregas', 'Viagem'],
  ['montagem', '🔧 Montagem', 'Equipe'],
  ['producao', '🪵 Produção – vidros, madeira e ferros', 'Pessoa'],
  ['terceirizados', '🤝 Produção – terceirizados', 'Parceiro'],
  ['marceneiros', '🪚 Cronograma marceneiros', 'Marceneiro'],
];
const LISTAS = [
  ['entregasObs', 'Entregas sem data / observações', '🚚'],
  ['usinagens', 'Corte – usinagens e orgânicos', '✂️'], ['cortes', 'Corte – cortes', '✂️'],
  ['fitaExtras', 'Fita – extras', '🎞️'], ['fitaLimpeza', 'Fita – fitar e limpeza', '🎞️'],
  ['liberado', 'Liberado marceneiro', '✅'], ['prontoMontagem', 'Pronto para montagem', '📦'],
];
const agendaPadrao = (semana) => ({
  semana, prioridades: '',
  grades: {
    entregas: [{ nome: 'Viagem 1', dias: ['', '', '', '', ''] }, { nome: 'Viagem 2', dias: ['', '', '', '', ''] }],
    montagem: ['RICARDO + AJUDANTE', 'LUCAS + CLEITON', 'EQUIPE NOVA'].map(nome => ({ nome, dias: ['', '', '', '', ''] })),
    producao: ['EDINHO', 'ROMILDO + ANTÔNIO'].map(nome => ({ nome, dias: ['', '', '', '', ''] })),
    terceirizados: ['FERNANDO', 'PETER', 'CRIS', 'CRISTIANO'].map(nome => ({ nome, dias: ['', '', '', '', ''] })),
    marceneiros: ['CRIS', 'CLEITON', 'HERMANN', 'CRISTIANO', 'MELK'].map(nome => ({ nome, dias: ['', '', '', '', ''] })),
  },
  listas: {},
  fornecedores: ['PINTURA – LACA NOBRE', 'VIDROS – PROJETTA', 'PINTURA – EZEQUIEL', 'PINTURA – CELSO', 'ESQUADRIAS E LÂMINAS – ADEBLU', 'EDUARDO'].map(nome => ({ nome, itens: '' })),
});
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const segundaDe = (d) => { const s = new Date(d); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); return s; };
const deIso = (t) => { const [a, m, d] = t.split('-').map(Number); return new Date(a, m - 1, d); };
const mesmoDia = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const linhaOS = (o) => `OS:${numOS(o)} – ${o.cliente?.nome || ''}${(o.ambientes || []).length ? ' – ' + o.ambientes.map(a => a.nome).join(', ') : ''}`;
// O que as OSs cadastradas trazem sozinhas para cada dia (entrega e prazos das etapas).
function eventosOS(lista, dia) {
  const ev = [];
  for (const o of lista || []) {
    if (mesmoDia(lerPrazo(o.prazoEntrega), dia) && o.status !== 'concluida') ev.push({ o, t: 'entrega', txt: '🚚 Entrega' });
    const et = o.execucao?.etapas || {};
    for (const [k, t] of ETAPAS_FAB) if (et[k]?.prazo && mesmoDia(lerPrazo(et[k].prazo), dia) && et[k].status !== 'pronto') ev.push({ o, t: k, txt: t });
  }
  return ev;
}

function OSPicker({ lista, onPick }) {
  const [q, setQ] = useState(''); const [ab, setAb] = useState(false);
  const res = (lista || []).filter(o => !q || norm(linhaOS(o)).includes(norm(q))).slice(0, 40);
  const fechar = () => { setAb(false); setQ(''); };
  return html`<span class="opc-wrap"><button type="button" class="btn btn-ghost btn-sm" onClick=${() => setAb(true)}>+ OS</button>
    ${ab && ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fechar()}>
      <div class="card modal-caixa stack os-picker">
        <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">Escolher OS</div><button class="x-btn" onClick=${fechar}>✕</button></div>
        <input class="inp" autoFocus placeholder="Buscar cliente, nº da OS ou ambiente…" value=${q} onInput=${e => setQ(e.target.value)} onKeyDown=${e => e.key === 'Escape' && fechar()} />
        <div class="os-picker-lista">
          ${res.map(o => html`<button type="button" key=${o.id} class="opc-i" style=${{ borderLeft: '5px solid ' + corOS(o), background: corOS(o) + '10' }} onClick=${() => { onPick(linhaOS(o)); fechar(); }}>
            <span><b>${numOS(o)}</b> — ${o.cliente?.nome || 'Cliente'}<small>${(o.ambientes || []).map(a => a.nome).join(', ') || 'Sem ambientes'}${o.prazoEntrega ? ' · entrega ' + o.prazoEntrega : ''}</small></span></button>`)}
          ${!res.length && html`<div class="dim">Nenhuma OS encontrada.</div>`}
        </div>
      </div></div>`, document.body)}</span>`;
}
// Encontra as OSs citadas num texto da agenda (OS:26.098) e devolve as cores dos clientes.
function osCitadas(txt, lista) {
  const t = norm(txt); if (!t || !(lista || []).length) return [];
  const achadas = [];
  const soDig = (x) => String(x || '').replace(/\D/g, '');
  // 1) números de OS (novo 26.098, antigo 26.92 / 2694)
  for (const m of String(txt).matchAll(/(?:os\s*:?\s*)?(\d{2})\s*[.,]\s*(\d{1,4})|os\s*:?\s*(\d{3,6})/gi)) {
    const cod = m[3] ? m[3] : m[1] + m[2];
    const o = lista.find(o => soDig(o.numeroAntigo) === cod) || lista.find(o => soDig(numOS(o)) === (m[1] ? m[1] + m[2].padStart(3, '0') : cod));
    if (o) achadas.push(o);
  }
  // 2) nome do cliente (inteiro ou a parte antes do " - ")
  if (!achadas.length) {
    const vistos = new Set();
    for (const o of lista) {
      const nome = o.cliente?.nome || ''; const k = norm(nome); if (!k || vistos.has(k)) continue; vistos.add(k);
      const primeiro = norm(nome).split(' ')[0];
      const unico = primeiro.length >= 4 && !['casa', 'apto', 'apartamento', 'escritorio', 'loja', 'sala'].includes(primeiro) && lista.filter(x => norm(x.cliente?.nome).split(' ')[0] === primeiro && norm(x.cliente?.nome) !== k).length === 0;
      const chaves = [k, norm(nome.split(/\s[-–]\s/)[0]), unico ? primeiro : ''].filter(c => c.length >= 2);
      const esc = (c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (chaves.some(c => new RegExp('(^|[^a-z0-9])' + esc(c) + (c === primeiro && unico ? '' : '([^a-z0-9]|$)')).test(t))) achadas.push(o);
    }
  }
  return achadas;
}
const corCelula = (txt, lista) => { const o = osCitadas(txt, lista)[0]; return o ? { background: corOS(o) + '1c', boxShadow: 'inset 4px 0 0 ' + corOS(o) } : undefined; };
const tagsOS = (txt, lista) => { const os = osCitadas(txt, lista); const vis = new Set(); const uni = os.filter(o => { const k = norm((o.cliente?.nome || '').split(/\s[-–]\s/)[0]); if (vis.has(k)) return false; vis.add(k); return true; }); return uni.length ? html`<div class="ag-tags">${uni.map(o => html`<span key=${o.id} role="button" style=${{ background: corOS(o), cursor: 'pointer' }} onClick=${() => window.__abrirOS && window.__abrirOS(o.id)}>${(o.cliente?.nome || '').split(/\s[-–]\s/)[0]}</span>`)}</div>` : null; };
const addLinha = (txt, l) => (txt ? txt.replace(/\s+$/, '') + '\n' : '') + l;

/* ---------- Tarefas com prazo final (cronograma do marceneiro) ---------- */
const isoD = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const deIsoD = (t) => { const [a, m, d] = String(t).split('-').map(Number); return new Date(a, m - 1, d); };
const fimSemana = (d) => d.getDay() === 0 || d.getDay() === 6;
function somaUteis(t, n) { const d = deIsoD(t); let k = Math.abs(n), s = Math.sign(n); while (k > 0) { d.setDate(d.getDate() + s); if (!fimSemana(d)) k--; } return isoD(d); }
function uteisEntre(a, b) { if (b <= a) return 0; let n = 0; const d = deIsoD(a); while (isoD(d) < b) { d.setDate(d.getDate() + 1); if (!fimSemana(d)) n++; } return n; }
const dm = (t) => t ? t.split('-').reverse().slice(0, 2).join('/') : '';

function useTarefas(sessao) {
  const [t, setT] = useState([]);
  useEffect(() => F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'tarefas'), s => setT(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setT([])), []);
  return t;
}
/* Escreve a tarefa nos dias da agenda semanal (linha da pessoa) */
async function escreverNaAgenda(sessao, grade, pessoa, ini, fim, linha) {
  const porSemana = {};
  for (let d = deIsoD(ini); isoD(d) <= fim; d.setDate(d.getDate() + 1)) {
    const wd = (d.getDay() + 6) % 7; if (wd > 4) continue;
    const sem = iso(segundaDe(d)); (porSemana[sem] = porSemana[sem] || []).push(wd);
  }
  const { getDoc, setDoc } = F().fsMod;
  for (const [sem, dias] of Object.entries(porSemana)) {
    const ref = docRef('empresas', sessao.empresaId, 'agenda', sem);
    const snap = await getDoc(ref);
    const ag = snap.exists() ? snap.data() : agendaPadrao(sem);
    ag.grades = ag.grades || {}; ag.grades[grade] = ag.grades[grade] || [];
    let row = ag.grades[grade].find(r => norm(r.nome) === norm(pessoa));
    if (!row) { row = { nome: pessoa, dias: ['', '', '', '', ''] }; ag.grades[grade].push(row); }
    row.dias = row.dias || ['', '', '', '', ''];
    dias.forEach(i => { const v = row.dias[i] || ''; if (!v.includes(linha)) row.dias[i] = (v ? v + '\n' : '') + linha; });
    await setDoc(ref, { ...ag, atualizadoEm: nowIso(), atualizadoPor: sessao.nome });
  }
  return Object.values(porSemana).reduce((n, d) => n + d.length, 0);
}
function NovaTarefa({ sessao, lista, pessoa: pessoa0, grade: grade0, inicio: inicio0, fechar, toast, osInicial, aoLancar }) {
  const inicio = inicio0 || isoD(new Date());
  const [pessoa, setPessoa] = useState(pessoa0 || '');
  const [grade, setGrade] = useState(grade0 || 'producao');
  const [nomes, setNomes] = useState({});
  useEffect(() => { if (pessoa0) return; F().fsMod.getDoc(docRef('empresas', sessao.empresaId, 'agenda', iso(segundaDe(new Date())))).then(d => { const g = d.data()?.grades || {}; const m = {}; Object.keys(g).forEach(k => { m[k] = [...new Set((g[k] || []).map(r => r.nome).filter(Boolean))]; }); setNomes(m); }).catch(() => {}); }, []);
  const [osSel, setOsSel] = useState(osInicial || null);
  const [q, setQ] = useState('');
  const [ini, setIni] = useState(inicio);
  const [fim, setFim] = useState(inicio);
  const [texto, setTexto] = useState('');
  const res = (lista || []).filter(o => o.status !== 'concluida' && (!q || norm(linhaOS(o) + ' ' + (o.numeroAntigo || '')).includes(norm(q)))).slice(0, 30);
  const salvar = async () => {
    if (!pessoa.trim()) return toast('Escolha quem vai executar.');
    if (!osSel && !texto.trim()) return toast('Escolha a OS ou escreva a tarefa.');
    if (fim < ini) return toast('O prazo final não pode ser antes do início.');
    try {
      await F().fsMod.addDoc(col('empresas', sessao.empresaId, 'tarefas'), { pessoa, grade, inicio: ini, fim, fimOriginal: fim, texto: texto.trim(), osId: osSel?.id || '', osCod: osSel ? numOS(osSel) : '', cliente: osSel?.cliente?.nome || '', ambiente: osSel ? (osSel.ambientes || []).map(a => a.nome).join(', ') : '', status: 'andamento', prorrogacoes: [], quem: sessao.nome, em: nowIso() });
      if (osSel) registrar(sessao, osSel.id, '📅', 'Entrou no cronograma: ' + pessoa, dm(ini) + ' a ' + dm(fim) + (texto.trim() ? ' — ' + texto.trim() : ''));
      let nd = 0;
      if (!pessoa0) nd = await escreverNaAgenda(sessao, grade, pessoa.trim(), ini, fim, [osSel ? numOS(osSel) + ' ' + (osSel.cliente?.nome || '') : '', texto.trim() || (osSel ? (osSel.ambientes || []).map(a => a.nome).join(', ') : '')].filter(Boolean).join(' – '));
      toast('Lançado no cronograma de ' + pessoa + (nd ? ' · ' + nd + (nd === 1 ? ' dia escrito' : ' dias escritos') + ' (' + dm(ini) + ' a ' + dm(fim) + ')' : '') + '.', 'ok'); fechar(); aoLancar && aoLancar();
    } catch (e) { toast(e.message, 'erro'); }
  };
  return ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fechar()}>
    <div class="card modal-caixa stack" style=${{ width: 'min(560px,100%)' }}>
      <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">📅 ${pessoa0 ? 'Nova tarefa · ' + pessoa0 : 'Enviar para o cronograma'}</div><button class="x-btn" onClick=${fechar}>✕</button></div>
      ${!pessoa0 && html`<div class="stack" style=${{ gap: '6px' }}>
        <span class="lbl">Qual cronograma?</span>
        <div class="row" style=${{ gap: '5px', flexWrap: 'wrap' }}>${GRADES.map(([k, t]) => html`<button key=${k} class=${'pill' + (grade === k ? ' on' : '')} onClick=${() => { setGrade(k); setPessoa(''); }}>${t}</button>`)}</div>
        <span class="lbl">Quem vai executar?</span>
        ${(nomes[grade] || []).length > 0 && html`<div class="row" style=${{ gap: '5px', flexWrap: 'wrap' }}>${nomes[grade].map(n => html`<button key=${n} class=${'pill' + (pessoa === n ? ' on' : '')} onClick=${() => setPessoa(n)}>${n}</button>`)}</div>`}
        <input class="inp" placeholder="Nome (ou escolha acima)" value=${pessoa} onInput=${e => setPessoa(e.target.value)} />
      </div>`}
      ${osSel ? html`<div class="tar-os" style=${{ '--cc': corOS(osSel) }}><b>${numOS(osSel)}</b> ${osSel.cliente?.nome} · ${(osSel.ambientes || []).map(a => a.nome).join(', ')} <button class="x-btn" onClick=${() => setOsSel(null)}>trocar</button></div>`
        : html`<input class="inp" autoFocus placeholder="🔍 Buscar OS (nº novo ou antigo, cliente, ambiente)" value=${q} onInput=${e => setQ(e.target.value)} />
          <div class="os-picker-lista" style=${{ maxHeight: '30vh' }}>${res.map(o => html`<button key=${o.id} class="opc-i" style=${{ borderLeft: '5px solid ' + corOS(o), background: corOS(o) + '10' }} onClick=${() => setOsSel(o)}><span><b>${numOS(o)}</b>${o.numeroAntigo ? html` <small style=${{ display: 'inline' }}>(antiga ${o.numeroAntigo})</small>` : ''} — ${o.cliente?.nome}<small>${(o.ambientes || []).map(a => a.nome).join(', ')}</small></span></button>`)}</div>`}
      <div class="grid2">
        <div class="field"><span class="lbl">Início</span><input class="inp" type="date" value=${ini} onInput=${e => { setIni(e.target.value); if (fim < e.target.value) setFim(e.target.value); }} /></div>
        <div class="field"><span class="lbl">📅 Prazo final de execução</span><input class="inp" type="date" value=${fim} min=${ini} onInput=${e => setFim(e.target.value)} /></div>
      </div>
      <div class="row" style=${{ gap: '5px' }}><span class="dim">Duração:</span>${[1, 2, 3, 5, 10].map(n => html`<button key=${n} class=${'pill' + (uteisEntre(ini, fim) + 1 === n ? ' on' : '')} onClick=${() => setFim(somaUteis(ini, n - 1))}>${n} ${n === 1 ? 'dia' : 'dias'}</button>`)}<span class="dim">(dias úteis)</span></div>
      <input class="inp" placeholder="O que vai ser feito (ex: produzir cristaleira, montar ilha)" value=${texto} onInput=${e => setTexto(e.target.value)} />
      <button class="btn btn-grande btn-verde btn-block" onClick=${salvar}>✓ Lançar no cronograma</button>
    </div></div>`, document.body);
}
function DetalheTarefa({ sessao, t, todas, fechar, toast }) {
  const [dias, setDias] = useState(1);
  const [novaData, setNovaData] = useState('');
  const [motivo, setMotivo] = useState('');
  const [modo, setModo] = useState('');
  const hoje = isoD(new Date());
  const atrasada = t.status !== 'concluida' && t.fim < hoje;
  const concluir = async (v) => { let mot = ''; if (!v) { mot = await pedirMotivo('Reabrir tarefa'); if (!mot) return; } registrar(sessao, t.osId, v ? '✅' : '↺', (v ? 'Tarefa concluída: ' : 'Tarefa reaberta: ') + t.pessoa, mot || t.texto || ''); try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'tarefas', t.id), { status: v ? 'concluida' : 'andamento', concluidaEm: v ? nowIso() : '', concluidaPor: v ? sessao.nome : '' }); toast(v ? 'Tarefa concluída.' : 'Tarefa reaberta.', 'ok'); fechar(); } catch (e) { toast(e.message, 'erro'); } };
  const excluir = async () => { try { await F().fsMod.deleteDoc(docRef('empresas', sessao.empresaId, 'tarefas', t.id)); fechar(); } catch (e) { toast(e.message, 'erro'); } };
  const prorrogar = async () => {
    if (motivo.trim().length < 5) return toast('O motivo é obrigatório (pelo menos 5 letras).');
    const novoFim = novaData || somaUteis(t.fim, dias);
    const n = uteisEntre(t.fim, novoFim);
    if (n <= 0) return toast('Escolha uma data depois de ' + dm(t.fim) + '.');
    const { writeBatch } = F().fsMod; const b = writeBatch(F().db);
    const reg = { dias: n, motivo: motivo.trim(), quem: sessao.nome, em: nowIso(), fimAntes: t.fim, fimDepois: novoFim };
    b.update(docRef('empresas', sessao.empresaId, 'tarefas', t.id), { fim: novoFim, prorrogacoes: [...(t.prorrogacoes || []), reg] });
    // empurra as tarefas seguintes da mesma pessoa
    const seguintes = todas.filter(x => x.id !== t.id && x.pessoa === t.pessoa && x.status !== 'concluida' && x.inicio > t.fim);
    seguintes.forEach(x => b.update(docRef('empresas', sessao.empresaId, 'tarefas', x.id), { inicio: somaUteis(x.inicio, n), fim: somaUteis(x.fim, n), prorrogacoes: [...(x.prorrogacoes || []), { dias: n, motivo: 'Ajuste automático: ' + (t.cliente || t.texto) + ' atrasou (' + motivo.trim() + ')', quem: sessao.nome, em: nowIso(), fimAntes: x.fim, fimDepois: somaUteis(x.fim, n), auto: true }] }));
    registrar(sessao, t.osId, '⏳', `Prazo prorrogado +${n}d (${t.pessoa}): ${dm(t.fim)} → ${dm(novoFim)}`, motivo.trim()); seguintes.forEach(x => registrar(sessao, x.osId, '⏳', `Prazo ajustado +${n}d (${x.pessoa})`, 'Atraso em ' + (t.cliente || t.texto)));
    try { await b.commit(); toast(`+${n} ${n === 1 ? 'dia' : 'dias'}. ${seguintes.length ? seguintes.length + ' tarefa(s) seguinte(s) de ' + t.pessoa + ' ajustada(s).' : ''}`, 'ok'); fechar(); } catch (e) { toast(e.message, 'erro'); }
  };
  const seguintesPrev = todas.filter(x => x.id !== t.id && x.pessoa === t.pessoa && x.status !== 'concluida' && x.inicio > t.fim && x.inicio >= t.inicio);
  return ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fechar()}>
    <div class="card modal-caixa stack" style=${{ width: 'min(520px,100%)', '--cc': t.cliente ? corCliente(t.cliente) : '#57534e' }}>
      <div class="tar-cab"><div><b>${t.cliente || 'Tarefa'}</b><small>${[t.osCod, t.ambiente].filter(Boolean).join(' · ')}</small></div><button class="x-btn" style=${{ color: '#fff' }} onClick=${fechar}>✕</button></div>
      ${t.texto && html`<div>${t.texto}</div>`}
      <div class="tar-datas"><span>👷 <b>${t.pessoa}</b></span><span>▶ ${dm(t.inicio)}</span><span class=${atrasada ? 'vermelho' : ''}>📅 prazo <b>${dm(t.fim)}</b>${t.fimOriginal && t.fimOriginal !== t.fim ? html` <s class="dim">${dm(t.fimOriginal)}</s>` : ''}</span>
        <span>${t.status === 'concluida' ? '✅ Concluída' : atrasada ? '⚠ Atrasada' : '⏳ Em execução'}</span></div>
      ${t.status !== 'concluida' ? html`
        <div class="row" style=${{ gap: '6px' }}>
          <button class="btn btn-grande btn-verde" style=${{ flex: 1 }} onClick=${() => concluir(true)}>✓ Concluída</button>
          <button class=${'btn btn-grande' + (atrasada ? ' btn-marrom' : '')} style=${{ flex: 1 }} onClick=${() => setModo(modo ? '' : 'mais')}>＋ Mais dias</button>
        </div>
        ${modo === 'mais' && html`<div class="dia-box">
          <span class="lbl">Quantos dias a mais? (dias úteis)</span>
          <div class="row" style=${{ gap: '5px' }}>${[1, 2, 3, 5].map(n => html`<button key=${n} class=${'pill' + (!novaData && dias === n ? ' on' : '')} onClick=${() => { setDias(n); setNovaData(''); }}>+${n}</button>`)}
            <span class="dim">ou nova data:</span><input class="inp inp-sm" style=${{ width: 'auto' }} type="date" min=${t.fim} value=${novaData} onInput=${e => setNovaData(e.target.value)} /></div>
          <div class="dim">Novo prazo: <b>${dm(novaData || somaUteis(t.fim, dias))}</b>${seguintesPrev.length ? html` · também empurra <b>${seguintesPrev.length}</b> tarefa(s) seguinte(s) de ${t.pessoa}` : ''}</div>
          <textarea class="inp" rows="2" placeholder="Motivo (obrigatório): ex. faltou chapa, retrabalho na pintura…" value=${motivo} onInput=${e => setMotivo(e.target.value)}></textarea>
          <button class="btn btn-grande btn-marrom btn-block" onClick=${prorrogar}>Confirmar novo prazo</button>
        </div>`}` : html`<button class="btn" onClick=${() => concluir(false)}>↺ Reabrir tarefa</button>`}
      ${(t.prorrogacoes || []).length > 0 && html`<details open><summary class="dim">Prorrogações (${t.prorrogacoes.length})</summary>${t.prorrogacoes.map((p, i) => html`<div key=${i} class="tar-prorr">+${p.dias}d · ${dm(p.fimAntes)} → ${dm(p.fimDepois)} · ${p.motivo}<small>${p.quem} · ${fmtData(p.em)}</small></div>`)}</details>`}
      <button class="btn btn-sm btn-ghost" onClick=${excluir}>Excluir tarefa</button>
    </div></div>`, document.body);
}

function AgendaSemana({ sessao, lista, semana, setSemana, toast }) {
  const tarefas = useTarefas(sessao);
  const [novaT, setNovaT] = useState(null);
  const [verT, setVerT] = useState(null);
  const [doc, setDoc] = useState(undefined);
  const [sujo, setSujo] = useState(false);
  const [importando, setImportando] = useState('');
  const inp = useRef(null);
  const ref = docRef('empresas', sessao.empresaId, 'agenda', semana);
  useEffect(() => {
    setDoc(undefined); setSujo(false);
    return F().fsMod.onSnapshot(ref, d => { if (!sujoRef.current) setDoc(d.exists() ? d.data() : null); });
  }, [semana]);
  const sujoRef = useRef(false); sujoRef.current = sujo;
  const salvoRef = useRef(null);
  useEffect(() => { if (!sujo && doc) salvoRef.current = doc; }, [doc, sujo]);
  const logCitacoes = (antes, depois) => {
    try {
      GRADES.forEach(([k, tit]) => (depois?.grades?.[k] || []).forEach((r, ri) => (r.dias || []).forEach((v, di) => {
        if (!String(v || '').trim()) return;
        const velho = antes?.grades?.[k]?.[ri]?.dias?.[di] || '';
        const ja = new Set(osCitadas(velho, lista).map(o => o.id));
        const novas = osCitadas(v, lista).filter(o => !ja.has(o.id));
        const d = new Date(deIso(semana)); d.setDate(d.getDate() + di);
        registrarVarias(sessao, novas, '📅', 'Entrou no cronograma: ' + String(tit).replace(/^\S+ /, '') + (r.nome ? ' · ' + r.nome : '') + ' · ' + dm(isoD(d)), String(v).split('\n')[0].slice(0, 120));
      })));
    } catch {}
  };
  useEffect(() => {
    if (!sujo || !doc) return;
    const t = setTimeout(async () => { try { await F().fsMod.setDoc(ref, { ...doc, atualizadoEm: nowIso(), atualizadoPor: sessao.nome }); logCitacoes(salvoRef.current, doc); salvoRef.current = doc; setSujo(false); } catch (e) { toast('Não salvou a agenda: ' + e.message, 'erro'); } }, 900);
    return () => clearTimeout(t);
  }, [doc, sujo]);
  const mudar = (fn) => { setDoc(d => { const n = JSON.parse(JSON.stringify(d)); fn(n); return n; }); setSujo(true); };
  const seg = deIso(semana);
  const diasD = DIAS_SEM.map((_, i) => { const d = new Date(seg); d.setDate(d.getDate() + i); return d; });
  const mover = (n) => { const d = new Date(seg); d.setDate(d.getDate() + 7 * n); setSemana(iso(d)); };
  const criar = async (copiar) => {
    let base = agendaPadrao(semana);
    if (copiar) {
      const ant = new Date(seg); ant.setDate(ant.getDate() - 7);
      const a = await F().fsMod.getDoc(docRef('empresas', sessao.empresaId, 'agenda', iso(ant)));
      if (a.exists()) { const x = a.data(); base = { ...base, grades: Object.fromEntries(Object.entries(x.grades || {}).map(([k, rows]) => [k, rows.map(r => ({ nome: r.nome, dias: ['', '', '', '', ''] }))])), fornecedores: (x.fornecedores || []).map(f => ({ nome: f.nome, itens: f.itens })), listas: { liberado: x.listas?.liberado || '', prontoMontagem: x.listas?.prontoMontagem || '' }, prioridades: x.prioridades || '' }; }
      else toast('Não achei a semana anterior; criei no modelo padrão.');
    }
    setDoc(base); setSujo(true);
  };
  const importar = async (file) => {
    if (!file) return;
    try {
      setImportando('Lendo ' + file.name + '…');
      let r;
      if (file.name.toLowerCase().endsWith('.docx')) {
        // Mantém as tabelas (dias da semana em colunas) para a IA entender.
        const h = await mammoth.convertToHtml({ arrayBuffer: await lerArrayBuffer(file) });
        const dv = document.createElement('div'); dv.innerHTML = h.value;
        dv.querySelectorAll('table').forEach(t => { const txt = [...t.rows].map(tr => [...tr.cells].map(c => c.innerText.replace(/\s*\n\s*/g, ' / ').trim()).join(' | ')).join('\n'); const pre = document.createElement('p'); pre.textContent = '\n[TABELA]\n' + txt + '\n[/TABELA]\n'; t.replaceWith(pre); });
        r = { texto: dv.innerText, imagens: [] };
      } else r = await extrairArquivo(file);
      setImportando('A IA está montando a agenda…');
      const res = await chamarIA('agenda_semana', { texto: r.texto, temImagens: (r.imagens || []).length > 0, modelo: agendaPadrao(semana) }, r.imagens || []);
      const n = { ...agendaPadrao(semana), ...res, semana };
      Object.keys(n.grades || {}).forEach(k => { n.grades[k] = (n.grades[k] || []).map(x => ({ nome: String(x.nome || ''), dias: [0, 1, 2, 3, 4].map(i => String((x.dias || [])[i] || '')) })); });
      n.fornecedores = (n.fornecedores || []).map(f => ({ nome: String(f.nome || ''), itens: Array.isArray(f.itens) ? f.itens.join('\n') : String(f.itens || '') }));
      Object.keys(n.listas || {}).forEach(k => { if (Array.isArray(n.listas[k])) n.listas[k] = n.listas[k].join('\n'); });
      if (Array.isArray(n.prioridades)) n.prioridades = n.prioridades.join('\n');
      if (res.semanaDetectada && /^\d{4}-\d{2}-\d{2}$/.test(res.semanaDetectada) && res.semanaDetectada !== semana) toast('O arquivo parece ser da semana de ' + deIso(res.semanaDetectada).toLocaleDateString('pt-BR') + '. Troque a semana se quiser salvar lá.');
      setDoc(n); setSujo(true); toast('Agenda importada. Confira.', 'ok');
    } catch (e) { toast('Não importou: ' + e.message, 'erro'); }
    setImportando('');
  };
  const autoDia = (i, filtro) => eventosOS(lista, diasD[i]).filter(filtro);
  const tituloSemana = diasD[0].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' a ' + diasD[4].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return html`
    <div class="stack">
      ${novaT && html`<${NovaTarefa} sessao=${sessao} lista=${lista} pessoa=${novaT.pessoa} grade=${novaT.grade} inicio=${novaT.inicio} toast=${toast} fechar=${() => setNovaT(null)} />`}
      ${verT && html`<${DetalheTarefa} sessao=${sessao} t=${tarefas.find(x => x.id === verT.id) || verT} todas=${tarefas} toast=${toast} fechar=${() => setVerT(null)} />`}
      <div class="card page-card row" style=${{ justifyContent: 'space-between' }}>
        <div class="row" style=${{ gap: '6px' }}>
          <button class="btn btn-sm" onClick=${() => mover(-1)}>‹</button>
          <b style=${{ fontSize: '17px' }}>Semana ${tituloSemana}</b>
          <button class="btn btn-sm" onClick=${() => mover(1)}>›</button>
          <button class="btn btn-sm btn-ghost" onClick=${() => setSemana(iso(segundaDe(new Date())))}>Hoje</button>
          <span class="dim">${sujo ? 'Salvando…' : doc ? 'Salvo ✓' : ''}</span>
        </div>
        <div class="row" style=${{ gap: '6px' }}>
          <button class="btn btn-sm" disabled=${!!importando} onClick=${() => inp.current?.click()}>${importando || '⬆ Importar agenda (Word/PDF/foto)'}</button>
          <input ref=${inp} type="file" hidden accept=".docx,.pdf,.xlsx,.txt,image/*" onChange=${e => { importar(e.target.files[0]); e.target.value = ''; }} />
          <button class="btn btn-sm btn-danger" onClick=${async () => {
            const fimSem = isoD(new Date(deIso(semana).getTime() + 6 * 864e5));
            const daSemana = (tarefas || []).filter(t => t.inicio <= fimSem && t.fim >= semana);
            const r = await escolher('Apagar cronograma', 'Semana de ' + dm(semana) + ' a ' + dm(fimSem) + '.\n' + (doc ? 'Tem texto escrito na agenda. ' : '') + daSemana.length + ' tarefa(s) lançadas nesta semana.\nIsso não pode ser desfeito.',
              [{ v: 'tudo', t: '🗑 Apagar a semana inteira (agenda + tarefas)', cls: 'btn-danger' }, { v: 'agenda', t: 'Apagar só o texto da agenda' }, { v: 'tar', t: 'Apagar só as tarefas (' + daSemana.length + ')' }, { v: 'nao', t: 'Cancelar' }]);
            if (r === 'nao' || !r) return;
            if (r === 'geral') {
              if ((await escolher('Zerar tudo?', 'Vai apagar TODAS as semanas da agenda e TODAS as tarefas. Não pode ser desfeito.', [{ v: 'sim', t: 'Sim, zerar o cronograma', cls: 'btn-danger' }, { v: 'nao', t: 'Cancelar' }])) !== 'sim') return;
              try {
                const { getDocs, writeBatch } = F().fsMod; sujoRef.current = false; setSujo(false);
                const docs = [...(await getDocs(col('empresas', sessao.empresaId, 'agenda'))).docs, ...(await getDocs(col('empresas', sessao.empresaId, 'tarefas'))).docs];
                for (let i = 0; i < docs.length; i += 400) { const b = writeBatch(F().db); docs.slice(i, i + 400).forEach(d => b.delete(d.ref)); await b.commit(); }
                setDoc(null); toast('Cronograma zerado: ' + docs.length + ' registros apagados.', 'ok');
              } catch (e) { toast('Não apagou: ' + e.message, 'erro'); }
              return;
            }
            if (r === 'todas' && (await escolher('Tem certeza?', 'Vai apagar ' + (tarefas || []).length + ' tarefas de todo o cronograma.', [{ v: 'sim', t: 'Sim, apagar todas', cls: 'btn-danger' }, { v: 'nao', t: 'Cancelar' }])) !== 'sim') return;
            try {
              const { writeBatch } = F().fsMod; const b = writeBatch(F().db);
              if (r === 'tudo' || r === 'agenda') { b.delete(ref); sujoRef.current = false; setSujo(false); }
              const alvo = r === 'todas' ? (tarefas || []) : (r === 'tudo' || r === 'tar') ? daSemana : [];
              alvo.slice(0, 450).forEach(t => b.delete(docRef('empresas', sessao.empresaId, 'tarefas', t.id)));
              await b.commit(); setSujo(false); if (r === 'tudo' || r === 'agenda') setDoc(null);
              toast('Cronograma apagado.', 'ok');
            } catch (e) { toast('Não apagou: ' + e.message, 'erro'); }
          }}>🗑 Apagar</button>
          ${doc && html`<button class="btn btn-sm" onClick=${() => { document.body.classList.add('imp-agenda'); setTimeout(() => { window.print(); document.body.classList.remove('imp-agenda'); }, 100); }}>🖨 Imprimir</button>`}
        </div>
      </div>

      ${doc === undefined ? html`<div class="card">Carregando…</div>` : doc === null ? html`
        <div class="card page-card stack" style=${{ alignItems: 'center', textAlign: 'center' }}>
          <b>Esta semana ainda não tem agenda.</b>
          <div class="dim">As entregas e prazos das OSs cadastradas já aparecem sozinhos quando você criar.</div>
          <div class="row"><button class="btn btn-marrom" onClick=${() => criar(true)}>Criar copiando equipes da semana anterior</button><button class="btn" onClick=${() => criar(false)}>Criar no modelo padrão</button></div>
        </div>` : html`
        <div class="agenda-print">
          <div class="card page-card stack">
            <div class="sec-title">⭐ Prioridades da semana</div>
            <textarea class="inp" rows="2" placeholder="Uma por linha" value=${doc.prioridades || ''} onInput=${e => mudar(d => { d.prioridades = e.target.value; })}></textarea>
          </div>
          ${GRADES.map(([k, t, rot]) => html`
            <div key=${k} class="card page-card stack">
              <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">${t}</div>
                <button class="btn btn-sm btn-ghost" onClick=${() => mudar(d => { d.grades[k] = [...(d.grades[k] || []), { nome: '', dias: ['', '', '', '', ''] }]; })}>+ ${rot}</button></div>
              <div class="ag-scroll"><table class="ag">
                <thead><tr><th class="ag-nome"></th>${diasD.map((d, i) => html`<th key=${i} class=${mesmoDia(d, new Date()) ? 'hoje' : ''}>${DIAS_SEM[i].toUpperCase()} – ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</th>`)}</tr></thead>
                <tbody>
                  ${(k === 'entregas' || k === 'montagem') && html`<tr class="ag-auto"><td class="ag-nome">📌 Das OSs</td>${diasD.map((_, i) => html`<td key=${i}>${autoDia(i, e => k === 'entregas' ? e.t === 'entrega' : e.t === 'montagem').map((e, j) => html`<div key=${j} class=${'ag-chip' + (e.o.entregaFeita ? ' feito' : '')} style=${{ borderLeftColor: corOS(e.o), background: corOS(e.o) + '14' }}>${e.txt}: <b>${numOS(e.o)}</b> ${e.o.cliente?.nome}
                        <button class=${'cel-ok' + (e.o.entregaFeita ? ' on' : '')} onClick=${async () => { let mot = ''; if (e.o.entregaFeita) { mot = await pedirMotivo('Reabrir entrega', 'A entrega já foi marcada como feita. Informe o motivo.'); if (!mot) return; } registrar(sessao, e.o.id, e.o.entregaFeita ? '↺' : '🚚', e.o.entregaFeita ? 'Entrega reaberta' : 'Entrega concluída', mot); try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'os', e.o.id), { entregaFeita: e.o.entregaFeita ? null : { por: sessao.nome, em: nowIso() } }); } catch (er) { toast(er.message, 'erro'); } }}>${e.o.entregaFeita ? '✓ Entregue' : '✓ Concluir'}</button></div>`)}</td>`)}</tr>`}
                  ${(doc.grades?.[k] || []).map((r, ri) => html`<tr key=${ri}>
                    <td class="ag-nome"><input class="ag-inp" value=${r.nome} placeholder=${rot} onInput=${e => mudar(d => { d.grades[k][ri].nome = e.target.value; })} />
                      <button class="x-btn" title="Remover linha" onClick=${() => mudar(d => { d.grades[k].splice(ri, 1); })}>×</button></td>
                    ${r.dias.map((v, di) => { const dISO = isoD(diasD[di]); const tsk = tarefas.filter(t => norm(t.pessoa) === norm(r.nome) && t.inicio <= dISO && t.fim >= dISO); return html`<td key=${di} style=${corCelula(v, lista)}>
                      ${tsk.map(t => { const c = t.cliente ? corCliente(t.cliente) : '#57534e'; const atr = t.status !== 'concluida' && t.fim < isoD(new Date()); const ult = t.fim === dISO; return html`<button key=${t.id} class=${'tar-bar' + (t.status === 'concluida' ? ' ok' : '') + (atr ? ' atr' : '') + (t.inicio === dISO ? ' ini' : '') + (ult ? ' fim' : '')} style=${{ '--cc': c }} onClick=${() => setVerT(t)} title=${(t.cliente || '') + ' ' + (t.texto || '')}>
                        ${t.inicio === dISO || di === 0 ? html`<b>${(t.cliente || t.texto || '').split(/\s[-–]\s/)[0]}</b> <small>${t.ambiente || t.texto}</small>` : html`<small>…</small>`}
                        ${ult ? html`<em>${t.status === 'concluida' ? '✓' : atr ? '⚠' : '📅'} ${dm(t.fim)}</em>` : ''}</button>
                        ${ult && t.status !== 'concluida' ? html`<button class="cel-ok tar-ok" onClick=${async () => { try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId, 'tarefas', t.id), { status: 'concluida', concluidaEm: nowIso(), concluidaPor: sessao.nome }); registrar(sessao, t.osId, '✅', 'Tarefa concluída: ' + t.pessoa, t.texto || ''); toast('Tarefa concluída.', 'ok'); } catch (er) { toast(er.message, 'erro'); } }}>✓ Concluir tarefa</button>` : ''}`; })}
                      ${tagsOS(v, lista)}${(() => { const fk = k + '|' + norm(r.nome) + '|' + di; const fe = doc.feitos?.[fk]; return v.trim() ? html`<button class=${'cel-ok' + (fe ? ' on' : '')} title=${fe ? 'Concluído por ' + fe.por + ' — toque para desfazer' : 'Marcar como concluído'} onClick=${async () => { let mot = ''; if (fe) { mot = await pedirMotivo('Reabrir no cronograma', 'Já estava concluído. Informe o motivo para reabrir.'); if (!mot) return; } registrarVarias(sessao, osCitadas(v, lista), fe ? '↺' : '✅', (fe ? 'Reaberto no cronograma: ' : 'Concluído no cronograma: ') + (r.nome || '') + ' · ' + dm(isoD(diasD[di])), mot || v.split('\n')[0]); mudar(d => { d.feitos = d.feitos || {}; if (d.feitos[fk]) { d.reaberturas = [...(d.reaberturas || []), { fk, motivo: mot, quem: sessao.nome, em: nowIso() }]; delete d.feitos[fk]; } else d.feitos[fk] = { por: sessao.nome, em: nowIso() }; }); }}>${fe ? '✓ Concluído · ' + fe.por.split(' ')[0] : '✓ Concluir'}</button>` : null; })()}<textarea class=${'ag-cel' + (doc.feitos?.[k + '|' + norm(r.nome) + '|' + di] ? ' feito' : '')} rows="2" value=${v} onInput=${e => mudar(d => { d.grades[k][ri].dias[di] = e.target.value; })}></textarea>
                      <span class="cel-acoes"><button class="btn btn-ghost btn-sm" title="Tarefa com prazo" onClick=${() => setNovaT({ pessoa: r.nome, grade: k, inicio: dISO })}>📅</button><${OSPicker} lista=${lista} onPick=${l => mudar(d => { d.grades[k][ri].dias[di] = addLinha(d.grades[k][ri].dias[di], l); })} /></span></td>`; })}
                  </tr>`)}
                </tbody>
              </table></div>
            </div>`)}
          <div class="grid2" style=${{ alignItems: 'start' }}>
            ${LISTAS.map(([k, t, ic]) => {
              const auto = k === 'cortes' ? 'corte' : k === 'fitaLimpeza' ? 'fita' : null;
              const autos = auto ? diasD.flatMap(d => eventosOS(lista, d)).filter(e => e.t === auto) : [];
              return html`<div key=${k} class="card page-card stack">
                <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">${ic} ${t}</div><${OSPicker} lista=${lista} onPick=${l => mudar(d => { d.listas = d.listas || {}; d.listas[k] = addLinha(d.listas[k], l); })} /></div>
                ${autos.map((e, j) => html`<div key=${j} class="ag-chip">📌 ${e.txt} até ${e.o.execucao.etapas[auto].prazo}: <b>${numOS(e.o)}</b> ${e.o.cliente?.nome}</div>`)}
                <textarea class="inp" rows="4" placeholder="Uma por linha" value=${doc.listas?.[k] || ''} onInput=${e => mudar(d => { d.listas = d.listas || {}; d.listas[k] = e.target.value; })}></textarea>
              </div>`; })}
          </div>
          <div class="card page-card stack">
            <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title">🏭 Fornecedores & parceiros (pintura, vidros, lâminas…)</div>
              <button class="btn btn-sm btn-ghost" onClick=${() => mudar(d => { d.fornecedores = [...(d.fornecedores || []), { nome: '', itens: '' }]; })}>+ Fornecedor</button></div>
            <div class="grid3" style=${{ alignItems: 'start' }}>
              ${(doc.fornecedores || []).map((f, fi) => html`<div key=${fi} class="acab-box">
                <div class="row" style=${{ flexWrap: 'nowrap', gap: '4px' }}><input class="ag-inp" style=${{ fontWeight: 700 }} value=${f.nome} placeholder="Fornecedor" onInput=${e => mudar(d => { d.fornecedores[fi].nome = e.target.value; })} />
                  <${OSPicker} lista=${lista} onPick=${l => mudar(d => { d.fornecedores[fi].itens = addLinha(d.fornecedores[fi].itens, l); })} />
                  <button class="x-btn" onClick=${() => mudar(d => { d.fornecedores.splice(fi, 1); })}>×</button></div>
                <textarea class="inp" rows="3" value=${f.itens} placeholder="O que está com este fornecedor e previsão" onInput=${e => mudar(d => { d.fornecedores[fi].itens = e.target.value; })}></textarea>
              </div>`)}
            </div>
          </div>
        </div>`}
    </div>`;
}

function AgendaMes({ sessao, lista, setSemana, setVista }) {
  const [mes, setMes] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const [agendas, setAgendas] = useState({});
  useEffect(() => F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'agenda'), s => { const m = {}; s.docs.forEach(d => { m[d.id] = d.data(); }); setAgendas(m); }, () => {}), []);
  const ini = segundaDe(mes);
  const semanas = [];
  const fimMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
  for (let d = new Date(ini); d <= fimMes && semanas.length < 6; d.setDate(d.getDate() + 7)) semanas.push(new Date(d));
  const itensAgenda = (dia) => {
    const s = agendas[iso(segundaDe(dia))]; if (!s) return [];
    const i = (dia.getDay() + 6) % 7; if (i > 4) return [];
    const out = [];
    GRADES.forEach(([k, t]) => (s.grades?.[k] || []).forEach(r => { const v = (r.dias?.[i] || '').trim(); if (v) out.push({ k, txt: (s.feitos?.[k + '|' + norm(r.nome) + '|' + i] ? '✓ ' : '') + (r.nome ? r.nome + ': ' : '') + v.split('\n')[0] }); }));
    return out;
  };
  const cor = { entregas: '#0E7490', montagem: '#15803D', producao: '#A16207', terceirizados: '#7C3AED', marceneiros: '#B45309' };
  const hoje = new Date();
  return html`
    <div class="card page-card stack">
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div class="row" style=${{ gap: '6px' }}>
          <button class="btn btn-sm" onClick=${() => setMes(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>‹</button>
          <b style=${{ fontSize: '18px', textTransform: 'capitalize' }}>${mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</b>
          <button class="btn btn-sm" onClick=${() => setMes(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>›</button>
        </div>
        <div class="row dim" style=${{ gap: '10px', fontSize: '12px' }}>${GRADES.map(([k, t]) => html`<span key=${k} class="row" style=${{ gap: '4px' }}><i class="leg" style=${{ background: cor[k] }}></i>${t.replace(/^\S+ /, '')}</span>`)}<span>🚚 entrega de OS · 📌 prazo de etapa</span></div>
      </div>
      <div class="mes">
        ${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => html`<div key=${d} class="mes-h">${d}</div>`)}
        ${semanas.flatMap(s => Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(d.getDate() + i); return d; })).map(d => {
          const ev = eventosOS(lista, d); const ag = itensAgenda(d);
          return html`<div key=${iso(d)} class=${'mes-d' + (d.getMonth() !== mes.getMonth() ? ' fora' : '') + (mesmoDia(d, hoje) ? ' hoje' : '')} onClick=${() => { setSemana(iso(segundaDe(d))); setVista('semana'); }}>
            <b>${d.getDate()}</b>
            ${ev.slice(0, 4).map((e, j) => html`<div key=${'e' + j} class=${'mes-ev ' + (e.t === 'entrega' ? 'ent' : '')} style=${{ borderLeftColor: corOS(e.o), background: corOS(e.o) + '1a' }}>${e.t === 'entrega' ? '🚚' : '📌'} ${numOS(e.o)} ${e.o.cliente?.nome || ''}${e.t !== 'entrega' ? ' · ' + e.txt : ''}</div>`)}
            ${ag.slice(0, 4).map((a, j) => html`<div key=${'a' + j} class="mes-ev" style=${{ borderLeftColor: cor[a.k] }}>${a.txt}</div>`)}
            ${ev.length + ag.length > 8 && html`<small class="dim">+${ev.length + ag.length - 8} mais</small>`}
          </div>`; })}
      </div>
    </div>`;
}

/* ---------- Cronogramas de produção e entregas ---------- */
function TelaCronograma({ sessao, abrirOS, toast }) {
  const [lista, setLista] = useState(null);
  const [vista, setVista] = useState('semana');
  const [semana, setSemana] = useState(() => { const d = window.__semanaIr ? deIsoD(window.__semanaIr) : new Date(); window.__semanaIr = null; return iso(segundaDe(d)); });
  const [semanas, setSemanas] = useState(8);
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([]));
  }, []);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const ini = new Date(hoje); ini.setDate(ini.getDate() - ((ini.getDay() + 6) % 7));
  const dias = semanas * 7;
  const pos = (d) => d ? Math.max(0, Math.min(100, (d - ini) / 86400000 / dias * 100)) : null;
  const ativas = (lista || []).filter(o => o.status !== 'concluida');
  const cores = { corte: '#6B7280', fita: '#A16207', cavas: '#0E7490', pintura: '#BE185D', tapecaria: '#7C3AED', montagem: '#15803D' };
  const entregas = (lista || []).filter(o => lerPrazo(o.prazoEntrega)).sort((a, b) => lerPrazo(a.prazoEntrega) - lerPrazo(b.prazoEntrega));
  const semanaDe = (d) => { const s = new Date(d); s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); return s; };
  const grupos = {};
  entregas.forEach(o => { const d = lerPrazo(o.prazoEntrega); const k = d < hoje && o.status !== 'concluida' ? 'Atrasadas' : 'Semana de ' + semanaDe(d).toLocaleDateString('pt-BR'); (grupos[k] = grupos[k] || []).push(o); });
  return html`
    <div class="fade-up stack">
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div><h2>Cronogramas</h2><div class="dim">Agenda semanal da fábrica, visão do mês, produção por etapa e entregas. As OSs cadastradas aparecem sozinhas pelas datas.</div></div>
        <div class="seg-mini">${[['semana', '📋 Semana'], ['mes', '🗓 Mês'], ['producao', '🏭 Produção'], ['entregas', '🚚 Entregas']].map(([v, t]) => html`<button key=${v} class=${vista === v ? 'on' : ''} onClick=${() => setVista(v)}>${t}</button>`)}</div>
      </div>
      ${lista === null ? html`<div class="card">Carregando…</div>`
      : vista === 'semana' ? html`<${AgendaSemana} sessao=${sessao} lista=${lista} semana=${semana} setSemana=${setSemana} toast=${toast} />`
      : vista === 'mes' ? html`<${AgendaMes} sessao=${sessao} lista=${lista} setSemana=${setSemana} setVista=${setVista} />`
      : vista === 'producao' ? html`
        <div class="card page-card stack">
          <div class="row" style=${{ justifyContent: 'space-between' }}>
            <div class="row" style=${{ gap: '8px' }}>${ETAPAS_FAB.map(([k, t]) => html`<span key=${k} class="row dim" style=${{ gap: '4px' }}><i class="leg" style=${{ background: cores[k] }}></i>${t}</span>`)}</div>
            <select class="inp inp-sm" style=${{ width: 'auto' }} value=${semanas} onChange=${e => setSemanas(+e.target.value)}>${[4, 8, 12, 16].map(n => html`<option key=${n} value=${n}>${n} semanas</option>`)}</select>
          </div>
          <div class="gantt">
            <div class="g-row g-head"><div class="g-nome">OS</div><div class="g-trilha">${Array.from({ length: semanas }, (_, i) => { const d = new Date(ini); d.setDate(d.getDate() + i * 7); return html`<span key=${i} style=${{ left: (i / semanas * 100) + '%' }}>${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>`; })}
              <b class="g-hoje" style=${{ left: pos(hoje) + '%' }}></b></div></div>
            ${ativas.map(o => {
              const et = o.execucao?.etapas || {};
              let ant = lerPrazo(o.criadoEm?.slice(0, 10).split('-').reverse().join('/')) || hoje;
              const barras = ETAPAS_FAB.map(([k, t]) => { const e = et[k] || {}; const fim = lerPrazo(e.prazo); const r = fim ? { k, t, de: ant, ate: fim, st: e.status || 'pendente' } : null; if (fim) ant = fim; return r; }).filter(Boolean);
              const entrega = lerPrazo(o.prazoEntrega);
              return html`<div key=${o.id} class="g-row" style=${{ '--cc': corOS(o) }} onClick=${() => abrirOS(o.id)}>
                <div class="g-nome"><b>${numOS(o)}</b> ${o.cliente?.nome || ''}<small>${(o.ambientes || []).map(a => a.nome).join(', ')}</small></div>
                <div class="g-trilha">
                  ${barras.map(b => html`<i key=${b.k} class=${'g-bar ' + b.st} title=${b.t + ' até ' + b.ate.toLocaleDateString('pt-BR')} style=${{ left: pos(b.de) + '%', width: Math.max(1.2, pos(b.ate) - pos(b.de)) + '%', background: cores[b.k] }}>${b.t}</i>`)}
                  ${!barras.length && html`<span class="dim g-vazio">Defina os prazos das etapas na Etapa 3 da OS</span>`}
                  ${entrega && html`<b class="g-entrega" title=${'Entrega ' + o.prazoEntrega} style=${{ left: pos(entrega) + '%' }}>🚚</b>`}
                  <b class="g-hoje" style=${{ left: pos(hoje) + '%' }}></b>
                </div></div>`; })}
            ${!ativas.length && html`<div class="vazio dim">Nenhuma OS em andamento.</div>`}
          </div>
        </div>` : html`
        <div class="stack">
          ${Object.entries(grupos).map(([g, os]) => html`
            <div key=${g} class="card page-card stack">
              <div class="sec-title" style=${g === 'Atrasadas' ? { color: 'var(--danger)' } : undefined}>${g === 'Atrasadas' ? '⚠ ' : '📅 '}${g} <span class="chip">${os.length}</span></div>
              ${os.map(o => html`<div key=${o.id} class="list-item" style=${pinta(o)} onClick=${() => abrirOS(o.id)}>
                <div class="os-num">${numOS(o)}</div>
                <div class="grow"><div class="title">${o.cliente?.nome || '—'}</div><div class="dim">${(o.ambientes || []).map(a => a.nome).join(', ')} · ${o.cliente?.endereco || o.cliente?.obra || ''}</div></div>
                <b>${o.prazoEntrega}</b><span class=${(STATUS_OS.find(x => x.v === o.status) || STATUS_OS[0]).c}>${(STATUS_OS.find(x => x.v === o.status) || STATUS_OS[0]).t}</span>
              </div>`)}
            </div>`)}
          ${!entregas.length && html`<div class="card vazio dim">Nenhuma OS com prazo de entrega definido.</div>`}
        </div>`}
    </div>`;
}

/* ---------- Pedido de alteração (OS pronta/desbloqueada) ---------- */
const IGNORAR_DIFF = new Set(['atualizadoEm', 'atualizadoPor', 'historico', 'alteracoes', 'reaberturas', 'fingerprint', 'id', 'revisar', 'hist', 'arquivos', 'atualizadaEm', 'concluidaEm', 'ata']);
const ROT_DIFF = {
  cliente: 'Cliente', nome: 'Nome', telefone: 'Telefone', endereco: 'Endereço', obra: 'Obra', prazoEntrega: 'Prazo de entrega', observacoesGerais: 'Observações',
  responsavel: 'Responsável', arquiteto: 'Arquiteto', tamponamento: 'Tamponamento', tipo: 'Tipo', espessura: 'Espessura', modoExecucao: 'Execução',
  padrao: 'Especificações', acab: 'Acabamento', interno: 'Interno', externo: 'Externo', desc: 'Descrição', fabricante: 'Fabricante', esp: 'Espessura',
  portas: 'Portas', modelo: 'Modelo', obs: 'Obs.', laminas: 'Lâminas', perfis: 'Perfis', puxadores: 'Puxadores', led: 'LED', ferragens: 'Ferragens',
  dobradicas: 'Dobradiças', corredicas: 'Corrediças', correr: 'Portas de correr', passagem: 'Portas de passagem', marca: 'Marca', fech: 'Fechaduras',
  vidros: 'Vidros', tec: 'Tecidos', parede: 'Parede', quantidade: 'Qtd', largura: 'Largura', altura: 'Altura', profundidade: 'Profundidade',
  mdfCaixa: 'MDF caixa', mdfFrente: 'MDF frente', cor: 'Cor', fitaBorda: 'Fita', gavetas: 'Gavetas', puxador: 'Puxador', iluminacao: 'Iluminação',
  ambientes: 'Ambiente', moveis: 'Móvel', ativo: 'Ativo', ambienteResumo: 'Ambientes', tipo: 'Tipo',
  observacoes: 'Observações', execucao: 'Execução', etapas: 'Etapas', status: 'Status', prazo: 'Prazo', onde: 'Onde', parceiros: 'Parceiros', cores: 'Cores', contrato: 'Contrato',
};
const valTxt = (v) => v == null || v === '' ? '(vazio)' : Array.isArray(v) ? (v.every(x => typeof x !== 'object') ? v.join('; ') || '(vazio)' : v.length + ' itens') : typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : typeof v === 'object' ? JSON.stringify(v) : String(v);
function diffOS(a, b, caminho = [], out = []) {
  if (Array.isArray(a) || Array.isArray(b)) {
    const A = a || [], B = b || [];
    const deObj = [...A, ...B].some(x => x && typeof x === 'object');
    if (!deObj) { if (JSON.stringify(A) !== JSON.stringify(B)) out.push({ campo: caminho.join(' › '), de: valTxt(A), para: valTxt(B) }); return out; }
    const chave = (x, i) => x?.id || x?.nome || i;
    const mapA = new Map(A.map((x, i) => [chave(x, i), x])), mapB = new Map(B.map((x, i) => [chave(x, i), x]));
    for (const [k, x] of mapB) { const nome = x?.nome || ('item ' + k); if (!mapA.has(k)) out.push({ campo: [...caminho, nome].join(' › '), de: '(não existia)', para: 'ADICIONADO' }); else diffOS(mapA.get(k), x, [...caminho, nome], out); }
    for (const [k, x] of mapA) if (!mapB.has(k)) out.push({ campo: [...caminho, x?.nome || ('item ' + k)].join(' › '), de: 'existia', para: 'REMOVIDO' });
    return out;
  }
  if ((a && typeof a === 'object') || (b && typeof b === 'object')) {
    const ks = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const k of ks) { if (IGNORAR_DIFF.has(k)) continue; diffOS((a || {})[k], (b || {})[k], [...caminho, ROT_DIFF[k] || k], out); }
    return out;
  }
  const na = a == null || a === '' || a === false ? '' : a, nb = b == null || b === '' || b === false ? '' : b;
  if (String(na) !== String(nb)) out.push({ campo: caminho.join(' › '), de: valTxt(a), para: valTxt(b) });
  return out;
}
/* ---------- Registro de eventos na linha do tempo da OS ---------- */
function registrar(sessao, osId, ic, t, d) {
  if (!osId || !sessao?.empresaId) return Promise.resolve();
  return F().fsMod.addDoc(col('empresas', sessao.empresaId, 'os', osId, 'eventos'), { q: nowIso(), ic, t, d: d || '', p: sessao.nome || '' }).catch(() => {});
}
function registrarVarias(sessao, oss, ic, t, d) { const vis = new Set(); (oss || []).forEach(o => { if (o && !vis.has(o.id)) { vis.add(o.id); registrar(sessao, o.id, ic, t, d); } }); }
/* Pede só o motivo (sem senha) — usado no cronograma */
function pedirMotivo(titulo, texto) {
  return new Promise(res => {
    const el = document.createElement('div'); document.body.appendChild(el);
    const root = ReactDOM.createRoot(el);
    const fim = (v) => { root.unmount(); el.remove(); res(v); };
    function M() {
      const [m, setM] = useState('');
      return html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fim(null)}>
        <div class="card modal-caixa stack" style=${{ width: 'min(460px,100%)' }}>
          <div class="sec-title">↺ ${titulo}</div>
          <div class="dim">${texto || 'Isso já foi salvo. Informe o motivo para reabrir.'}</div>
          <textarea class="inp" rows="3" autoFocus placeholder="Motivo (obrigatório)" value=${m} onInput=${e => setM(e.target.value)}></textarea>
          <div class="row" style=${{ gap: '6px' }}><button class="btn btn-grande" style=${{ flex: 1 }} onClick=${() => fim(null)}>Cancelar</button>
            <button class="btn btn-grande btn-marrom" style=${{ flex: 1 }} onClick=${() => m.trim().length < 5 ? alertaMin() : fim(m.trim())}>Confirmar</button></div>
        </div></div>`;
    }
    const alertaMin = () => { const t = el.querySelector('textarea'); if (t) { t.style.borderColor = '#dc2626'; t.placeholder = 'Escreva o motivo (mín. 5 letras)'; t.focus(); } };
    root.render(html`<${M} />`);
  });
}


/* ---------- OS por temas (visual, colorido) ---------- */
const TEMAS_COR = { cli: '#2563eb', acab: '#d97706', portas: '#7c3aed', pux: '#ca8a04', ferr: '#475569', fech: '#0d9488', par: '#92400e', amb: '#16a34a', obs: '#dc2626' };
function VisaoTemas({ os }) {
  const P = os.padrao || {}, Fe = P.ferragens || {};
  const fl = (k) => Object.values(Fe[k] || {}).filter(Boolean).join(' · ');
  const mdf = (x) => [x?.fabricante, x?.cor, x?.espessura ? x.espessura + ' mm' : ''].filter(Boolean).join(' · ');
  const tamp = os.tamponamento?.tipo && os.tamponamento.tipo !== 'sem' ? (os.tamponamento.tipo === 'aparente' ? 'Aparente' : 'Não aparente') + (os.tamponamento.espessura ? ' · ' + os.tamponamento.espessura + ' mm' : '') : '';
  const temas = [
    ['cli', '👤', 'Cliente & obra', [['Cliente', os.cliente?.nome], ['Telefone', os.cliente?.telefone], ['Obra', os.cliente?.obra], ['Endereço', os.cliente?.endereco], ['Prazo de entrega', os.prazoEntrega ? dm(os.prazoEntrega) + '/' + os.prazoEntrega.slice(0, 4) : ''], ['Arquiteto', os.arquiteto], ['Responsável', os.responsavel], ['Tamponamento', tamp], ['Execução', ({ interna: 'Interna', terceirizada: 'Terceirizada', mista: 'Mista' })[os.modoExecucao || 'interna']]]],
    ['acab', '🎨', 'Acabamentos', [['Interno', textoAcab(P.acab?.interno)], ['Externo', textoAcab(P.acab?.externo)], ['Outras', P.outras]]],
    ['portas', '🚪', 'Portas & frentes', [['Modelo', P.portas?.modelo], ['Usinagem', P.portas?.obs], ['Lâminas', (P.laminas || []).join('; ')], ['Perfis', (P.perfis || []).join('; ')]]],
    ['pux', '💡', 'Puxadores & iluminação', [['Puxadores', (P.puxadores || []).join('; ')], ['LED', P.led?.ativo ? [P.led.fita, P.led.temp, P.led.perfil, P.led.fonte, P.led.locais].filter(Boolean).join(' · ') : '']]],
    ['ferr', '🔩', 'Ferragens', [['Dobradiças', fl('dobradicas')], ['Corrediças', fl('corredicas')], ['Portas de correr', fl('correr')], ['Portas de passagem', fl('passagem')]]],
    ['fech', '🔒', 'Fechaduras, vidros & tecidos', [['Fechaduras', textoFech(P.fech) || (P.fechaduras || []).join('; ')], ['Vidros', textoVidro(P.vidros)], ['Tecidos', textoTec(P.tec) || (P.tecidos || []).join('; ')]]],
    ['par', '🧱', 'Paredes / painéis', [['Parede inteira', P.parede?.ativo ? [P.parede.espec, P.parede.paginacao, P.parede.fixacao].filter(Boolean).join(' — ') : '']]],
  ].map(([k, ic, t, l]) => [k, ic, t, l.filter(([, v]) => v)]).filter(([, , , l]) => l.length);
  const tema = (k, ic, t, corpo, n) => html`<div key=${k} class="tema" style=${{ '--tc': TEMAS_COR[k] }}><div class="tema-t"><span>${ic}</span>${t}${n ? html`<em>${n}</em>` : ''}</div>${corpo}</div>`;
  return html`<div class="temas">
    ${temas.map(([k, ic, t, l]) => tema(k, ic, t, html`<div class="tema-kv">${l.map(([a, b]) => html`<div key=${a}><small>${a}</small><b>${b}</b></div>`)}</div>`))}
    ${tema('amb', '📐', 'Ambientes & móveis', html`${(os.ambientes || []).map((a, ai) => html`<div key=${a.id || ai} class="tema-amb"><div class="tema-amb-t">${String(ai + 1).padStart(2, '0')} · ${a.nome || 'Ambiente'}</div>
      ${(a.moveis || []).map(m => html`<div key=${m.id} class="tema-mov"><b>${m.quantidade > 1 ? m.quantidade + '× ' : ''}${m.nome}</b>
        <span class="tm-med">${[m.largura, m.altura, m.profundidade].map(x => x || '—').join(' × ')} mm</span>
        <div class="tm-chips">${[mdf(m.mdfCaixa) && '📦 ' + mdf(m.mdfCaixa), mdf(m.mdfFrente) && '🚪 ' + mdf(m.mdfFrente), m.fitaBorda && '🎞 ' + m.fitaBorda, m.portas && 'Portas: ' + m.portas, m.gavetas && 'Gavetas: ' + m.gavetas, m.puxador && '🔘 ' + m.puxador, m.iluminacao && '💡 ' + m.iluminacao, ...(m.ferragens || []).map(f => '🔩 ' + (f.quantidade ? f.quantidade + '× ' : '') + [f.tipo, f.fabricante, f.modelo].filter(Boolean).join(' '))].filter(Boolean).map((c, i) => html`<span key=${i}>${c}</span>`)}</div>
        ${m.observacoes && html`<div class="tm-obs">${m.observacoes}</div>`}</div>`)}
      ${!(a.moveis || []).length && html`<div class="dim">Sem móveis cadastrados</div>`}</div>`)}`, (os.ambientes || []).length + ' amb.')}
    ${os.observacoesGerais && tema('obs', '📝', 'Observações gerais', html`<div style=${{ whiteSpace: 'pre-line' }}>${os.observacoesGerais}</div>`)}
  </div>`;
}

/* ---------- OS no calendário ---------- */
function CalendarioOS({ sessao, os }) {
  const [tar, setTar] = useState(null);
  useEffect(() => { const { onSnapshot, query, where } = F().fsMod; return onSnapshot(query(col('empresas', sessao.empresaId, 'tarefas'), where('osId', '==', os.id)), s => setTar(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setTar([])); }, [os.id]);
  const hoje = isoD(new Date());
  const itens = [
    ...(tar || []).map(t => ({ d: t.inicio, fim: t.fim, ic: t.status === 'concluida' ? '✅' : t.fim < hoje ? '⚠️' : '📅', t: (GRADES.find(g => g[0] === t.grade) || [, ''])[1].replace(/^\S+ /, '') + ' · ' + t.pessoa, s: t.texto, ok: t.status === 'concluida', atr: t.status !== 'concluida' && t.fim < hoje })),
    ...(os.prazoEntrega ? [{ d: os.prazoEntrega, ic: os.entregaFeita ? '✅' : '🚚', t: 'Prazo de entrega', ok: !!os.entregaFeita, ent: true }] : []),
  ].sort((a, b) => String(a.d).localeCompare(String(b.d)));
  return html`<div class="cal-os">
    ${tar === null ? html`<div class="dim">Carregando…</div>` : itens.length === 0 ? html`<div class="dim">Esta OS ainda não está no cronograma. Use 📅 Enviar para cronograma.</div>` :
      itens.map((x, i) => html`<button key=${i} class=${'cal-i' + (x.ok ? ' ok' : '') + (x.atr ? ' atr' : '') + (x.ent ? ' ent' : '')} onClick=${() => window.__irCronograma && window.__irCronograma(x.d)}>
        <span class="cal-d"><b>${dm(x.d)}</b>${x.fim && x.fim !== x.d ? html`<small>até ${dm(x.fim)}</small>` : ''}</span>
        <span class="cal-x">${x.ic} <b>${x.t}</b>${x.s ? html`<small>${x.s}</small>` : ''}</span><span class="cal-ir">Abrir ›</span></button>`)}
    <button class="btn btn-block" onClick=${() => window.__irCronograma && window.__irCronograma(itens[0]?.d || null)}>📆 Abrir o cronograma</button>
  </div>`;
}
/* ---------- Ficha da OS finalizada (abre de qualquer lugar) ---------- */
function FichaOS({ sessao, osId, fechar, editar, toast }) {
  const [o, setO] = useState(undefined);
  const [compras, setCompras] = useState([]);
  const [peds, setPeds] = useState([]);
  const [pend, setPend] = useState([]);
  useEffect(() => {
    const { onSnapshot, query, where } = F().fsMod; const e = sessao.empresaId;
    const u = [
      onSnapshot(docRef('empresas', e, 'os', osId), d => setO(d.exists() ? { id: d.id, ...d.data() } : null), () => setO(null)),
      onSnapshot(docRef('empresas', e, 'compras', osId), d => setCompras(d.exists() ? (d.data().itens || []) : []), () => {}),
      onSnapshot(query(col('empresas', e, 'pedidos'), where('osId', '==', osId)), s => setPeds(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}),
      onSnapshot(col('empresas', e, 'os', osId, 'diario'), s => setPend(s.docs.map(d => d.data()).filter(x => x.tipo === 'pendencia' && !x.resolvida)), () => {}),
    ];
    return () => u.forEach(f => f && f());
  }, [osId]);
  const [enviar, setEnviar] = useState(false);
  const [modoV, setModoV] = useState('temas');
  const [todas, setTodas] = useState([]);
  useEffect(() => F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'os'), s => setTodas(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}), []);
  useEffect(() => { if (o === null) fechar(); }, [o]);
  if (!o) return null;
  const fin = o.status === 'concluida';
  const imprimir = () => { document.body.classList.add('imp-ficha'); setTimeout(() => { window.print(); document.body.classList.remove('imp-ficha'); }, 150); };
  const cor = corOS(o);
  const et = o.execucao?.etapas || {};
  const parc = parceirosDaOS(o);
  const faltaCompra = compras.filter(i => !i.comprado);
  const pedAb = peds.filter(pedAberto);
  const parcAb = parc.filter(p => p.st !== 'recebido');
  const etAb = ETAPAS_FAB.filter(([k]) => et[k] && et[k].status !== 'pronto' && et[k].onde !== 'nao');
  const falta = [
    ...parcAb.map(p => p.ic + ' ' + p.t + ': ' + infoSt(p.st)[2]),
    ...faltaCompra.map(i => '🛒 Comprar: ' + (i.qtd ? i.qtd + ' ' : '') + i.descricao + (i.parceiro ? ' (' + i.parceiro + ')' : '')),
    ...pedAb.map(p => '🪵 Peça extra: ' + resumoPed(p)),
    ...pend.map(p => '⚠️ Pendência: ' + String(p.texto || '').slice(0, 90)),
  ];
  const fim = (o.statusHist || []).slice().reverse().find(h => h.st === 'concluida');
  return ReactDOM.createPortal(html`<div class="modal-fundo" onClick=${e => e.target === e.currentTarget && fechar()}>
    <div class="card modal-caixa stack ficha" style=${{ width: 'min(720px,100%)', '--cc': cor }}>
      <div class="ficha-cab"><div><div class="ficha-num">${numOS(o)} <span>${fin ? '✅ Finalizada' + (fim ? ' · ' + fmtData(fim.em) : '') : ((STATUS_OS.find(x => x.v === o.status) || STATUS_OS[0] || {}).t || '').replace(/^\d+\. /, '')}</span></div>
        <b>${o.cliente?.nome || ''}</b><small>${(o.ambientes || []).map(a => a.nome).join(', ') || o.ambienteResumo || ''}${o.prazoEntrega ? ' · entrega ' + dm(o.prazoEntrega) : ''}</small></div>
        <button class="x-btn" style=${{ color: '#fff' }} onClick=${fechar}>✕</button></div>

      <div class="ficha-acoes">
        <button class="btn btn-grande btn-primary" onClick=${() => editar(osId)}>✏️ Editar OS</button>
        <button class="btn btn-grande" onClick=${imprimir}>🖨 Imprimir</button>
        <button class="btn btn-grande btn-verde" onClick=${() => setEnviar(true)}>📅 Enviar para cronograma</button>
        <button class=${'btn btn-grande' + (modoV === 'cal' ? ' btn-primary' : '')} onClick=${() => setModoV(modoV === 'cal' ? 'temas' : 'cal')}>📆 Ver no calendário</button>
      </div>
      <div class="seg-mini" style=${{ alignSelf: 'flex-start' }}>${[['temas', '🎨 Por temas'], ['folha', '📄 Folha de impressão'], ['cal', '📆 Calendário']].map(([k, t]) => html`<button key=${k} class=${modoV === k ? 'on' : ''} onClick=${() => setModoV(k)}>${t}</button>`)}</div>
      ${modoV === 'temas' && html`<${VisaoTemas} os=${o} />`}
      ${modoV === 'cal' && html`<${CalendarioOS} sessao=${sessao} os=${o} />`}
      <div class=${'ficha-papel' + (modoV === 'folha' ? '' : ' so-imp')}><${ImpressaoOS} os=${o} empresa=${sessao.empresaNome} /></div>
      ${fin && html`<div class=${'ficha-falta' + (falta.length ? '' : ' ok')}>${falta.length ? html`<b>⚠ Falta ${falta.length} ${falta.length === 1 ? 'coisa' : 'coisas'}</b>${falta.map((f, i) => html`<div key=${i}>• ${f}</div>`)}` : html`<b>✓ Nada pendente — tudo comprado, recebido e concluído</b>`}</div>`}
      ${fin && html`<div class="ficha-sec">🤝 Terceiros / parceiros</div>
      ${parc.length ? html`<div class="ficha-lista">${parc.map(p => { const i = infoSt(p.st); return html`<div key=${p.k} class="fl-i"><span>${p.ic} <b>${p.t}</b>${p.fornecedor || p.nome ? html` <small>${p.fornecedor || p.nome}</small>` : ''}</span><span class="fl-st" style=${{ background: i[3] }}>${i[2]}</span></div>`; })}</div>` : html`<div class="dim">Nenhum item com terceiros.</div>`}

      <div class="ficha-sec">🛒 Compras <small class="dim">${compras.length - faltaCompra.length}/${compras.length} compradas</small></div>
      ${compras.length ? html`<div class="ficha-lista">${compras.map((i, j) => html`<div key=${j} class="fl-i"><span>${i.comprado ? '✅' : '⬜'} ${i.qtd ? i.qtd + ' ' : ''}${i.descricao}${i.parceiro ? html` <small>${i.parceiro}</small>` : ''}</span><span class="fl-st" style=${{ background: i.comprado ? '#16a34a' : '#dc2626' }}>${i.comprado ? 'Comprado' : 'Falta'}</span></div>`)}</div>` : html`<div class="dim">Sem folha de compras.</div>`}

      ${peds.length > 0 && html`<div class="ficha-sec">🪵 Peças extras</div><div class="ficha-lista">${peds.map(p => { const s = ((PED_ST[p.tipo] || PED_ST.interno).find(x => x[0] === p.st) || []); return html`<div key=${p.id} class="fl-i"><span>${resumoPed(p)}</span><span class="fl-st" style=${{ background: s[2] || '#9ca3af' }}>${s[1] || p.st}</span></div>`; })}</div>`}

`}
      <${LinhaDoTempo} os=${o} sessao=${sessao} />
      <div class="row" style=${{ gap: '6px' }}><button class="btn btn-grande" style=${{ flex: 1 }} onClick=${fechar}>Fechar</button>
        <button class="btn btn-grande btn-primary" style=${{ flex: 1 }} onClick=${() => editar(osId)}>✏️ Editar OS</button></div>
      ${enviar && html`<${NovaTarefa} sessao=${sessao} lista=${todas} osInicial=${o} toast=${toast} fechar=${() => setEnviar(false)} aoLancar=${fechar} />`}
    </div></div>`, document.body);
}
function linhaDoTempo(os, extras) {
  const ev = [];
  if (os.criadoEm) ev.push({ q: os.criadoEm, ic: '🆕', t: 'OS criada', d: (os.origem ? 'origem: ' + os.origem : ''), p: os.criadoPor });
  (os.historico || []).forEach(h => ev.push({ q: h.quando, ic: '🔓', t: 'Desbloqueada para edição', d: h.motivo, p: h.quem }));
  (os.alteracoes || []).forEach(a => ev.push({ q: a.quando, ic: '📝', t: 'Pedido de alteração nº ' + a.n + ' (' + a.itens.length + ' itens)', d: a.motivo, p: a.quem }));
  (os.reaberturas || []).forEach(r => ev.push({ q: r.quando, ic: '↺', t: r.oque, d: r.motivo, p: r.quem }));
  Object.entries(os.execucao?.etapas || {}).forEach(([k, e]) => { if (e.concluidaEm) ev.push({ q: e.concluidaEm, ic: '✅', t: 'Etapa concluída: ' + ((ETAPAS_FAB.find(x => x[0] === k) || [])[1] || k) }); });
  Object.entries(os.parceiros || {}).forEach(([k, pa]) => (pa.hist || []).forEach(h => ev.push({ q: h.em, ic: '🤝', t: ((TIPOS_PARC.find(x => x[0] === k) || [])[2] || k) + ': ' + infoSt(h.st)[2], d: h.motivo || '', p: h.quem })));
  (os.contrato?.arquivos || []).forEach(a => ev.push({ q: a.em, ic: '📑', t: 'Contrato anexado: ' + a.nome }));
  (os.revisoes || []).forEach(r => ev.push({ q: r.em, ic: '☑️', t: 'Revisada', p: r.por }));
  if (os.restauradaEm) ev.push({ q: os.restauradaEm, ic: '♻️', t: 'OS restaurada', p: os.restauradaPor });
  (os.statusHist || []).forEach(h => ev.push({ q: h.em, ic: '➡️', t: 'Etapa da OS: ' + ((STATUS_OS.find(x => x.v === h.st) || {}).t || h.st).replace(/^\d+\. /, ''), p: h.quem }));
  Object.entries(os.execucao?.etapas || {}).forEach(([k, e]) => { if (e.iniciadaEm) ev.push({ q: e.iniciadaEm, ic: '▶️', t: 'Iniciou: ' + ((ETAPAS_FAB.find(x => x[0] === k) || [])[1] || k), p: e.iniciadaPor }); });
  (extras || []).forEach(e => ev.push(e));
  if (os.atualizadoEm) ev.push({ q: os.atualizadoEm, ic: '💾', t: 'Última modificação', p: os.atualizadoPor, ultima: true });
  return ev.filter(e => e.q).sort((a, b) => String(b.q).localeCompare(String(a.q)));
}
function LinhaDoTempo({ os, sessao }) {
  const [extras, setExtras] = useState([]);
  useEffect(() => { if (!os?.id || !sessao?.empresaId) return; return F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'os', os.id, 'eventos'), s => setExtras(s.docs.map(d => d.data())), () => setExtras([])); }, [os?.id]);
  const ev = linhaDoTempo(os, extras);
  return html`<details class="card page-card"><summary><b>🕒 Linha do tempo — datas das modificações</b> <span class="chip">${ev.length}</span></summary>
    <div class="tl">${ev.map((e, i) => html`<div key=${i} class=${'tl-i' + (e.ultima ? ' ult' : '')}><span class="tl-ic">${e.ic}</span>
      <div><div class="tl-d">${new Date(e.q).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}${e.p ? ' · ' + e.p : ''}</div><b>${e.t}</b>${e.d ? html`<div class="dim">${e.d}</div>` : ''}</div></div>`)}</div></details>`;
}

function ImpressaoPedido({ os, pedido, empresa }) {
  const cor = temCores(os) ? os.cores : ['#1F2937', '#C8A27A', '#B45309'];
  return html`<div class="po" style=${varsCores(cor)}>
    <div class="po-topo"><div><div class="po-emp">${empresa || ''}</div><div class="po-tit">Pedido de alteração nº ${pedido.n}</div><div class="po-sub">${os.cliente?.nome || ''} · ${(os.ambientes || []).map(a => a.nome).join(', ')}</div></div>
      <div class="po-num"><div class="po-cod">${numOS(os)}</div><div class="po-meta">${fmtData(pedido.quando)} · ${pedido.quem}</div></div></div>
    <div class="po-obs" style=${{ marginTop: '12px' }}><b>Motivo</b><div>${pedido.motivo}</div></div>
    <div class="po-sec"><span>${pedido.itens.length}</span> O que está sendo alterado</div>
    <table><thead><tr><th style=${{ width: '34%' }}>Item</th><th>Como era</th><th>Como fica</th></tr></thead>
      <tbody>${pedido.itens.map((it, i) => html`<tr key=${i}><td><b>${it.campo}</b></td><td style=${{ color: '#991b1b', textDecoration: it.para === 'ADICIONADO' ? 'none' : 'line-through' }}>${it.de}</td><td style=${{ color: '#166534', fontWeight: 700 }}>${it.para}</td></tr>`)}</tbody></table>
    <div class="po-ass">${['Solicitado por', 'Produção (ciente)', 'Cliente (de acordo)'].map(t => html`<div key=${t}><span></span>${t}</div>`)}</div>
    <div class="po-rod"><span>${empresa || ''} · OS ${numOS(os)} · alteração ${pedido.n}</span><span>Gerado pelo Gestão Pró</span></div>
  </div>`;
}

/* ---------- Confirmação com senha + motivo (excluir / editar OS pronta) ---------- */
async function conferirSenha(senha) {
  const { authMod, auth } = F();
  const u = auth.currentUser;
  if (!u) throw new Error('Sessão expirada. Entre de novo.');
  await authMod.reauthenticateWithCredential(u, authMod.EmailAuthProvider.credential(u.email, senha));
}
function SenhaMotivo({ titulo, texto, botao = 'Confirmar', perigo, onOk, fechar, semMotivo }) {
  const [senha, setSenha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [rodando, setRodando] = useState(false);
  const ok = async () => {
    if (!semMotivo && motivo.trim().length < 5) return setErro('Escreva o motivo (obrigatório, pelo menos 5 letras).');
    if (!senha) return setErro('Digite a sua senha.');
    setRodando(true); setErro('');
    try { await conferirSenha(senha); await onOk(motivo.trim() || (semMotivo ? 'Apagadas em lote (importação incorreta)' : '')); fechar(); }
    catch (e) { setErro(/password|credential/i.test(e.code || e.message) ? 'Senha incorreta.' : e.message); setRodando(false); }
  };
  return html`
    <div class="modal-fundo" onClick=${e => e.target === e.currentTarget && !rodando && fechar()}>
      <div class="card modal-caixa stack">
        <div class="sec-title">${perigo ? '🗑' : '🔓'} ${titulo}</div>
        ${texto && html`<div class="dim">${texto}</div>`}
        ${!semMotivo && html`<div class="field"><span class="lbl">Motivo (obrigatório)</span><textarea class="inp" rows="3" placeholder="Ex: cliente cancelou o ambiente / OS duplicada / correção de medida" value=${motivo} onInput=${e => setMotivo(e.target.value)} autoFocus></textarea></div>`}
        <div class="field"><span class="lbl">Sua senha</span><input class="inp" type="password" autocomplete="current-password" value=${senha} onInput=${e => setSenha(e.target.value)} onKeyDown=${e => e.key === 'Enter' && ok()} /></div>
        ${erro && html`<div class="error-box">${erro}</div>`}
        <div class="row" style=${{ justifyContent: 'flex-end', gap: '6px' }}>
          <button class="btn" onClick=${fechar} disabled=${rodando}>Cancelar</button>
          <button class=${'btn ' + (perigo ? 'btn-danger' : 'btn-primary')} onClick=${ok} disabled=${rodando}>${rodando ? 'Conferindo…' : botao}</button>
        </div>
      </div>
    </div>`;
}

async function excluirOS(sessao, os, motivo) {
  const { fsMod } = F();
  const { id, ...dados } = os;
  await fsMod.setDoc(docRef('empresas', sessao.empresaId, 'exclusoes', id), {
    osId: id, codigo: numOS(os), cliente: os.cliente?.nome || '', status: os.status || '', motivo,
    excluidoPor: sessao.nome, excluidoEm: nowIso(), dados: JSON.parse(JSON.stringify(dados)),
  });
  await fsMod.deleteDoc(docRef('empresas', sessao.empresaId, 'os', id));
  if (!excluirOS.lote) ajustarSequencia(sessao);
}

function TelaExcluir({ sessao, toast }) {
  const [lista, setLista] = useState(null);
  const [hist, setHist] = useState([]);
  const [busca, setBusca] = useState('');
  const [alvo, setAlvo] = useState(null);
  const [sel, setSel] = useState([]);
  const [lote, setLote] = useState(false);
  const [limparH, setLimparH] = useState(false);
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    const a = onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([]));
    const b = onSnapshot(query(col('empresas', sessao.empresaId, 'exclusoes'), orderBy('excluidoEm', 'desc')), s => setHist(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setHist([]));
    return () => { a(); b(); };
  }, []);
  const restaurar = async (h) => {
    if ((lista || []).some(o => numOS(o) === h.codigo)) {
      const prox = codigoDe(h.codigo.split('.')[0], proximoLivre(lista, h.codigo.split('.')[0]));
      const r = await escolher('Número já em uso', `A OS ${h.codigo} não pode voltar com o mesmo número: ele já está sendo usado por outra OS.`, [{ v: 'prox', t: 'Restaurar com o próximo número livre: ' + prox, cls: 'btn-primary' }, { v: 'nao', t: 'Cancelar' }]);
      if (r !== 'prox') return;
      const [a, n] = prox.split('.'); h = { ...h, dados: { ...h.dados, ano: a, numero: parseInt(n, 10), codigo: prox } };
    }
    try {
      await F().fsMod.setDoc(docRef('empresas', sessao.empresaId, 'os', h.osId), { ...h.dados, restauradaEm: nowIso(), restauradaPor: sessao.nome });
      await F().fsMod.deleteDoc(docRef('empresas', sessao.empresaId, 'exclusoes', h.id));
      toast('OS ' + h.codigo + ' restaurada.', 'ok');
    } catch (e) { toast('Não restaurou: ' + e.message, 'erro'); }
  };
  const filtradas = (lista || []).filter(o => !busca || norm(numOS(o) + ' ' + (o.cliente?.nome || '') + ' ' + (o.ambientes || []).map(a => a.nome).join(' ')).includes(norm(busca)));
  return html`
    <div class="fade-up stack">
      <div><h2>Excluir OSs</h2><div class="dim">Para excluir é obrigatório digitar a <b>sua senha</b> e o <b>motivo</b>. Tudo fica registrado no histórico abaixo e pode ser restaurado.</div></div>
      <div class="card page-card stack">
        <input class="inp" placeholder="Buscar por número, cliente ou ambiente…" value=${busca} onInput=${e => setBusca(e.target.value)} />
        ${filtradas.length > 0 && html`<div class="sel-barra">
          <label class="sel-todas"><input type="checkbox" checked=${filtradas.every(o => sel.includes(o.id))} onChange=${e => setSel(e.target.checked ? [...new Set([...sel, ...filtradas.map(o => o.id)])] : sel.filter(id => !filtradas.some(o => o.id === id)))} /> Selecionar todas (${filtradas.length})</label>
          ${sel.length > 0 && html`<button class="btn btn-sm" onClick=${() => setSel([])}>Limpar</button><button class="btn btn-danger" onClick=${() => setLote(true)}>🗑 Apagar ${sel.length} ${sel.length === 1 ? 'OS' : 'OSs'}</button>`}
        </div>`}
        ${lista === null ? html`<div class="dim">Carregando…</div>` : filtradas.length === 0 ? html`<div class="vazio dim">Nenhuma OS.</div>` : html`
          <div class="list">${filtradas.map(o => html`
            <div key=${o.id} class=${'list-item' + (sel.includes(o.id) ? ' sel-on' : '')} style=${pinta(o)}>
              <input type="checkbox" class="sel-ck" checked=${sel.includes(o.id)} onChange=${() => setSel(sel.includes(o.id) ? sel.filter(x => x !== o.id) : [...sel, o.id])} />
              <div class="os-num">${numOS(o)}${bolinhas(o)}</div>
              <div class="grow"><div class="title">${o.cliente?.nome || 'Cliente não informado'}</div><div class="dim">${(o.ambientes || []).map(a => a.nome).join(', ') || 'Sem ambientes'} · ${(STATUS_OS.find(x => x.v === o.status) || STATUS_OS[0]).t}</div></div>
              <button class="btn btn-sm btn-danger" onClick=${() => setAlvo(o)}>🗑 Excluir</button>
            </div>`)}</div>`}
      </div>
      <div class="card page-card stack">
        <div class="row" style=${{ justifyContent: 'space-between', gap: '8px' }}><div class="sec-title">📜 Histórico de exclusões</div>
          ${hist.length > 0 && html`<button class="btn btn-sm btn-danger" onClick=${() => setLimparH(true)}>🧹 Limpar histórico permanentemente</button>`}</div>
        ${hist.length === 0 ? html`<div class="dim">Nenhuma OS excluída.</div>` : hist.map(h => html`
          <div key=${h.id} class="item-lista" style=${{ alignItems: 'flex-start' }}>
            <span><b>OS ${h.codigo}</b> — ${h.cliente}<br/><span class="dim">Motivo: ${h.motivo}</span><br/><small class="dim">Excluída por ${h.excluidoPor} em ${fmtData(h.excluidoEm)}</small></span>
            ${sessao.papel === 'admin' && html`<button class="btn btn-sm" onClick=${() => restaurar(h)}>↩ Restaurar</button>`}
          </div>`)}
      </div>
      ${limparH && html`<${SenhaMotivo} perigo semMotivo titulo="Limpar histórico permanentemente" texto=${'As ' + hist.length + ' OSs do histórico serão apagadas para sempre e NÃO poderão mais ser restauradas.'} botao="Apagar para sempre"
        onOk=${async () => { const { writeBatch } = F().fsMod; for (let i = 0; i < hist.length; i += 400) { const b = writeBatch(F().db); hist.slice(i, i + 400).forEach(h => b.delete(docRef('empresas', sessao.empresaId, 'exclusoes', h.id))); await b.commit(); } toast('Histórico limpo.', 'ok'); }} fechar=${() => setLimparH(false)} />`}
      ${lote && html`<${SenhaMotivo} perigo semMotivo titulo=${'Apagar ' + sel.length + (sel.length === 1 ? ' OS' : ' OSs')} texto=${'Serão apagadas: ' + (lista || []).filter(o => sel.includes(o.id)).map(o => numOS(o)).join(', ') + '. Ficam no histórico e podem ser restauradas.'} botao=${'Apagar ' + sel.length}
        onOk=${async (motivo) => { let n = 0; excluirOS.lote = true; for (const o of (lista || []).filter(o => sel.includes(o.id))) { try { await excluirOS(sessao, o, motivo); n++; } catch (e) { toast('Erro em ' + numOS(o) + ': ' + e.message, 'erro'); } } excluirOS.lote = false; await ajustarSequencia(sessao); setSel([]); toast(n + (n === 1 ? ' OS apagada.' : ' OSs apagadas.') + ' Numeração ajustada.', 'ok'); }} fechar=${() => setLote(false)} />`}
      ${alvo && html`<${SenhaMotivo} perigo titulo=${'Excluir a OS ' + numOS(alvo)} texto=${(alvo.cliente?.nome || '') + ' — o número não será reaproveitado.'} botao="Excluir OS"
        onOk=${async (motivo) => { await excluirOS(sessao, alvo, motivo); toast('OS ' + numOS(alvo) + ' excluída.', 'ok'); }} fechar=${() => setAlvo(null)} />`}
    </div>`;
}

/* ---------- Cores da OS (3 bolinhas) ---------- */
const PALETAS = [
  ['Madeira', ['#6B4423', '#C8A27A', '#1F2937']], ['Grafite', ['#111827', '#6B7280', '#F59E0B']],
  ['Verde', ['#1F4D3A', '#8FB39B', '#C59B27']], ['Azul', ['#1E3A5F', '#7DA2C9', '#E0B24A']],
  ['Vinho', ['#632B30', '#D6BEB2', '#3E4144']], ['Terracota', ['#A85A44', '#E8D5C4', '#2B2B2A']],
];
const temCores = (o) => Array.isArray(o?.cores) && o.cores.length === 3;
const varsCores = (c) => ({ '--c1': c[0], '--c2': c[1], '--c3': c[2] });
const pinta = (o) => { const c = corOS(o); return { borderLeft: '5px solid ' + c, background: 'linear-gradient(90deg,' + c + '14,#fff 60%)' }; };
const bolinhas = (o) => temCores(o) ? html`<span class="bolinhas">${o.cores.map((c, i) => html`<i key=${i} style=${{ background: c }}></i>`)}</span>` : null;

function PaletaOS({ os, alterar, sessao, toast, travada }) {
  const [aberto, setAberto] = useState(false);
  const [c, setC] = useState(temCores(os) ? os.cores : PALETAS[0][1]);
  const [padrao, setPadrao] = useState(null);
  useEffect(() => { if (aberto && padrao === null) F().fsMod.getDoc(docRef('empresas', sessao.empresaId)).then(d => setPadrao(d.data()?.coresPadrao || false)).catch(() => setPadrao(false)); }, [aberto]);
  const aplicar = (cores) => { alterar(o => { o.cores = cores; }); setC(cores); };
  const salvarPadrao = async () => {
    try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { coresPadrao: c }); setPadrao(c); toast('Cores salvas como padrão da empresa.', 'ok'); }
    catch (e) { toast('Não salvou o padrão: ' + e.message, 'erro'); }
  };
  return html`
    <span class="opc-wrap">
      <button class="btn btn-sm btn-cores" disabled=${travada} onClick=${() => setAberto(!aberto)} title="Cores da OS"><span class="bolinhas">${c.map((x, i) => html`<i key=${i} style=${{ background: temCores(os) ? x : '#ddd' }}></i>`)}</span> Cores</button>
      ${aberto && html`
        <div class="opc-pop" style=${{ width: '300px' }}>
          <div class="opc-g">Escolha as 3 cores</div>
          <div class="row" style=${{ gap: '10px', justifyContent: 'center', padding: '6px 0' }}>
            ${['Principal', 'Fundo', 'Destaque'].map((t, i) => html`
              <label key=${i} class="bola-cor"><input type="color" value=${c[i]} onInput=${e => { const n = [...c]; n[i] = e.target.value; setC(n); }} /><i style=${{ background: c[i] }}></i><small>${t}</small></label>`)}
          </div>
          <button class="btn btn-primary btn-sm" onClick=${() => { aplicar(c); setAberto(false); }}>Aplicar nesta OS</button>
          <div class="opc-g">Paletas prontas</div>
          ${PALETAS.map(([n, p]) => html`<button key=${n} class="opc-i" onClick=${() => setC(p)}><span>${n}</span><span class="bolinhas">${p.map((x, i) => html`<i key=${i} style=${{ background: x }}></i>`)}</span></button>`)}
          <div class="opc-g">Padrão da empresa</div>
          ${padrao ? html`<button class="opc-i" onClick=${() => { aplicar(padrao); setAberto(false); }}><span>Aplicar o padrão</span><span class="bolinhas">${padrao.map((x, i) => html`<i key=${i} style=${{ background: x }}></i>`)}</span></button>` : html`<div class="dim" style=${{ padding: '0 6px' }}>Nenhum padrão salvo ainda.</div>`}
          <div class="row" style=${{ gap: '6px' }}>
            <button class="btn btn-sm" onClick=${salvarPadrao}>Salvar estas como padrão</button>
            ${temCores(os) && html`<button class="btn btn-ghost btn-sm" onClick=${() => { alterar(o => { o.cores = null; }); setAberto(false); }}>Tirar cores</button>`}
          </div>
        </div>`}
    </span>`;
}

/* ---------- Etapa 2: especificações gerais da OS ---------- */
const O = () => window.OPCOES || {};
const MATERIAIS = [['mdf', 'MDF', 'Chapas & cores'], ['formica', 'Fórmica', 'Laminados HPL'], ['lamina', 'Lâmina', 'Marcas & cores'], ['madeira', 'Madeira', 'Maciça padrão'], ['laca', 'Laca', '5 top marcas']];
const FER_ABAS = [
  { k: 'dobradicas', t: 'Dobradiças', op: 'DOB', dica: 'Retas, curvas, supercurvas, 165° robô ou invisíveis 3D — Blum, Hettich, Häfele, Grass, FGVTN', campos: [['modelo', 'Modelo da dobradiça', 'Ex: Dobradiça reta 110° com amortecedor'], ['marca', 'Marca', 'Ex: Blum Clip Top Blumotion'], ['calco', 'Calço, fixação e acabamento', 'Ex: Calço cruzado 3D, preto ônix'], ['obs', 'Observações / instalação', 'Ex: 3 dobradiças por porta acima de 1,5m']] },
  { k: 'corredicas', t: 'Corrediças de gaveta', op: 'COR', dica: 'Ocultas, toque (Tip-on), telescópicas 45mm ou gavetas metálicas slim', campos: [['modelo', 'Modelo da corrediça', 'Ex: Oculta extração total com amortecedor'], ['marca', 'Marca', 'Ex: Blum Tandem / Hettich Quadro'], ['tamanho', 'Capacidade de carga & aplicação', 'Ex: 60kg para gavetões de panelas'], ['obs', 'Observações / acessórios', 'Ex: barra estabilizadora em gavetões > 80cm']] },
  { k: 'correr', t: 'Portas de correr (armários)', op: 'CORRER', dica: 'Apoiado inferior, suspenso, coplanar ou perfil de alumínio com vidro', campos: [['modelo', 'Mecanismo do sistema', 'Ex: Suspenso coplanar'], ['marca', 'Marca', 'Ex: Rometal RO-65'], ['perfil', 'Trilhos, amortecedores e guias', 'Ex: trilho duplo com freio bilateral'], ['obs', 'Folhas / alinhamento', 'Ex: 2 folhas de 1,10m com perfil gola bronze']] },
  { k: 'passagem', t: 'Portas de passagem', op: 'PASSAGEM', dica: 'Suspensas no teto, roldanas aparentes, embutidas na parede ou pivotantes', campos: [['modelo', 'Mecanismo', 'Ex: Suspenso embutido no gesso'], ['marca', 'Marca', 'Ex: Ducasse DN80'], ['perfil', 'Guias, puxador e acessórios', 'Ex: guia invisível no piso, concha dupla'], ['obs', 'Vão / peso da folha', 'Ex: folha de 55kg, 1,00 x 2,60m']] },
];

function Opcoes({ grupos, onPick, rotulo = 'Opções' }) {
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState('');
  if (!grupos || !grupos.length) return null;
  const nq = norm(q);
  return html`
    <span class="opc-wrap">
      <button type="button" class="btn btn-ghost btn-sm" onClick=${() => setAberto(!aberto)}>☰ ${rotulo}</button>
      ${aberto && html`
        <div class="opc-pop" onMouseLeave=${() => setAberto(false)}>
          <input class="inp inp-sm" placeholder="Filtrar…" value=${q} onInput=${e => setQ(e.target.value)} autoFocus />
          ${grupos.map(gr => {
            const its = gr.itens.filter(i => !nq || norm(i.n + ' ' + i.b + ' ' + i.d).includes(nq));
            return its.length ? html`<div key=${gr.grupo}><div class="opc-g">${gr.grupo}</div>
              ${its.map(i => html`<button type="button" key=${i.n} class="opc-i" onClick=${() => { onPick(i.n); setAberto(false); setQ(''); }}>
                <span><b>${i.n}</b>${i.d && html`<small>${i.d}</small>`}</span>${i.b && html`<span class="chip">${i.b}</span>`}</button>`)}</div>` : null; })}
        </div>`}
    </span>`;
}

function CampoOpc({ lbl, value, onChange, grupos, ph, dica, somar }) {
  return html`
    <div class="field">
      <div class="row" style=${{ justifyContent: 'space-between', gap: '6px' }}><span class="lbl">${lbl}</span><${Opcoes} grupos=${grupos} onPick=${v => onChange(somar && value ? value + ' + ' + v : v)} /></div>
      <input class="inp" placeholder=${ph || ''} value=${value || ''} onInput=${e => onChange(e.target.value)} />
      ${dica && html`<small class="dim">${dica}</small>`}
    </div>`;
}

function textoAcab(a) {
  if (!a || a.aplica === false) return '';
  const t = a.tipo || 'mdf';
  if (t === 'laca') return ['Laca', a.laca?.marca, a.laca?.brilho, a.desc].filter(Boolean).join(' · ');
  return [a.fabricante, a.desc, a.esp ? a.esp + ' mm' : '', a.acabamento].filter(Boolean).join(' · ');
}
function textoFech(f) { return f?.ativo ? [f.modelo, ({ interna: 'interna', externa: 'externa', ambas: 'interna e externa' })[f.onde], f.marca, f.acab, f.qtd, f.obs].filter(Boolean).join(' · ') : ''; }
function textoTec(t) { return t?.ativo ? [t.tipo, t.ref, t.aplic, t.espuma, (O().TEC_RESP || []).find(r => r[0] === t.resp)?.[1]?.replace(/^\S+ /, ''), t.obs].filter(Boolean).join(' · ') : ''; }
function textoVidro(v) { return v?.ativo ? [v.tipo, v.esp, (v.proc || []).join(', '), v.perfil, v.aplic, v.obs].filter(Boolean).join(' · ') : ''; }

function AcabBox({ lado, a, set, catalogo, sessao }) {
  const fMDF = useMemo(() => ({ tipos: ['MDF'] }), []);
  const [fMarca, setFMarca] = useState(''); const [fTom, setFTom] = useState('');
  const tipo = a.tipo || 'mdf';
  const off = a.aplica === false;
  const op = O();
  const titulo = lado === 'interno' ? ['Acabamento interno', 'Caixaria, prateleiras, divisões e estrutura'] : ['Acabamento externo', 'Frentes, portas, vistas, painéis e tamponamentos'];
  const laminas = (op.LAMINAS || []).filter(l => (!fMarca || l[1] === fMarca) && (!fTom || l[2] === fTom));
  const coresLaca = (op.LACA_CORES || []).filter(c => c[3] === a.laca?.marca);
  const setLaca = (k, v) => set('laca', { ...(a.laca || {}), [k]: v });
  return html`
    <div class=${'acab-box' + (lado === 'externo' ? ' ext' : '') + (off ? ' off' : '')}>
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div><b>${titulo[0]}</b> <span class="chip">${lado.toUpperCase()}</span><div class="dim">${titulo[1]}</div></div>
        <label class="row dim" style=${{ gap: '5px' }}><input type="checkbox" checked=${!off} onChange=${e => set('aplica', e.target.checked)} /> Aplicável</label>
      </div>
      ${off ? html`<div class="dica">Este acabamento está marcado como <b>não aplicável</b> nesta OS. <button class="btn btn-ghost btn-sm" onClick=${() => set('aplica', true)}>Habilitar agora →</button></div>` : html`
      <span class="lbl">Tipo de material / acabamento</span>
      <div class="opcoes5">${MATERIAIS.map(([v, n, d]) => html`<button key=${v} class=${'opc' + (tipo === v ? ' on' : '')} onClick=${() => set('tipo', v)}><b>${n}</b><small>${d}</small></button>`)}</div>

      ${tipo === 'mdf' && html`
        <span class="lbl">Descrição da chapa de MDF (busca no catálogo)</span>
        <${CatalogoInput} value=${a.desc || ''} placeholder="Buscar: branco diamante, freijó, cinza sagrado…" catalogo=${catalogo} filtro=${fMDF} sessao=${sessao}
          onChange=${v => set('desc', v)} onPick=${it => { set('desc', it.nome); set('fabricante', it.fabricante); }} salvarComo=${() => ({ tipo: 'MDF', fabricante: a.fabricante || '' })} className="inp" />
        ${a.fabricante && html`<div class="detectado">🏭 Fabricante detectado: <b>${a.fabricante}</b></div>`}
        <div class="row" style=${{ gap: '5px' }}><span class="dim">Chapa rápida:</span>${['Duratex', 'Arauco', 'Guararapes', 'Berneck', 'Eucatex'].map(x => html`<button key=${x} class=${'pill' + (a.fabricante === x ? ' on' : '')} onClick=${() => set('fabricante', x)}>${x}</button>`)}</div>
        <div class="row" style=${{ gap: '5px' }}><span class="dim">Espessura:</span>${['6', '15', '18', '25'].map(x => html`<button key=${x} class=${'pill' + (a.esp === x ? ' on' : '')} onClick=${() => set('esp', x)}>${x}mm</button>`)}</div>`}

      ${tipo === 'formica' && html`
        <span class="lbl">Laminado de alta pressão (Fórmica / Pertech)</span>
        <div class="swatches">${(op.FORMICA || []).map(f => html`<button key=${f[1]} class=${'sw' + (a.desc === f[0] + ' ' + f[1] ? ' on' : '')} title=${f[2]} onClick=${() => { set('desc', f[0] + ' ' + f[1]); set('fabricante', f[2]); }}><i style=${{ background: f[3] }}></i><span>${f[0]}<small>${f[2]} · ${f[1]}</small></span></button>`)}</div>
        <input class="inp" placeholder="Ou digite: Fórmica Branco Texturizado L120" value=${a.desc || ''} onInput=${e => set('desc', e.target.value)} />
        <div class="row" style=${{ gap: '5px' }}><span class="dim">Acabamento:</span>${(op.FORMICA_ACAB || []).map(x => html`<button key=${x} class=${'pill' + (a.acabamento === x ? ' on' : '')} onClick=${() => set('acabamento', x)}>${x}</button>`)}</div>
        <div class="row" style=${{ gap: '5px' }}><span class="dim">Espessura:</span>${(op.FORMICA_ESP || []).map(x => html`<button key=${x} class=${'pill' + (a.esp === x ? ' on' : '')} onClick=${() => set('esp', x)}>${x}</button>`)}</div>`}

      ${tipo === 'lamina' && html`
        <span class="lbl">Lâminas de madeira (naturais & pré-compostas)</span>
        <div class="row" style=${{ gap: '6px' }}>
          <select class="inp inp-sm" style=${{ width: 'auto' }} value=${fMarca} onChange=${e => setFMarca(e.target.value)}><option value="">Todas as marcas</option>${(op.LAMINA_MARCAS || []).map(m => html`<option key=${m}>${m}</option>`)}</select>
          <select class="inp inp-sm" style=${{ width: 'auto' }} value=${fTom} onChange=${e => setFTom(e.target.value)}><option value="">Todas as tonalidades</option>${Object.entries(op.LAMINA_TONS || {}).map(([k, v]) => html`<option key=${k} value=${k}>${v}</option>`)}</select>
        </div>
        <div class="swatches">${laminas.map(l => html`<button key=${l[5]} class=${'sw' + (a.desc === l[0] ? ' on' : '')} onClick=${() => { set('desc', l[0]); set('fabricante', l[1]); }}><i style=${{ background: l[4] }}></i><span>${l[0]}<small>${l[1]} · ${l[3]} · ${l[5]}</small></span></button>`)}</div>
        <input class="inp" placeholder="Ou digite a lâmina" value=${a.desc || ''} onInput=${e => set('desc', e.target.value)} />
        <div class="row" style=${{ gap: '5px' }}><span class="dim">Verniz:</span>${(op.VERNIZES || []).map(x => html`<button key=${x} class=${'pill' + (a.acabamento === x ? ' on' : '')} onClick=${() => set('acabamento', x)}>${x}</button>`)}</div>`}

      ${tipo === 'madeira' && html`
        <span class="lbl">Madeiras maciças padrão em marcenaria</span>
        <div class="opcoes4">${(op.MADEIRAS || []).map(m => html`<button key=${m[0]} class=${'opc' + (a.desc === m[0] ? ' on' : '')} onClick=${() => set('desc', m[0])}><b>${m[0]}</b><small>${m[1]} — ${m[2]}</small></button>`)}</div>
        <input class="inp" placeholder="Ou digite a madeira" value=${a.desc || ''} onInput=${e => set('desc', e.target.value)} />
        <div class="row" style=${{ gap: '5px' }}><span class="dim">Tratamento:</span>${(op.MADEIRA_TRAT || []).map(x => html`<button key=${x} class=${'pill' + (a.acabamento === x ? ' on' : '')} onClick=${() => set('acabamento', x)}>${x}</button>`)}</div>`}

      ${tipo === 'laca' && html`
        <span class="lbl">1. Marca da laca (obrigatório para liberar as cores)</span>
        <div class="opcoes5">${(op.LACA_MARCAS || []).map(([m, s]) => html`<button key=${m} class=${'opc' + (a.laca?.marca === m ? ' on' : '')} onClick=${() => setLaca('marca', m)}><b>${m}</b><small>${s}</small></button>`)}</div>
        <span class="lbl">2. Brilho</span>
        <div class="opcoes4">${(op.LACA_BRILHO || []).map(([b, d]) => html`<button key=${b} class=${'opc' + (a.laca?.brilho === b ? ' on' : '')} onClick=${() => setLaca('brilho', b)}><b>${b}</b><small>${d}</small></button>`)}</div>
        <span class="lbl">3. Cor</span>
        ${a.laca?.marca ? html`<div class="swatches">${coresLaca.map(c => html`<button key=${c[1]} class=${'sw' + (a.desc === c[0] + ' (' + c[1] + ')' ? ' on' : '')} onClick=${() => set('desc', c[0] + ' (' + c[1] + ')')}><i style=${{ background: c[2] }}></i><span>${c[0]}<small>${c[1]}</small></span></button>`)}</div>`
          : html`<div class="dim">Escolha a marca acima para ver as cores.</div>`}
        <input class="inp" placeholder="Ou código NCS / RAL / do fabricante" value=${a.desc || ''} onInput=${e => set('desc', e.target.value)} />`}
      ${textoAcab(a) && html`<div class="detectado">✓ ${textoAcab(a)}</div>`}`}
    </div>`;
}

function ListaItens({ titulo, num, itens, onChange, placeholder, catalogo, filtro, sessao, salvarComo, grupos }) {
  const [novo, setNovo] = useState('');
  const add = (v) => { const t = (v ?? novo).trim(); if (!t) return; onChange([...(itens || []), t]); setNovo(''); };
  return html`
    <div class="card page-card stack">
      <div class="row" style=${{ justifyContent: 'space-between' }}><div class="sec-title"><span class="num-sec">${num}</span> ${titulo}</div><${Opcoes} grupos=${grupos} onPick=${v => add(v)} rotulo="Catálogo" /></div>
      <div class="row" style=${{ flexWrap: 'nowrap' }}>
        <div style=${{ flex: 1 }}><${CatalogoInput} value=${novo} placeholder=${placeholder} catalogo=${catalogo} filtro=${filtro} sessao=${sessao} salvarComo=${salvarComo} onChange=${setNovo} onPick=${it => add([it.fabricante, it.nome].filter(Boolean).join(' '))} className="inp" /></div>
        <button class="btn btn-primary" onClick=${() => add()}>Adicionar</button>
      </div>
      ${(itens || []).map((t, i) => html`<div key=${i} class="item-lista"><span>${t}</span><button class="x-btn" onClick=${() => onChange(itens.filter((_, j) => j !== i))}>🗑</button></div>`)}
    </div>`;
}

function EspecificacoesOS({ P, setP, catalogo, sessao }) {
  const [aba, setAba] = useState('dobradicas');
  const op = O();
  const fMDF = useMemo(() => ({ tipos: ['MDF'] }), []);
  const fPux = useMemo(() => ({ tipos: ['Puxador'] }), []);
  const acab = (lado) => P.acab?.[lado] || {};
  const setAcab = (lado) => (k, v) => setP(p => { p.acab = p.acab || {}; p.acab[lado] = { ...(p.acab[lado] || {}), [k]: v }; });
  const led = P.led || {};
  const setLed = (k, v) => setP(p => { p.led = { ...(p.led || {}), [k]: v }; });
  const fer = (P.ferragens || {})[aba] || {};
  const abaInfo = FER_ABAS.find(x => x.k === aba);
  // compatibilidade: listas antigas de fechaduras/tecidos
  const fech = P.fech || (P.fechaduras?.length ? { ativo: true, obs: P.fechaduras.join('; ') } : {});
  const setFech = (k, v) => setP(p => { p.fech = { ...(p.fech || fech), [k]: v }; });
  const tec = P.tec || (P.tecidos?.length ? { ativo: true, obs: P.tecidos.join('; ') } : {});
  const setTec = (k, v) => setP(p => { p.tec = { ...(p.tec || tec), [k]: v }; });
  const vid = P.vidros || {};
  const setVid = (k, v) => setP(p => { p.vidros = { ...(p.vidros || {}), [k]: v }; });
  const simNao = (ativo, set, sim, nao) => html`<div class="seg-mini"><button class=${!ativo ? 'on' : ''} onClick=${() => set('ativo', false)}>${nao}</button><button class=${ativo ? 'on' : ''} onClick=${() => set('ativo', true)}>${sim}</button></div>`;

  return html`
    <div class="card page-card stack">
      <div class="sec-title"><span class="num-sec">1</span> Acabamentos & materiais</div>
      <div class="dim" style=${{ marginTop: '-6px' }}>Padrão geral da OS. Cada móvel pode seguir este padrão ou ter o seu próprio (item 11).</div>
      <div class="grid2" style=${{ alignItems: 'start' }}>
        <${AcabBox} lado="interno" a=${acab('interno')} set=${setAcab('interno')} catalogo=${catalogo} sessao=${sessao} />
        <${AcabBox} lado="externo" a=${acab('externo')} set=${setAcab('externo')} catalogo=${catalogo} sessao=${sessao} />
      </div>
      <div class="field"><span class="lbl">Outras características da especificação</span><input class="inp" placeholder="Ex: fita de borda ABS 1mm colada com PUR nas áreas molhadas" value=${P.outras || ''} onInput=${e => setP(p => { p.outras = e.target.value; })} /></div>
    </div>

    <div class="card page-card stack">
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div class="sec-title"><span class="num-sec">2</span> Portas (modelo, usinagem & estilo)</div>
        ${P.portas?.modelo && html`<span class="chip chip-accent">✓ ${P.portas.modelo}</span>`}
      </div>
      <${CampoOpc} lbl="Modelo / tipo de porta" value=${P.portas?.modelo} grupos=${op.PORTAS} ph="Ex: Ripada 15+15, porta lisa 18mm…" onChange=${v => setP(p => { p.portas = { ...(p.portas || {}), modelo: v }; })} />
      <span class="lbl">Modelos rápidos (1 clique)</span>
      <div class="opcoes4">
        ${(op.PORTAS?.[0]?.itens || []).slice(0, 8).map(i => html`<button key=${i.n} class=${'opc' + (P.portas?.modelo === i.n ? ' on' : '')} onClick=${() => setP(p => { p.portas = { ...(p.portas || {}), modelo: i.n }; })}><b>${i.n}</b><small>${i.b}</small></button>`)}
      </div>
      <textarea class="inp" rows="2" placeholder="Usinagem / detalhes das portas (ex: cava J invertida com perfil preto oculto)" value=${P.portas?.obs || ''} onInput=${e => setP(p => { p.portas = { ...(p.portas || {}), obs: e.target.value }; })}></textarea>
    </div>

    <div class="grid2" style=${{ alignItems: 'start' }}>
      <${ListaItens} num="3" titulo="Lâminas utilizadas" itens=${P.laminas} onChange=${v => setP(p => { p.laminas = v; })} placeholder="Ex: Lâmina natural carvalho americano" catalogo=${catalogo} filtro=${fMDF} sessao=${sessao}
        grupos=${[{ grupo: 'Lâminas de mercado', itens: (op.LAMINAS || []).map(l => ({ n: l[0] + ' (' + l[1] + ')', b: l[5], d: (op.LAMINA_TONS || {})[l[2]] + ' · ' + l[3] })) }]} />
      <${ListaItens} num="4" titulo="Perfis & cavas" itens=${P.perfis} onChange=${v => setP(p => { p.perfis = v; })} placeholder="Ex: Perfil gola alumínio champagne" catalogo=${catalogo} filtro=${fPux} sessao=${sessao} salvarComo=${() => ({ tipo: 'Puxador' })}
        grupos=${[op.PUXADOR?.[0]].filter(Boolean)} />
    </div>
    <${ListaItens} num="5" titulo="Puxadores" itens=${P.puxadores} onChange=${v => setP(p => { p.puxadores = v; })} placeholder="Buscar puxador: gola preto, cava…" catalogo=${catalogo} filtro=${fPux} sessao=${sessao} salvarComo=${() => ({ tipo: 'Puxador' })} grupos=${op.PUXADOR} />

    <div class="card page-card stack">
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div class="sec-title"><span class="num-sec">6</span> Iluminação LED</div>
        ${simNao(!!led.ativo, setLed, 'Sim, possui LED', 'Sem LED')}
      </div>
      ${led.ativo && html`
        <span class="lbl">Temperatura de cor</span>
        <div class="opcoes4">${(op.LED_TEMP || []).map(([k, t, d]) => html`<button key=${k} class=${'opc' + ((led.temp || '').startsWith(k) ? ' on' : '')} onClick=${() => setLed('temp', k + ' (' + t.toLowerCase() + ')')}><b>${k}</b><small>${t} — ${d}</small></button>`)}</div>
        <div class="grid2">
          <${CampoOpc} lbl="Tipo de fita LED" value=${led.fita} grupos=${op.LED_FITA} ph="Ex: Fita COB contínua 2700K" onChange=${v => setLed('fita', v)} />
          <${CampoOpc} lbl="Perfil & difusor" value=${led.perfil} grupos=${op.LED_PERFIL} ph="Ex: Perfil embutir slim leitoso" onChange=${v => setLed('perfil', v)} />
          <${CampoOpc} lbl="Fonte & acionamento" value=${led.fonte} grupos=${op.LED_FONTE} somar ph="Ex: Fonte slim 12V + sensor touch" onChange=${v => setLed('fonte', v)} />
          <${CampoOpc} lbl="Locais de instalação" value=${led.locais} grupos=${op.LED_LOCAL} somar ph="Ex: sob aéreos e nichos" onChange=${v => setLed('locais', v)} />
        </div>`}
    </div>

    <div class="card page-card stack">
      <div class="sec-title"><span class="num-sec">7</span> Ferragens & sistemas de portas de correr</div>
      <div class="dim" style=${{ marginTop: '-6px' }}>Escreva livre em qualquer campo ou use ☰ Opções com marcas e modelos consagrados.</div>
      <div class="abas-linha">${FER_ABAS.map(x => html`<button key=${x.k} class=${aba === x.k ? 'on' : ''} onClick=${() => setAba(x.k)}>${x.t}${Object.values((P.ferragens || {})[x.k] || {}).some(Boolean) ? ' ✓' : ''}</button>`)}</div>
      <div class="dica">✨ <b>${abaInfo.t}:</b> ${abaInfo.dica}.</div>
      <div class="grid2">
        ${abaInfo.campos.map(([k, lbl, ph]) => html`
          <${CampoOpc} key=${aba + k} lbl=${lbl} ph=${ph} value=${fer[k]} grupos=${(op[abaInfo.op] || {})[k]}
            onChange=${v => setP(p => { p.ferragens = p.ferragens || {}; p.ferragens[aba] = { ...(p.ferragens[aba] || {}), [k]: v }; })} />`)}
      </div>
    </div>

    <div class="card page-card stack">
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div class="sec-title"><span class="num-sec">8</span> Fechaduras & travamentos</div>
        ${simNao(!!fech.ativo, setFech, 'Sim, possui trava', 'Sem fechadura')}
      </div>
      ${fech.ativo && html`
        <span class="lbl">Onde se coloca a fechadura</span>
        <div class="opcoes4">${(op.FECH_ONDE || []).map(([k, t, d]) => html`<button key=${k} class=${'opc' + (fech.onde === k ? ' on' : '')} onClick=${() => setFech('onde', k)}><b>${t}</b><small>${d}</small></button>`)}</div>
        <span class="lbl">Modelo da fechadura / mecanismo de tranca</span>
        <div class="opcoes4">${(op.FECH_MODELOS || []).map(([n, b, d]) => html`<button key=${n} class=${'opc' + (fech.modelo === n ? ' on' : '')} onClick=${() => setFech('modelo', n)}><b>${b}</b><small>${d}</small></button>`)}</div>
        <input class="inp" placeholder="Ou digite o modelo" value=${fech.modelo || ''} onInput=${e => setFech('modelo', e.target.value)} />
        <div class="grid2">
          <div class="field"><span class="lbl">Marca / fabricante</span><div class="row" style=${{ gap: '5px' }}>${(op.FECH_MARCAS || []).map(m => html`<button key=${m} class=${'pill' + (fech.marca === m ? ' on' : '')} onClick=${() => setFech('marca', m)}>${m}</button>`)}</div>
            <input class="inp inp-sm" placeholder="Outra marca" value=${fech.marca || ''} onInput=${e => setFech('marca', e.target.value)} /></div>
          <div class="field"><span class="lbl">Cor / acabamento</span><div class="row" style=${{ gap: '5px' }}>${(op.FECH_ACAB || []).map(m => html`<button key=${m} class=${'pill' + (fech.acab === m ? ' on' : '')} onClick=${() => setFech('acab', m)}>${m}</button>`)}</div></div>
          <div class="field"><span class="lbl">Quantidade / onde instalar</span><input class="inp" placeholder="Ex: 2 un. portas externas / 1 gaveteiro" value=${fech.qtd || ''} onInput=${e => setFech('qtd', e.target.value)} /></div>
          <div class="field"><span class="lbl">Observações de furação & cilindro</span><input class="inp" placeholder="Ex: segredo igual (chave mestra), cilindro 30mm" value=${fech.obs || ''} onInput=${e => setFech('obs', e.target.value)} /></div>
        </div>`}
    </div>

    <div class="card page-card stack">
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div class="sec-title"><span class="num-sec">9</span> Vidros & espelhos</div>
        ${simNao(!!vid.ativo, setVid, 'Sim, possui vidro', 'Sem vidro')}
      </div>
      ${vid.ativo && html`
        <span class="lbl">Tipo de vidro / espelho</span>
        <div class="opcoes4">${(op.VIDROS || []).map(([n, b, d]) => html`<button key=${n} class=${'opc' + (vid.tipo === n ? ' on' : '')} onClick=${() => setVid('tipo', n)}><b>${n}</b><small>${b} — ${d}</small></button>`)}</div>
        <div class="row" style=${{ gap: '5px' }}><span class="dim">Espessura:</span>${(op.VIDRO_ESP || []).map(x => html`<button key=${x} class=${'pill' + (vid.esp === x ? ' on' : '')} onClick=${() => setVid('esp', x)}>${x}</button>`)}</div>
        <div class="row" style=${{ gap: '5px' }}><span class="dim">Processo:</span>${(op.VIDRO_PROC || []).map(x => { const on = (vid.proc || []).includes(x); return html`<button key=${x} class=${'pill' + (on ? ' on' : '')} onClick=${() => setVid('proc', on ? vid.proc.filter(y => y !== x) : [...(vid.proc || []), x])}>${x}</button>`; })}</div>
        <div class="grid2">
          <${CampoOpc} lbl="Perfil / fixação" value=${vid.perfil} grupos=${op.VIDRO_PERFIL} ph="Ex: perfil slim preto fosco" onChange=${v => setVid('perfil', v)} />
          <div class="field"><span class="lbl">Onde aplica</span><input class="inp" placeholder="Ex: portas da cristaleira e prateleiras" value=${vid.aplic || ''} onInput=${e => setVid('aplic', e.target.value)} /></div>
        </div>
        <input class="inp" placeholder="Observações (fornecedor, medidas, furação)" value=${vid.obs || ''} onInput=${e => setVid('obs', e.target.value)} />`}
    </div>

    <div class="card page-card stack">
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div class="sec-title"><span class="num-sec">10</span> Tecidos & tapeçaria / estofamento</div>
        ${simNao(!!tec.ativo, setTec, 'Sim, possui estofado', 'Sem estofado')}
      </div>
      ${tec.ativo && html`
        <span class="lbl">Tipo de tecido</span>
        <div class="opcoes4">${(op.TECIDOS || []).map(([n, b, d]) => html`<button key=${n} class=${'opc' + (tec.tipo === n ? ' on' : '')} onClick=${() => setTec('tipo', n)}><b>${n}</b><small>${b} — ${d}</small></button>`)}</div>
        <span class="lbl">Responsabilidade pelo tecido</span>
        <div class="opcoes4">${(op.TEC_RESP || []).map(([k, t, d]) => html`<button key=${k} class=${'opc' + (tec.resp === k ? ' on' : '')} onClick=${() => setTec('resp', k)}><b>${t}</b><small>${d}</small></button>`)}</div>
        <div class="grid2">
          <div class="field"><span class="lbl">Referência / cor</span><input class="inp" placeholder="Ex: Linho LN-304 Areia" value=${tec.ref || ''} onInput=${e => setTec('ref', e.target.value)} /></div>
          <div class="field"><span class="lbl">Aplicação</span><select class="inp" value=${tec.aplic || ''} onChange=${e => setTec('aplic', e.target.value)}><option value="">Escolha…</option>${(op.TEC_APLIC || []).map(x => html`<option key=${x}>${x}</option>`)}</select></div>
          <div class="field"><span class="lbl">Espuma</span><select class="inp" value=${tec.espuma || ''} onChange=${e => setTec('espuma', e.target.value)}><option value="">Escolha…</option>${(op.ESPUMAS || []).map(x => html`<option key=${x}>${x}</option>`)}</select></div>
          <div class="field"><span class="lbl">Observações de estofamento</span><input class="inp" placeholder="Ex: gomos verticais de 20cm" value=${tec.obs || ''} onInput=${e => setTec('obs', e.target.value)} /></div>
        </div>`}
    </div>`;
}

/* ---------- Etapa 3: execução ---------- */
const ETAPAS_FAB = [
  ['corte', 'Corte & usinagem', 'Corte reto, furações de cavilha/minifix e rebaixos'],
  ['fita', 'Fita de borda', 'Colagem de fitas de PVC/ABS nos topos das peças'],
  ['cavas', 'Cavas & puxadores', 'Perfis gola, cavas 45° ou usinagem no MDF'],
  ['pintura', 'Pintura & laca', 'Fundo primer, laca fosca, acetinada ou brilho'],
  ['tapecaria', 'Tapeçaria', 'Cabeceiras almofadadas, assentos ou painéis'],
  ['montagem', 'Montagem final', 'Pré-montagem na fábrica e instalação no cliente'],
];
const ST_FAB = { pendente: 'Pendente', andamento: 'Em andamento', pronto: 'Pronto' };

function ExecucaoOS({ os, alterar, sessao, toast }) {
  const [reabrir, setReabrir] = useState(null);
  const ex = os.execucao || {};
  const et = (k) => ex.etapas?.[k] || { onde: os.modoExecucao === 'terceirizada' ? 'terceirizada' : 'interna', status: 'pendente' };
  const setEt = (k, patch) => alterar(o => { o.execucao = o.execucao || {}; o.execucao.etapas = o.execucao.etapas || {}; o.execucao.etapas[k] = { ...et(k), ...(o.execucao.etapas[k] || {}), ...patch }; });
  const concluir = (i) => {
    const k = ETAPAS_FAB[i][0];
    alterar(o => {
      o.execucao = o.execucao || {}; o.execucao.etapas = o.execucao.etapas || {};
      o.execucao.etapas[k] = { ...et(k), ...(o.execucao.etapas[k] || {}), status: 'pronto', concluidaEm: nowIso() };
      const prox = ETAPAS_FAB[i + 1]?.[0];
      if (prox) o.execucao.etapas[prox] = { ...et(prox), ...(o.execucao.etapas[prox] || {}), status: 'andamento' };
      if (o.status === 'elaboracao' || o.status === 'projetos') o.status = 'producao';
      if (prox === 'montagem' && (o.status === 'producao' || o.status === 'projetos' || o.status === 'elaboracao')) o.status = 'liberacao';
      if (!prox) o.status = 'concluida';
    });
  };
  const setModo = (m) => alterar(o => {
    o.modoExecucao = m;
    if (m !== 'mista') { o.execucao = o.execucao || {}; o.execucao.etapas = o.execucao.etapas || {}; ETAPAS_FAB.forEach(([k]) => { o.execucao.etapas[k] = { ...et(k), ...(o.execucao.etapas[k] || {}), onde: m }; }); }
  });
  const nInt = ETAPAS_FAB.filter(([k]) => et(k).onde === 'interna').length;
  const par = ex.parceiro || {};
  const setPar = (k, v) => alterar(o => { o.execucao = o.execucao || {}; o.execucao.parceiro = { ...(o.execucao.parceiro || {}), [k]: v }; });
  const MODOS = [['interna', 'Execução 100% interna', 'Toda a produção na marcenaria própria: corte, fita, usinagem, acabamento e montagem.', 'Controle total de prazos'], ['terceirizada', 'Execução 100% terceirizada', 'Produção entregue pronta por parceiro externo (central de corte, nesting ou prestador).', 'Escalabilidade alta'], ['mista', 'Execução mista / híbrida', 'Por etapa: ex. corte na central parceira, fita, laca e montagem internas.', 'Flexibilidade ideal']];

  return html`
    <div class="card page-card stack" style=${{ display: 'none' }}>
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div><span class="chip chip-accent">AUTOMAÇÃO DA OFICINA</span> <b>Esteira de produção</b><div class="dim">Ao concluir uma etapa, a próxima começa sozinha e o status da OS acompanha.</div></div>
        ${ETAPAS_FAB.every(([k]) => et(k).status === 'pendente') && html`<button class="btn btn-primary" onClick=${() => setEt('corte', { status: 'andamento' })}>▶ Iniciar produção</button>`}
      </div>
      <div class="esteira">
        ${ETAPAS_FAB.map(([k, t], i) => { const e = et(k); return html`
          <div key=${k} class=${'est-card ' + e.status}>
            <div class="row" style=${{ justifyContent: 'space-between' }}><small class="mono">0${i + 1}</small><small class="est-st">${ST_FAB[e.status]}</small></div>
            <b>${t}</b><small class="dim">${e.onde === 'terceirizada' ? 'Terceirizada' : 'Interna'}</small>
            ${e.status === 'pronto' ? html`<button class="btn btn-sm" onClick=${() => setReabrir(k)}>↺ Reabrir</button>`
              : e.status === 'andamento' ? html`<button class="btn btn-sm btn-primary" onClick=${() => concluir(i)}>✓ Concluir</button>`
              : html`<button class="btn btn-sm" onClick=${() => setEt(k, { status: 'andamento' })}>▶ Iniciar</button>`}
          </div>`; })}
      </div>
    </div>

    <div class="card page-card stack">
      <div class="sec-title">1. Seleção do modelo operacional</div>
      <div class="opcoes3">
        ${MODOS.map(([v, t, d, tag]) => html`
          <button key=${v} class=${'opc grande' + ((os.modoExecucao || 'interna') === v ? ' on' : '')} onClick=${() => setModo(v)}>
            ${(os.modoExecucao || 'interna') === v && html`<span class="chip chip-teal" style=${{ alignSelf: 'flex-end' }}>✓ Selecionado</span>`}
            <b>${t}</b><small>${d}</small><small style=${{ color: 'var(--text)', fontWeight: 700, marginTop: '6px' }}>${tag}</small>
          </button>`)}
      </div>
    </div>

    <div class="card page-card stack">
      <div class="row" style=${{ justifyContent: 'space-between' }}>
        <div class="sec-title">2. Etapas de fabricação & controles</div>
        <span class="chip">${nInt} internas • ${6 - nInt} terceirizadas</span>
      </div>
      ${ETAPAS_FAB.map(([k, t, d], i) => { const e = et(k); return html`
        <div key=${k} class="fab-linha">
          <div class="grow"><b>${t}</b> <span class=${'chip ' + (e.status === 'pronto' ? 'chip-ok' : e.status === 'andamento' ? 'chip-accent' : '')}>${ST_FAB[e.status]}</span><div class="dim">${d}</div>
            ${e.onde === 'terceirizada' && html`<div class="grid3" style=${{ marginTop: '6px' }}>
              <input class="inp inp-sm" placeholder="Parceiro / central externa" value=${e.parceiro || ''} onInput=${ev => setEt(k, { parceiro: ev.target.value })} />
              <input class="inp inp-sm" placeholder="Prazo previsto (dd/mm/aaaa)" value=${e.prazo || ''} onInput=${ev => setEt(k, { prazo: ev.target.value })} />
              <input class="inp inp-sm" placeholder="Status no parceiro" value=${e.stParceiro || ''} onInput=${ev => setEt(k, { stParceiro: ev.target.value })} />
            </div>`}
          </div>
          <div class="seg-mini">
            <button class=${e.onde === 'interna' ? 'on' : ''} onClick=${() => { setEt(k, { onde: 'interna' }); if (os.modoExecucao !== 'mista') alterar(o => { o.modoExecucao = 'mista'; }); }}>Interna</button>
            <button class=${e.onde === 'terceirizada' ? 'on' : ''} onClick=${() => { setEt(k, { onde: 'terceirizada' }); if (os.modoExecucao !== 'mista') alterar(o => { o.modoExecucao = 'mista'; }); }}>Terceirizada</button>
          </div>
          ${e.status === 'pronto' ? html`<button class="btn btn-sm" onClick=${() => setReabrir(k)}>↺ Reabrir</button>` : html`<button class="btn btn-sm btn-primary" onClick=${() => concluir(i)}>✓ Concluir & avançar</button>`}
        </div>`; })}
    </div>

    <div class="card page-card stack">
      <div class="sec-title">🚚 3. Central parceira & logística externa</div>
      <div class="grid2">
        <div class="field"><span class="lbl">Central / fornecedor parceiro</span><input class="inp" value=${par.nome || ''} onInput=${e => setPar('nome', e.target.value)} /></div>
        <div class="field"><span class="lbl">Contato / WhatsApp</span><input class="inp" value=${par.contato || ''} onInput=${e => setPar('contato', e.target.value)} /></div>
        <div class="field"><span class="lbl">Código do pedido / orçamento</span><input class="inp" value=${par.pedido || ''} onInput=${e => setPar('pedido', e.target.value)} /></div>
        <div class="field"><span class="lbl">Custo estimado do parceiro (R$)</span><input class="inp mono" inputmode="decimal" value=${par.custo || ''} onInput=${e => setPar('custo', e.target.value)} /></div>
      </div>
      <div class="field"><span class="lbl">Observações de produção & arquivos de corte</span><textarea class="inp" rows="2" value=${par.obs || ''} onInput=${e => setPar('obs', e.target.value)}></textarea></div>
      ${reabrir && html`<${SenhaMotivo} titulo=${'Reabrir etapa: ' + (ETAPAS_FAB.find(e => e[0] === reabrir) || [])[1]} texto="Esta etapa já foi concluída. Para reabrir, informe o motivo e a senha." botao="Reabrir etapa"
        onOk=${async (motivo) => { alterar(o => { o.reaberturas = [...(o.reaberturas || []), { oque: 'Etapa ' + (ETAPAS_FAB.find(e => e[0] === reabrir) || [])[1] + ' reaberta', motivo, quem: sessao?.nome || '', quando: nowIso() }]; o.execucao.etapas[reabrir] = { ...(o.execucao.etapas[reabrir] || {}), status: 'andamento' }; }); toast && toast('Etapa reaberta.', 'ok'); }} fechar=${() => setReabrir(null)} />`}
    </div>`;
}

function AmbienteOS({ amb, ai, alterar, catalogo, sessao }) {
  const [fechado, setFechado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const up = (fn) => alterar(o => fn(o.ambientes[ai]));
  return html`
    <div class="amb">
      <div class="amb-head">
        <button class="x-btn" style=${{ fontSize: '16px' }} onClick=${() => setFechado(v => !v)} title=${fechado ? 'Abrir' : 'Recolher'}>${fechado ? '▸' : '▾'}</button>
        <input class="inp" style=${{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px', background: 'transparent', border: 'none', padding: '4px' }} value=${amb.nome} placeholder="Nome do ambiente" onInput=${e => up(a => { a.nome = e.target.value; })} />
        <span class="chip">${(amb.moveis || []).length} móveis</span>
        ${confirmar
          ? html`<button class="btn btn-sm btn-danger" onClick=${() => alterar(o => { o.ambientes.splice(ai, 1); })}>Apagar</button><button class="btn btn-sm" onClick=${() => setConfirmar(false)}>Não</button>`
          : html`<button class="x-btn" title="Apagar ambiente" onClick=${() => setConfirmar(true)}>🗑</button>`}
      </div>
      ${!fechado && html`
        <div class="amb-body">
          ${(amb.moveis || []).map((m, mi) => html`<${MovelOS} key=${m.id || mi} m=${m} upMovel=${(fn) => up(a => fn(a.moveis[mi]))} remover=${() => up(a => { a.moveis.splice(mi, 1); })} duplicar=${() => up(a => { const c = clone(a.moveis[mi]); c.id = rand(8); c.nome += ' (cópia)'; a.moveis.splice(mi + 1, 0, c); })} catalogo=${catalogo} sessao=${sessao} />`)}
          <button class="btn btn-sm" onClick=${() => up(a => { a.moveis = a.moveis || []; a.moveis.push(novoMovel('Novo móvel')); })}>+ Adicionar móvel</button>
        </div>`}
    </div>`;
}

function MDFCampos({ label, valor, onChange, catalogo, sessao, rev }) {
  const v = valor || {};
  const filtro = useMemo(() => ({ tipos: ['MDF'], fabricante: v.fabricante }), [v.fabricante]);
  return html`
    <div class="field">
      <span class="lbl">${label}</span>
      <div style=${{ display: 'grid', gridTemplateColumns: 'minmax(90px, 0.8fr) 1.6fr 70px', gap: '6px' }}>
        <input class="inp inp-sm" list="lista-fab-mdf" placeholder="Fabricante" value=${v.fabricante || ''} onInput=${e => onChange({ ...v, fabricante: e.target.value })} />
        <${CatalogoInput} value=${v.cor || ''} placeholder="Cor / padrão" catalogo=${catalogo} filtro=${filtro} sessao=${sessao} review=${rev}
          onChange=${cor => onChange({ ...v, cor })} onPick=${it => onChange({ ...v, cor: it.nome, fabricante: it.fabricante })}
          salvarComo=${() => ({ tipo: 'MDF', fabricante: v.fabricante || '', linha: '' })} />
        <select class="inp inp-sm" value=${v.espessura || ''} onChange=${e => onChange({ ...v, espessura: e.target.value })} title="Espessura (mm)">
          <option value="">mm</option>
          ${ESPESSURAS.map(x => html`<option key=${x} value=${x}>${x} mm</option>`)}
        </select>
      </div>
    </div>`;
}

function MovelOS({ m, upMovel, remover, duplicar, catalogo, sessao }) {
  const [confirmar, setConfirmar] = useState(false);
  const rev = new Set((m.revisar || []).map(norm));
  const r = (k) => [...rev].some(x => x.includes(norm(k)));
  const campo = (k) => (e) => upMovel(x => { x[k] = e.target.value; x.revisar = (x.revisar || []).filter(z => !norm(z).includes(norm(k))); });
  const fPux = useMemo(() => ({ tipos: ['Puxador'] }), []);
  const fLed = useMemo(() => ({ tipos: ['Iluminação', 'Vidro'] }), []);
  const fFita = useMemo(() => ({ tipos: ['MDF'] }), []);

  return html`
    <div class=${'movel-card' + ((m.revisar || []).length ? ' revisar' : '')}>
      <div class="movel-top">
        <input class="inp" value=${m.nome} placeholder="Nome do móvel" onInput=${campo('nome')} />
        <input class="inp inp-sm" style=${{ width: '64px' }} type="number" min="1" value=${m.quantidade} title="Quantidade" onInput=${e => upMovel(x => { x.quantidade = Number(e.target.value) || 1; })} />
        <button class="btn btn-sm btn-ghost" onClick=${duplicar} title="Duplicar">⧉</button>
        ${confirmar
          ? html`<button class="btn btn-sm btn-danger" onClick=${remover}>Apagar</button>`
          : html`<button class="x-btn" onClick=${() => setConfirmar(true)} title="Apagar móvel">🗑</button>`}
      </div>
      ${(m.revisar || []).length > 0 && html`<div class="warn-box" style=${{ padding: '6px 10px', fontSize: '13px' }}>Revisar: ${m.revisar.join(', ')}</div>`}
      <div class="grid3">
        ${['largura', 'altura', 'profundidade'].map(k => html`
          <div class="field" key=${k}><span class="lbl">${k} (mm)</span><input class=${'inp inp-sm mono' + (r(k) ? ' need-review' : '')} inputmode="numeric" value=${m[k]} onInput=${campo(k)} /></div>`)}
      </div>
      <div class="grid2">
        <${MDFCampos} label="MDF da caixa" valor=${m.mdfCaixa} catalogo=${catalogo} sessao=${sessao} rev=${r('mdfCaixa') || r('caixa')} onChange=${v => upMovel(x => { x.mdfCaixa = v; })} />
        <${MDFCampos} label="MDF da frente" valor=${m.mdfFrente} catalogo=${catalogo} sessao=${sessao} rev=${r('mdfFrente') || r('frente')} onChange=${v => upMovel(x => { x.mdfFrente = v; })} />
      </div>
      <div class="grid3">
        <div class="field"><span class="lbl">Fita de borda</span>
          <${CatalogoInput} value=${m.fitaBorda} placeholder="Ex: Branco Diamante 22x1mm" catalogo=${catalogo} filtro=${fFita} review=${r('fita')} onChange=${v => upMovel(x => { x.fitaBorda = v; })} />
        </div>
        <div class="field"><span class="lbl">Portas</span><input class="inp inp-sm" value=${m.portas} placeholder="Ex: 2 de giro, caneco 35" onInput=${campo('portas')} /></div>
        <div class="field"><span class="lbl">Gavetas</span><input class="inp inp-sm" value=${m.gavetas} placeholder="Ex: 3 gavetas, MDF 15" onInput=${campo('gavetas')} /></div>
      </div>
      <div class="field">
        <span class="lbl">Ferragens</span>
        <div class="stack" style=${{ gap: '6px' }}>
          ${(m.ferragens || []).map((f, fi) => html`<${FerragemLinha} key=${f.id || fi} f=${f} catalogo=${catalogo} sessao=${sessao}
              up=${(fn) => upMovel(x => fn(x.ferragens[fi]))} remover=${() => upMovel(x => { x.ferragens.splice(fi, 1); })} />`)}
          <div><button class="btn btn-sm" onClick=${() => upMovel(x => { x.ferragens = x.ferragens || []; x.ferragens.push({ id: rand(6), tipo: '', fabricante: '', modelo: '', quantidade: '' }); })}>+ Ferragem</button></div>
        </div>
      </div>
      <div class="grid2">
        <div class="field"><span class="lbl">Puxador</span>
          <${CatalogoInput} value=${m.puxador} placeholder="Buscar puxador…" catalogo=${catalogo} filtro=${fPux} sessao=${sessao} review=${r('puxador')}
            salvarComo=${() => ({ tipo: 'Puxador', fabricante: '', linha: '' })} onChange=${v => upMovel(x => { x.puxador = v; })} />
        </div>
        <div class="field"><span class="lbl">Iluminação / vidros</span>
          <${CatalogoInput} value=${m.iluminacao} placeholder="LED, vidro, espelho…" catalogo=${catalogo} filtro=${fLed} sessao=${sessao}
            salvarComo=${() => ({ tipo: 'Iluminação', fabricante: '', linha: '' })} onChange=${v => upMovel(x => { x.iluminacao = v; })} />
        </div>
      </div>
      <div class="field"><span class="lbl">Observações</span><textarea class="inp inp-sm" rows="2" style=${{ minHeight: '52px' }} value=${m.observacoes} onInput=${campo('observacoes')}></textarea></div>
    </div>`;
}

function FerragemLinha({ f, catalogo, sessao, up, remover }) {
  const filtro = useMemo(() => ({ tipos: ['Ferragem', 'Acessório'], linha: f.tipo, fabricante: f.fabricante }), [f.tipo, f.fabricante]);
  return html`
    <div class="ferr-row">
      <select class="inp inp-sm" value=${f.tipo} onChange=${e => up(x => { x.tipo = e.target.value; })}>
        <option value="">Tipo…</option>
        ${[...new Set([...TIPOS_FERRAGEM, f.tipo].filter(Boolean))].map(t => html`<option key=${t} value=${t}>${t}</option>`)}
      </select>
      <${CatalogoInput} value=${[f.fabricante, f.modelo].filter(Boolean).join(' · ')} placeholder="Buscar: blum tandem, hettich sensys…" catalogo=${catalogo} filtro=${filtro} sessao=${sessao}
        onChange=${v => up(x => { const p = v.split(' · '); if (p.length > 1) { x.fabricante = p[0]; x.modelo = p.slice(1).join(' · '); } else { x.modelo = v; } })}
        onPick=${it => up(x => { x.fabricante = it.fabricante; x.modelo = it.nome; if (!x.tipo) x.tipo = it.linha; })}
        salvarComo=${() => ({ tipo: 'Ferragem', fabricante: f.fabricante || '', linha: f.tipo || '' })} />
      <input class="inp inp-sm mono" placeholder="Qtd" value=${f.quantidade} onInput=${e => up(x => { x.quantidade = e.target.value; })} />
      <button class="x-btn" onClick=${remover} title="Remover">✕</button>
    </div>`;
}

function ImpressaoOS({ os, empresa }) {
  const cor = temCores(os) ? os.cores : ['#1F2937', '#C8A27A', '#B45309'];
  const P = os.padrao || {};
  const F = P.ferragens || {};
  const fl = (k) => Object.values(F[k] || {}).filter(Boolean).join(' · ');
  const mdf = (x) => [x?.fabricante, x?.cor, x?.espessura ? x.espessura + ' mm' : ''].filter(Boolean).join(' · ');
  const st = (STATUS_OS.find(s => s.v === os.status) || STATUS_OS[0]).t.replace(/^\d\. /, '');
  const tamp = os.tamponamento?.tipo && os.tamponamento.tipo !== 'sem' ? (os.tamponamento.tipo === 'aparente' ? 'Aparente' : 'Não aparente') + (os.tamponamento.espessura ? ' · ' + os.tamponamento.espessura : '') : 'Sem tamponamento';
  const info = [
    ['Cliente', os.cliente?.nome], ['Telefone', os.cliente?.telefone], ['Obra', os.cliente?.obra], ['Prazo de entrega', os.prazoEntrega],
    ['Endereço', os.cliente?.endereco, 2], ['Arquiteto / designer', os.arquiteto], ['Responsável', os.responsavel],
    ['Tamponamento', tamp], ['Execução', ({ interna: 'Interna', terceirizada: 'Terceirizada', mista: 'Mista' })[os.modoExecucao || 'interna']],
  ];
  const grupos = [
    ['Acabamentos', [['Interno', textoAcab(P.acab?.interno)], ['Externo', textoAcab(P.acab?.externo)], ['Outras', P.outras]]],
    ['Portas & frentes', [['Modelo', P.portas?.modelo], ['Usinagem', P.portas?.obs], ['Lâminas', (P.laminas || []).join('; ')], ['Perfis', (P.perfis || []).join('; ')]]],
    ['Puxadores & iluminação', [['Puxadores', (P.puxadores || []).join('; ')], ['LED', P.led?.ativo ? [P.led.fita, P.led.temp, P.led.perfil, P.led.fonte, P.led.locais].filter(Boolean).join(' · ') : '']]],
    ['Ferragens', [['Dobradiças', fl('dobradicas')], ['Corrediças', fl('corredicas')], ['Portas de correr', fl('correr')], ['Portas de passagem', fl('passagem')]]],
    ['Fechaduras, vidros & tecidos', [['Fechaduras', textoFech(P.fech) || (P.fechaduras || []).join('; ')], ['Vidros', textoVidro(P.vidros)], ['Tecidos', textoTec(P.tec) || (P.tecidos || []).join('; ')]]],
    ['Paredes / painéis', [['Parede inteira', P.parede?.ativo ? [P.parede.espec, P.parede.paginacao, P.parede.fixacao].filter(Boolean).join(' — ') : '']]],
  ].map(([t, l]) => [t, l.filter(([, v]) => v)]).filter(([, l]) => l.length);
  const et = os.execucao?.etapas || {};
  const totalMov = (os.ambientes || []).reduce((n, a) => n + (a.moveis || []).length, 0);
  return html`
    <div class="po" style=${varsCores(cor)}>
      <div class="po-topo">
        <div class="row" style=${{ gap: '12px', flexWrap: 'nowrap', alignItems: 'center' }}><${LogoImp} empresa=${empresa} /><div>
          <div class="po-emp">${empresa || 'Gestão Pró'}</div>
          <div class="po-tit">Ordem de Serviço</div>
          <div class="po-sub">${(os.ambientes || []).map(a => a.nome).filter(Boolean).join(' · ') || os.ambienteResumo || ''}</div>
        </div></div>
        <div class="po-num">
          <div class="po-cod">${numOS(os)}</div>
          <div class="po-dots">${cor.map((c, i) => html`<i key=${i} style=${{ background: c }}></i>`)}</div>
          <div class="po-meta">${st} · emitida ${new Date().toLocaleDateString('pt-BR')}${os.numeroAntigo ? ' · antiga ' + os.numeroAntigo : ''}</div>
        </div>
      </div>

      <div class="po-info">
        ${info.map(([k, v, span]) => html`<div key=${k} class="po-cel" style=${span ? { gridColumn: 'span ' + span } : undefined}><small>${k}</small><b>${v || '—'}</b></div>`)}
      </div>

      ${grupos.length > 0 && html`
        <div class="po-sec"><span>01</span> Especificações gerais</div>
        <div class="po-grid">
          ${grupos.map(([t, l]) => html`<div key=${t} class="po-card"><div class="po-card-t">${t}</div>${l.map(([k, v]) => html`<div key=${k} class="po-kv"><small>${k}</small><div>${v}</div></div>`)}</div>`)}
        </div>`}

      <div class="po-sec"><span>${grupos.length ? '02' : '01'}</span> Ambientes & móveis <em>${(os.ambientes || []).length} ambientes · ${totalMov} móveis</em></div>
      ${(os.ambientes || []).map((a, ai) => html`
        <div key=${a.id || ai} class="po-amb">
          <div class="po-amb-t"><span>${String(ai + 1).padStart(2, '0')}</span>${a.nome || 'Ambiente'}</div>
          <table>
            <thead><tr><th style=${{ width: '24%' }}>Móvel</th><th>Qtd</th><th>L × A × P (mm)</th><th>MDF caixa</th><th>MDF frente</th><th>Fita</th><th>Ferragens</th><th>Puxador / outros</th></tr></thead>
            <tbody>
              ${(a.moveis || []).map(m => html`<tr key=${m.id}>
                <td><b>${m.nome}</b>${m.portas ? html`<br/><small>Portas: ${m.portas}</small>` : ''}${m.gavetas ? html`<br/><small>Gavetas: ${m.gavetas}</small>` : ''}${m.observacoes ? html`<br/><i>${m.observacoes}</i>` : ''}</td>
                <td class="c">${m.quantidade}</td>
                <td class="c mono">${[m.largura, m.altura, m.profundidade].map(x => x || '—').join(' × ')}</td>
                <td>${mdf(m.mdfCaixa)}</td><td>${mdf(m.mdfFrente)}</td><td>${m.fitaBorda}</td>
                <td>${(m.ferragens || []).map(f => html`<div>${f.quantidade ? f.quantidade + '× ' : ''}${[f.tipo, f.fabricante, f.modelo].filter(Boolean).join(' · ')}</div>`)}</td>
                <td>${m.puxador}${m.iluminacao ? html`<br/>${m.iluminacao}` : ''}</td>
              </tr>`)}
              ${!(a.moveis || []).length && html`<tr><td colspan="8" class="c"><i>Sem móveis cadastrados</i></td></tr>`}
            </tbody>
          </table>
        </div>`)}

      ${os.observacoesGerais && html`<div class="po-obs"><b>Observações gerais</b><div>${os.observacoesGerais}</div></div>`}


      <div class="po-ass">
        ${['Responsável técnico', 'Produção', 'Cliente'].map(t => html`<div key=${t}><span></span>${t}</div>`)}
      </div>
      ${(os.alteracoes || []).length > 0 && html`<div class="po-sec"><span>⟳</span> Alterações</div><table><tbody>${os.alteracoes.map(a => html`<tr key=${a.n}><td style=${{ width: '18%' }}>${fmtData(a.quando)}</td><td><b>Nº ${a.n}</b> — ${a.motivo} <small>(${a.itens.length} itens · ${a.quem})</small></td></tr>`)}</tbody></table>`}
      <div class="po-rod"><span>${empresa || ''} · OS ${numOS(os)}${os.atualizadoEm ? ' · última modificação ' + fmtData(os.atualizadoEm) : ''}</span><span>Gerado pelo Gestão Pró</span></div>
    </div>`;
}

/* =========================================================
   Importar OSs antigas
   ========================================================= */
function TelaImportar({ sessao, catalogo, toast, abrirOS }) {
  const [fila, setFila] = useState([]);
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);
  const ocupado = fila.some(f => f.rodando);

  const processar = async (files) => {
    const lista = [...files].map(f => ({ key: rand(6), file: f, nome: f.name, status: 'Na fila', rodando: true }));
    setFila(v => [...lista, ...v]);
    const upd = (key, patch) => setFila(v => v.map(x => x.key === key ? { ...x, ...patch } : x));
    // Um de cada vez, pra não sobrecarregar a IA.
    for (const item of lista) {
      try {
        upd(item.key, { status: 'Lendo arquivo…' });
        const { texto, imagens } = await extrairArquivo(item.file);
        upd(item.key, { status: 'Convertendo para o layout novo…' });
        const res = await chamarIA('importar_os', { texto, temImagens: imagens.length > 0, catalogo: resumoCatalogo(catalogo) }, imagens);
        upd(item.key, { status: 'Conferindo a numeração…' });
        const lista = await numerosUsados(sessao.empresaId);
        const anoAt = String(new Date().getFullYear()).slice(2);
        const cArq = lerCodigo(item.nome), cDoc = lerCodigo(res.numeroAntigo);
        const verArq = { t: '👁 Ver o arquivo enviado', fn: () => window.open(URL.createObjectURL(item.file), '_blank') };
        const digitar = { v: 'digitar', t: '✏️ Digitar outro número' };
        let fixo = cArq || cDoc;
        if (cArq && cDoc && codigoDe(cArq.ano, cArq.numero) !== codigoDe(cDoc.ano, cDoc.numero)) {
          const r = await escolher('Numeração diferente', `O nome do arquivo diz ${codigoDe(cArq.ano, cArq.numero)}, mas dentro da OS está ${codigoDe(cDoc.ano, cDoc.numero)}.\nArquivo: ${item.nome}`,
            [{ v: 'arq', t: 'Usar ' + codigoDe(cArq.ano, cArq.numero) + ' (nome do arquivo)', cls: 'btn-primary' }, { v: 'doc', t: 'Usar ' + codigoDe(cDoc.ano, cDoc.numero) + ' (dentro da OS)' }, digitar, { v: 'pular', t: 'Pular este arquivo' }], [verArq]);
          if (r === 'pular') { upd(item.key, { status: 'Pulado por você.', erro: true, rodando: false }); continue; }
          fixo = r === 'doc' ? cDoc : r === 'digitar' ? lerCodigo(await pedirTexto('Número da OS', 'Ex: 26.089')) : cArq;
          if (!fixo) { upd(item.key, { status: 'Número inválido — pulado.', erro: true, rodando: false }); continue; }
        }
        if (!fixo) {
          const prox = codigoDe(anoAt, proximoLivre(lista, anoAt));
          const r = await escolher('OS sem número', `Não achei o número da OS no arquivo nem dentro dele.\nArquivo: ${item.nome}`,
            [{ v: 'prox', t: 'Usar o próximo número livre: ' + prox, cls: 'btn-primary' }, { v: 'digitar', t: '✏️ Digitar o número' }, { v: 'pular', t: 'Pular este arquivo' }], [verArq]);
          if (r === 'pular') { upd(item.key, { status: 'Pulado por você.', erro: true, rodando: false }); continue; }
          if (r === 'digitar') { fixo = lerCodigo(await pedirTexto('Número da OS', 'Ex: 26.089')); if (!fixo) { upd(item.key, { status: 'Número inválido — pulado.', erro: true, rodando: false }); continue; } }
        }
        if (fixo) {
          const cod = codigoDe(fixo.ano, fixo.numero);
          let ja = lista.find(o => numOS(o) === cod);
          while (ja) {
            const prox = codigoDe(fixo.ano, proximoLivre(lista, fixo.ano));
            const r = await escolher('Número já existe', `A OS ${cod} já existe no app: ${ja.cliente?.nome || ''} — ${(ja.ambientes || []).map(a => a.nome).join(', ') || ja.ambienteResumo || ''}.\nArquivo enviado: ${item.nome} (${res.cliente?.nome || ''})`,
              [{ v: 'subst', t: 'Substituir a existente pela do arquivo', d: 'A antiga vai para o histórico de exclusões (dá para restaurar)', cls: 'btn-danger' },
               { v: 'prox', t: 'Criar com o próximo número livre: ' + prox },
               digitar, { v: 'pular', t: 'Pular este arquivo (manter a existente)' }],
              [verArq, { t: '👁 Ver a OS ' + cod + ' que já existe', fn: () => window.__abrirOS && window.__abrirOS(ja.id) }]);
            if (r === 'pular') { fixo = 'pular'; break; }
            if (r === 'subst') { await excluirOS(sessao, ja, 'Substituída pela importação do arquivo ' + item.nome); break; }
            if (r === 'prox') { fixo = null; break; }
            const novo = lerCodigo(await pedirTexto('Número da OS', 'Ex: 26.089'));
            if (!novo) continue;
            fixo = novo; const c2 = codigoDe(novo.ano, novo.numero); ja = lista.find(o => numOS(o) === c2);
          }
          if (fixo === 'pular') { upd(item.key, { status: 'Pulado — manteve a OS existente.', erro: true, rodando: false }); continue; }
        }
        const { id, numero } = await criarOS(sessao, res, {
          fixo: fixo || undefined,
          origem: 'importada', numeroAntigo: String(res.numeroAntigo || ''), dataAntiga: String(res.dataAntiga || ''), arquivoOrigem: item.nome,
        });
        upd(item.key, { status: `Importada como OS nº ${numOS(numero)}`, ok: true, osId: id, rodando: false });
      } catch (e) {
        upd(item.key, { status: e.message, erro: true, dupId: e.duplicada?.id, rodando: false });
      }
    }
  };

  return html`
    <div class="fade-up">
      <div class="page-head">
        <div><h2>Importar OSs antigas</h2><div class="dim">A IA lê a OS e monta no layout novo, <b>mantendo o número do arquivo</b> (ex: "26.089 Cliente.pdf"). Se o número já existir ou não bater, aparece um aviso para você escolher.</div></div>
      </div>
      <div class=${'drop-zone card' + (over ? ' over' : '')} style=${{ padding: '40px 16px' }}
        onClick=${() => !ocupado && inputRef.current.click()}
        onDragOver=${e => { e.preventDefault(); setOver(true); }} onDragLeave=${() => setOver(false)}
        onDrop=${e => { e.preventDefault(); setOver(false); if (!ocupado) processar(e.dataTransfer.files); }}>
        <div style=${{ fontSize: '34px' }}>🗂️</div>
        <div style=${{ fontWeight: 700, fontSize: '17px' }}>${ocupado ? 'Importando… aguarde terminar' : 'Arraste as OSs antigas aqui ou clique para escolher'}</div>
        <div class="dim">PDF, Word (.docx), Excel ou foto da folha. Pode mandar várias de uma vez.</div>
        <input ref=${inputRef} type="file" multiple hidden accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,image/*" onChange=${e => { processar(e.target.files); e.target.value = ''; }} />
      </div>
      <div class="list" style=${{ marginTop: '14px' }}>
        ${fila.map(f => html`
          <div key=${f.key} class="list-item" style=${{ cursor: f.osId ? 'pointer' : 'default' }} onClick=${() => f.osId && abrirOS(f.osId)}>
            <span style=${{ fontSize: '20px' }}>${f.ok ? '✅' : f.erro ? '⚠️' : '⏳'}</span>
            <div class="grow"><div class="title">${f.nome}</div><div class=${f.erro ? '' : 'dim'} style=${f.erro ? { color: 'var(--danger)', fontSize: '13px' } : null}>${f.status}</div></div>
            ${f.dupId && html`<button class="btn btn-sm" onClick=${e => { e.stopPropagation(); abrirOS(f.dupId); }}>Abrir a existente</button>`}
            ${f.osId && html`<span class="chip chip-accent">Abrir</span>`}
          </div>`)}
      </div>
    </div>`;
}

/* =========================================================
   Catálogo
   ========================================================= */
function TelaCatalogo({ sessao, catalogo, toast }) {
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('MDF');
  const [fab, setFab] = useState('');
  const [novo, setNovo] = useState({ tipo: 'MDF', fabricante: '', linha: '', nome: '' });
  const tipos = useMemo(() => [...new Set(catalogo.map(c => c.tipo))], [catalogo]);
  const fabs = useMemo(() => [...new Set(catalogo.filter(c => !tipo || c.tipo === tipo).map(c => c.fabricante).filter(Boolean))].sort(), [catalogo, tipo]);
  const lista = useMemo(() => {
    const t = norm(busca).split(' ').filter(Boolean);
    return catalogo.filter(c => (!tipo || c.tipo === tipo) && (!fab || c.fabricante === fab) && t.every(x => c._busca.includes(x)));
  }, [catalogo, busca, tipo, fab]);

  const adicionar = async () => {
    if (!novo.nome.trim()) return toast('Digite o nome do item.', 'erro');
    await salvarNoCatalogo(sessao.empresaId, catalogo, novo, sessao.nome);
    toast('Salvo no catálogo.', 'ok');
    setNovo(v => ({ ...v, nome: '' }));
  };
  const remover = async (it) => {
    await F().fsMod.deleteDoc(docRef('empresas', sessao.empresaId, 'catalogo', it.id));
    toast('Removido do catálogo.');
  };

  return html`
    <div class="fade-up">
      <div class="page-head">
        <div><h2>Catálogo</h2><div class="dim">${catalogo.length} itens · base com as linhas atuais de Duratex, Arauco, Guararapes e Berneck, e ferragens Blum, Hettich, Häfele, Grass e FGV. Confira sempre no mostruário do fabricante.</div></div>
      </div>
      <div class="card stack" style=${{ marginBottom: '14px' }}>
        <div class="section-label">Adicionar item</div>
        <div style=${{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <select id="n-tipo" class="inp" value=${novo.tipo} onChange=${e => setNovo(v => ({ ...v, tipo: e.target.value }))}>
            ${[...new Set(['MDF', 'Ferragem', 'Puxador', 'Acessório', 'Iluminação', 'Vidro', ...tipos])].map(t => html`<option key=${t} value=${t}>${t}</option>`)}
          </select>
          <input id="n-fab" class="inp" placeholder="Fabricante" value=${novo.fabricante} onInput=${e => setNovo(v => ({ ...v, fabricante: e.target.value }))} />
          <input id="n-linha" class="inp" placeholder=${novo.tipo === 'Ferragem' ? 'Tipo (ex: Dobradiça)' : 'Linha / coleção'} value=${novo.linha} onInput=${e => setNovo(v => ({ ...v, linha: e.target.value }))} />
          <input id="n-nome" class="inp" placeholder="Nome / cor / modelo" value=${novo.nome} onInput=${e => setNovo(v => ({ ...v, nome: e.target.value }))} onKeyDown=${e => e.key === 'Enter' && adicionar()} />
          <button class="btn btn-primary" onClick=${adicionar}>Salvar</button>
        </div>
      </div>
      <div class="row" style=${{ marginBottom: '12px' }}>
        <input id="cat-busca" class="inp" style=${{ flex: '2 1 220px' }} placeholder="Buscar (ex: branco, blum tandem, gola preto)…" value=${busca} onInput=${e => setBusca(e.target.value)} />
        <select id="cat-tipo" class="inp" style=${{ flex: '1 1 140px' }} value=${tipo} onChange=${e => { setTipo(e.target.value); setFab(''); }}>
          <option value="">Todos os tipos</option>
          ${tipos.map(t => html`<option key=${t} value=${t}>${t}</option>`)}
        </select>
        <select id="cat-fab" class="inp" style=${{ flex: '1 1 140px' }} value=${fab} onChange=${e => setFab(e.target.value)}>
          <option value="">Todos os fabricantes</option>
          ${fabs.map(t => html`<option key=${t} value=${t}>${t}</option>`)}
        </select>
      </div>
      <div class="table-wrap" style=${{ maxHeight: '60vh', overflowY: 'auto' }}>
        <table class="tbl">
          <thead><tr><th>Nome</th><th>Fabricante</th><th>Linha / tipo</th><th>Categoria</th><th></th></tr></thead>
          <tbody>
            ${lista.slice(0, 400).map(it => html`<tr key=${it.id}>
              <td><b>${it.nome}</b></td><td>${it.fabricante}</td><td>${it.linha}</td>
              <td>${it.tipo}${it.daEmpresa ? html` <span class="chip chip-teal">da empresa</span>` : ''}</td>
              <td>${it.daEmpresa && html`<button class="x-btn" title="Remover" onClick=${() => remover(it)}>✕</button>`}</td>
            </tr>`)}
          </tbody>
        </table>
      </div>
      ${lista.length > 400 && html`<div class="dim" style=${{ marginTop: '6px' }}>Mostrando 400 de ${lista.length}. Refine a busca.</div>`}
    </div>`;
}

/* =========================================================
   Equipe (administrador)
   ========================================================= */
function TelaEquipe({ sessao, toast }) {
  const [usuarios, setUsuarios] = useState([]);
  const [f, setF] = useState({ nome: '', login: '', senha: '', papel: 'projetista' });
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [remover, setRemover] = useState(null);

  useEffect(() => {
    const { onSnapshot } = F().fsMod;
    return onSnapshot(col('empresas', sessao.empresaId, 'usuarios'), s => setUsuarios(s.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.ativo !== false)));
  }, [sessao.empresaId]);

  const adicionar = async (e) => {
    e.preventDefault(); setErro('');
    if (!f.nome.trim()) return setErro('Informe o nome.');
    if (!/^[a-zA-Z0-9._-]{3,}$/.test(f.login.trim())) return setErro('Login com pelo menos 3 letras ou números, sem espaços.');
    if (f.senha.length < 6) return setErro('Senha com pelo menos 6 caracteres.');
    setOcupado(true);
    try {
      await cadastrarUsuario(sessao.empresaId, { nome: f.nome.trim(), login: f.login.trim(), senha: f.senha, papel: f.papel });
      toast(`${f.nome} pode entrar com o login "${norm(f.login)}".`, 'ok');
      setF({ nome: '', login: '', senha: '', papel: 'projetista' });
    } catch (e2) { setErro(traduzErroAuth(e2)); }
    setOcupado(false);
  };

  const tirarAcesso = async (u) => {
    const { deleteDoc, updateDoc } = F().fsMod;
    await deleteDoc(docRef('usuarios_index', u.uid));
    await updateDoc(docRef('empresas', sessao.empresaId, 'usuarios', u.uid), { ativo: false, removidoEm: nowIso() });
    setRemover(null);
    toast('Acesso removido.');
  };

  return html`
    <div class="fade-up">
      <div class="page-head"><div><h2>Equipe</h2><div class="dim">Quem pode entrar no sistema desta empresa</div></div></div>
      <div class="card stack" style=${{ marginBottom: '14px' }}>
        <div class="sec-title">🏷️ Logo da empresa</div>
        <div class="dim">Aparece no topo do app e em todas as impressões (OS, folha de compras, pendências, pedidos de alteração).</div>
        <div class="row" style=${{ gap: '10px' }}>
          ${window.__LOGO ? html`<img src=${window.__LOGO} style=${{ height: '56px', maxWidth: '200px', objectFit: 'contain', background: '#f5f5f4', borderRadius: '8px', padding: '4px' }} />` : html`<span class="dim">Nenhuma logo ainda.</span>`}
          <label class="btn btn-primary">⬆ ${window.__LOGO ? 'Trocar logo' : 'Enviar logo'}<input type="file" accept="image/*" hidden onChange=${async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const url = URL.createObjectURL(f); const img = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = url; }); const k = Math.min(1, 500 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); const png = c.toDataURL('image/png'); await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { logo: png.length < 300000 ? png : c.toDataURL('image/jpeg', 0.85) }); toast('Logo salva.', 'ok'); } catch (er) { toast('Não salvou a logo: ' + er.message, 'erro'); } }} /></label>
          ${window.__LOGO && html`<button class="btn btn-ghost" onClick=${async () => { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { logo: '' }); toast('Logo removida.'); }}>Remover</button>`}
        </div>
      </div>
      <form class="card stack" onSubmit=${adicionar} style=${{ marginBottom: '14px' }}>
        <div class="section-label">Novo acesso</div>
        ${erro && html`<div class="error-box">${erro}</div>`}
        <div style=${{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <input id="e-nome" class="inp" placeholder="Nome" value=${f.nome} onInput=${e => setF(v => ({ ...v, nome: e.target.value }))} />
          <input id="e-login" class="inp" placeholder="Login" value=${f.login} onInput=${e => setF(v => ({ ...v, login: e.target.value }))} />
          <input id="e-senha" class="inp" type="text" placeholder="Senha inicial" value=${f.senha} onInput=${e => setF(v => ({ ...v, senha: e.target.value }))} />
          <select id="e-papel" class="inp" value=${f.papel} onChange=${e => setF(v => ({ ...v, papel: e.target.value }))}>
            ${PAPEIS.map(p => html`<option key=${p.v} value=${p.v}>${p.t}</option>`)}
          </select>
          <button class="btn btn-primary" disabled=${ocupado}>${ocupado ? 'Criando…' : 'Criar acesso'}</button>
        </div>
        <div class="dim">Quem esquecer a senha: remova o acesso e crie outro com um login novo.</div>
      </form>
      <div class="list">
        ${usuarios.map(u => html`
          <div key=${u.uid} class="list-item" style=${{ cursor: 'default' }}>
            <div class="grow"><div class="title">${u.nome}</div><div class="dim">login: <span class="mono">${u.login}</span></div></div>
            <span class="chip ${u.papel === 'admin' ? 'chip-accent' : ''}">${(PAPEIS.find(p => p.v === u.papel) || {}).t || u.papel}</span>
            ${u.uid !== sessao.uid && (remover === u.uid
              ? html`<button class="btn btn-sm btn-danger" onClick=${() => tirarAcesso(u)}>Confirmar</button><button class="btn btn-sm" onClick=${() => setRemover(null)}>Não</button>`
              : html`<button class="btn btn-sm btn-ghost" onClick=${() => setRemover(u.uid)}>Remover acesso</button>`)}
          </div>`)}
      </div>
    </div>`;
}

function MinhaConta({ sessao, fechar, toast }) {
  const [s1, setS1] = useState(''); const [s2, setS2] = useState(''); const [atual, setAtual] = useState('');
  const [erro, setErro] = useState('');
  const trocar = async () => {
    setErro('');
    if (s1.length < 6) return setErro('A nova senha precisa ter pelo menos 6 caracteres.');
    if (s1 !== s2) return setErro('As duas senhas estão diferentes.');
    try {
      const { authMod, auth } = F();
      const cred = authMod.EmailAuthProvider.credential(auth.currentUser.email, atual);
      await authMod.reauthenticateWithCredential(auth.currentUser, cred);
      await authMod.updatePassword(auth.currentUser, s1);
      toast('Senha trocada.', 'ok'); fechar();
    } catch (e) { setErro(traduzErroAuth(e)); }
  };
  return html`
    <div class="modal-bg" onClick=${e => e.target === e.currentTarget && fechar()}>
      <div class="modal">
        <h3>Minha conta</h3>
        <div class="dim">${sessao.nome} · ${sessao.empresaNome} · ${(PAPEIS.find(p => p.v === sessao.papel) || {}).t}</div>
        ${erro && html`<div class="error-box">${erro}</div>`}
        <${Senha} id="mc-atual" value=${atual} onInput=${e => setAtual(e.target.value)} placeholder="Senha atual" />
        <${Senha} id="mc-nova" value=${s1} onInput=${e => setS1(e.target.value)} placeholder="Nova senha" />
        <${Senha} id="mc-nova2" value=${s2} onInput=${e => setS2(e.target.value)} placeholder="Repita a nova senha" />
        <div class="row" style=${{ justifyContent: 'flex-end' }}>
          <button class="btn btn-ghost" onClick=${fechar}>Fechar</button>
          <button class="btn btn-primary" onClick=${trocar}>Trocar senha</button>
        </div>
      </div>
    </div>`;
}

/* =========================================================
   Assistente de IA (chat flutuante)
   ========================================================= */
async function montarContexto(sessao, osAbertaId) {
  const { getDocs, getDoc, query, orderBy, limit } = F().fsMod;
  const linhas = [`Empresa: ${sessao.empresaNome}. Usuário: ${sessao.nome} (${(PAPEIS.find(p => p.v === sessao.papel) || {}).t || sessao.papel}). Hoje: ${new Date().toLocaleDateString('pt-BR')}.`];
  try {
    const ps = await getDocs(query(col('empresas', sessao.empresaId, 'projetos'), orderBy('criadoEm', 'desc'), limit(60)));
    linhas.push(`\nPROJETOS (${ps.size}):`);
    ps.docs.forEach(d => { const p = d.data(); linhas.push(`- ${p.cliente?.nome || '?'}${p.titulo ? ' — ' + p.titulo : ''}${p.cliente?.obra ? ' (obra ' + p.cliente.obra + ')' : ''}; ${p.qtdDocs || 0} doc.; ata: ${p.temAta ? 'sim' : 'não'}; ${p.osNumero ? 'OS ' + numOS(p.osNumero) : 'sem OS'}; criado ${fmtData(p.criadoEm)}`); });
    const os = await getDocs(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc'), limit(80)));
    linhas.push(`\nORDENS DE SERVIÇO (${os.size}):`);
    os.docs.forEach(d => {
      const o = d.data();
      const st = (STATUS_OS.find(s => s.v === o.status) || STATUS_OS[0]).t;
      const amb = (o.ambientes || []).map(a => `${a.nome} [${(a.moveis || []).map(m => m.nome).join(', ')}]`).join('; ');
      linhas.push(`- OS ${numOS(o)} | ${o.cliente?.nome || '?'} | ${st} | prazo: ${o.prazoEntrega || '—'} | ${amb || 'sem ambientes'}`);
    });
    if (osAbertaId) {
      const o = await getDoc(docRef('empresas', sessao.empresaId, 'os', osAbertaId));
      if (o.exists()) {
        const { fingerprint, ...dados } = o.data();
        linhas.push(`\nOS ABERTA NA TELA AGORA (completa):\n${JSON.stringify(dados).slice(0, 20000)}`);
      }
    }
  } catch (e) { linhas.push('(não consegui ler os dados agora)'); }
  return linhas.join('\n').slice(0, 40000);
}

function Assistente({ sessao, osAberta }) {
  const chave = 'osm_chat_' + sessao.uid;
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState(() => { try { return JSON.parse(localStorage.getItem(chave) || '[]'); } catch { return []; } });
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState('');
  const fimRef = useRef(null);
  const [interim, setInterim] = useState('');
  const fala = useFala({ onFinal: t => setTexto(v => (v ? v + ' ' : '') + t), onInterim: setInterim });

  useEffect(() => { try { localStorage.setItem(chave, JSON.stringify(msgs.slice(-40))); } catch {} }, [msgs]);
  useEffect(() => { fimRef.current?.scrollIntoView({ block: 'end' }); }, [msgs, pensando, aberto]);

  const enviar = async (pergunta) => {
    const q = (pergunta ?? (texto + ' ' + interim)).trim();
    if (!q || pensando) return;
    fala.parar();
    setErro(''); setTexto(''); setInterim('');
    const hist = [...msgs, { role: 'user', content: q }];
    setMsgs(hist);
    setPensando(true);
    try {
      const contexto = await montarContexto(sessao, osAberta);
      const r = await chamarIA('assistente', { contexto, historico: hist });
      setMsgs(h => [...h, { role: 'assistant', content: String(r?.texto || '').replace(/\*\*/g, '') }]);
    } catch (e) { setErro(e.message); }
    setPensando(false);
  };

  const sugestoes = osAberta
    ? ['Confira esta OS e aponte o que está faltando', 'Sugira ferragens para os móveis desta OS', 'Escreva uma mensagem pro cliente confirmando os acabamentos']
    : ['Quais OS estão em produção?', 'Quais projetos ainda não têm OS?', 'Sugira combinações de MDF para uma cozinha clara', 'Como eu faço a ata da reunião?'];

  return html`
    <button class=${'assist-fab' + (aberto ? ' on' : '')} onClick=${() => setAberto(v => !v)} aria-label="Assistente de IA">
      ${aberto ? '✕' : html`<span>✦</span><em class="txt-desk"> Assistente</em>`}
    </button>
    ${aberto && html`
      <div class="assist-panel glass" role="dialog" aria-label="Assistente de IA">
        <div class="assist-head">
          <div><b>Assistente Gestão Pró</b><div class="dim" style=${{ fontSize: '12px' }}>Conhece os projetos e as OS da sua empresa${osAberta ? ' e a OS aberta' : ''}</div></div>
          ${msgs.length > 0 && html`<button class="btn btn-ghost btn-sm" onClick=${() => setMsgs([])}>Limpar</button>`}
        </div>
        <div class="assist-body">
          ${msgs.length === 0 && html`
            <div class="dim" style=${{ marginBottom: '8px' }}>Pergunte qualquer coisa sobre seus projetos, OS, materiais ou o uso do app.</div>
            <div class="stack" style=${{ gap: '6px' }}>
              ${sugestoes.map(s => html`<button key=${s} class="btn btn-sm" style=${{ justifyContent: 'flex-start', whiteSpace: 'normal', textAlign: 'left' }} onClick=${() => enviar(s)}>${s}</button>`)}
            </div>`}
          ${msgs.map((m, i) => html`<div key=${i} class=${'bolha ' + (m.role === 'user' ? 'eu' : 'ia')}>${m.content}</div>`)}
          ${pensando && html`<div class="bolha ia dim">Pensando…</div>`}
          ${erro && html`<div class="error-box">${erro}</div>`}
          <div ref=${fimRef}></div>
        </div>
        <div class="assist-foot">
          <textarea id="assist-txt" class="inp" rows="2" placeholder=${fala.ouvindo ? 'Ouvindo…' : 'Escreva ou fale sua pergunta…'} value=${texto + (interim ? ' ' + interim : '')}
            onInput=${e => setTexto(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}></textarea>
          <div class="row" style=${{ flexWrap: 'nowrap' }}>
            ${fala.suportado && html`<button class=${'btn btn-sm' + (fala.ouvindo ? ' btn-mic-on pulse' : '')} onClick=${fala.ouvindo ? fala.parar : fala.iniciar} title="Falar">🎤</button>`}
            <button class="btn btn-primary btn-sm" style=${{ flex: 1 }} onClick=${() => enviar()} disabled=${pensando || !(texto.trim() || interim.trim())}>Enviar</button>
          </div>
        </div>
      </div>`}`;
}

/* =========================================================
   App
   ========================================================= */
// Data de prazo em texto (dd/mm/aaaa) -> Date, ou null.
function lerPrazo(t) {
  const m = /(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/.exec(String(t || ''));
  if (!m) return null;
  const a = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(a, Number(m[2]) - 1, Number(m[1]), 23, 59);
  return isNaN(d) ? null : d;
}
const atrasada = (o) => o.status !== 'concluida' && (lerPrazo(o.prazoEntrega)?.getTime() || Infinity) < Date.now();
const CATEG_AMB = [
  { t: 'Cozinha', k: ['cozinha', 'gourmet', 'copa', 'lavanderia', 'area de servico'] },
  { t: 'Dormitório', k: ['dormitorio', 'quarto', 'suite', 'closet', 'roupeiro'] },
  { t: 'Banheiro', k: ['banheiro', 'lavabo', 'bwc', 'wc'] },
  { t: 'Sala / Estar', k: ['sala', 'estar', 'jantar', 'home', 'living', 'tv', 'hall'] },
  { t: 'Corporativo', k: ['escritorio', 'recepcao', 'loja', 'consultorio', 'corporativo', 'sala de reuniao'] },
];
const categoriasDaOS = (o) => CATEG_AMB.filter(c => (o.ambientes || []).some(a => c.k.some(k => norm(a.nome).includes(k)))).map(c => c.t);

function TelaInicio({ sessao, abrirOS, irPara }) {
  const [lista, setLista] = useState(null);
  const [vista, setVista] = useState(() => { try { return localStorage.getItem('osm_ini_vista') || 'compacto'; } catch { return 'compacto'; } });
  useEffect(() => { try { localStorage.setItem('osm_ini_vista', vista); } catch {} }, [vista]);
  const compacto = vista === 'compacto';
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [amb, setAmb] = useState('');
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([]));
  }, [sessao.empresaId]);
  const os = lista || [];
  const st = (v) => os.filter(o => (STATUS_OS.find(x => x.v === o.status) ? o.status : (STATUS_OS[0]?.v || 'elaboracao')) === v).length;
  const pct = (n) => os.length ? Math.round(n * 100 / os.length) + '% do fluxo' : '0% do fluxo';
  const nAtr = os.filter(atrasada).length;
  const tiles = [
    { t: 'Total', n: os.length, s: '100% da carteira', cls: '' },
    ...STATUS_OS.map(x => ({ t: x.t, n: st(x.v), s: pct(st(x.v)), cls: ({ elaboracao: '', projetos: 'tile-azul', producao: 'tile-teal', liberacao: 'tile-warn', montagem: 'tile-roxo', concluida: 'tile-ok' })[x.v] || 'tile-cust', f: x.v, cor: x.cor })),
    { t: 'Atrasadas', n: nAtr, s: nAtr ? 'Precisa de atenção' : 'Tudo em dia', cls: nAtr ? 'tile-danger' : '', f: 'atrasadas' },
  ];
  const filtradas = os.filter(o =>
    (!status || (status === 'atrasadas' ? atrasada(o) : (STATUS_OS.find(x => x.v === o.status) ? o.status : (STATUS_OS[0]?.v || 'elaboracao')) === status)) &&
    (!amb || categoriasDaOS(o).includes(amb)) &&
    (!busca || norm(`${numOS(o)} ${o.numero} ${o.numeroAntigo} ${o.cliente?.nome} ${o.cliente?.obra} ${(o.ambientes || []).map(a => a.nome).join(' ')}`).includes(norm(busca))));

  const togg = html`<div class="seg-mini ini-vistas">${[['compacto', '☰ Compacto'], ['cliente', '🎨 Por cliente'], ['kanban', '▥ Kanban'], ['detalhado', '▦ Detalhado']].map(([v, t]) => html`<button key=${v} class=${vista === v ? 'on' : ''} onClick=${() => setVista(v)}>${t}</button>`)}</div>`;
  const cabecalho = html`
      <div class="row" style=${{ justifyContent: 'space-between', gap: '6px' }}>
        <b style=${{ fontSize: '17px' }}>Produção <span class="dim" style=${{ fontWeight: 400, fontSize: '13px' }}>${os.length} OSs</span></b>
        <button class="btn btn-primary btn-sm" onClick=${() => irPara('os')}>+ OS</button>
      </div>
      ${togg}
      <div class="ini-fluxo">
        ${tiles.filter(t => t.f).map(t => html`<button key=${t.t} class=${'ini-f ' + t.cls + (status === t.f ? ' sel' : '')} onClick=${() => setStatus(v => v === t.f ? '' : t.f)}><b>${lista === null ? '…' : t.n}</b><small>${t.t.replace(/^\d\. /, '').replace('Aguard. liberação', 'Liberação')}</small></button>`)}
      </div>
      <input class="inp inp-sm" placeholder="🔍 Buscar nº, cliente, ambiente…" value=${busca} onInput=${e => setBusca(e.target.value)} />`;
  if (vista === 'cliente') {
    const grupos = {};
    filtradas.forEach(o => { const k = norm(o.cliente?.nome) || '—'; (grupos[k] = grupos[k] || { nome: o.cliente?.nome || 'Sem cliente', oss: [] }).oss.push(o); });
    return html`
    <div class="fade-up stack ini-c" style=${{ gap: '8px' }}>
      ${cabecalho}
      <div class="ini-clis">
        ${Object.values(grupos).sort((a, b) => a.nome.localeCompare(b.nome)).map(g => { const c = corOS(g.oss[0]); const atr = g.oss.filter(atrasada).length; return html`
          <div key=${g.nome} class="ini-cli" style=${{ '--cc': c }}>
            <div class="ini-cli-top"><b>${g.nome}</b><span>${g.oss.length} ${g.oss.length === 1 ? 'OS' : 'OSs'}${atr ? html` · <em>⚠ ${atr}</em>` : ''}</span></div>
            <div class="ini-cli-oss">
              ${g.oss.map(o => { const x = STATUS_OS.find(y => y.v === o.status) || STATUS_OS[0]; return html`
                <button key=${o.id} class=${'ini-cli-os' + (atrasada(o) ? ' atras' : '')} onClick=${() => abrirOS(o.id)}>
                  <span class="mono">${numOS(o)}</span>
                  <span class="nm">${(o.ambientes || []).map(a => a.nome).filter(Boolean).join(', ') || o.ambienteResumo || '—'}</span>
                  <span class=${x.c + ' mini'}>${x.t.replace(/^\d\. /, '').replace('Aguard. liberação p/ entrega', 'Liberação')}</span>
                  ${o.prazoEntrega && html`<small>🚚 ${o.prazoEntrega.slice(0, 5)}</small>`}
                </button>`; })}
            </div>
          </div>`; })}
      </div>
    </div>`;
  }
  if (vista === 'kanban') return html`
    <div class="fade-up stack ini-c" style=${{ gap: '8px' }}>
      ${cabecalho}
      <div class="ini-kan">
        ${STATUS_OS.map(col => { const itens = filtradas.filter(o => (STATUS_OS.find(x => x.v === o.status) ? o.status : (STATUS_OS[0]?.v || 'elaboracao')) === col.v); return html`
          <div key=${col.v} class=${'ini-kcol k-' + col.v}>
            <div class="ini-kh"><b>${col.t.replace(/^\d\. /, '').replace('Aguard. liberação p/ entrega', 'Aguard. liberação')}</b><span>${itens.length}</span></div>
            <div class="ini-kcards">
              ${itens.map(o => html`<button key=${o.id} class=${'ini-kc' + (atrasada(o) ? ' atras' : '')} style=${{ borderLeftColor: corOS(o) }} onClick=${() => abrirOS(o.id)}>
                <div class="row" style=${{ justifyContent: 'space-between', gap: '4px' }}><span class="mono">${numOS(o)}</span>${o.prazoEntrega && html`<small class=${atrasada(o) ? 'vermelho' : ''}>🚚 ${o.prazoEntrega.slice(0, 5)}</small>`}</div>
                <b>${o.cliente?.nome || '—'}</b>
                <small>${(o.ambientes || []).map(a => a.nome).filter(Boolean).join(', ')}</small>
              </button>`)}
              ${!itens.length && html`<div class="dim" style=${{ fontSize: '12px', padding: '6px' }}>—</div>`}
            </div>
          </div>`; })}
      </div>
    </div>`;
  if (compacto) return html`
    <div class="fade-up stack ini-c" style=${{ gap: '8px' }}>
      ${cabecalho}
      <div class="ini-lista">
        ${filtradas.length === 0 && lista !== null && html`<div class="vazio dim">Nenhuma OS.</div>`}
        ${filtradas.map(o => { const x = STATUS_OS.find(y => y.v === o.status) || STATUS_OS[0]; const at = atrasada(o); return html`
          <button key=${o.id} class=${'ini-l' + (at ? ' atras' : '')} style=${{ borderLeftColor: corOS(o) }} onClick=${() => abrirOS(o.id)}>
            <span class="ini-n">${numOS(o)}</span>
            <span class="ini-t"><b>${o.cliente?.nome || '—'}</b> <small>${(o.ambientes || []).map(a => a.nome).filter(Boolean).join(', ')}</small></span>
            ${o.prazoEntrega && html`<span class=${'ini-p' + (at ? ' atras' : '')}>${o.prazoEntrega.slice(0, 5)}</span>`}
            <i class=${'ini-st st-' + x.v} title=${x.t}></i>
          </button>`; })}
      </div>
    </div>`;
  return html`
    <div class="fade-up stack" style=${{ gap: '16px' }}>
      <div class="row" style=${{ justifyContent: 'flex-end' }}>${togg}</div>
      <div class="card page-card row" style=${{ justifyContent: 'space-between' }}>
        <div>
          <div class="row" style=${{ gap: '10px' }}><span class="mini-mark">OS</span><h2 style=${{ fontSize: '24px' }}>Console de Produção</h2></div>
          <div class="dim">${sessao.empresaNome} • Gestão integrada de ordens de serviço e fabricação</div>
        </div>
        <div class="row">
          <button class="btn" onClick=${() => irPara('importar')}>Importar antigas</button>
          <button class="btn btn-primary" onClick=${() => irPara('os')}>+ Nova OS</button>
        </div>
      </div>

      <div class="card page-card">
        <div class="row" style=${{ justifyContent: 'space-between', marginBottom: '12px' }}>
          <div class="sec-title">〰 Fluxo da produção</div>
          <span class="chip">${os.length} OSs cadastradas</span>
        </div>
        <div class="tiles">
          ${tiles.map(t => html`
            <button key=${t.t} class=${'tile ' + t.cls + (t.f && status === t.f ? ' sel' : '')} onClick=${() => t.f && setStatus(v => v === t.f ? '' : t.f)}>
              <div class="tile-t">${t.t}</div>
              <div class="tile-n mono">${lista === null ? '…' : t.n}</div>
              <div class="tile-s">${t.s}</div>
            </button>`)}
        </div>
      </div>

      <div class="card page-card">
        <div class="row" style=${{ justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <div class="sec-title">📋 Ordens de serviço em carteira <span class="badge-dark">${filtradas.length}</span></div>
            <div class="dim">Identificação por número, cliente e ambiente</div>
          </div>
          <label class="row dim" style=${{ gap: '6px' }}>Status:
            <select id="ini-status" class="inp inp-sm" style=${{ width: 'auto' }} value=${status} onChange=${e => setStatus(e.target.value)}>
              <option value="">Todos os status</option>
              ${STATUS_OS.map(x => html`<option key=${x.v} value=${x.v}>${x.t}</option>`)}
              <option value="atrasadas">Atrasadas</option>
            </select>
          </label>
        </div>
        <div class="row" style=${{ justifyContent: 'space-between', marginBottom: '12px' }}>
          <input id="ini-busca" class="inp" style=${{ flex: '1 1 260px', maxWidth: '380px' }} placeholder="🔍 Buscar por nº da OS, cliente, ambiente ou obra…" value=${busca} onInput=${e => setBusca(e.target.value)} />
          <div class="row" style=${{ gap: '6px' }}>
            <span class="dim">Ambientes:</span>
            ${['', ...CATEG_AMB.map(c => c.t)].map(c => html`<button key=${c || 'todos'} class=${'pill' + (amb === c ? ' on' : '')} onClick=${() => setAmb(c)}>${c || 'Todos'}</button>`)}
          </div>
        </div>
        ${lista !== null && os.length === 0 ? html`
          <div class="vazio">
            <div style=${{ fontSize: '26px' }}>📋</div>
            <b>Nenhuma ordem de serviço cadastrada ainda</b>
            <div class="dim">Comece importando suas OSs antigas ou criando a primeira OS.</div>
            <div class="row" style=${{ justifyContent: 'center', marginTop: '8px' }}>
              <button class="btn btn-verde" onClick=${() => irPara('importar')}>Importar OSs antigas</button>
              <button class="btn btn-primary" onClick=${() => irPara('os')}>+ Nova OS</button>
            </div>
          </div>` : html`
          <div class="list">
            ${filtradas.length === 0 && lista !== null && html`<div class="vazio dim">Nenhuma OS com esses filtros.</div>`}
            ${filtradas.map(o => {
              const x = STATUS_OS.find(y => y.v === o.status) || STATUS_OS[0];
              return html`
                <div key=${o.id} class="list-item" style=${pinta(o)} onClick=${() => abrirOS(o.id)}>
                  <div class="os-num">${numOS(o)}${bolinhas(o)}</div>
                  <div class="grow">
                    <div class="title">${o.cliente?.nome || 'Cliente não informado'}</div>
                    <div class="dim">${(o.ambientes || []).map(a => a.nome).filter(Boolean).join(', ') || 'Sem ambientes'}${o.prazoEntrega ? ' · prazo ' + o.prazoEntrega : ''}</div>
                  </div>
                  ${categoriasDaOS(o).map(c => html`<span key=${c} class="chip">${c}</span>`)}
                  ${atrasada(o) && html`<span class="chip chip-danger">Atrasada</span>`}
                  <span class=${x.c}>${x.t}</span>
                </div>`;
            })}
          </div>`}
      </div>
    </div>`;
}

/* ---------- Configurações: etapas do processo (OS) e da produção (oficina) ---------- */
const STATUS_PADRAO = STATUS_OS.map(x => ({ ...x }));
const FAB_PADRAO = ETAPAS_FAB.map(x => [...x]);
const CHIP_CLS = { elaboracao: 'chip', projetos: 'chip chip-azul', producao: 'chip chip-teal', liberacao: 'chip chip-warn', montagem: 'chip chip-roxo', concluida: 'chip chip-ok' };
function aplicarEtapas(cfg) {
  const st = Array.isArray(cfg?.etapasOS) && cfg.etapasOS.length >= 2 ? cfg.etapasOS : STATUS_PADRAO.map(x => ({ v: x.v, nome: x.t.replace(/^\d+\. /, ''), cor: COR_ST[x.v] }));
  STATUS_OS.splice(0, STATUS_OS.length, ...st.map((x, i) => ({ v: x.v, t: (i + 1) + '. ' + x.nome, c: CHIP_CLS[x.v] || 'chip', cor: x.cor })));
  st.forEach(x => { if (x.cor) COR_ST[x.v] = x.cor; });
  const fab = Array.isArray(cfg?.etapasFab) && cfg.etapasFab.length ? cfg.etapasFab.map(x => [x.k, x.nome, x.desc || '']) : FAB_PADRAO;
  ETAPAS_FAB.splice(0, ETAPAS_FAB.length, ...fab);
}
function TelaConfig({ sessao, toast }) {
  const [zerar, setZerar] = useState(false);
  const [os, setOs] = useState(() => STATUS_OS.map(x => ({ v: x.v, nome: x.t.replace(/^\d+\. /, ''), cor: COR_ST[x.v] || '#78716c' })));
  const [fab, setFab] = useState(() => ETAPAS_FAB.map(([k, nome, desc]) => ({ k, nome, desc })));
  const [salvando, setSalvando] = useState(false);
  const mover = (arr, set, i, d) => { const a = [...arr]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set(a); };
  const salvar = async () => {
    if (os.some(x => !x.nome.trim()) || fab.some(x => !x.nome.trim())) return toast('Todas as etapas precisam de nome.');
    setSalvando(true);
    try { await F().fsMod.updateDoc(docRef('empresas', sessao.empresaId), { etapasOS: os.map(x => ({ ...x, nome: x.nome.trim() })), etapasFab: fab.map(x => ({ ...x, nome: x.nome.trim() })) }); toast('Etapas salvas. Já valem para todo o app.', 'ok'); }
    catch (e) { toast(e.message, 'erro'); }
    setSalvando(false);
  };
  const linha = (x, i, arr, set, campo) => html`<div key=${x.v || x.k} class="cfg-linha" style=${{ '--cc': x.cor || '#78716c' }}>
    <span class="cfg-n">${i + 1}</span>
    ${campo === 'os' && html`<input type="color" class="cfg-cor" value=${x.cor || '#78716c'} onInput=${e => set(arr.map((y, j) => j === i ? { ...y, cor: e.target.value } : y))} />`}
    <input class="inp" value=${x.nome} onInput=${e => set(arr.map((y, j) => j === i ? { ...y, nome: e.target.value } : y))} />
    <button class="btn btn-sm btn-ghost" onClick=${() => mover(arr, set, i, -1)} disabled=${i === 0}>▲</button>
    <button class="btn btn-sm btn-ghost" onClick=${() => mover(arr, set, i, 1)} disabled=${i === arr.length - 1}>▼</button>
    <button class="x-btn" title="Remover" onClick=${() => arr.length > 2 ? set(arr.filter((_, j) => j !== i)) : toast('Precisa de pelo menos 2 etapas.')}>✕</button>
  </div>`;
  return html`<div class="fade-up stack">
    <div><h2>⚙ Configurações</h2><div class="dim">Etapas do processo da sua empresa. Renomeie, reordene, mude a cor, acrescente ou tire etapas.</div></div>
    <div class="card page-card stack">
      <div class="sec-title">📋 Etapas da OS (andamento geral)</div>
      <div class="dim">São as etapas dos botões ◀ ▶ das Ordens de Serviço, do Início, do Kanban e dos cronogramas. A última é a de "concluída".</div>
      ${os.map((x, i) => linha(x, i, os, setOs, 'os'))}
      <button class="btn btn-sm" onClick=${() => setOs([...os.slice(0, -1), { v: 'et_' + rand(5), nome: 'Nova etapa', cor: '#0e7490' }, os[os.length - 1]])}>＋ Etapa</button>
    </div>
    <div class="card page-card stack">
      <div class="sec-title">🏭 Etapas da produção (oficina)</div>
      <div class="dim">Aparecem na esteira de produção da OS, no Quadro geral e no cronograma de produção.</div>
      ${fab.map((x, i) => linha(x, i, fab, setFab, 'fab'))}
      <button class="btn btn-sm" onClick=${() => setFab([...fab, { k: 'fab_' + rand(5), nome: 'Nova etapa', desc: '' }])}>＋ Etapa</button>
    </div>
    <div class="row" style=${{ gap: '6px', justifyContent: 'flex-end' }}>
      <button class="btn" onClick=${() => { setOs(STATUS_PADRAO.map(x => ({ v: x.v, nome: x.t.replace(/^\d+\. /, ''), cor: COR_ST[x.v] }))); setFab(FAB_PADRAO.map(([k, nome, desc]) => ({ k, nome, desc }))); }}>Voltar ao padrão</button>
      <button class="btn btn-verde" disabled=${salvando} onClick=${salvar}>${salvando ? 'Salvando…' : '✓ Salvar etapas'}</button>
    </div>
    <details class="card page-card zona-perigo"><summary><b>⚠️ Zona de perigo</b> <span class="dim">— reset do cronograma</span></summary>
      <div class="stack" style=${{ marginTop: '10px' }}>
        <div class="dim">Apaga <b>todas as semanas</b> da agenda e <b>todas as tarefas</b> do cronograma. Use só para limpar testes. Não pode ser desfeito.</div>
        <button class="btn btn-danger" onClick=${() => setZerar(true)}>🧨 Zerar o cronograma inteiro</button>
      </div>
    </details>
    ${zerar && html`<${SenhaMotivo} perigo semMotivo titulo="Zerar o cronograma inteiro" texto="Todas as semanas e todas as tarefas serão apagadas para sempre." botao="Zerar"
      onOk=${async () => { const { getDocs, writeBatch } = F().fsMod; const docs = [...(await getDocs(col('empresas', sessao.empresaId, 'agenda'))).docs, ...(await getDocs(col('empresas', sessao.empresaId, 'tarefas'))).docs];
        for (let i = 0; i < docs.length; i += 400) { const b = writeBatch(F().db); docs.slice(i, i + 400).forEach(d => b.delete(d.ref)); await b.commit(); }
        toast('Cronograma zerado: ' + docs.length + ' registros apagados.', 'ok'); }} fechar=${() => setZerar(false)} />`}
  </div>`;
}

function Principal({ sessao, toast }) {
  const novaVersao = useNovaVersao();
  const [logo, setLogo] = useState(window.__LOGO || '');
  const [, setCfgV] = useState(0);
  useEffect(() => F().fsMod.onSnapshot(col('empresas', sessao.empresaId, 'os'), s => { setTimeout(() => garantirCoresClientes(sessao, s.docs.map(d => d.data().cliente?.nome || '')), 1500); }, () => {}), []);
  useEffect(() => F().fsMod.onSnapshot(docRef('empresas', sessao.empresaId), d => { const dd = d.data() || {}; window.__CORES_CLI = dd.coresClientes || {}; const l = dd.logo || ''; window.__LOGO = l; setLogo(l); aplicarEtapas(dd); setCfgV(v => v + 1); }, () => {}), []);
  const [aba, setAba] = useState(() => { try { return localStorage.getItem('osm_aba') || 'inicio'; } catch { return 'inicio'; } });
  const [osAberta, setOsAberta] = useState(null);
  const [conta, setConta] = useState(false);
  const [statusIA, setStatusIA] = useState(null);
  const catalogo = useCatalogo(sessao.empresaId);

  useEffect(() => { try { localStorage.setItem('osm_aba', aba); } catch {} }, [aba]);
  useEffect(() => { fetch('/api/status').then(r => r.json()).then(setStatusIA).catch(() => setStatusIA({ ia: false })); }, []);

  const [ficha, setFicha] = useState(null);
  const abrirDireto = (id) => { setFicha(null); setOsAberta(id); setAba('os'); window.scrollTo(0, 0); };
  const abrirOS = (id) => setFicha(id);
  window.__abrirOS = abrirOS;
  const [cronoK, setCronoK] = useState(0);
  window.__irCronograma = (d) => { window.__semanaIr = d || null; setFicha(null); setOsAberta(null); setAba('cronograma'); setCronoK(k => k + 1); window.scrollTo(0, 0); };
  const irPara = (v) => { setAba(v); if (v !== 'os') setOsAberta(null); window.scrollTo(0, 0); };
  const abas = [
    { v: 'inicio', t: 'Início', i: '⌂' },
    { v: 'quadro', t: 'Quadro geral', i: '📊' },
    { v: 'pedidos', t: 'Peças extras', i: '🪵' },
    { v: 'os', t: 'Ordens de Serviço', i: '📋' },
    { v: 'contratos', t: 'Contratos', i: '📑' },
    { v: 'projetos', t: 'Reuniões & Projetos', i: '✨' },
    { v: 'importar', t: 'Importar (IA)', i: '🗂️' },
    { v: 'catalogo', t: 'Catálogo', i: '🎨' },
    ...(sessao.papel === 'admin' ? [{ v: 'equipe', t: 'Equipe', i: '👥' }] : []),
    { v: 'cronograma', t: 'Cronogramas', i: '📅' },
    { v: 'excluir', t: 'Excluir OSs', i: '🗑' },
    ...(sessao.papel === 'admin' ? [{ v: 'config', t: 'Configurações', i: '⚙' }] : []),
  ];
  const iniciais = (sessao.nome || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  return html`
    <div>
      <header class="topo">
        <div class="topo-in">
          <div class="brand-mini">
            ${logo ? html`<img class="brand-logo" src=${logo} alt="logo" />` : html`<div class="brand-mark">GP</div>`}
            <div>
              <div class="row" style=${{ gap: '6px' }}><b style=${{ fontFamily: 'var(--font-display)', fontSize: '16px' }}>Gestão Pró</b><span class="tag txt-desk">GESTÃO</span></div>
              <div class="dim topo-emp" style=${{ fontSize: '12px' }}>🏢 ${sessao.empresaNome}</div>
            </div>
          </div>
          <nav class="pillnav">
            ${abas.map(a => html`<button key=${a.v} class=${aba === a.v ? 'on' : ''} onClick=${() => irPara(a.v)}><span class="ico">${a.i}</span>${a.t}</button>`)}
          </nav>
          <div class="row topo-acoes" style=${{ gap: '8px' }}>
            <button class="user-box" onClick=${() => setConta(true)} title="Minha conta">
              <span class="avatar">${iniciais}</span>
              <span class="txt-desk" style=${{ textAlign: 'left', lineHeight: 1.2 }}><b style=${{ fontSize: '13px' }}>${sessao.nome}</b><br/><span class="ok-txt">● ${(PAPEIS.find(p => p.v === sessao.papel) || {}).t}</span></span>
            </button>
            ${sessao.papel === 'admin' && html`<button class=${'btn btn-ghost btn-sm' + (aba === 'config' ? ' on-cfg' : '')} title="Configurações" onClick=${() => irPara('config')}>⚙<span class="txt-desk"> Configurações</span></button>`}
            ${novaVersao ? html`<button class="btn btn-sm btn-nova-versao" title="Tem versão nova do app" onClick=${recarregarApp}>🔄<span> Atualizar</span></button>`
              : html`<button class="btn btn-ghost btn-sm" title="Atualizar o app e os dados" onClick=${recarregarApp}>⟳<span class="txt-desk"> Atualizar</span></button>`}
            <button class="btn btn-ghost btn-sm" title="Sair" onClick=${() => F().authMod.signOut(F().auth)}>⇥<span class="txt-desk"> Sair</span></button>
          </div>
        </div>
      </header>
      ${novaVersao && html`<button class="faixa-versao" onClick=${recarregarApp}>🔄 <b>Nova atualização disponível.</b> Toque aqui para atualizar.</button>`}
      <div class="shell" style=${{ paddingTop: '20px' }}>
        ${statusIA && !statusIA.ia && html`<div class="warn-box" style=${{ marginBottom: '12px' }}>A IA ainda não está ligada no servidor. Dá pra usar tudo à mão.</div>`}
        ${aba === 'inicio' && html`<${TelaInicio} sessao=${sessao} abrirOS=${abrirOS} irPara=${irPara} />`}
        ${aba === 'projetos' && html`<${TelaProjetos} sessao=${sessao} catalogo=${catalogo} toast=${toast} abrirOS=${abrirOS} />`}
        ${aba === 'os' && html`<${TelaOS} sessao=${sessao} catalogo=${catalogo} toast=${toast} osAberta=${osAberta} setOsAberta=${(id) => id ? (osAberta ? setOsAberta(id) : setFicha(id)) : setOsAberta(null)} />`}
        ${ficha && html`<${FichaOS} key=${ficha} sessao=${sessao} osId=${ficha} fechar=${() => setFicha(null)} editar=${abrirDireto} toast=${toast} />`}
        ${aba === 'importar' && html`<${TelaImportar} sessao=${sessao} catalogo=${catalogo} toast=${toast} abrirOS=${abrirOS} />`}
        ${aba === 'catalogo' && html`<${TelaCatalogo} sessao=${sessao} catalogo=${catalogo} toast=${toast} />`}
        ${aba === 'equipe' && sessao.papel === 'admin' && html`<${TelaEquipe} sessao=${sessao} toast=${toast} />`}
        ${aba === 'contratos' && html`<${TelaContratos} sessao=${sessao} catalogo=${catalogo} toast=${toast} abrirOS=${abrirOS} />`}
        ${aba === 'pedidos' && html`<${TelaPedidos} sessao=${sessao} toast=${toast} abrirOS=${abrirOS} />`}
        ${aba === 'quadro' && html`<${QuadroGeral} sessao=${sessao} abrirOS=${abrirOS} toast=${toast} catalogo=${catalogo} />`}
        ${aba === 'cronograma' && html`<${TelaCronograma} key=${cronoK} sessao=${sessao} abrirOS=${abrirOS} toast=${toast} />`}
        ${aba === 'config' && sessao.papel === 'admin' && html`<${TelaConfig} key=${STATUS_OS.map(x => x.v + x.t).join()} sessao=${sessao} toast=${toast} />`}
        ${aba === 'excluir' && html`<${TelaExcluir} sessao=${sessao} toast=${toast} />`}
      </div>
      ${conta && html`<${MinhaConta} sessao=${sessao} fechar=${() => setConta(false)} toast=${toast} />`}
      <${Assistente} sessao=${sessao} osAberta=${aba === 'os' ? osAberta : null} />
    </div>`;
}

function App() {
  const [fb, setFb] = useState(null);
  const [sessao, setSessao] = useState(undefined); // undefined = carregando, null = deslogado
  const [semAcesso, setSemAcesso] = useState(false);
  const [toast, toastEl] = useToast();

  useEffect(() => { waitFirebase().then(setFb); }, []);

  useEffect(() => {
    if (!fb?.ready) return;
    const { authMod, auth, fsMod } = fb;
    return authMod.onAuthStateChanged(auth, async (user) => {
      setSemAcesso(false);
      if (!user) { setSessao(null); return; }
      try {
        // Acesso do desenvolvedor: confere se esta conta é a registrada em config/dev.
        if (user.email === EMAIL_DEV) {
          const d = await fsMod.getDoc(fsMod.doc(fb.db, 'config', 'dev')).catch(() => null);
          if (d?.exists() && d.data().uid === user.uid) { setSessao({ uid: user.uid, tipo: 'dev', nome: 'Desenvolvedor' }); return; }
          setSemAcesso('Esse acesso de desenvolvedor não é válido.'); setSessao(null); return;
        }
        // Logo depois do cadastro, o índice pode levar um instante pra existir.
        let idx = null;
        for (let i = 0; i < 6 && !idx; i++) {
          const s = await fsMod.getDoc(fsMod.doc(fb.db, 'usuarios_index', user.uid));
          if (s.exists()) idx = s.data(); else await new Promise(r => setTimeout(r, 700));
        }
        if (!idx) { setSemAcesso(true); setSessao(null); return; }
        let emp = null;
        for (let i = 0; i < 6 && !emp; i++) {
          const e = await fsMod.getDoc(fsMod.doc(fb.db, 'empresas', idx.empresaId)).catch(() => null);
          if (e?.exists()) emp = e.data(); else await new Promise(r => setTimeout(r, 700));
        }
        if (emp?.pausada) { setSemAcesso('O acesso desta empresa está pausado. Fale com o suporte do Gestão Pró.'); setSessao(null); return; }
        setSessao({ uid: user.uid, empresaId: idx.empresaId, papel: idx.papel, nome: idx.nome, empresaNome: emp?.nome || idx.empresaId });
      } catch (e) {
        setSemAcesso(true); setSessao(null);
      }
    });
  }, [fb]);

  let corpo;
  if (!fb || (fb.ready && sessao === undefined)) corpo = html`<div class="boot">Carregando…</div>`;
  else if (!fb.ready) corpo = html`
    <div class="login-page"><div class="glass login-card" style=${{ maxWidth: '460px' }}>
      <${Marca} grande=${true} />
      <div class="warn-box">${fb.error === 'no-config'
        ? 'O banco de dados ainda não foi configurado neste site. Falta colar as chaves do Firebase no arquivo config.js.'
        : 'Não consegui conectar ao banco de dados. Confira a internet e recarregue a página.'}</div>
    </div></div>`;
  else if (!sessao) corpo = html`
    ${semAcesso && html`<div class="error-box" style=${{ maxWidth: '420px', margin: '16px auto 0' }}>${typeof semAcesso === 'string' ? semAcesso : 'Esse acesso foi removido ou não está ligado a nenhuma empresa. Fale com o administrador.'}
      <button class="btn btn-sm" style=${{ marginLeft: '8px' }} onClick=${() => { setSemAcesso(false); F().authMod.signOut(F().auth); }}>Ok</button></div>`}
    <${TelaLogin} />`;
  else if (sessao.tipo === 'dev') corpo = html`<${PainelDev} toast=${toast} />`;
  else corpo = html`<${Principal} sessao=${sessao} toast=${toast} />`;

  return html`<div>${corpo}${toastEl}</div><div id="print-area"></div>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(html`<${App} />`);
