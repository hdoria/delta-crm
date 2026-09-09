import { z } from "zod";

export type MessageTree = { [key: string]: string | MessageTree };

export const messageTree: z.ZodType<MessageTree> = z.lazy(() =>
	z.record(z.string(), z.union([z.string(), messageTree])),
);

export function parseMessageTree(value: unknown, source: string): MessageTree {
	const result = messageTree.safeParse(value);

	if (!result.success) {
		throw new Error(
			`${source} is not a message catalog: ${result.error.issues
				.map((issue) => `${issue.path.join(".")} ${issue.message}`)
				.join("; ")}`,
		);
	}

	return result.data;
}

export function messageBranch(
	value: string | MessageTree | undefined,
): MessageTree | null {
	const result = messageTree.safeParse(value);
	return result.success ? result.data : null;
}

export function mergeMessageTrees(
	fallback: MessageTree,
	active: MessageTree,
): MessageTree {
	const merged: MessageTree = { ...fallback };

	for (const [key, value] of Object.entries(active)) {
		const base = messageBranch(merged[key]);
		const next = messageBranch(value);
		merged[key] = base && next ? mergeMessageTrees(base, next) : value;
	}

	return merged;
}
