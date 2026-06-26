import { createAsync, useLocation, type RouteDefinition } from "@solidjs/router";
import { Title, Meta, Link } from "@solidjs/meta";
import { Suspense, Show, lazy } from "solid-js";
import { getPortfolioData, getProfileMeta } from "~/server/db/portfolio";
import { useProfileMeta, buildTitle } from "~/stores/profile";
import Header from "~/components/shared/Header";
import Footer from "~/components/shared/Footer";
import ScrollToTop from "~/components/shared/ScrollToTop";
import Hero from "~/features/landing/Hero";

const About = lazy(() => import("~/features/landing/About"));
const EducationSection = lazy(() => import("~/features/landing/Education"));
const ExperienceSection = lazy(() => import("~/features/landing/Experience"));
const ProjectsSection = lazy(() => import("~/features/landing/Projects"));
const VolunteeringSection = lazy(() => import("~/features/landing/Volunteering"));
const GitHubStatsSection = lazy(() => import("~/features/landing/GitHubStats"));
const ContactSection = lazy(() => import("~/features/landing/Contact"));

export const route: RouteDefinition = {
  preload: () => { getPortfolioData(); getProfileMeta(); }
};

export default function Home() {
  const data = createAsync(() => getPortfolioData());
  const profile = useProfileMeta();
  const location = useLocation();

  const pageTitle = () => buildTitle(undefined, profile());
  const description = () =>
    data()?.profile?.bio?.slice(0, 160) ?? "Website portfolio pribadi - proyek, pengalaman, dan pendidikan.";
  const keywords = () =>
    [profile()?.name, profile()?.title, "portfolio", "developer", "Indonesia"]
      .filter(Boolean)
      .join(", ");
  const ogImage = () => data()?.profile?.avatar?.path;

  return (
    <>
      <Title>{pageTitle()}</Title>
      <Meta name="description" content={description()} />
      <Meta name="keywords" content={keywords()} />
      <Meta name="robots" content="index, follow" />
      <Meta property="og:type" content="profile" />
      <Meta property="og:title" content={pageTitle()} />
      <Meta property="og:description" content={description()} />
      <Meta property="og:locale" content="id_ID" />
      <Show when={ogImage()}>
        <Meta property="og:image" content={ogImage()!} />
        <Meta name="twitter:image" content={ogImage()!} />
      </Show>
      <Meta name="twitter:card" content="summary_large_image" />
      <Meta name="twitter:title" content={pageTitle()} />
      <Meta name="twitter:description" content={description()} />
      <Link rel="canonical" href={location.pathname} />

      <Header />

      <main id="main-content" class="relative overflow-hidden bg-gradient-to-b from-[var(--c-bg)] via-[var(--c-bg-alt)] to-[var(--c-bg)]">
        <div class="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
          <div class="absolute top-[5%] right-[-10%] w-[450px] h-[450px] rounded-full bg-[#ff6b00]/8 blur-[100px] dark:bg-[#ff6b00]/4" />
          <div class="absolute top-[25%] left-[-15%] w-[550px] h-[550px] rounded-full bg-[#ff6b00]/6 blur-[130px] dark:bg-[#ff6b00]/3" />
          <div class="absolute top-[50%] right-[-15%] w-[500px] h-[500px] rounded-full bg-[#ff6b00]/7 blur-[120px] dark:bg-[#ff6b00]/4" />
          <div class="absolute top-[75%] left-[-10%] w-[450px] h-[450px] rounded-full bg-[#ff6b00]/6 blur-[110px] dark:bg-[#ff6b00]/3" />
        </div>

        <Suspense fallback={<Hero loading />}>
          <Hero profile={data()?.profile ?? undefined} loading={data() === undefined} />
        </Suspense>

        <Suspense>
          <About profile={data()?.profile ?? undefined} loading={data() === undefined} />
        </Suspense>

        <Suspense>
          <ExperienceSection items={data()?.experiences ?? []} loading={data() === undefined} />
        </Suspense>

        <Suspense>
          <ProjectsSection items={data()?.projects ?? []} loading={data() === undefined} />
        </Suspense>

        <Suspense>
          <EducationSection items={data()?.educations ?? []} loading={data() === undefined} />
        </Suspense>

        <Suspense>
          <VolunteeringSection items={data()?.volunteerings ?? []} loading={data() === undefined} />
        </Suspense>

        <Suspense>
          <GitHubStatsSection stats={data()?.githubStats} loading={data() === undefined} />
        </Suspense>

        <Suspense>
          <ContactSection />
        </Suspense>
      </main>

      <Footer />
      <ScrollToTop />
    </>
  );
}
