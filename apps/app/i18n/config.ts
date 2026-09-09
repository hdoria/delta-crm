const YEAR_SECONDS = 60 * 60 * 24 * 365;

export const I18N = {
	locales: ["pt-BR", "en"],
	defaultLocale: "pt-BR",
	fallbackLocale: "en",
	cookie: { name: "locale", maxAge: YEAR_SECONDS, path: "/" },
} as const;

export type Locale = (typeof I18N.locales)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
	"pt-BR": "Português (Brasil)",
	en: "English",
};

export function isLocale(value: unknown): value is Locale {
	return (
		typeof value === "string" &&
		(I18N.locales as readonly string[]).includes(value)
	);
}
