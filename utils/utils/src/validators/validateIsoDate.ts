export function validateIsoDate(date: any): boolean {
  return /^\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/.test(date);
}
