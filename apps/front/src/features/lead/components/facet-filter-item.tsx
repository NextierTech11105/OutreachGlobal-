"use client";

import { sf, sfd } from "@/lib/utils/safe-format";
import { Input } from "@/components/ui/input";
import * as Accordion from "@radix-ui/react-accordion";
import { CheckedState } from "@radix-ui/react-checkbox";
import { ChevronDownIcon, CornerDownLeftIcon } from "lucide-react";
import { ChangeEvent, useMemo, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { useSingleQuery } from "@/graphql/hooks/use-single-query";
import type {
  SearchFacetsQuery,
  SearchFacetsQueryVariables,
} from "@/graphql/types";
import { gql, TypedDocumentNode } from "@apollo/client";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Loading } from "@/components/ui/loading";
import { useCurrentTeam } from "@/features/team/team.context";

const FACETS_QUERY: TypedDocumentNode<
  SearchFacetsQuery,
  SearchFacetsQueryVariables
> = gql`
  query SearchFacets(
    $name: String!
    $query: String
    $facetQuery: String
    $teamId: ID!
  ) {
    searchFacets(
      name: $name
      query: $query
      facetQuery: $facetQuery
      teamId: $teamId
    ) {
      hits {
        value
        count
      }
    }
  }
`;

interface Props {
  name: string;
  label: string;
  placeholder?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  checkedValues?: string[];
  onValueChange?: (name: string, values: string[]) => any;
}

export const FacetFilterItem: React.FC<Props> = ({
  label,
  name,
  placeholder,
  checkedValues = [],
  onValueChange,
}) => {
  const [facetQuery, setFacetQuery] = useState("");
  const { teamId, isTeamReady } = useCurrentTeam();
  const [debouncedFacetQuery] = useDebounceValue(facetQuery, 350);
  const [facets, { loading }] = useSingleQuery(FACETS_QUERY, {
    pick: "searchFacets",
    variables: {
      facetQuery: debouncedFacetQuery,
      name,
      teamId,
    },
    skip: !isTeamReady,
  });

  if (!isTeamReady) {
    return null;
  }

  const total = useMemo(() => {
    return checkedValues?.length || 0;
  }, [checkedValues]);

  const inputProps = useMemo(() => {
    //  do not include react hook form query here as we want to avoid using enter to filter
    return {
      name,
      placeholder: placeholder ?? label,
    };
  }, [name, placeholder, label]);

  const handleCheckedChange = (value: string) => (e: CheckedState) => {
    const isChecked = e === true;

    if (isChecked) {
      const newValues = [...checkedValues, value];
      onValueChange?.(name, newValues);
    } else {
      const newValues = checkedValues.filter((v) => v !== value);
      onValueChange?.(name, newValues);
    }
  };

  return (
    <Accordion.Item value={name} className="accordion-item">
      <Accordion.Trigger
        type="button"
        className={cn(
          "text-muted-foreground hover:text-foreground h-10 text-sm hover:bg-muted",
          "w-full group flex justify-between items-center px-4 py-3 leading-6 font-medium rounded-md",
        )}
      >
        <div className="flex items-center">
          <span>{label}</span>
          {total > 0 && (
            <span className="ml-2 inline-flex items-center justify-center h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full">
              {total}
            </span>
          )}
        </div>

        <ChevronDownIcon
          size={18}
          className="chevron transition text-muted-foreground"
        />
      </Accordion.Trigger>

      <Accordion.Content className="accordion-content">
        <div>
          <div className="px-4 py-2">
            <div className="relative">
              <Input
                {...inputProps}
                name={name}
                placeholder={placeholder ?? label}
                onChange={(e) => setFacetQuery(e.target.value)}
                value={facetQuery}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && facetQuery.trim()) {
                    e.preventDefault();
                    if (!checkedValues.includes(facetQuery.trim())) {
                      onValueChange?.(name, [
                        ...checkedValues,
                        facetQuery.trim(),
                      ]);
                    }
                    setFacetQuery("");
                  }
                }}
              />

              <div className="absolute inset-y-0 right-0 flex items-center text-muted-foreground pr-2">
                <span className="text-xs">Enter</span>
                <CornerDownLeftIcon size={16} className="ml-1" />
              </div>
            </div>
          </div>

          {/* Show manually added values */}
          {checkedValues.length > 0 && (
            <ul className="divide-y border-b">
              {checkedValues.map((value) => (
                <li
                  key={value}
                  className="px-4 py-2 flex items-center justify-between text-sm bg-muted/50"
                >
                  <div className="flex items-center">
                    <Checkbox
                      checked={true}
                      className="mr-2"
                      onCheckedChange={handleCheckedChange(value)}
                    />
                    <span title={value}>{value.slice(0, 28)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {loading && (
            <div className="mt-2 flex items-center justify-center">
              <Loading />
            </div>
          )}

          <ul className="divide-y max-h-[300px] overflow-y-auto">
            {facets?.hits
              ?.filter((f) => !checkedValues.includes(f.value))
              .map((facet) => (
                <li
                  key={facet.value}
                  className="px-4 py-2 flex items-center justify-between text-sm"
                >
                  <div className="flex items-center">
                    <Checkbox
                      checked={checkedValues.includes(facet.value)}
                      className="mr-2"
                      onCheckedChange={handleCheckedChange(facet.value)}
                    />

                    <span title={facet.value}>{facet.value.slice(0, 28)}</span>
                  </div>

                  <span className="text-muted-foreground">
                    {sf(facet.count)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  );
};
