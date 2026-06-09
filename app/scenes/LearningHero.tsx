import type { ReactNode } from "react";
import { observer } from "mobx-react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import useStores from "~/hooks/useStores";
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

function LearningHero({
  children,
  current,
  eyebrow,
  title,
}: Props) {
  const { auth } = useStores();
  const user = auth.user;

  return (
    <Hero data-testid="learning-hero">
      <HeroCopy>
        <HeroMeta>
          <Eyebrow>{eyebrow}</Eyebrow>
          {user ? (
            <SignedIn title={user.email}>
              Signed in as {user.name || user.email}
            </SignedIn>
          ) : null}
        </HeroMeta>
        <HeroTitle>{title}</HeroTitle>
        <HeroText>{children}</HeroText>
      </HeroCopy>
      <NavSlot>
        <LearningNavigation current={current} />
      </NavSlot>
    </Hero>
  );
}

export default observer(LearningHero);

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
  gap: 14px;
  overflow: hidden;
  padding: 14px 16px;
  position: relative;

  ${breakpoint("desktop")`
    align-items: start;
    grid-template-columns: minmax(220px, 0.36fr) minmax(0, 0.64fr);
  `};

  @media (min-width: 1440px) {
    grid-template-columns: minmax(260px, 0.32fr) minmax(0, 0.68fr);
    padding: 16px 18px;
  }
`;

const HeroCopy = styled.div`
  min-width: 0;
`;

const HeroMeta = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-bottom: 8px;
`;

const Eyebrow = styled.div`
  color: ${brand.lime};
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  line-height: 1.2;
  text-transform: uppercase;

  ${breakpoint("tablet")`
    letter-spacing: 0.12em;
  `};
`;

const SignedIn = styled.div`
  color: rgba(255, 255, 255, 0.72);
  font-family: ${brand.mono};
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const HeroTitle = styled.h1`
  color: #fff;
  font-family: ${brand.mono};
  font-size: 24px;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.1;
  margin: 0;
  overflow-wrap: normal;
  word-break: normal;

  ${breakpoint("tablet")`
    font-size: 26px;
  `};

  @media (min-width: 1440px) {
    font-size: 28px;
  }
`;

const HeroText = styled.div`
  color: rgba(255, 255, 255, 0.76);
  font-size: 14px;
  line-height: 1.35;
  margin: 6px 0 0;
  max-width: 520px;
  overflow-wrap: normal;
  word-break: normal;

  ${breakpoint("tablet")`
    font-size: 14px;
  `};

  @media (min-width: 1440px) {
    font-size: 15px;
  }
`;

const NavSlot = styled.div`
  display: grid;
  justify-items: start;
  min-width: 0;

  ${breakpoint("desktop")`
    justify-items: end;
  `};
`;
