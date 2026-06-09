import { observer } from "mobx-react";
import {
  AcademicCapIcon,
  ClockIcon,
  GoToIcon,
  TargetIcon,
} from "outline-icons";
import { Link } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Scene from "~/components/Scene";
import {
  learningCourses,
  underwritingCourse,
  type LearningCourse,
} from "./learningData";
import LearningHero from "./LearningHero";
import { underwritingTrainingPath } from "~/utils/routeHelpers";

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

function Learning() {
  const plannedCourses = learningCourses.filter(
    (course) => course.id !== underwritingCourse.id
  );

  return (
    <Scene
      icon={<AcademicCapIcon />}
      title="DashFi Learning Hub"
      transparentHeaderUntilScrolled
      wide
    >
      <Page>
        <LearningHero
          current="learning-hub"
          eyebrow="DashFi Enablement"
          title="DashFi Learning Hub"
        >
          One place to certify AE judgment, track progress, and see which reps
          are ready to position Dash.fi underwriting with customers.
        </LearningHero>

        <FeaturedSection aria-labelledby="featured-course-title">
          <FeaturedCourse to={underwritingTrainingPath()}>
            <FeaturedCopy>
              <FeaturedKicker>Active certification</FeaturedKicker>
              <FeaturedTitle id="featured-course-title">
                {underwritingCourse.title}
              </FeaturedTitle>
              <FeaturedDescription>
                {underwritingCourse.description}
              </FeaturedDescription>
              <CourseMeta aria-label="Course details">
                <StatusPill>Required</StatusPill>
                <MetaItem>
                  <TargetIcon size={14} />
                  {underwritingCourse.moduleCount} stages
                </MetaItem>
                <MetaItem>
                  <ClockIcon size={14} />
                  {underwritingCourse.duration}
                </MetaItem>
              </CourseMeta>
              <PrimaryAction>
                Open certification map <GoToIcon size={15} />
              </PrimaryAction>
            </FeaturedCopy>
            <CourseCover aria-hidden="true">
              <CoverTopline>Performance underwriting</CoverTopline>
              <CoverModules>
                {underwritingCourse.modules.map((module) => (
                  <CoverModule key={module.title}>
                    <span>Module {module.number}</span>
                    <strong>{module.title}</strong>
                  </CoverModule>
                ))}
              </CoverModules>
            </CourseCover>
          </FeaturedCourse>
        </FeaturedSection>

        <CatalogSection id="courses" aria-labelledby="course-catalog-title">
          <SectionHeader>
            <SectionKicker>Future learning paths</SectionKicker>
            <SectionTitle id="course-catalog-title">
              Upcoming certifications and playbooks
            </SectionTitle>
          </SectionHeader>

          <CatalogGrid>
            {plannedCourses.map((course, index) => (
              <PlannedCatalogCard
                key={course.id}
                course={course}
                index={index}
              />
            ))}
          </CatalogGrid>
        </CatalogSection>
      </Page>
    </Scene>
  );
}

function PlannedCatalogCard({
  course,
  index,
}: {
  course: LearningCourse;
  index: number;
}) {
  return (
    <CourseCard $accent={plannedAccent(index)}>
      <CardTopline>
        <StatusPill $muted>
          <ClockIcon size={12} />
          Planned
        </StatusPill>
      </CardTopline>
      <CardTitle>{course.title}</CardTitle>
      <CardDescription>{course.description}</CardDescription>
      <CardMeta>
        <MetaItem>{course.audience}</MetaItem>
      </CardMeta>
    </CourseCard>
  );
}

function plannedAccent(index: number) {
  return ["shipping", "app", "expense"][index % 3];
}

function cardRule(accent: string) {
  if (accent === "shipping") {
    return brand.blue;
  }

  if (accent === "app") {
    return "#19a767";
  }

  if (accent === "expense") {
    return brand.purple;
  }

  return brand.blue;
}

function cardTint(accent: string) {
  if (accent === "shipping") {
    return "rgba(53, 76, 239, 0.08)";
  }

  if (accent === "app") {
    return "rgba(25, 167, 103, 0.08)";
  }

  if (accent === "expense") {
    return "rgba(111, 61, 244, 0.08)";
  }

  return "rgba(53, 76, 239, 0.08)";
}

const Page = styled.div`
  background: ${brand.paper};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
  min-width: 0;
  padding: 14px 16px 48px;

  ${breakpoint("tablet")`
    gap: 16px;
    margin: -40px -28px 0;
    padding: 18px 28px 56px;
  `};
`;

const FeaturedSection = styled.section`
  display: grid;
  gap: 14px;
`;

const FeaturedCourse = styled(Link)`
  background: linear-gradient(
    180deg,
    rgba(53, 76, 239, 0.06),
    ${brand.surface} 34%
  );
  border: 1px solid ${brand.rule};
  border-top: 4px solid ${brand.blue};
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 14px;
  min-height: unset;
  overflow: hidden;
  padding: 16px;
  text-decoration: none;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);

  &:hover {
    border-color: rgba(53, 76, 239, 0.34);
    color: ${brand.ink};
    text-decoration: none;
  }

  ${breakpoint("tablet")`
    grid-template-columns: minmax(0, 0.95fr) minmax(360px, 1.05fr);
    padding: 18px;
  `};
`;

const FeaturedCopy = styled.div`
  align-content: center;
  display: grid;
  min-width: 0;
  padding: 4px;
`;

const FeaturedKicker = styled.div`
  color: ${brand.blue};
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  margin-bottom: 8px;
  text-transform: uppercase;
`;

const FeaturedTitle = styled.h2`
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.1;
  margin: 0;

  ${breakpoint("tablet")`
    font-size: 34px;
  `};
`;

const FeaturedDescription = styled.p`
  color: ${brand.muted};
  font-size: 15px;
  line-height: 1.42;
  margin: 10px 0 0;
  max-width: 620px;
`;

const CourseMeta = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
`;

const MetaItem = styled.span`
  align-items: center;
  color: ${brand.muted};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 650;
  gap: 6px;
  line-height: 1.3;
`;

const StatusPill = styled.span<{ $muted?: boolean }>`
  align-items: center;
  background: ${(props) => (props.$muted ? brand.lavender : brand.lime)};
  border: 1px solid
    ${(props) => (props.$muted ? "rgba(53, 76, 239, 0.16)" : "transparent")};
  border-radius: 999px;
  color: ${(props) => (props.$muted ? brand.blue : brand.dark)};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 700;
  gap: 6px;
  line-height: 1;
  padding: 7px 10px;
  text-transform: uppercase;
  white-space: nowrap;
`;

const PrimaryAction = styled.span`
  align-items: center;
  background: ${brand.blue};
  border-radius: 6px;
  color: #fff;
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 13px;
  font-weight: 700;
  gap: 8px;
  height: 36px;
  justify-content: center;
  justify-self: start;
  margin-top: 16px;
  padding: 0 14px;
  text-transform: uppercase;
`;

const CourseCover = styled.div`
  background:
    linear-gradient(135deg, rgba(53, 76, 239, 0.92), rgba(111, 61, 244, 0.72)),
    linear-gradient(180deg, transparent, rgba(17, 19, 31, 0.42)), ${brand.blue};
  border-radius: 8px;
  color: #fff;
  display: grid;
  gap: 12px;
  min-height: 202px;
  overflow: hidden;
  padding: 15px;
  position: relative;

  &::before {
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
      linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
    background-size: 38px 38px;
    content: "";
    inset: 0;
    opacity: 0.34;
    position: absolute;
  }
`;

const CoverTopline = styled.div`
  color: ${brand.lime};
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  position: relative;
  text-transform: uppercase;
  z-index: 1;
`;

const CoverModules = styled.div`
  align-self: end;
  display: grid;
  gap: 8px;
  position: relative;
  z-index: 1;
`;

const CoverModule = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  display: grid;
  gap: 3px;
  padding: 10px 12px;

  span {
    color: rgba(255, 255, 255, 0.64);
    font-family: ${brand.mono};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  strong {
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.25;
  }
`;

const CatalogSection = styled.section`
  display: grid;
  gap: 16px;
`;

const SectionHeader = styled.div`
  display: grid;
  gap: 6px;
`;

const SectionKicker = styled.div`
  color: ${brand.blue};
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const SectionTitle = styled.h2`
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 28px;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.18;
  margin: 0;
`;

const CatalogGrid = styled.div`
  display: grid;
  gap: 14px;

  ${breakpoint("tablet")`
    grid-template-columns: repeat(3, minmax(0, 1fr));
  `};
`;

const CourseCardBase = styled.article<{ $accent: string }>`
  background: ${(props) =>
    `linear-gradient(180deg, ${cardTint(props.$accent)}, ${brand.surface} 44%)`};
  border: 1px solid ${brand.rule};
  border-top: 4px solid ${(props) => cardRule(props.$accent)};
  border-radius: 8px;
  color: ${brand.ink};
  display: grid;
  gap: 12px;
  min-height: 238px;
  padding: 16px;
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);
`;

const CardTopline = styled.div`
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
`;

const CardTitle = styled.h3`
  color: inherit;
  font-family: ${brand.mono};
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.12;
  margin: 0;
`;

const CardDescription = styled.p`
  color: ${brand.muted};
  font-size: 13px;
  line-height: 1.45;
  margin: 0;
`;

const CardMeta = styled.div`
  align-items: end;
  align-self: end;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const CourseCard = styled(CourseCardBase)``;

export default observer(Learning);
