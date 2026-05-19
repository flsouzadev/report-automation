
/**
 * NOVA FUNÇÃO "MESTRA": Orquestra todo o processo no servidor.
 * É esta função que o HTML vai chamar.
 * @returns {string} Uma mensagem final de sucesso ou erro.
 */
function executarProcessoCompleto() {
  const cache = CacheService.getScriptCache();

  try {
    cache.put('status_relatorio', 'Preparando planilha do ciclo...');
    resetar1(); 

    preencherMatriz(); 

    // A mágica acontece aqui. A função gerarRelatorio agora controla seus próprios status.
    const resultadoFinal = gerarRelatorio(cache); // Passamos o cache para a função
    
    // A mensagem final de sucesso agora vem diretamente de gerarRelatorio
    cache.put('status_relatorio', 'Relatório gerado com SUCESSO');
    return resultadoFinal;

  } catch (e) {
    Logger.log(e);
    cache.put('status_relatorio', 'ERRO');
    return `Ocorreu um erro: ${e.message}`;
  }
}

/**
 * Função que a caixa de diálogo HTML chamará para obter a última mensagem de status.
 */
function obterStatusAtual() {
  return CacheService.getScriptCache().get('status_relatorio');
}

/**
 * NOVA FUNÇÃO "LANÇADORA": Substitui suas funções dialogExecutionFillMatrix e executionMessageToUserDinamic.
 * É esta função que você irá executar para iniciar todo o processo.
 */
function iniciarProcessoComUI() {
  const html = HtmlService.createHtmlOutputFromFile('2.1-dialogClient')
      .setWidth(450)
      .setHeight(250);
  SpreadsheetApp.getUi().showModalDialog(html, 'Andamento do Relatório');
}

function executionMessageToUser(fileHtml, fraseStatus) {
  var form = HtmlService.createTemplateFromFile(fileHtml);
  var mostraForm = form.evaluate();
  mostraForm.setHeight(150).setWidth(350);
  SpreadsheetApp.getUi().showModalDialog(mostraForm, `${fraseStatus}`);
}