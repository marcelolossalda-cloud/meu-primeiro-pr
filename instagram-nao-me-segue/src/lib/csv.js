/** Geração de CSV compatível com Excel/Sheets (com BOM e CRLF). */

function campo(valor) {
  const s = valor == null ? '' : String(valor);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function paraCsv(usuarios) {
  const linhas = [['usuario', 'nome', 'perfil', 'verificado', 'privado']];
  for (const u of usuarios) {
    linhas.push([
      u.username,
      u.full_name || '',
      'https://www.instagram.com/' + u.username + '/',
      u.is_verified ? 'sim' : 'nao',
      u.is_private ? 'sim' : 'nao',
    ]);
  }
  return '﻿' + linhas.map((l) => l.map(campo).join(',')).join('\r\n');
}

export function baixar(nomeArquivo, conteudo, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
