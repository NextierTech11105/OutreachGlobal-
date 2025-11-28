import { TeamRegistrationForm } from "@/features/team/components/team-registration-form";
import { TEAM_INVITATION_BY_CODE_QUERY } from "@/features/team/queries/team-member.queries";
import { getApolloClient } from "@/graphql/apollo-client";
import { PageProps } from "@/types/route.type";

const getInvitation = async (code: string) => {
  try {
    const { data } = await getApolloClient().query({
      query: TEAM_INVITATION_BY_CODE_QUERY,
      variables: { code },
    });
    return data.teamInvitationByCode;
  } catch (error) {
    return null;
  }
};

export default async function Page({ params }: PageProps<{ id: string }>) {
  const { id } = await params;
  const invitation = await getInvitation(id);

  if (!invitation) {
    return (
      <div>
        <p>Invitation not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Invitation
          </h1>
          <p className="text-muted-foreground">
            Create your account to join the team
          </p>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <TeamRegistrationForm code={id} email={invitation.email} />
        </div>
      </div>
    </div>
  );
}
