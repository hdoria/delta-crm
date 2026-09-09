export type MockCompany = {
	name: string;
	domain: string;
	logo?: { src: string; invert?: boolean };
	industry?: string;
	owner?: { name: string; avatar: string };
	contacts?: string;
	deals?: string;
	lastActivity?: string;
};

export const OWNER = {
	name: "Patrick Onusko",
	avatar: "/landing/avatar-patrick.jpg",
};

export const MOCK_COMPANIES: MockCompany[] = [
	{
		name: "Acme",
		domain: "example.com",
		industry: "Software",
		owner: OWNER,
		contacts: "1",
		deals: "0",
		lastActivity: "2h ago",
	},
	{
		name: "Tristar Fulfillment",
		domain: "tristarfulfillment.com",
		logo: { src: "/landing/logos/tristar-fulfillment.webp", invert: true },
	},
	{
		name: "AuditBot",
		domain: "auditbot.co",
		logo: { src: "/landing/logos/auditbot.webp" },
	},
	{
		name: "Tawkeed",
		domain: "tawkeed.ai",
		logo: { src: "/landing/logos/tawkeed.webp" },
	},
	{
		name: "Piku",
		domain: "piku.com",
		logo: { src: "/landing/logos/piku.webp" },
	},
	{
		name: "Roo Capital",
		domain: "roocapital.com",
		logo: { src: "/landing/logos/roo-capital.webp" },
	},
	{
		name: "Social Good Software",
		domain: "socialgoodsoftware.com",
		logo: { src: "/landing/logos/social-good-software.webp" },
	},
	{
		name: "Ridgetop",
		domain: "ridgetoptech.com",
		logo: { src: "/landing/logos/ridgetop.webp" },
	},
];

export const COMPANY_COLUMNS = [
	{ key: "company", width: "26%" },
	{ key: "domain", width: "16%" },
	{ key: "industry", width: "16%" },
	{ key: "owner", width: "16%" },
	{ key: "contacts", width: "9%" },
	{ key: "deals", width: "9%" },
	{ key: "lastActivity", width: "12%" },
] as const;
