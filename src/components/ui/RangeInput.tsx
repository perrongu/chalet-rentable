import { useState, useEffect } from 'react';
import type { InputWithSource, RangeValue } from '../../types';

interface RangeInputProps {
  label: string;
  value: InputWithSource<number>;
  onChange: (value: InputWithSource<number>) => void;
  min?: number; // Validation globale
  max?: number; // Validation globale
  step?: number;
  className?: string;
}

export function RangeInput({
  label,
  value,
  onChange,
  min: globalMin,
  max: globalMax,
  step = 1,
  className = '',
}: RangeInputProps) {
  const useRange = value.range?.useRange ?? false;
  const [error, setError] = useState<string>('');

  // Validation de la valeur par défaut
  useEffect(() => {
    if (useRange && value.range) {
      const { min, max, default: defaultVal } = value.range;
      if (defaultVal < min || defaultVal > max) {
        setError('La valeur par défaut doit être entre min et max');
      } else {
        setError('');
      }
    } else {
      setError('');
    }
  }, [useRange, value.range]);

  const toggleUseRange = () => {
    if (!useRange) {
      // Activer le mode plage
      const currentValue = value.value;
      onChange({
        ...value,
        range: {
          min: currentValue * 0.8,
          max: currentValue * 1.2,
          default: currentValue,
          useRange: true,
        },
      });
    } else {
      // Désactiver le mode plage
      onChange({
        ...value,
        range: value.range ? { ...value.range, useRange: false } : undefined,
      });
    }
  };

  const updateRangeField = (field: keyof RangeValue, newValue: number | boolean) => {
    if (!value.range) return;

    const updatedRange = { ...value.range, [field]: newValue };
    onChange({
      ...value,
      range: updatedRange,
    });
  };

  const updateExactValue = (newValue: number) => {
    onChange({
      ...value,
      value: newValue,
    });
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <label className="flex items-center text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={useRange}
            onChange={toggleUseRange}
            className="mr-1"
          />
          Plage min/max
        </label>
      </div>

      {useRange && value.range ? (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Min</label>
              <input
                type="number"
                value={value.range.min}
                onChange={(e) => updateRangeField('min', Number(e.target.value))}
                min={globalMin}
                max={globalMax}
                step={step}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Défaut</label>
              <input
                type="number"
                value={value.range.default}
                onChange={(e) => updateRangeField('default', Number(e.target.value))}
                min={value.range.min}
                max={value.range.max}
                step={step}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max</label>
              <input
                type="number"
                value={value.range.max}
                onChange={(e) => updateRangeField('max', Number(e.target.value))}
                min={globalMin}
                max={globalMax}
                step={step}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      ) : (
        <input
          type="number"
          value={value.value}
          onChange={(e) => updateExactValue(Number(e.target.value))}
          min={globalMin}
          max={globalMax}
          step={step}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );
}

