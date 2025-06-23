export const calculateFee = ({
  amount,
  percent,
}: {
  amount: number;
  percent: number;
}): number => {
  if (percent <= 0) return 0;
  return (amount * 100 * (percent / 100)) / 100;
};
