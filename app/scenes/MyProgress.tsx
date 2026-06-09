import { observer } from "mobx-react";
import { GraphIcon, GoToIcon } from "outline-icons";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Scene from "~/components/Scene";
import { client } from "~/utils/ApiClient";
import {
  underwritingLessonPath,
  underwritingTrainingPath,
} from "~/utils/routeHelpers";
import { underwritingCourse } from "./learningData";
import LearningHero from "./LearningHero";

type LearningStatus = "not_started" | "in_progress" | "completed" | "overdue";

type LearningReportRow = {
  learnerId: string;
  learnerName: string;
  learnerEmail: string | null;
  status: LearningStatus;
  progressPercent: number;
  dueAt: string | null;
  lessonsCompleted: number;
  skillChecksCompleted: number;
  skillChecksRequired: number;
  badgeEarned: boolean;
  lastActivityAt: string | null;
};

type LearningOverview = {
  assignment: LearningReportRow;
  badges: {
    badgeId: string;
    label: string;
    awardedAt: string;
  }[];
  course: {
    id: string;
    requiredLessonCount: number;
    title: string;
  };
};

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
  mint: "#e9f8f1",
  warningSurface: "#fff7e6",
  warningText: "#8a5a00",
  successSurface: "#e9f8f1",
  successText: "#26724d",
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", "Courier New", monospace',
};

type StatusTone = "accent" | "active" | "neutral" | "warning";

function MyProgress() {
  const [overview, setOverview] = useState<LearningOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    void client
      .post<{ data: LearningOverview }>("/learning.overview", {
        courseId: underwritingCourse.id,
      })
      .then((response) => {
        if (mounted) {
          setOverview(response.data);
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Progress reporting is not available yet.");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const assignment = overview?.assignment;
  const certified = Boolean(
    overview?.badges.some((badge) => badge.badgeId === "underwriting-certified")
  );
  const progress = assignment?.progressPercent ?? 0;
  const checksCompleted = assignment?.skillChecksCompleted ?? 0;
  const checksRequired = assignment?.skillChecksRequired ?? 24;

  return (
    <Scene
      icon={<GraphIcon />}
      title="My Progress"
      transparentHeaderUntilScrolled
      wide
    >
      <Page>
        <LearningHero
          current="my-progress"
          eyebrow="Personal certification status"
          title="My Progress"
        >
          Track your underwriting certification, knowledge checks, and next
          action before you position Dash.fi underwriting on live deals.
        </LearningHero>

        {error ? <Alert>{error}</Alert> : null}

        <ReadinessGrid aria-label="Personal progress summary">
          <ReadinessCard>
            <ReadinessValue>
              {certified ? "Certified" : "Pending"}
            </ReadinessValue>
            <ReadinessLabel>Certification</ReadinessLabel>
          </ReadinessCard>
          <ReadinessCard>
            <ReadinessValue>{progress}%</ReadinessValue>
            <ReadinessLabel>Certification progress</ReadinessLabel>
          </ReadinessCard>
          <ReadinessCard>
            <ReadinessValue>
              {checksCompleted}/{checksRequired}
            </ReadinessValue>
            <ReadinessLabel>Skill checks complete</ReadinessLabel>
          </ReadinessCard>
          <ReadinessCard>
            <ReadinessValue>{formatDate(assignment?.dueAt)}</ReadinessValue>
            <ReadinessLabel>Target date</ReadinessLabel>
          </ReadinessCard>
        </ReadinessGrid>

        <ProgressPanel>
          <PanelCopy>
            <PanelKicker>Current certification</PanelKicker>
            <PanelTitle>{underwritingCourse.title}</PanelTitle>
            <PanelMeta>
              <StatusPill $tone={statusTone(assignment?.status)}>
                {statusLabel(assignment?.status)}
              </StatusPill>
              <span>Due {formatDate(assignment?.dueAt)}</span>
              <span>{progress}% complete</span>
            </PanelMeta>
          </PanelCopy>
          <ProgressBlock>
            <ProgressTrack
              aria-label="Underwriting training progress"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progress}
              role="progressbar"
            >
              <ProgressFill style={{ width: `${progress}%` }} />
            </ProgressTrack>
            <ProgressMeta>
              <span>0%</span>
              <strong>{progress}% complete</strong>
              <span>100%</span>
            </ProgressMeta>
          </ProgressBlock>
          <ActionRow>
            <PrimaryAction as={Link} to={underwritingLessonPath(1, 1)}>
              <GoToIcon size={15} /> Continue certification
            </PrimaryAction>
            <SecondaryAction as={Link} to={underwritingTrainingPath()}>
              Certification map
            </SecondaryAction>
          </ActionRow>
        </ProgressPanel>

        <Panel>
          <PanelHeader>
            <PanelKicker>Assigned certifications</PanelKicker>
            <PanelTitle>Certification progress</PanelTitle>
          </PanelHeader>
          <ReportTableWrap>
            <ReportTable>
              <thead>
                <tr>
                  <th>Path</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Progress</th>
                  <th>Certification</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <CourseCell>
                      <strong>{underwritingCourse.title}</strong>
                      <span>Required AE certification</span>
                    </CourseCell>
                  </td>
                  <td>
                    <StatusPill $tone={statusTone(assignment?.status)}>
                      {statusLabel(assignment?.status)}
                    </StatusPill>
                  </td>
                  <td>{formatDate(assignment?.dueAt)}</td>
                  <td>
                    <ProgressCell>
                      <span>{progress}% complete</span>
                      <MiniTrack>
                        <MiniFill style={{ width: `${progress}%` }} />
                      </MiniTrack>
                    </ProgressCell>
                  </td>
                  <td>{certified ? "Certified" : "Pending"}</td>
                  <td>
                    <TableAction as={Link} to={underwritingLessonPath(1, 1)}>
                      Continue
                    </TableAction>
                  </td>
                </tr>
              </tbody>
            </ReportTable>
          </ReportTableWrap>
        </Panel>
      </Page>
    </Scene>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return "not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(status?: LearningStatus) {
  if (status === "completed") {
    return "Certified";
  }

  if (status === "in_progress") {
    return "In progress";
  }

  if (status === "overdue") {
    return "Overdue";
  }

  return "Not started";
}

function statusTone(status?: LearningStatus): StatusTone {
  if (status === "completed") {
    return "active";
  }

  if (status === "overdue") {
    return "warning";
  }

  if (status === "in_progress") {
    return "accent";
  }

  return "neutral";
}

const Page = styled.div`
  background: ${brand.paper};
  border-radius: 8px;
  display: grid;
  gap: 14px;
  margin: 0;
  min-width: 0;
  padding: 14px 16px 56px;

  ${breakpoint("tablet")`
    margin: -40px -28px 0;
    padding: 18px 28px 64px;
  `};
`;

const Alert = styled.div`
  background: ${brand.warningSurface};
  border: 1px solid #f5c77e;
  border-radius: 8px;
  color: ${brand.warningText};
  font-size: 13px;
  padding: 12px 14px;
`;

const ReadinessGrid = styled.section`
  display: grid;
  gap: 8px;

  ${breakpoint("tablet")`
    grid-template-columns: repeat(4, minmax(0, 1fr));
  `};
`;

const ReadinessCard = styled.article`
  background: linear-gradient(
    180deg,
    rgba(53, 76, 239, 0.07),
    ${brand.surface} 44%
  );
  border: 1px solid ${brand.rule};
  border-top: 4px solid ${brand.blue};
  border-radius: 8px;
  align-items: center;
  display: flex;
  gap: 9px;
  justify-content: center;
  min-height: unset;
  padding: 10px 12px;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);
  white-space: nowrap;
`;

const ReadinessValue = styled.div`
  color: ${brand.blue};
  font-family: ${brand.mono};
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
`;

const ReadinessLabel = styled.div`
  color: ${brand.muted};
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1;
  text-transform: uppercase;
`;

const ProgressPanel = styled.section`
  background:
    linear-gradient(135deg, rgba(53, 76, 239, 0.14), transparent 48%),
    ${brand.surface};
  border: 1px solid ${brand.rule};
  border-top: 4px solid ${brand.blue};
  border-radius: 8px;
  display: grid;
  gap: 14px;
  padding: 14px;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);

  ${breakpoint("tablet")`
    grid-template-columns: minmax(280px, 0.86fr) minmax(0, 1.14fr) auto;
    align-items: center;
  `};
`;

const Panel = styled.section`
  background: linear-gradient(
    180deg,
    rgba(53, 76, 239, 0.05),
    ${brand.surface} 38%
  );
  border: 1px solid ${brand.rule};
  border-top: 4px solid ${brand.blue};
  border-radius: 8px;
  display: grid;
  gap: 14px;
  min-width: 0;
  padding: 16px;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);
`;

const PanelHeader = styled.div`
  display: grid;
  gap: 4px;
`;

const PanelCopy = styled.div`
  min-width: 0;
`;

const PanelKicker = styled.div`
  color: ${brand.blue};
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const PanelTitle = styled.h2`
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
`;

const PanelMeta = styled.div`
  align-items: center;
  color: ${brand.muted};
  display: flex;
  flex-wrap: wrap;
  font-family: ${brand.mono};
  font-size: 12px;
  gap: 8px;
  margin-top: 10px;
`;

const StatusPill = styled.span<{ $tone?: StatusTone }>`
  background: ${(props) =>
    props.$tone === "accent"
      ? brand.lime
      : props.$tone === "warning"
        ? brand.warningSurface
        : props.$tone === "active"
          ? brand.successSurface
          : brand.surface};
  border: 1px solid
    ${(props) =>
      props.$tone === "accent"
        ? "transparent"
        : props.$tone === "warning"
          ? "#f5c77e"
          : props.$tone === "active"
            ? "#b8e0ca"
            : brand.rule};
  border-radius: 999px;
  color: ${(props) =>
    props.$tone === "accent"
      ? brand.dark
      : props.$tone === "warning"
        ? brand.warningText
        : props.$tone === "active"
          ? brand.successText
          : brand.muted};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  line-height: 1;
  padding: 6px 8px;
  text-transform: uppercase;
`;

const ProgressBlock = styled.div`
  display: grid;
  gap: 8px;
  min-width: 0;
`;

const ProgressTrack = styled.div`
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid ${brand.rule};
  border-radius: 999px;
  height: 12px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  background: ${brand.blue};
  height: 100%;
`;

const ProgressMeta = styled.div`
  color: ${brand.muted};
  display: flex;
  font-family: ${brand.mono};
  font-size: 11px;
  justify-content: space-between;

  strong {
    color: ${brand.ink};
  }
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const PrimaryAction = styled.a`
  align-items: center;
  background: ${brand.lime};
  border-radius: 6px;
  color: ${brand.dark};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 13px;
  font-weight: 800;
  gap: 6px;
  height: 38px;
  justify-content: center;
  letter-spacing: 0.04em;
  padding: 0 13px;
  text-decoration: none;
  text-transform: uppercase;
  white-space: nowrap;

  &:hover {
    color: ${brand.dark};
    opacity: 0.9;
    text-decoration: none;
  }
`;

const SecondaryAction = styled.a`
  align-items: center;
  background: ${brand.surface};
  border: 1px solid ${brand.rule};
  border-radius: 6px;
  color: ${brand.ink};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 13px;
  font-weight: 800;
  height: 38px;
  justify-content: center;
  letter-spacing: 0.04em;
  padding: 0 13px;
  text-decoration: none;
  text-transform: uppercase;
  white-space: nowrap;
`;

const ReportTableWrap = styled.div`
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  overflow-x: auto;
`;

const ReportTable = styled.table`
  background: ${brand.surface};
  border-collapse: collapse;
  min-width: 760px;
  width: 100%;

  th,
  td {
    border-bottom: 1px solid ${brand.rule};
    padding: 12px;
    text-align: left;
    vertical-align: top;
  }

  th {
    color: ${brand.muted};
    font-family: ${brand.mono};
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  td {
    color: ${brand.ink};
    font-size: 13px;
  }

  tr:last-child td {
    border-bottom: 0;
  }
`;

const ProgressCell = styled.div`
  display: grid;
  gap: 6px;
  min-width: 112px;
`;

const MiniTrack = styled.div`
  background: ${brand.paper};
  border: 1px solid ${brand.rule};
  border-radius: 999px;
  height: 8px;
  overflow: hidden;
`;

const MiniFill = styled.div`
  background: ${brand.blue};
  height: 100%;
`;

const CourseCell = styled.span`
  display: grid;
  gap: 2px;

  strong {
    color: ${brand.ink};
    font-family: ${brand.mono};
    font-size: 13px;
  }

  span {
    color: ${brand.muted};
    font-size: 13px;
  }
`;

const TableAction = styled.a`
  align-items: center;
  background: ${brand.dark};
  border-radius: 6px;
  color: #fff;
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 800;
  height: 32px;
  justify-content: center;
  padding: 0 10px;
  text-decoration: none;
  text-transform: uppercase;

  &:hover {
    color: #fff;
    opacity: 0.9;
    text-decoration: none;
  }
`;

export default observer(MyProgress);
