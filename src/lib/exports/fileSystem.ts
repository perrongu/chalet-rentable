import type { Project } from "../../types";
import {
  exportProjectToJSON,
  importProjectFromJSON,
  downloadJSON,
} from "./jsonIO";

// File System Access API types (not yet in lib.dom.d.ts for all browsers)
interface FilePickerOptions {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
  multiple?: boolean;
}

export interface FileSystemFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

declare global {
  interface Window {
    showSaveFilePicker?: (
      options?: FilePickerOptions,
    ) => Promise<FileSystemFileHandle>;
    showOpenFilePicker?: (
      options?: FilePickerOptions,
    ) => Promise<FileSystemFileHandle[]>;
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
const JSON_FILE_TYPE = {
  description: "Projet Chalet JSON",
  accept: { "application/json": [".json"] },
};

// MIME types valides pour un fichier JSON (certains OS ne renseignent pas le type)
const VALID_JSON_MIMES = ["application/json", "text/json", ""];

function isSavePickerSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.showSaveFilePicker === "function"
  );
}

function isOpenPickerSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.showOpenFilePicker === "function"
  );
}

function validateFileSize(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Le fichier est trop volumineux (max 10 Mo)");
  }
}

function validateFileMime(file: File): void {
  if (!VALID_JSON_MIMES.includes(file.type)) {
    throw new Error(
      "Le fichier ne semble pas être un fichier JSON valide. Vérifiez le format du fichier.",
    );
  }
}

async function readAndParseFile(file: File): Promise<Project> {
  validateFileSize(file);
  validateFileMime(file);
  const content = await file.text();
  return importProjectFromJSON(content);
}

// ============================================================================
// SAVE — réutilise le handle si fourni (Save vs Save As)
// ============================================================================

export interface SaveResult {
  handle: FileSystemFileHandle | null;
}

export async function saveProjectFile(
  project: Project,
  existingHandle?: FileSystemFileHandle | null,
): Promise<SaveResult> {
  try {
    if (isSavePickerSupported()) {
      // Réutiliser le handle existant (Save) ou en demander un nouveau (Save As)
      const handle =
        existingHandle ??
        (await window.showSaveFilePicker!({
          suggestedName: `${project.name.replace(/[^a-z0-9]/gi, "_")}.json`,
          types: [JSON_FILE_TYPE],
        }));

      const writable = await handle.createWritable();
      await writable.write(exportProjectToJSON(project));
      await writable.close();
      return { handle };
    } else {
      // Fallback pour navigateurs sans File System Access API
      const safeName =
        project.name.replace(/[^a-z0-9\-_\s]/gi, "_").trim() || "projet";
      downloadJSON(project, `${safeName}.json`);
      return { handle: null };
    }
  } catch (error) {
    if (error instanceof Error && error.name !== "AbortError") {
      throw error;
    }
    return { handle: existingHandle ?? null };
  }
}

// ============================================================================
// LOAD — retourne le projet ET le handle pour réutilisation
// ============================================================================

export interface LoadResult {
  project: Project;
  handle: FileSystemFileHandle | null;
}

export async function loadProjectFile(): Promise<LoadResult | null> {
  try {
    if (isOpenPickerSupported()) {
      const [handle] = await window.showOpenFilePicker!({
        types: [JSON_FILE_TYPE],
        multiple: false,
      });

      const file = await handle.getFile();
      const project = await readAndParseFile(file);
      return { project, handle };
    } else {
      // Fallback avec input file classique
      return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";

        input.onchange = async (e) => {
          try {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              const project = await readAndParseFile(file);
              resolve({ project, handle: null });
            } else {
              resolve(null);
            }
          } catch (err) {
            reject(err);
          }
        };

        // Event 'cancel' (Chrome 113+, Safari 16.4+, Firefox 91+)
        input.addEventListener("cancel", () => resolve(null), { once: true });

        input.click();
      });
    }
  } catch (error) {
    if (error instanceof Error && error.name !== "AbortError") {
      throw error;
    }
    return null;
  }
}
