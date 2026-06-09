export type ScriptExtractResult = {
  text: string | null;
  needsManualPaste: boolean;
  message?: string;
};

const TXT_EXTENSIONS = [".txt", ".fountain", ".fdx"];

export function isTxtScriptFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  if (TXT_EXTENSIONS.some((ext) => lower.endsWith(ext))) return true;
  return file.type === "text/plain" || file.type.startsWith("text/");
}

export function isPdfScriptFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return lower.endsWith(".pdf") || file.type === "application/pdf";
}

export function isDocxScriptFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return (
    lower.endsWith(".docx") ||
    lower.endsWith(".doc") ||
    file.type.includes("wordprocessingml") ||
    file.type === "application/msword"
  );
}

export async function extractScriptTextFromFile(
  file: File
): Promise<ScriptExtractResult> {
  if (isTxtScriptFile(file)) {
    try {
      const text = (await file.text()).trim();
      if (!text) {
        return {
          text: null,
          needsManualPaste: true,
          message: "The text file appears empty. Paste the script manually.",
        };
      }
      return { text, needsManualPaste: false };
    } catch (err) {
      return {
        text: null,
        needsManualPaste: true,
        message:
          err instanceof Error
            ? err.message
            : "Could not read the text file.",
      };
    }
  }

  if (isDocxScriptFile(file)) {
    return {
      text: null,
      needsManualPaste: true,
      message:
        "DOCX is not supported for auto-extraction. Export as PDF/TXT or paste the script manually.",
    };
  }

  if (isPdfScriptFile(file)) {
    return {
      text: null,
      needsManualPaste: false,
      message:
        "PDF will be saved to Documents Vault and extracted server-side on analyze.",
    };
  }

  return {
    text: null,
    needsManualPaste: true,
    message:
      "Unsupported script format for auto-extraction. Use TXT or paste manually.",
  };
}

export function defaultRevisionName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  return base || "Script upload";
}
