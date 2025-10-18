import { useState } from 'react';
import { ProjectProvider, useProject } from './store/ProjectContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/Tabs';
import { Button } from './components/ui/Button';
import { KPIDashboard } from './components/KPIDashboard';
import { InputForm } from './features/inputs/InputForm';
import { ScenarioManager } from './features/scenarios/ScenarioManager';
import { SensitivityAnalysis } from './features/sensitivity/SensitivityAnalysis';
import { Optimizer } from './features/optimization/Optimizer';
import { saveProjectFile, loadProjectFile } from './lib/exports';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/Card';

function InspectionModal({
  metric,
  onClose,
}: {
  metric: string;
  onClose: () => void;
}) {
  const { getCurrentKPIs } = useProject();
  const kpis = getCurrentKPIs();
  const trace = (kpis.traces as any)[metric];

  if (!trace) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Inspection: {metric}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Formule</h4>
            <pre className="bg-gray-100 p-3 rounded text-sm whitespace-pre-wrap">
              {trace.formula}
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-2">Variables</h4>
            <div className="space-y-1">
              {Object.entries(trace.variables).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-600">{key}:</span>
                  <span className="font-mono">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Résultat</h4>
            <div className="text-2xl font-bold text-blue-600">{String(trace.result)}</div>
          </div>

          {trace.sources && trace.sources.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Sources</h4>
              <div className="space-y-2">
                {trace.sources.map((source: any, i: number) => (
                  <div key={i} className="text-sm">
                    {source.source && (
                      <div>
                        <span className="text-gray-600">Source: </span>
                        <span>{source.source}</span>
                      </div>
                    )}
                    {source.remarks && (
                      <div>
                        <span className="text-gray-600">Remarques: </span>
                        <span>{source.remarks}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={() => {
              navigator.clipboard.writeText(trace.formula);
              alert('Formule copiée dans le presse-papiers!');
            }}
            variant="outline"
            className="w-full"
          >
            Copier la formule
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AppContent() {
  const { project, getCurrentKPIs } = useProject();
  const [inspectingMetric, setInspectingMetric] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      await saveProjectFile(project);
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Erreur lors de la sauvegarde du projet');
    }
  };

  const handleLoad = async () => {
    try {
      const loadedProject = await loadProjectFile();
      if (loadedProject) {
        // Charger le projet via le dispatch
        window.location.reload(); // Simple reload pour l'instant
      }
    } catch (error) {
      console.error('Error loading project:', error);
      alert('Erreur lors du chargement du projet');
    }
  };

  const kpis = getCurrentKPIs();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Analyse de Rentabilité - Chalet Locatif
              </h1>
              <p className="text-sm text-gray-600 mt-1">{project.name}</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleLoad}>
                📂 Ouvrir
              </Button>
              <Button variant="outline" onClick={handleSave}>
                💾 Enregistrer
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Inputs & Navigation */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="inputs">
              <TabsList>
                <TabsTrigger value="inputs">Paramètres</TabsTrigger>
                <TabsTrigger value="scenarios">Scénarios</TabsTrigger>
                <TabsTrigger value="sensitivity">Sensibilité</TabsTrigger>
                <TabsTrigger value="optimization">Optimisation</TabsTrigger>
              </TabsList>

              <TabsContent value="inputs">
                <InputForm />
              </TabsContent>

              <TabsContent value="scenarios">
                <ScenarioManager />
              </TabsContent>

              <TabsContent value="sensitivity">
                <SensitivityAnalysis />
              </TabsContent>

              <TabsContent value="optimization">
                <Optimizer />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - KPI Dashboard */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle>Tableau de bord</CardTitle>
                </CardHeader>
                <CardContent>
                  <KPIDashboard kpis={kpis} onInspect={setInspectingMetric} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Modal d'inspection */}
      {inspectingMetric && (
        <InspectionModal
          metric={inspectingMetric}
          onClose={() => setInspectingMetric(null)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}

export default App;
