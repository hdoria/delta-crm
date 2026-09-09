import Link from "next/link";
import { useTranslations } from "next-intl";
import { Wordmark } from "./wordmark";

export function LandingNav() {
	const t = useTranslations("nav");
	return (
		<header className="relative flex h-16 w-full shrink-0 items-center justify-center border-border border-b">
			<nav className="flex w-full max-w-6xl items-center gap-8 px-6">
				<Link href="/" aria-label={t("homepage")}>
					<Wordmark />
				</Link>
			</nav>
		</header>
	);
}
