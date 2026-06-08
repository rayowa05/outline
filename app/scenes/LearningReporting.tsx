import { observer } from "mobx-react";
import { ClockIcon, GraphIcon } from "outline-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Scene from "~/components/Scene";
import { client } from "~/utils/ApiClient";
import { learningCourses, underwritingCourse } from "./learningData";
import LearningHero from "./LearningHero";

type LearningStatus = "not_started" | "in_progress" | "completed" | "overdue";
type CohortId = "all" | "january" | "february" | "march" | "none";
type ManagerId =
  | "all"
  | "chris_thurman"
  | "dave_bell"
  | "ken_boyle"
  | "clint_vice";

type LearningReportRow = {
  assignedAt: string;
  badgeEarned: boolean;
  completedAt: string | null;
  courseId: string;
  dueAt: string | null;
  lastActivityAt: string | null;
  learnerEmail: string | null;
  learnerId: string;
  learnerName: string;
  lessonsCompleted: number;
  progressPercent: number;
  quizAttemptCount: number;
  quizFailureCount: number;
  moduleQuizStats: {
    attemptCount: number;
    bestScorePercent: number;
    failureCount: number;
    lastAttemptAt: string | null;
    moduleNumber: number;
    passed: boolean;
    quizId: string;
  }[];
  quizzesPassed: number;
  quizzesRequired: number;
  skillChecksCompleted: number;
  skillChecksRequired: number;
  status: LearningStatus;
};

type LearningReporting = {
  generatedAt: string;
  rows: LearningReportRow[];
  source: "learning_assignments";
  status: "ready";
  summary: {
    assigned: number;
    notStarted: number;
    inProgress: number;
    completed: number;
    overdue: number;
    completionRate: number;
    averageProgress: number;
    badgesAwarded: number;
  };
  visibleScope: "team" | "self";
};

type SalesManager = {
  id: Exclude<ManagerId, "all">;
  name: string;
  shortName: string;
};

type SalesRep = {
  name: string;
  email: string;
  cohort: Exclude<CohortId, "all">;
  managerId: SalesManager["id"];
  team: "shipping" | "ecomm" | "vertical";
};

type SalesReportingRow = LearningReportRow &
  SalesRep & {
    managerName: string;
  };

const salesManagers: SalesManager[] = [
  { id: "chris_thurman", name: "Chris Thurman", shortName: "Chris T." },
  { id: "ken_boyle", name: "Ken Boyle", shortName: "Ken B." },
  { id: "clint_vice", name: "Clint Vice", shortName: "Clint V." },
  { id: "dave_bell", name: "Dave Bell", shortName: "Dave B." },
];

// Static launch roster mirrored from Repcon's REP_ROSTER. Departed reps are excluded.
const salesRoster: SalesRep[] = [
  {
    name: "Nick Erdman",
    email: "nick@dash.fi",
    cohort: "january",
    managerId: "chris_thurman",
    team: "shipping",
  },
  {
    name: "Azarre Henderson",
    email: "azarre@dash.fi",
    cohort: "january",
    managerId: "chris_thurman",
    team: "shipping",
  },
  {
    name: "Ciaran Lynch",
    email: "ciaran@dash.fi",
    cohort: "january",
    managerId: "ken_boyle",
    team: "ecomm",
  },
  {
    name: "Chris Nemeth",
    email: "chris@dash.fi",
    cohort: "january",
    managerId: "chris_thurman",
    team: "shipping",
  },
  {
    name: "Alex Wolf",
    email: "alex@dash.fi",
    cohort: "january",
    managerId: "dave_bell",
    team: "ecomm",
  },
  {
    name: "Mikal Safo",
    email: "mikal@dash.fi",
    cohort: "january",
    managerId: "ken_boyle",
    team: "ecomm",
  },
  {
    name: "Jake Panavas",
    email: "jake@dash.fi",
    cohort: "january",
    managerId: "chris_thurman",
    team: "shipping",
  },
  {
    name: "James Heflin",
    email: "james@dash.fi",
    cohort: "january",
    managerId: "chris_thurman",
    team: "shipping",
  },
  {
    name: "Daniel White",
    email: "daniel@dash.fi",
    cohort: "february",
    managerId: "ken_boyle",
    team: "ecomm",
  },
  {
    name: "Evan O'Reilly",
    email: "evan@dash.fi",
    cohort: "february",
    managerId: "ken_boyle",
    team: "ecomm",
  },
  {
    name: "Zachary Annis",
    email: "zach.annis@dash.fi",
    cohort: "february",
    managerId: "dave_bell",
    team: "ecomm",
  },
  {
    name: "Robbie Pierse",
    email: "robbie.pierse@dash.fi",
    cohort: "february",
    managerId: "ken_boyle",
    team: "ecomm",
  },
  {
    name: "Brandon Jacoba",
    email: "brandon.jacoba@dash.fi",
    cohort: "february",
    managerId: "dave_bell",
    team: "ecomm",
  },
  {
    name: "Austin Williams",
    email: "austin.williams@dash.fi",
    cohort: "february",
    managerId: "chris_thurman",
    team: "shipping",
  },
  {
    name: "Spencer Muhonen",
    email: "spencer@dash.fi",
    cohort: "march",
    managerId: "dave_bell",
    team: "ecomm",
  },
  {
    name: "Yosef Badawi",
    email: "yosef.badawi@dash.fi",
    cohort: "march",
    managerId: "ken_boyle",
    team: "ecomm",
  },
  {
    name: "Gabriel Pelino",
    email: "gabriel.pelino@dash.fi",
    cohort: "march",
    managerId: "chris_thurman",
    team: "shipping",
  },
  {
    name: "Mikala Dougherty",
    email: "mikala@dash.fi",
    cohort: "march",
    managerId: "chris_thurman",
    team: "shipping",
  },
  {
    name: "James Park",
    email: "jamesp@dash.fi",
    cohort: "march",
    managerId: "dave_bell",
    team: "ecomm",
  },
  {
    name: "Bill Shipley",
    email: "bill@dash.fi",
    cohort: "march",
    managerId: "chris_thurman",
    team: "shipping",
  },
  {
    name: "Brett Walker",
    email: "brettw@dash.fi",
    cohort: "march",
    managerId: "chris_thurman",
    team: "shipping",
  },
  {
    name: "Desiree Reece",
    email: "desireer@dash.fi",
    cohort: "march",
    managerId: "chris_thurman",
    team: "shipping",
  },
  {
    name: "Larry Heaton",
    email: "larry@dash.fi",
    cohort: "march",
    managerId: "clint_vice",
    team: "vertical",
  },
  {
    name: "Colleen Myers",
    email: "colleen@dash.fi",
    cohort: "march",
    managerId: "dave_bell",
    team: "ecomm",
  },
  {
    name: "Kurt Bell",
    email: "kurt@dash.fi",
    cohort: "none",
    managerId: "dave_bell",
    team: "ecomm",
  },
  {
    name: "Andy Murphy",
    email: "andy@dash.fi",
    cohort: "none",
    managerId: "dave_bell",
    team: "ecomm",
  },
  {
    name: "Dave Beddingfield",
    email: "dave@dash.fi",
    cohort: "none",
    managerId: "ken_boyle",
    team: "ecomm",
  },
  {
    name: "Cameron Baker",
    email: "cameron@dash.fi",
    cohort: "none",
    managerId: "dave_bell",
    team: "ecomm",
  },
  {
    name: "Tim Jonas",
    email: "tim@dash.fi",
    cohort: "none",
    managerId: "ken_boyle",
    team: "ecomm",
  },
  {
    name: "Clint Vice",
    email: "clint.vice@dash.fi",
    cohort: "none",
    managerId: "clint_vice",
    team: "vertical",
  },
  {
    name: "Heather Wilming",
    email: "heather@dash.fi",
    cohort: "none",
    managerId: "clint_vice",
    team: "vertical",
  },
  {
    name: "Stuart Cosgrove",
    email: "stuart@dash.fi",
    cohort: "none",
    managerId: "clint_vice",
    team: "vertical",
  },
  {
    name: "Josh Coffman",
    email: "josh@dash.fi",
    cohort: "none",
    managerId: "clint_vice",
    team: "vertical",
  },
];

const cohortOptions: { id: CohortId; label: string }[] = [
  { id: "all", label: "All cohorts" },
  { id: "january", label: "January 2026" },
  { id: "february", label: "February 2026" },
  { id: "march", label: "March 2026" },
  { id: "none", label: "Tenured" },
];

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
  warningSurface: "#fff7e6",
  warningText: "#8a5a00",
  dangerSurface: "#fff1ed",
  dangerText: "#9d2f1f",
  successSurface: "#e9f8f1",
  successText: "#26724d",
  mint: "#e9f8f1",
  coral: "#ffe8db",
  sky: "#e7f3ff",
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", "Courier New", monospace',
};

function LearningReporting() {
  const [reporting, setReporting] = useState<LearningReporting | null>(null);
  const [error, setError] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState(
    underwritingCourse.id
  );
  const [selectedManagerId, setSelectedManagerId] = useState<ManagerId>("all");
  const [selectedCohort, setSelectedCohort] = useState<CohortId>("all");

  const loadReporting = useCallback(async () => {
    const response = await client
      .post<{ data: LearningReporting }>("/learning.reporting", {
        courseId: underwritingCourse.id,
        limit: 200,
        scope: "course",
      })
      .catch(() => undefined);

    if (response?.data) {
      setReporting(response.data);
      setError("");
    } else {
      setError("Reporting is not available yet.");
    }
  }, []);

  useEffect(() => {
    void loadReporting();
  }, [loadReporting]);

  const salesRows = useMemo(
    () => buildSalesRows(reporting?.rows ?? []),
    [reporting?.rows]
  );
  const visibleRows = salesRows.filter(
    (row) =>
      (selectedManagerId === "all" || row.managerId === selectedManagerId) &&
      (selectedCohort === "all" || row.cohort === selectedCohort)
  );
  const summary = summarizeRows(visibleRows);
  const visibleManagers = salesManagers
    .filter(
      (manager) =>
        selectedManagerId === "all" || manager.id === selectedManagerId
    )
    .map((manager) => ({
      ...manager,
      rows: visibleRows.filter((row) => row.managerId === manager.id),
    }))
    .filter((manager) => manager.rows.length);

  return (
    <Scene
      icon={<GraphIcon />}
      title="Coaching Report"
      transparentHeaderUntilScrolled
      wide
    >
      <Page>
        <LearningHero
          current="reporting"
          eyebrow="Manager coaching dashboard"
          title="Coaching Report"
        >
          Track certification, retakes, overdue reps, and the coaching actions
          needed before underwriting conversations hit live deals.
        </LearningHero>

        {error ? <Alert>{error}</Alert> : null}

        <ControlPanel>
          <ControlField>
            <label htmlFor="learning-reporting-course">Course</label>
            <select
              id="learning-reporting-course"
              name="learning-reporting-course"
              onChange={(event) => setSelectedCourseId(event.target.value)}
              value={selectedCourseId}
            >
              <option value={underwritingCourse.id}>
                {underwritingCourse.title}
              </option>
              {learningCourses
                .filter((course) => course.id !== underwritingCourse.id)
                .map((course) => (
                  <option disabled key={course.id} value={course.id}>
                    {course.title} - coming soon
                  </option>
                ))}
            </select>
          </ControlField>
          <ControlField>
            <label htmlFor="learning-reporting-team">Sales leader</label>
            <select
              id="learning-reporting-team"
              name="learning-reporting-team"
              onChange={(event) =>
                setSelectedManagerId(event.target.value as ManagerId)
              }
              value={selectedManagerId}
            >
              <option value="all">All Sales leaders</option>
              {salesManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </ControlField>
          <ControlField>
            <label htmlFor="learning-reporting-cohort">Cohort</label>
            <select
              id="learning-reporting-cohort"
              name="learning-reporting-cohort"
              onChange={(event) =>
                setSelectedCohort(event.target.value as CohortId)
              }
              value={selectedCohort}
            >
              {cohortOptions.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.label}
                </option>
              ))}
            </select>
          </ControlField>
          <ControlMeta>
            <ClockIcon size={15} />
            Updated {formatDateTime(reporting?.generatedAt)}
          </ControlMeta>
          <ToolbarButton onClick={() => downloadCsv(visibleRows)}>
            Export CSV
          </ToolbarButton>
        </ControlPanel>

        <MetricGrid>
          <MetricCard>
            <MetricValue>{summary.assigned}</MetricValue>
            <MetricLabel>Assigned reps</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{summary.completionRate}%</MetricValue>
            <MetricLabel>Certification rate</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{summary.averageProgress}%</MetricValue>
            <MetricLabel>Avg progress</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{summary.badgesAwarded}</MetricValue>
            <MetricLabel>Badges awarded</MetricLabel>
          </MetricCard>
          <MetricCard $tone="warning">
            <MetricValue>{summary.overdue}</MetricValue>
            <MetricLabel>Needs follow-up</MetricLabel>
          </MetricCard>
          <MetricCard $tone="warning">
            <MetricValue>{summary.quizFailureCount}</MetricValue>
            <MetricLabel>Retakes</MetricLabel>
          </MetricCard>
        </MetricGrid>

        <Panel $accent="sky">
          <PanelHeader>
            <PanelKicker>Sales team</PanelKicker>
            <PanelTitle>Manager coaching view</PanelTitle>
          </PanelHeader>
          <ReportTableWrap>
            <ReportTable>
              <thead>
                <tr>
                  <th>Sales leader</th>
                  <th>Reps</th>
                  <th>Certified</th>
                  <th>In progress</th>
                  <th>Not started</th>
                  <th>Needs follow-up</th>
                  <th>Avg progress</th>
                </tr>
              </thead>
              <tbody>
                {visibleManagers.map((manager) => {
                  const managerSummary = summarizeRows(manager.rows);

                  return (
                    <tr key={manager.id}>
                      <td>
                        <TeamCell>
                          <strong>{manager.name}</strong>
                          <span>{managerFocus(manager.id)}</span>
                        </TeamCell>
                      </td>
                      <td>{managerSummary.assigned}</td>
                      <td>{managerSummary.completed}</td>
                      <td>{managerSummary.inProgress}</td>
                      <td>{managerSummary.notStarted}</td>
                      <td>
                        <StatusPill
                          $tone={managerSummary.overdue ? "warning" : "neutral"}
                        >
                          {managerSummary.overdue}
                        </StatusPill>
                      </td>
                      <td>
                        <ProgressCell>
                          <span>{managerSummary.averageProgress}%</span>
                          <MiniTrack>
                            <MiniFill
                              style={{
                                width: `${managerSummary.averageProgress}%`,
                              }}
                            />
                          </MiniTrack>
                        </ProgressCell>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </ReportTable>
          </ReportTableWrap>
        </Panel>

        <ReportsStack>
          {visibleManagers.map((manager, index) => (
            <Panel key={manager.id} $accent={panelAccent(index)}>
              <PanelHeader>
                <PanelKicker>{managerFocus(manager.id)}</PanelKicker>
                <PanelTitle>{manager.name}</PanelTitle>
              </PanelHeader>
              <ReportTableWrap>
                <ReportTable>
                  <thead>
                    <tr>
                      <th>Rep</th>
                      <th>Cohort</th>
                      <th>Segment</th>
                      <th>Status</th>
                      <th>Due</th>
                      <th>Progress</th>
                      <th>Checks</th>
                      <th>Retakes</th>
                      <th>Certification</th>
                      <th>Coaching action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manager.rows.map((row) => (
                      <tr key={row.email}>
                        <td>
                          <TeamCell>
                            <strong>{row.name}</strong>
                            <span>{row.email}</span>
                          </TeamCell>
                        </td>
                        <td>{cohortLabel(row.cohort)}</td>
                        <td>{segmentLabel(row.team)}</td>
                        <td>
                          <StatusPill
                            $tone={
                              row.status === "overdue" ? "warning" : "neutral"
                            }
                          >
                            {statusLabel(row.status)}
                          </StatusPill>
                        </td>
                        <td>{formatDate(row.dueAt)}</td>
                        <td>
                          <ProgressCell>
                            <span>{row.progressPercent}% complete</span>
                            <MiniTrack>
                              <MiniFill
                                style={{ width: `${row.progressPercent}%` }}
                              />
                            </MiniTrack>
                          </ProgressCell>
                        </td>
                        <td>
                          {row.skillChecksCompleted}/{row.skillChecksRequired}
                        </td>
                        <td>
                          <QuizRetryCell>
                            <strong>{row.quizFailureCount}</strong>
                            <span>{formatQuizStats(row.moduleQuizStats)}</span>
                          </QuizRetryCell>
                        </td>
                        <td>{row.badgeEarned ? "Certified" : "Pending"}</td>
                        <td>{coachingAction(row)}</td>
                      </tr>
                    ))}
                  </tbody>
                </ReportTable>
              </ReportTableWrap>
            </Panel>
          ))}
        </ReportsStack>
      </Page>
    </Scene>
  );
}

function buildSalesRows(rows: LearningReportRow[]): SalesReportingRow[] {
  const liveRowsByEmail = new Map(
    rows
      .filter((row) => row.learnerEmail)
      .map((row) => [row.learnerEmail?.toLowerCase(), row] as const)
  );

  return salesRoster.map((rep) => {
    const liveRow = liveRowsByEmail.get(rep.email.toLowerCase());
    const manager = salesManagers.find((item) => item.id === rep.managerId);

    return {
      assignedAt: liveRow?.assignedAt ?? "",
      badgeEarned: liveRow?.badgeEarned ?? false,
      cohort: rep.cohort,
      completedAt: liveRow?.completedAt ?? null,
      courseId: liveRow?.courseId ?? underwritingCourse.id,
      dueAt: liveRow?.dueAt ?? null,
      email: rep.email,
      lastActivityAt: liveRow?.lastActivityAt ?? null,
      learnerEmail: rep.email,
      learnerId: liveRow?.learnerId ?? `repcon-${rep.email}`,
      learnerName: rep.name,
      lessonsCompleted: liveRow?.lessonsCompleted ?? 0,
      managerId: rep.managerId,
      managerName: manager?.name ?? rep.managerId,
      name: rep.name,
      progressPercent: liveRow?.progressPercent ?? 0,
      quizAttemptCount: liveRow?.quizAttemptCount ?? 0,
      quizFailureCount: liveRow?.quizFailureCount ?? 0,
      moduleQuizStats: liveRow?.moduleQuizStats ?? [],
      quizzesPassed: liveRow?.quizzesPassed ?? 0,
      quizzesRequired: liveRow?.quizzesRequired ?? 2,
      skillChecksCompleted: liveRow?.skillChecksCompleted ?? 0,
      skillChecksRequired: liveRow?.skillChecksRequired ?? 24,
      status: liveRow?.status ?? "not_started",
      team: rep.team,
    };
  });
}

function summarizeRows(rows: LearningReportRow[]) {
  const assigned = rows.length;
  const completed = rows.filter((row) => row.status === "completed").length;
  const notStarted = rows.filter((row) => row.status === "not_started").length;
  const inProgress = rows.filter((row) => row.status === "in_progress").length;
  const overdue = rows.filter((row) => row.status === "overdue").length;
  const averageProgress = assigned
    ? Math.round(
        rows.reduce((total, row) => total + row.progressPercent, 0) / assigned
      )
    : 0;

  return {
    assigned,
    averageProgress,
    badgesAwarded: rows.filter((row) => row.badgeEarned).length,
    completed,
    completionRate: assigned ? Math.round((completed / assigned) * 100) : 0,
    inProgress,
    notStarted,
    overdue,
    quizFailureCount: rows.reduce(
      (total, row) => total + (row.quizFailureCount ?? 0),
      0
    ),
  };
}

function downloadCsv(rows: SalesReportingRow[]) {
  const header = [
    "Learner",
    "Email",
    "Leader",
    "Cohort",
    "Segment",
    "Status",
    "Due",
    "Progress",
    "Field drills",
    "Checks",
    "Judgment attempts",
    "Retakes",
    "Judgment detail",
    "Certification",
    "Coaching action",
    "Last activity",
  ];
  const csvRows = rows.map((row) => [
    row.name,
    row.email,
    row.managerName,
    cohortLabel(row.cohort),
    segmentLabel(row.team),
    statusLabel(row.status),
    formatDate(row.dueAt),
    `${row.progressPercent}%`,
    `${row.lessonsCompleted}/13`,
    `${row.skillChecksCompleted}/${row.skillChecksRequired}`,
    String(row.quizAttemptCount),
    String(row.quizFailureCount),
    formatQuizStats(row.moduleQuizStats),
    row.badgeEarned ? "Certified" : "Pending",
    coachingAction(row),
    formatDate(row.lastActivityAt),
  ]);
  const csv = [header, ...csvRows]
    .map((cells) => cells.map(escapeCsvCell).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "underwriting-coaching-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
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

function formatDateTime(value?: string | null) {
  if (!value) {
    return "loading";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatQuizStats(stats: LearningReportRow["moduleQuizStats"]) {
  if (!stats.length) {
    return "No attempts";
  }

  return stats
    .sort((left, right) => left.moduleNumber - right.moduleNumber)
    .map(
      (quiz) =>
        `M${quiz.moduleNumber}: ${quiz.failureCount} failed / ${quiz.attemptCount} attempts`
    )
    .join("; ");
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

function coachingAction(row: LearningReportRow) {
  if (row.status === "overdue") {
    return "Follow up today";
  }

  if (row.quizFailureCount > 0) {
    return "Coach knowledge check";
  }

  if (row.skillChecksCompleted < row.skillChecksRequired) {
    return "Review field drills";
  }

  if (!row.badgeEarned) {
    return "Push certification";
  }

  return "Certified";
}

function cohortLabel(cohort: SalesRep["cohort"]) {
  if (cohort === "january") {
    return "January 2026";
  }

  if (cohort === "february") {
    return "February 2026";
  }

  if (cohort === "march") {
    return "March 2026";
  }

  return "Tenured";
}

function segmentLabel(team: SalesRep["team"]) {
  if (team === "shipping") {
    return "Shipping";
  }

  if (team === "vertical") {
    return "Vertical";
  }

  return "Ecomm";
}

function managerFocus(managerId: SalesManager["id"]) {
  if (managerId === "chris_thurman") {
    return "Shipping";
  }

  if (managerId === "clint_vice") {
    return "Verticals";
  }

  return "Ecomm";
}

function panelAccent(index: number) {
  return ["mint", "coral", "sky", "surface"][index % 4];
}

function panelRule(accent?: string) {
  if (accent === "mint") {
    return "#19a767";
  }

  if (accent === "coral") {
    return brand.purple;
  }

  return brand.blue;
}

function panelTint(accent?: string) {
  if (accent === "mint") {
    return "rgba(25, 167, 103, 0.08)";
  }

  if (accent === "coral") {
    return "rgba(111, 61, 244, 0.08)";
  }

  return "rgba(53, 76, 239, 0.08)";
}

const Page = styled.div`
  background: ${brand.paper};
  border-radius: 8px;
  display: grid;
  gap: 14px;
  margin: 0;
  min-width: 0;
  overflow-x: hidden;
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

const ControlPanel = styled.section`
  align-items: end;
  background: linear-gradient(
    180deg,
    rgba(53, 76, 239, 0.05),
    ${brand.surface} 42%
  );
  border: 1px solid ${brand.rule};
  border-top: 4px solid ${brand.blue};
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);
`;

const ControlField = styled.div`
  display: grid;
  gap: 5px;
  min-width: min(236px, 100%);

  label {
    color: ${brand.muted};
    font-family: ${brand.mono};
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  select {
    background: ${brand.paper};
    border: 1px solid ${brand.rule};
    border-radius: 6px;
    color: ${brand.ink};
    font-size: 14px;
    height: 38px;
    padding: 0 11px;
  }
`;

const ControlMeta = styled.div`
  align-items: center;
  color: ${brand.muted};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 800;
  gap: 7px;
  height: 38px;
  text-transform: uppercase;
`;

const ToolbarButton = styled.button`
  background: ${brand.dark};
  border: 1px solid ${brand.dark};
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  height: 38px;
  padding: 0 12px;
`;

const MetricGrid = styled.section`
  display: grid;
  gap: 10px;

  ${breakpoint("tablet")`
    grid-template-columns: repeat(5, minmax(0, 1fr));
  `};
`;

const MetricCard = styled.article<{ $tone?: "warning" }>`
  background: ${(props) =>
    props.$tone === "warning"
      ? `linear-gradient(180deg, rgba(245, 199, 126, 0.18), ${brand.surface} 44%)`
      : `linear-gradient(180deg, rgba(53, 76, 239, 0.07), ${brand.surface} 44%)`};
  border: 1px solid
    ${(props) => (props.$tone === "warning" ? "#f5c77e" : brand.rule)};
  border-top: 4px solid
    ${(props) => (props.$tone === "warning" ? "#f5c77e" : brand.blue)};
  border-radius: 8px;
  display: grid;
  gap: 6px;
  min-height: 92px;
  padding: 14px;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);
`;

const MetricValue = styled.div`
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 25px;
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

const ReportsStack = styled.div`
  display: grid;
  gap: 12px;
`;

const Panel = styled.section<{ $accent?: string }>`
  background: ${(props) =>
    `linear-gradient(180deg, ${panelTint(props.$accent)}, ${brand.surface} 40%)`};
  border: 1px solid ${brand.rule};
  border-top: 4px solid ${(props) => panelRule(props.$accent)};
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

const ReportTableWrap = styled.div`
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  overflow-x: auto;
`;

const ReportTable = styled.table`
  background: rgba(255, 252, 245, 0.86);
  border-collapse: collapse;
  min-width: 880px;
  width: 100%;

  th,
  td {
    border-bottom: 1px solid ${brand.rule};
    padding: 12px;
    text-align: left;
    vertical-align: middle;
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

const TeamCell = styled.span`
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

const QuizRetryCell = styled.span`
  display: grid;
  gap: 2px;
  min-width: 160px;

  strong {
    color: ${brand.ink};
    font-family: ${brand.mono};
    font-size: 13px;
  }

  span {
    color: ${brand.muted};
    font-size: 12px;
    line-height: 1.3;
  }
`;

const StatusPill = styled.span<{ $tone?: "neutral" | "warning" }>`
  background: ${(props) =>
    props.$tone === "warning" ? brand.dangerSurface : brand.paper};
  border: 1px solid
    ${(props) => (props.$tone === "warning" ? "#efb0a4" : brand.rule)};
  border-radius: 999px;
  color: ${(props) =>
    props.$tone === "warning" ? brand.dangerText : brand.muted};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  padding: 6px 8px;
  text-transform: uppercase;
  white-space: nowrap;
`;

const ProgressCell = styled.div`
  display: grid;
  gap: 6px;
  min-width: 96px;
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

export default observer(LearningReporting);
