import type { ReactNode } from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import LearningNavigation from "./LearningNavigation";

type LearningHeroPage =
  | "learning-hub"
  | "my-progress"
  | "leaderboard"
  | "reporting"
  | "module-map";

type Props = {
  current: LearningHeroPage;
  eyebrow: string;
  title: string;
  children: ReactNode;
};

export default function LearningHero({
  children,
  current,
  eyebrow,
  title,
}: Props) {
  return (
    <Hero data-testid="learning-hero">
      <HeroCopy>
        <Eyebrow>{eyebrow}</Eyebrow>
        <HeroTitle>{title}</HeroTitle>
        <HeroText>{children}</HeroText>
      </HeroCopy>
      <NavSlot>
        <LearningNavigation current={current} />
      </NavSlot>
    </Hero>
  );
}

const brand = {
  dark: "#11131f",
  blue: "#354cef",
  lime: "#edff3d",
  purple: "#6f3df4",
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", "Courier New", monospace',
};

const Hero = styled.section`
  background:
    linear-gradient(135deg, rgba(53, 76, 239, 0.28), transparent 44%),
    linear-gradient(98deg, rgba(111, 61, 244, 0.22), transparent 62%),
    ${brand.dark};
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: #fff;
  display: grid;
  gap: 18px;
  min-height: 176px;
  overflow: hidden;
  padding: 22px;
  position: relative;

  @media (min-width: 1440px) {
    min-height: 176px;
    padding: 28px 30px;
  }
`;

const HeroCopy = styled.div`
  min-width: 0;

  @media (min-width: 1440px) {
    max-width: calc(100% - 800px);
  }
`;

const Eyebrow = styled.div`
  color: ${brand.lime};
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  line-height: 1.2;
  margin-bottom: 8px;
  text-transform: uppercase;

  ${breakpoint("tablet")`
    font-size: 12px;
    letter-spacing: 0.14em;
    margin-bottom: 10px;
  `};
`;

const HeroTitle = styled.h1`
  color: #fff;
  font-family: ${brand.mono};
  font-size: 26px;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.1;
  margin: 0;
  overflow-wrap: anywhere;

  ${breakpoint("tablet")`
    font-size: 30px;
  `};

  @media (min-width: 1440px) {
    font-size: 32px;
  }
`;

const HeroText = styled.div`
  color: rgba(255, 255, 255, 0.76);
  font-size: 14px;
  line-height: 1.4;
  margin: 8px 0 0;
  max-width: 680px;
  overflow-wrap: anywhere;

  ${breakpoint("tablet")`
    font-size: 15px;
  `};

  @media (min-width: 1440px) {
    font-size: 16px;
    line-height: 1.5;
    margin-top: 10px;
  }
`;

const NavSlot = styled.div`
  display: grid;
  justify-items: start;
  min-width: 0;

  @media (min-width: 1440px) {
    justify-items: stretch;
    position: absolute;
    right: 30px;
    top: 28px;
    width: 760px;
  }
`;
