import { useTranslations } from "next-intl";
import { GitHubStarButton } from "./github-star-button";
import { SetupPromptButton } from "./setup-prompt-button";

export function Hero() {
	const t = useTranslations("landing.hero");
	return (
		<section className="relative flex w-full shrink-0 flex-col items-center px-6 pt-20 pb-10 md:pt-30">
			<div className="relative flex w-full max-w-6xl flex-col items-center gap-7">
				<h1 className="max-w-[900px] text-balance text-center font-semibold text-5xl/[52px] tracking-tight md:text-[72px]/[76px]">
					{t("title")}
				</h1>

				<p className="max-w-[640px] text-pretty text-center text-muted-foreground text-lg/[28px] md:text-xl/[30px]">
					{t("lede")}
				</p>

				<div className="flex flex-wrap items-center justify-center gap-3 pt-3">
					<SetupPromptButton location="hero" />
					<GitHubStarButton location="hero" />
				</div>
			</div>
		</section>
	);
}
