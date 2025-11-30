import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import file json vừa tạo
import translationVI from "./locales/vi/translation.json";
import translationEN from "./locales/en/translation.json";
import translationJA from "./locales/ja/translation.json";

const resources = {
  vi: { translation: translationVI },
  en: { translation: translationEN },
  ja: { translation: translationJA },
};

i18n
  .use(LanguageDetector) // Tự động phát hiện ngôn ngữ
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "vi", // Nếu lỗi thì dùng tiếng Việt
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
