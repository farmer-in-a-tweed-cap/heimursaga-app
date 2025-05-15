export const decimalToInteger = (decimal: number) => decimal * 100;

export const integerToDecimal = (integer: number) =>
  parseFloat((integer / 100).toFixed(2));

export const normalizeText = (text: string) =>
  text ? text.replace(/\r\n|\r|\n/g, '\\n') : '';
