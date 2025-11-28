"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useConnectionQuery } from "@/graphql/hooks/use-connection-query";
import { AI_SDR_AVATARS_QUERY } from "../queries/sdr.queries";
import { useCurrentTeam } from "@/features/team/team.context";
import { CursorPagination } from "@/components/pagination/cursor-pagination";
import { createDefaultCursor } from "@/graphql/graphql-utils";
import { useDebounceValue } from "usehooks-ts";
import { useApiError } from "@/hooks/use-api-error";
import { Loading } from "@/components/ui/loading";
import { useModalAlert } from "@/components/ui/modal";
import { useMutation } from "@apollo/client";
import { DELETE_AI_SDR_AVATAR_MUTATION } from "../mutations/sdr.mutations";
import { toast } from "sonner";
import { TeamLink } from "@/features/team/components/team-link";

const LIMIT = 10;
const defaultCursor = createDefaultCursor({
  first: LIMIT,
});

export function AiSdrList() {
  const { team } = useCurrentTeam();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 300);
  const [cursor, setCursor] = useState(defaultCursor);
  const [avatars, pageInfo, { loading, refetch }] = useConnectionQuery(
    AI_SDR_AVATARS_QUERY,
    {
      pick: "aiSdrAvatars",
      variables: {
        ...cursor,
        teamId: team.id,
        searchQuery: debouncedSearchQuery || undefined,
      },
    },
  );

  const { showError } = useApiError();
  const { showAlert } = useModalAlert();
  const [deleteAvatar] = useMutation(DELETE_AI_SDR_AVATAR_MUTATION);

  const confirmDelete = (id: string) => {
    showAlert({
      title: "Delete AI SDR Avatar",
      description: "Are you sure you want to delete this AI SDR avatar?",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await deleteAvatar({ variables: { id, teamId: team.id } });
          toast.success("AI SDR avatar deleted");
          await refetch();
        } catch (error) {
          showError(error, { gql: true });
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border relative bg-card">
        {loading && <Loading />}
        <div className="px-2 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search avatars by name, description, industry or tags..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {avatars?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No AI SDR avatars found.
                </TableCell>
              </TableRow>
            ) : (
              avatars?.map((sdr) => (
                <TableRow key={sdr.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-3">
                      {sdr.avatarUri && (
                        <div className="h-10 w-10 rounded-full overflow-hidden">
                          <img
                            src={sdr.avatarUri}
                            alt={sdr.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <div>{sdr.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {sdr.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{sdr.industry}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {sdr.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                      {sdr.tags.length > 3 && (
                        <Badge variant="outline">+{sdr.tags.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {sdr.active ? (
                      <div className="flex items-center">
                        <CheckCircle className="mr-1 h-4 w-4 text-green-500" />
                        <span>Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <XCircle className="mr-1 h-4 w-4 text-red-500" />
                        <span>Inactive</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuGroup>
                          <DropdownMenuItem asChild>
                            <TeamLink href={`/ai-sdr/${sdr.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </TeamLink>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <TeamLink href={`/ai-sdr/${sdr.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </TeamLink>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => confirmDelete(sdr.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!!pageInfo?.total && (
          <CursorPagination
            data={pageInfo}
            onPageChange={setCursor}
            limit={LIMIT}
            variant="table-footer"
            className="border-t"
          />
        )}
      </div>
    </div>
  );
}
