import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
	type MessageTree,
	mergeMessageTrees,
	parseMessageTree,
} from "@crm/validation/messages";
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { I18N, isLocale, type Locale } from "./config";

const DIR = path.join(process.cwd(), "messages");

const cache = new Map<Locale, Promise<MessageTree>>();

async function read(locale: Locale): Promise<MessageTree> {
	const dir = path.join(DIR, locale);
	const files = (await readdir(dir)).filter((name) => name.endsWith(".json"));

	const namespaces = await Promise.all(
		files.map(async (name) => {
			const source = path.join(locale, name);
			const body = await readFile(path.join(dir, name), "utf8");
			return [
				path.basename(name, ".json"),
				parseMessageTree(JSON.parse(body), source),
			] as const;
		}),
	);

	return Object.fromEntries(namespaces);
}

function load(locale: Locale): Promise<MessageTree> {
	const hit = cache.get(locale);
	if (hit) return hit;

	const pending = read(locale);
	cache.set(locale, pending);
	return pending;
}

export default getRequestConfig(async () => {
	const store = await cookies();
	const stored = store.get(I18N.cookie.name)?.value;
	const locale = isLocale(stored) ? stored : I18N.defaultLocale;

	const fallback = await load(I18N.fallbackLocale);
	const messages =
		locale === I18N.fallbackLocale
			? fallback
			: mergeMessageTrees(fallback, await load(locale));

	return { locale, messages };
});
