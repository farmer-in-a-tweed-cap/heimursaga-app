type Props = {
  text?: string;
};

export const NormalizedText: React.FC<Props> = ({ text = '' }) => {
  const lines = text
    .split('\\n')
    .filter((line) => line.trim() !== '')
    .map((line, key) => <p key={key}>{line}</p>);

  return <div className="flex flex-col gap-3">{lines}</div>;
};
