import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SupabaseAuthGuard } from "./supabase-auth.guard";

@Module({
	controllers: [AuthController],
	providers: [AuthService, { provide: APP_GUARD, useClass: SupabaseAuthGuard }],
	exports: [AuthService],
})
export class AuthModule {}
