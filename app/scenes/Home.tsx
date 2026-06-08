import { observer } from "mobx-react";
import {
  CollectionIcon as CollectionOutlineIcon,
  DocumentIcon,
  GoToIcon,
  GraphIcon,
  HomeIcon,
  LightningIcon,
  SearchIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Switch, Route } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import { Action } from "~/components/Actions";
import Empty from "~/components/Empty";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import InputSearchPage from "~/components/InputSearchPage";
import LanguagePrompt from "~/components/LanguagePrompt";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import PinnedDocuments from "~/components/PinnedDocuments";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Scene from "~/components/Scene";
import Tab from "~/components/Tab";
import Tabs from "~/components/Tabs";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import { usePinnedDocuments } from "~/hooks/usePinnedDocuments";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import NewDocumentMenu from "~/menus/NewDocumentMenu";

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
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", "Courier New", monospace',
};

function Home() {
  const { collections, documents, ui } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const { t } = useTranslation();
  const userId = user?.id;
  const { pins, count } = usePinnedDocuments("home");
  const can = usePolicy(team);
  const continueDocs = documents.recentlyViewed.slice(0, 4);
  const updatedDocs = documents.recentlyUpdated.slice(0, 4);
  const popularDocs = documents.popular.slice(0, 4);
  const teamSpaces = collections.orderedData
    .filter((collection) => collection.isActive)
    .slice(0, 8);
  const startSpaces = teamSpaces.slice(0, 4);

  React.useEffect(() => {
    void documents.fetchRecentlyViewed({ limit: 8 });
    void documents.fetchRecentlyUpdated({ limit: 8 });
    void documents.fetchPopular({ limit: 8 });

    if (!collections.isLoaded) {
      void collections.fetchNamedPage("list", undefined);
    }
  }, [collections, documents]);

  return (
    <Scene
      icon={<HomeIcon />}
      title={t("Home")}
      wide
      left={
        <InputSearchPage source="dashboard" label={t("Search documents")} />
      }
      actions={
        <Action>
          <NewDocumentMenu />
        </Action>
      }
    >
      <ResizingHeightContainer>
        {!ui.languagePromptDismissed && <LanguagePrompt key="language" />}
      </ResizingHeightContainer>
      <Page>
        <Hero>
          <HeroCopy>
            <Eyebrow>Dash.fi knowledge base</Eyebrow>
            <Title>{t("Home")}</Title>
            <HeroText>
              Find answers, resume active work, and move into the right team
              space without digging through the full document tree.
            </HeroText>
            <HeroSearch>
              <InputSearchPage
                source="home-cockpit"
                label={t("Search documents")}
                placeholder="Search the KB..."
              />
            </HeroSearch>
          </HeroCopy>
          <SignalPanel aria-label="Knowledge base status">
            <PanelHeader>
              <PanelTitle>Today</PanelTitle>
              <PanelBadge>KB</PanelBadge>
            </PanelHeader>
            <MetricRow>
              <MetricValue>{continueDocs.length}</MetricValue>
              <MetricLabel>recent reads</MetricLabel>
            </MetricRow>
            <MetricRow>
              <MetricValue>{updatedDocs.length}</MetricValue>
              <MetricLabel>fresh updates</MetricLabel>
            </MetricRow>
            <MetricRow>
              <MetricValue>{teamSpaces.length}</MetricValue>
              <MetricLabel>team spaces</MetricLabel>
            </MetricRow>
          </SignalPanel>
        </Hero>

        <PinnedSection>
          <SectionHeader>
            <SectionMarker>01</SectionMarker>
            <SectionText>
              <SectionKicker>Start here</SectionKicker>
              <SectionTitle>Core paths</SectionTitle>
            </SectionText>
          </SectionHeader>
          <ShortcutGrid>
            {startSpaces.map((collection) => (
              <ShortcutCard key={collection.id} to={collection.path}>
                <ShortcutIcon>
                  <CollectionIcon collection={collection} expanded />
                </ShortcutIcon>
                <ShortcutBody>
                  <ShortcutTitle>{collection.name}</ShortcutTitle>
                  <ShortcutMeta>Team space</ShortcutMeta>
                </ShortcutBody>
                <GoToIcon size={18} />
              </ShortcutCard>
            ))}
            <ShortcutCard to="/search">
              <ShortcutIcon>
                <SearchIcon size={20} />
              </ShortcutIcon>
              <ShortcutBody>
                <ShortcutTitle>Search everything</ShortcutTitle>
                <ShortcutMeta>Find docs, playbooks, and answers</ShortcutMeta>
              </ShortcutBody>
              <GoToIcon size={18} />
            </ShortcutCard>
          </ShortcutGrid>
        </PinnedSection>

        <DashboardGrid>
          <DocumentPanel>
            <PanelHeading>
              <PanelIcon>
                <LightningIcon size={18} />
              </PanelIcon>
              <div>
                <PanelKicker>Resume</PanelKicker>
                <PanelHeadingText>Continue reading</PanelHeadingText>
              </div>
            </PanelHeading>
            <CompactList>
              {continueDocs.map((document) => (
                <CompactDocumentLink key={document.id} to={document.path}>
                  <DocumentIcon size={18} />
                  <CompactDocumentText>
                    <CompactTitle>{document.titleWithDefault}</CompactTitle>
                    <CompactMeta>
                      {document.collection?.name || "Recently viewed"}
                    </CompactMeta>
                  </CompactDocumentText>
                </CompactDocumentLink>
              ))}
              {!continueDocs.length && (
                <EmptyState>Recently viewed docs will appear here.</EmptyState>
              )}
            </CompactList>
          </DocumentPanel>

          <DocumentPanel>
            <PanelHeading>
              <PanelIcon>
                <GraphIcon size={18} />
              </PanelIcon>
              <div>
                <PanelKicker>Discover</PanelKicker>
                <PanelHeadingText>What changed</PanelHeadingText>
              </div>
            </PanelHeading>
            <CompactList>
              {updatedDocs.map((document) => (
                <CompactDocumentLink key={document.id} to={document.path}>
                  <DocumentIcon size={18} />
                  <CompactDocumentText>
                    <CompactTitle>{document.titleWithDefault}</CompactTitle>
                    <CompactMeta>
                      {document.collection?.name || "Recently updated"}
                    </CompactMeta>
                  </CompactDocumentText>
                </CompactDocumentLink>
              ))}
              {!updatedDocs.length && (
                <EmptyState>Recent updates will appear here.</EmptyState>
              )}
            </CompactList>
          </DocumentPanel>

          <DocumentPanel>
            <PanelHeading>
              <PanelIcon>
                <CollectionOutlineIcon size={18} />
              </PanelIcon>
              <div>
                <PanelKicker>Answers</PanelKicker>
                <PanelHeadingText>Popular now</PanelHeadingText>
              </div>
            </PanelHeading>
            <CompactList>
              {popularDocs.map((document) => (
                <CompactDocumentLink key={document.id} to={document.path}>
                  <DocumentIcon size={18} />
                  <CompactDocumentText>
                    <CompactTitle>{document.titleWithDefault}</CompactTitle>
                    <CompactMeta>
                      {document.collection?.name || "Popular answer"}
                    </CompactMeta>
                  </CompactDocumentText>
                </CompactDocumentLink>
              ))}
              {!popularDocs.length && (
                <EmptyState>Popular docs will appear here.</EmptyState>
              )}
            </CompactList>
          </DocumentPanel>
        </DashboardGrid>

        <TeamSpaces>
          <SectionHeader>
            <SectionMarker>02</SectionMarker>
            <SectionText>
              <SectionKicker>Navigate</SectionKicker>
              <SectionTitle>Team spaces</SectionTitle>
            </SectionText>
          </SectionHeader>
          <TeamGrid>
            {teamSpaces.map((collection) => (
              <TeamCard key={collection.id} to={collection.path}>
                <TeamIcon>
                  <CollectionIcon collection={collection} expanded />
                </TeamIcon>
                <TeamTitle>{collection.name}</TeamTitle>
              </TeamCard>
            ))}
          </TeamGrid>
        </TeamSpaces>

        {!!(pins.length || count) && (
          <PinnedDocs>
            <SectionHeader>
              <SectionMarker>03</SectionMarker>
              <SectionText>
                <SectionKicker>Curated</SectionKicker>
                <SectionTitle>Pinned docs</SectionTitle>
              </SectionText>
            </SectionHeader>
            <PinnedDocuments
              pins={pins}
              canUpdate={can.update}
              placeholderCount={count}
            />
          </PinnedDocs>
        )}

        <Documents>
          <SectionHeader>
            <SectionMarker>04</SectionMarker>
            <SectionText>
              <SectionKicker>Browse</SectionKicker>
              <SectionTitle>Document streams</SectionTitle>
            </SectionText>
          </SectionHeader>
          <Tabs>
            <Tab to="/home" exact>
              {t("Recently viewed")}
            </Tab>
            <Tab to="/home/popular" exact>
              {t("Popular")}
            </Tab>
            <Tab to="/home/recent" exact>
              {t("Recently updated")}
            </Tab>
            <Tab to="/home/created">{t("Created by me")}</Tab>
          </Tabs>
          <Switch>
            <Route path="/home/recent">
              <PaginatedDocumentList
                documents={documents.recentlyUpdated}
                fetch={documents.fetchRecentlyUpdated}
                empty={
                  <Empty>{t("Weird, this shouldn't ever be empty")}</Empty>
                }
                showCollection
              />
            </Route>
            <Route path="/home/popular">
              <PaginatedDocumentList
                key="popular"
                documents={documents.popular}
                fetch={documents.fetchPopular}
                empty={
                  <Empty>
                    {t("Documents with recent activity will appear here")}
                  </Empty>
                }
                showCollection
              />
            </Route>
            <Route path="/home/created">
              <PaginatedDocumentList
                key="created"
                documents={documents.createdByUser(userId)}
                fetch={documents.fetchOwned}
                options={{
                  userId,
                }}
                empty={
                  <Empty>{t("You haven’t created any documents yet")}</Empty>
                }
                showCollection
              />
            </Route>
            <Route path="/home">
              <PaginatedDocumentList
                key="recent"
                documents={documents.recentlyViewed}
                fetch={documents.fetchRecentlyViewed}
                empty={
                  <Empty>
                    {t(
                      "Documents you’ve recently viewed will be here for easy access"
                    )}
                  </Empty>
                }
                showCollection
              />
            </Route>
          </Switch>
        </Documents>
      </Page>
    </Scene>
  );
}

const Page = styled.div`
  min-height: 100%;
  margin: 0;
  padding: 24px 16px 48px;
  background: ${brand.paper};
  color: ${brand.ink};

  ${breakpoint("tablet")`
    margin: -16px -32px 0;
    padding: 32px 32px 56px;
  `};
`;

const Hero = styled.section`
  display: grid;
  gap: 20px;
  align-items: stretch;
  border: 1px solid rgba(28, 32, 24, 0.16);
  border-radius: 8px;
  background: ${brand.dark};
  color: #fff;
  padding: 28px;

  ${breakpoint("tablet")`
    grid-template-columns: minmax(0, 1fr) minmax(320px, 0.42fr);
    padding: 36px;
  `};
`;

const HeroCopy = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
`;

const Eyebrow = styled.div`
  margin-bottom: 18px;
  color: ${brand.lime};
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0;
  color: #fff;
  font-family: ${brand.mono};
  font-size: 48px;
  font-weight: 400;
  line-height: 1.04;

  ${breakpoint("tablet")`
    font-size: 64px;
  `};
`;

const HeroText = styled.p`
  max-width: 720px;
  margin: 18px 0 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 17px;
  line-height: 1.55;
`;

const HeroSearch = styled.div`
  width: 100%;
  max-width: 620px;
  margin-top: 24px;

  > * {
    width: 100%;
    max-width: 100%;
  }

  input {
    min-height: 44px;
  }
`;

const SignalPanel = styled.aside`
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  padding: 22px;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
`;

const PanelTitle = styled.div`
  font-family: ${brand.mono};
  font-size: 15px;
  font-weight: 700;
`;

const PanelBadge = styled.div`
  border-radius: 999px;
  background: ${brand.surface};
  color: ${brand.muted};
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  padding: 6px 12px;
`;

const MetricRow = styled.div`
  padding: 14px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);

  &:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }
`;

const MetricValue = styled.div`
  color: #fff;
  font-family: ${brand.mono};
  font-size: 28px;
  line-height: 1;
`;

const MetricLabel = styled.div`
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.52);
  font-family: ${brand.mono};
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const PinnedSection = styled.section`
  margin-top: 32px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  margin-bottom: 14px;
`;

const SectionMarker = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 30px;
  border-radius: 6px;
  background: ${brand.lavender};
  color: ${brand.blue};
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 700;
`;

const SectionText = styled.div`
  min-width: 0;
`;

const SectionKicker = styled.div`
  color: ${brand.muted};
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const SectionTitle = styled.h2`
  margin: 3px 0 0;
  color: ${brand.ink};
  font-family: ${brand.mono};
  font-size: 26px;
  font-weight: 400;
  line-height: 1.1;
`;

const ShortcutGrid = styled.div`
  display: grid;
  gap: 12px;

  ${breakpoint("tablet")`
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  `};
`;

const ShortcutCard = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  background: ${brand.surface};
  color: ${brand.ink};
  padding: 16px;
  text-decoration: none;
  transition:
    border-color 120ms ease,
    transform 120ms ease;

  &:hover {
    border-color: ${brand.blue};
    color: ${brand.ink};
    text-decoration: none;
    transform: translateY(-1px);
  }

  > svg {
    flex-shrink: 0;
    color: ${brand.blue};
  }
`;

const ShortcutIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: ${brand.lavender};
  color: ${brand.blue};
`;

const ShortcutBody = styled.div`
  min-width: 0;
  flex: 1;
`;

const ShortcutTitle = styled.div`
  overflow: hidden;
  color: ${brand.ink};
  font-size: 15px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ShortcutMeta = styled.div`
  overflow: hidden;
  margin-top: 4px;
  color: ${brand.muted};
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DashboardGrid = styled.section`
  display: grid;
  gap: 14px;
  margin-top: 24px;

  ${breakpoint("tablet")`
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  `};
`;

const DocumentPanel = styled.article`
  min-width: 0;
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  background: ${brand.surface};
  padding: 18px;
`;

const PanelHeading = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
`;

const PanelIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 7px;
  background: ${brand.dark};
  color: ${brand.lime};
`;

const PanelKicker = styled.div`
  color: ${brand.muted};
  font-family: ${brand.mono};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const PanelHeadingText = styled.h3`
  margin: 2px 0 0;
  color: ${brand.ink};
  font-size: 17px;
  line-height: 1.2;
`;

const CompactList = styled.div`
  display: grid;
  gap: 8px;
`;

const CompactDocumentLink = styled(Link)`
  display: flex;
  gap: 10px;
  min-width: 0;
  border-radius: 7px;
  color: ${brand.ink};
  padding: 10px;
  text-decoration: none;

  &:hover {
    background: ${brand.paper};
    color: ${brand.ink};
    text-decoration: none;
  }

  > svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: ${brand.muted};
  }
`;

const CompactDocumentText = styled.div`
  min-width: 0;
`;

const CompactTitle = styled.div`
  overflow: hidden;
  color: ${brand.ink};
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CompactMeta = styled.div`
  overflow: hidden;
  margin-top: 3px;
  color: ${brand.muted};
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EmptyState = styled.div`
  border: 1px dashed ${brand.rule};
  border-radius: 7px;
  color: ${brand.muted};
  font-size: 13px;
  padding: 14px;
`;

const TeamSpaces = styled.section`
  margin-top: 32px;
`;

const PinnedDocs = styled.section`
  margin-top: 32px;
`;

const TeamGrid = styled.div`
  display: grid;
  gap: 10px;

  ${breakpoint("tablet")`
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  `};
`;

const TeamCard = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  background: ${brand.surface};
  color: ${brand.ink};
  padding: 13px 14px;
  text-decoration: none;

  &:hover {
    border-color: ${brand.blue};
    color: ${brand.ink};
    text-decoration: none;
  }
`;

const TeamIcon = styled.div`
  display: flex;
  flex-shrink: 0;
`;

const TeamTitle = styled.div`
  overflow: hidden;
  color: ${brand.ink};
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Documents = styled.div`
  position: relative;
  margin-top: 32px;
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  background: ${s("background")};
  padding: 18px;
`;

export default observer(Home);
