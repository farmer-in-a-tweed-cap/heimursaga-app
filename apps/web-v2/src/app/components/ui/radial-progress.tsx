interface RadialProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showValue?: boolean;
  centerContent?: React.ReactNode;
}

export function RadialProgress({
  value,
  size = 120,
  strokeWidth = 8,
  className = "",
  showValue = true,
  centerContent,
}: RadialProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#b5bcc4"
          strokeWidth={strokeWidth}
          fill="none"
          className="dark:stroke-[#3a3a3a]"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#4676ac"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="square"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerContent || (
          showValue && (
            <span className="text-xl font-bold font-mono text-[#4676ac]">
              {Math.round(value)}%
            </span>
          )
        )}
      </div>
    </div>
  );
}
