import { observer } from "mobx-react";
import {
  AcademicCapIcon,
  ClockIcon,
  DoneIcon,
  GraphIcon,
  GoToIcon,
  LightningIcon,
  ProfileIcon,
  TargetIcon,
} from "outline-icons";
import { Link } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";

const testModulesPath = "/doc/lms-h5p-test-modules-9uosPH9WQn";

const modules = [
  {
    title: "Dash.fi Product Knowledge",
    type: "Quiz",
    length: "8 min",
    status: "Ready",
    score: "80% pass",
    description:
      "Baseline certification on cashback, limits, repayment, and product positioning.",
    action: "Start quiz",
    path: testModulesPath,
  },
  {
    title: "Competitor Deep Dive: SoFi",
    type: "Interactive video",
    length: "12 min",
    status: "Ready",
    score: "4 checkpoints",
    description:
      "Practice discovery-first positioning against SoFi with checkpoint questions.",
    action: "Watch module",
    path: testModulesPath,
  },
  {
    title: "Discovery & Objection Lab",
    type: "Practice",
    length: "20 min",
    status: "Designing",
    score: "Scenario based",
    description:
      "Role-play branching paths for common first-call objections and next steps.",
    action: "Preview",
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
            <Eyebrow>Ray-only test environment</Eyebrow>
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
              <Button neutral as="a" href="#modules">
                Browse modules
              </Button>
            </Actions>
          </HeroCopy>
          <StatusPanel aria-label="Learning progress">
            <PanelHeader>
              <PanelTitle>Test rollout</PanelTitle>
              <StatusPill>Private</StatusPill>
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
            <SectionTitle>Start here</SectionTitle>
            <SectionText>
              The first modules prove the full learning path: quiz, interactive
              video, checkpoint scoring, and a clear next action.
            </SectionText>
          </SectionHeader>
          <ModuleGrid id="modules">
            {modules.map((module) => (
              <ModuleCard key={module.title}>
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
                  <StatusPill $muted={module.status !== "Ready"}>
                    {module.status}
                  </StatusPill>
                </CardFooter>
                <CardAction as={Link} to={module.path}>
                  {module.action}
                </CardAction>
              </ModuleCard>
            ))}
          </ModuleGrid>
        </Section>

        <Section>
          <SectionHeader>
            <SectionTitle>Role tracks</SectionTitle>
            <SectionText>
              Tracks keep the learner experience organized by job-to-be-done,
              while the underlying docs and H5P packages stay private.
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
            <span>Ray-only learning tab wired into the app shell</span>
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
  display: flex;
  flex-direction: column;
  gap: 40px;
  padding-bottom: 64px;
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  padding-top: 24px;

  ${breakpoint("tablet")`
    grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.6fr);
    align-items: end;
  `};
`;

const HeroCopy = styled.div`
  max-width: 720px;
`;

const Eyebrow = styled.div`
  color: ${s("accent")};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  margin-bottom: -12px;
  text-transform: uppercase;
`;

const HeroText = styled.p`
  color: ${s("textSecondary")};
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

const StatusPanel = styled.aside`
  background: ${s("backgroundSecondary")};
  border: 1px solid ${s("divider")};
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
  color: ${s("text")};
  font-weight: 600;
`;

const StatusPill = styled.span<{ $muted?: boolean }>`
  background: ${(props) =>
    props.$muted ? props.theme.background : props.theme.accent};
  border: 1px solid
    ${(props) => (props.$muted ? props.theme.divider : "transparent")};
  border-radius: 999px;
  color: ${(props) =>
    props.$muted ? props.theme.textSecondary : props.theme.accentText};
  display: inline-flex;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  padding: 6px 9px;
  white-space: nowrap;
`;

const MetricGrid = styled.div`
  display: grid;
  gap: 10px;
`;

const Metric = styled.div`
  border-top: 1px solid ${s("divider")};
  padding-top: 12px;
`;

const MetricValue = styled.div`
  color: ${s("text")};
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
`;

const MetricLabel = styled.div`
  color: ${s("textSecondary")};
  font-size: 13px;
  margin-top: 4px;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionHeader = styled.div`
  max-width: 720px;
`;

const SectionTitle = styled.h2`
  color: ${s("text")};
  font-size: 22px;
  font-weight: 650;
  line-height: 1.2;
  margin: 0 0 6px;
`;

const SectionText = styled.p`
  color: ${s("textSecondary")};
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
  background: ${s("background")};
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  min-height: 260px;
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
  background: ${s("backgroundSecondary")};
  border: 1px solid ${s("divider")};
  border-radius: 999px;
  color: ${s("textSecondary")};
  font-size: 12px;
  font-weight: 600;
  padding: 5px 8px;
`;

const CardMeta = styled.span`
  align-items: center;
  color: ${s("textSecondary")};
  display: inline-flex;
  font-size: 12px;
  gap: 4px;
  white-space: nowrap;
`;

const CardTitle = styled.h3`
  color: ${s("text")};
  font-size: 17px;
  font-weight: 650;
  line-height: 1.3;
  margin: 0 0 8px;
`;

const CardDescription = styled.p`
  color: ${s("textSecondary")};
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
  color: ${s("textSecondary")};
  display: inline-flex;
  font-size: 12px;
  font-weight: 600;
  gap: 5px;
`;

const CardAction = styled.a`
  align-items: center;
  background: ${s("text")};
  border-radius: 6px;
  color: ${s("background")};
  display: flex;
  font-size: 14px;
  font-weight: 600;
  height: 34px;
  justify-content: center;
  margin-top: 16px;
  text-decoration: none;

  &:hover {
    color: ${s("background")};
    opacity: 0.9;
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
  background: ${s("backgroundSecondary")};
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  display: flex;
  gap: 14px;
  padding: 16px;
`;

const TrackIcon = styled.div`
  align-items: center;
  background: ${s("background")};
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  color: ${s("accent")};
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
  color: ${s("text")};
  display: flex;
  flex-wrap: wrap;
  font-size: 15px;
  font-weight: 650;
  gap: 6px;
  margin: 0;

  &::after {
    background: ${s("accent")};
    border-radius: 999px;
    color: ${s("accentText")};
    content: "(Coming soon)";
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    padding: 4px 7px;
  }
`;

const TrackMeta = styled.div`
  color: ${s("accent")};
  font-size: 12px;
  font-weight: 650;
  margin-top: 2px;
`;

const TrackDescription = styled.p`
  color: ${s("textSecondary")};
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
  background: ${s("background")};
  border: 1px dashed ${s("divider")};
  border-radius: 8px;
  display: flex;
  gap: 14px;
  padding: 16px;
`;

const FutureIcon = styled.div`
  align-items: center;
  background: ${s("backgroundSecondary")};
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  color: ${s("accent")};
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
  color: ${s("text")};
  display: flex;
  flex-wrap: wrap;
  font-size: 15px;
  font-weight: 650;
  gap: 8px;
  margin: 0;
`;

const FutureBadge = styled.span`
  background: ${s("accent")};
  border-radius: 999px;
  color: ${s("accentText")};
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  padding: 4px 7px;
`;

const FutureDescription = styled.p`
  color: ${s("textSecondary")};
  font-size: 13px;
  line-height: 1.45;
  margin: 8px 0 0;
`;

const Roadmap = styled.div`
  border-top: 1px solid ${s("divider")};
  display: grid;
  gap: 10px;
  padding-top: 18px;
`;

const RoadmapItem = styled.div<{ $pending?: boolean }>`
  align-items: center;
  color: ${(props) =>
    props.$pending ? props.theme.textSecondary : props.theme.text};
  display: flex;
  font-size: 13px;
  gap: 8px;

  svg,
  > span:first-child {
    align-items: center;
    background: ${(props) =>
      props.$pending ? props.theme.backgroundSecondary : props.theme.accent};
    border: 1px solid
      ${(props) => (props.$pending ? props.theme.divider : "transparent")};
    border-radius: 999px;
    color: ${(props) =>
      props.$pending ? props.theme.textSecondary : props.theme.accentText};
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
