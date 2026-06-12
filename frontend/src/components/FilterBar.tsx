'use client';

export type StatusFilter = 'all' | '2xx' | 'error';
export type EventFilter = 'all' | 'health_check' | 'status_probe' | 'latency_test';
export type DateFilter = 'all' | 'last_hour' | 'last_24h' | 'last_7d';

type Props = {
  status: StatusFilter;
  event: EventFilter;
  date: DateFilter;
  onStatus: (v: StatusFilter) => void;
  onEvent: (v: EventFilter) => void;
  onDate: (v: DateFilter) => void;
};

function FilterGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-xs font-medium text-gray-500">{label}</span>
      <div className="flex gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              value === o.value
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FilterBar({ status, event, date, onStatus, onEvent, onDate }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <FilterGroup<StatusFilter>
        label="Status"
        value={status}
        options={[
          { label: 'All', value: 'all' },
          { label: 'Success (2xx)', value: '2xx' },
          { label: 'Error', value: 'error' },
        ]}
        onChange={onStatus}
      />

      <div className="hidden h-4 w-px bg-gray-200 sm:block" />

      <FilterGroup<EventFilter>
        label="Event"
        value={event}
        options={[
          { label: 'All', value: 'all' },
          { label: 'Health', value: 'health_check' },
          { label: 'Probe', value: 'status_probe' },
          { label: 'Latency', value: 'latency_test' },
        ]}
        onChange={onEvent}
      />

      <div className="hidden h-4 w-px bg-gray-200 sm:block" />

      <FilterGroup<DateFilter>
        label="Range"
        value={date}
        options={[
          { label: 'All', value: 'all' },
          { label: '1h', value: 'last_hour' },
          { label: '24h', value: 'last_24h' },
          { label: '7d', value: 'last_7d' },
        ]}
        onChange={onDate}
      />
    </div>
  );
}
