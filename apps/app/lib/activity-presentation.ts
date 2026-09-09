import ArrowRight from "@carbon/icons-react/es/ArrowRight";
import Chat from "@carbon/icons-react/es/Chat";
import Email from "@carbon/icons-react/es/Email";
import Events from "@carbon/icons-react/es/Events";
import MagicWand from "@carbon/icons-react/es/MagicWand";
import Phone from "@carbon/icons-react/es/Phone";
import Task from "@carbon/icons-react/es/Task";
import type { ActivityType } from "@crm/db/enums";
import type { CarbonIcon } from "@crm/ui/components/icon";

const ICONS = {
	NOTE: Chat,
	CALL: Phone,
	EMAIL: Email,
	MEETING: Events,
	TASK: Task,
	STAGE_CHANGE: ArrowRight,
	ENRICHMENT: MagicWand,
} satisfies Record<ActivityType, CarbonIcon>;

export function activityIcon(type: ActivityType): CarbonIcon {
	return ICONS[type];
}
