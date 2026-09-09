const formatters = new Map<string, Intl.DateTimeFormat>();

export function dateFormatter(
	locale: string,
	options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
	const key = `${locale}:${JSON.stringify(options)}`;
	const cached = formatters.get(key);
	if (cached) return cached;

	const formatter = new Intl.DateTimeFormat(locale, options);
	formatters.set(key, formatter);
	return formatter;
}
