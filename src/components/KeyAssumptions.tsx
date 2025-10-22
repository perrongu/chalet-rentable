import { formatCurrency, formatPercent } from '../lib/utils';

interface KeyAssumptionsProps {
  occupancyRate: number;
  averageDailyRate: number;
  interestRate: number;
  appreciationRate: number;
}

interface AssumptionCardProps {
  icon: string;
  label: string;
  value: string;
}

function AssumptionCard({ icon, label, value }: AssumptionCardProps) {
  return (
    <div 
      className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      style={{ containerType: 'inline-size' }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-slate-100 w-8 h-8 rounded-lg shrink-0 flex items-center justify-center">
          <span className="text-lg leading-none">{icon}</span>
        </div>
        <p className="text-[0.65rem] font-semibold text-slate-500 uppercase tracking-[0.05em] leading-tight">
          {label}
        </p>
      </div>
      <p 
        className="font-bold text-slate-800 leading-none tracking-tight whitespace-nowrap"
        style={{ 
          fontSize: 'min(1.5rem, 12cqw)',
          containerType: 'normal'
        }}
      >
        {value}
      </p>
    </div>
  );
}

export function KeyAssumptions({
  occupancyRate,
  averageDailyRate,
  interestRate,
  appreciationRate,
}: KeyAssumptionsProps) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">ⓘ</span>
          <h3 className="text-lg font-semibold text-slate-900">Hypothèses clés</h3>
        </div>
        <p className="text-sm text-slate-500">Paramètres principaux du modèle</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <AssumptionCard
          icon="📊"
          label="Taux d'occupation"
          value={formatPercent(occupancyRate)}
        />
        <AssumptionCard
          icon="💰"
          label="Tarif moyen"
          value={formatCurrency(averageDailyRate)}
        />
        <AssumptionCard
          icon="📈"
          label="Taux d'intérêt"
          value={formatPercent(interestRate)}
        />
        <AssumptionCard
          icon="🏡"
          label="Appréciation"
          value={formatPercent(appreciationRate)}
        />
      </div>
    </div>
  );
}

