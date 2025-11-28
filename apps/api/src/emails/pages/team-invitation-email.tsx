import * as React from "react";
import { Head } from "../components/head";
import { Section } from "../components/section";
import { Text } from "../components/text";
import { Body } from "../components/body";
import { Container } from "../components/container";
import { containerStyle } from "../utils";
import { Html } from "@react-email/html";
import { Button } from "../components/button";

interface Props {
  link: string;
}

export function TeamInvitationEmail({ link }: Props) {
  return (
    <Html>
      <Head>
        <title>Team Invitation</title>
      </Head>

      <Body>
        <Container style={containerStyle}>
          <Section style={{ textAlign: "center" }}>
            <Text
              style={{
                whiteSpace: "pre-line",
              }}
            >
              You have been invited to join a team. Please click the link below
              to accept the invitation.
            </Text>
            <Button href={link}>Accept Invitation</Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
