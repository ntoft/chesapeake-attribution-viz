// Port of the Warmhub app's BDU meter (apps/web/src/components/BDUMeter.tsx).
// Drops the `cn` utility dependency — viz uses plain template strings.
export const BDU_COLORS = {
  belief: '#00C853',
  disbelief: '#FF6D00',
  uncertainty: '#B0BEC5',
};

interface Props {
  belief: number;
  disbelief: number;
  uncertainty: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showValues?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const heights = { sm: 'h-2', md: 'h-3', lg: 'h-4', xl: 'h-5' } as const;

export function BDUMeter({
  belief,
  disbelief,
  uncertainty,
  size = 'md',
  showValues = false,
  fullWidth = true,
  className = '',
}: Props) {
  const width = fullWidth ? 'w-full' : 'w-40';
  const h = heights[size];
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className={`flex gap-[2px] ${width}`}>
        <div
          className={`${h} transition-all duration-300`}
          style={{ flex: belief, backgroundColor: BDU_COLORS.belief, borderRadius: 3 }}
          title={`Belief: ${belief.toFixed(2)}`}
        />
        <div
          className={`${h} transition-all duration-300`}
          style={{ flex: disbelief, backgroundColor: BDU_COLORS.disbelief, borderRadius: 3 }}
          title={`Disbelief: ${disbelief.toFixed(2)}`}
        />
        <div
          className={`${h} transition-all duration-300`}
          style={{ flex: uncertainty, backgroundColor: BDU_COLORS.uncertainty, borderRadius: 3 }}
          title={`Uncertainty: ${uncertainty.toFixed(2)}`}
        />
      </div>
      {showValues && (
        <div className={`flex justify-between text-[10px] font-mono ${width}`}>
          <span style={{ color: BDU_COLORS.belief }}>b {belief.toFixed(2)}</span>
          <span style={{ color: BDU_COLORS.disbelief }}>d {disbelief.toFixed(2)}</span>
          <span style={{ color: BDU_COLORS.uncertainty }}>u {uncertainty.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
