import { observer } from "mobx-react";
import {
  AcademicCapIcon,
  ClockIcon,
  PadlockIcon,
  SparklesIcon,
  TargetIcon,
} from "outline-icons";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Scene from "~/components/Scene";
import {
  learningCourses,
  type LessonStatus,
  type LearningModule,
  type ModuleStatus,
} from "./learningData";
import LearningHero from "./LearningHero";
import {
  underwritingLessonPath,
  underwritingQuizPath,
} from "~/utils/routeHelpers";
import { client } from "~/utils/ApiClient";

const moduleSectionPrefix = "#module-";
const brand = {
  paper: "#f7f5ef",
  surface: "#fffcf5",
  rule: "#dedad1",
  ink: "#20302d",
  muted: "#777a73",
  dark: "#1c2018",
  blue: "#354cef",
  lime: "#edff3d",
  lavender: "#ececff",
  purple: "#6f3df4",
  mint: "#e9f8f1",
  coral: "#ffe8db",
  sky: "#e7f3ff",
  darkSoft: "#25283a",
  sans: "-apple-system, BlinkMacSystemFont, Inter, 'Segoe UI', Roboto, Oxygen, sans-serif",
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", "Courier New", monospace',
};

type ModuleState =
  | "locked"
  | "notStarted"
  | "inProgress"
  | "completed"
  | "comingSoon"
  | "designing";

type StatusTone = "accent" | "active" | "neutral" | "muted" | "warning";

type ModuleGate = {
  locked: boolean;
  lockedReason: string | null;
  moduleNumber: number;
  quizPassed: boolean;
  requiredQuizId: string | null;
};

const moduleStates: Record<
  ModuleState,
  {
    label: string;
    action: string;
    tone: StatusTone;
    disabled?: boolean;
  }
> = {
  locked: {
    label: "Locked",
    action: "Pass prior knowledge check",
    tone: "muted",
    disabled: true,
  },
  notStarted: {
    label: "Ready",
    action: "Start stage",
    tone: "neutral",
  },
  inProgress: {
    label: "In progress",
    action: "Continue certification",
    tone: "active",
  },
  completed: {
    label: "Certified",
    action: "Review drills",
    tone: "accent",
  },
  comingSoon: {
    label: "Coming soon",
    action: "Coming soon",
    tone: "muted",
    disabled: true,
  },
  designing: {
    label: "Preparing",
    action: "Preview",
    tone: "warning",
  },
};

const moduleStatus: Record<
  ModuleStatus,
  {
    label: string;
    action: string;
    tone: StatusTone;
    state: ModuleState;
  }
> = {
  active: {
    label: "Ready",
    action: "Start stage",
    tone: "neutral",
    state: "notStarted",
  },
  locked: {
    label: "Locked",
    action: "Pass Module One",
    tone: "muted",
    state: "locked",
  },
  assetReady: {
    label: "Ready",
    action: "Start workflow",
    tone: "neutral",
    state: "notStarted",
  },
};

const lessonStatus: Record<
  LessonStatus,
  {
    label: string;
    tone: StatusTone;
  }
> = {
  ready: {
    label: "Ready",
    tone: "neutral",
  },
  locked: {
    label: "Locked",
    tone: "muted",
  },
  assetReady: {
    label: "Ready",
    tone: "neutral",
  },
  pending: {
    label: "Pending",
    tone: "neutral",
  },
};

function UnderwritingTraining() {
  const underwriting = learningCourses.find(
    (course) => course.id === "underwriting-training"
  );
  const [gates, setGates] = useState<ModuleGate[]>([]);

  useEffect(() => {
    void client
      .post<{ data?: { gates?: ModuleGate[] }; gates?: ModuleGate[] }>(
        "/learning.overview",
        {
          courseId: "underwriting-training",
        }
      )
      .then((response) => {
        const nextGates = response.data?.gates ?? response.gates ?? [];

        setGates(Array.isArray(nextGates) ? nextGates : []);
      })
      .catch(() => setGates([]));
  }, []);

  if (!underwriting) {
    return null;
  }

  return (
    <Scene
      icon={<AcademicCapIcon />}
      title="Certification Map"
      transparentHeaderUntilScrolled
      wide
    >
      <Page>
        <LearningHero
          current="module-map"
          eyebrow={underwriting.eyebrow}
          title={underwriting.title}
        >
          {underwriting.description}
        </LearningHero>
        <ModuleGrid>
          {underwriting.modules.map((module) => (
            <UnderwritingModuleCard
              key={module.title}
              module={module}
              anchorId={`${moduleSectionPrefix}${module.number}`}
              gate={(gates ?? []).find(
                (item) => item.moduleNumber === module.number
              )}
            />
          ))}
        </ModuleGrid>
      </Page>
    </Scene>
  );
}

function UnderwritingModuleCard({
  module,
  anchorId,
  gate,
}: {
  module: LearningModule;
  anchorId: string;
  gate?: ModuleGate;
}) {
  const status = moduleStatus[module.status];
  const isLocked = module.status === "locked" || Boolean(gate?.locked);
  const state = moduleStates[isLocked ? "locked" : status.state];
  const moduleStartPath = underwritingLessonPath(module.number, 1);
  const accent = moduleAccent(module.number);
  const documentReviewCount = module.lessons.filter(
    (lesson) => lesson.kind === "document"
  ).length;
  const drillCount = module.lessons.length - documentReviewCount;
  const hasOnlyDocumentReview =
    documentReviewCount > 0 && documentReviewCount === module.lessons.length;
  const moduleAction = hasOnlyDocumentReview ? "Review job aid" : status.action;
  const lessonCountLabel =
    documentReviewCount > 0 && drillCount > 0
      ? `${drillCount} field drills + ${documentReviewCount} job aid`
      : hasOnlyDocumentReview
        ? `${module.lessonCount} required review`
        : `${module.lessonCount} field drills`;

  return (
    <ModuleCard
      id={anchorId}
      data-learning-module-card={module.number}
      $accent={accent}
      $locked={isLocked}
    >
      <ModuleHeader data-learning-section="module-header">
        <CardTopline data-learning-section="module-meta">
          <Chip>Stage {module.number}</Chip>
          <DurationBox aria-label={`Module ${module.number} duration`}>
            <ClockIcon size={13} />
            <DurationValue>{module.duration}</DurationValue>
          </DurationBox>
        </CardTopline>
        <CardTitle data-learning-section="module-title">
          {module.title}
        </CardTitle>
        <ModuleSubtitle data-learning-section="module-subtitle">
          {module.subtitle}
        </ModuleSubtitle>
        <CardDescription>{module.summary}</CardDescription>
        <CardFooter data-learning-section="lesson-count">
          <Outcome>
            <TargetIcon size={14} /> {lessonCountLabel}
          </Outcome>
          <StatusPill $tone={isLocked ? "muted" : status.tone}>
            {isLocked ? "Locked" : status.label}
          </StatusPill>
        </CardFooter>
        <ProgressWrap data-learning-section="module-progress">
          <ProgressMeta>
            <span>Progress</span>
            <span>{module.completion}%</span>
          </ProgressMeta>
          <ProgressTrack
            aria-label={`${module.title} progress`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={module.completion}
            role="progressbar"
          >
            <ProgressFill $tone={state.tone} $value={module.completion} />
          </ProgressTrack>
        </ProgressWrap>
      </ModuleHeader>
      <LessonGrid aria-label={`${module.title} field drills`}>
        {module.lessons.map((lesson) => {
          const lessonState = lessonStatus[lesson.status];
          const lessonHref =
            lesson.kind === "quiz"
              ? underwritingQuizPath(module.number)
              : underwritingLessonPath(module.number, lesson.number);
          const isLessonLocked = isLocked || lesson.status === "locked";

          return (
            <LessonTile
              key={lesson.title}
              as={isLessonLocked ? "div" : Link}
              $locked={isLessonLocked}
              {...(!isLessonLocked ? { to: lessonHref } : undefined)}
            >
              <LessonNumber>{lesson.number}</LessonNumber>
              <LessonCopy>
                <LessonTitle>{lesson.title}</LessonTitle>
                <LessonMeta>
                  {lesson.kind === "quiz"
                    ? "Knowledge check"
                    : lesson.kind === "document"
                      ? "Job aid review"
                      : lesson.duration}
                </LessonMeta>
                {lesson.note ? <LessonNote>{lesson.note}</LessonNote> : null}
              </LessonCopy>
              {isLessonLocked ? (
                <StatusPill $tone={lessonState.tone}>
                  {lessonState.label}
                </StatusPill>
              ) : null}
            </LessonTile>
          );
        })}
      </LessonGrid>
      {isLocked ? (
        <CardAction as="span" $disabled>
          <PadlockIcon size={14} />{" "}
          {formatLockedReason(gate?.lockedReason ?? status.action)}
        </CardAction>
      ) : (
        <CardAction as={Link} to={moduleStartPath}>
          <SparklesIcon size={14} /> {moduleAction}
        </CardAction>
      )}
    </ModuleCard>
  );
}

function moduleAccent(moduleNumber: number) {
  return ["sky", "mint", "coral"][(moduleNumber - 1) % 3];
}

function moduleRule(accent: string) {
  if (accent === "sky") {
    return brand.blue;
  }

  if (accent === "mint") {
    return "#19a767";
  }

  return brand.purple;
}

function moduleTint(accent: string) {
  if (accent === "sky") {
    return "rgba(53, 76, 239, 0.08)";
  }

  if (accent === "mint") {
    return "rgba(25, 167, 103, 0.08)";
  }

  return "rgba(111, 61, 244, 0.08)";
}

function formatLockedReason(value: string) {
  return value.replace(/module\s+(\d+)\s+quiz/gi, "module $1 knowledge check");
}

const Page = styled.div`
  background: ${brand.paper};
  border-radius: 8px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
  min-width: 0;
  overflow-x: hidden;
  padding: 14px 16px 28px;
  width: 100%;

  ${breakpoint("tablet")`
    margin: -40px -28px 0;
    padding: 18px 28px 32px;
  `};
`;

const ModuleGrid = styled.div`
  display: grid;
  align-items: stretch;
  gap: 14px;
  min-height: 0;
  min-width: 0;
  width: 100%;

  ${breakpoint("tablet")`
    grid-template-columns: repeat(2, minmax(0, 1fr));
  `};

  ${breakpoint("desktop")`
    grid-template-columns: repeat(3, minmax(0, 1fr));
  `};
`;

const ModuleCard = styled.article<{ $accent: string; $locked?: boolean }>`
  background: ${(props) =>
    props.$locked
      ? "#f0eee7"
      : `linear-gradient(180deg, ${moduleTint(props.$accent)} 0%, ${brand.surface} 38%)`};
  border: 1px solid ${brand.rule};
  border-top: 4px solid ${(props) => moduleRule(props.$accent)};
  border-radius: 8px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  padding: 16px;
  position: relative;
  overflow: visible;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);
`;

const ModuleHeader = styled.div`
  display: grid;
  gap: 11px;
  min-height: 176px;
`;

const CardTopline = styled.div`
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  min-width: 0;
`;

const Chip = styled.span`
  align-items: center;
  background: ${brand.lavender};
  border: 1px solid rgba(53, 76, 239, 0.16);
  border-radius: 999px;
  color: ${brand.blue};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 800;
  height: 30px;
  justify-content: center;
  letter-spacing: 0.08em;
  padding: 0 12px;
  text-transform: uppercase;
  white-space: nowrap;
`;

const DurationBox = styled.div`
  align-items: center;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid ${brand.rule};
  border-radius: 999px;
  color: ${brand.ink};
  display: inline-flex;
  font-family: ${brand.mono};
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  white-space: nowrap;
`;

const DurationValue = styled.strong`
  color: ${brand.ink};
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
`;

const CardTitle = styled.h3`
  align-self: start;
  color: ${brand.ink};
  font-family: ${brand.sans};
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.08;
  margin: 0;
  max-width: 100%;
  text-transform: capitalize;
`;

const ModuleSubtitle = styled.p`
  align-self: start;
  color: ${brand.muted};
  font-family: ${brand.sans};
  font-size: 14px;
  line-height: 1.35;
  margin: 0;
`;

const CardDescription = styled.p`
  color: ${brand.ink};
  font-size: 14px;
  line-height: 1.45;
  margin: 0 0 12px;
  display: none;
`;

const CardFooter = styled.footer`
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  min-width: 0;
`;

const Outcome = styled.div`
  align-items: center;
  color: ${brand.muted};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 800;
  gap: 6px;
  text-transform: uppercase;
`;

const ProgressMeta = styled.div`
  color: ${brand.muted};
  display: flex;
  font-family: ${brand.mono};
  font-size: 11px;
  justify-content: space-between;
  margin-bottom: 6px;
`;

const ProgressWrap = styled.div`
  align-self: start;
  width: 100%;
`;

const ProgressTrack = styled.div`
  background: #f2efe6;
  border: 1px solid ${brand.rule};
  border-radius: 999px;
  height: 8px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{
  $tone: StatusTone;
  $value: number;
}>`
  background: ${(props) =>
    props.$tone === "accent"
      ? brand.lime
      : props.$tone === "warning"
        ? "#f5c77e"
        : props.$tone === "active"
          ? brand.blue
          : brand.blue};
  height: 100%;
  width: ${(props) => `${props.$value}%`};
`;

const LessonGrid = styled.div`
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr;
  margin-top: 8px;
  min-height: 0;
  overflow: visible;
`;

const LessonTile = styled.article<{ $locked?: boolean }>`
  align-items: center;
  background: ${(props) =>
    props.$locked
      ? "rgba(255, 255, 255, 0.64)"
      : `linear-gradient(180deg, rgba(53, 76, 239, 0.045) 0%, rgba(255, 255, 255, 0.82) 34%)`};
  border: 1px solid ${(props) => (props.$locked ? "#d3d1c9" : brand.rule)};
  border-top: 3px solid
    ${(props) => (props.$locked ? "#c8c4bb" : "rgba(53, 76, 239, 0.72)")};
  border-radius: 8px;
  box-shadow: 0 8px 18px rgba(28, 32, 24, 0.035);
  display: grid;
  gap: 8px;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  min-height: 58px;
  opacity: ${(props) => (props.$locked ? 0.72 : 1)};
  padding: 9px 10px;
  text-decoration: none;

  &:hover {
    border-color: ${(props) =>
      props.$locked ? "#d3d1c9" : "rgba(53, 76, 239, 0.28)"};
    text-decoration: none;
  }
`;

const LessonNumber = styled.div`
  align-items: center;
  background: ${brand.surface};
  border: 1px solid ${brand.rule};
  border-radius: 999px;
  color: ${brand.blue};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 800;
  height: 24px;
  justify-content: center;
  width: 24px;
`;

const LessonCopy = styled.div`
  min-width: 0;
`;

const LessonTitle = styled.div`
  color: ${brand.ink};
  display: -webkit-box;
  font-family: ${brand.sans};
  font-size: 14px;
  font-weight: 760;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-height: 1.18;
  margin-bottom: 2px;
  overflow: hidden;
`;

const LessonMeta = styled.div`
  color: ${brand.muted};
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
`;

const LessonNote = styled.div`
  color: ${brand.darkSoft};
  font-size: 12px;
  line-height: 1.4;
  margin-top: 4px;
  display: none;
`;

const CardAction = styled.a<{ $disabled?: boolean }>`
  align-items: center;
  align-self: stretch;
  background: ${(props) => (props.$disabled ? "#dbd9d1" : brand.blue)};
  border: 1px solid ${(props) => (props.$disabled ? "#c8c4bb" : "transparent")};
  border-radius: 7px;
  color: ${(props) => (props.$disabled ? brand.muted : "#fff")};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  gap: 6px;
  line-height: 1.22;
  min-height: 36px;
  justify-content: center;
  margin-top: auto;
  padding: 8px 13px;
  text-align: center;
  text-decoration: none;
  text-transform: uppercase;
  white-space: normal;
  word-break: normal;

  &:hover {
    color: ${(props) => (props.$disabled ? brand.muted : "#fff")};
    opacity: ${(props) => (props.$disabled ? 1 : 0.9)};
    text-decoration: none;
  }
`;

const StatusPill = styled.span<{ $tone?: StatusTone }>`
  background: ${(props) =>
    props.$tone === "accent"
      ? brand.lime
      : props.$tone === "warning"
        ? "#f5c77e"
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
          ? "#8a5a00"
          : props.$tone === "muted"
            ? brand.blue
            : brand.muted};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  line-height: 1;
  padding: 5px 8px;
  text-transform: uppercase;
  white-space: nowrap;
`;

export default observer(UnderwritingTraining);
