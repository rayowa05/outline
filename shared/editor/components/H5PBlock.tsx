import * as React from "react";
import { CSRF } from "@shared/constants";
import styled from "styled-components";
import type { ComponentProps } from "../types";

interface H5PBlockProps extends ComponentProps {
  moduleId: string;
  title: string;
  contentType?: string | null;
}

let h5pRenderQueue = Promise.resolve();

/**
 * Renders an extracted H5P package inline inside the editor.
 *
 * @param props The ProseMirror node view props.
 * @returns The H5P block component.
 */
export default function H5PBlock({
  moduleId,
  title,
  contentType,
}: H5PBlockProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<string | undefined>();
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const element = container;
    container.innerHTML = "";
    setIsLoading(true);
    setError(undefined);

    async function renderH5P() {
      const standalone = await import("h5p-standalone");
      const xAPIObjectIRI = `${window.location.origin}/h5p/${moduleId}`;

      await new standalone.default.H5P(element, {
        id: moduleId,
        h5pJsonPath: `/api/h5p.content/${moduleId}`,
        contentJsonPath: `/api/h5p.content/${moduleId}/content`,
        librariesPath: "/h5p-libraries",
        frameJs: "/h5p-player/frame.bundle.js",
        frameCss: "/h5p-player/styles/h5p.css",
        embedType: "div",
        frame: true,
        fullScreen: true,
        title,
        xAPIObjectIRI,
      });

      const dispatcher = window.H5P?.externalDispatcher;
      const handler = (event: H5PXAPIEvent) => {
        const statement = event?.data?.statement;
        const objectId = statement?.object?.id;

        if (
          objectId &&
          objectId !== xAPIObjectIRI &&
          !objectId.startsWith(`${xAPIObjectIRI}?`)
        ) {
          return;
        }

        if (statement) {
          trackXAPIEvent({
            moduleId,
            moduleTitle: title,
            contentType,
            statement,
          });
        }
      };

      if (typeof dispatcher?.on !== "function") {
        return;
      }

      dispatcher.on("xAPI", handler);
      return () => dispatcher.off?.("xAPI", handler);
    }

    let cleanupTracking: (() => void) | undefined;
    const queuedRender = h5pRenderQueue.then(() => {
      if (!isMounted) {
        return;
      }

      return renderH5P();
    });

    h5pRenderQueue = queuedRender.then(
      () => undefined,
      () => undefined
    );

    void queuedRender
      .then((cleanup) => {
        cleanupTracking = cleanup;
        if (isMounted) {
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setIsLoading(false);
          setError(err instanceof Error ? err.message : "Unable to load H5P");
        }
      });

    return () => {
      isMounted = false;
      cleanupTracking?.();
      container.innerHTML = "";
    };
  }, [contentType, moduleId, title]);

  return (
    <Wrapper contentEditable={false}>
      <Header>
        <Title>{title}</Title>
        {contentType && <ContentType>{contentType}</ContentType>}
      </Header>
      {isLoading && <Status>Loading interactive module…</Status>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Player ref={containerRef} />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  border: 1px solid ${({ theme }) => theme.divider};
  border-radius: 8px;
  margin: 1em 0;
  overflow: hidden;
  background: ${({ theme }) => theme.background};
`;

const Header = styled.div`
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.divider};
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
`;

const Title = styled.strong`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ContentType = styled.span`
  color: ${({ theme }) => theme.textSecondary};
  flex-shrink: 0;
  font-size: 12px;
`;

const Status = styled.div`
  color: ${({ theme }) => theme.textSecondary};
  padding: 16px;
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.danger};
  padding: 16px;
`;

const Player = styled.div`
  min-height: 120px;
  width: 100%;

  .h5p-iframe {
    width: 100%;
  }
`;

type H5PXAPIStatement = {
  object?: {
    id?: string;
  };
  [key: string]: unknown;
};

type H5PXAPIEvent = {
  data?: {
    statement?: H5PXAPIStatement;
  };
};

function trackXAPIEvent({
  moduleId,
  moduleTitle,
  contentType,
  statement,
}: {
  moduleId: string;
  moduleTitle: string;
  contentType?: string | null;
  statement: H5PXAPIStatement;
}) {
  void fetch("/api/h5p.track", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      [CSRF.headerName]: getCookie(CSRF.cookieName) || "",
    },
    body: JSON.stringify({
      moduleId,
      moduleTitle,
      contentType,
      statement,
    }),
  }).catch(() => {
    // Tracking must never interrupt the learning experience.
  });
}

function getCookie(name: string) {
  return document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")[1];
}
