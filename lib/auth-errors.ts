export type AuthLanguage = "en" | "vi";

const messages = {
  en: { invalid: "The email or password is incorrect.", emailInUse: "An account already exists for this email.", weakPassword: "Use a stronger password with at least 8 characters.", invalidEmail: "Enter a valid email address.", disabled: "This sign-in method is disabled in Firebase Authentication. Enable it under Sign-in method and redeploy.", rateLimited: "Too many attempts. Wait a moment and try again.", network: "The connection was interrupted. Check your internet connection and try again.", invalidApiKey: "Firebase rejected FIREBASE_WEB_API_KEY. Copy the apiKey from Firebase Project settings → Your apps → Web app; do not use the Gemini API key.", appNotAuthorized: "This deployment is blocked by the Firebase web API key restrictions. Allow this hostname for that key, or restore the Firebase-generated Browser key restrictions.", configurationMissing: "Firebase Authentication is not configured for this project. Verify that the API key, project ID, auth domain, and app ID all came from the same Firebase Web App.", unauthorizedDomain: "This deployment domain is not authorized in Firebase. Add this site's hostname under Firebase Authentication → Settings → Authorized domains.", popupBlocked: "The browser blocked the Google sign-in window. Allow pop-ups or open the app in a new tab.", embedded: "Google sign-in cannot run in this embedded preview. Open the app in a new tab and try again.", cancelled: "Google sign-in was cancelled.", generic: "Sign-in could not be completed. Please try again." },
  vi: { invalid: "Email hoặc mật khẩu không đúng.", emailInUse: "Email này đã được dùng để tạo tài khoản.", weakPassword: "Hãy dùng mật khẩu mạnh có ít nhất 8 ký tự.", invalidEmail: "Hãy nhập địa chỉ email hợp lệ.", disabled: "Phương thức đăng nhập này đang bị tắt trong Firebase Authentication. Hãy bật trong Sign-in method rồi triển khai lại.", rateLimited: "Bạn đã thử quá nhiều lần. Hãy chờ một lúc rồi thử lại.", network: "Kết nối bị gián đoạn. Hãy kiểm tra mạng rồi thử lại.", invalidApiKey: "Firebase đã từ chối FIREBASE_WEB_API_KEY. Hãy sao chép apiKey tại Firebase Project settings → Your apps → Web app; không dùng khóa Gemini API.", appNotAuthorized: "Bản triển khai này bị chặn bởi giới hạn của khóa Firebase Web API. Hãy cho phép tên miền này hoặc khôi phục giới hạn mặc định của Browser key do Firebase tạo.", configurationMissing: "Firebase Authentication chưa được cấu hình cho dự án này. Hãy bảo đảm API key, project ID, auth domain và app ID đều thuộc cùng một Firebase Web App.", unauthorizedDomain: "Tên miền triển khai này chưa được Firebase cho phép. Hãy thêm tên miền vào Firebase Authentication → Settings → Authorized domains.", popupBlocked: "Trình duyệt đã chặn cửa sổ đăng nhập Google. Hãy cho phép cửa sổ bật lên hoặc mở ứng dụng trong thẻ mới.", embedded: "Không thể đăng nhập Google trong khung xem trước này. Hãy mở ứng dụng trong thẻ mới rồi thử lại.", cancelled: "Đã hủy đăng nhập Google.", generic: "Không thể hoàn tất đăng nhập. Vui lòng thử lại." },
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
    case "auth/invalid-api-key": return copy.invalidApiKey;
    case "auth/app-not-authorized": return copy.appNotAuthorized;
    case "auth/configuration-not-found": return copy.configurationMissing;
    case "auth/unauthorized-domain": return copy.unauthorizedDomain;
    case "auth/popup-blocked": return copy.popupBlocked;
    case "auth/operation-not-supported-in-this-environment":
    case "auth/web-storage-unsupported": return copy.embedded;
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request": return copy.cancelled;
    default: return typeof code === "string" && /^auth\/[a-z0-9-]+$/.test(code)
      ? `${copy.generic} (${code})`
      : copy.generic;
  }
}
