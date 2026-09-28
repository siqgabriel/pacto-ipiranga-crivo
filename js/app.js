/* =========================================================
   Pacto Ipiranga — lógica da página
   ========================================================= */

import { firebaseConfig, COLECAO } from './firebase-config.js';
import { gerarPDF, gerarDOCX, nomeArquivo, BLOCOS } from './documents.js';

const FIREBASE_VERSAO = '12.19.0';
const CHAVE_RASCUNHO = 'pacto-ipiranga:rascunho:v1';
const TEMPO_LIMITE_ENVIO = 12000;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const form = $('#form-pacto');
const botaoEnviar = $('#botao-enviar');
const erroGeral = $('#erro-geral');
const fechamento = $('#fechamento');
const statusEnvio = $('#status-envio');

let ultimoPacto = null;      // { dados, recursos }
let salvarNoFirestore = null;

/* ---------------------------------------------------------
   Firebase (carregado sob demanda, só se configurado)
   --------------------------------------------------------- */

const firebaseConfigurado = () =>
  firebaseConfig && firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith('COLE_');

const firebasePronto = (async () => {
  if (!firebaseConfigurado()) {
    console.warn('[Pacto] Firebase não configurado em js/firebase-config.js — os pactos não serão salvos.');
    return false;
  }
  try {
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSAO}`;
    const [{ initializeApp }, fs] = await Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-firestore.js`),
    ]);
    const app = initializeApp(firebaseConfig);
    const db = fs.getFirestore(app);
    salvarNoFirestore = (dados) =>
      fs.addDoc(fs.collection(db, COLECAO), { ...dados, criadoEm: fs.serverTimestamp() });
    return true;
  } catch (e) {
    console.error('[Pacto] Falha ao iniciar o Firebase:', e);
    return false;
  }
})();

/* ---------------------------------------------------------
   Datas padrão
   --------------------------------------------------------- */

const hojeISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const segundaDaSemanaISO = () => {
  const d = new Date();
  const dia = d.getDay();                 // 0 = domingo
  const ate = dia === 0 ? 1 : dia === 1 ? 0 : 8 - dia; // próxima segunda (ou hoje, se segunda)
  d.setDate(d.getDate() + ate);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

function preencherPadroes() {
  if (!form.semanaDe.value) form.semanaDe.value = segundaDaSemanaISO();
  if (!form.dataAssinatura.value) form.dataAssinatura.value = hojeISO();
}

/* ---------------------------------------------------------
   Textareas que crescem
   --------------------------------------------------------- */

function ajustarAltura(t) {
  t.style.height = 'auto';
  t.style.height = `${t.scrollHeight + 2}px`;
}
$$('textarea', form).forEach((t) => {
  t.addEventListener('input', () => ajustarAltura(t));
  ajustarAltura(t);
});
window.addEventListener('resize', () => $$('textarea', form).forEach(ajustarAltura));

/* ---------------------------------------------------------
   Progresso P·A·C·T·O
   --------------------------------------------------------- */

const campoDoBloco = { prioridade: 'prioridade', acao: 'acao', compromisso: 'compromisso', tempo: 'tempoAgenda', olhar: 'olhar' };

function atualizarProgresso() {
  let feitos = 0;
  BLOCOS.forEach(({ campo }) => {
    const valor = form[campoDoBloco[campo]].value.trim();
    const ok = valor.length > 1 || (campo === 'tempo' && valor.length > 0);
    if (ok) feitos++;
    $(`#campo-${campo}`).classList.toggle('feito', ok);
    $(`.progresso__letras li[data-letra="${campo}"]`).classList.toggle('feito', ok);
  });
  $('#contagem').textContent = feitos;
}

/* ---------------------------------------------------------
   Assinatura (canvas)
   --------------------------------------------------------- */

const tela = $('#tela-assinatura');
const telaWrap = $('#tela-wrap');
const ctx = tela.getContext('2d');
let desenhando = false;
let temTinta = false;
let tracos = [];      // para redesenhar ao redimensionar
let tracoAtual = null;

function configurarTela() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const { width, height } = tela.getBoundingClientRect();
  tela.width = Math.round(width * dpr);
  tela.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1B2240';
  ctx.lineWidth = 2.4;
  redesenhar();
}

function redesenhar() {
  const { width, height } = tela.getBoundingClientRect();
  ctx.clearRect(0, 0, width, height);
  tracos.forEach((pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * width, y * height) : ctx.moveTo(x * width, y * height)));
    if (pts.length === 1) ctx.lineTo(pts[0][0] * width + 0.1, pts[0][1] * height);
    ctx.stroke();
  });
}

function ponto(e) {
  const r = tela.getBoundingClientRect();
  return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
}

tela.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  tela.setPointerCapture(e.pointerId);
  desenhando = true;
  tracoAtual = [ponto(e)];
  tracos.push(tracoAtual);
  redesenhar();
});
tela.addEventListener('pointermove', (e) => {
  if (!desenhando) return;
  tracoAtual.push(ponto(e));
  redesenhar();
});
const terminar = () => {
  if (!desenhando) return;
  desenhando = false;
  temTinta = tracos.some((t) => t.length > 2);
  telaWrap.classList.toggle('assinada', tracos.length > 0);
  if (temTinta) telaWrap.classList.remove('invalido');
};
tela.addEventListener('pointerup', terminar);
tela.addEventListener('pointercancel', terminar);
tela.addEventListener('pointerleave', terminar);

$('#limpar-assinatura').addEventListener('click', () => {
  tracos = [];
  temTinta = false;
  telaWrap.classList.remove('assinada');
  redesenhar();
});

let redimTimer;
new ResizeObserver(() => {
  clearTimeout(redimTimer);
  redimTimer = setTimeout(configurarTela, 60);
}).observe(telaWrap);

/** Exporta a assinatura recortada, em tinta azul-escura, fundo transparente. */
function exportarAssinatura() {
  if (!temTinta) return null;
  const { width, height } = tela.getBoundingClientRect();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  tracos.flat().forEach(([x, y]) => {
    minX = Math.min(minX, x * width); maxX = Math.max(maxX, x * width);
    minY = Math.min(minY, y * height); maxY = Math.max(maxY, y * height);
  });
  const pad = 6;
  const w = Math.max(20, maxX - minX + pad * 2);
  const h = Math.max(20, maxY - minY + pad * 2);
  const escala = Math.min(3, 900 / w);
  const c = document.createElement('canvas');
  c.width = Math.round(w * escala);
  c.height = Math.round(h * escala);
  const k = c.getContext('2d');
  k.setTransform(escala, 0, 0, escala, 0, 0);
  k.lineCap = 'round'; k.lineJoin = 'round'; k.strokeStyle = '#1B2240'; k.lineWidth = 2.6;
  tracos.forEach((pts) => {
    k.beginPath();
    pts.forEach(([x, y], i) => {
      const px = x * width - minX + pad, py = y * height - minY + pad;
      i ? k.lineTo(px, py) : k.moveTo(px, py);
    });
    k.stroke();
  });
  return { dataUrl: c.toDataURL('image/png'), w: c.width, h: c.height };
}

/* ---------------------------------------------------------
   Rascunho local (não inclui a assinatura)
   --------------------------------------------------------- */

const CAMPOS_RASCUNHO = ['consultor', 'semanaDe', 'clientePosto', 'prioridade', 'acao', 'compromisso', 'tempoAgenda', 'tempo', 'olhar'];

function salvarRascunho() {
  try {
    const r = {};
    CAMPOS_RASCUNHO.forEach((c) => (r[c] = form[c].value));
    r.formato = form.formato.value;
    localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(r));
  } catch { /* armazenamento indisponível: segue sem rascunho */ }
}

function carregarRascunho() {
  try {
    const r = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) || 'null');
    if (!r) return;
    CAMPOS_RASCUNHO.forEach((c) => { if (r[c]) form[c].value = r[c]; });
    if (r.formato) {
      const radio = $(`input[name="formato"][value="${r.formato}"]`, form);
      if (radio) radio.checked = true;
    }
  } catch { /* ignora rascunho corrompido */ }
}

function limparRascunho() {
  try { localStorage.removeItem(CHAVE_RASCUNHO); } catch { /* nada */ }
}

let rascunhoTimer;
form.addEventListener('input', (e) => {
  atualizarProgresso();
  const bloco = e.target.closest('.campo-linha, .bloco');
  if (bloco) {
    bloco.classList.remove('invalido');
    e.target.classList.remove('invalido');
    bloco.querySelector('.msg-erro')?.remove();
  }
  clearTimeout(rascunhoTimer);
  rascunhoTimer = setTimeout(salvarRascunho, 400);
});
$('#comprometido').addEventListener('change', (e) => {
  if (e.target.checked) $('.assinatura').classList.remove('invalido');
});

/* ---------------------------------------------------------
   Validação
   --------------------------------------------------------- */

function marcarErro(el, msg) {
  const cont = el.closest('.campo-linha, .bloco') || el.parentElement;
  el.classList.add('invalido');
  cont.classList.add('invalido');
  if (msg && !cont.querySelector('.msg-erro')) {
    const p = document.createElement('p');
    p.className = 'msg-erro';
    p.textContent = msg;
    el.insertAdjacentElement('afterend', p);
  }
}

function validar() {
  $$('.msg-erro', form).forEach((m) => m.remove());
  $$('.invalido', form).forEach((m) => m.classList.remove('invalido'));
  const erros = [];

  const texto = (id, min, msg) => {
    const el = form[id];
    if (el.value.trim().length < min) { marcarErro(el, msg); erros.push(el); }
  };
  texto('consultor', 3, 'Escreva seu nome e sobrenome.');
  if (!form.semanaDe.value) { marcarErro(form.semanaDe, 'Informe a semana.'); erros.push(form.semanaDe); }
  texto('clientePosto', 2, 'Qual é o cliente ou posto foco?');
  texto('prioridade', 3, 'Qual é a prioridade da semana?');
  texto('acao', 3, 'Qual é o movimento concreto?');
  texto('compromisso', 3, 'O que você assume?');
  if (!form.tempoAgenda.value) { marcarErro(form.tempoAgenda, 'Coloque dia e hora na agenda.'); erros.push(form.tempoAgenda); }
  texto('olhar', 3, 'Como você vai acompanhar?');

  if (!form.comprometido.checked) {
    $('.assinatura').classList.add('invalido');
    erros.push(form.comprometido);
  }
  if (!temTinta) {
    telaWrap.classList.add('invalido');
    erros.push(tela);
  }
  if (!form.dataAssinatura.value) { form.dataAssinatura.classList.add('invalido'); erros.push(form.dataAssinatura); }

  return erros;
}

function mostrarErroGeral(msg) {
  erroGeral.textContent = msg;
  erroGeral.hidden = !msg;
}

/* ---------------------------------------------------------
   Recursos para os documentos
   --------------------------------------------------------- */

let logoCache = null;
async function carregarLogo() {
  if (logoCache) return logoCache;
  const resp = await fetch('assets/img/ipiranga-amarelo.png');
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  logoCache = { dataUrl: `data:image/png;base64,${btoa(bin)}`, bytes, w: 700, h: 195 };
  return logoCache;
}

function baixar(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function baixarPDF() {
  const { dados, recursos } = ultimoPacto;
  baixar(gerarPDF(dados, recursos), nomeArquivo(dados, 'pdf'));
}
async function baixarDOCX() {
  const { dados, recursos } = ultimoPacto;
  baixar(await gerarDOCX(dados, recursos), nomeArquivo(dados, 'docx'));
}

/* ---------------------------------------------------------
   Registro no Firestore
   --------------------------------------------------------- */

async function registrar() {
  const ok = await firebasePronto;
  if (!ok || !salvarNoFirestore) return 'desligado';
  const { dados, recursos } = ultimoPacto;
  const registro = {
    ...dados,
    comprometido: true,
    assinatura: recursos.assinatura,
    origem: location.hostname || 'local',
    versao: 1,
  };
  await Promise.race([
    salvarNoFirestore(registro),
    new Promise((_, rej) => setTimeout(() => rej(new Error('tempo esgotado')), TEMPO_LIMITE_ENVIO)),
  ]);
  return 'ok';
}

function mostrarStatus(resultado) {
  statusEnvio.className = 'status';
  $('#reenviar').hidden = true;
  if (resultado === 'ok') {
    statusEnvio.textContent = 'Seu pacto foi registrado.';
    statusEnvio.classList.add('ok');
  } else if (resultado === 'desligado') {
    statusEnvio.textContent = '';
  } else {
    statusEnvio.textContent = 'Não conseguimos registrar seu pacto online agora. Seu arquivo foi gerado normalmente.';
    statusEnvio.classList.add('falha');
    $('#reenviar').hidden = false;
  }
}

/* ---------------------------------------------------------
   Envio
   --------------------------------------------------------- */

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  mostrarErroGeral('');

  const erros = validar();
  if (erros.length) {
    mostrarErroGeral(erros.length === 1
      ? 'Falta só um item para firmar o seu pacto.'
      : `Faltam ${erros.length} itens para firmar o seu pacto. Eles estão destacados em laranja.`);
    const primeiro = erros[0];
    const alvo = primeiro === tela ? telaWrap : primeiro.closest('.bloco, .campo-linha, .assinatura') || primeiro;
    alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (primeiro !== tela) setTimeout(() => primeiro.focus({ preventScroll: true }), 350);
    return;
  }

  if (!globalThis.jspdf || !globalThis.docx) {
    mostrarErroGeral('Os geradores de documento ainda estão carregando. Tente de novo em alguns segundos.');
    return;
  }

  botaoEnviar.disabled = true;
  botaoEnviar.classList.add('carregando');

  try {
    const assinatura = exportarAssinatura();
    const logo = await carregarLogo();
    const dados = {
      consultor: form.consultor.value.trim(),
      semanaDe: form.semanaDe.value,
      clientePosto: form.clientePosto.value.trim(),
      prioridade: form.prioridade.value.trim(),
      acao: form.acao.value.trim(),
      compromisso: form.compromisso.value.trim(),
      tempo: form.tempo.value.trim(),
      tempoAgenda: form.tempoAgenda.value,
      olhar: form.olhar.value.trim(),
      dataAssinatura: form.dataAssinatura.value,
      formato: form.formato.value,
    };
    // Assinatura no Word: largura ~240px mantendo proporção
    const aw = 240, ah = Math.max(30, Math.round(aw * (assinatura.h / assinatura.w)));
    ultimoPacto = {
      dados,
      recursos: { logo, assinatura: assinatura.dataUrl, assinaturaW: ah > 80 ? Math.round(80 * assinatura.w / assinatura.h) : aw, assinaturaH: Math.min(ah, 80) },
    };

    // Registra em paralelo enquanto gera os arquivos
    const registroPromessa = registrar().catch((err) => { console.error('[Pacto] Falha ao registrar:', err); return 'falha'; });

    if (dados.formato === 'pdf' || dados.formato === 'ambos') await baixarPDF();
    if (dados.formato === 'docx' || dados.formato === 'ambos') {
      if (dados.formato === 'ambos') await new Promise((r) => setTimeout(r, 600));
      await baixarDOCX();
    }

    const resultado = await registroPromessa;
    mostrarStatus(resultado);
    if (resultado !== 'falha') limparRascunho();

    fechamento.hidden = false;
    requestAnimationFrame(() => {
      fechamento.scrollIntoView({ behavior: 'smooth', block: 'start' });
      fechamento.focus({ preventScroll: true });
    });
  } catch (err) {
    console.error(err);
    mostrarErroGeral('Algo deu errado ao gerar o seu pacto. Tente novamente.');
  } finally {
    botaoEnviar.disabled = false;
    botaoEnviar.classList.remove('carregando');
  }
});

/* ---------------------------------------------------------
   Ações do fechamento
   --------------------------------------------------------- */

$('#baixar-pdf').addEventListener('click', () => ultimoPacto && baixarPDF());
$('#baixar-docx').addEventListener('click', () => ultimoPacto && baixarDOCX());

$('#reenviar').addEventListener('click', async (e) => {
  const b = e.currentTarget;
  b.disabled = true;
  statusEnvio.textContent = 'Registrando…';
  statusEnvio.className = 'status';
  const r = await registrar().catch(() => 'falha');
  mostrarStatus(r);
  if (r === 'ok') limparRascunho();
  b.disabled = false;
});

$('#novo-pacto').addEventListener('click', () => {
  form.reset();
  limparRascunho();
  tracos = []; temTinta = false;
  telaWrap.classList.remove('assinada');
  redesenhar();
  preencherPadroes();
  $$('textarea', form).forEach(ajustarAltura);
  atualizarProgresso();
  fechamento.hidden = true;
  ultimoPacto = null;
  $('#pacto').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => form.consultor.focus({ preventScroll: true }), 400);
});

/* ---------------------------------------------------------
   Início
   --------------------------------------------------------- */

carregarRascunho();
preencherPadroes();
$$('textarea', form).forEach(ajustarAltura);
atualizarProgresso();
configurarTela();
