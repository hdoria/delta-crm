import { spawnSync } from "node:child_process";
import {
	chmodSync,
	copyFileSync,
	existsSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { loadRootEnv } from "../packages/env/src/index";

const root = fileURLToPath(new URL("..", import.meta.url));
const envPath = `${root}/.env`;
if (!existsSync(envPath)) copyFileSync(`${root}/.env.example`, envPath);
chmodSync(envPath, 0o600);

process.chdir(root);
loadRootEnv();
const database = process.env.DATABASE_URL;
if (!database) throw new Error("DATABASE_URL is missing from the root .env.");
const url = new URL(database);
if (
	!["127.0.0.1", "localhost"].includes(url.hostname) ||
	url.port !== "57322" ||
	url.pathname !== "/postgres"
) {
	throw new Error(
		"setup:local only operates on the Base CRM local database at port 57322. Use the cloud setup guide for another database.",
	);
}

if (process.env.SUPABASE_URL !== "http://127.0.0.1:57321")
	throw new Error(
		"setup:local requires the Base CRM Supabase URL at port 57321.",
	);

function run(command: string, args: string[], quiet = false) {
	const result = spawnSync(command, args, {
		cwd: root,
		encoding: "utf8",
		stdio: quiet ? "pipe" : "inherit",
	});
	if (result.status !== 0)
		throw new Error(`Setup step failed: ${command} ${args[0] ?? ""}`);
	return result.stdout ?? "";
}

console.log("Starting the isolated Base CRM Supabase stack...");
run(process.execPath, ["supabase/local.ts", "start"], true);
const { ANON_KEY: key } = z
	.object({ ANON_KEY: z.string().min(1) })
	.parse(JSON.parse(run("supabase", ["status", "-o", "json"], true)));
const current = readFileSync(envPath, "utf8");
const updated = /^SUPABASE_ANON_KEY=.*$/m.test(current)
	? current.replace(/^SUPABASE_ANON_KEY=.*$/m, `SUPABASE_ANON_KEY="${key}"`)
	: `${current}\nSUPABASE_ANON_KEY="${key}"\n`;
writeFileSync(envPath, updated, { mode: 0o600 });
process.env.SUPABASE_ANON_KEY = key;
run(process.execPath, ["run", "db:deploy"]);
run(process.execPath, ["run", "db:seed"]);
console.log(
	"Base CRM local database is ready. Run bun dev. Add Google OAuth credentials and ALLOWED_SIGN_IN to .env when ready.",
);
