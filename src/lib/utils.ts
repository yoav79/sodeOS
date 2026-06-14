/**
 * Combines multiple CSS class values into a single class string.
 * Acepta cadenas de texto, valores booleanos falsy, nulos o indefinidos.
 * Une únicamente las clases que son cadenas de texto no vacías (truthy).
 */
export function cn(...inputs: unknown[]): string {
  return inputs
    .flat(Infinity)
    .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .join(' ');
}
