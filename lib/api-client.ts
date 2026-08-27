import type { User } from "firebase/auth";
import type { AppLanguage } from "@/lib/i18n";

export class ApiClientError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
  }
}

type ErrorBody = { error?: { code?: string; message?: string } } | null;

function requestError(body: ErrorBody, fallback: string) {
  return new ApiClientError(body?.error?.code || "INTERNAL_ERROR", body?.error?.message || fallback);
}

export function localizedApiError(error: unknown, language: AppLanguage, fallback: string) {
  if (!(error instanceof ApiClientError)) return error instanceof Error ? error.message : fallback;
  const copy: Record<AppLanguage, Record<string, string>> = {
    en: {
      UNAUTHORIZED: "Your session has expired. Please sign in again.",
      CONFIGURATION_ERROR: "Record review is temporarily unavailable.",
      INVALID_RECORD: "This file is damaged, unsupported, or cannot be read. Check the file and try again.",
      MODEL_RATE_LIMIT: "The review service is busy right now. Please try again in a few minutes.",
      MODEL_SAFETY_BLOCK: "This record could not be processed safely. Check that identifying details have been removed.",
      MODEL_INVALID_OUTPUT: "The review could not be completed reliably. Please try again.",
      INTERNAL_ERROR: "The review could not be completed. Please try again.",
    },
    vi: {
      UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
      CONFIGURATION_ERROR: "Dịch vụ hiện chưa sẵn sàng để xử lý hồ sơ.",
      INVALID_RECORD: "Tệp không hợp lệ, bị hỏng hoặc không thể đọc. Vui lòng kiểm tra tệp rồi thử lại.",
      MODEL_RATE_LIMIT: "Dịch vụ phân tích đang tạm thời quá tải. Vui lòng thử lại sau ít phút.",
      MODEL_SAFETY_BLOCK: "Dịch vụ phân tích không thể xử lý an toàn hồ sơ này. Vui lòng kiểm tra dữ liệu đã khử định danh.",
      MODEL_INVALID_OUTPUT: "Kết quả phân tích chưa đạt định dạng yêu cầu. Vui lòng thử lại.",
      INTERNAL_ERROR: "Dịch vụ phân tích không thể hoàn tất yêu cầu. Vui lòng thử lại.",
    },
  };
  return copy[language][error.code] || fallback;
}

export async function authorizedFetch(user: User, input: string, init: RequestInit = {}) {
  const token = await user.getIdToken();
  const response = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers }
  });
  const body = await response.json().catch(() => null) as ErrorBody;
  if (!response.ok) throw requestError(body, "The request could not be completed.");
  return body;
}

export async function authorizedFileUpload<T>(user: User, input: string, form: FormData, onProgress: (progress: number) => void): Promise<T> {
  const token = await user.getIdToken();
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", input);
    request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 70));
    };
    request.onerror = () => reject(new Error("The record could not be sent for extraction."));
    request.onload = () => {
      let body: (T & NonNullable<ErrorBody>) | null = null;
      try { body = JSON.parse(request.responseText); } catch {}
      if (request.status < 200 || request.status >= 300) return reject(requestError(body, "Record extraction failed."));
      onProgress(100);
      resolve(body as T);
    };
    request.send(form);
  });
}
