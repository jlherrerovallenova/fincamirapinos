const euroFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
});

export const formatCurrency = (amount?: number | null): string => {
  if (amount === undefined || amount === null) return '0 €';
  return euroFormatter.format(amount);
};
