import type { Project } from "../../types";
import { sanitizeProject } from "../validation";

// ============================================================================
// EXPORT JSON (PROJET COMPLET)
// ============================================================================

export function exportProjectToJSON(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function importProjectFromJSON(jsonString: string): Project {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error("Le fichier ne contient pas de JSON valide");
  }

  // Valider et sanitizer avec Zod
  const sanitized = sanitizeProject(parsed);

  if (!sanitized) {
    throw new Error("Le fichier de projet est invalide ou corrompu");
  }

  return sanitized;
}

export function downloadJSON(
  project: Project,
  filename: string = "projet-chalet.json",
) {
  const json = exportProjectToJSON(project);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
