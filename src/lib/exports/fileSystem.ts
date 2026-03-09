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

interface FileSystemFileHandle {
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

// ============================================================================
// FILE SYSTEM ACCESS API (SAVE/LOAD)
// ============================================================================

export async function saveProjectFile(project: Project): Promise<void> {
  try {
    // Vérifier si l'API File System Access est supportée
    const isSupported =
      typeof window !== "undefined" &&
      typeof window.showSaveFilePicker === "function";

    if (isSupported) {
      const handle = await window.showSaveFilePicker!({
        suggestedName: `${project.name.replace(/[^a-z0-9]/gi, "_")}.json`,
        types: [
          {
            description: "Projet Chalet JSON",
            accept: { "application/json": [".json"] },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(exportProjectToJSON(project));
      await writable.close();
    } else {
      // Fallback pour navigateurs sans File System Access API
      const safeName =
        project.name.replace(/[^a-z0-9\-_\s]/gi, "_").trim() || "projet";
      downloadJSON(project, `${safeName}.json`);
    }
  } catch (error) {
    if (error instanceof Error && error.name !== "AbortError") {
      throw error;
    }
  }
}

export async function loadProjectFile(): Promise<Project | null> {
  try {
    // Vérifier si l'API File System Access est supportée
    const isSupported =
      typeof window !== "undefined" &&
      typeof window.showOpenFilePicker === "function";

    if (isSupported) {
      const [handle] = await window.showOpenFilePicker!({
        types: [
          {
            description: "Projet Chalet JSON",
            accept: { "application/json": [".json"] },
          },
        ],
        multiple: false,
      });

      const file = await handle.getFile();
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("Le fichier est trop volumineux (max 10 Mo)");
      }
      const content = await file.text();
      return importProjectFromJSON(content);
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
              const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
              if (file.size > MAX_FILE_SIZE) {
                reject(new Error("Le fichier est trop volumineux (max 10 Mo)"));
                return;
              }
              const content = await file.text();
              resolve(importProjectFromJSON(content));
            } else {
              resolve(null);
            }
          } catch (err) {
            reject(err);
          }
        };
        // Résoudre null si l'utilisateur annule la sélection de fichier
        window.addEventListener(
          "focus",
          () => {
            setTimeout(() => {
              if (!input.files || input.files.length === 0) {
                resolve(null);
              }
            }, 300);
          },
          { once: true },
        );
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
