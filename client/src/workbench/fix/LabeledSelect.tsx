import { useId } from 'react';

import '../../styles/workbench-fix.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface LabeledSelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LabeledSelect({ label, value, options, onChange, disabled }: LabeledSelectProps) {
  const id = useId();

  return (
    <div className="fix-field">
      <label htmlFor={id} className="fix-label">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="fix-input"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
