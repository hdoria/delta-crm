import { auth } from "@crm/auth";
import { fromNodeHeaders } from "@crm/auth/supabase";
import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AUTH_MODE } from "./auth.decorators";

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const mode = this.reflector.getAllAndOverride<string>(AUTH_MODE, [
			context.getHandler(),
			context.getClass(),
		]);
		if (mode === "public") return true;
		const request = context.switchToHttp().getRequest();
		const session = await auth.api.getSession({
			headers: fromNodeHeaders(request.headers),
		});
		request.session = session;
		if (!session && mode !== "optional")
			throw new UnauthorizedException(
				"Entre com sua conta para acessar o Base CRM.",
			);
		return true;
	}
}
