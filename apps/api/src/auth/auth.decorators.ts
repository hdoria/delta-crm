import type { Session as CrmSession } from "@crm/auth";
import {
	createParamDecorator,
	type ExecutionContext,
	SetMetadata,
} from "@nestjs/common";
export const AUTH_MODE = "base-crm:auth-mode";
export const AllowAnonymous = () => SetMetadata(AUTH_MODE, "public");
export const OptionalAuth = () => SetMetadata(AUTH_MODE, "optional");
export const Session = createParamDecorator(
	(_data: undefined, context: ExecutionContext): CrmSession | null =>
		context.switchToHttp().getRequest().session ?? null,
);
