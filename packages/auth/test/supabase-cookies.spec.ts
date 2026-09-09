import { describe, expect, it } from "bun:test";
import { accessTokenFromCookies } from "../src/cookies";

const cookie = `base64-${Buffer.from(JSON.stringify({ access_token: "test-access-token", refresh_token: "must-not-refresh" })).toString("base64url")}`;
describe("Supabase credential cookie reader", () => {
	it("reads unchunked and chunked SSR cookies without invoking refresh", () => {
		expect(accessTokenFromCookies(`sb-base-crm-auth-token=${cookie}`)).toBe(
			"test-access-token",
		);
		expect(
			accessTokenFromCookies(
				`sb-base-crm-auth-token.0=${cookie.slice(0, 40)}; sb-base-crm-auth-token.1=${cookie.slice(40)}`,
			),
		).toBe("test-access-token");
	});
	it("ignores cookies for other Supabase projects and legacy auth", () => {
		expect(accessTokenFromCookies(`sb-127-auth-token=${cookie}`)).toBeNull();
		expect(accessTokenFromCookies(`sb-other-auth-token=${cookie}`)).toBeNull();
		expect(accessTokenFromCookies("crm.session_token=legacy")).toBeNull();
	});
	it("rejects invalid UTF-8 even when the access token is valid JSON", () => {
		const invalid = Buffer.concat([
			Buffer.from('{"access_token":"valid-token","metadata":"'),
			Buffer.from([0xc3, 0x28]),
			Buffer.from('"}'),
		]).toString("base64url");
		expect(
			accessTokenFromCookies(`sb-base-crm-auth-token=base64-${invalid}`),
		).toBeNull();
	});
	it("rejects truncated or malformed cookie content", () => {
		expect(
			accessTokenFromCookies(`sb-base-crm-auth-token.1=${cookie}`),
		).toBeNull();
		expect(
			accessTokenFromCookies("sb-base-crm-auth-token=%not-encoding"),
		).toBeNull();
		expect(
			accessTokenFromCookies("sb-base-crm-auth-token=base64-hello"),
		).toBeNull();
	});
});
