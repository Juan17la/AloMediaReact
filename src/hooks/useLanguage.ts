import { useTranslation } from "react-i18next";
import { useCallback } from "react";

const SUPPORTED_LANGUAGES = ["en", "es"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  es: "Español",
};

export function useLanguage() {
  const { i18n } = useTranslation();

  const currentLanguage = (
    SUPPORTED_LANGUAGES.includes(i18n.language as SupportedLanguage)
      ? i18n.language
      : "en"
  ) as SupportedLanguage;

  const changeLanguage = useCallback(
    (lng: SupportedLanguage) => i18n.changeLanguage(lng),
    [i18n],
  );

  return {
    currentLanguage,
    changeLanguage,
    languages: SUPPORTED_LANGUAGES,
    labels: LANGUAGE_LABELS,
  };
}
