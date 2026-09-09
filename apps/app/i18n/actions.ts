"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { I18N, isLocale } from "./config";

export async function setLocale(value: string) {
	if (!isLocale(value)) return;

	const store = await cookies();
	store.set(I18N.cookie.name, value, {
		maxAge: I18N.cookie.maxAge,
		path: I18N.cookie.path,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
	});

	revalidatePath("/", "layout");
}
