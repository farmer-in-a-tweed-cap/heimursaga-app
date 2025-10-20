type Props = {
  text?: string;
};

export const NormalizedText: React.FC<Props> = ({ text = '' }) => {
  // Normalize escaped newlines (\\n) to actual newlines (\n)
  const normalizedText = text.replace(/\\n/g, '\n');

  // Split on double newlines to get paragraphs
  const paragraphs = normalizedText
    .split('\n\n')
    .filter((paragraph) => paragraph.trim() !== '')
    .map((paragraph, key) => {
      // Split single newlines within paragraphs and create line breaks
      const lines = paragraph.trim().split('\n');
      return (
        <p key={key} className="leading-relaxed">
          {lines.map((line, lineIndex) => (
            <span key={lineIndex}>
              {line}
              {lineIndex < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
      );
    });

  return <div className="flex flex-col gap-4">{paragraphs}</div>;
};
