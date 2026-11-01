"use client";

import { createContext, useContext, type AnchorHTMLAttributes, type ReactNode } from "react";

export type WbskLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type RenderLink = (props: WbskLinkProps) => ReactNode;

/** The site supplies its router-aware link here; the Studio preview uses a plain anchor. */
const LinkContext = createContext<RenderLink>((props) => <a {...props} />);

export const LinkProvider = LinkContext.Provider;

export function WbskLink(props: WbskLinkProps) {
  return useContext(LinkContext)(props);
}
