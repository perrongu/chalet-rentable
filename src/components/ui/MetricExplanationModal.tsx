import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';

export interface MetricAdvice {
  icon: string;
  action: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
}

interface MetricExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  explanation: string;
  advice: MetricAdvice[];
}

export function MetricExplanationModal({
  isOpen,
  onClose,
  title,
  explanation,
  advice,
}: MetricExplanationModalProps) {
  if (!isOpen) return null;

  const getPriorityColor = (priority: MetricAdvice['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getPriorityLabel = (priority: MetricAdvice['priority']) => {
    switch (priority) {
      case 'high':
        return 'Priorité haute';
      case 'medium':
        return 'Priorité moyenne';
      case 'low':
        return 'À considérer';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-2xl w-full my-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl">{title}</CardTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Explication */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700 leading-relaxed">{explanation}</p>
          </div>

          {/* Conseils */}
          {advice.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Conseils pour améliorer cette métrique :</h4>
              {advice.map((item, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getPriorityColor(item.priority)}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{item.icon}</span>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {getPriorityLabel(item.priority)}
                        </span>
                      </div>
                      <p className="font-medium text-sm">{item.action}</p>
                      <p className="text-xs opacity-90">{item.impact}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bouton de fermeture */}
          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>Fermer</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

