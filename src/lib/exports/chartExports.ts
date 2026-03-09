import html2canvas from "html2canvas";
import { HTML2CANVAS_OPTIONS } from "./shared";

// ============================================================================
// EXPORT PNG (GRAPHIQUES)
// ============================================================================

export async function exportChartToPNG(
  elementId: string,
  filename: string = "graphique.png",
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Élément avec l'id "${elementId}" introuvable`);
  }

  const canvas = await html2canvas(element, HTML2CANVAS_OPTIONS);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Échec de la création de l'image"));
        return;
      }
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        resolve();
      } finally {
        URL.revokeObjectURL(url);
      }
    });
  });
}
