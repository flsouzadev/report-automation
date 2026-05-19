function onOpen(e) {
  
  // Add a custom menu to the spreadsheet.
  SpreadsheetApp.getUi() // Or DocumentApp, SlidesApp, or FormApp.
    .createMenu('Relatório')
    .addItem('01. Gerar Relatório', 'rodarPreencMatrizEGerarRelatorio')
    .addItem('02. Gerar "Execução do Cliente"', 'processarPassos')
    .addToUi();
}