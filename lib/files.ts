export const MAX_FILE_SIZE = 15 * 1024 * 1024;
export const MAX_CASE_SIZE = 50 * 1024 * 1024;
export const MAX_RECORDS = 10;

export const ACCEPTED_FILES = {
  ".pdf": ["application/pdf"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".txt": ["text/plain"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"]
} as const;

export type FileLike = { name: string; size: number; type: string };

export function extensionOf(name: string) {
  const index = name.lastIndexOf(".");
  return index < 0 ? "" : name.slice(index).toLowerCase();
}

export function normalizedContentType(file: Pick<FileLike, "name" | "type">): string | null {
  const extension = extensionOf(file.name) as keyof typeof ACCEPTED_FILES;
  const accepted = ACCEPTED_FILES[extension] as readonly string[] | undefined;
  if (!accepted) return null;
  if (!file.type || file.type === "application/octet-stream") return accepted[0];
  return accepted.includes(file.type) ? file.type : null;
}

export function validateFile(file: FileLike): string | null {
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_FILE_SIZE) return "The file is larger than 15 MiB.";
  const extension = extensionOf(file.name) as keyof typeof ACCEPTED_FILES;
  if (!(extension in ACCEPTED_FILES)) return "Unsupported file type. Use PDF, DOCX, TXT, PNG, JPEG, or WebP.";
  if (!normalizedContentType(file)) return "The file extension and browser content type do not match.";
  return null;
}

export function validateFileSet(files: FileLike[], existingCount = 0, existingBytes = 0) {
  if (existingCount + files.length > MAX_RECORDS) return "A case can contain at most 10 records.";
  if (existingBytes + files.reduce((sum, file) => sum + file.size, 0) > MAX_CASE_SIZE) return "A case can contain at most 50 MiB total.";
  for (const file of files) {
    const error = validateFile(file);
    if (error) return `${file.name}: ${error}`;
  }
  return null;
}

export function safeDisplayName(name: string) {
  const cleaned = name.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").replace(/[\\/]/g, "-").trim();
  return (cleaned || "record").slice(0, 240);
}
