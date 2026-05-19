// Função de mensagens dinâmicas
function boxMsgToUser(fraseStatus, mensagem, html) {
  var template = HtmlService.createTemplateFromFile(html);
  template.mensagem = mensagem; // Passa a mensagem para o template HTML
  var form = template.evaluate();
  form.setHeight(150).setWidth(350);
  SpreadsheetApp.getUi().showModalDialog(form, fraseStatus);
}

// Diálogo com o cliente.
function dialogExecucaoCliente() {

  // mensagens para o usuário
  let fraseStatus = "Execução Cliente"
  let msgExecucaoCliente = "Gerando Execução Cliente...";
  let templateHtmlDialogExecucaoCliente = '6.1-dialogClient';

  // Adiciona um pequeno delay para garantir que a interface do usuário seja atualizada
  Utilities.sleep(1000);

  // box de mensagem para o usuário
  boxMsgToUser(fraseStatus, msgExecucaoCliente, templateHtmlDialogExecucaoCliente);
}

function deletarLinhas(targetSheet) {
  // Limpa as linhas abaixo da linha 10 na targetSheet
  var lastRow = targetSheet.getMaxRows();
  if (lastRow > 10) {
    targetSheet.deleteRows(11, lastRow - 10); // Deleta todas as linhas após a linha 10
  }
}

function limparAba(sheet) {
  let aba = sheet.getRange(5, 1, sheet.getLastRow(), sheet.getLastColumn());
  aba.clearContent();
}

function verificarValidacaoDados(sheet) {
  var range = sheet.getDataRange(); // Obtém todo o intervalo com dados
  var validations = range.getDataValidations(); // Obtém as regras de validação

  var resultado = [];
  var primeiraColunaDetectada = null;

  for (var i = 0; i < validations.length; i++) {
    for (var j = 0; j < validations[i].length; j++) {
      if (validations[i][j] !== null) { // Se houver uma validação na célula
        var linha = i + 1;  // Ajusta índice para linha real (1-based)
        var coluna = j + 1; // Ajusta índice para coluna real (1-based)

        if (primeiraColunaDetectada === null) {
          primeiraColunaDetectada = coluna;
        }

        resultado.push(`Linha: ${linha}, Coluna: ${coluna}`);
      }
    }
  }

  if (primeiraColunaDetectada === 10) {
    sheet.insertColumnBefore(3); // Insere uma coluna antes da coluna 3
  }
}

/**
 * OTIMIZADO: Aplica o formato de Rich Text (negrito) em colunas específicas de uma só vez.
 * Substitui a antiga 'formatarTextoToNegrito'.
 */
function formatarTextoToNegritoOtimizada(sheet) {
  const colunasParaFormatar = [9, 10, 13]; // Colunas I, J, M (antes da exclusão da coluna de Passos)
  const primeiraLinhaDeDados = 3;
  const ultimaLinha = sheet.getLastRow();

  if (ultimaLinha < primeiraLinhaDeDados) return; // Não faz nada se não houver dados

  colunasParaFormatar.forEach(col => {
    const range = sheet.getRange(primeiraLinhaDeDados, col, ultimaLinha - primeiraLinhaDeDados + 1, 1);
    const valores = range.getValues();
    const richTextValues = [];

    const regex = /Passo \d+:/g;

    for (let i = 0; i < valores.length; i++) {
      const celula = valores[i][0];
      if (typeof celula === 'string' && celula) {
        const richTextBuilder = SpreadsheetApp.newRichTextValue().setText(celula);
        let match;
        while ((match = regex.exec(celula)) !== null) {
          richTextBuilder.setTextStyle(match.index, match.index + match[0].length, SpreadsheetApp.newTextStyle().setBold(true).build());
        }
        richTextValues.push([richTextBuilder.build()]);
      } else {
        richTextValues.push([celula]); // Mantém células que não são texto
      }
    }
    // Aplica todos os Rich Texts da coluna de uma só vez
    range.setRichTextValues(richTextValues);
  });
}

/**
 * Remove TODAS as tags HTML e quebras de linha de um intervalo de células.
 * Esta versão é mais agressiva para garantir a limpeza completa.
 *
 * @param {GoogleAppsScript.Spreadsheet.Range} range - O intervalo a ser processado.
 */
function removerTagsHTML(range) {
  const valores = range.getValues();
  const regexBr = /<br\s*\/?>/gi;
  const regexOutrasTags = /<[^>]+>/g;

  const valoresLimpos = valores.map(linha =>
    linha.map(celula => {
      if (typeof celula !== 'string') {
        return celula;
      }

      // 1. O texto "Contexto PDP junto a rede.<br />[Observação 1]:..." entra aqui.
      // A regexBr encontra o "<br />" e o substitui por uma quebra de linha (\n).
      let textoLimpo = celula.replace(regexBr, '\n');

      // 2. Depois, o código remove qualquer outra tag que possa existir.
      textoLimpo = textoLimpo.replace(regexOutrasTags, '');

      // 3. Finalmente, limpa espaços extras para um resultado final limpo.
      return textoLimpo.replace(/\s+/g, ' ').trim();
    })
  );

  range.setValues(valoresLimpos);
}

/**
 * OTIMIZADO: Remove tags HTML da planilha inteira de uma só vez.
 * É mais eficiente por fazer uma única operação de leitura e escrita.
 * Esta função substitui a antiga 'removerTagsHTMLColunas'.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - A planilha a ser processada.
 */
function removerTagsDaPlanilhaInteira(sheet) {
  Logger.log(`Iniciando limpeza de tags HTML na aba inteira: ${sheet.getName()}`);

  // Pega TODO o intervalo com dados de uma vez.
  const dataRange = sheet.getDataRange();

  // Garante que a função não tente rodar em uma planilha completamente vazia.
  if (dataRange.getNumRows() > 0 && dataRange.getNumColumns() > 0) {
    // Usa a mesma função "worker" de antes, que já está preparada para múltiplas colunas.
    removerTagsHTML(dataRange);
  }

  Logger.log("Limpeza de tags da planilha concluída.");
}

/**
 * OTIMIZADO: Aplica as cores de fundo nas células de status de uma só vez.
 * Substitui a antiga 'aplicarBackgroundColorCelulasPlanilha'.
 */
function aplicarBackgroundColorOtimizada(sheet) {
  const cores = {
    "Teste OK": "#A8E6A3", "Teste Conforme": "#A8E6A3", "Teste Não Conforme": "#FFB3B3",
    "Teste Não Executado": "#FFE066", "Teste Não Aplicável": "#d5d5d5", "Atenção": "#FFB347",
    "0 - Muito Alto": "#FFB3B3", "1 - Alto": "#FFB347", "2 - Médio": "#FFE066",
    "3 - Baixo": "#A8E6A3", "4 - Muito Baixo": "#58d68d"
  };

  const primeiraLinhaDeDados = 3;
  const ultimaLinha = sheet.getLastRow();
  const colInicialStatus = 10; // Coluna J (Status 1)
  const numColunasStatus = 2;  // Vamos ler 2 colunas (J e K)

  if (ultimaLinha < primeiraLinhaDeDados) return;

  // Lê os dados das duas colunas de uma vez
  // A leitura começa na coluna J e pega 2 colunas de largura (J e K)
  const rangeParaLer = sheet.getRange(primeiraLinhaDeDados, colInicialStatus, ultimaLinha - primeiraLinhaDeDados + 1, numColunasStatus);
  const valores = rangeParaLer.getValues();

  // Cria uma matriz de cores correspondente
  const backgrounds = valores.map(linha => {
    // linha[0] corresponde à primeira coluna do intervalo lido (J)
    const cor1 = cores[linha[0].toString().trim()] || null;
    // linha[1] corresponde à segunda coluna do intervalo lido (K)
    const cor2 = cores[linha[1].toString().trim()] || null;
    return [cor1, cor2];
  });

  // Aplica todas as cores de fundo de uma só vez
  rangeParaLer.setBackgrounds(backgrounds);
}

function processarPassos() {

  dialogExecucaoCliente();

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheet = ss.getSheetByName('06.Execução_CLIENTE');
  var targetSheet = ss.getSheetByName('Execucao_CLIENTE_automatic');
  var execucaoAutoCliente = ss.getSheetByName('07.Execução_CLIENTE');

  if (!targetSheet) {
    targetSheet = ss.insertSheet('Execucao_CLIENTE_automatic'); // Cria a aba se não existir
  }
  limparAba(targetSheet)

  // Limpa as linhas abaixo da linha 10 na targetSheet
  deletarLinhas(targetSheet)

  var data = sourceSheet.getDataRange().getValues();
  var novasColunas = { 8: [], 9: [], 12: [] };

  // Loop para processar todas as colunas necessárias (8, 9 e 10)
  for (var col of [8, 9, 12]) {
    for (var i = 2; i < data.length; i++) { // Começa a partir da linha 3
      if (data[i][3] === 1) {
        var textoConcat = `Passo 1: ${data[i][col] || ''}`;
        var j = i + 1;

        while (j < data.length && data[j][3] !== 1) {
          textoConcat += `\nPasso ${data[j][3]}: ${data[j][col] || ''}`;
          j++;
        }
        novasColunas[col][i] = textoConcat;
      } else if (data[i][3] !== "") {
        novasColunas[col][i] = data[i][col] || '';
      } else {
        novasColunas[col][i] = "";
      }
    }
  }

  // Atualiza os dados após a exclusão
  data = sourceSheet.getDataRange().getValues();

  // Copia todos os dados da sourceSheet para a targetSheet
  var targetData = data.map(function (row, index) {
    var newRow = row.slice();
    newRow[8] = novasColunas[8][index] || "";
    newRow[9] = novasColunas[9][index] || "";
    newRow[12] = novasColunas[12][index] || "";
    return newRow;
  });

  // Atualiza os valores na planilha
  var range = targetSheet.getRange(3, 1, targetData.length - 2, targetData[0].length);
  range.setValues(targetData.slice(2));

  // Obtém os dados da targetSheet
  var targetDataFinal = targetSheet.getDataRange().getValues();

  // Filtra as linhas onde a coluna C (índice 2) não está vazia
  var filteredData = targetDataFinal.filter(row => row[2] !== "" && row[1] !== null);

  // Obtém ou cria a aba '07.Execucao_Cliente'
  if (!execucaoAutoCliente) {
    execucaoAutoCliente = ss.insertSheet('07.Execução_CLIENTE'); // Cria a aba se não existir
  }

  // limpa, retirando qualquer dado da aba.
  limparAba(execucaoAutoCliente);

  // deletar linhas, deixando somente 10.
  deletarLinhas(execucaoAutoCliente);

  // acrescenta uma coluna no início (isto foi feito por conta dos DATA VALIDATIONS), pois é deletada a coluna PASSO ao final.
  verificarValidacaoDados(execucaoAutoCliente)

  // Limpa os dados antigos na aba '07.Execucao_Cliente'
  execucaoAutoCliente.getRange(2, 1, execucaoAutoCliente.getLastRow(), execucaoAutoCliente.getLastColumn()).clearContent();

  // Insere os dados filtrados na aba '07.Execucao_Cliente'
  if (filteredData.length > 0) {
    execucaoAutoCliente.getRange(3, 1, filteredData.length, filteredData[0].length).setValues(filteredData);
  }

  removerTagsDaPlanilhaInteira(execucaoAutoCliente);
  // removerTagsHTMLColunas(execucaoAutoCliente);

  // Aplica negrito na palavra "Passo X:" somente na aba '07.Execução_CLIENTE'
  // formatarTextoToNegrito(filteredData, execucaoAutoCliente);
  formatarTextoToNegritoOtimizada(execucaoAutoCliente);

  execucaoAutoCliente.deleteColumn(8); // Deleta a coluna de 'PASSOS'

  // Adicionando ao final do processarPassos nas colunas J e K, após deletar a coluna PASSOS.
  // aplicarBackgroundColorCelulasPlanilha(execucaoAutoCliente);
  aplicarBackgroundColorOtimizada(execucaoAutoCliente);

  execucaoAutoCliente.showSheet(); // mostra a planilha para o usuário.

  // Mensagem ao finalizar o processo.
  let fraseStatus = "Execução Cliente:"
  let htmlBreakProcessReport = "6.2-dialogClient";
  executionMessageToUser(htmlBreakProcessReport, fraseStatus)
}