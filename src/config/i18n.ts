import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// EN
import commonEN from "../locales/en/common.json";
import authEN from "../locales/en/auth.json";
import dashboardEN from "../locales/en/dashboard.json";

// ES
import commonES from "../locales/es/common.json";
import authES from "../locales/es/auth.json";
import dashboardES from "../locales/es/dashboard.json";

const resources = {
  en: {
    common: commonEN,
    auth: authEN,
    dashboard: dashboardEN,
  },
  es: {
    common: commonES,
    auth: authES,
    dashboard: dashboardES,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common", "auth", "dashboard"],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  });

export default i18n;
