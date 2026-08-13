type Option = { readonly id: string; readonly label: string; readonly blurb: string };

export function OptionGrid({
  label,
  options,
  value,
  onChange,
  columns,
}: {
  label: string;
  options: readonly Option[];
  value: string;
  onChange: (id: string) => void;
  columns: 2 | 3;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </legend>
      <div
        className={`mt-3 grid gap-3 sm:grid-cols-2 ${columns === 3 ? "lg:grid-cols-3" : ""}`}
      >
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.id)}
              className={`rounded-sm border p-4 text-left transition-colors ${
                selected
                  ? "border-primary bg-primary/10 text-foreground panel-glow"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <span className="font-display text-xl tracking-wide">{option.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{option.blurb}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
