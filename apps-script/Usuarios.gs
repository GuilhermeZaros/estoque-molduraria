function _usuarioAtivo(v) {
  var s = String(v == null ? '' : v).trim().toLowerCase();
  return s !== 'false' && s !== 'nao' && s !== 'não' && s !== '0' && s !== 'n';
}

function garantirAbaUsuarios() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(ABAS_FIN.USUARIOS);
  if (!aba) {
    aba = ss.insertSheet(ABAS_FIN.USUARIOS);
    aba.getRange(1, 1, 1, CABECALHOS_FIN.Usuarios.length).setValues([CABECALHOS_FIN.Usuarios]);
    aba.setFrozenRows(1);
  } else {
    var cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    if (cab.indexOf('papeis') === -1) aba.getRange(1, aba.getLastColumn() + 1).setValue('papeis');
  }
  if (aba.getLastRow() < 2) {
    aba.appendRow([typeof EMAIL_DONO !== 'undefined' ? EMAIL_DONO : 'dono@exemplo.com', '', 'Dono', true, 'dono']);
  }
  return 'Aba Usuarios pronta.';
}
