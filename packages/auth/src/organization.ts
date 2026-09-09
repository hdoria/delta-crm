import { type Db, db } from "@crm/db";
import { WORKSPACE_ID, workspaceSlug } from "@crm/db/workspace";

export { WORKSPACE_ID };

export const DEFAULT_WORKSPACE_NAME = "Base CRM";

export const WORKSPACE_ROLES = ["owner", "admin", "member"] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export function isWorkspaceRole(value: string): value is WorkspaceRole {
	return (WORKSPACE_ROLES as readonly string[]).includes(value);
}

export function isWorkspaceAdmin(role: WorkspaceRole | null): boolean {
	return role === "owner" || role === "admin";
}

export function canRenameWorkspace(role: WorkspaceRole | null): boolean {
	return isWorkspaceAdmin(role);
}

export function canChangeRole(role: WorkspaceRole | null): boolean {
	return isWorkspaceAdmin(role);
}

export function canManageCurrency(role: WorkspaceRole | null): boolean {
	return isWorkspaceAdmin(role);
}

export function canManageConnections(role: WorkspaceRole | null): boolean {
	return isWorkspaceAdmin(role);
}

export function canManageTracking(role: WorkspaceRole | null): boolean {
	return isWorkspaceAdmin(role);
}

export async function ensureWorkspaceMembership(
	userId: string,
): Promise<string> {
	return db.$transaction(async (tx) => {
		await tx.$executeRaw`SELECT pg_advisory_xact_lock(173832041)`;
		const workspace = await tx.organization.upsert({
			where: { id: WORKSPACE_ID },
			create: {
				id: WORKSPACE_ID,
				name: DEFAULT_WORKSPACE_NAME,
				slug: workspaceSlug(DEFAULT_WORKSPACE_NAME),
				createdAt: new Date(),
			},
			update: {},
			select: { id: true },
		});
		const existing = await tx.member.findUnique({
			where: {
				organizationId_userId: { organizationId: workspace.id, userId },
			},
		});
		const humanOwner = await tx.member.findFirst({
			where: {
				organizationId: workspace.id,
				role: "owner",
				user: { accounts: { some: { providerId: "google" } } },
			},
			select: { id: true },
		});
		const role = existing?.role ?? (humanOwner ? "member" : "owner");
		await tx.member.upsert({
			where: {
				organizationId_userId: { organizationId: workspace.id, userId },
			},
			create: {
				id: crypto.randomUUID(),
				organizationId: workspace.id,
				userId,
				role,
				createdAt: new Date(),
			},
			update: !humanOwner ? { role: "owner" } : {},
		});
		return workspace.id;
	});
}

export function toWorkspaceRole(value: string): WorkspaceRole {
	return isWorkspaceRole(value) ? value : "member";
}

export type WorkspaceMemberReader = Pick<Db, "member">;

export async function workspaceRoleOf(
	userId: string,
	client: WorkspaceMemberReader = db,
): Promise<WorkspaceRole | null> {
	const member = await client.member.findUnique({
		where: { organizationId_userId: { organizationId: WORKSPACE_ID, userId } },
		select: { role: true },
	});

	return member ? toWorkspaceRole(member.role) : null;
}
