import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// Warm, minimal transactional emails. All copy comes through the props —
// the callers translate with emailTranslator (email.* keys).

const styles = {
  body: {
    backgroundColor: "#faf7f2",
    fontFamily:
      "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: "#1b1b1b",
    padding: "24px 0",
  },
  container: {
    backgroundColor: "#fffdf9",
    border: "1px solid #e9e1d3",
    borderRadius: "12px",
    margin: "0 auto",
    padding: "32px",
    maxWidth: "520px",
  },
  brand: {
    color: "#1f4e79",
    fontSize: "20px",
    fontWeight: 700,
    margin: "0 0 24px",
  },
  h1: { fontSize: "22px", margin: "0 0 12px", color: "#1b1b1b" },
  text: { fontSize: "15px", lineHeight: "24px", margin: "0 0 8px" },
  detail: {
    backgroundColor: "#faf7f2",
    border: "1px solid #e9e1d3",
    borderRadius: "8px",
    padding: "16px",
    margin: "16px 0",
  },
  code: {
    fontSize: "18px",
    fontWeight: 700,
    letterSpacing: "2px",
    color: "#c8663a",
    margin: "0",
  },
  button: {
    backgroundColor: "#1f4e79",
    borderRadius: "8px",
    color: "#faf7f2",
    display: "inline-block",
    fontSize: "15px",
    fontWeight: 600,
    padding: "12px 20px",
    textDecoration: "none",
  },
  muted: { fontSize: "13px", color: "#6d675d", margin: "16px 0 0" },
} as const;

export type BookingEmailProps = {
  siteName: string;
  preview: string;
  heading: string;
  intro: string;
  restaurantName: string;
  dateLine: string; // "Σάββατο 5 Σεπτεμβρίου · 20:00"
  partyLine: string; // "4 guests"
  confirmationCodeLabel?: string;
  confirmationCode?: string;
  address?: string | null;
  ctaLabel?: string;
  ctaUrl?: string;
  footer: string;
};

export function BookingEmail(props: BookingEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{props.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>{props.siteName}</Text>
          <Heading style={styles.h1}>{props.heading}</Heading>
          <Text style={styles.text}>{props.intro}</Text>
          <Section style={styles.detail}>
            <Text style={{ ...styles.text, fontWeight: 700 }}>
              {props.restaurantName}
            </Text>
            <Text style={styles.text}>{props.dateLine}</Text>
            <Text style={styles.text}>{props.partyLine}</Text>
            {props.address ? (
              <Text style={styles.text}>{props.address}</Text>
            ) : null}
            {props.confirmationCode ? (
              <>
                <Text style={{ ...styles.muted, margin: "12px 0 2px" }}>
                  {props.confirmationCodeLabel}
                </Text>
                <Text style={styles.code}>{props.confirmationCode}</Text>
              </>
            ) : null}
          </Section>
          {props.ctaUrl && props.ctaLabel ? (
            <Button href={props.ctaUrl} style={styles.button}>
              {props.ctaLabel}
            </Button>
          ) : null}
          <Text style={styles.muted}>{props.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}
