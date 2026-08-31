import type {
  GoalReferenceFile,
  ReferenceFileKind,
} from "@/lib/types";

export const MAX_REFERENCE_FILES = 5;
export const MAX_REFERENCE_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_EXTRACTED_CHARACTERS = 50_000;
export const REFERENCE_FILE_ACCEPT =
  ".pdf,.docx,.txt,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/png,image/jpeg";

type FileDescriptor = Pick<File, "name" | "size" | "type">;

const EXTENSION_KIND: Record<string, ReferenceFileKind> = {
  pdf: "pdf",
  docx: "docx",
  txt: "text",
  png: "image",
  jpg: "image",
  jpeg: "image",
};

const MIME_KIND: Record<string, ReferenceFileKind> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/plain": "text",
  "image/png": "image",
  "image/jpeg": "image",
};

function extensionFor(name: string): string {
  return name.toLowerCase().split(".").pop() ?? "";
}

export function referenceFileKind(file: FileDescriptor): ReferenceFileKind | null {
  const extensionKind = EXTENSION_KIND[extensionFor(file.name)];
  const mimeKind = MIME_KIND[file.type.toLowerCase()];

  if (extensionKind && mimeKind && extensionKind !== mimeKind) return null;
  return extensionKind ?? mimeKind ?? null;
}

export function validateReferenceFile(
  file: FileDescriptor,
  connectedFileCount: number,
): string | null {
  if (connectedFileCount >= MAX_REFERENCE_FILES) {
    return `You can connect up to ${MAX_REFERENCE_FILES} files to one goal.`;
  }

  if (!referenceFileKind(file)) {
    return `${file.name} is not supported. Choose a PDF, DOCX, TXT, PNG, JPG, or JPEG file.`;
  }

  if (file.size <= 0) {
    return `${file.name} is empty.`;
  }

  if (file.size > MAX_REFERENCE_FILE_BYTES) {
    return `${file.name} is larger than ${formatFileSize(MAX_REFERENCE_FILE_BYTES)}.`;
  }

  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function createReferenceFileRecord(
  file: FileDescriptor,
  id = crypto.randomUUID(),
  addedAt = new Date().toISOString(),
): GoalReferenceFile {
  const kind = referenceFileKind(file);
  if (!kind) throw new Error(`${file.name} is not a supported reference file.`);

  return {
    id,
    name: file.name,
    kind,
    mimeType: file.type || mimeTypeForKind(kind),
    size: file.size,
    status: "extracting",
    progress: 0,
    extractedText: "",
    extractionError: null,
    addedAt,
  };
}

export function replaceReferenceFileRecord(
  files: GoalReferenceFile[],
  fileId: string,
  replacement: GoalReferenceFile,
): GoalReferenceFile[] {
  return files.map((file) => (file.id === fileId ? replacement : file));
}

export function removeReferenceFileRecord(
  files: GoalReferenceFile[],
  fileId: string,
): GoalReferenceFile[] {
  return files.filter((file) => file.id !== fileId);
}

function mimeTypeForKind(kind: ReferenceFileKind): string {
  if (kind === "pdf") return "application/pdf";
  if (kind === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (kind === "text") return "text/plain";
  return "image/*";
}

export function normalizeExtractedText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_EXTRACTED_CHARACTERS);
}

function assertUsefulText(value: string, fileName: string): string {
  const normalized = normalizeExtractedText(value);
  const meaningful = normalized.replace(/[^\p{L}\p{N}]+/gu, "");

  if (meaningful.length < 30) {
    throw new Error(
      `StatQuest could not recover enough readable text from ${fileName}. Replace it with a clearer scan or add a TXT, DOCX, or text-based PDF.`,
    );
  }

  return normalized;
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  const document = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .flatMap((item) => ("str" in item && typeof item.str === "string" ? [item.str] : []))
      .join(" ");
    pages.push(`[Page ${pageNumber}]\n${text}`);
  }

  return pages.join("\n");
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  });
  return result.value;
}

async function extractImage(
  file: File,
  onProgress: (progress: number) => void,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (message) => {
      if (message.status === "recognizing text" && message.progress) {
        onProgress(Math.max(5, Math.round(message.progress * 100)));
      }
    },
  });

  try {
    const result = await worker.recognize(file);
    return result.data.text;
  } finally {
    await worker.terminate();
  }
}

export async function extractReferenceFile(
  file: File,
  onProgress: (progress: number) => void = () => undefined,
): Promise<string> {
  const kind = referenceFileKind(file);
  if (!kind) throw new Error(`${file.name} is not a supported reference file.`);

  onProgress(5);
  let text: string;

  if (kind === "text") {
    text = await file.text();
  } else if (kind === "docx") {
    text = await extractDocx(file);
  } else if (kind === "pdf") {
    text = await extractPdf(file);
  } else {
    text = await extractImage(file, onProgress);
  }

  onProgress(100);
  return assertUsefulText(text, file.name);
}
