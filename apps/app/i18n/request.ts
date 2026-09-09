import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { I18N, isLocale, type Locale } from "./config";

type Messages = Record<string, unknown>;

const DIR = path.join(process.cwd(), "messages");

const cache = new Map<Locale, Promise<Messages>>();

async function read(locale: Locale): Promise<Messages> {
	const dir = path.join(DIR, locale);
	const files = (await readdir(dir)).filter((name) => name.endsWith(".json"));

	const namespaces = await Promise.all(
		files.map(async (name) => {
			const body = await readFile(path.join(dir, name), "utf8");
			return [path.basename(name, ".json"), JSON.parse(body)] as const;
		}),
	);

	return Object.fromEntries(namespaces);
}

function load(locale: Locale): Promise<Messages> {
	const hit = cache.get(locale);
	if (hit) return hit;

	const pending = read(locale);
	cache.set(locale, pending);
	return pending;
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
