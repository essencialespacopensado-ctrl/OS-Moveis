/* Gestão Pró — app principal (React + htm, sem etapa de build) */
const html = htm.bind(React.createElement);
const { useState, useEffect, useMemo, useRef, useCallback } = React;

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
  { v: 'rascunho', t: 'Rascunho', c: 'chip' },
  { v: 'aprovada', t: 'Aprovada', c: 'chip chip-teal' },
  { v: 'producao', t: 'Em produção', c: 'chip chip-accent' },
  { v: 'concluida', t: 'Concluída', c: 'chip chip-ok' },
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

async function criarOS(sessao, conteudo, extras = {}) {
  const { fsMod } = F();
  const os = sanearOS(conteudo);
  const fp = await impressaoDigital(os);
  const dup = await acharDuplicada(sessao.empresaId, fp);
  if (dup) {
    const err = new Error(`Já existe a OS nº ${padNum(dup.numero)} igual a esta (mesmo cliente, mesmos móveis, medidas e cores). Abra a OS existente em vez de criar outra.`);
    err.duplicada = dup;
    throw err;
  }
  const empRef = docRef('empresas', sessao.empresaId);
  const osRef = fsMod.doc(col('empresas', sessao.empresaId, 'os'));
  const agora = nowIso();
  let numero = 0;
  await fsMod.runTransaction(F().db, async (tx) => {
    const e = await tx.get(empRef);
    numero = (e.data()?.osSeq || 0) + 1;
    tx.update(empRef, { osSeq: numero });
    tx.set(osRef, {
      ...os, numero, fingerprint: fp, status: 'rascunho',
      projetoId: extras.projetoId || '', origem: extras.origem || 'manual',
      numeroAntigo: extras.numeroAntigo || '', dataAntiga: extras.dataAntiga || '', arquivoOrigem: extras.arquivoOrigem || '',
      criadoPor: sessao.nome, criadoEm: agora, atualizadoEm: agora, atualizadoPor: sessao.nome,
    });
  });
  return { id: osRef.id, numero };
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
      <div class="page-head">
        <div><h2>Projetos</h2><div class="dim">Cada cliente com contrato, detalhamentos e ata da reunião</div></div>
        <button class="btn btn-primary" onClick=${() => setNovo(true)}>+ Novo projeto</button>
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
            ${p.osNumero ? html`<span class="chip chip-accent">OS ${padNum(p.osNumero)}</span>` : null}
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
      toast(`OS nº ${padNum(numero)} criada. Confira os campos em amarelo.`, 'ok');
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
          ${projeto.osId && html`<button class="btn" onClick=${() => abrirOS(projeto.osId)}>Abrir OS ${padNum(projeto.osNumero)}</button>`}
          <button class="btn btn-primary" onClick=${gerarOS} disabled=${gerando}>${gerando ? 'Gerando OS… (até 1 min)' : '⚡ Gerar OS automática'}</button>
        </div>
      </div>
      ${erroGerar && html`<div class="error-box" style=${{ marginBottom: '12px' }}>${erroGerar.msg}
        ${erroGerar.dup && html` <button class="btn btn-sm" style=${{ marginLeft: '8px' }} onClick=${() => abrirOS(erroGerar.dup.id)}>Abrir OS ${padNum(erroGerar.dup.numero)}</button>`}</div>`}
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
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState(null);
  const [pedirNome, setPedirNome] = useState(false);
  const [nomeCli, setNomeCli] = useState('');

  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [sessao.empresaId]);

  if (osAberta) return html`<${EditorOS} key=${osAberta} osId=${osAberta} sessao=${sessao} catalogo=${catalogo} toast=${toast} voltar=${() => setOsAberta(null)} />`;

  const filtradas = lista.filter(o => (!status || o.status === status) &&
    (!busca || norm(`${o.numero} ${o.numeroAntigo} ${o.cliente?.nome} ${o.cliente?.obra} ${(o.ambientes || []).map(a => a.nome).join(' ')}`).includes(norm(busca))));

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

  return html`
    <div class="fade-up">
      <div class="page-head">
        <div><h2>Ordens de serviço</h2><div class="dim">${lista.length} no total · números únicos, sem repetição</div></div>
        <button class="btn btn-primary" onClick=${() => setPedirNome(v => !v)} disabled=${criando}>+ Nova OS</button>
      </div>
      ${pedirNome && html`
        <div class="card row" style=${{ marginBottom: '12px', flexWrap: 'nowrap' }}>
          <input id="nova-os-cli" class="inp" placeholder="Nome do cliente" value=${nomeCli} onInput=${e => setNomeCli(e.target.value)} onKeyDown=${e => e.key === 'Enter' && nova()} autoFocus />
          <button class="btn btn-primary" onClick=${nova} disabled=${criando}>${criando ? 'Criando…' : 'Criar'}</button>
        </div>`}
      ${erro && html`<div class="error-box" style=${{ marginBottom: '10px' }}>${erro.message}
        ${erro.duplicada && html` <button class="btn btn-sm" style=${{ marginLeft: '8px' }} onClick=${() => setOsAberta(erro.duplicada.id)}>Abrir OS ${padNum(erro.duplicada.numero)}</button>`}</div>`}
      <div class="row" style=${{ marginBottom: '12px', flexWrap: 'nowrap' }}>
        <input id="busca-os" class="inp" placeholder="Buscar por número, cliente, obra ou ambiente…" value=${busca} onInput=${e => setBusca(e.target.value)} />
        <select id="filtro-status" class="inp" style=${{ maxWidth: '170px' }} value=${status} onChange=${e => setStatus(e.target.value)}>
          <option value="">Todos</option>
          ${STATUS_OS.map(s => html`<option key=${s.v} value=${s.v}>${s.t}</option>`)}
        </select>
      </div>
      <div class="list">
        ${filtradas.length === 0 && html`<div class="card muted">Nenhuma OS encontrada. Gere uma a partir de um projeto, crie em branco ou importe as antigas.</div>`}
        ${filtradas.map(o => {
          const st = STATUS_OS.find(s => s.v === o.status) || STATUS_OS[0];
          const nMov = (o.ambientes || []).reduce((n, a) => n + (a.moveis || []).length, 0);
          const nRev = (o.ambientes || []).reduce((n, a) => n + (a.moveis || []).filter(m => (m.revisar || []).length).length, 0);
          return html`
            <div key=${o.id} class="list-item" onClick=${() => setOsAberta(o.id)}>
              <div class="os-num">${padNum(o.numero)}</div>
              <div class="grow">
                <div class="title">${o.cliente?.nome || 'Cliente não informado'}</div>
                <div class="dim">${(o.ambientes || []).map(a => a.nome).filter(Boolean).join(', ') || 'Sem ambientes'} · ${nMov} móveis · ${fmtData(o.atualizadoEm)}</div>
              </div>
              ${o.origem === 'importada' && html`<span class="chip">Importada${o.numeroAntigo ? ' · antiga ' + o.numeroAntigo : ''}</span>`}
              ${nRev > 0 && html`<span class="chip chip-warn">${nRev} p/ revisar</span>`}
              <span class=${st.c}>${st.t}</span>
            </div>`;
        })}
      </div>
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

  const alterar = (fn) => {
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
        await updateDoc(ref, { ...limpo, status: os.status || 'rascunho', fingerprint: fp, atualizadoEm: nowIso(), atualizadoPor: sessao.nome });
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
  const fabricantesMDF = useMemo(() => [...new Set(catalogo.filter(c => c.tipo === 'MDF').map(c => c.fabricante).filter(Boolean))].sort(), [catalogo]);

  const aplicarVoz = async () => {
    fala.parar();
    const texto = (falaTexto + ' ' + falaInterim).trim();
    if (!texto) return;
    setAplicandoVoz(true); setErroVoz('');
    try {
      const atual = sanearOS(os);
      const nova = sanearOS(await chamarIA('voz_os', { fala: texto, os: atual, catalogo: resumoCatalogo(catalogo) }));
      alterar(o => { o.cliente = nova.cliente; o.prazoEntrega = nova.prazoEntrega; o.observacoesGerais = nova.observacoesGerais; o.ambientes = nova.ambientes; });
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

  return html`
    <div class="fade-up">
      <div class="row" style=${{ marginTop: '6px' }}>
        <button class="btn btn-ghost btn-sm" onClick=${voltar}>← Ordens de serviço</button>
        <span class="dim" style=${{ marginLeft: 'auto' }}>${salvando ? 'Salvando…' : dup ? '' : sujo ? 'Alterações pendentes' : 'Tudo salvo ✓'}</span>
      </div>
      <div class="page-head">
        <div>
          <div class="os-num" style=${{ fontSize: '15px' }}>OS nº ${padNum(os.numero)}${os.numeroAntigo ? html` <span class="dim">(antiga: ${os.numeroAntigo})</span>` : ''}</div>
          <h2>${os.cliente?.nome || 'Cliente não informado'}</h2>
          <div class="dim">Criada por ${os.criadoPor || '—'} em ${fmtData(os.criadoEm)}${os.origem === 'importada' ? ' · importada de ' + (os.arquivoOrigem || 'OS antiga') : os.origem === 'ia' ? ' · gerada automaticamente' : ''}</div>
        </div>
        <div class="row">
          <select id="os-status" class="inp" style=${{ width: 'auto' }} value=${os.status || 'rascunho'} onChange=${e => alterar(o => { o.status = e.target.value; })}>
            ${STATUS_OS.map(s => html`<option key=${s.v} value=${s.v}>${s.t}</option>`)}
          </select>
          <button class="btn" onClick=${() => { setImprimir(true); setTimeout(() => { window.print(); setImprimir(false); }, 150); }}>🖨️ Imprimir / PDF</button>
        </div>
      </div>

      ${dup && html`<div class="error-box" style=${{ marginBottom: '12px' }}>
        Esta OS ficou igual à <b>OS nº ${padNum(dup.numero)}</b> (mesmo cliente, móveis, medidas e cores). Para não duplicar, a alteração não foi salva. Mude algo que diferencie as duas ou use a OS ${padNum(dup.numero)}.
      </div>`}

      <div class="card stack" style=${{ marginBottom: '14px', borderColor: fala.ouvindo ? 'var(--danger)' : undefined }}>
        <div class="row">
          ${fala.ouvindo
            ? html`<button class="btn btn-mic-on pulse" onClick=${aplicarVoz}>■ Parar e aplicar na OS</button>`
            : html`<button class="btn btn-teal" onClick=${fala.iniciar} disabled=${aplicandoVoz}>🎤 Preencher falando</button>`}
          ${!fala.ouvindo && falaTexto && html`<button class="btn" onClick=${aplicarVoz} disabled=${aplicandoVoz}>${aplicandoVoz ? 'Aplicando…' : 'Aplicar na OS'}</button>`}
          ${aplicandoVoz && html`<span class="dim">Aplicando o que você falou…</span>`}
          ${(falaTexto || falaInterim) && !aplicandoVoz && html`<button class="btn btn-ghost btn-sm" onClick=${() => { setFalaTexto(''); setFalaInterim(''); }}>Limpar</button>`}
        </div>
        ${fala.ouvindo || falaTexto ? html`<div class="transcript" style=${{ maxHeight: '120px' }}>${falaTexto}<span class="interim"> ${falaInterim}</span></div>`
          : html`<div class="dim">Ex.: "Na cozinha, balcão da pia 1800 por 900 por 550, caixa Duratex Branco Diamante 18, frente Arauco Sálvia, três gavetas com Tandem Blum e puxador perfil gola preto fosco."</div>`}
        ${fala.erro && html`<div class="error-box">${fala.erro}</div>`}
        ${erroVoz && html`<div class="error-box">${erroVoz}</div>`}
      </div>

      <div class="card stack" style=${{ marginBottom: '14px' }}>
        <div class="section-label">Cliente</div>
        <div class="grid2">
          <div class="field"><label class="lbl" for="os-cli">Nome</label><input id="os-cli" class="inp" value=${os.cliente?.nome || ''} onInput=${setCli('nome')} /></div>
          <div class="field"><label class="lbl" for="os-tel">Telefone</label><input id="os-tel" class="inp" value=${os.cliente?.telefone || ''} onInput=${setCli('telefone')} /></div>
          <div class="field"><label class="lbl" for="os-obra">Obra</label><input id="os-obra" class="inp" value=${os.cliente?.obra || ''} onInput=${setCli('obra')} /></div>
          <div class="field"><label class="lbl" for="os-prazo">Prazo de entrega</label><input id="os-prazo" class="inp" value=${os.prazoEntrega || ''} onInput=${e => alterar(o => { o.prazoEntrega = e.target.value; })} /></div>
        </div>
        <div class="field"><label class="lbl" for="os-end">Endereço</label><input id="os-end" class="inp" value=${os.cliente?.endereco || ''} onInput=${setCli('endereco')} /></div>
        <div class="field"><label class="lbl" for="os-obs">Observações gerais</label><textarea id="os-obs" class="inp" rows="2" value=${os.observacoesGerais || ''} onInput=${e => alterar(o => { o.observacoesGerais = e.target.value; })}></textarea></div>
      </div>

      <div class="stack">
        ${(os.ambientes || []).map((a, ai) => html`<${AmbienteOS} key=${a.id || ai} amb=${a} ai=${ai} alterar=${alterar} catalogo=${catalogo} sessao=${sessao} />`)}
        <button class="btn btn-primary" onClick=${() => alterar(o => { o.ambientes = o.ambientes || []; o.ambientes.push(novoAmbiente('Novo ambiente')); })}>+ Adicionar ambiente</button>
      </div>

      <div class="row" style=${{ justifyContent: 'flex-end', marginTop: '24px' }}>
        ${apagar
          ? html`<span class="dim">Excluir a OS ${padNum(os.numero)}? O número não será reaproveitado.</span><button class="btn btn-sm btn-danger" onClick=${excluir}>Sim, excluir</button><button class="btn btn-sm" onClick=${() => setApagar(false)}>Não</button>`
          : html`<button class="btn btn-sm btn-ghost" onClick=${() => setApagar(true)}>Excluir OS</button>`}
      </div>
      ${imprimir && ReactDOM.createPortal(html`<${ImpressaoOS} os=${os} empresa=${sessao.empresaNome} />`, document.getElementById('print-area'))}
      <datalist id="lista-fab-mdf">${fabricantesMDF.map(f => html`<option key=${f} value=${f} />`)}</datalist>
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
  const mdf = (x) => [x?.fabricante, x?.cor, x?.espessura ? x.espessura + ' mm' : ''].filter(Boolean).join(' · ');
  return html`
    <div class="pr">
      <div style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div><div style=${{ fontWeight: 700 }}>${empresa}</div><h1>ORDEM DE SERVIÇO Nº ${padNum(os.numero)}</h1></div>
        <div style=${{ textAlign: 'right' }}>Emitida em ${new Date().toLocaleDateString('pt-BR')}<br/>Status: ${(STATUS_OS.find(s => s.v === os.status) || STATUS_OS[0]).t}</div>
      </div>
      <table><tbody>
        <tr><th>Cliente</th><td>${os.cliente?.nome}</td><th>Telefone</th><td>${os.cliente?.telefone}</td></tr>
        <tr><th>Obra</th><td>${os.cliente?.obra}</td><th>Prazo</th><td>${os.prazoEntrega}</td></tr>
        <tr><th>Endereço</th><td colspan="3">${os.cliente?.endereco}</td></tr>
        ${os.observacoesGerais && html`<tr><th>Obs.</th><td colspan="3">${os.observacoesGerais}</td></tr>`}
      </tbody></table>
      ${(os.ambientes || []).map(a => html`
        <div class="amb-t">${a.nome}</div>
        <table>
          <thead><tr><th>Móvel</th><th>Qtd</th><th>L × A × P (mm)</th><th>MDF caixa</th><th>MDF frente</th><th>Fita</th><th>Ferragens</th><th>Puxador / outros</th></tr></thead>
          <tbody>
            ${(a.moveis || []).map(m => html`<tr>
              <td><b>${m.nome}</b>${m.portas ? html`<br/>Portas: ${m.portas}` : ''}${m.gavetas ? html`<br/>Gavetas: ${m.gavetas}` : ''}${m.observacoes ? html`<br/><i>${m.observacoes}</i>` : ''}</td>
              <td>${m.quantidade}</td>
              <td>${[m.largura, m.altura, m.profundidade].map(x => x || '—').join(' × ')}</td>
              <td>${mdf(m.mdfCaixa)}</td><td>${mdf(m.mdfFrente)}</td><td>${m.fitaBorda}</td>
              <td>${(m.ferragens || []).map(f => html`<div>${f.quantidade ? f.quantidade + '× ' : ''}${[f.tipo, f.fabricante, f.modelo].filter(Boolean).join(' · ')}</div>`)}</td>
              <td>${m.puxador}${m.iluminacao ? html`<br/>${m.iluminacao}` : ''}</td>
            </tr>`)}
          </tbody>
        </table>`)}
      <div style=${{ marginTop: '30px', display: 'flex', gap: '40px' }}>
        <div style=${{ flex: 1, borderTop: '1px solid #000', paddingTop: '4px' }}>Responsável</div>
        <div style=${{ flex: 1, borderTop: '1px solid #000', paddingTop: '4px' }}>Produção</div>
        <div style=${{ flex: 1, borderTop: '1px solid #000', paddingTop: '4px' }}>Cliente</div>
      </div>
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
        const { id, numero } = await criarOS(sessao, res, {
          origem: 'importada', numeroAntigo: String(res.numeroAntigo || ''), dataAntiga: String(res.dataAntiga || ''), arquivoOrigem: item.nome,
        });
        upd(item.key, { status: `Importada como OS nº ${padNum(numero)}`, ok: true, osId: id, rodando: false });
      } catch (e) {
        upd(item.key, { status: e.message, erro: true, dupId: e.duplicada?.id, rodando: false });
      }
    }
  };

  return html`
    <div class="fade-up">
      <div class="page-head">
        <div><h2>Importar OSs antigas</h2><div class="dim">A IA lê a OS antiga e monta no layout novo. Cada uma ganha número novo, e o número antigo fica guardado.</div></div>
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
    ps.docs.forEach(d => { const p = d.data(); linhas.push(`- ${p.cliente?.nome || '?'}${p.titulo ? ' — ' + p.titulo : ''}${p.cliente?.obra ? ' (obra ' + p.cliente.obra + ')' : ''}; ${p.qtdDocs || 0} doc.; ata: ${p.temAta ? 'sim' : 'não'}; ${p.osNumero ? 'OS ' + padNum(p.osNumero) : 'sem OS'}; criado ${fmtData(p.criadoEm)}`); });
    const os = await getDocs(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc'), limit(80)));
    linhas.push(`\nORDENS DE SERVIÇO (${os.size}):`);
    os.docs.forEach(d => {
      const o = d.data();
      const st = (STATUS_OS.find(s => s.v === o.status) || STATUS_OS[0]).t;
      const amb = (o.ambientes || []).map(a => `${a.nome} [${(a.moveis || []).map(m => m.nome).join(', ')}]`).join('; ');
      linhas.push(`- OS ${padNum(o.numero)} | ${o.cliente?.nome || '?'} | ${st} | prazo: ${o.prazoEntrega || '—'} | ${amb || 'sem ambientes'}`);
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
      ${aberto ? '✕' : html`<span>✦</span> Assistente`}
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
function Principal({ sessao, toast }) {
  const [aba, setAba] = useState(() => { try { return localStorage.getItem('osm_aba') || 'projetos'; } catch { return 'projetos'; } });
  const [osAberta, setOsAberta] = useState(null);
  const [conta, setConta] = useState(false);
  const [statusIA, setStatusIA] = useState(null);
  const catalogo = useCatalogo(sessao.empresaId);

  useEffect(() => { try { localStorage.setItem('osm_aba', aba); } catch {} }, [aba]);
  useEffect(() => { fetch('/api/status').then(r => r.json()).then(setStatusIA).catch(() => setStatusIA({ ia: false })); }, []);

  const abrirOS = (id) => { setOsAberta(id); setAba('os'); window.scrollTo(0, 0); };
  const abas = [
    { v: 'projetos', t: 'Projetos', i: '📁' },
    { v: 'os', t: 'Ordens de serviço', i: '📋' },
    { v: 'importar', t: 'Importar antigas', i: '🗂️' },
    { v: 'catalogo', t: 'Catálogo', i: '🎨' },
    ...(sessao.papel === 'admin' ? [{ v: 'equipe', t: 'Equipe', i: '👥' }] : []),
  ];

  return html`
    <div class="shell">
      <div class="topbar glass">
        <${Marca} />
        <div class="dim" style=${{ textAlign: 'right', lineHeight: 1.25 }}>
          <div style=${{ color: 'var(--text)', fontWeight: 700 }}>${sessao.empresaNome}</div>
          <div>${sessao.nome}</div>
        </div>
        <button class="btn btn-sm" onClick=${() => setConta(true)}>Minha conta</button>
        <button class="btn btn-sm btn-ghost" onClick=${() => F().authMod.signOut(F().auth)}>Sair</button>
      </div>
      <nav class="nav">
        ${abas.map(a => html`<button key=${a.v} class=${'nav-tile' + (aba === a.v ? ' on' : '')} onClick=${() => { setAba(a.v); if (a.v !== 'os') setOsAberta(null); }}><span class="ico">${a.i}</span>${a.t}</button>`)}
      </nav>
      ${statusIA && !statusIA.ia && html`<div class="warn-box" style=${{ marginBottom: '12px' }}>A IA ainda não está ligada no servidor. Dá pra usar tudo à mão; a leitura automática, a ata e a OS automática funcionam depois que a chave for configurada.</div>`}
      ${aba === 'projetos' && html`<${TelaProjetos} sessao=${sessao} catalogo=${catalogo} toast=${toast} abrirOS=${abrirOS} />`}
      ${aba === 'os' && html`<${TelaOS} sessao=${sessao} catalogo=${catalogo} toast=${toast} osAberta=${osAberta} setOsAberta=${setOsAberta} />`}
      ${aba === 'importar' && html`<${TelaImportar} sessao=${sessao} catalogo=${catalogo} toast=${toast} abrirOS=${abrirOS} />`}
      ${aba === 'catalogo' && html`<${TelaCatalogo} sessao=${sessao} catalogo=${catalogo} toast=${toast} />`}
      ${aba === 'equipe' && sessao.papel === 'admin' && html`<${TelaEquipe} sessao=${sessao} toast=${toast} />`}
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
