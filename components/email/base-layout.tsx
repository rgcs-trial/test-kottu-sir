import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";

interface BaseEmailLayoutProps {
  children: React.ReactNode;
  preview: string;
  title?: string;
  showFooter?: boolean;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function BaseEmailLayout({
  children,
  preview,
  title = "Restaurant Platform",
  showFooter = true,
}: BaseEmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto py-5 px-5">
            {/* Header */}
            <Section className="text-center py-5 border-b border-gray-200">
              <Img
                src={`${baseUrl}/logo.png`}
                width="120"
                height="40"
                alt="Restaurant Platform"
                className="mx-auto mb-4"
              />
              <Heading className="text-2xl font-bold text-gray-900 m-0">
                {title}
              </Heading>
            </Section>

            {/* Content */}
            <Section className="py-8">
              {children}
            </Section>

            {/* Footer */}
            {showFooter && (
              <Section className="border-t border-gray-200 pt-8 text-center">
                <Text className="text-sm text-gray-500 mb-4">
                  You're receiving this email because you have an account with Restaurant Platform.
                </Text>
                <Text className="text-sm text-gray-500 mb-4">
                  <Link
                    href={`${baseUrl}/unsubscribe`}
                    className="text-blue-600 underline"
                  >
                    Unsubscribe
                  </Link>
                  {" | "}
                  <Link
                    href={`${baseUrl}/privacy`}
                    className="text-blue-600 underline"
                  >
                    Privacy Policy
                  </Link>
                  {" | "}
                  <Link
                    href={`${baseUrl}/terms`}
                    className="text-blue-600 underline"
                  >
                    Terms of Service
                  </Link>
                </Text>
                <Text className="text-xs text-gray-400">
                  Restaurant Platform, Inc. • 123 Business St, Suite 100 • City, State 12345
                </Text>
              </Section>
            )}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

// Reusable components for email templates
export function EmailButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const baseClasses = "inline-block px-6 py-3 rounded-lg text-decoration-none font-medium text-center";
  const variantClasses = variant === "primary" 
    ? "bg-blue-600 text-white hover:bg-blue-700"
    : "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300";
  
  return (
    <Link
      href={href}
      className={`${baseClasses} ${variantClasses}`}
    >
      {children}
    </Link>
  );
}

export function EmailCard({ children }: { children: React.ReactNode }) {
  return (
    <Section className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
      {children}
    </Section>
  );
}

export function EmailDivider() {
  return <Section className="border-t border-gray-200 my-6" />;
}