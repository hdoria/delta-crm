"use client";

import { authClient } from "@crm/auth/client";
import { Button } from "@crm/ui/components/button";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

async function startSlackOAuth(slug: string, fallback: string): Promise<void> {
	try {
		const { error } = await authClient.oauth2.link({
			providerId: "slack",
			callbackURL: `${window.location.origin}/${slug}/settings/connections/slack/people`,
			errorCallbackURL: `${window.location.origin}/${slug}/settings/connections/slack?provider=slack`,
		});
		if (error) toast.error(error.message || fallback);
	} catch (error) {
		toast.error(error instanceof Error ? error.message : fallback);
	}
}

export function SlackReconnectButton({ slug }: { slug: string }) {
	const t = useTranslations("settings.connections.slack");
	const [pending, setPending] = useState(false);

	return (
		<Button
			disabled={pending}
			onClick={async () => {
				setPending(true);
				await startSlackOAuth(slug, t("connectErrorFallback"));
				setPending(false);
			}}
			size="xs"
			variant="contrast"
		>
			{pending ? t("openingSlack") : t("reconnect")}
		</Button>
	);
}

export function SlackConnectButton({
	slug,
	configured,
	connectError,
}: {
	slug: string;
	configured: boolean;
	connectError?: string;
}) {
	const t = useTranslations("settings.connections.slack");
	const [pending, setPending] = useState(false);

	const connectErrors = new Map([
		["access_denied", t("connectErrors.accessDenied")],
		[
			"account_already_linked_to_different_user",
			t("connectErrors.alreadyLinked"),
		],
		["email_doesn't_match", t("connectErrors.emailMismatch")],
		["oauth_code_verification_failed", t("connectErrors.oauthFailed")],
		["user_info_is_missing", t("connectErrors.userInfoMissing")],
	]);

	const connect = async () => {
		setPending(true);
		await startSlackOAuth(slug, t("connectErrorFallback"));
		setPending(false);
	};
	return (
		<div className="flex min-w-0 flex-col gap-2">
			<Button onClick={() => void connect()} disabled={!configured || pending}>
				{pending
					? t("openingSlack")
					: configured
						? t("connectButton")
						: t("notConfigured")}
			</Button>
			{connectError ? (
				<p role="alert" className="max-w-sm text-destructive text-xs">
					{connectErrors.get(connectError) ??
						t("connectErrorGeneric", {
							reason: connectError.replaceAll("_", " "),
						})}
				</p>
			) : null}
		</div>
	);
}
