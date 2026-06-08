import { observer } from "mobx-react";
import { GraphIcon } from "outline-icons";
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Scene from "~/components/Scene";
import { client } from "~/utils/ApiClient";
import { underwritingCourse } from "./learningData";
import LearningHero from "./LearningHero";

type LearningStatus = "not_started" | "in_progress" | "completed" | "overdue";

type LearningReportRow = {
  badgeEarned: boolean;
  completedAt: string | null;
  completionSeconds: number | null;
  courseStartedAt: string | null;
  dueAt: string | null;
  lastActivityAt: string | null;
  learnerEmail: string | null;
  learnerId: string;
  learnerName: string;
  lessonsCompleted: number;
  progressPercent: number;
  quizAttemptCount: number;
  quizzesPassed: number;
  quizzesRequired: number;
  skillChecksCompleted: number;
  skillChecksRequired: number;
  status: LearningStatus;
};

type LeaderboardReporting = {
  generatedAt: string;
  rows: LearningReportRow[];
  summary: {
    averageProgress: number;
    badgesAwarded: number;
    completed: number;
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
  purple: "#6f3df4",
  mint: "#e9f8f1",
  coral: "#ffe8db",
  sky: "#e7f3ff",
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", "Courier New", monospace',
};

function LearningLeaderboard() {
  const [reporting, setReporting] = useState<LeaderboardReporting | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void client
      .post<{ data: LeaderboardReporting }>("/learning.reporting", {
        courseId: underwritingCourse.id,
        limit: 200,
        scope: "course",
      })
      .then((response) => {
        setReporting(response.data);
        setError("");
      })
      .catch(() => setError("Leaderboard is not available yet."));
  }, []);

  const leaderboard = useMemo(() => {
    const rows = reporting?.rows ?? [];

    return [...rows].sort((a, b) => {
      const aScore = leaderboardScore(a);
      const bScore = leaderboardScore(b);

      if (aScore !== bScore) {
        return bScore - aScore;
      }

      if (a.quizAttemptCount !== b.quizAttemptCount) {
        return a.quizAttemptCount - b.quizAttemptCount;
      }

      return a.learnerName.localeCompare(b.learnerName);
    });
  }, [reporting?.rows]);
  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <Scene
      icon={<GraphIcon />}
      title="Leaderboard"
      transparentHeaderUntilScrolled
      wide
    >
      <Page>
        <LearningHero
          current="leaderboard"
          eyebrow="Team leaderboard"
          title="Leaderboard"
        >
          See certification progress across the team, who is moving quickly, and
          where managers should coach judgment before live deals.
        </LearningHero>

        {error ? <Alert>{error}</Alert> : null}

        <MetricGrid>
          <MetricCard>
            <MetricValue>
              {reporting?.summary.averageProgress ?? 0}%
            </MetricValue>
            <MetricLabel>Average progress</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{reporting?.summary.completed ?? 0}</MetricValue>
            <MetricLabel>Certified reps</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{reporting?.summary.badgesAwarded ?? 0}</MetricValue>
            <MetricLabel>Badges awarded</MetricLabel>
          </MetricCard>
        </MetricGrid>

        <PodiumGrid>
          {topThree.map((row, index) => (
            <PodiumCard key={row.learnerId} $rank={index + 1}>
              <Rank>#{index + 1}</Rank>
              <LearnerName>{row.learnerName}</LearnerName>
              <ProgressLine>
                <strong>{row.progressPercent}%</strong>
                <span>
                  {row.status === "completed"
                    ? `${row.quizzesPassed}/${row.quizzesRequired} knowledge checks · ${row.quizAttemptCount} attempts`
                    : `${row.quizzesPassed}/${row.quizzesRequired} knowledge checks`}
                </span>
              </ProgressLine>
              <MiniTrack>
                <MiniFill style={{ width: `${row.progressPercent}%` }} />
              </MiniTrack>
              <BadgeState $earned={row.badgeEarned}>
                {row.badgeEarned ? "Certified" : statusLabel(row.status)}
              </BadgeState>
            </PodiumCard>
          ))}
        </PodiumGrid>

        <Panel>
          <PanelHeader>
            <PanelKicker>Team rank</PanelKicker>
            <PanelTitle>All learners</PanelTitle>
          </PanelHeader>
          <LeaderboardList>
            {rest.length ? (
              rest.map((row, index) => (
                <LeaderboardRow key={row.learnerId}>
                  <Rank>#{index + 4}</Rank>
                  <LearnerSummary>
                    <strong>{row.learnerName}</strong>
                    <span>
                      {row.status === "completed"
                        ? `${row.quizzesPassed}/${row.quizzesRequired} knowledge checks · ${row.quizAttemptCount} attempts`
                        : `${row.progressPercent}% complete · ${row.quizzesPassed}/${row.quizzesRequired} knowledge checks`}
                    </span>
                  </LearnerSummary>
                  <BadgeState $earned={row.badgeEarned}>
                    {row.badgeEarned ? "Certified" : statusLabel(row.status)}
                  </BadgeState>
                </LeaderboardRow>
              ))
            ) : (
              <EmptyState>
                More learners will appear here as assignments start.
              </EmptyState>
            )}
          </LeaderboardList>
        </Panel>
      </Page>
    </Scene>
  );
}

function leaderboardScore(row: LearningReportRow) {
  const certified = row.badgeEarned || row.status === "completed" ? 10000 : 0;
  const judgment = row.quizzesPassed * 850;
  const checks = row.skillChecksCompleted * 18;
  const progress = row.progressPercent * 4;
  const retryPenalty = row.quizAttemptCount * 12;

  return certified + judgment + checks + progress - retryPenalty;
}

function podiumRule(rank: number) {
  if (rank === 1) {
    return brand.blue;
  }

  if (rank === 2) {
    return "#19a767";
  }

  return brand.purple;
}

function podiumTint(rank: number) {
  if (rank === 1) {
    return "rgba(53, 76, 239, 0.08)";
  }

  if (rank === 2) {
    return "rgba(25, 167, 103, 0.08)";
  }

  return "rgba(111, 61, 244, 0.08)";
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
  background: ${brand.coral};
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  color: ${brand.ink};
  font-size: 13px;
  padding: 12px 14px;
`;

const MetricGrid = styled.section`
  display: grid;
  gap: 12px;

  ${breakpoint("tablet")`
    grid-template-columns: repeat(3, minmax(0, 1fr));
  `};
`;

const MetricCard = styled.article`
  background: linear-gradient(
    180deg,
    rgba(53, 76, 239, 0.07),
    ${brand.surface} 44%
  );
  border: 1px solid ${brand.rule};
  border-top: 4px solid ${brand.blue};
  border-radius: 8px;
  display: grid;
  gap: 6px;
  min-height: 86px;
  padding: 14px;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);
`;

const MetricValue = styled.div`
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
`;

const MetricLabel = styled.div`
  color: ${brand.muted};
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const PodiumGrid = styled.section`
  display: grid;
  gap: 12px;

  ${breakpoint("tablet")`
    grid-template-columns: repeat(3, minmax(0, 1fr));
  `};
`;

const PodiumCard = styled.article<{ $rank: number }>`
  background: ${(props) =>
    `linear-gradient(180deg, ${podiumTint(props.$rank)}, ${brand.surface} 46%)`};
  border: 1px solid ${brand.rule};
  border-top: 4px solid ${(props) => podiumRule(props.$rank)};
  border-radius: 8px;
  display: grid;
  gap: 12px;
  min-height: 210px;
  padding: 18px;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);
`;

const Rank = styled.div`
  align-items: center;
  background: ${brand.dark};
  border-radius: 999px;
  color: #fff;
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 900;
  height: 30px;
  justify-content: center;
  min-width: 42px;
  padding: 0 8px;
  width: max-content;
`;

const LearnerName = styled.h2`
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 24px;
  font-weight: 400;
  line-height: 1.12;
  margin: 0;
`;

const ProgressLine = styled.div`
  align-items: baseline;
  color: ${brand.muted};
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  strong {
    color: ${brand.ink};
    font-family: ${brand.mono};
    font-size: 22px;
  }

  span {
    font-size: 13px;
  }
`;

const MiniTrack = styled.div`
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid ${brand.rule};
  border-radius: 999px;
  height: 8px;
  overflow: hidden;
`;

const MiniFill = styled.div`
  background: ${brand.blue};
  height: 100%;
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

const LeaderboardList = styled.div`
  display: grid;
  gap: 8px;
`;

const LeaderboardRow = styled.div`
  align-items: center;
  background: ${brand.paper};
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  display: grid;
  gap: 10px;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  min-height: 62px;
  padding: 10px;
`;

const LearnerSummary = styled.div`
  display: grid;
  gap: 2px;
  min-width: 0;

  strong {
    color: ${brand.ink};
    font-family: ${brand.mono};
    font-size: 13px;
  }

  span {
    color: ${brand.muted};
    font-size: 13px;
    line-height: 1.35;
  }
`;

const BadgeState = styled.span<{ $earned: boolean }>`
  background: ${(props) => (props.$earned ? brand.mint : brand.lavender)};
  border: 1px solid ${brand.rule};
  border-radius: 999px;
  color: ${(props) => (props.$earned ? brand.ink : brand.blue)};
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 800;
  padding: 6px 8px;
  text-transform: uppercase;
  white-space: nowrap;
`;

const EmptyState = styled.div`
  background: ${brand.paper};
  border: 1px dashed ${brand.rule};
  border-radius: 8px;
  color: ${brand.muted};
  font-size: 13px;
  padding: 18px;
`;

export default observer(LearningLeaderboard);
