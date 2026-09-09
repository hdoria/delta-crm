import { isGoogleConfigured, ssoCallbackBase } from "@crm/auth";
import { ForbiddenException, Injectable } from "@nestjs/common";
import type { ListResult } from "../trpc/list-input";
import type {
	DeleteSsoProviderInput,
	RegisterSsoProviderInput,
	SignInOptions,
	SsoProvider,
	SsoProviderListInput,
	SsoSettings,
} from "./sso.contracts";

@Injectable()
export class SsoService {
	async signInOptions(): Promise<SignInOptions> {
		return { google: isGoogleConfigured(), microsoft: false, providers: [] };
	}
	async settings(_userId: string): Promise<SsoSettings> {
		return { canConfigure: false, callbackBase: ssoCallbackBase() };
	}
	async list(_input: SsoProviderListInput): Promise<ListResult<SsoProvider>> {
		return { rows: [], total: 0, facetCounts: {} };
	}
	async register(
		_userId: string,
		_headers: Headers,
		_input: RegisterSsoProviderInput,
	): Promise<SsoProvider> {
		throw new ForbiddenException(
			"O Base CRM usa somente Google pelo Supabase. Outros provedores estão desabilitados.",
		);
	}
	async remove(
		_userId: string,
		_headers: Headers,
		_input: DeleteSsoProviderInput,
	): Promise<{ providerId: string }> {
		throw new ForbiddenException(
			"A configuração de login é gerenciada pelo Supabase.",
		);
	}
}
