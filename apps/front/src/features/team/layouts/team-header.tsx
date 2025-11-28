"use client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbLink,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react";
import { TeamLink } from "@/features/team/components/team-link";
import * as Portal from "@radix-ui/react-portal";
import { useMounted } from "@/hooks/use-mounted";

interface Props {
  links?: { href: string; title: string }[];
  title: string;
}

export const TeamHeader: React.FC<Props> = ({ links = [], title }) => {
  const mounted = useMounted();
  if (!mounted) {
    return null;
  }

  return (
    <Portal.Root
      container={document.getElementById("team-header-wrapper") as HTMLElement}
      asChild
    >
      {!links.length ? (
        <span className="text-sm font-normal text-foreground">{title}</span>
      ) : (
        <Breadcrumb>
          <BreadcrumbList>
            {links.map((link) => (
              <Fragment key={link.title}>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <TeamLink href={link.href}>{link.title}</TeamLink>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </Fragment>
            ))}
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
    </Portal.Root>
  );
};
