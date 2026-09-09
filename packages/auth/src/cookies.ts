import { z } from "zod";
import { SESSION_COOKIE_NAME } from "./cookie-name";

export { SESSION_COOKIE_NAME } from "./cookie-name";

const cookieSession = z.object({ access_token: z.string().min(1) });
export const AUTH_COOKIE_PREFIX = "sb";

export function accessTokenFromCookies(cookieHeader: string): string | null {
	try {
		const name = SESSION_COOKIE_NAME;
		const cookies = new Map(
			cookieHeader.split(";").flatMap((part) => {
				const delimiter = part.indexOf("=");
				return delimiter < 0
					? []
					: [
							[
								part.slice(0, delimiter).trim(),
								decodeURIComponent(part.slice(delimiter + 1)),
							] as const,
						];
			}),
		);
		let value = cookies.get(name) ?? "";
		if (!value)
			for (let index = 0; cookies.has(`${name}.${index}`); index++)
				value += cookies.get(`${name}.${index}`);
		if (!value || value.length > 65536) return null;
		const decoded = value.startsWith("base64-")
			? new TextDecoder("utf-8", { fatal: true }).decode(
					Buffer.from(value.slice(7), "base64url"),
				)
			: value;
		const session = cookieSession.safeParse(JSON.parse(decoded));
		return session.success ? session.data.access_token : null;
	} catch {
		return null;
	}
}
