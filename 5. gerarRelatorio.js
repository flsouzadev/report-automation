/** DADOS DA PLANILHA */
function buildDataSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allValuesSheet = ss.getDataRange().getValues();
  const id = ss.getId();
  const spreadsheetCapa = ss.getSheets()[0];
  const spreadsheetAcompanhamento = ss.getSheets()[1];
  const spreadsheetLabpos = ss.getRange("labpos").getValue();
  const dot = spreadsheetCapa.getRange("dot").getValue();
  const valueCheckbox = ss.getRange("checkBox").getValue();
  const spreadsheetResultado = valueCheckbox ? ss.getSheets()[5] : ss.getSheets()[4];
  const dadosArrayResultado = spreadsheetResultado.getRange('A1:L' + spreadsheetResultado.getLastRow()).getValues();

  return {
    ss,
    allValuesSheet,
    id,
    spreadsheetCapa,
    spreadsheetAcompanhamento,
    spreadsheetLabpos,
    dot,
    valueCheckbox,
    spreadsheetResultado,
    indexNamedRangeConclusao: spreadsheetResultado.getRange("conclusao").getRowIndex(),
    indexNamedRangeResultado: spreadsheetResultado.getRange("resultado").getRowIndex(),
    namedRangeResultado: spreadsheetResultado.getRange("resultado").getValue(),
    namedRangeConclusao: spreadsheetResultado.getRange("conclusao").getValue(),
    dadosArrayResultado,
  };
}

/** DADOS DA PASTA ATUAL */
function buildDataCurrentFolder(dataSpreadsheet) {
  const folder = DriveApp.getFileById(dataSpreadsheet.id).getParents().next();
  const name = folder.getName();
  const folderId = folder.getId();

  return {
    folder,
    name,
    id: folderId
  };
}

/** DADOS DO DOCUMENTO COPIADO */
function buildDataDocument(idFolderAtual, dot) {
  // LOCAL DO ARQUIVO TEMPLATE PRODUÇÃO = https://drive.google.com/drive/folders/1hRIV-79CPGuKhmOwF5zVuPXd_XKko34m
  const docTemplate = DriveApp.getFileById('1fgQf3jp7h7O4f26NM2tj1ZePQPz3_9mLkv0RhycsZWA') // modelo do lab SG sem logo Anatel - Produção
    // const docTemplate = DriveApp.getFileById('1UtDvnPdbhXUSg1S_tyzR7EbnHRvaqPG5mN0hiXghv6Q') // com Logo Anatel

    .makeCopy(`${dot}`, DriveApp.getFolderById(idFolderAtual));
  const doc = DocumentApp.openById(docTemplate.getId());

  return {
    doc,
    nameDoc: doc.getName(),
    id: doc.getId(),
    body: doc.getBody(),
    tables: doc.getBody().getTables(),
    listItem: doc.getBody().getListItems(),
    text: doc.getBody().getText(),
    url: doc.getUrl()
  };
}

/**------------------------------------------------------------------------------------------------------------------------------ */

/** FUNÇÃO QUE MODIFICA O "DOCUMENTO" CONFORME TIPO DE RELATÓRIO A SER GERADO */
function deleteParagraphs(paragrafos, indexInit, indexEnd, dataDocument) {

  let i = 54; // valor cetado para não confundir com o texto do SUMÁRIO

  for (i; i < paragrafos.length; i++) {

    // Verifica se o parágrafo contém o conteúdo a ser deletado
    if (paragrafos[i].getText().includes(indexInit)) {

      do {
        if (paragrafos[i].getText() === "Condições ambientais") {

          i = i + 1;
          paragrafos[i].removeFromParent();
          dataDocument.body.replaceText("Umidade: {{umidade}}%", "{{condicoesAmbientais}}");

          return;
        }
        paragrafos[i].removeFromParent();
        i++;
      }
      while (!paragrafos[i].getText().includes(indexEnd));

      return;
    }
  }
}
function modifyDocument(dataSpreadsheet, dataDocument) {
  // verifica pelo índice da aba que está consumindo da planilha [04. RELATORIO / 05. RELATORIO(ANATEL)]
  if (dataSpreadsheet.spreadsheetResultado.getIndex() === 5) {

    // retorna todos os parágrafos do documento
    let paragrafos = dataDocument.body.getParagraphs();

    // Remove tabelas específicas do documento
    let tabelas = dataDocument.body.getTables();
    tabelas[1].removeFromParent(); // Remove tabela do Item 2;
    tabelas[2].removeFromParent(); // Remove a tabela do item 2.1;

    // primeiros dados a serem excluídos do documento
    let searchTextIdentificacaoItemEnsaio = "Identificação do item de ensaio";
    let searchTextInformacoesGerais = "Informações gerais"
    // deleta os parágrafos
    deleteParagraphs(paragrafos, searchTextIdentificacaoItemEnsaio, searchTextInformacoesGerais, dataDocument);
  }
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/** "CLASSE" PARA CONTROLAR A POSIÇÃO DO PONTEIRO DURANTE A CONSTRUÇÃO DO RELATÓRIO */
class Posicao {
  constructor() {
    this._posicaoAtual = 0;
  }

  get posicaoAtual() {
    return this._posicaoAtual;
  }

  set posicaoAtual(value) {
    this._posicaoAtual = value;
  }

  incrementPosicao() {
    this._posicaoAtual++;
    return this;
  }

  deletPosicao() {
    this._posicaoAtual--;
    return this;
  }

  resetPosicao() {
    this._posicaoAtual = 0;
    return this;
  }
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/**
 * Deleta de forma otimizada todos os textos que estão entre < e > em um documento.
 * Utiliza uma única chamada de API com expressão regular para máxima performance.
 *
 * @param {DocumentApp.Body} documentBody O corpo do documento.
 */
function deletePlaceholdersOptimized(documentBody) {
  // A expressão regular "<.*?>" significa:
  // <   : Encontre um caractere de abertura "<"
  // .   : Seguido por qualquer caractere
  // * : Que ocorra zero ou mais vezes
  // ?   : De forma "não gulosa" (para na primeira ocorrência de ">")
  // >   : Seguido por um caractere de fechamento ">"
  const searchPattern = "<.*?>";

  // Executa a substituição de todas as ocorrências encontradas por um texto vazio.
  documentBody.replaceText(searchPattern, "");
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/**
 * Deleta de forma otimizada todos os elementos do documento entre dois marcadores de texto.
 * Substitui as funções findElementWithText, deleteTextBetweenElements e deleteTextParameter.
 *
 * @param {DocumentApp.Body} documentBody O corpo do documento.
 * @param {Posicao} posicao O objeto que controla a posição do cursor para inserções futuras.
 */
function deleteRangeOptimized(documentBody, posicao) {
  const startText = "{{resultadoInit}}";
  const endText = "{{resultado}}";

  // Encontra os elementos marcadores
  const startRange = documentBody.findText(startText);
  const endRange = documentBody.findText(endText);

  // Se ambos os marcadores existirem, procede com a remoção
  if (startRange && endRange) {
    const startElement = startRange.getElement().getParent();
    const endElement = endRange.getElement().getParent();

    // Obtém o índice inicial e final do bloco a ser removido
    const startIndex = documentBody.getChildIndex(startElement);
    const endIndex = documentBody.getChildIndex(endElement);

    // ---> OTIMIZAÇÃO PRINCIPAL <---
    // Itera de trás para frente para remover os elementos.
    // Isso é muito mais rápido e estável, pois a remoção de um elemento
    // não afeta o índice dos elementos anteriores que ainda serão processados.
    for (let i = endIndex; i >= startIndex; i--) {
      // O try/catch previne erros caso o elemento já tenha sido removido
      // como parte de um elemento pai (o que é raro, mas seguro).
      try {
        documentBody.removeChild(documentBody.getChild(i));
      } catch (e) {
        Logger.log(`Não foi possível remover o elemento no índice ${i}, possivelmente já removido.`);
      }
    }

    // Define a posição para a próxima inserção de conteúdo.
    // O novo conteúdo será inserido onde o bloco removido começava.
    posicao.posicaoAtual = startIndex;
  }
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/**
 * OTIMIZADO: Preenche os dados estáticos da capa e do cabeçalho do documento.
 * Deve ser executada no início do script, logo após a criação do documento.
 */
function preencherCapaEHeader(sheetC, doc) {

  // Mapeamento apenas dos placeholders estáticos
  const mapeamentoEstatico = {
    "{{tipoComunicacao}}": "tipoComunicacao",
    "{{fabricante}}": "fabricante",
    "{{versaoSoftware}}": "versaoSoftware",
    "{{glab}}": "labpos",
    "{{op}}": "cotacao",
    "{{modelo}}": "modelo",
    "{{numeroDeSerie}}": "numeroDeSerie",
    "{{nomeInteressado/OCD}}": "nomeInteressado",
    "{{nomeCliente}}": "nomeCliente",
    "{{nomeDoContato}}": "nomeDoContatoCliente",
    "{{email}}": "emailCliente",
    "{{telefoneCliente}}": "telefoneCliente",
    "{{endereco}}": "enderecoCliente",
    "{{nomeDoEnsaio}}": "nomeDoEnsaio",
    "{{laboratorio}}": "laboratorio",
    "{{telefoneLaboratorio}}": "telefoneLaboratorio",
    "{{docApresentada}}": "referenciaNormativa",
    "{{condicoesAmbientais}}": "condicoesAmbientais"
  };

  const dadosParaSubstituir = {};
  for (const placeholder in mapeamentoEstatico) {
    const namedRange = mapeamentoEstatico[placeholder];
    let valor = sheetC.getRange(namedRange).getValue();
    if (placeholder === "{{nomeDoEnsaio}}") {
      valor = valor.toUpperCase();
    }
    dadosParaSubstituir[placeholder] = valor.toString();
  }

  // Substituição encadeada no corpo do documento
  const body = doc.getBody();
  for (const placeholder in dadosParaSubstituir) {
    // Usamos replaceText diretamente, que substitui todas as ocorrências
    body.replaceText(placeholder, dadosParaSubstituir[placeholder]);
  }

  // Substituição específica do DOT no cabeçalho
  const dotValue = sheetC.getRange("dot").getValue();
  doc.getHeader().getParent().replaceText("DOT-XXXXX.RE.XX-X", dotValue);
}


/**
 * OTIMIZADO: Preenche os placeholders "dinâmicos" e de "data" no final da execução.
 * Substitui todas as ocorrências de uma vez.
 */
function preencherPlaceholdersDinamicos(sheetC, doc) {

  function verifyDateNull(date) {
    return date ? Utilities.formatDate(new Date(date), "GMT-03:00", "dd/MM/yyyy") : "";
  }

  // Coleta e formata os dados de data
  const dataRecebimento = verifyDateNull(sheetC.getRange('dataRecebimentoItem').getValue());
  const dataInicio = verifyDateNull(sheetC.getRange('dataInicioEnsaio').getValue());
  const dataFinalizacao = verifyDateNull(sheetC.getRange('dataFinalizacaoEnsaio').getValue());
  const dataEmissao = Utilities.formatDate(new Date(), "GMT-03:00", "dd/MM/yyyy");

  // O método replaceText substitui TODAS as ocorrências do placeholder no corpo do documento.
  // Isso resolve o problema de ter {{dataEmissao}} na capa e na tabela final.
  const body = doc.getBody();
  body.replaceText("{{dataRecebimentoItem}}", dataRecebimento);
  body.replaceText("{{dataInicioEnsaio}}", dataInicio);
  body.replaceText("{{dataFinalizacaoEnsaio}}", dataFinalizacao);
  body.replaceText("{{dataEmissao}}", dataEmissao);
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/**
 * Extrai as linhas da tabela da matriz principal de dados. (Sua função original, mantida como está).
 */
function matrizArray(matriz, linha) {
  const resultadoFiltrado = [];
  for (let i = linha; i < matriz.length; i++) {
    if (matriz[i][0] === 'Tabela' || matriz[i][0] === '-') {
      const linhaResultante = matriz[i].slice(1).filter(cel => cel);
      resultadoFiltrado.push(linhaResultante);
    } else {
      break;
    }
  }
  return resultadoFiltrado;
}

/**
 * NOVA FUNÇÃO AUXILIAR: Prepara os dados para a tabela.
 * Converte números e datas para o formato de string correto ANTES de criar a tabela.
 * @param {any[][]} rawData Os dados brutos vindos da matrizArray.
 * @param {boolean} isKeyValueTable Indica se é uma tabela que precisa de formatação de número/data.
 * @returns {string[][]} Uma matriz 2D de strings, pronta para inserção.
 */
function prepareTableData(rawData, isKeyValueTable) {
  if (!isKeyValueTable) {
    // Para tabelas de cabeçalho, apenas garante que tudo é string.
    return rawData.map(row => row.map(cell => (cell === undefined || cell === null) ? "-" : String(cell)));
  }

  // Para tabelas Chave-Valor, aplica a formatação específica.
  return rawData.map(row => {
    return row.map(cellValue => {
      if (typeof cellValue === "number") {
        return Number.isInteger(cellValue)
          ? cellValue.toString() + ",0"
          : cellValue.toFixed(2).toString().replace(".", ",");
      }
      if (cellValue instanceof Date) {
        return Utilities.formatDate(cellValue, "GMT-3", "MM/yyyy");
      }
      if (cellValue === undefined || cellValue === null) {
        return "-";
      }
      return String(cellValue);
    });
  });
}

/**
 * Constrói uma tabela de forma otimizada, mantendo fielmente as regras de formatação originais.
 * Substitui a função buildTable original.
 */
function buildTableOtimizada(linha, body, posicao, dadosArrayResultado) {
  // --- PASSO 1: DEFINIR ESTILOS E PREPARAR DADOS ---
  const headerStyle = {
    [DocumentApp.Attribute.BOLD]: true,
    [DocumentApp.Attribute.BACKGROUND_COLOR]: "#DCDCDC",
    [DocumentApp.Attribute.FONT_FAMILY]: "Open Sans",
    [DocumentApp.Attribute.FONT_SIZE]: "9"
  };
  const textCellStyle = {
    [DocumentApp.Attribute.BACKGROUND_COLOR]: "#FFFFFF",
    [DocumentApp.Attribute.BOLD]: false,
    [DocumentApp.Attribute.FONT_FAMILY]: "Open Sans",
    [DocumentApp.Attribute.FONT_SIZE]: "9"
  };
  const paragraphyStyle = {
    [DocumentApp.Attribute.SPACING_AFTER]: 0,
    [DocumentApp.Attribute.LINE_SPACING]: 1
  };

  const rawData = matrizArray(dadosArrayResultado, linha);
  if (rawData.length === 0) return; // Se não houver dados, não faz nada.

  // Detecta o tipo de tabela para aplicar as regras corretas
  const firstCellText = rawData[0][0] || "";
  const isHeaderStyleTable = firstCellText === "Roteiro" || firstCellText === "Data de emissão" || firstCellText.startsWith("ID:");

  // Prepara os dados (números/datas) e cria a tabela de uma só vez
  const preparedData = prepareTableData(rawData, !isHeaderStyleTable);
  const table = body.insertTable(posicao.posicaoAtual, preparedData);

  // --- PASSO 2: APLICAR FORMATAÇÃO FIELMENTE ---
  if (isHeaderStyleTable) {
    // Regra para Tabelas de Cabeçalho (Roteiro, Data de Emissão, ID:)
    for (let i = 0; i < table.getNumRows(); i++) {
      const row = table.getRow(i);
      for (let j = 0; j < row.getNumCells(); j++) {
        const cell = row.getCell(j);
        if (i === 0 && (firstCellText === "Roteiro" || firstCellText === "Data de emissão")) {
          cell.setAttributes(headerStyle);
        } else {
          cell.setAttributes(textCellStyle);
        }
        const paraInCell = cell.getChild(0).asParagraph();
        paraInCell.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        paraInCell.setAttributes(paragraphyStyle);
      }
    }
  } else {
    // Regra para Tabelas "Chave-Valor" (o `else` do seu código)
    for (let i = 0; i < table.getNumRows(); i++) {
      const row = table.getRow(i);
      for (let j = 0; j < row.getNumCells(); j++) {
        const cell = row.getCell(j);
        if (j === 0) { // Primeira coluna
          cell.setAttributes(headerStyle);
        } else { // Outras colunas
          cell.setAttributes(textCellStyle);
        }
        cell.getChild(0).asParagraph().setAttributes(paragraphyStyle);
      }
    }
    // Replicando a regra específica de largura da célula (0,0)
    table.getRow(0).getCell(0).setWidth(125);
  }

  // --- PASSO 3: FINALIZAR E ATUALIZAR POSIÇÃO ---
  posicao.posicaoAtual = body.getChildIndex(table) + 1;
  body.insertParagraph(posicao.posicaoAtual, "");
  posicao.incrementPosicao();
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/** FUNÇÃO PARA INSERIR O GRÁFICO NO DOCUMENTO */
function atributosDaImagem(img, targetHeight) {
  var styles = {};
  styles[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = DocumentApp.HorizontalAlignment.CENTER;
  var height = img.getHeight();
  var width = img.getWidth();
  var factor = height / targetHeight;
  img.setHeight(height / factor);
  img.setWidth(width / factor);
  img.getParent().setAttributes(styles);
}

function inserirImagemGraficoNoDocs(imagemGrafico, body, posicao, colG) {

  // Insira a imagem no documento.
  var imgGraficoInserida = body.insertImage(posicao.posicaoAtual, imagemGrafico);// ver a posição do {{gráfico}}
  // Redimensiona a imagem.
  atributosDaImagem(imgGraficoInserida, 216)

  posicao.incrementPosicao();
}

function buildingGraficoToImage(spreadsheetAcompanhamento, body, posicao, colG) {

  var nomeGraficoDesejado = "Resultado Geral da Certificação";

  // Agora você pode continuar com a lógica para encontrar e manipular o gráfico.
  var graficos = spreadsheetAcompanhamento.getCharts();

  for (var i = 0; i < graficos.length; i++) {
    var grafico = graficos[i];

    // Adicione a lógica para identificar o gráfico desejado pelo nome.
    var opcoesGrafico = grafico.getOptions();
    var tituloGrafico = opcoesGrafico.get("title");

    if (tituloGrafico === nomeGraficoDesejado) {
      // Crie uma imagem a partir do gráfico.
      var imagemGrafico = grafico.getAs("image/png").copyBlob();

      // Faça algo com a imagem desejada.
      inserirImagemGraficoNoDocs(imagemGrafico, body, posicao, colG);

      body.insertParagraph(posicao._posicaoAtual, "");
      posicao.incrementPosicao();
    }
  }
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/** FUNÇÃO PARA INSERIR A IMAGEM NO DOCUMENTO */
function inserirImagemNoDocumento(colG, posicao, body) {

  var regex = /\/file\/d\/(.*?)\//;
  var match = colG.match(regex);
  var id = match ? match[1] : null;

  let imagemBlob = DriveApp.getFileById(id).getBlob();
  let imgInserida = body.insertImage(posicao._posicaoAtual, imagemBlob);
  atributosDaImagem(imgInserida, 300)
  posicao.incrementPosicao();
  body.insertParagraph(posicao._posicaoAtual, "");
  posicao.incrementPosicao();
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/**
 * FUNÇÃO PARA MONTAR OS TEXTOS NO RELATÓRIO - VERSÃO OTIMIZADA
 * Reduz as chamadas de API focando na inserção e adiando a formatação complexa.
 */
function buildTextOptimized(columns, body, posicao, listItems) {
  const [colB, colC, colD, colE, colF, colG, colH] = columns;

  // Usa estilos pré-definidos para reduzir chamadas .set... repetitivas
  const listItemStyle = {
    [DocumentApp.Attribute.BOLD]: true,
    [DocumentApp.Attribute.FONT_SIZE]: 11,
    [DocumentApp.Attribute.SPACING_BEFORE]: 15,
    [DocumentApp.Attribute.SPACING_AFTER]: 15
  };

  const paragraphStyle = {
    [DocumentApp.Attribute.BOLD]: false,
    [DocumentApp.Attribute.FONT_SIZE]: 11,
    [DocumentApp.Attribute.SPACING_BEFORE]: 15,
    [DocumentApp.Attribute.SPACING_AFTER]: 15,
    [DocumentApp.Attribute.HORIZONTAL_ALIGNMENT]: DocumentApp.HorizontalAlignment.JUSTIFY
  };

  const insertListItem = (text, listId, level = 0) => {
    let item = body.insertListItem(posicao.posicaoAtual, text);
    item.setListId(listId).setNestingLevel(level);
    item.setAttributes(listItemStyle); // Aplica múltiplos atributos de uma vez
    posicao.incrementPosicao();
  };

  if (colB) insertListItem(colB, listItems[0], 0);
  if (colC) insertListItem(colC, listItems[1], 1);
  if (colD) insertListItem(colD, listItems[2], 2);
  if (colE) insertListItem(colE, listItems[3], 3);
  if (colF) insertListItem(colF, listItems[4], 4);

  // Insere colG como um parágrafo
  if (colG) {
    // A formatação de palavras-chave (negrito, itálico) será feita em uma passagem final
    const paragraph = body.insertParagraph(posicao.posicaoAtual, colG);
    paragraph.setAttributes(paragraphStyle);
    posicao.incrementPosicao();
  }

  // Insere colH com quebra de página antes
  if (colH) {
    // Insere a quebra no parágrafo anterior para evitar um parágrafo extra com o texto {{Quebra}}
    const previousElement = body.getChild(posicao.posicaoAtual - 1);
    if (previousElement && previousElement.getType() === DocumentApp.ElementType.PARAGRAPH) {
      previousElement.asParagraph().appendPageBreak();
    }
    // Não inserimos o texto de colH, apenas usamos como gatilho
  }
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/**
 * Aplica TODA a formatação condicional de texto (negrito, cores de fundo)
 * em uma única passagem pelo documento para máxima performance.
 * @param {DocumentApp.Body} body O corpo do documento.
 */
function aplicarFormatacaoFinalDeTexto(body) {

  // 1. Regras de formatação de prefixo (o que ia em negrito)
  const prefixosNegrito = [
    "STATUS FINAL DO TESTE:", "STATUS DO TESTE:", "ID:", "VERSÃO:", "OBJETIVO:",
    "REFERÊNCIA NORMATIVA:", "PASSO", "PRÉ CONDIÇÃO:", "PROCEDIMENTO:",
    "RESULTADO ESPERADO:", "RESULTADO APRESENTADO:", "Total de Ensaios Não Executados (%)", "Ensaios OK (%)", "Ensaios Não Conformes (%)", "Ensaios atenção (%)", "Ensaios Não Executados (%)", "Ensaios Não Aplicáveis (%)"
  ];

  // 2. Regras de cor de fundo para frases específicas
  const coresDeFundo = {
    "Teste OK": "#A8E6A3",
    "Teste Conforme": "#A8E6A3",
    "Teste Não Conforme": "#FFB3B3",
    "Teste Não Executado": "#FFE066",
    "Teste Não Aplicável": "#d5d5d5",
    "Atenção": "#FFB347"
    // Adicione outras frases que devam ter cor de fundo aqui
  };

  // Itera sobre todos os parágrafos do documento
  const paragraphs = body.getParagraphs();
  paragraphs.forEach(paragraph => {
    const textElement = paragraph.editAsText();
    const textContent = textElement.getText();

    // Aplica a formatação de prefixo em negrito
    for (const prefixo of prefixosNegrito) {
      if (textContent.startsWith(prefixo)) {
        textElement.setBold(0, prefixo.length - 1, true);
        if (prefixo === "PASSO") {
          textElement.setItalic(0, textContent.length - 1, true);
        }
        break; // Sai do loop de prefixos assim que encontra um
      }
    }

    // Aplica as cores de fundo
    for (const frase in coresDeFundo) {
      let startIndex = textContent.indexOf(frase);
      while (startIndex !== -1) {
        const endIndex = startIndex + frase.length - 1;
        textElement.setBackgroundColor(startIndex, endIndex, coresDeFundo[frase]);
        // Procura a próxima ocorrência da mesma frase no parágrafo
        startIndex = textContent.indexOf(frase, startIndex + 1);
      }
    }
  });
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/** DELETA O TEXTO USADO PARA AS QUEBRAS DE PÁGINA "{{Quebra}}" */
function deletarTextoAlvo(body, textoAlvo) {
  let paragrafos = body.getParagraphs();

  for (let i = paragrafos.length - 1; i >= 0; i--) { // Percorre de trás para frente
    let paragrafo = paragrafos[i];
    if (paragrafo.getText().indexOf(textoAlvo) !== -1) {
      paragrafo.removeFromParent();
    }
  }
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/** CHAMANDO CADA FUNÇÃO INDIVIDUALMENTE PARA EXECUTAR PELO USANDO 'SWITCH CASE' */
function buildReport(val, linha, dataDocument, posicao, dataSpreadsheet) {
  const [colA, colB, colC, colD, colE, colF, colG, colH, colI] = val;

  switch (colA) {
    case 'Tabela':
      if (colI !== "") {
        buildTableOtimizada(linha, dataDocument.body, posicao, dataSpreadsheet.dadosArrayResultado);
      }
      break;
    case 'Imagem':
      if (colG !== "") inserirImagemNoDocumento(colG, posicao, dataDocument.body);
      break;
    case 'Grafico':
      if (colG !== "") buildingGraficoToImage(dataSpreadsheet.spreadsheetAcompanhamento, dataDocument.body, posicao, colG);
      break;
    case 'Texto':
      // Passamos os listItems para evitar chamá-lo repetidamente no loop
      buildTextOptimized([colB, colC, colD, colE, colF, colG, colH], dataDocument.body, posicao, dataDocument.listItem);
      break;
  }
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/** REFERÊNCIAS => PEGA OS DADOS DA PRIMEIRA COLUNA ATÉ RESULTADO, PARA ENVIAR AO SWITE CASE E PROCESSAR TODOS OS DADOS POR VEZ */
function percorrerReferencias(dataSpreadsheet, dataDocument, posicao) {

  for (i = 0; i <= dataSpreadsheet.dadosArrayResultado.length; i++) {
    const val = dataSpreadsheet.dadosArrayResultado[i];
    if (val[0] === dataSpreadsheet.namedRangeResultado) {
      break;
    }
    // Executa a função de construção do relatório
    buildReport(val, i, dataDocument, posicao, dataSpreadsheet);
  }
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/** RESULTADO => PEGA OS DADOS DA PRIMEIRA COLUNA CONCLUSÃO, PARA ENVIAR AO SWITE CASE E PROCESSAR TODOS OS DADOS POR VEZ  */

// function percorrerResultado(dataSpreadsheet, dataDocument, posicao) {
//   const startIndex = dataSpreadsheet.indexNamedRangeResultado;
//   let contadorAlteracoes = 0;

//   for (let i = startIndex; i < dataSpreadsheet.dadosArrayResultado.length; i++) {
//     const val = dataSpreadsheet.dadosArrayResultado[i];
//     if (val[0] === dataSpreadsheet.namedRangeConclusao) break;

//     buildReport(val, i, dataDocument, posicao, dataSpreadsheet);
//     contadorAlteracoes++;

//     if (contadorAlteracoes % 30 === 0) {
//       dataDocument = salvarDocumento(dataDocument)
//     }
//   }

//   return dataDocument;
// }

/**
 * Percorre e processa a seção de RESULTADOS, publicando o progresso em tempo real.
 * @param {object} config O objeto de configuração principal.
 * @param {Posicao} posicao O objeto que controla a posição de inserção.
 * @param {GoogleAppsScript.Cache.Cache} cache O serviço de cache para publicar o status.
 * @param {number} totalItens O número total de itens para calcular a porcentagem.
 * @returns {object} O objeto dataDocument atualizado.
 */
function percorrerResultado(planilha, documento, posicao, cache, totalItens) {
  // Extrai os dados necessários do objeto de configuração
  const dadosArrayResultado = planilha.dadosArrayResultado;
  const startIndex = planilha.indexNamedRangeResultado;
  const endMarker = planilha.namedRangeConclusao;
  let dataDocument = documento;

  cache.put('status_relatorio', '3/4 - Construindo seção de Resultados...');
  Utilities.sleep(2000);

  let contadorAlteracoes = 0;

  for (let i = startIndex; i < dadosArrayResultado.length; i++) {
    // ---> INÍCIO DA LÓGICA DE ATUALIZAÇÃO DE STATUS <---
    // A cada 20 itens, atualiza a mensagem na tela
    if (i % 10 === 0) {
      const percentual = Math.round((i / totalItens) * 100);
      cache.put('status_relatorio', `Construindo Resultados... (${percentual}%)`);
    }
    // ---> FIM DA LÓGICA DE ATUALIZAÇÃO DE STATUS <---

    const val = dadosArrayResultado[i];
    if (val[0] === endMarker) break;

    buildReport(val, i, dataDocument, posicao, planilha);
    contadorAlteracoes++;

    // Lógica para salvar periodicamente (se necessário em scripts muito grandes)
    if (contadorAlteracoes % 60 === 0) {
      dataDocument = salvarDocumento(dataDocument);
    }
  }
  return dataDocument;
}

/**------------------------------------------------------------------------------------------------------------------------------ */

/** CONCLUSÃO => PEGA OS DADOS DA PRIMEIRA COLUNA, PARA ENVIAR AO SWITE CASE E PROCESSAR TODOS OS DADOS POR VEZ */
function percorrerConclusao(dataSpreadsheet, dataDocument, posicao) {

  for (var i = dataSpreadsheet.indexNamedRangeConclusao; i < dataSpreadsheet.dadosArrayResultado.length; i++) {
    var val = dataSpreadsheet.dadosArrayResultado[i]
    if (val[0] === "") {
      break;
    }
    // Executa a função de construção do relatório
    buildReport(val, i, dataDocument, posicao, dataSpreadsheet);
  }
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/** FUNÇÃO QUE SALVA O DOCUMENTO E O REABRE DURANTE A EXECUÇÃO DO RELATÓRIO */
function salvarDocumento(dataDocument) {
  dataDocument.doc.saveAndClose(); //	Exception: Document is closed, its contents cannot be updated.
  dataDocument.doc = DocumentApp.openById(dataDocument.id); // Reabrir o documento para continuar fazendo alterações
  var doc = dataDocument.doc;
  // Recuperar as informações necessárias
  const nameDoc = doc.getName();
  const id = doc.getId();
  const body = doc.getBody();
  const tables = body.getTables();
  const listItem = body.getListItems();
  const text = body.getText();
  const url = doc.getUrl();

  return {
    doc,
    nameDoc,
    id,
    body,
    tables,
    listItem,
    text,
    url
  };
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/** APLICA OS BACKGROUNDS CORRESPONDENTES DE CADA INFORMAÇÃO */
function aplicarBackgroundColorCelulas(tables) {

  const cores = {
    "Teste OK": "#A8E6A3", // verde claro
    "Teste Conforme": "#A8E6A3", // verde claro
    "Teste Não Conforme": "#FFB3B3", // vermelho
    "Teste Não Executado": "#FFE066", // amarelo
    "Teste Não Aplicável": "#d5d5d5", // cinza
    "Total dos Ensaios Executados (%)": "#d5d5d5", // cinza
    "Total de Ensaios Não Executados (%)": "#d5d5d5", // cinza
    "Ensaios OK (%)": "#d5d5d5", // cinza
    "Ensaios Não Conformes (%)": "#d5d5d5", // cinza
    "Ensaios atenção (%)": "#d5d5d5", // cinza
    "Ensaios Não Executados (%)": "#d5d5d5", // cinza
    "Ensaios Não Aplicáveis (%)": "#d5d5d5", // cinza
    "Atenção": "#FFB347", // laranja
    "0 - Muito Alto": "#FFB3B3", // vermelho
    "1 - Alto": "#FFB347", // laranja
    "2 - Médio": "#FFE066", // amarelo
    "3 - Baixo": "#A8E6A3", // verde claro
    "4 - Muito Baixo": "#58d68d" // verde escuro
  };

  // Percorre todas as tabelas do documento
  tables.forEach(table => {
    const numLinhas = table.getNumRows(); // Obtém o número de linhas

    for (let linha = 0; linha < numLinhas; linha++) {
      const row = table.getRow(linha);
      const numColunas = row.getNumCells(); // Obtém o número de colunas

      for (let coluna = 0; coluna < numColunas; coluna++) {
        const cell = row.getCell(coluna);
        const dadoCell = cell.getText().trim(); // Obtém o texto da célula e remove espaços extras

        if (cores[dadoCell]) {
          cell.setBackgroundColor(cores[dadoCell]); // Define a cor de fundo
        }
      }
    }
  });
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/**
 * Substitui tags <br> por quebras de linha de forma altamente otimizada,
 * usando o método nativo replaceText() para evitar loops lentos.
 *
 * @param {DocumentApp.Body} body O corpo do documento a ser processado.
 */
function replaceLineBreaksOptimized(body) {

  // O padrão de busca por <br> ou <br/>, ignorando maiúsculas/minúsculas.
  // Note que para o método replaceText, passamos o regex como uma string.
  // As duas barras \\ são necessárias para escapar o caractere \ na string.
  const searchPattern = "<br\\s*\\/?>";
  const replacementText = "\n"; // O caractere de nova linha

  // O método findText encontra o primeiro elemento que contém o padrão.
  // Continuamos em um loop até que não encontremos mais nenhuma ocorrência.
  let foundElement = body.findText(searchPattern);
  while (foundElement) {
    const textElement = foundElement.getElement().asText();

    // replaceText() faz a mágica: substitui TODAS as ocorrências dentro
    // deste elemento de texto de uma só vez, preservando o estilo.
    textElement.replaceText(searchPattern, replacementText);

    // Continua a busca a partir do elemento que acabamos de modificar.
    foundElement = body.findText(searchPattern, foundElement);
  }
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/**
 * Formata tags HTML (<strong>, <em>, <u>) de forma altamente otimizada,
 * modificando o texto "in-place" para evitar apagar e reconstruir parágrafos.
 * O processamento é feito de trás para frente para manter a integridade dos índices.
 *
 * @param {DocumentApp.Body} body O corpo do documento a ser processado.
 */
function formatTagsInPlaceOptimized(body) {
  const paragraphs = body.getParagraphs();
  const tagStyles = [
    { open: '<strong>', close: '</strong>', method: 'setBold' },
    { open: '<em>', close: '</em>', method: 'setItalic' },
    { open: '<u>', close: '</u>', method: 'setUnderline' }
  ];

  paragraphs.forEach(paragraph => {
    const textElement = paragraph.asText();
    let textContent = textElement.getText();

    // Se o parágrafo não contiver nenhuma tag de interesse, pule para o próximo.
    if (!textContent.includes('<')) {
      return;
    }

    tagStyles.forEach(style => {
      // Loop para encontrar todas as ocorrências de uma tag (ex: </strong>)
      // de trás para frente.
      while (textContent.includes(style.open)) {

        // Encontra o ÚLTIMO par de tags no texto atual.
        const closeTagIndex = textContent.lastIndexOf(style.close);
        if (closeTagIndex === -1) break; // Não há mais tags deste tipo, sai do loop.

        const openTagIndex = textContent.lastIndexOf(style.open, closeTagIndex);
        if (openTagIndex === -1) break; // Tag malformada, sai do loop.

        // Define a formatação no texto ENTRE as tags.
        const contentStartIndex = openTagIndex + style.open.length;
        const contentEndIndex = closeTagIndex - 1;

        // Aplica o estilo (ex: setBold) na faixa de texto correta.
        // É crucial fazer isso ANTES de apagar as tags.
        if (contentStartIndex <= contentEndIndex) {
          textElement[style.method](contentStartIndex, contentEndIndex, true);
        }

        // Apaga as tags, começando pela de fechamento (que vem depois).
        // Isso não afeta os índices do que veio antes.
        textElement.deleteText(closeTagIndex, closeTagIndex + style.close.length - 1);
        textElement.deleteText(openTagIndex, openTagIndex + style.open.length - 1);

        // Atualiza o conteúdo do texto para a próxima iteração do while loop.
        textContent = textElement.getText();
      }
    });
  });
}
/**------------------------------------------------------------------------------------------------------------------------------ */

/**
 * Processa tags começando do final para o início do texto
 */
function processTagsReversed(textElement, openTag, closeTag, style) {
  let fullText = textElement.getText();
  let lastIndex = fullText.length;

  while (true) {
    // Encontrar a última ocorrência da tag de fechamento
    const closeTagStart = fullText.lastIndexOf(closeTag, lastIndex);
    if (closeTagStart === -1) break;

    // Encontrar a tag de abertura correspondente
    const openTagStart = fullText.lastIndexOf(openTag, closeTagStart);
    if (openTagStart === -1) break;

    // Calcular posições do texto formatado
    const textStart = openTagStart + openTag.length;
    const textEnd = closeTagStart - 1;

    // Aplicar estilos
    for (const [attr, value] of Object.entries(style)) {
      const method = `set${attr.charAt(0).toUpperCase() + attr.slice(1)}`;
      textElement[method](textStart, textEnd, value);
    }

    // Remover tags (primeiro a de fechamento para manter os índices corretos)
    textElement.deleteText(closeTagStart, closeTagStart + closeTag.length - 1);
    textElement.deleteText(openTagStart, openTagStart + openTag.length - 1);

    // Atualizar o texto e continuar a busca antes desta tag
    fullText = textElement.getText();
    lastIndex = openTagStart - 1;
  }
}
/**------------------------------------------------------------------------------------------------------------------------------ */

function abrirDocumentoNoNavegador(docId) {
  var url = 'https://docs.google.com/document/d/' + docId + '/edit';

  var html = `<script>window.open('${url}', '_blank');google.script.host.close();</script>`;

  var ui = HtmlService.createHtmlOutput(html)
    .setWidth(100)
    .setHeight(50);

  SpreadsheetApp.getUi().showModalDialog(ui, 'Abrindo documento...');
}

/** -------------------------------------------------- FUNÇÃO PRINCIPAL "MAIN" -------------------------------------------------- */
/**
 * Gera o relatório completo e publica mensagens de status detalhadas durante a execução.
 * @param {GoogleAppsScript.Cache.Cache} cache O serviço de cache para publicar o status.
 * @returns {string} A mensagem final de sucesso com a URL do documento.
 */

function gerarRelatorio(cache) {
  // Se a função for chamada sem cache (para testes), ela pega um novo.
  if (!cache) {
    cache = CacheService.getScriptCache();
  }

  try {
    cache.put('status_relatorio', '1/4 - Estruturando arquivos e pastas...');

    const dataSpreadsheet = buildDataSpreadsheet();
    const currentFolder = buildDataCurrentFolder(dataSpreadsheet);
    var dataDocument = buildDataDocument(currentFolder.id, dataSpreadsheet.dot);
    // const config = iniciarConfiguracaoRelatorio();

    const posicao = new Posicao();
    deletePlaceholdersOptimized(dataDocument.body);
    deleteRangeOptimized(dataDocument.body, posicao);

    cache.put('status_relatorio', '2/4 - Preenchendo dados da capa...');
    preencherCapaEHeader(dataSpreadsheet.spreadsheetCapa, dataDocument.doc);
    Utilities.sleep(1000); // Pausa para o usuário ler

    // Etapa principal de construção do corpo do relatório
    const dadosParaProcessar = dataSpreadsheet.dadosArrayResultado;
    const totalItens = dadosParaProcessar.length;

    // Chamando as funções de percurso, agora passando o necessário para o log de progresso
    percorrerReferencias(dataSpreadsheet, dataDocument, posicao);

    dataDocument = percorrerResultado(dataSpreadsheet, dataDocument, posicao, cache, totalItens);

    percorrerConclusao(dataSpreadsheet, dataDocument, posicao);

    preencherPlaceholdersDinamicos(dataSpreadsheet.spreadsheetCapa, dataDocument.doc);

    cache.put('status_relatorio', '4/4 - Aplicando formatação final...');
    // Suas funções de formatação final
    aplicarBackgroundColorCelulas(dataDocument.tables);
    replaceLineBreaksOptimized(dataDocument.body);
    formatTagsInPlaceOptimized(dataDocument.body);
    aplicarFormatacaoFinalDeTexto(dataDocument.body);
    deletarTextoAlvo(dataDocument.body, '{{Quebra}}');
    Utilities.sleep(1000); // Pausa para o usuário ler

    cache.put('status_relatorio', 'Salvando o documento...');
    dataDocument.doc.saveAndClose();

    const urlDoDocumento = dataDocument.url;
    // Retorna a mensagem de sucesso que será exibida na caixa de diálogo
    return `Relatório gerado com sucesso! URL: ${urlDoDocumento}`;

  } catch (e) {
    Logger.log(e);
    // Retorna a mensagem de erro que será exibida na caixa de diálogo
    throw new Error(`Ocorreu um erro: ${e.message}`);
  }
}

