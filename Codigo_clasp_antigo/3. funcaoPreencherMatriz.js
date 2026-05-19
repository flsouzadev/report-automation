function inserirMatrizGeral(abaResultado, abaAcompanhamento) {
  // Obter dados da coluna A até D, linhas 14 a 20
  var todosDados = abaAcompanhamento.getRange('A14:D20').getValues();
  
  // Encontrar linha em branco que separa as tabelas
  var linhaSeparacao = -1;
  for (var i = 0; i < todosDados.length; i++) {
    if (todosDados[i].every(cell => cell === '')) {
      linhaSeparacao = i;
      break;
    }
  }
  
  // Separar os dados
  var primeiraTabela = linhaSeparacao !== -1 ? todosDados.slice(0, linhaSeparacao) : todosDados;
  var segundaTabela = linhaSeparacao !== -1 ? todosDados.slice(linhaSeparacao + 1) : []; // Alterado de +2 para +1
  
  // Encontrar linha de início na aba de resultados
  var linhaInicial = encontrarLinha("Resultados dos Ensaios – Visão Macro", abaResultado) + 3;

  // Preparar dados para inserção
  var novasLinhas = [];
  
  // Função para processar cada linha da tabela
  function processarLinha(dados, isFirstRow) {
    if (dados[0] === '' && dados[1] === '' && dados[2] === '' && dados[3] === '') return null;
    
    // Converter "0" para "0.0" nas colunas numéricas (B e D)
    if (dados[1] == "0") dados[1] = "0.0";
    if (dados[3] == "0") dados[3] = "0.0";
    
    return [
      isFirstRow ? 'Tabela' : '-', // Coluna 1
      '', '', '', '', '', '', '',  // Colunas 2-8 vazias
      dados[0],  // Coluna 9 - Dado A
      dados[1],  // Coluna 10 - Dado B
      dados[2],  // Coluna 11 - Dado C
      dados[3]   // Coluna 12 - Dado D
    ];
  }
  
  // Processar primeira tabela
  for (var j = 0; j < primeiraTabela.length; j++) {
    var linhaProcessada = processarLinha(primeiraTabela[j], j === 0);
    if (linhaProcessada) novasLinhas.push(linhaProcessada);
  }
  
  // Adicionar quebra
  novasLinhas.push(['Texto', '', '', '', '', '', '', '', '', '', '', '']);
  
  // Processar segunda tabela (se existir)
  if (segundaTabela.length > 0) {
    // Verificar se há uma linha de cabeçalho vazia para pular
    var inicioDados = 0;
    if (segundaTabela[0].every(cell => cell === '')) {
      inicioDados = 1;
    }
    
    for (var k = inicioDados; k < segundaTabela.length; k++) {
      var linhaProcessada = processarLinha(segundaTabela[k], k === inicioDados);
      if (linhaProcessada) novasLinhas.push(linhaProcessada);
    }
    
    // Adicionar quebra final
    novasLinhas.push(['Texto', '', '', '', '', '', '', '{{Quebra}}', '', '', '', '']);
  }

  // Inserir dados
  if (novasLinhas.length > 0) {
    abaResultado.insertRowsBefore(linhaInicial, novasLinhas.length);
    abaResultado.getRange(linhaInicial, 1, novasLinhas.length, 12).setValues(novasLinhas);
  }
}


function inserirMatrizStatus(abaResultado, abaAcompanhamento) {
  const dadosAcompanhamento = abaAcompanhamento.getRange('A29:T').getValues(); // pega até a coluna "T" da aba 02.Acompanhamento
  const termoStatusDosTestes = "Status dos Testes";
  let linhaInicial = encontrarLinha(termoStatusDosTestes, abaResultado) + 1;
  const dadosInserir = [];

  for (let j = 0; j < dadosAcompanhamento.length; j++) {
    if (deveInserirLinha(dadosAcompanhamento, j)) {
      const valorPrimeiraColuna = j === 0 ? 'Tabela' : '-';
      const linhaDados = [
        valorPrimeiraColuna, '', '', '', '', '', '', '', 
        dadosAcompanhamento[j][0] == null || dadosAcompanhamento[j][0] === '' ? '-' : dadosAcompanhamento[j][0],
        dadosAcompanhamento[j][1], 
        dadosAcompanhamento[j][5], 
        dadosAcompanhamento[j][12] == null || dadosAcompanhamento[j][12] === '' ? '-' : dadosAcompanhamento[j][12]
      ];
      dadosInserir.push(linhaDados);
    }
  }
  dadosInserir.push(['Texto', '', '', '', '', '', '', '{{Quebra}}', '', '', '', '']);

  if (dadosInserir.length > 0) {
    abaResultado.insertRowsBefore(linhaInicial, dadosInserir.length);
    abaResultado.getRange(linhaInicial, 1, dadosInserir.length, dadosInserir[0].length).setValues(dadosInserir);
  }
}

function deveInserirLinha(dadosAcompanhamento, j) {
  const linhaAtual = dadosAcompanhamento[j];
  const linhaAnterior = j > 0 ? dadosAcompanhamento[j - 1] : null;

  return (
    linhaAtual[0] && linhaAtual[0].trim() !== '' || 
    linhaAtual[0].trim() === '' && 
    (j === 0 || linhaAtual[1] !== linhaAnterior[1]) && 
    linhaAtual[3] && linhaAtual[3].trim() !== ''
  );
}


function adicionarTracoEmBranco(aba) {
  var coluna = aba.getRange('I2:I');  // Ajuste para a coluna desejada
  var valores = coluna.getValues();

  for (var i = 0; i < valores.length; i++) {
    if (valores[i][0] === "") {
      valores[i][0] = "-";
    }
  }
  coluna.setValues(valores);
}

function inserirMatriz(abaResultado, abaAcompanhamento) {

  // Obtenha os dados da guia '02.Acompanhamento' nas colunas P:Y a partir da linha 2
  let indexIntervaloNomeadoRoteiro = abaAcompanhamento.getRange("roteiro").getRow();
  let indexUltimaLinhaDadosAcompanhamento = abaAcompanhamento.getLastRow();
  var data = abaAcompanhamento.getRange(`A${(indexIntervaloNomeadoRoteiro + 1)}:T${indexUltimaLinhaDadosAcompanhamento}`).getValues();

  // Agrupar dados por 'ID'
  var groupedData = {};
  data.forEach(function (row) {
    var id = row[4]; // campo 'ID' da planilha, aba '02.Acompanhamento'
    if (!groupedData[id]) {
      groupedData[id] = [];
    }
    groupedData[id].push(row);
  });

  // A linha onde o modelo começa
  let startRow = abaResultado.getRange("resultado").getRow() + 1; // resultado mais 1 linha

  // Matriz para armazenar todos os dados que serão inseridos na planilha
  var allData = [];
  var totalRowsToAdd = 0;

  // Iterar sobre cada grupo de dados
  Object.keys(groupedData).forEach(function (id) {
    var rows = groupedData[id];
    var numSteps = rows.length;
    var numLines = (primeiroValue(rows[0][0]) ? 10 : 11) + (numSteps * 5); // 8 ou 9 (informações padrão) + 5 (Passos dinâmicos) linhas

    totalRowsToAdd += numLines;

    function getValueOrDash(value) {
      return (value == null || value.trim() === '') ? '-' : value;
    }

    function primeiroValue(value) {
      return (value === null || value.trim() === '');
    }

    // Informações Gerais
    var primeiro = rows[0]; // Usa o primeiro conjunto de dados para informações gerais
    // primeiro[?] -> ESTÁ PEGANDO OS DADOS RELACIONADOS À ABA 02.ACOMPANHAMENTO.
    if (!primeiroValue(primeiro[0])) {
      allData.push(['Texto', '', primeiro[0], '', '', '', '', '', '', '']);
    }
    allData.push(['Texto', '', '', 'Caso de Teste: ' + primeiro[1], '', '', '', '', '', '']);
    allData.push(['Tabela', '', '', '', '', '', '', '', 'ID: ' + primeiro[4], 'STATUS FINAL DO TESTE: ' + primeiro[5]]);
    // allData.push(['Texto', '', '', '', '', '', 'STATUS FINAL DO TESTE: ' + primeiro[5], '', '', '']);
    // allData.push(['Texto', '', '', '', '', '', 'ID: ' + primeiro[4], '', '', '']);
    allData.push(['-', '', '', '', '', '', '', '', 'VERSÃO: ' + primeiro[6], 'IMPACTO: ' + primeiro[12]]);
    // allData.push(['Texto', '', '', '', '', '', 'VERSÃO: ' + primeiro[6], '', '', '']);
    allData.push(['-', '', '', '', '', '', '', '', 'SIMULADOR: ' + primeiro[13], 'DUT: ' + primeiro[14]]);
    allData.push(['-', '', '', '', '', '', '', '', 'CABO RF: ' + primeiro[15], 'ANTENA: ' + primeiro[16]]);
    allData.push(['-', '', '', '', '', '', '', '', 'ROUTER: ' + primeiro[17], 'RECORRÊNCIA: ' + primeiro[18]]);

    allData.push(['Texto', '', '', '', '', '', 'OBJETIVO: ' + primeiro[7], '', '', '']);
    allData.push(['Texto', '', '', '', '', '', 'REFERÊNCIA NORMATIVA: ' + primeiro[8], '', '', '']);
    allData.push(['Texto', '', '', '', '', '', 'PRÉ CONDIÇÃO: ' + getValueOrDash(primeiro[9]), '', '', '']);

    // Adiciona Passos Dinamicamente
    rows.forEach(function (row, index) {
      var passoIndex = index + 1;
      allData.push(['Texto', '', '', '', '', '', `PASSO ${passoIndex}`, '', '', '']);
      allData.push(['Texto', '', '', '', '', '', 'STATUS DO TESTE: ' + row[3], '', '', '']);
      allData.push(['Texto', '', '', '', '', '', 'PROCEDIMENTO: ' + row[10], '', '', '']);
      allData.push(['Texto', '', '', '', '', '', 'RESULTADO ESPERADO: ' + row[11], '', '', '']);
      allData.push(['Texto', '', '', '', '', '', 'RESULTADO APRESENTADO: ' + row[19], '', '', '']);
    });

    // Adiciona quebra de linha para separar os casos de teste
    allData.push(['Texto', '', '', '', '', '', '', '{{Quebra}}', '', '']);
  });

  // Inserir linhas suficientes na planilha
  abaResultado.insertRowsAfter(startRow, totalRowsToAdd); // Insere as linhas após a linha de início

  // Inserir todos os dados na planilha de uma vez
  abaResultado.getRange(startRow + 1, 1, allData.length, 10).setValues(allData); // Insere os dados após a linha de início
}

function preencherMatriz() {

  const indexAcompanhamento = 1;
  const indexResultado = 4;
  const indexResultadoAnatel = 5;

  // Teste ================================
  // var ss = SpreadsheetApp.openById('');
  // ======================================
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let valueCheckbox = ss.getRange("checkbox").getValue();
  let sheet = valueCheckbox ? ss.getSheets()[indexResultadoAnatel] : ss.getSheets()[indexResultado];
  let sheetAcompanhamento = ss.getSheets()[indexAcompanhamento];

  inserirMatrizGeral(sheet, sheetAcompanhamento);
  inserirMatrizStatus(sheet, sheetAcompanhamento);
  inserirMatriz(sheet, sheetAcompanhamento);
  // adicionarTracoEmBranco(sheet);
}
