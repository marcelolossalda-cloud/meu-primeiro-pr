/**
 * Leitor mínimo de ZIP usando DecompressionStream (nativo do Chrome).
 * Suporta os dois métodos que o export do Instagram usa: armazenado (0) e
 * deflate (8). Lê pelo diretório central, então funciona mesmo quando os
 * cabeçalhos locais vêm sem tamanho (data descriptor).
 */

const EOCD = 0x06054b50;
const EOCD64_LOCATOR = 0x07064b50;
const EOCD64 = 0x06064b50;
const CEN = 0x02014b50;

function acharEOCD(dv) {
  const minimo = Math.max(0, dv.byteLength - 0x10000 - 22);
  for (let i = dv.byteLength - 22; i >= minimo; i--) {
    if (dv.getUint32(i, true) === EOCD) return i;
  }
  return -1;
}

function localizarDiretorio(dv) {
  const eocd = acharEOCD(dv);
  if (eocd < 0) throw new Error('Arquivo .zip inválido ou incompleto.');

  let total = dv.getUint16(eocd + 10, true);
  let offset = dv.getUint32(eocd + 16, true);

  // ZIP64: o offset real fica no registro estendido.
  if (total === 0xffff || offset === 0xffffffff) {
    const loc = eocd - 20;
    if (loc >= 0 && dv.getUint32(loc, true) === EOCD64_LOCATOR) {
      const eocd64 = Number(dv.getBigUint64(loc + 8, true));
      if (dv.getUint32(eocd64, true) === EOCD64) {
        total = Number(dv.getBigUint64(eocd64 + 32, true));
        offset = Number(dv.getBigUint64(eocd64 + 48, true));
      }
    }
  }
  return { total, offset };
}

function lerZip64Extra(dv, inicio, tamanho, entrada) {
  let p = inicio;
  const fim = inicio + tamanho;
  while (p + 4 <= fim) {
    const id = dv.getUint16(p, true);
    const len = dv.getUint16(p + 2, true);
    let q = p + 4;
    if (id === 0x0001) {
      if (entrada.tamanhoDescomprimido === 0xffffffff) { entrada.tamanhoDescomprimido = Number(dv.getBigUint64(q, true)); q += 8; }
      if (entrada.tamanhoComprimido === 0xffffffff) { entrada.tamanhoComprimido = Number(dv.getBigUint64(q, true)); q += 8; }
      if (entrada.offsetLocal === 0xffffffff) { entrada.offsetLocal = Number(dv.getBigUint64(q, true)); q += 8; }
    }
    p += 4 + len;
  }
}

/** Lista as entradas do zip sem descomprimir nada. */
export function listarEntradas(buffer) {
  const dv = new DataView(buffer);
  const { total, offset } = localizarDiretorio(dv);
  const decoder = new TextDecoder('utf-8');
  const entradas = [];

  let p = offset;
  for (let i = 0; i < total && p + 46 <= dv.byteLength; i++) {
    if (dv.getUint32(p, true) !== CEN) break;

    const metodo = dv.getUint16(p + 10, true);
    const nomeLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const comentarioLen = dv.getUint16(p + 32, true);

    const entrada = {
      nome: decoder.decode(new Uint8Array(buffer, p + 46, nomeLen)),
      metodo,
      tamanhoComprimido: dv.getUint32(p + 20, true),
      tamanhoDescomprimido: dv.getUint32(p + 24, true),
      offsetLocal: dv.getUint32(p + 42, true),
    };
    if (extraLen) lerZip64Extra(dv, p + 46 + nomeLen, extraLen, entrada);
    if (!entrada.nome.endsWith('/')) entradas.push(entrada);

    p += 46 + nomeLen + extraLen + comentarioLen;
  }
  return entradas;
}

/** Descomprime uma entrada e devolve o conteúdo como texto UTF-8. */
export async function lerEntradaComoTexto(buffer, entrada) {
  const dv = new DataView(buffer);
  const base = entrada.offsetLocal;
  if (dv.getUint32(base, true) !== 0x04034b50) throw new Error('Entrada corrompida em ' + entrada.nome);

  const nomeLen = dv.getUint16(base + 26, true);
  const extraLen = dv.getUint16(base + 28, true);
  const inicio = base + 30 + nomeLen + extraLen;
  const bytes = new Uint8Array(buffer, inicio, entrada.tamanhoComprimido);

  if (entrada.metodo === 0) return new TextDecoder('utf-8').decode(bytes);
  if (entrada.metodo !== 8) throw new Error('Compressão não suportada no arquivo ' + entrada.nome + '.');

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return await new Response(stream).text();
}
