import { useState, useMemo, useEffect } from 'react';
import { ProjectProvider, useProject } from './store/ProjectContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/Tabs';
import { Button } from './components/ui/Button';
import { KPIDashboard } from './components/KPIDashboard';
import { InputForm } from './features/inputs/InputForm';
import { ScenarioManager } from './features/scenarios/ScenarioManager';
import { SensitivityAnalysis } from './features/sensitivity/SensitivityAnalysis';
import { ProjectionAnalysis } from './features/projections/ProjectionAnalysis';
import { saveProjectFile, loadProjectFile } from './lib/exports';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/Card';
import { sanitizeForDisplay } from './lib/utils';
import { ConfirmDialog } from './components/ui/ConfirmDialog';

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Inspection: {metric}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 text-slate-700">Formule</h4>
            <pre className="bg-slate-50 p-3 rounded-xl text-sm whitespace-pre-wrap border border-slate-100">
              {trace.formula}
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-2 text-slate-700">Variables</h4>
            <div className="space-y-1">
              {Object.entries(trace.variables).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-slate-600">{key}:</span>
                  <span className="font-mono">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2 text-slate-700">Résultat</h4>
            <div className="text-2xl font-bold text-sky-600">{String(trace.result)}</div>
          </div>

          {trace.sources && trace.sources.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-slate-700">Sources</h4>
              <div className="space-y-2">
                {trace.sources.map((source: any, i: number) => (
                  <div key={i} className="text-sm">
                    {source.source && (
                      <div>
                        <span className="text-slate-600">Source: </span>
                        <span>{sanitizeForDisplay(source.source)}</span>
                      </div>
                    )}
                    {source.remarks && (
                      <div>
                        <span className="text-slate-600">Remarques: </span>
                        <span>{sanitizeForDisplay(source.remarks)}</span>
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
  const { project, getCurrentKPIs, getCurrentInputs, dispatch, hasUnsavedChanges } = useProject();
  const [inspectingMetric, setInspectingMetric] = useState<string | null>(null);
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState(project.name);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'new' | 'load' | null>(null);

  const handleSave = async () => {
    try {
      await saveProjectFile(project);
      dispatch({ type: 'MARK_AS_SAVED' });
      alert('Projet sauvegardé avec succès');
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Erreur lors de la sauvegarde du projet');
    }
  };

  const handleExportPDF = async () => {
    try {
      const kpis = getCurrentKPIs();
      const inputs = getCurrentInputs();
      const { exportProfessionalReportToPDF } = await import('./lib/exports');
      
      await exportProfessionalReportToPDF(
        project,
        inputs,
        kpis,
        activeScenario?.name || 'Base',
        `rapport-${project.name.replace(/[^a-z0-9]/gi, '_')}.pdf`
      );
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Erreur lors de l\'export du rapport PDF');
    }
  };

  const handleLoad = async () => {
    if (hasUnsavedChanges()) {
      setPendingAction('load');
      setShowConfirmDialog(true);
      return;
    }
    await performLoad();
  };

  const performLoad = async () => {
    try {
      const loadedProject = await loadProjectFile();
      if (loadedProject) {
        dispatch({ type: 'LOAD_PROJECT', payload: loadedProject });
        dispatch({ type: 'MARK_AS_SAVED' });
        alert('Projet chargé avec succès');
      }
    } catch (error) {
      console.error('Error loading project:', error);
      alert('Erreur lors du chargement du projet');
    }
  };

  const handleNewProject = () => {
    if (hasUnsavedChanges()) {
      setPendingAction('new');
      setShowConfirmDialog(true);
      return;
    }
    performNewProject();
  };

  const performNewProject = () => {
    dispatch({ type: 'RESET_PROJECT' });
    dispatch({ type: 'MARK_AS_SAVED' });
  };

  const handleConfirmSave = async () => {
    setShowConfirmDialog(false);
    await handleSave();
    if (pendingAction === 'new') {
      performNewProject();
    } else if (pendingAction === 'load') {
      await performLoad();
    }
    setPendingAction(null);
  };

  const handleConfirmDiscard = async () => {
    setShowConfirmDialog(false);
    if (pendingAction === 'new') {
      performNewProject();
    } else if (pendingAction === 'load') {
      await performLoad();
    }
    setPendingAction(null);
  };

  const handleConfirmCancel = () => {
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  const handleProjectNameClick = () => {
    setIsEditingProjectName(true);
    setProjectNameInput(project.name);
  };

  const handleProjectNameBlur = () => {
    setIsEditingProjectName(false);
    if (projectNameInput.trim() && projectNameInput !== project.name) {
      dispatch({ type: 'UPDATE_PROJECT_INFO', payload: { name: projectNameInput.trim() } });
    } else {
      setProjectNameInput(project.name);
    }
  };

  const handleProjectNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleProjectNameBlur();
    } else if (e.key === 'Escape') {
      setIsEditingProjectName(false);
      setProjectNameInput(project.name);
    }
  };

  // Garder le nom du projet à jour
  useEffect(() => {
    if (!isEditingProjectName) {
      setProjectNameInput(project.name);
    }
  }, [project.name, isEditingProjectName]);

  // Mémoiser les KPIs pour éviter recalculs inutiles
  const inputs = getCurrentInputs();
  const kpis = useMemo(() => {
    return getCurrentKPIs();
  }, [inputs, getCurrentKPIs]);

  const activeScenario = project.scenarios.find(s => s.id === project.activeScenarioId);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40 shadow-subtle" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Analyse de Rentabilité - Chalet Locatif
              </h1>
              <div className="flex items-center gap-3 mt-1">
                {isEditingProjectName ? (
                  <input
                    type="text"
                    value={projectNameInput}
                    onChange={(e) => setProjectNameInput(e.target.value)}
                    onBlur={handleProjectNameBlur}
                    onKeyDown={handleProjectNameKeyDown}
                    className="text-sm text-slate-600 border border-sky-400 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    autoFocus
                    aria-label="Modifier le nom du projet"
                  />
                ) : (
                  <p
                    className="text-sm text-slate-600 cursor-pointer hover:text-slate-800 hover:underline"
                    onClick={handleProjectNameClick}
                    aria-label="Nom du projet (cliquer pour modifier)"
                    title="Cliquer pour modifier"
                  >
                    {project.name}
                  </p>
                )}
                {activeScenario && (
                  <span
                    className={`text-xs px-3 py-1.5 rounded-full ${
                      activeScenario.isBase
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-sky-100 text-sky-700'
                    }`}
                    aria-label="Scénario actif"
                  >
                    Scénario : {activeScenario.name}
                  </span>
                )}
              </div>
            </div>
            <nav aria-label="Actions principales">
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleNewProject} aria-label="Nouveau projet">
                  <span className="emoji-icon">✨</span>Nouveau
                </Button>
                <Button variant="outline" onClick={handleLoad} aria-label="Ouvrir un projet">
                  <span className="emoji-icon">📂</span>Ouvrir
                </Button>
                <Button variant="outline" onClick={handleSave} aria-label="Enregistrer le projet">
                  <span className="emoji-icon">💾</span>Enregistrer
                </Button>
                <Button variant="outline" onClick={handleExportPDF} aria-label="Exporter rapport PDF">
                  <span className="emoji-icon">📄</span>Rapport PDF
                </Button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Inputs & Navigation */}
          <div className="lg:col-span-3 space-y-6">
            <Tabs defaultValue="inputs">
              <TabsList>
                <TabsTrigger value="inputs">Paramètres</TabsTrigger>
                <TabsTrigger value="scenarios">Scénarios</TabsTrigger>
                <TabsTrigger value="sensitivity">Sensibilité</TabsTrigger>
                <TabsTrigger value="projections">Projections</TabsTrigger>
              </TabsList>

              <div className="sr-only" role="status" aria-live="polite">
                Affichage de l'onglet actif
              </div>

              <TabsContent value="inputs">
                <InputForm />
              </TabsContent>

              <TabsContent value="scenarios">
                <ScenarioManager />
              </TabsContent>

              <TabsContent value="sensitivity">
                <SensitivityAnalysis />
              </TabsContent>

              <TabsContent value="projections">
                <ProjectionAnalysis />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - KPI Dashboard */}
          <aside className="lg:col-span-2" aria-label="Indicateurs de performance">
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
          </aside>
        </div>
      </main>

      {/* Modal d'inspection */}
      {inspectingMetric && (
        <InspectionModal
          metric={inspectingMetric}
          onClose={() => setInspectingMetric(null)}
        />
      )}

      {/* Dialogue de confirmation */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Changements non sauvegardés"
        message="Voulez-vous enregistrer les modifications avant de continuer ?"
        onCancel={handleConfirmCancel}
        onDiscard={handleConfirmDiscard}
        onSave={handleConfirmSave}
      />
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
