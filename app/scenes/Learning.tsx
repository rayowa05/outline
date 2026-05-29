import { observer } from "mobx-react";
import {
  AcademicCapIcon,
  ClockIcon,
  DoneIcon,
  GraphIcon,
  GoToIcon,
  LightningIcon,
  PadlockIcon,
  ProfileIcon,
  SparklesIcon,
  TargetIcon,
} from "outline-icons";
import { Link } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";

const testModulesPath = "/doc/lms-h5p-test-modules-9uosPH9WQn";

const brand = {
  paper: "#f7f5ef",
  surface: "#fffcf5",
  rule: "#dedad1",
  ink: "#20302d",
  muted: "#777a73",
  dark: "#1c2018",
  darkSoft: "#25283a",
  blue: "#354cef",
  lime: "#edff3d",
  lavender: "#ececff",
  successSurface: "#e9f8f1",
  successText: "#26724d",
  warningSurface: "#fff7e6",
  warningText: "#8a5a00",
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", "Courier New", monospace',
};

type ModuleState =
  | "notStarted"
  | "inProgress"
  | "completed"
  | "comingSoon"
  | "designing";

type StatusTone = "accent" | "active" | "neutral" | "muted" | "warning";

const moduleStates: Record<
  ModuleState,
  {
    label: string;
    action: string;
    tone: StatusTone;
    disabled?: boolean;
  }
> = {
  notStarted: {
    label: "Not started",
    action: "Start module",
    tone: "neutral",
  },
  inProgress: {
    label: "In progress",
    action: "Continue",
    tone: "active",
  },
  completed: {
    label: "Completed",
    action: "Review",
    tone: "accent",
  },
  comingSoon: {
    label: "Coming soon",
    action: "Coming soon",
    tone: "muted",
    disabled: true,
  },
  designing: {
    label: "Designing",
    action: "Preview",
    tone: "warning",
  },
};

const modules = [
  {
    title: "Dash.fi Product Knowledge",
    type: "Quiz",
    length: "8 min",
    state: "completed" as const,
    progress: 100,
    score: "80% pass",
    description:
      "Baseline certification on cashback, limits, repayment, and product positioning.",
    path: testModulesPath,
  },
  {
    title: "Competitor Deep Dive: SoFi",
    type: "Interactive video",
    length: "12 min",
    state: "inProgress" as const,
    progress: 45,
    score: "4 checkpoints",
    description:
      "Practice discovery-first positioning against SoFi with checkpoint questions.",
    path: testModulesPath,
  },
  {
    title: "Discovery & Objection Lab",
    type: "Practice",
    length: "20 min",
    state: "notStarted" as const,
    progress: 0,
    score: "Scenario based",
    description:
      "Role-play branching paths for common first-call objections and next steps.",
    path: testModulesPath,
  },
  {
    title: "First Call Certification",
    type: "Certification",
    length: "30 min",
    state: "designing" as const,
    progress: 0,
    score: "Manager reviewed",
    description:
      "A scored practice path for discovery, positioning, objection handling, and follow-up discipline.",
    path: testModulesPath,
  },
  {
    title: "Manager Coaching Review",
    type: "Coaching",
    length: "15 min",
    state: "comingSoon" as const,
    progress: 0,
    score: "Team review",
    description:
      "A manager-led review module for reinforcing certifications in coaching conversations.",
    path: testModulesPath,
  },
];

const tracks = [
  {
    title: "AE Ramp",
    meta: "First 30 days",
    description:
      "The required path for understanding Dash.fi products, positioning, and first-call execution.",
  },
  {
    title: "Product Certification",
    meta: "Core knowledge",
    description:
      "Short assessments that prove reps can explain the product accurately and confidently.",
  },
  {
    title: "Competitive Positioning",
    meta: "Battlecards + practice",
    description:
      "Interactive competitor modules that teach reps when to compare, when to reframe, and when to disqualify.",
  },
  {
    title: "Manager Coaching",
    meta: "Reinforcement",
    description:
      "Coaching guides, score reviews, and follow-up exercises tied to module performance.",
  },
];

const futureFeatures = [
  {
    title: "My Progress",
    icon: <ProfileIcon size={18} />,
    description:
      "A learner profile for completed modules, active modules, and assigned modules that have not been started.",
  },
  {
    title: "Leaderboard",
    icon: <GraphIcon size={18} />,
    description:
      "Badges, completion speed, score rankings, and team-level training momentum once the scoring model is validated.",
  },
];

function Learning() {
  return (
    <Scene icon={<AcademicCapIcon />} title="Learning">
      <Page>
        <Hero>
          <HeroCopy>
            <Eyebrow>Learning hub pilot</Eyebrow>
            <Heading>Learning</Heading>
            <HeroText>
              A focused training cockpit for Dash.fi modules, certifications,
              and interactive H5P practice. This is a dedicated app surface, not
              a collection folder.
            </HeroText>
            <Actions>
              <Button as={Link} to={testModulesPath} icon={<GoToIcon />}>
                Continue learning
              </Button>
              <SecondaryAction href="#modules">Browse modules</SecondaryAction>
            </Actions>
          </HeroCopy>
          <StatusPanel aria-label="Learning progress">
            <PanelHeader>
              <PanelTitle>First rollout</PanelTitle>
              <StatusPill>Pilot</StatusPill>
            </PanelHeader>
            <MetricGrid>
              <Metric>
                <MetricValue>2</MetricValue>
                <MetricLabel>Live modules</MetricLabel>
              </Metric>
              <Metric>
                <MetricValue>6</MetricValue>
                <MetricLabel>Planned tracks</MetricLabel>
              </Metric>
              <Metric>
                <MetricValue>H5P</MetricValue>
                <MetricLabel>Interactive proof</MetricLabel>
              </Metric>
            </MetricGrid>
          </StatusPanel>
        </Hero>

        <Section>
          <SectionHeader>
            <SectionKicker>
              <SectionNumber>01</SectionNumber>
              <span>Assigned modules</span>
            </SectionKicker>
            <SectionTitle>Start here</SectionTitle>
            <SectionText>
              The first modules prove the full learning path: quiz, interactive
              video, checkpoint scoring, and a clear next action.
            </SectionText>
          </SectionHeader>
          <ModuleGrid id="modules">
            {modules.map((module) => (
              <ModuleCard key={module.title}>
                {(() => {
                  const state = moduleStates[module.state];

                  return (
                    <>
                      <CardTopline>
                        <Chip>{module.type}</Chip>
                        <CardMeta>
                          <ClockIcon size={14} /> {module.length}
                        </CardMeta>
                      </CardTopline>
                      <CardTitle>{module.title}</CardTitle>
                      <CardDescription>{module.description}</CardDescription>
                      <CardFooter>
                        <Outcome>
                          <TargetIcon size={14} /> {module.score}
                        </Outcome>
                        <StatusPill $tone={state.tone}>
                          {state.label}
                        </StatusPill>
                      </CardFooter>
                      <ProgressWrap>
                        <ProgressMeta>
                          <span>Progress</span>
                          <span>{module.progress}%</span>
                        </ProgressMeta>
                        <ProgressTrack
                          aria-label={`${module.title} progress`}
                          aria-valuemax={100}
                          aria-valuemin={0}
                          aria-valuenow={module.progress}
                          role="progressbar"
                        >
                          <ProgressFill
                            $tone={state.tone}
                            $value={module.progress}
                          />
                        </ProgressTrack>
                      </ProgressWrap>
                      {state.disabled ? (
                        <CardAction as="span" $disabled>
                          <PadlockIcon size={14} /> {state.action}
                        </CardAction>
                      ) : (
                        <CardAction as={Link} to={module.path}>
                          <SparklesIcon size={14} /> {state.action}
                        </CardAction>
                      )}
                    </>
                  );
                })()}
              </ModuleCard>
            ))}
          </ModuleGrid>
        </Section>

        <Section>
          <SectionHeader>
            <SectionKicker>
              <SectionNumber>02</SectionNumber>
              <span>Role tracks</span>
            </SectionKicker>
            <SectionTitle>Role tracks</SectionTitle>
            <SectionText>
              Tracks keep the learner experience organized by job-to-be-done,
              while the underlying docs and H5P packages stay governed.
            </SectionText>
          </SectionHeader>
          <TrackGrid>
            {tracks.map((track) => (
              <TrackCard key={track.title}>
                <TrackIcon>
                  <LightningIcon size={18} />
                </TrackIcon>
                <TrackCopy>
                  <TrackTitle>{track.title}</TrackTitle>
                  <TrackMeta>{track.meta}</TrackMeta>
                  <TrackDescription>{track.description}</TrackDescription>
                </TrackCopy>
              </TrackCard>
            ))}
          </TrackGrid>
        </Section>

        <Section>
          <SectionHeader>
            <SectionKicker>
              <SectionNumber>03</SectionNumber>
              <span>Future surfaces</span>
            </SectionKicker>
            <SectionTitle>Coming soon</SectionTitle>
            <SectionText>
              These surfaces need a dedicated PRD and data model review before
              they become active learner workflows.
            </SectionText>
          </SectionHeader>
          <FutureGrid>
            {futureFeatures.map((feature) => (
              <FutureCard key={feature.title}>
                <FutureIcon>{feature.icon}</FutureIcon>
                <FutureCopy>
                  <FutureTitle>
                    {feature.title}
                    <FutureBadge>Coming soon</FutureBadge>
                  </FutureTitle>
                  <FutureDescription>{feature.description}</FutureDescription>
                </FutureCopy>
              </FutureCard>
            ))}
          </FutureGrid>
        </Section>

        <Roadmap>
          <RoadmapItem>
            <DoneIcon size={16} />
            <span>H5P rendering proof live in Outline</span>
          </RoadmapItem>
          <RoadmapItem>
            <DoneIcon size={16} />
            <span>Learning tab wired into the app shell</span>
          </RoadmapItem>
          <RoadmapItem $pending>
            <span>3</span>
            <span>
              Connect module cards to live tracking and completion data
            </span>
          </RoadmapItem>
        </Roadmap>
      </Page>
    </Scene>
  );
}

const Page = styled.div`
  background: ${brand.paper};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 40px;
  margin: 0;
  min-width: 0;
  padding: 24px 16px 64px;

  ${breakpoint("tablet")`
    margin: -16px -32px 0;
    padding: 32px 32px 72px;
  `};
`;

const Hero = styled.section`
  background: ${brand.dark};
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  color: #fff;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  padding: 28px;

  ${breakpoint("tablet")`
    grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.6fr);
    align-items: end;
    padding: 40px;
  `};
`;

const HeroCopy = styled.div`
  max-width: 720px;

  h1 {
    color: #fff;
    font-family: ${brand.mono};
    font-size: clamp(36px, 5vw, 64px);
    font-weight: 400;
    letter-spacing: 0;
    line-height: 1.02;
  }
`;

const Eyebrow = styled.div`
  color: ${brand.lime};
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
  margin-bottom: -12px;
  text-transform: uppercase;
`;

const HeroText = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 17px;
  line-height: 1.55;
  margin: -4px 0 0;
  max-width: 640px;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
`;

const SecondaryAction = styled.a`
  align-items: center;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.78);
  display: inline-flex;
  font-size: 14px;
  font-weight: 600;
  height: 34px;
  justify-content: center;
  padding: 0 12px;
  text-decoration: none;

  &:hover {
    color: #fff;
    text-decoration: none;
  }
`;

const StatusPanel = styled.aside`
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  padding: 18px;
`;

const PanelHeader = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
`;

const PanelTitle = styled.div`
  color: #fff;
  font-family: ${brand.mono};
  font-weight: 600;
`;

const StatusPill = styled.span<{ $tone?: StatusTone }>`
  background: ${(props) =>
    props.$tone === "accent"
      ? brand.lime
      : props.$tone === "warning"
        ? brand.warningSurface
        : props.$tone === "muted"
          ? brand.lavender
          : props.$tone === "active"
            ? "rgba(53, 76, 239, 0.1)"
            : brand.surface};
  border: 1px solid
    ${(props) =>
      props.$tone === "accent"
        ? "transparent"
        : props.$tone === "warning"
          ? "#f5c77e"
          : props.$tone === "active"
            ? "rgba(53, 76, 239, 0.28)"
            : brand.rule};
  border-radius: 999px;
  color: ${(props) =>
    props.$tone === "accent"
      ? brand.dark
      : props.$tone === "active"
        ? brand.blue
        : props.$tone === "warning"
          ? brand.warningText
          : props.$tone === "muted"
            ? brand.blue
            : brand.muted};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  line-height: 1;
  padding: 6px 9px;
  text-transform: uppercase;
  white-space: nowrap;
`;

const MetricGrid = styled.div`
  display: grid;
  gap: 10px;
`;

const Metric = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  padding-top: 12px;
`;

const MetricValue = styled.div`
  color: #fff;
  font-family: ${brand.mono};
  font-size: 24px;
  font-weight: 400;
  line-height: 1;
`;

const MetricLabel = styled.div`
  color: rgba(255, 255, 255, 0.55);
  font-family: ${brand.mono};
  font-size: 13px;
  letter-spacing: 0.08em;
  margin-top: 4px;
  text-transform: uppercase;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionHeader = styled.div`
  max-width: 720px;
`;

const SectionKicker = styled.div`
  align-items: center;
  color: ${brand.muted};
  display: flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 700;
  gap: 12px;
  letter-spacing: 0.18em;
  margin-bottom: 14px;
  text-transform: uppercase;

  &::after {
    background: ${brand.rule};
    content: "";
    flex: 1 1 auto;
    height: 1px;
  }
`;

const SectionNumber = styled.span`
  background: ${brand.lavender};
  border-radius: 4px;
  color: ${brand.blue};
  display: inline-flex;
  letter-spacing: 0.08em;
  padding: 5px 9px;
`;

const SectionTitle = styled.h2`
  color: ${brand.blue};
  font-family: ${brand.mono};
  font-size: 32px;
  font-weight: 400;
  line-height: 1.2;
  margin: 0 0 6px;
`;

const SectionText = styled.p`
  color: ${brand.muted};
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
`;

const ModuleGrid = styled.div`
  display: grid;
  gap: 14px;

  ${breakpoint("tablet")`
    grid-template-columns: repeat(3, minmax(0, 1fr));
  `};
`;

const ModuleCard = styled.article`
  background: ${brand.surface};
  border: 1px solid ${brand.rule};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  min-height: 294px;
  padding: 18px;
`;

const CardTopline = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
`;

const Chip = styled.span`
  background: rgba(53, 76, 239, 0.06);
  border: 1px solid rgba(53, 76, 239, 0.14);
  border-radius: 4px;
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  padding: 5px 8px;
  text-transform: uppercase;
`;

const CardMeta = styled.span`
  align-items: center;
  color: ${brand.muted};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 12px;
  gap: 4px;
  white-space: nowrap;
`;

const CardTitle = styled.h3`
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 20px;
  font-weight: 400;
  line-height: 1.3;
  margin: 0 0 8px;
`;

const CardDescription = styled.p`
  color: ${brand.muted};
  font-size: 14px;
  line-height: 1.45;
  margin: 0;
`;

const CardFooter = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 18px;
`;

const Outcome = styled.span`
  align-items: center;
  color: ${brand.muted};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 600;
  gap: 5px;
  letter-spacing: 0.04em;
`;

const ProgressWrap = styled.div`
  display: grid;
  gap: 7px;
  margin-top: 14px;
`;

const ProgressMeta = styled.div`
  align-items: center;
  color: ${brand.muted};
  display: flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 600;
  justify-content: space-between;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const ProgressTrack = styled.div`
  background: #ece9e1;
  border: 1px solid ${brand.rule};
  border-radius: 999px;
  height: 8px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $tone: StatusTone; $value: number }>`
  background: ${(props) =>
    props.$tone === "accent"
      ? brand.lime
      : props.$tone === "warning"
        ? "#d89b24"
        : props.$tone === "muted"
          ? brand.rule
          : brand.blue};
  border-radius: inherit;
  height: 100%;
  transition: width 160ms ease;
  width: ${(props) => props.$value}%;
`;

const CardAction = styled.a<{ $disabled?: boolean }>`
  align-items: center;
  background: ${(props) => (props.$disabled ? "#ece9e1" : brand.dark)};
  border: 1px solid ${(props) => (props.$disabled ? brand.rule : "transparent")};
  border-radius: 6px;
  color: ${(props) => (props.$disabled ? brand.muted : "#fff")};
  display: flex;
  font-family: ${brand.mono};
  font-size: 14px;
  font-weight: 600;
  gap: 6px;
  height: 34px;
  justify-content: center;
  margin-top: 16px;
  pointer-events: ${(props) => (props.$disabled ? "none" : "auto")};
  text-decoration: none;

  &:hover {
    color: ${(props) => (props.$disabled ? brand.muted : brand.lime)};
    opacity: ${(props) => (props.$disabled ? 1 : 0.9)};
    text-decoration: none;
  }
`;

const TrackGrid = styled.div`
  display: grid;
  gap: 12px;

  ${breakpoint("tablet")`
    grid-template-columns: repeat(2, minmax(0, 1fr));
  `};
`;

const TrackCard = styled.article`
  align-items: flex-start;
  background: ${brand.surface};
  border: 1px solid ${brand.rule};
  border-radius: 12px;
  display: flex;
  gap: 14px;
  padding: 16px;
`;

const TrackIcon = styled.div`
  align-items: center;
  background: ${brand.lavender};
  border: 1px solid rgba(53, 76, 239, 0.12);
  border-radius: 8px;
  color: ${brand.blue};
  display: flex;
  flex: 0 0 36px;
  height: 36px;
  justify-content: center;
  width: 36px;
`;

const TrackCopy = styled.div`
  min-width: 0;
`;

const TrackTitle = styled.h3`
  align-items: center;
  color: ${brand.ink};
  display: flex;
  flex-wrap: wrap;
  font-family: ${brand.mono};
  font-size: 15px;
  font-weight: 600;
  gap: 6px;
  margin: 0;

  &::after {
    background: ${brand.lavender};
    border-radius: 999px;
    color: ${brand.blue};
    content: "(Coming soon)";
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    padding: 4px 7px;
  }
`;

const TrackMeta = styled.div`
  color: ${brand.blue};
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.08em;
  margin-top: 2px;
  text-transform: uppercase;
`;

const TrackDescription = styled.p`
  color: ${brand.muted};
  font-size: 13px;
  line-height: 1.45;
  margin: 8px 0 0;
`;

const FutureGrid = styled.div`
  display: grid;
  gap: 12px;

  ${breakpoint("tablet")`
    grid-template-columns: repeat(2, minmax(0, 1fr));
  `};
`;

const FutureCard = styled.article`
  align-items: flex-start;
  background: ${brand.dark};
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  display: flex;
  gap: 14px;
  padding: 16px;
`;

const FutureIcon = styled.div`
  align-items: center;
  background: rgba(237, 255, 61, 0.1);
  border: 1px solid rgba(237, 255, 61, 0.22);
  border-radius: 8px;
  color: ${brand.lime};
  display: flex;
  flex: 0 0 36px;
  height: 36px;
  justify-content: center;
  width: 36px;
`;

const FutureCopy = styled.div`
  min-width: 0;
`;

const FutureTitle = styled.h3`
  align-items: center;
  color: #fff;
  display: flex;
  flex-wrap: wrap;
  font-family: ${brand.mono};
  font-size: 15px;
  font-weight: 650;
  gap: 8px;
  margin: 0;
`;

const FutureBadge = styled.span`
  background: ${brand.lime};
  border-radius: 999px;
  color: ${brand.dark};
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
  padding: 4px 7px;
  text-transform: uppercase;
`;

const FutureDescription = styled.p`
  color: rgba(255, 255, 255, 0.62);
  font-size: 13px;
  line-height: 1.45;
  margin: 8px 0 0;
`;

const Roadmap = styled.div`
  border-top: 1px solid ${brand.rule};
  display: grid;
  gap: 10px;
  padding-top: 18px;
`;

const RoadmapItem = styled.div<{ $pending?: boolean }>`
  align-items: center;
  color: ${(props) => (props.$pending ? brand.muted : brand.ink)};
  display: flex;
  font-family: ${brand.mono};
  font-size: 13px;
  gap: 8px;

  svg,
  > span:first-child {
    align-items: center;
    background: ${(props) => (props.$pending ? brand.surface : brand.blue)};
    border: 1px solid
      ${(props) => (props.$pending ? brand.rule : "transparent")};
    border-radius: 999px;
    color: ${(props) => (props.$pending ? brand.muted : "#fff")};
    display: inline-flex;
    flex: 0 0 22px;
    font-size: 12px;
    font-weight: 700;
    height: 22px;
    justify-content: center;
    width: 22px;
  }
`;

export default observer(Learning);
