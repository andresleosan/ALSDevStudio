// @ts-check
/** Compara SQL aceptado por SQLite: preserva literales y solo equipara identificadores conocidos.
 * @param {string} sql @param {Set<string>} identifiers @param {Set<string>} objectNames */
export function schemaTokens(sql, identifiers, objectNames) {
  const source = sql.match(/--[^\r\n]*|\/\*[\s\S]*?\*\/|'(?:[^']|'')*'|"(?:[^"]|"")*"|`(?:[^`]|``)*`|\[[^\]]*\]|[A-Za-z_][A-Za-z_0-9$]*|\d+(?:\.\d+)?|[^\s]/g) || [];
  /** @type {Array<[string,string]>} */
  const tokens = [];
  for (const token of source) {
    if (token.startsWith('--') || token.startsWith('/*')) continue;
    if (token[0] === "'") tokens.push(['literal', token]);
    else if (['"', '`', '['].includes(token[0])) {
      const quote = token[0];
      const name = token.slice(1, -1).replaceAll(quote + quote, quote).toLowerCase();
      tokens.push(identifiers.has(name) ? ['word', name] : ['quoted', token]);
    } else tokens.push(/^[A-Za-z_]/.test(token) ? ['word', token.toLowerCase()] : ['symbol', token]);
  }
  return JSON.stringify(tokens.filter((token, index) => {
    if (token[0] === 'word' && token[1] === 'main' && tokens[index + 1]?.[1] === '.'
      && objectNames.has(tokens[index + 2]?.[1])) return false;
    if (token[1] === '.' && tokens[index - 1]?.[0] === 'word' && tokens[index - 1]?.[1] === 'main'
      && objectNames.has(tokens[index + 1]?.[1])) return false;
    return true;
  }));
}
