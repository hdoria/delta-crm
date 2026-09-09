import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { I18N, isLocale, type Locale } from "./config";

type Messages = Record<string, unknown>;

async function load(locale: Locale): Promise<Messages> {
	return (await import(`../messages/${locale}.json`)).default;
}

function merge(fallback: Messages, active: Messages): Messages {
	const out: Messages = { ...fallback };

	for (const [key, value] of Object.entries(active)) {
		const base = out[key];
		out[key] =
			isRecord(base) && isRecord(value) ? merge(base, value) : (value ?? base);
	}

	return out;
}

function isRecord(value: unknown): value is Messages {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default getRequestConfig(async () => {
	const store = await cookies();
	const stored = store.get(I18N.cookie.name)?.value;
	const locale = isLocale(stored) ? stored : I18N.defaultLocale;

	const fallback = await load(I18N.fallbackLocale);
	const messages =
		locale === I18N.fallbackLocale
			? fallback
			: merge(fallback, await load(locale));

	return { locale, messages };
});
