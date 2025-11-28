import * as React from "react";
import { Head } from "../components/head";
import { Section } from "../components/section";
import { Text } from "../components/text";
import { Body } from "../components/body";
import { Container } from "../components/container";
import { containerStyle } from "../utils";
import { Html } from "@react-email/html";

interface Props {
  email: string;
  name?: string | null;
  subject: string;
  content: string;
}

export function MessageEmail({ email, name, subject, content }: Props) {
  return (
    <Html>
      <Head>
        <title>{subject}</title>
      </Head>

      <Body>
        <Container style={containerStyle}>
          <Section>
            <Text>Hello {name || email}</Text>
          </Section>

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
