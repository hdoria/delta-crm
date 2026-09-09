const APP_NAME = "Base CRM";

export const BRAND = {
	appName: APP_NAME,
	slackHandle: `@${APP_NAME}`,
	slackInviteCommand: `/invite @${APP_NAME}`,
} as const;
