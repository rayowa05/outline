import {
  AcademicCapIcon,
  GraphIcon,
  GoToIcon,
  TargetIcon,
} from "outline-icons";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import {
  learningLeaderboardPath,
  learningMyProgressPath,
  learningPath,
  learningReportingPath,
  underwritingTrainingPath,
} from "~/utils/routeHelpers";

type LearningNavItem =
  | "learning-hub"
  | "my-progress"
  | "leaderboard"
  | "reporting"
  | "module-map";

type Props = {
  current: LearningNavItem;
};

const navHelpStorageKey = "dashfi.learning.navigation.help.dismissed";

const navItems: {
  description: string;
  id: LearningNavItem;
  label: string;
  path: string;
  icon: ComponentType<{ size?: number }>;
}[] = [
  {
    description: "Start here for assigned courses and Learning Hub priorities.",
    icon: AcademicCapIcon,
    id: "learning-hub",
    label: "DashFi Learning Hub",
    path: learningPath(),
  },
  {
    description: "See your course status, module progress, and next action.",
    icon: TargetIcon,
    id: "my-progress",
    label: "My Progress",
    path: learningMyProgressPath(),
  },
  {
    description: "Compare course completion and quiz performance across the team.",
    icon: GraphIcon,
    id: "leaderboard",
    label: "Leaderboard",
    path: learningLeaderboardPath(),
  },
  {
    description: "Review coaching signals, quiz attempts, and follow-up needs.",
    icon: GraphIcon,
    id: "reporting",
    label: "Coaching Report",
    path: learningReportingPath(),
  },
  {
    description: "Return to the underwriting module map and lesson sequence.",
    icon: GoToIcon,
    id: "module-map",
    label: "Certification Map",
    path: underwritingTrainingPath(),
  },
];

export default function LearningNavigation({ current }: Props) {
  const [showFirstVisitHelp, setShowFirstVisitHelp] = useState(false);

  useEffect(() => {
    try {
      setShowFirstVisitHelp(
        window.localStorage.getItem(navHelpStorageKey) !== "true"
      );
    } catch {
      setShowFirstVisitHelp(false);
    }
  }, []);

  const dismissHelp = () => {
    try {
      window.localStorage.setItem(navHelpStorageKey, "true");
    } catch {
      // Non-persistent browsers can still dismiss the prompt for this render.
    }
    setShowFirstVisitHelp(false);
  };

  return (
    <NavWrap data-testid="learning-navigation">
      <Nav aria-label="Learning navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isCurrent = item.id === current;

          return (
            <NavButton
              key={item.id}
              as={Link}
              aria-current={isCurrent ? "page" : undefined}
              aria-label={`${item.label}. ${item.description}`}
              $active={isCurrent}
              $overview={item.id === "module-map"}
              title={item.description}
              to={item.path}
            >
              <Icon size={16} />
              {item.label}
            </NavButton>
          );
        })}
      </Nav>
      {showFirstVisitHelp ? (
        <FirstVisitHelp aria-live="polite">
          <HelpCopy>
            <strong>Learning Hub navigation</strong>
            <span>
              Use these buttons to move between your course home, personal
              progress, leaderboard, coaching report, and certification map.
            </span>
          </HelpCopy>
          <HelpDismiss onClick={dismissHelp} type="button">
            Got it
          </HelpDismiss>
        </FirstVisitHelp>
      ) : null}
    </NavWrap>
  );
}

const brand = {
  dark: "#1c2018",
  ink: "#20302d",
  lime: "#edff3d",
  purple: "#6f3df4",
  purpleDark: "#4d25b8",
  rule: "#dedad1",
  surface: "#fffcf5",
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", "Courier New", monospace',
};

const NavWrap = styled.div`
  display: grid;
  gap: 6px;
  min-width: 0;
`;

const Nav = styled.nav`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-start;
  min-height: 34px;
`;

const NavButton = styled.a<{ $active?: boolean; $overview?: boolean }>`
  align-items: center;
  background: ${(props) =>
    props.$overview
      ? brand.purple
      : props.$active
        ? brand.lime
        : brand.surface};
  border: 1px solid
    ${(props) =>
      props.$overview
        ? brand.purpleDark
        : props.$active
          ? "transparent"
          : brand.rule};
  border-radius: 6px;
  color: ${(props) =>
    props.$overview ? "#fff" : props.$active ? brand.dark : brand.ink};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 10px;
  font-weight: 800;
  gap: 5px;
  height: 34px;
  justify-content: center;
  letter-spacing: 0;
  min-width: min-content;
  padding: 0 9px;
  text-decoration: none;
  text-transform: uppercase;
  white-space: nowrap;

  &:hover {
    background: ${(props) => (props.$overview ? brand.purpleDark : undefined)};
    color: ${(props) =>
      props.$overview ? "#fff" : props.$active ? brand.dark : "#354cef"};
    opacity: ${(props) => (props.$active || props.$overview ? 1 : 0.9)};
    text-decoration: none;
  }

  @media (min-width: 1440px) {
    height: 36px;
  }
`;

const FirstVisitHelp = styled.div`
  align-items: center;
  background: rgba(255, 252, 245, 0.98);
  border: 1px solid rgba(237, 255, 61, 0.72);
  border-radius: 7px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.2);
  color: ${brand.ink};
  display: flex;
  gap: 8px;
  justify-content: space-between;
  max-width: 460px;
  padding: 8px 8px 8px 10px;
`;

const HelpCopy = styled.div`
  display: grid;
  gap: 2px;
  min-width: 0;

  strong {
    color: ${brand.dark};
    font-family: ${brand.mono};
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1.2;
    text-transform: uppercase;
  }

  span {
    color: rgba(32, 48, 45, 0.78);
    font-size: 11px;
    line-height: 1.25;
  }
`;

const HelpDismiss = styled.button`
  background: ${brand.dark};
  border: 0;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  flex: 0 0 auto;
  font-family: ${brand.mono};
  font-size: 10px;
  font-weight: 800;
  height: 30px;
  letter-spacing: 0;
  padding: 0 10px;
  text-transform: uppercase;

  &:hover {
    background: ${brand.purpleDark};
  }
`;
