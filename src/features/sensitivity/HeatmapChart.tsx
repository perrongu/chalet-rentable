import { useState, useRef, useEffect, useCallback } from 'react';
import domtoimage from 'dom-to-image-more';
import type { SensitivityAnalysis2D, KPIResults } from '../../types';
import { formatCurrency, formatPercent, formatNumber } from '../../lib/utils';
import { CURRENCY_METRICS, PERCENTAGE_METRICS } from '../../lib/constants';
import { CHART_COLORS } from '../../lib/colors';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Maximize2, Download, X } from 'lucide-react';

// Constantes pour l'export d'image
const IMAGE_EXPORT_SCALE = 3; // Multiplicateur pour haute résolution
const DOM_UPDATE_DELAY = 100; // Délai pour s'assurer que le DOM est rendu
const LEGEND_SPACING = '20px'; // Espacement entre tableau et légende

// Constantes pour le mode plein écran
const FULLSCREEN_PADDING = 100; // Padding de sécurité autour du contenu
const MAX_FULLSCREEN_SCALE = 1.5; // Limite maximale du zoom
const SCALE_CALCULATION_DELAY = 100; // Délai avant calcul du scale

interface HeatmapChartProps {
  results: SensitivityAnalysis2D['results'];
  objective: keyof KPIResults;
  labelX: string;
  labelY: string;
  paramPathX: string;
  paramPathY: string;
}

/**
 * Nettoie un nom de fichier en retirant les caractères spéciaux
 */
const sanitizeFilename = (text: string): string => {
  return text.replace(/[^a-z0-9]/gi, '-').toLowerCase();
};

export function HeatmapChart({ results, objective, labelX, labelY, paramPathX, paramPathY }: HeatmapChartProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const fullscreenContentRef = useRef<HTMLDivElement>(null);

  if (!results) return null;

  const { grid, xValues, yValues } = results;

  // Validation : grille vide
  if (!grid || grid.length === 0 || grid[0].length === 0) {
    return <div className="text-sm text-gray-500">Aucune donnée à afficher</div>;
  }

  // Trouver min/max pour déterminer l'intensité maximale
  const allValues = grid.flat();
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  
  // Échelle centrée sur 0 (éviter division par zéro si toutes les valeurs sont 0)
  const maxAbsValue = Math.max(Math.abs(minValue), Math.abs(maxValue)) || 1;
  
  // Seuil pour considérer une valeur comme "proche de 0" (1% de la valeur absolue max)
  const ZERO_THRESHOLD = 0.01;
  const isNearZero = (val: number) => Math.abs(val) < maxAbsValue * ZERO_THRESHOLD;

  // Couleurs de base pour le gradient (utiliser les couleurs de la palette)
  const COLOR_RED_LIGHT = CHART_COLORS.gradient.negativeLight;
  const COLOR_RED_DARK = CHART_COLORS.gradient.negativeDark;
  const COLOR_GREEN_LIGHT = CHART_COLORS.gradient.positiveLight;
  const COLOR_GREEN_DARK = CHART_COLORS.gradient.positiveDark;
  const COLOR_NEAR_ZERO = CHART_COLORS.nearZero;

  const getColor = (value: number) => {
    if (isNearZero(value)) {
      return COLOR_NEAR_ZERO;
    }
    
    if (value < 0) {
      // Valeurs négatives : gradient de rouge pâle (proche de 0) à rouge foncé (loin de 0)
      const intensity = Math.abs(value) / maxAbsValue;
      const r = COLOR_RED_DARK.r;
      const g = Math.floor(COLOR_RED_LIGHT.g - intensity * (COLOR_RED_LIGHT.g - COLOR_RED_DARK.g));
      const b = Math.floor(COLOR_RED_LIGHT.b - intensity * (COLOR_RED_LIGHT.b - COLOR_RED_DARK.b));
      return `rgba(${r}, ${g}, ${b}, 0.9)`;
    } else {
      // Valeurs positives : gradient de vert pâle (proche de 0) à vert foncé (loin de 0)
      const intensity = value / maxAbsValue;
      const r = Math.floor(COLOR_GREEN_LIGHT.r - intensity * (COLOR_GREEN_LIGHT.r - COLOR_GREEN_DARK.r));
      const g = Math.floor(COLOR_GREEN_LIGHT.g - intensity * (COLOR_GREEN_LIGHT.g - COLOR_GREEN_DARK.g));
      const b = Math.floor(COLOR_GREEN_LIGHT.b - intensity * (COLOR_GREEN_LIGHT.b - COLOR_GREEN_DARK.b));
      return `rgba(${r}, ${g}, ${b}, 0.9)`;
    }
  };
  
  // Détecter si une cellule est sur la frontière (changement de signe avec voisins)
  const isOnBoundary = (i: number, j: number): boolean => {
    const value = grid[j][i];
    
    // Vérifier les 4 voisins (haut, bas, gauche, droite)
    const neighbors = [
      j > 0 ? grid[j - 1][i] : null,                    // haut
      j < grid.length - 1 ? grid[j + 1][i] : null,      // bas
      i > 0 ? grid[j][i - 1] : null,                    // gauche
      i < grid[j].length - 1 ? grid[j][i + 1] : null,   // droite
    ];
    
    // Si la valeur actuelle et au moins un voisin ont des signes opposés
    return neighbors.some(neighbor => {
      if (neighbor === null) return false;
      return (value < 0 && neighbor > 0) || (value > 0 && neighbor < 0);
    });
  };

  // Déterminer le format selon le type de métrique
  const isCurrency = CURRENCY_METRICS.includes(objective);
  const isPercentage = PERCENTAGE_METRICS.includes(objective);

  const formatValue = (value: number) => {
    if (isCurrency) {
      return formatCurrency(value);
    }
    if (isPercentage) {
      return formatPercent(value);
    }
    return formatNumber(value, 0);
  };
  
  // Formater les valeurs des paramètres dans les en-têtes
  const formatParamValue = (value: number, paramPath: string) => {
    if (paramPath.includes('occupancyRate') || 
        paramPath.includes('interestRate') || 
        paramPath.includes('appreciationRate')) {
      return formatPercent(value);
    }
    if (paramPath.includes('Years') || paramPath.includes('amortization')) {
      return `${value.toFixed(1)} ans`;
    }
    // Par défaut, montants monétaires
    return formatCurrency(value);
  };
  
  // Symbole visuel pour accessibilité
  const getValueSymbol = (value: number): string => {
    if (isNearZero(value)) return '≈';
    return value > 0 ? '+' : '−'; // Utiliser le vrai signe moins (U+2212), pas le tiret
  };

  // Fonction pour ouvrir le mode plein écran
  const handleFullscreen = () => {
    setIsFullscreen(true);
  };

  // Fonction pour fermer le mode plein écran
  const handleCloseFullscreen = useCallback(() => {
    setIsFullscreen(false);
    setScale(1);
  }, []);

  // Calculer le scale pour le mode plein écran
  useEffect(() => {
    if (isFullscreen && fullscreenContentRef.current) {
      const calculateScale = () => {
        const content = fullscreenContentRef.current;
        if (!content) return;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const contentWidth = content.scrollWidth;
        const contentHeight = content.scrollHeight;

        const availableWidth = windowWidth - FULLSCREEN_PADDING;
        const availableHeight = windowHeight - FULLSCREEN_PADDING;

        const scaleX = availableWidth / contentWidth;
        const scaleY = availableHeight / contentHeight;

        // Utiliser le plus petit scale pour que tout soit visible
        const newScale = Math.min(scaleX, scaleY, MAX_FULLSCREEN_SCALE);
        setScale(newScale);
      };

      // Calculer après un court délai pour s'assurer que le DOM est prêt
      const timer = setTimeout(calculateScale, SCALE_CALCULATION_DELAY);
      window.addEventListener('resize', calculateScale);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', calculateScale);
      };
    }
  }, [isFullscreen]);

  // Gestion de la touche ESC pour fermer le mode plein écran
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isFullscreen) {
      handleCloseFullscreen();
    }
  }, [isFullscreen, handleCloseFullscreen]);

  useEffect(() => {
    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFullscreen, handleKeyDown]);

  /**
   * Prépare un clone de l'élément pour l'export en retirant les overflow et positions problématiques
   */
  const prepareCloneForExport = (element: HTMLElement): HTMLElement => {
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Appliquer des styles pour assurer que tout le contenu est visible
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.width = 'auto';
    clone.style.height = 'auto';
    clone.style.overflow = 'visible';
    clone.style.maxWidth = 'none';
    clone.style.maxHeight = 'none';
    clone.style.display = 'block';
    
    // Trouver tous les éléments avec overflow et les rendre visibles
    const overflowElements = clone.querySelectorAll('*');
    overflowElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      const computed = window.getComputedStyle(el);
      
      htmlEl.style.overflow = 'visible';
      htmlEl.style.maxWidth = 'none';
      htmlEl.style.maxHeight = 'none';
      
      // Retirer les propriétés sticky qui peuvent causer des problèmes
      if (computed.position === 'sticky') {
        htmlEl.style.position = 'static';
      }
      
      // S'assurer que les éléments flex-wrap ne s'empilent pas
      if (htmlEl.classList.contains('flex-wrap')) {
        htmlEl.style.flexWrap = 'wrap';
        htmlEl.style.minHeight = 'auto';
      }
    });
    
    // Forcer l'espacement entre le tableau et la légende
    const legendElement = clone.querySelector('.bg-gray-50') as HTMLElement;
    if (legendElement) {
      legendElement.style.marginTop = LEGEND_SPACING;
      legendElement.style.display = 'flex';
      legendElement.style.clear = 'both';
    }
    
    return clone;
  };

  // Fonction de téléchargement
  const handleDownload = async () => {
    if (!heatmapRef.current) return;

    setIsDownloading(true);
    let clone: HTMLElement | null = null;

    try {
      const element = heatmapRef.current;
      
      // Créer et préparer le clone
      clone = prepareCloneForExport(element);
      
      // Ajouter le clone au document
      document.body.appendChild(clone);
      
      // Attendre que le DOM soit mis à jour
      await new Promise(resolve => setTimeout(resolve, DOM_UPDATE_DELAY));
      
      // Capturer le clone en haute résolution
      const dataUrl = await domtoimage.toPng(clone, {
        quality: 1,
        bgcolor: '#ffffff',
        width: clone.scrollWidth * IMAGE_EXPORT_SCALE,
        height: clone.scrollHeight * IMAGE_EXPORT_SCALE,
        style: {
          transform: `scale(${IMAGE_EXPORT_SCALE})`,
          transformOrigin: 'top left',
          width: clone.scrollWidth + 'px',
          height: clone.scrollHeight + 'px',
        }
      });

      // Nettoyer et télécharger
      const filename = `heatmap-${sanitizeFilename(labelX)}-${sanitizeFilename(labelY)}.png`;
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      // Afficher l'erreur dans la console mais pas d'alert pour ne pas interrompre l'UX
    } finally {
      // S'assurer que le clone est toujours supprimé
      if (clone && document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
      setIsDownloading(false);
    }
  };

  // Contenu du heatmap (utilisé dans les deux vues)
  const renderHeatmapContent = () => (
    <>
      <h3 className="text-lg font-semibold text-slate-800">Heatmap - {labelX} vs {labelY}</h3>
      
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="border-collapse text-[10px]">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-slate-100 px-1 py-0.5 text-[10px] sticky left-0 z-10">
                  {labelY} \ {labelX}
                </th>
                {xValues.map((x, i) => (
                  <th key={i} className="border border-slate-300 bg-slate-100 px-1 py-0.5 text-[10px] min-w-[60px]">
                    {formatParamValue(x, paramPathX)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yValues.map((y, j) => (
                <tr key={j}>
                  <td className="border border-slate-300 bg-slate-100 px-1 py-0.5 text-[10px] font-medium sticky left-0 z-10">
                    {formatParamValue(y, paramPathY)}
                  </td>
                  {grid[j].map((value, i) => {
                    const onBoundary = isOnBoundary(i, j);
                    const cellColor = getColor(value);
                    const textColor = isNearZero(value)
                      ? 'text-slate-700' 
                      : value < 0 
                        ? 'text-white' 
                        : 'text-slate-900';
                    const symbol = getValueSymbol(value);
                    
                    return (
                      <td
                        key={i}
                        className={`border px-1 py-0.5 text-center font-medium ${textColor} ${
                          onBoundary ? 'border-2' : ''
                        }`}
                        style={{ 
                          backgroundColor: cellColor,
                          borderColor: onBoundary ? CHART_COLORS.warning : undefined,
                          fontSize: '0.875rem',
                          lineHeight: '1.4'
                        }}
                        title={`${symbol} ${formatValue(value)}`}
                      >
                        <span className="opacity-60 mr-0.5">{symbol}</span>
                        {formatValue(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm bg-slate-50 p-3 rounded-xl border border-slate-200">
        <span className="font-medium">Légende:</span>
        <div className="flex items-center gap-2">
          <div 
            className="w-5 h-4 rounded border border-slate-300"
            style={{ backgroundColor: CHART_COLORS.negative }}
          ></div>
          <span className="font-medium capitalize">Négatif: {formatValue(minValue)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-5 h-4 rounded border border-slate-300" 
            style={{ backgroundColor: CHART_COLORS.nearZero }}
          ></div>
          <span className="font-medium capitalize">Proche de 0</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-5 h-4 rounded border border-slate-300"
            style={{ backgroundColor: CHART_COLORS.positive }}
          ></div>
          <span className="font-medium capitalize">Positif: {formatValue(maxValue)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-5 h-4 border-2 bg-white rounded"
            style={{ borderColor: CHART_COLORS.warning }}
          ></div>
          <span className="font-medium capitalize">Frontière (transition pos/nég)</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Vue normale */}
      <div className="space-y-4">
        {/* Boutons de contrôle */}
        <div className="flex gap-2">
          <Button
            onClick={handleFullscreen}
            className="flex items-center gap-2"
          >
            <Maximize2 size={16} />
            Plein écran
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2"
          >
            {isDownloading ? (
              <>
                <Spinner size="sm" />
                <span>Téléchargement...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Télécharger</span>
              </>
            )}
          </Button>
        </div>

        {/* Contenu du heatmap */}
        <div ref={heatmapRef}>
          {renderHeatmapContent()}
        </div>
      </div>

      {/* Modal plein écran */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={handleCloseFullscreen}
          role="dialog"
          aria-modal="true"
          aria-label="Heatmap en plein écran"
        >
          <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton de fermeture */}
            <button
              onClick={handleCloseFullscreen}
              className="absolute -top-12 right-0 bg-white hover:bg-slate-100 rounded-full p-2 shadow-lg z-10 transition-colors"
              title="Fermer (ESC)"
              aria-label="Fermer le mode plein écran"
            >
              <X size={24} />
            </button>

            {/* Contenu avec scale */}
            <div
              ref={fullscreenContentRef}
              className="bg-white p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-auto"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
              }}
            >
              {renderHeatmapContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

