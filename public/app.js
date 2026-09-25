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
  { v: 'producao', t: '2. Produção', c: 'chip chip-teal' },
  { v: 'montagem', t: '3. Montagem', c: 'chip chip-roxo' },
  { v: 'concluida', t: '4. Concluída', c: 'chip chip-ok' },
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
  const ano = String(new Date().getFullYear()).slice(2);
  await fsMod.runTransaction(F().db, async (tx) => {
    const e = await tx.get(empRef);
    const ed = e.data() || {};
    const seqs = ed.seqAno || {};
    numero = (seqs[ano] ?? (ed.seqAno ? 0 : (ed.osSeq || 0))) + 1;
    codigo = ano + '.' + String(numero).padStart(3, '0');
    tx.update(empRef, { osSeq: (ed.osSeq || 0) + 1, seqAno: { ...seqs, [ano]: numero } });
    tx.set(osRef, {
      ...os, numero, ano, codigo, fingerprint: fp, status: 'elaboracao', modoExecucao: 'interna',
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
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState(null);
  const [pedirNome, setPedirNome] = useState(false);
  const [nomeCli, setNomeCli] = useState('');
  const [execucao, setExecucao] = useState('');
  const [soPrazo, setSoPrazo] = useState(false);
  const [vista, setVista] = useState(() => { try { return localStorage.getItem('osm_vista') || 'grade'; } catch { return 'grade'; } });
  useEffect(() => { try { localStorage.setItem('osm_vista', vista); } catch {} }, [vista]);
  const [vozInterim, setVozInterim] = useState('');
  const voz = useFala({ onFinal: t => { setBusca(t.replace(/^(buscar|procurar|abrir)\s+/i, '').replace(/^os\s+/i, '').replace(/[.!?]$/, '')); }, onInterim: setVozInterim });

  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [sessao.empresaId]);

  if (osAberta) return html`<${EditorOS} key=${osAberta} osId=${osAberta} sessao=${sessao} catalogo=${catalogo} toast=${toast} voltar=${() => setOsAberta(null)} />`;

  const stOf = (o) => STATUS_OS.find(x => x.v === o.status) ? o.status : 'elaboracao';
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
    { t: '1. Elaboração', n: cnt('elaboracao'), s: pf(cnt('elaboracao')), cls: '', f: 'elaboracao' },
    { t: '2. Produção', n: cnt('producao'), s: pf(cnt('producao')), cls: 'tile-teal', f: 'producao' },
    { t: '3. Montagem', n: cnt('montagem'), s: pf(cnt('montagem')), cls: 'tile-roxo', f: 'montagem' },
    { t: '4. Concluída', n: cnt('concluida'), s: pf(cnt('concluida')), cls: 'tile-ok', f: 'concluida' },
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
            ${[['grade', '▦ Grade'], ['quadro', '▥ Quadro'], ['galeria', '▣ Galeria'], ['compacta', '☰ Compacta']].map(([v, t]) => html`<button key=${v} class=${vista === v ? 'on' : ''} onClick=${() => setVista(v)}>${t}</button>`)}
          </div>
        </div>
        <div class="row dim" style=${{ gap: '6px', marginTop: '8px', fontSize: '12px' }}>
          Exemplos de fala: ${['Buscar Davi', 'Cozinha', 'OS 0001', 'Em produção'].map(x => html`<button key=${x} class="pill" onClick=${() => setBusca(x.replace(/^Buscar /, '').replace(/^OS /, '').replace('Em produção', 'Produção'))}>🎤 "${x}"</button>`)}
        </div>
      </div>

      ${filtradas.length === 0 ? html`<div class="vazio"><div style=${{ fontSize: '24px' }}>📄</div><b>Nenhuma ordem de serviço encontrada</b><div class="dim">${lista.length ? 'Nenhuma OS corresponde aos filtros.' : 'Crie a primeira OS, gere a partir de uma reunião ou importe as antigas.'}</div></div>`
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
        await updateDoc(ref, { ...limpo, padrao: os.padrao || {}, execucao: os.execucao || {}, tamponamento: os.tamponamento || {}, responsavel: os.responsavel || '', arquiteto: os.arquiteto || '', modoExecucao: os.modoExecucao || 'interna', ambienteResumo: os.ambienteResumo || '', cores: temCores(os) ? os.cores : null, historico: os.historico || [], alteracoes: os.alteracoes || [], reaberturas: os.reaberturas || [], ata: os.ata || null, contrato: os.contrato || null, parceiros: os.parceiros || {}, status: os.status || 'elaboracao', fingerprint: fp, atualizadoEm: nowIso(), atualizadoPor: sessao.nome });
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
      <${LinhaDoTempo} os=${os} />
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
          <div class="dim" style=${{ margin: '4px 0 14px' }}>Etapa atual: <b>${STATUS_OS[idxSt].t.replace(/^\d\. /, '')}</b> (${idxSt + 1}/4)</div>
          <div class="trilho">
            ${STATUS_OS.map((x, i) => html`
              <button key=${x.v} class=${'trilho-pt' + (i < idxSt ? ' feito' : i === idxSt ? ' atual' : '')} onClick=${() => i < idxSt ? setPedirVoltar(x) : alterar(o => { o.status = x.v; })} title=${'Marcar como ' + x.t}>
                <span class="bola">${i < idxSt ? '✓' : i + 1}</span><small>${x.t.replace(/^\d\. /, '')}</small>
              </button>`)}
            <div class="trilho-linha"><div style=${{ width: (idxSt / 3 * 100) + '%' }}></div></div>
          </div>
          ${idxSt < 3 && html`<button class="btn btn-marrom btn-block" style=${{ marginTop: '14px' }} onClick=${() => alterar(o => { o.status = STATUS_OS[idxSt + 1].v; })}>✓ Concluir ${STATUS_OS[idxSt].t.replace(/^\d\. /, '')} → Passar para ${STATUS_OS[idxSt + 1].t.replace(/^\d\. /, '')}</button>`}
          ${idxSt === 3 && html`<div class="ok-box" style=${{ marginTop: '12px' }}>OS concluída ✓</div>`}
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

function QuadroGeral({ sessao, abrirOS, toast }) {
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [busca, setBusca] = useState('');
  const [sheet, setSheet] = useState(null); // {osId, tipo:'parc'|'prod'|'add', k}
  const [conf, setConf] = useState(null); // {titulo, oque, fazer(motivo)}
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([]));
  }, []);
  const salvar = async (o, patch, msg) => {
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
    if (prox && (etapas[prox]?.status || 'pendente') === 'pendente') etapas[prox] = { ...(etapas[prox] || {}), status: 'andamento' };
    const todas = ETAPAS_FAB.every(([x]) => etapas[x]?.status === 'pronto');
    const status = todas ? 'concluida' : k === 'montagem' || etapas.montagem?.status === 'andamento' ? 'montagem' : 'producao';
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
      <div><h2>Quadro geral</h2><div class="dim">Toque em um item para avançar. Produção da fábrica e parceiros de cada cliente.</div></div>
      <div class="qg-filtros">
        ${[['todas', 'Todas', ativas.length], ['parceiros', 'Pendências de parceiro', cont.parceiros], ['aprovacao', 'Aguard. aprovação', cont.aprovacao], ['atrasadas', 'Atrasadas', cont.atrasadas]].map(([v, t, n]) => html`
          <button key=${v} class=${'qg-f' + (filtro === v ? ' on' : '') + (v === 'atrasadas' && n ? ' perigo' : '')} onClick=${() => setFiltro(v)}>${t} <b>${n}</b></button>`)}
      </div>
      <input class="inp" placeholder="🔍 Buscar cliente, OS ou ambiente" value=${busca} onInput=${e => setBusca(e.target.value)} />
      <div class="qg-leg">${ST_PARC.map(s => html`<span key=${s[0]}><i style=${{ background: s[3] }}></i>${s[2]}</span>`)}</div>
      ${lista === null ? html`<div class="card">Carregando…</div>` : cards.length === 0 ? html`<div class="card vazio dim">Nada por aqui.</div>` : cards.map(({ o, parc, et, feitas, atras }) => html`
        <div key=${o.id} class=${'qg-card' + (atras ? ' atras' : '')} style=${temCores(o) ? { borderLeftColor: o.cores[0] } : undefined}>
          <div class="qg-top" onClick=${() => abrirOS(o.id)}>
            <b class="qg-num">${numOS(o)}</b>
            <div class="qg-cli"><b>${o.cliente?.nome || 'Cliente'}</b><small>${(o.ambientes || []).map(a => a.nome).join(', ') || o.ambienteResumo || ''}</small></div>
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
        </div>`)}

      ${osSheet && ReactDOM.createPortal(html`
        <div class="sheet-fundo" onClick=${e => e.target === e.currentTarget && setSheet(null)}>
          <div class="sheet">
            <div class="sheet-alça"></div>
            <div class="row" style=${{ justifyContent: 'space-between' }}><div><b>${numOS(osSheet)}</b> · ${osSheet.cliente?.nome}</div><button class="x-btn" onClick=${() => setSheet(null)}>✕</button></div>

            ${sheet.tipo === 'prod' && html`
              <div class="sheet-t">🏭 Produção na fábrica</div>
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

            ${sheet.tipo === 'add' && html`
              <div class="sheet-t">Adicionar parceiro nesta OS</div>
              <div class="sheet-grade">
                ${TIPOS_PARC.map(([k, ic, t]) => html`<button key=${k} class="btn btn-grande" onClick=${() => { setParc(osSheet, k, { st: 'orcar' }, t + ' adicionado'); setSheet({ osId: osSheet.id, tipo: 'parc', k }); }}><span style=${{ fontSize: '22px' }}>${ic}</span><br/>${t}</button>`)}
              </div>`}
          </div>
        </div>`, document.body)}
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
          ${res.map(o => html`<button type="button" key=${o.id} class="opc-i" style=${temCores(o) ? { borderLeft: '4px solid ' + o.cores[0] } : undefined} onClick=${() => { onPick(linhaOS(o)); fechar(); }}>
            <span><b>${numOS(o)}</b> — ${o.cliente?.nome || 'Cliente'}<small>${(o.ambientes || []).map(a => a.nome).join(', ') || 'Sem ambientes'}${o.prazoEntrega ? ' · entrega ' + o.prazoEntrega : ''}</small></span></button>`)}
          ${!res.length && html`<div class="dim">Nenhuma OS encontrada.</div>`}
        </div>
      </div></div>`, document.body)}</span>`;
}
const addLinha = (txt, l) => (txt ? txt.replace(/\s+$/, '') + '\n' : '') + l;

function AgendaSemana({ sessao, lista, semana, setSemana, toast }) {
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
  useEffect(() => {
    if (!sujo || !doc) return;
    const t = setTimeout(async () => { try { await F().fsMod.setDoc(ref, { ...doc, atualizadoEm: nowIso(), atualizadoPor: sessao.nome }); setSujo(false); } catch (e) { toast('Não salvou a agenda: ' + e.message, 'erro'); } }, 900);
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
                  ${(k === 'entregas' || k === 'montagem') && html`<tr class="ag-auto"><td class="ag-nome">📌 Das OSs</td>${diasD.map((_, i) => html`<td key=${i}>${autoDia(i, e => k === 'entregas' ? e.t === 'entrega' : e.t === 'montagem').map((e, j) => html`<div key=${j} class="ag-chip" style=${temCores(e.o) ? { borderLeftColor: e.o.cores[0] } : undefined}>${e.txt}: <b>${numOS(e.o)}</b> ${e.o.cliente?.nome}</div>`)}</td>`)}</tr>`}
                  ${(doc.grades?.[k] || []).map((r, ri) => html`<tr key=${ri}>
                    <td class="ag-nome"><input class="ag-inp" value=${r.nome} placeholder=${rot} onInput=${e => mudar(d => { d.grades[k][ri].nome = e.target.value; })} />
                      <button class="x-btn" title="Remover linha" onClick=${() => mudar(d => { d.grades[k].splice(ri, 1); })}>×</button></td>
                    ${r.dias.map((v, di) => html`<td key=${di}><textarea class="ag-cel" rows="2" value=${v} onInput=${e => mudar(d => { d.grades[k][ri].dias[di] = e.target.value; })}></textarea>
                      <${OSPicker} lista=${lista} onPick=${l => mudar(d => { d.grades[k][ri].dias[di] = addLinha(d.grades[k][ri].dias[di], l); })} /></td>`)}
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
    GRADES.forEach(([k, t]) => (s.grades?.[k] || []).forEach(r => { const v = (r.dias?.[i] || '').trim(); if (v) out.push({ k, txt: (r.nome ? r.nome + ': ' : '') + v.split('\n')[0] }); }));
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
            ${ev.slice(0, 4).map((e, j) => html`<div key=${'e' + j} class=${'mes-ev ' + (e.t === 'entrega' ? 'ent' : '')} style=${temCores(e.o) ? { borderLeftColor: e.o.cores[0] } : undefined}>${e.t === 'entrega' ? '🚚' : '📌'} ${numOS(e.o)} ${e.o.cliente?.nome || ''}${e.t !== 'entrega' ? ' · ' + e.txt : ''}</div>`)}
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
  const [semana, setSemana] = useState(() => iso(segundaDe(new Date())));
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
              return html`<div key=${o.id} class="g-row" onClick=${() => abrirOS(o.id)}>
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
function linhaDoTempo(os) {
  const ev = [];
  if (os.criadoEm) ev.push({ q: os.criadoEm, ic: '🆕', t: 'OS criada', d: (os.origem ? 'origem: ' + os.origem : ''), p: os.criadoPor });
  (os.historico || []).forEach(h => ev.push({ q: h.quando, ic: '🔓', t: 'Desbloqueada para edição', d: h.motivo, p: h.quem }));
  (os.alteracoes || []).forEach(a => ev.push({ q: a.quando, ic: '📝', t: 'Pedido de alteração nº ' + a.n + ' (' + a.itens.length + ' itens)', d: a.motivo, p: a.quem }));
  (os.reaberturas || []).forEach(r => ev.push({ q: r.quando, ic: '↺', t: r.oque, d: r.motivo, p: r.quem }));
  Object.entries(os.execucao?.etapas || {}).forEach(([k, e]) => { if (e.concluidaEm) ev.push({ q: e.concluidaEm, ic: '✅', t: 'Etapa concluída: ' + ((ETAPAS_FAB.find(x => x[0] === k) || [])[1] || k) }); });
  Object.entries(os.parceiros || {}).forEach(([k, pa]) => (pa.hist || []).forEach(h => ev.push({ q: h.em, ic: '🤝', t: ((TIPOS_PARC.find(x => x[0] === k) || [])[2] || k) + ': ' + infoSt(h.st)[2], d: h.motivo || '', p: h.quem })));
  (os.contrato?.arquivos || []).forEach(a => ev.push({ q: a.em, ic: '📑', t: 'Contrato anexado: ' + a.nome }));
  if (os.restauradaEm) ev.push({ q: os.restauradaEm, ic: '♻️', t: 'OS restaurada', p: os.restauradaPor });
  if (os.atualizadoEm) ev.push({ q: os.atualizadoEm, ic: '💾', t: 'Última modificação', p: os.atualizadoPor, ultima: true });
  return ev.filter(e => e.q).sort((a, b) => String(b.q).localeCompare(String(a.q)));
}
function LinhaDoTempo({ os }) {
  const ev = linhaDoTempo(os);
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
function SenhaMotivo({ titulo, texto, botao = 'Confirmar', perigo, onOk, fechar }) {
  const [senha, setSenha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [rodando, setRodando] = useState(false);
  const ok = async () => {
    if (motivo.trim().length < 5) return setErro('Escreva o motivo (obrigatório, pelo menos 5 letras).');
    if (!senha) return setErro('Digite a sua senha.');
    setRodando(true); setErro('');
    try { await conferirSenha(senha); await onOk(motivo.trim()); fechar(); }
    catch (e) { setErro(/password|credential/i.test(e.code || e.message) ? 'Senha incorreta.' : e.message); setRodando(false); }
  };
  return html`
    <div class="modal-fundo" onClick=${e => e.target === e.currentTarget && !rodando && fechar()}>
      <div class="card modal-caixa stack">
        <div class="sec-title">${perigo ? '🗑' : '🔓'} ${titulo}</div>
        ${texto && html`<div class="dim">${texto}</div>`}
        <div class="field"><span class="lbl">Motivo (obrigatório)</span><textarea class="inp" rows="3" placeholder="Ex: cliente cancelou o ambiente / OS duplicada / correção de medida" value=${motivo} onInput=${e => setMotivo(e.target.value)} autoFocus></textarea></div>
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
}

function TelaExcluir({ sessao, toast }) {
  const [lista, setLista] = useState(null);
  const [hist, setHist] = useState([]);
  const [busca, setBusca] = useState('');
  const [alvo, setAlvo] = useState(null);
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    const a = onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([]));
    const b = onSnapshot(query(col('empresas', sessao.empresaId, 'exclusoes'), orderBy('excluidoEm', 'desc')), s => setHist(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setHist([]));
    return () => { a(); b(); };
  }, []);
  const restaurar = async (h) => {
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
        ${lista === null ? html`<div class="dim">Carregando…</div>` : filtradas.length === 0 ? html`<div class="vazio dim">Nenhuma OS.</div>` : html`
          <div class="list">${filtradas.map(o => html`
            <div key=${o.id} class="list-item" style=${pinta(o)}>
              <div class="os-num">${numOS(o)}${bolinhas(o)}</div>
              <div class="grow"><div class="title">${o.cliente?.nome || 'Cliente não informado'}</div><div class="dim">${(o.ambientes || []).map(a => a.nome).join(', ') || 'Sem ambientes'} · ${(STATUS_OS.find(x => x.v === o.status) || STATUS_OS[0]).t}</div></div>
              <button class="btn btn-sm btn-danger" onClick=${() => setAlvo(o)}>🗑 Excluir</button>
            </div>`)}</div>`}
      </div>
      <div class="card page-card stack">
        <div class="sec-title">📜 Histórico de exclusões</div>
        ${hist.length === 0 ? html`<div class="dim">Nenhuma OS excluída.</div>` : hist.map(h => html`
          <div key=${h.id} class="item-lista" style=${{ alignItems: 'flex-start' }}>
            <span><b>OS ${h.codigo}</b> — ${h.cliente}<br/><span class="dim">Motivo: ${h.motivo}</span><br/><small class="dim">Excluída por ${h.excluidoPor} em ${fmtData(h.excluidoEm)}</small></span>
            ${sessao.papel === 'admin' && html`<button class="btn btn-sm" onClick=${() => restaurar(h)}>↩ Restaurar</button>`}
          </div>`)}
      </div>
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
const pinta = (o) => temCores(o) ? { borderLeft: '5px solid ' + o.cores[0], background: 'linear-gradient(90deg,' + o.cores[1] + '22,#fff 60%)' } : undefined;
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
      if (o.status === 'elaboracao') o.status = 'producao';
      if (prox === 'montagem' && o.status === 'producao') o.status = 'montagem';
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
    <div class="card page-card stack">
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
        <div>
          <div class="po-emp">${empresa || 'Gestão Pró'}</div>
          <div class="po-tit">Ordem de Serviço</div>
          <div class="po-sub">${(os.ambientes || []).map(a => a.nome).filter(Boolean).join(' · ') || os.ambienteResumo || ''}</div>
        </div>
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

      <div class="po-esteira">
        ${ETAPAS_FAB.map(([k, t]) => { const e = et[k] || {}; return html`<div key=${k} class=${'po-et ' + (e.status || 'pendente')}><i></i><b>${t}</b><small>${({ pendente: 'Pendente', andamento: 'Em andamento', pronto: 'Pronto' })[e.status || 'pendente']}${e.onde === 'terceirizada' ? ' · terceirizado' : ''}</small></div>`; })}
      </div>

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
        const { id, numero } = await criarOS(sessao, res, {
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
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [amb, setAmb] = useState('');
  useEffect(() => {
    const { onSnapshot, query, orderBy } = F().fsMod;
    return onSnapshot(query(col('empresas', sessao.empresaId, 'os'), orderBy('numero', 'desc')), s => setLista(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setLista([]));
  }, [sessao.empresaId]);
  const os = lista || [];
  const st = (v) => os.filter(o => (STATUS_OS.find(x => x.v === o.status) ? o.status : 'elaboracao') === v).length;
  const pct = (n) => os.length ? Math.round(n * 100 / os.length) + '% do fluxo' : '0% do fluxo';
  const nAtr = os.filter(atrasada).length;
  const tiles = [
    { t: 'Total', n: os.length, s: '100% da carteira', cls: '' },
    { t: '1. Elaboração', n: st('elaboracao'), s: pct(st('elaboracao')), cls: '', f: 'elaboracao' },
    { t: '2. Produção', n: st('producao'), s: pct(st('producao')), cls: 'tile-teal', f: 'producao' },
    { t: '3. Montagem', n: st('montagem'), s: pct(st('montagem')), cls: 'tile-roxo', f: 'montagem' },
    { t: '4. Concluída', n: st('concluida'), s: pct(st('concluida')), cls: 'tile-ok', f: 'concluida' },
    { t: 'Atrasadas', n: nAtr, s: nAtr ? 'Precisa de atenção' : 'Tudo em dia', cls: nAtr ? 'tile-danger' : '', f: 'atrasadas' },
  ];
  const filtradas = os.filter(o =>
    (!status || (status === 'atrasadas' ? atrasada(o) : (STATUS_OS.find(x => x.v === o.status) ? o.status : 'elaboracao') === status)) &&
    (!amb || categoriasDaOS(o).includes(amb)) &&
    (!busca || norm(`${numOS(o)} ${o.numero} ${o.numeroAntigo} ${o.cliente?.nome} ${o.cliente?.obra} ${(o.ambientes || []).map(a => a.nome).join(' ')}`).includes(norm(busca))));

  return html`
    <div class="fade-up stack" style=${{ gap: '16px' }}>
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

function Principal({ sessao, toast }) {
  const [aba, setAba] = useState(() => { try { return localStorage.getItem('osm_aba') || 'inicio'; } catch { return 'inicio'; } });
  const [osAberta, setOsAberta] = useState(null);
  const [conta, setConta] = useState(false);
  const [statusIA, setStatusIA] = useState(null);
  const catalogo = useCatalogo(sessao.empresaId);

  useEffect(() => { try { localStorage.setItem('osm_aba', aba); } catch {} }, [aba]);
  useEffect(() => { fetch('/api/status').then(r => r.json()).then(setStatusIA).catch(() => setStatusIA({ ia: false })); }, []);

  const abrirOS = (id) => { setOsAberta(id); setAba('os'); window.scrollTo(0, 0); };
  const irPara = (v) => { setAba(v); if (v !== 'os') setOsAberta(null); window.scrollTo(0, 0); };
  const abas = [
    { v: 'inicio', t: 'Início', i: '⌂' },
    { v: 'quadro', t: 'Quadro geral', i: '📊' },
    { v: 'os', t: 'Ordens de Serviço', i: '📋' },
    { v: 'contratos', t: 'Contratos', i: '📑' },
    { v: 'projetos', t: 'Reuniões & Projetos', i: '✨' },
    { v: 'importar', t: 'Importar (IA)', i: '🗂️' },
    { v: 'catalogo', t: 'Catálogo', i: '🎨' },
    ...(sessao.papel === 'admin' ? [{ v: 'equipe', t: 'Equipe', i: '👥' }] : []),
    { v: 'cronograma', t: 'Cronogramas', i: '📅' },
    { v: 'excluir', t: 'Excluir OSs', i: '🗑' },
  ];
  const iniciais = (sessao.nome || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  return html`
    <div>
      <header class="topo">
        <div class="topo-in">
          <div class="brand-mini">
            <div class="brand-mark">GP</div>
            <div>
              <div class="row" style=${{ gap: '6px' }}><b style=${{ fontFamily: 'var(--font-display)', fontSize: '16px' }}>Gestão Pró</b><span class="tag">GESTÃO</span></div>
              <div class="dim" style=${{ fontSize: '12px' }}>🏢 ${sessao.empresaNome}</div>
            </div>
          </div>
          <nav class="pillnav">
            ${abas.map(a => html`<button key=${a.v} class=${aba === a.v ? 'on' : ''} onClick=${() => irPara(a.v)}><span class="ico">${a.i}</span>${a.t}</button>`)}
          </nav>
          <div class="row" style=${{ gap: '8px' }}>
            <button class="user-box" onClick=${() => setConta(true)} title="Minha conta">
              <span class="avatar">${iniciais}</span>
              <span style=${{ textAlign: 'left', lineHeight: 1.2 }}><b style=${{ fontSize: '13px' }}>${sessao.nome}</b><br/><span class="ok-txt">● ${(PAPEIS.find(p => p.v === sessao.papel) || {}).t}</span></span>
            </button>
            <button class="btn btn-ghost btn-sm" title="Atualizar o app e os dados" onClick=${async () => { try { const ks = await caches?.keys?.(); ks && ks.forEach(k => caches.delete(k)); } catch {} location.reload(); }}>⟳ Atualizar</button>
            <button class="btn btn-ghost btn-sm" title="Sair" onClick=${() => F().authMod.signOut(F().auth)}>⇥ Sair</button>
          </div>
        </div>
      </header>
      <div class="shell" style=${{ paddingTop: '20px' }}>
        ${statusIA && !statusIA.ia && html`<div class="warn-box" style=${{ marginBottom: '12px' }}>A IA ainda não está ligada no servidor. Dá pra usar tudo à mão.</div>`}
        ${aba === 'inicio' && html`<${TelaInicio} sessao=${sessao} abrirOS=${abrirOS} irPara=${irPara} />`}
        ${aba === 'projetos' && html`<${TelaProjetos} sessao=${sessao} catalogo=${catalogo} toast=${toast} abrirOS=${abrirOS} />`}
        ${aba === 'os' && html`<${TelaOS} sessao=${sessao} catalogo=${catalogo} toast=${toast} osAberta=${osAberta} setOsAberta=${setOsAberta} />`}
        ${aba === 'importar' && html`<${TelaImportar} sessao=${sessao} catalogo=${catalogo} toast=${toast} abrirOS=${abrirOS} />`}
        ${aba === 'catalogo' && html`<${TelaCatalogo} sessao=${sessao} catalogo=${catalogo} toast=${toast} />`}
        ${aba === 'equipe' && sessao.papel === 'admin' && html`<${TelaEquipe} sessao=${sessao} toast=${toast} />`}
        ${aba === 'contratos' && html`<${TelaContratos} sessao=${sessao} catalogo=${catalogo} toast=${toast} abrirOS=${abrirOS} />`}
        ${aba === 'quadro' && html`<${QuadroGeral} sessao=${sessao} abrirOS=${abrirOS} toast=${toast} />`}
        ${aba === 'cronograma' && html`<${TelaCronograma} sessao=${sessao} abrirOS=${abrirOS} toast=${toast} />`}
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
