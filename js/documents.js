/* =========================================================
   Pacto Ipiranga — geração dos documentos (PDF e Word)
   Reproduz o "Cartão PACTO" (Cartao_PACTO_Ipiranga.pptx).
   Depende de: assets/vendor/jspdf.umd.min.js (window.jspdf)
               assets/vendor/docx.iife.js      (window.docx)
   ========================================================= */

export const CORES = {
  azul: '0045B5',
  amarelo: 'FFD100',
  amareloClaro: 'FFF3B0',
  laranja: 'FF6900',
  cinza: '6B7180',
  linha: 'C9CDD6',
  tinta: '1B2240',
  branco: 'FFFFFF',
};

export const BLOCOS = [
  { letra: 'P', campo: 'prioridade',  titulo: 'Prioridade',  pergunta: 'O que realmente precisa de mim esta semana, no meio de tudo?' },
  { letra: 'A', campo: 'acao',        titulo: 'Ação',        pergunta: 'Qual movimento concreto eu faço? (não “renovar” — o passo que antecipa)' },
  { letra: 'C', campo: 'compromisso', titulo: 'Compromisso', pergunta: 'O que eu assumo, sem esperar que outra área resolva por mim?' },
  { letra: 'T', campo: 'tempo',       titulo: 'Tempo',       pergunta: 'Quando? Que dia e hora isso entra na minha agenda?' },
  { letra: 'O', campo: 'olhar',       titulo: 'Olhar',       pergunta: 'Como eu acompanho? O que observo pra saber se avancei?' },
];

const TEXTOS = {
  selo: 'PACTO DE EXECUÇÃO',
  titulo: 'MEU PACTO DA SEMANA',
  subtitulo: 'Tirar uma prioridade da intenção e colocá-la na agenda. Um caso real — nome e sobrenome.',
  compromisso: 'Eu me comprometo com este pacto.',
  rodapeEsq: 'Cultura Ipiranga · Um time cinco estrelas',
  rodapeDir: 'Abastecendo a vida em movimento',
};

/* ---------- utilitários ---------- */

export function formatarData(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

export function formatarDataHora(isoLocal) {
  if (!isoLocal) return '';
  const [data, hora] = isoLocal.split('T');
  const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const [a, m, d] = data.split('-').map(Number);
  const dia = dias[new Date(a, m - 1, d).getDay()];
  return `${dia}, ${formatarData(data)}${hora ? ' às ' + hora.slice(0, 5) : ''}`;
}

/** Texto final do bloco T: agenda (se informada) + detalhe escrito. */
export function textoTempo(dados) {
  const agenda = dados.tempoAgenda ? `Na agenda: ${formatarDataHora(dados.tempoAgenda)}.` : '';
  return [agenda, (dados.tempo || '').trim()].filter(Boolean).join('\n');
}

function respostaDo(bloco, dados) {
  return bloco.campo === 'tempo' ? textoTempo(dados) : (dados[bloco.campo] || '').trim();
}

export function nomeArquivo(dados, ext) {
  const limpar = (s) =>
    (s || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      .slice(0, 40);
  const partes = ['Pacto-Ipiranga', limpar(dados.consultor), dados.semanaDe || ''].filter(Boolean);
  return `${partes.join('_')}.${ext}`;
}

function dataUrlParaBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1] || '';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/* =========================================================
   PDF (A4, mm)
   ========================================================= */

export function gerarPDF(dados, recursos) {
  const { jsPDF } = globalThis.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: 'Meu Pacto da Semana — Pacto Ipiranga', author: dados.consultor || '', creator: 'Crivo Hub' });

  const W = 210, H = 297, M = 16, R = W - M;
  const hex = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  const cor = (h) => doc.setTextColor(...hex(h));
  const preencher = (h) => doc.setFillColor(...hex(h));
  const traco = (h) => doc.setDrawColor(...hex(h));
  const fonte = (estilo, tam) => { doc.setFont('helvetica', estilo); doc.setFontSize(tam); };

  const rodape = () => {
    fonte('bold', 8.5); cor(CORES.azul);
    doc.text(TEXTOS.rodapeEsq, M, H - 10);
    fonte('italic', 8.5); cor(CORES.laranja);
    doc.text(TEXTOS.rodapeDir, R, H - 10, { align: 'right' });
  };

  const cabecalho = (alto) => {
    preencher(CORES.azul);
    doc.rect(0, 0, W, alto, 'F');
    const lh = alto > 20 ? 11 : 7.5;
    const lw = lh * (recursos.logo.w / recursos.logo.h);
    doc.addImage(recursos.logo.dataUrl, 'PNG', M, (alto - lh) / 2, lw, lh);
    fonte('bold', alto > 20 ? 9.5 : 8); cor(CORES.amarelo);
    doc.text(TEXTOS.selo, R, alto / 2 + 1.3, { align: 'right' });
  };

  /* página 1 */
  cabecalho(30);
  let y = 45;
  fonte('normal', 23); cor(CORES.azul);
  doc.text(TEXTOS.titulo, M, y);
  y += 7;
  fonte('italic', 9.5); cor(CORES.cinza);
  doc.text(TEXTOS.subtitulo, M, y);

  /* identificação */
  const campoLinha = (rotulo, valor, x1, x2, yy) => {
    fonte('bold', 8); cor(CORES.azul);
    doc.text(rotulo, x1, yy);
    fonte('normal', 11); cor(CORES.tinta);
    const txt = doc.splitTextToSize(valor || '', x2 - x1 - 2)[0] || '';
    doc.text(txt, x1, yy + 7);
    traco(CORES.linha); doc.setLineWidth(0.35);
    doc.line(x1, yy + 10, x2, yy + 10);
  };
  y += 11;
  campoLinha('CONSULTOR(A)', dados.consultor, M, 110, y);
  campoLinha('SEMANA DE', formatarData(dados.semanaDe), 118, R, y);
  y += 17;
  campoLinha('CLIENTE / POSTO FOCO', dados.clientePosto, M, R, y);
  y += 19;

  /* blocos P·A·C·T·O */
  const xTexto = M + 20;
  const largTexto = R - xTexto;
  const limiteY = H - 17;

  BLOCOS.forEach((b) => {
    fonte('normal', 10.5);
    const linhas = doc.splitTextToSize(respostaDo(b, dados) || '—', largTexto);
    const alturaBloco = Math.max(21, 15 + linhas.length * 4.9 + 3.5);

    if (y + alturaBloco > limiteY) {
      rodape();
      doc.addPage();
      cabecalho(16);
      y = 28;
    }

    preencher(CORES.azul);
    doc.roundedRect(M, y, 14, 14, 2.2, 2.2, 'F');
    fonte('normal', 19); cor(CORES.branco);
    doc.text(b.letra, M + 7, y + 10.2, { align: 'center' });

    fonte('bold', 11.5); cor(CORES.azul);
    doc.text(b.titulo, xTexto, y + 4.5);
    fonte('italic', 8.5); cor(CORES.cinza);
    doc.text(b.pergunta, xTexto, y + 9.5);

    fonte('normal', 10.5); cor(CORES.tinta);
    doc.text(linhas, xTexto, y + 16.5, { lineHeightFactor: 1.32 });

    const yLinha = y + alturaBloco - 2;
    traco(CORES.linha); doc.setLineWidth(0.3);
    doc.line(xTexto, yLinha, R, yLinha);
    y = yLinha + 4;
  });

  /* caixa de compromisso */
  const alturaCaixa = 36;
  if (y + alturaCaixa > limiteY) {
    rodape();
    doc.addPage();
    cabecalho(16);
    y = 28;
  }
  y += 2;
  preencher(CORES.amareloClaro); traco(CORES.amarelo); doc.setLineWidth(0.5);
  doc.roundedRect(M, y, R - M, alturaCaixa, 2.5, 2.5, 'FD');
  fonte('bold', 11.5); cor(CORES.azul);
  doc.text(TEXTOS.compromisso, M + 8, y + 9);

  const yLinhaAss = y + alturaCaixa - 8.5;
  if (recursos.assinatura) {
    const props = doc.getImageProperties(recursos.assinatura);
    const ah = 15;
    const aw = Math.min(90, ah * (props.width / props.height));
    doc.addImage(recursos.assinatura, 'PNG', M + 8, yLinhaAss - ah - 0.5, aw, ah);
  }
  traco(CORES.azul); doc.setLineWidth(0.35);
  doc.line(M + 6, yLinhaAss, 118, yLinhaAss);
  doc.line(132, yLinhaAss, R - 6, yLinhaAss);
  fonte('normal', 11); cor(CORES.tinta);
  doc.text(formatarData(dados.dataAssinatura), 134, yLinhaAss - 2);
  fonte('normal', 8); cor(CORES.cinza);
  doc.text('Assinatura', M + 8, yLinhaAss + 4.5);
  doc.text('Data', 134, yLinhaAss + 4.5);

  rodape();
  return doc.output('blob');
}

/* =========================================================
   WORD (.docx)
   ========================================================= */

export async function gerarDOCX(dados, recursos) {
  const {
    Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
    WidthType, BorderStyle, ShadingType, AlignmentType, VerticalAlign, TabStopType, Footer,
  } = globalThis.docx;

  const FONTE = 'Calibri';
  const LARG = 9638; // largura útil A4 com margens de 0,85" (twips)
  const semBorda = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const bordasNenhuma = { top: semBorda, bottom: semBorda, left: semBorda, right: semBorda, insideHorizontal: semBorda, insideVertical: semBorda };
  const linhaBaixo = (c = CORES.linha, s = 6) => ({ top: semBorda, left: semBorda, right: semBorda, bottom: { style: BorderStyle.SINGLE, size: s, color: c } });

  const t = (text, o = {}) => new TextRun({ text, font: FONTE, ...o });
  const vazio = (after = 0) => new Paragraph({ spacing: { after }, children: [] });

  /* cabeçalho azul */
  const logoW = 170, logoH = Math.round(170 * (recursos.logo.h / recursos.logo.w));
  const cabecalho = new Table({
    width: { size: LARG, type: WidthType.DXA },
    columnWidths: [LARG / 2, LARG / 2],
    borders: bordasNenhuma,
    rows: [new TableRow({
      height: { value: 1250, rule: 'atLeast' },
      children: [
        new TableCell({
          width: { size: LARG / 2, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: CORES.azul },
          verticalAlign: VerticalAlign.CENTER,
          margins: { left: 280, top: 200, bottom: 200 },
          children: [new Paragraph({ children: [new ImageRun({ type: 'png', data: recursos.logo.bytes, transformation: { width: logoW, height: logoH } })] })],
        }),
        new TableCell({
          width: { size: LARG / 2, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: CORES.azul },
          verticalAlign: VerticalAlign.CENTER,
          margins: { right: 280 },
          children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [t(TEXTOS.selo, { bold: true, size: 20, color: CORES.amarelo })] })],
        }),
      ],
    })],
  });

  /* identificação */
  const celulaCampo = (rotulo, valor, largura) => new TableCell({
    width: { size: largura, type: WidthType.DXA },
    borders: linhaBaixo(),
    margins: { top: 120, bottom: 80, right: 200 },
    children: [
      new Paragraph({ spacing: { after: 60 }, children: [t(rotulo, { bold: true, size: 16, color: CORES.azul })] }),
      new Paragraph({ children: [t(valor || ' ', { size: 22, color: CORES.tinta })] }),
    ],
  });
  const espaco = (largura) => new TableCell({ width: { size: largura, type: WidthType.DXA }, borders: bordasNenhuma, children: [vazio()] });

  const identificacao = new Table({
    width: { size: LARG, type: WidthType.DXA },
    columnWidths: [5100, 400, 4138],
    borders: bordasNenhuma,
    rows: [
      new TableRow({ children: [celulaCampo('CONSULTOR(A)', dados.consultor, 5100), espaco(400), celulaCampo('SEMANA DE', formatarData(dados.semanaDe), 4138)] }),
      new TableRow({ children: [new TableCell({
        columnSpan: 3, width: { size: LARG, type: WidthType.DXA }, borders: linhaBaixo(),
        margins: { top: 200, bottom: 80 },
        children: [
          new Paragraph({ spacing: { after: 60 }, children: [t('CLIENTE / POSTO FOCO', { bold: true, size: 16, color: CORES.azul })] }),
          new Paragraph({ children: [t(dados.clientePosto || ' ', { size: 22, color: CORES.tinta })] }),
        ],
      })] }),
    ],
  });

  /* blocos PACTO */
  const COL_LETRA = 900, COL_GAP = 300, COL_TXT = LARG - COL_LETRA - COL_GAP;
  const linhasPacto = BLOCOS.map((b) => {
    const resposta = respostaDo(b, dados) || '—';
    const paragrafosResposta = resposta.split('\n').map((l, i, arr) => new Paragraph({
      spacing: { after: i === arr.length - 1 ? 0 : 40, line: 290 },
      children: [t(l, { size: 21, color: CORES.tinta })],
    }));
    return new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: COL_LETRA, type: WidthType.DXA },
          borders: bordasNenhuma,
          margins: { top: 240 },
          children: [new Table({
            width: { size: 760, type: WidthType.DXA },
            columnWidths: [760],
            borders: bordasNenhuma,
            rows: [new TableRow({
              height: { value: 760, rule: 'exact' },
              children: [new TableCell({
                width: { size: 760, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, color: 'auto', fill: CORES.azul },
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [t(b.letra, { size: 36, color: CORES.branco })] })],
              })],
            })],
          })],
        }),
        espaco(COL_GAP),
        new TableCell({
          width: { size: COL_TXT, type: WidthType.DXA },
          borders: linhaBaixo(),
          margins: { top: 240, bottom: 220 },
          children: [
            new Paragraph({ spacing: { after: 40 }, children: [t(b.titulo, { bold: true, size: 24, color: CORES.azul })] }),
            new Paragraph({ spacing: { after: 120 }, children: [t(b.pergunta, { italics: true, size: 18, color: CORES.cinza })] }),
            ...paragrafosResposta,
          ],
        }),
      ],
    });
  });
  const tabelaPacto = new Table({
    width: { size: LARG, type: WidthType.DXA },
    columnWidths: [COL_LETRA, COL_GAP, COL_TXT],
    borders: bordasNenhuma,
    rows: linhasPacto,
  });

  /* compromisso */
  const bordaAmarela = { style: BorderStyle.SINGLE, size: 8, color: CORES.amarelo };
  const assinaturaParagrafo = recursos.assinatura
    ? new Paragraph({ children: [new ImageRun({ type: 'png', data: dataUrlParaBytes(recursos.assinatura), transformation: { width: recursos.assinaturaW || 240, height: recursos.assinaturaH || 60 } })] })
    : vazio(600);

  const compromisso = new Table({
    width: { size: LARG, type: WidthType.DXA },
    columnWidths: [LARG],
    rows: [new TableRow({
      cantSplit: true,
      children: [new TableCell({
        width: { size: LARG, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: CORES.amareloClaro },
        borders: { top: bordaAmarela, bottom: bordaAmarela, left: bordaAmarela, right: bordaAmarela },
        margins: { top: 240, bottom: 240, left: 360, right: 360 },
        children: [
          new Paragraph({ spacing: { after: 120 }, children: [t(TEXTOS.compromisso, { bold: true, size: 24, color: CORES.azul })] }),
          new Table({
            width: { size: LARG - 720, type: WidthType.DXA },
            columnWidths: [5400, 600, LARG - 720 - 6000],
            borders: bordasNenhuma,
            rows: [
              new TableRow({ children: [
                new TableCell({ width: { size: 5400, type: WidthType.DXA }, verticalAlign: VerticalAlign.BOTTOM, borders: linhaBaixo(CORES.azul, 8), children: [assinaturaParagrafo] }),
                espaco(600),
                new TableCell({ width: { size: LARG - 720 - 6000, type: WidthType.DXA }, verticalAlign: VerticalAlign.BOTTOM, borders: linhaBaixo(CORES.azul, 8), children: [new Paragraph({ children: [t(formatarData(dados.dataAssinatura), { size: 22, color: CORES.tinta })] })] }),
              ] }),
              new TableRow({ children: [
                new TableCell({ width: { size: 5400, type: WidthType.DXA }, borders: bordasNenhuma, margins: { top: 60 }, children: [new Paragraph({ children: [t('Assinatura', { size: 16, color: CORES.cinza })] })] }),
                espaco(600),
                new TableCell({ width: { size: LARG - 720 - 6000, type: WidthType.DXA }, borders: bordasNenhuma, margins: { top: 60 }, children: [new Paragraph({ children: [t('Data', { size: 16, color: CORES.cinza })] })] }),
              ] }),
            ],
          }),
        ],
      })],
    })],
  });

  const rodape = new Footer({
    children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: LARG }],
      children: [
        t(TEXTOS.rodapeEsq, { bold: true, size: 17, color: CORES.azul }),
        t('\t' + TEXTOS.rodapeDir, { italics: true, size: 17, color: CORES.laranja }),
      ],
    })],
  });

  const documento = new Document({
    creator: 'Crivo Hub',
    title: 'Meu Pacto da Semana — Pacto Ipiranga',
    styles: { default: { document: { run: { font: FONTE } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 720, bottom: 900, left: 1134, right: 1134, footer: 400 },
        },
      },
      footers: { default: rodape },
      children: [
        cabecalho,
        vazio(280),
        new Paragraph({ spacing: { after: 80 }, children: [t(TEXTOS.titulo, { size: 44, color: CORES.azul })] }),
        new Paragraph({ spacing: { after: 200 }, children: [t(TEXTOS.subtitulo, { italics: true, size: 19, color: CORES.cinza })] }),
        identificacao,
        vazio(120),
        tabelaPacto,
        vazio(280),
        compromisso,
      ],
    }],
  });

  return Packer.toBlob(documento);
}
