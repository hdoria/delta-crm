const YEAR_SECONDS = 60 * 60 * 24 * 365;

export const I18N = {
	locales: ["pt-BR", "en"],
	defaultLocale: "pt-BR",
	fallbackLocale: "en",
	cookie: { name: "locale", maxAge: YEAR_SECONDS, path: "/" },
} as const;

export type Locale = (typeof I18N.locales)[number];

export const LOCALE_LABELS = {
	"pt-BR": "Português (Brasil)",
	en: "English",
} satisfies Record<Locale, string>;

export function isLocale(value: string | undefined): value is Locale {
	return I18N.locales.some((locale) => locale === value);
}
