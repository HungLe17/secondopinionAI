export type AuthLanguage = "en" | "vi";

const messages = {
  en: { invalid: "The email or password is incorrect.", emailInUse: "An account already exists for this email.", weakPassword: "Use a stronger password with at least 8 characters.", invalidEmail: "Enter a valid email address.", disabled: "Email and password sign-in is temporarily unavailable.", rateLimited: "Too many attempts. Wait a moment and try again.", network: "The connection was interrupted. Check your internet connection and try again.", generic: "Sign-in could not be completed. Please try again." },
  vi: { invalid: "Email hoặc mật khẩu không đúng.", emailInUse: "Email này đã được dùng để tạo tài khoản.", weakPassword: "Hãy dùng mật khẩu mạnh có ít nhất 8 ký tự.", invalidEmail: "Hãy nhập địa chỉ email hợp lệ.", disabled: "Đăng nhập bằng email và mật khẩu hiện chưa khả dụng.", rateLimited: "Bạn đã thử quá nhiều lần. Hãy chờ một lúc rồi thử lại.", network: "Kết nối bị gián đoạn. Hãy kiểm tra mạng rồi thử lại.", generic: "Không thể hoàn tất đăng nhập. Vui lòng thử lại." },
} as const;

export function friendlyAuthError(error: unknown, language: AuthLanguage) {
  const code = (error as { code?: string } | null)?.code;
  const copy = messages[language];
  switch (code) {
    case "auth/invalid-credential": case "auth/user-not-found": case "auth/wrong-password": return copy.invalid;
    case "auth/email-already-in-use": return copy.emailInUse;
    case "auth/weak-password": return copy.weakPassword;
    case "auth/invalid-email": return copy.invalidEmail;
    case "auth/operation-not-allowed": return copy.disabled;
    case "auth/too-many-requests": return copy.rateLimited;
    case "auth/network-request-failed": return copy.network;
    default: return copy.generic;
  }
}
