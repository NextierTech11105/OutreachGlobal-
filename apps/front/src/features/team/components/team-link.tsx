"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

type Props = React.ComponentProps<typeof Link>;

export const TeamLink: React.FC<Props> = ({ href, children, ...props }) => {
  const params = useParams<{ team: string }>();

  return (
    <Link
      {...props}
      href={href === "/" ? `/t/${params.team}` : `/t/${params.team}${href}`}
    >
      {children}
    </Link>
  );
};
