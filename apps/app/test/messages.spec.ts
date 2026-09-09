import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { I18N } from "@/i18n/config";

const ROOT = path.join(import.meta.dir, "..");
const MESSAGES = path.join(ROOT, "messages");
const SOURCE_DIRS = ["app", "components", "lib"];
const BINDING =
	/const\s+(\w+)\s*=\s*(?:await\s+)?(?:use|get)Translations\(\s*"([\w.]+)"\s*\)/g;

function walk(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const full = path.join(dir, entry);
		if (statSync(full).isDirectory()) return walk(full);
		return /\.tsx?$/.test(entry) ? [full] : [];
	});
}

function flatten(value: unknown, prefix = ""): Set<string> {
	const keys = new Set<string>();
	if (typeof value !== "object" || value === null) return keys;

	for (const [key, child] of Object.entries(value)) {
		const full = prefix ? `${prefix}.${key}` : key;
		if (typeof child === "object" && child !== null) {
			for (const nested of flatten(child, full)) keys.add(nested);
		} else {
			keys.add(full);
		}
	}

	return keys;
}

function catalog(locale: string): Set<string> {
	const dir = path.join(MESSAGES, locale);
	const keys = new Set<string>();

	for (const file of readdirSync(dir).filter((name) =>
		name.endsWith(".json"),
	)) {
		const namespace = path.basename(file, ".json");
		const body = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
		for (const key of flatten(body)) keys.add(`${namespace}.${key}`);
	}

	return keys;
}

function usedKeys(): { key: string; file: string }[] {
	const found: { key: string; file: string }[] = [];

	for (const dir of SOURCE_DIRS) {
		for (const file of walk(path.join(ROOT, dir))) {
			const source = readFileSync(file, "utf8");
			const namespaces = new Map<string, string>();

			for (const match of source.matchAll(BINDING)) {
				const [, binding, namespace] = match;
				if (binding && namespace) namespaces.set(binding, namespace);
			}

			for (const [binding, namespace] of namespaces) {
				const call = new RegExp(`\\b${binding}\\(\\s*"([\\w.]+)"`, "g");
				for (const match of source.matchAll(call)) {
					const key = match[1];
					if (key) found.push({ key: `${namespace}.${key}`, file });
				}
			}
		}
	}

	return found;
}

describe("the message catalog", () => {
	const locales = I18N.locales;

	it("has the same keys in every locale", () => {
		const [first, ...rest] = locales.map((locale) => ({
			locale,
			keys: catalog(locale),
		}));
		if (!first) throw new Error("no locales configured");

		for (const other of rest) {
			const missing = [...first.keys].filter((key) => !other.keys.has(key));
			const extra = [...other.keys].filter((key) => !first.keys.has(key));
			expect({ locale: other.locale, missing, extra }).toEqual({
				locale: other.locale,
				missing: [],
				extra: [],
			});
		}
	});

	it("holds every key the code asks for", () => {
		const keys = catalog(I18N.fallbackLocale);
		const unknown = usedKeys()
			.filter(({ key }) => !keys.has(key))
			.map(({ key, file }) => `${key} (${path.relative(ROOT, file)})`);

		expect(unknown).toEqual([]);
	});

	it("finds the keys it is meant to find", () => {
		expect(usedKeys().length).toBeGreaterThan(100);
	});
});
