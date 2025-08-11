type Props = {
  text?: string;
};

export const NormalizedText: React.FC<Props> = ({ text = '' }) => {
  // Handle both actual newlines (\n) and escaped newlines (\\n)
  const normalizedText = text.replace(/\\n/g, '\n');
  
  // Split on double newlines to get paragraphs, not individual lines
  const paragraphs = normalizedText
    .split('\n\n')
    .filter((paragraph) => paragraph.trim() !== '')
    .map((paragraph, key) => (
      <p key={key} className="leading-relaxed">
        {paragraph.trim()}
      </p>
    ));

  return <div className="flex flex-col gap-4">{paragraphs}</div>;
};
