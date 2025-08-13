import {
  Heading,
  Text,
  Section,
  Row,
  Column,
  Img,
  Link,
} from "@react-email/components";
import { BaseEmailLayout, EmailButton, EmailCard, EmailDivider } from "../../../components/email/base-layout";
import { RestaurantEmailData } from "../react-email-config";

export interface RestaurantWelcomeProps extends RestaurantEmailData {
  verificationUrl?: string;
  setupSteps?: Array<{
    title: string;
    description: string;
    completed: boolean;
    url?: string;
  }>;
  approvalStatus?: "pending" | "approved" | "rejected";
  stripeOnboardingUrl?: string;
  menuUploadUrl?: string;
  supportPhoneNumber?: string;
}

export default function RestaurantWelcomeEmail({
  restaurantName,
  ownerName,
  dashboardUrl,
  onboardingUrl,
  supportUrl,
  verificationUrl,
  setupSteps = [],
  approvalStatus = "pending",
  stripeOnboardingUrl,
  menuUploadUrl,
  supportPhoneNumber,
}: RestaurantWelcomeProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const defaultSetupSteps = [
    {
      title: "Verify Your Email",
      description: "Confirm your email address to secure your account",
      completed: !verificationUrl,
      url: verificationUrl,
    },
    {
      title: "Complete Restaurant Profile",
      description: "Add your restaurant details, hours, and contact information",
      completed: false,
      url: `${dashboardUrl}/restaurant`,
    },
    {
      title: "Upload Your Menu",
      description: "Add your menu items, prices, and descriptions",
      completed: false,
      url: menuUploadUrl || `${dashboardUrl}/menu`,
    },
    {
      title: "Set Up Payment Processing",
      description: "Connect your Stripe account to receive payments",
      completed: false,
      url: stripeOnboardingUrl,
    },
    {
      title: "Configure Delivery Settings",
      description: "Set your delivery zones, fees, and minimum orders",
      completed: false,
      url: `${dashboardUrl}/delivery`,
    },
  ];

  const steps = setupSteps.length > 0 ? setupSteps : defaultSetupSteps;
  const completedSteps = steps.filter(step => step.completed).length;
  const completionPercentage = Math.round((completedSteps / steps.length) * 100);

  return (
    <BaseEmailLayout
      preview={`Welcome to Restaurant Platform, ${restaurantName}!`}
      title="Welcome to Restaurant Platform!"
    >
      {/* Welcome Header */}
      <Section className="text-center mb-8">
        <Img
          src={`${baseUrl}/icons/restaurant-welcome.png`}
          width="80"
          height="80"
          alt="Welcome"
          className="mx-auto mb-4"
        />
        <Heading className="text-3xl font-bold text-green-600 mb-2">
          Welcome to Restaurant Platform!
        </Heading>
        <Text className="text-lg text-gray-600">
          Hi {ownerName}, we're excited to partner with {restaurantName}!
        </Text>
      </Section>

      {/* Approval Status */}
      {approvalStatus === "pending" && (
        <EmailCard>
          <Section className="text-center">
            <Img
              src={`${baseUrl}/icons/pending.png`}
              width="48"
              height="48"
              alt="Pending"
              className="mx-auto mb-4"
            />
            <Heading className="text-xl font-semibold text-orange-600 mb-4">
              Account Under Review
            </Heading>
            <Text className="text-gray-600 mb-4">
              Thank you for joining Restaurant Platform! Your restaurant account is currently under review. 
              We'll notify you within 24-48 hours once your account is approved.
            </Text>
            <Text className="text-sm text-gray-500">
              In the meantime, you can complete your restaurant setup to speed up the approval process.
            </Text>
          </Section>
        </EmailCard>
      )}

      {approvalStatus === "approved" && (
        <EmailCard>
          <Section className="text-center">
            <Img
              src={`${baseUrl}/icons/approved.png`}
              width="48"
              height="48"
              alt="Approved"
              className="mx-auto mb-4"
            />
            <Heading className="text-xl font-semibold text-green-600 mb-4">
              Account Approved!
            </Heading>
            <Text className="text-gray-600 mb-6">
              Congratulations! Your restaurant account has been approved. You can now start receiving orders.
            </Text>
            <EmailButton href={dashboardUrl} variant="primary">
              Access Your Dashboard
            </EmailButton>
          </Section>
        </EmailCard>
      )}

      {/* Email Verification */}
      {verificationUrl && (
        <EmailCard>
          <Section className="text-center">
            <Heading className="text-xl font-semibold text-gray-900 mb-4">
              Verify Your Email Address
            </Heading>
            <Text className="text-gray-600 mb-6">
              Please verify your email address to secure your account and complete the setup process:
            </Text>
            <EmailButton href={verificationUrl} variant="primary">
              Verify Email Address
            </EmailButton>
          </Section>
        </EmailCard>
      )}

      {/* Setup Progress */}
      <EmailCard>
        <Heading className="text-xl font-semibold text-gray-900 mb-4">
          Setup Progress
        </Heading>
        
        {/* Progress Bar */}
        <Section className="mb-6">
          <Text className="text-sm text-gray-600 mb-2">
            {completedSteps} of {steps.length} steps completed ({completionPercentage}%)
          </Text>
          <div 
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden'
            }}
          >
            <div 
              style={{
                width: `${completionPercentage}%`,
                height: '100%',
                backgroundColor: '#059669',
                borderRadius: '4px'
              }}
            />
          </div>
        </Section>

        {/* Setup Steps */}
        {steps.map((step, index) => (
          <Section key={index} className={index < steps.length - 1 ? "mb-4" : ""}>
            <Row>
              <Column width="40">
                <div 
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: step.completed ? '#059669' : '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  {step.completed ? '✓' : index + 1}
                </div>
              </Column>
              <Column>
                <Heading className={`text-lg font-semibold mb-1 ${step.completed ? 'text-green-600' : 'text-gray-900'}`}>
                  {step.title}
                </Heading>
                <Text className="text-sm text-gray-600 mb-2">
                  {step.description}
                </Text>
                {!step.completed && step.url && (
                  <EmailButton href={step.url} variant="secondary">
                    Complete Step
                  </EmailButton>
                )}
                {step.completed && (
                  <Text className="text-sm font-medium text-green-600">
                    ✓ Completed
                  </Text>
                )}
              </Column>
            </Row>
            {index < steps.length - 1 && <EmailDivider />}
          </Section>
        ))}

        {completionPercentage < 100 && (
          <Section className="text-center mt-6">
            <EmailButton href={onboardingUrl || dashboardUrl} variant="primary">
              Continue Setup
            </EmailButton>
          </Section>
        )}
      </EmailCard>

      {/* Platform Benefits */}
      <EmailCard>
        <Heading className="text-xl font-semibold text-gray-900 mb-6">
          Why Partner With Us?
        </Heading>
        
        <Row className="mb-4">
          <Column width="60">
            <Img
              src={`${baseUrl}/icons/customers.png`}
              width="48"
              height="48"
              alt="Customers"
              className="mx-auto"
            />
          </Column>
          <Column>
            <Heading className="text-lg font-semibold text-gray-900 mb-2">
              Reach More Customers
            </Heading>
            <Text className="text-gray-600 text-sm">
              Connect with hungry customers in your area and grow your business.
            </Text>
          </Column>
        </Row>

        <Row className="mb-4">
          <Column width="60">
            <Img
              src={`${baseUrl}/icons/payments.png`}
              width="48"
              height="48"
              alt="Payments"
              className="mx-auto"
            />
          </Column>
          <Column>
            <Heading className="text-lg font-semibold text-gray-900 mb-2">
              Secure Payments
            </Heading>
            <Text className="text-gray-600 text-sm">
              Get paid quickly and securely with our integrated payment system.
            </Text>
          </Column>
        </Row>

        <Row className="mb-4">
          <Column width="60">
            <Img
              src={`${baseUrl}/icons/analytics.png`}
              width="48"
              height="48"
              alt="Analytics"
              className="mx-auto"
            />
          </Column>
          <Column>
            <Heading className="text-lg font-semibold text-gray-900 mb-2">
              Business Insights
            </Heading>
            <Text className="text-gray-600 text-sm">
              Track your performance with detailed analytics and reporting.
            </Text>
          </Column>
        </Row>

        <Row>
          <Column width="60">
            <Img
              src={`${baseUrl}/icons/support.png`}
              width="48"
              height="48"
              alt="Support"
              className="mx-auto"
            />
          </Column>
          <Column>
            <Heading className="text-lg font-semibold text-gray-900 mb-2">
              Dedicated Support
            </Heading>
            <Text className="text-gray-600 text-sm">
              Our team is here to help you succeed with 24/7 support.
            </Text>
          </Column>
        </Row>
      </EmailCard>

      {/* Quick Actions */}
      <EmailCard>
        <Heading className="text-xl font-semibold text-gray-900 mb-6">
          Quick Actions
        </Heading>
        
        <Row className="mb-4">
          <Column width="50%" className="pr-2">
            <EmailButton href={dashboardUrl} variant="primary">
              Restaurant Dashboard
            </EmailButton>
          </Column>
          <Column width="50%" className="pl-2">
            <EmailButton href={`${dashboardUrl}/orders`} variant="secondary">
              Manage Orders
            </EmailButton>
          </Column>
        </Row>

        <Row>
          <Column width="50%" className="pr-2">
            <EmailButton href={`${dashboardUrl}/menu`} variant="secondary">
              Update Menu
            </EmailButton>
          </Column>
          <Column width="50%" className="pl-2">
            <EmailButton href={`${dashboardUrl}/analytics`} variant="secondary">
              View Analytics
            </EmailButton>
          </Column>
        </Row>
      </EmailCard>

      {/* Resources */}
      <EmailCard>
        <Heading className="text-xl font-semibold text-gray-900 mb-4">
          Helpful Resources
        </Heading>
        <Text className="text-gray-600 mb-6">
          Everything you need to get started and succeed on our platform:
        </Text>
        
        <Section>
          <Text className="text-sm text-gray-700 mb-2">
            📖 <Link href={`${baseUrl}/help/restaurant-guide`} className="text-blue-600 underline">
              Restaurant Owner's Guide
            </Link>
          </Text>
          <Text className="text-sm text-gray-700 mb-2">
            🎥 <Link href={`${baseUrl}/help/video-tutorials`} className="text-blue-600 underline">
              Video Tutorials
            </Link>
          </Text>
          <Text className="text-sm text-gray-700 mb-2">
            💡 <Link href={`${baseUrl}/help/best-practices`} className="text-blue-600 underline">
              Best Practices for Success
            </Link>
          </Text>
          <Text className="text-sm text-gray-700 mb-2">
            📊 <Link href={`${baseUrl}/help/analytics-guide`} className="text-blue-600 underline">
              Understanding Your Analytics
            </Link>
          </Text>
        </Section>
      </EmailCard>

      {/* Support Information */}
      <EmailCard>
        <Heading className="text-xl font-semibold text-gray-900 mb-4">
          Need Help?
        </Heading>
        <Text className="text-gray-600 mb-4">
          Our restaurant success team is here to help you every step of the way:
        </Text>
        
        <Section>
          <Text className="text-sm text-gray-700 mb-2">
            📧 Email: <Link href={supportUrl} className="text-blue-600 underline">
              restaurant-support@restaurantplatform.com
            </Link>
          </Text>
          {supportPhoneNumber && (
            <Text className="text-sm text-gray-700 mb-2">
              📞 Phone: <Link href={`tel:${supportPhoneNumber}`} className="text-blue-600 underline">
                {supportPhoneNumber}
              </Link>
            </Text>
          )}
          <Text className="text-sm text-gray-700 mb-4">
            💬 Live Chat: Available in your dashboard
          </Text>
        </Section>

        <Section className="text-center">
          <EmailButton href={supportUrl} variant="secondary">
            Contact Support
          </EmailButton>
        </Section>
      </EmailCard>

      {/* Final CTA */}
      <Section className="text-center mt-8 mb-8">
        <Text className="text-lg text-gray-700 mb-6">
          Ready to start accepting orders?
        </Text>
        <EmailButton href={dashboardUrl} variant="primary">
          Go to Dashboard
        </EmailButton>
      </Section>

      {/* Welcome Note */}
      <Section className="text-center mt-8">
        <Text className="text-gray-600 mb-2">
          Welcome to the Restaurant Platform family!
        </Text>
        <Text className="text-sm text-gray-500">
          We're excited to help you grow your business and serve more customers.
        </Text>
      </Section>
    </BaseEmailLayout>
  );
}