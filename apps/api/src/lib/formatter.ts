export const decimalToInteger = (decimal: number) => decimal * 100;

export const integerToDecimal = (integer: number) =>
  parseFloat((integer / 100).toFixed(2));

export const normalizeText = (text: string) =>
  text ? text.replace(/\r\n/g, '\n').replace(/\r/g, '\n') : '';
