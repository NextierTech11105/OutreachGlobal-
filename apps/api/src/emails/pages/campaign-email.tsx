import * as React from "react";
import { Head } from "../components/head";
import { Section } from "../components/section";
import { Text } from "../components/text";
import { Body } from "../components/body";
import { Container } from "../components/container";
import { containerStyle } from "../utils";
import { Html } from "@react-email/html";

interface Props {
  content: string;
  subject: string;
}

export function CampaignEmail({ content, subject }: Props) {
  return (
    <Html>
      <Head>
        <title>{subject}</title>
      </Head>

      <Body>
        <Container style={containerStyle}>
          <Section>
            <Text
              style={{
                whiteSpace: "pre-line",
              }}
            >
              {content}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
