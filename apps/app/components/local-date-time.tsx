"use client";

import { useLocale } from "next-intl";
import { InlineScript } from "./inline-script";

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const MONTH_MS = 30 * DAY_MS;
const MISSING = "—";

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();
const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();

const LOCAL_DAY_OPTIONS = {
	month: "short",
	day: "numeric",
	year: "numeric",
} as const;

function localDateTimeScript(locale: string): string {
	return `{var L=${JSON.stringify(locale)},s="time[data-local-date-kind]",f=function(n){try{var k=n.dataset.localDateKind,v=n.dataset.localDateValue,e=n.dataset.localDateEnd,o=JSON.parse(n.dataset.localDateOptions||"{}"),d=new Date(v),t=d.getTime(),x=Date.now()-t,a=Math.abs(x),r,R=function(){return new Intl.RelativeTimeFormat(L,{numeric:"auto",style:"narrow"})};if(k==="date-time")r=new Intl.DateTimeFormat(L,o).format(d);else if(k==="date-range")r=new Intl.DateTimeFormat(L,o).formatRange(d,new Date(e));else if(k==="day")r=new Intl.DateTimeFormat(L,o).format(new Date(v+"T00:00:00"));else if(k==="relative-date"){var z=new Date(),q=(Date.UTC(z.getFullYear(),z.getMonth(),z.getDate())-Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()))/${DAY_MS};r=R().format(-q,"day")}else if(!Number.isFinite(t))r=${JSON.stringify(MISSING)};else if(a<${MINUTE_MS})r=R().format(0,"second");else if(a>=${MONTH_MS})r=new Intl.DateTimeFormat(L,{month:"short",day:"numeric"}).format(d);else{var g=x<0?1:-1,u=a<${HOUR_MS}?[Math.floor(a/${MINUTE_MS}),"minute"]:a<${DAY_MS}?[Math.floor(a/${HOUR_MS}),"hour"]:[Math.floor(a/${DAY_MS}),"day"];r=R().format(g*u[0],u[1])}n.textContent=r}catch{}};var c=function(r){if(r.nodeType===1&&r.matches&&r.matches(s))f(r);if(r.querySelectorAll)r.querySelectorAll(s).forEach(f)};c(document);new MutationObserver(function(m){m.forEach(function(r){r.addedNodes.forEach(c)})}).observe(document.documentElement,{childList:true,subtree:true})}`;
}

export function LocalDateTime({
	date,
	options,
}: {
	date: string;
	options: Intl.DateTimeFormatOptions;
}) {
	const locale = useLocale();

	return (
		<LocalTime
			kind="date-time"
			date={date}
			options={options}
			fallback={dateFormatter(locale, options).format(new Date(date))}
		/>
	);
}

export function LocalDateTimeRange({
	start,
	end,
	options,
}: {
	start: string;
	end: string;
	options: Intl.DateTimeFormatOptions;
}) {
	const locale = useLocale();

	return (
		<LocalTime
			kind="date-range"
			date={start}
			end={end}
			options={options}
			fallback={dateFormatter(locale, options).formatRange(
				new Date(start),
				new Date(end),
			)}
		/>
	);
}

export function LocalRelativeDate({ date }: { date: string }) {
	const locale = useLocale();

	return (
		<LocalTime
			kind="relative-date"
			date={date}
			fallback={formatRelativeDate(locale, date)}
		/>
	);
}

export function LocalRelativeTime({ date }: { date: string }) {
	const locale = useLocale();

	return (
		<LocalTime
			kind="relative-time"
			date={date}
			fallback={formatRelativeTime(locale, date)}
		/>
	);
}

export function LocalDay({ date }: { date: string }) {
	const locale = useLocale();
	const day = date.slice(0, 10);

	return (
		<LocalTime
			kind="day"
			date={day}
			options={LOCAL_DAY_OPTIONS}
			fallback={dateFormatter(locale, LOCAL_DAY_OPTIONS).format(dayDate(day))}
		/>
	);
}

export function LocalDateTimeHydrator() {
	const locale = useLocale();
	return <InlineScript html={localDateTimeScript(locale)} />;
}

function LocalTime({
	kind,
	date,
	end,
	options,
	fallback,
}: {
	kind: "date-time" | "date-range" | "day" | "relative-date" | "relative-time";
	date: string;
	end?: string;
	options?: Intl.DateTimeFormatOptions;
	fallback: string;
}) {
	return (
		<time
			dateTime={date}
			data-local-date-kind={kind}
			data-local-date-value={date}
			data-local-date-end={end}
			data-local-date-options={options ? JSON.stringify(options) : undefined}
			suppressHydrationWarning
		>
			{fallback}
		</time>
	);
}

function formatRelativeDate(locale: string, date: string): string {
	const now = new Date();
	const then = new Date(date);
	const days = (calendarDay(now) - calendarDay(then)) / DAY_MS;
	return relativeFormatter(locale).format(-days, "day");
}

function formatRelativeTime(locale: string, date: string): string {
	const then = new Date(date).getTime();
	if (!Number.isFinite(then)) return MISSING;

	const difference = Date.now() - then;
	const absolute = Math.abs(difference);
	const relative = relativeFormatter(locale);

	if (absolute < MINUTE_MS) return relative.format(0, "second");
	if (absolute >= MONTH_MS) {
		return dateFormatter(locale, { month: "short", day: "numeric" }).format(
			new Date(then),
		);
	}

	const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
		absolute < HOUR_MS
			? [Math.floor(absolute / MINUTE_MS), "minute"]
			: absolute < DAY_MS
				? [Math.floor(absolute / HOUR_MS), "hour"]
				: [Math.floor(absolute / DAY_MS), "day"];

	return relative.format(difference < 0 ? value : -value, unit);
}

function calendarDay(date: Date): number {
	return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayDate(day: string): Date {
	return new Date(`${day}T00:00:00`);
}

function dateFormatter(
	locale: string,
	options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
	const key = `${locale}:${JSON.stringify(options)}`;
	const cached = dateTimeFormatters.get(key);
	if (cached) return cached;

	const formatter = new Intl.DateTimeFormat(locale, options);
	dateTimeFormatters.set(key, formatter);
	return formatter;
}

function relativeFormatter(locale: string): Intl.RelativeTimeFormat {
	const cached = relativeFormatters.get(locale);
	if (cached) return cached;

	const formatter = new Intl.RelativeTimeFormat(locale, {
		numeric: "auto",
		style: "narrow",
	});
	relativeFormatters.set(locale, formatter);
	return formatter;
}
