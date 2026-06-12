type Props = { statusCode: number };

function getStyle(code: number): string {
  if (code >= 200 && code < 300) return 'bg-green-100 text-green-800 ring-green-200';
  if (code >= 300 && code < 400) return 'bg-blue-100 text-blue-800 ring-blue-200';
  if (code >= 400 && code < 500) return 'bg-yellow-100 text-yellow-800 ring-yellow-200';
  return 'bg-red-100 text-red-800 ring-red-200';
}

export function StatusBadge({ statusCode }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getStyle(statusCode)}`}
    >
      {statusCode}
    </span>
  );
}
