type Props = {
  text?: string;
};

export const NormalizedText: React.FC<Props> = ({ text = '' }) => {
  // Debug: Log the raw text to see what we're working with
  console.log('NormalizedText received after API fix:', {
    text: text.substring(0, 200) + '...',
    length: text.length,
    charCodes: text.split('').map(char => `${char}(${char.charCodeAt(0)})`).slice(0, 30),
    hasBackslashN: text.includes('\\n'),
    hasActualNewline: text.includes('\n'),
    hasDoubleBackslashN: text.includes('\\n\\n'),
    hasDoubleNewline: text.includes('\n\n'),
    firstNewlineAt: text.indexOf('\n'),
    firstBackslashNAt: text.indexOf('\\n'),
  });

  // Split on double newlines to get paragraphs
  const paragraphs = text
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

  console.log('NormalizedText paragraphs after API fix:', paragraphs.length);

  return <div className="flex flex-col gap-4">{paragraphs}</div>;
};
