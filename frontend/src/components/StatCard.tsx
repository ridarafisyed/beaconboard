type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: 'green' | 'yellow' | 'red' | 'default';
};

const accentMap: Record<NonNullable<Props['accent']>, string> = {
  green: 'text-green-600',
  yellow: 'text-yellow-600',
  red: 'text-red-600',
  default: 'text-gray-900',
};

export function StatCard({ title, value, subtitle, accent = 'default' }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${accentMap[accent]}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}
