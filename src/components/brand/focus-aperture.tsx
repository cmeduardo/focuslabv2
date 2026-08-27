export function FocusAperture({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      role="presentation"
    >
      <circle
        cx="50"
        cy="50"
        r="47"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />
      <g
        className={animated ? "motion-safe:animate-[spin_16s_linear_infinite]" : undefined}
        style={{ transformOrigin: "50px 50px" }}
      >
        <circle
          cx="50"
          cy="50"
          r="33"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeWidth="1.5"
          strokeDasharray="3 7"
        />
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={i}
            x1="50"
            y1="50"
            x2="50"
            y2="11"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity={i % 2 === 0 ? 1 : 0.45}
            transform={`rotate(${i * 45} 50 50)`}
          />
        ))}
      </g>
      <circle cx="50" cy="50" r="7" fill="currentColor" />
    </svg>
  );
}
