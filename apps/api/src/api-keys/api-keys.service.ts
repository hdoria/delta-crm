import { ForbiddenException, Injectable } from "@nestjs/common";
import type { ListResult } from "../trpc/list-input";
import type {
	ApiKeyListInput,
	ApiKeySummary,
	CreateApiKeyInput,
	CreatedApiKey,
	RevokeApiKeyInput,
} from "./api-keys.contracts";

@Injectable()
export class ApiKeysService {
	async list(
		_userId: string,
		_input: ApiKeyListInput,
	): Promise<ListResult<ApiKeySummary>> {
		return { rows: [], total: 0, facetCounts: {} };
	}
	async create(
		_userId: string,
		_headers: Headers,
		_input: CreateApiKeyInput,
	): Promise<CreatedApiKey> {
		throw new ForbiddenException(
			"Chaves de API estão desabilitadas. Use uma conta autorizada pelo Supabase.",
		);
	}
	async revoke(
		_userId: string,
		_headers: Headers,
		_input: RevokeApiKeyInput,
	): Promise<{ id: string }> {
		throw new ForbiddenException(
			"Chaves de API estão desabilitadas e não concedem acesso ao Base CRM.",
		);
	}
}
