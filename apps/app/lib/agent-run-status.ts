export const AGENT_RUN_STATUSES = [
	"SUCCEEDED",
	"FAILED",
	"RUNNING",
	"QUEUED",
	"WAITING_FOR_APPROVAL",
	"CANCELLED",
] as const;

export const AGENT_ACTION_STATUSES = [
	"PLANNED",
	"RUNNING",
	"SUCCEEDED",
	"FAILED",
	"CANCELLED",
] as const;

export const AGENT_TRIGGER_TYPES = [
	"MANUAL",
	"SCHEDULE",
	"EVENT",
	"WEBHOOK",
] as const;

type RunStatus = (typeof AGENT_RUN_STATUSES)[number];
type ActionStatus = (typeof AGENT_ACTION_STATUSES)[number];
type TriggerType = (typeof AGENT_TRIGGER_TYPES)[number];

export function isRunStatus(value: string): value is RunStatus {
	return AGENT_RUN_STATUSES.some((status) => status === value);
}

export function isActionStatus(value: string): value is ActionStatus {
	return AGENT_ACTION_STATUSES.some((status) => status === value);
}

export function isTriggerType(value: string): value is TriggerType {
	return AGENT_TRIGGER_TYPES.some((type) => type === value);
}
