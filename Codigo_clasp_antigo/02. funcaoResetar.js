function resetar1() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const valueCheckbox = ss.getRange("checkbox").getValue();
    let spreadsheetResultado = valueCheckbox ? ss.getSheets()[5] : ss.getSheets()[4];
    var guia = spreadsheetResultado;
    var dados = guia.getRange("A:A").getValues();
    if (dados.length > 25) {
      // Encontrar o índice da linha com o valor "Resultados dos Ensaios – Visão Macro"
      var indiceInicioResultadosMacro = encontrarLinha("Resultados dos Ensaios – Visão Macro", guia);
      // Encontrar o índice da linha com o valor "Resultado"
      var indiceInicioResultados = encontrarLinha("Status dos Testes", guia);

      //-------------------------------------------------------------------------------------------------------------------------
      // Excluir as linhas nos intervalos específicos
      guia.deleteRows(indiceInicioResultadosMacro + 3, indiceInicioResultados - indiceInicioResultadosMacro - 3);
      //-------------------------------------------------------------------------------------------------------------------------
      resetar2();
    } else {
      // Browser.msgBox("Reset Concluído");
    }
  } catch (error) {
    Logger.log("Erro resetar1: " + error);
     resetar2();
  }
}

function resetar2() {
  try {
    // Obter a planilha ativa
    var planilha = SpreadsheetApp.getActiveSpreadsheet();

    // Obter a guia desejada (neste caso, a guia chamada "05.Resultado")
    var guia = planilha.getSheetByName("05.Resultado");
    var dados = guia.getRange("A:A").getValues();

    var indiceStatusTeste = encontrarLinha("Status dos Testes", guia);
    var indiceInicioResultados = dados.findIndex(value => value[0] === "Resultado") + 1;

    //-------------------------------------------------------------------------------------------------------------------------
    // Excluir as linhas nos intervalos específicos
    guia.deleteRows(indiceStatusTeste + 1, indiceInicioResultados - indiceStatusTeste - 1);
    //-------------------------------------------------------------------------------------------------------------------------
    resetar3();
  } catch (error) {
    Logger.log("Erro resetar2: " + error);
  resetar3();
  }
}

function resetar3() {
  try {
    // Obter a planilha ativa
    var planilha = SpreadsheetApp.getActiveSpreadsheet();

    // Obter a guia desejada (neste caso, a guia chamada "05.Resultado")
    var guia = planilha.getSheetByName("05.Resultado");
    var dados = guia.getRange("A:A").getValues();

    // Encontrar o índice da linha com o valor "Resultado"
    var indiceInicioResultados = dados.findIndex(value => value[0] === "Resultado") + 1;
    // Encontrar o índice da linha com o valor "Conclusao"
    var indiceConclusao = dados.findIndex(value => value[0] === "Conclusão") + 1;

    //-------------------------------------------------------------------------------------------------------------------------
    // Excluir as linhas nos intervalos específicos
    guia.deleteRows(indiceInicioResultados + 2, indiceConclusao - indiceInicioResultados - 2);
    //-------------------------------------------------------------------------------------------------------------------------
    // resetar4();
  } catch (error) {
    Logger.log("Erro resetar3: " + error);
  }
  
    // Browser.msgBox("Reset Concluído");
}

function resetar4() {
  try {
    // Obter a planilha ativa
    var planilha = SpreadsheetApp.getActiveSpreadsheet();

    // Obter a guia desejada (neste caso, a guia chamada "05.Resultado")
    var guia = planilha.getSheetByName("05.Resultado");
    var dados = guia.getRange("A:A").getValues();

    // Encontrar o índice da linha com o valor "Conclusao"
    var indiceConclusao = dados.findIndex(value => value[0] === "Conclusão") + 1;

    //-------------------------------------------------------------------------------------------------------------------------
    // Excluir as linhas nos intervalos específicos
    guia.deleteRows(indiceConclusao + 2, guia.getLastRow() - indiceConclusao - 1);
    //-------------------------------------------------------------------------------------------------------------------------
    // Browser.msgBox("Reset Concluído");
  } catch (error) {
    Logger.log("Erro resetar4: " + error);
  }
}
