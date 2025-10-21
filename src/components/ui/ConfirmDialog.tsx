import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';

interface ConfirmDialogProps {
  title: string;
  message: string;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
  isOpen: boolean;
}

export function ConfirmDialog({
  title,
  message,
  onCancel,
  onDiscard,
  onSave,
  isOpen,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <Card className="max-w-md w-full shadow-medium">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-700">{message}</p>
          <div className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button variant="outline" onClick={onDiscard}>
              Ne pas enregistrer
            </Button>
            <Button onClick={onSave}>
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

