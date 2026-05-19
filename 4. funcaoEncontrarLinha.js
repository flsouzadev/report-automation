function encontrarLinha(termo, sheet) {
  var dadosColunaB = sheet.getRange("B:B").getValues();
  
  for (var i = 0; i < dadosColunaB.length; i++) {
    if (dadosColunaB[i][0] === termo) {
      // A linha onde o termo foi encontrado (considerando que os índices em arrays começam em 0)
      return i + 1;
    }
  }
  
  // Exibir mensagem se o termo não foi encontrado
  Browser.msgBox("Termo não encontrado");
  
  // Retornar -1 se o termo não foi encontrado
  return -1;
}