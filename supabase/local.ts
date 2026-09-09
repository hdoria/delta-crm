import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isLocalEmailLoginEnabled } from "../packages/auth/src/policy.ts";
import { loadRootEnv } from "../packages/env/src/index.ts";

loadRootEnv();

const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

if (Boolean(clientId) !== Boolean(clientSecret)) {
	throw new Error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET together.");
}

const command = process.argv.slice(2);
if (command.length === 0) {
	throw new Error("Usage: bun supabase/local.ts <supabase command>");
}

const child = spawn("supabase", command, {
	cwd: fileURLToPath(new URL("..", import.meta.url)),
	stdio: "inherit",
	env: {
		...process.env,
		SUPABASE_AUTH_EXTERNAL_GOOGLE_ENABLED: String(Boolean(clientId)),
		SUPABASE_AUTH_EMAIL_ENABLE_SIGNUP: String(isLocalEmailLoginEnabled()),
		SUPABASE_AUTH_ENABLE_SIGNUP: String(!isLocalEmailLoginEnabled()),
	},
});

child.on("error", () => {
	console.error(
		"Supabase CLI could not start. Install the Supabase CLI first.",
	);
	process.exitCode = 1;
});

child.on("exit", (code) => {
	process.exitCode = code ?? 1;
});
