import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GoogleConnection } from "../google-connection";
import {
	type ConnectionQuery,
	OAuthConnectionPage,
} from "../oauth-connection-page";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("settings.connections.google");
	return { title: t("pageTitle") };
}

export default function GoogleConnectionPage(props: {
	params: Promise<{ slug: string }>;
	searchParams: Promise<ConnectionQuery>;
}) {
	return (
		<OAuthConnectionPage
			{...props}
			connection={GoogleConnection}
			provider="google"
		/>
	);
}
