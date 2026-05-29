import type Token from "markdown-it/lib/token.mjs";
import type MarkdownIt from "markdown-it";
import type {
  NodeSpec,
  NodeType,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import type { Command } from "prosemirror-state";
import type { Primitive } from "utility-types";
import H5PBlockComponent from "../components/H5PBlock";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import type { ComponentProps } from "../types";
import Node from "./Node";

const h5pContentPathRegex =
  /^\/api\/h5p\.content\/([0-9a-f-]{36})\/h5p\.json$/i;

function h5pLinksToNodes(md: MarkdownIt) {
  md.core.ruler.after("inline", "h5p", (state) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length - 2; i++) {
      const open = tokens[i];
      const inline = tokens[i + 1];
      const close = tokens[i + 2];

      if (
        open?.type !== "paragraph_open" ||
        inline?.type !== "inline" ||
        close?.type !== "paragraph_close"
      ) {
        continue;
      }

      const children = inline.children || [];
      const linkOpen = children[0];
      const text = children[1];
      const linkClose = children[2];

      if (
        children.length !== 3 ||
        linkOpen?.type !== "link_open" ||
        text?.type !== "text" ||
        linkClose?.type !== "link_close"
      ) {
        continue;
      }

      const href = linkOpen.attrGet("href") || "";
      const match = href.match(h5pContentPathRegex);

      if (!match) {
        continue;
      }

      const title = text.content.replace(/^H5P:\s*/i, "").trim();
      const token = new state.Token("h5p", "div", 0);
      token.attrSet("moduleId", match[1]);
      token.attrSet("title", title || "H5P module");
      tokens.splice(i, 3, token);
    }

    return false;
  });
}

export default class H5PBlock extends Node {
  get name() {
    return "h5p";
  }

  get rulePlugins() {
    return [h5pLinksToNodes];
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        moduleId: {
          validate: "string",
        },
        title: {
          default: "H5P module",
          validate: "string",
        },
        contentType: {
          default: null,
          validate: "string|null",
        },
      },
      group: "block",
      atom: true,
      selectable: true,
      draggable: false,
      parseDOM: [
        {
          tag: "div[data-h5p-module-id]",
          getAttrs: (dom: HTMLElement) => ({
            moduleId: dom.dataset.h5pModuleId,
            title: dom.dataset.h5pTitle || "H5P module",
            contentType: dom.dataset.h5pContentType || null,
          }),
        },
      ],
      toDOM: (node) => [
        "div",
        {
          class: "h5p-block",
          "data-h5p-module-id": node.attrs.moduleId,
          "data-h5p-title": node.attrs.title,
          "data-h5p-content-type": node.attrs.contentType,
          contentEditable: "false",
        },
      ],
      leafText: (node) => node.attrs.title,
    };
  }

  component = (props: ComponentProps) => (
    <H5PBlockComponent
      {...props}
      moduleId={props.node.attrs.moduleId}
      title={props.node.attrs.title}
      contentType={props.node.attrs.contentType}
    />
  );

  commands({ type }: { type: NodeType }) {
    return {
      h5p:
        (attrs: Record<string, Primitive>): Command =>
        (state, dispatch) => {
          dispatch?.(
            state.tr.replaceSelectionWith(type.create(attrs)).scrollIntoView()
          );
          return true;
        },
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.ensureNewLine();
    state.write(
      `[H5P: ${state.esc(node.attrs.title, false)}](/api/h5p.content/${
        node.attrs.moduleId
      }/h5p.json)\n\n`
    );
  }

  parseMarkdown() {
    return {
      node: "h5p",
      getAttrs: (tok: Token) => ({
        moduleId: tok.attrGet("moduleId"),
        title: tok.attrGet("title") || "H5P module",
        contentType: tok.attrGet("contentType"),
      }),
    };
  }
}
