import type { Metadata } from "next";
import {
	PageShell,
	PageShellDescription,
	PageShellHeader,
	PageShellHeading,
	PageShellTitle,
} from "@/components/page-shell";

export const metadata: Metadata = { title: "Conexões" };

export default function ConnectionsPage() {
	return (
		<PageShell>
			<PageShellHeader>
				<PageShellHeading>
					<PageShellTitle>Conexões</PageShellTitle>
					<PageShellDescription>
						O Google é usado para entrar no Base CRM. Integrações com e-mail,
						calendário e Slack ainda não estão disponíveis nesta versão.
					</PageShellDescription>
				</PageShellHeading>
			</PageShellHeader>
		</PageShell>
	);
}
