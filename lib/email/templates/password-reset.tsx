import {
  Heading,
  Text,
  Section,
  Row,
  Column,
  Img,
} from "@react-email/components";
import { BaseEmailLayout, EmailButton, EmailCard } from "../../../components/email/base-layout";
import { PasswordResetEmailData, formatDateTime } from "../react-email-config";

export interface PasswordResetProps extends PasswordResetEmailData {
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  requestTime?: Date;
}

export default function PasswordResetEmail({
  userName,
  resetUrl,
  expiresAt,
  ipAddress,
  userAgent,
  location,
  requestTime = new Date(),
}: PasswordResetProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const expirationTime = new Date(expiresAt);
  const timeUntilExpiry = Math.round((expirationTime.getTime() - Date.now()) / (1000 * 60)); // minutes

  return (
    <BaseEmailLayout
      preview="Reset your Restaurant Platform password"
      title="Password Reset Request"
    >
      {/* Header */}
      <Section className="text-center mb-8">
        <Img
          src={`${baseUrl}/icons/lock.png`}
          width="64"
          height="64"
          alt="Security"
          className="mx-auto mb-4"
        />
        <Heading className="text-3xl font-bold text-gray-900 mb-2">
          Reset Your Password
        </Heading>
        <Text className="text-lg text-gray-600">
          Hi {userName}, we received a request to reset your password.
        </Text>
      </Section>

      {/* Reset Instructions */}
      <EmailCard>
        <Section>
          <Heading className="text-xl font-semibold text-gray-900 mb-4">
            Password Reset Request
          </Heading>
          <Text className="text-gray-600 mb-6">
            Someone requested a password reset for your Restaurant Platform account. 
            If this was you, click the button below to reset your password.
          </Text>
          
          <Section className="text-center mb-6">
            <EmailButton href={resetUrl} variant="primary">
              Reset My Password
            </EmailButton>
          </Section>

          <Text className="text-sm text-gray-500 mb-4">
            This link will expire in {timeUntilExpiry} minutes at {formatDateTime(expirationTime)}.
          </Text>

          <Text className="text-sm text-gray-600">
            If the button doesn't work, you can copy and paste this link into your browser:
          </Text>
          <Text className="text-sm text-blue-600 break-all bg-gray-50 p-3 rounded mt-2">
            {resetUrl}
          </Text>
        </Section>
      </EmailCard>

      {/* Security Information */}
      {(ipAddress || userAgent || location) && (
        <EmailCard>
          <Heading className="text-xl font-semibold text-gray-900 mb-4">
            Security Information
          </Heading>
          <Text className="text-gray-600 mb-4">
            For your security, here are the details of this password reset request:
          </Text>
          
          <Section>
            <Text className="text-sm text-gray-700 mb-2">
              <strong>Request Time:</strong> {formatDateTime(requestTime)}
            </Text>
            {ipAddress && (
              <Text className="text-sm text-gray-700 mb-2">
                <strong>IP Address:</strong> {ipAddress}
              </Text>
            )}
            {location && (
              <Text className="text-sm text-gray-700 mb-2">
                <strong>Location:</strong> {location}
              </Text>
            )}
            {userAgent && (
              <Text className="text-sm text-gray-700 mb-2">
                <strong>Device:</strong> {userAgent}
              </Text>
            )}
          </Section>
        </EmailCard>
      )}

      {/* Security Tips */}
      <EmailCard>
        <Heading className="text-xl font-semibold text-gray-900 mb-4">
          Password Security Tips
        </Heading>
        <Text className="text-gray-600 mb-4">
          When creating your new password, please follow these best practices:
        </Text>
        
        <Section>
          <Text className="text-sm text-gray-700 mb-2">
            ✓ Use at least 8 characters
          </Text>
          <Text className="text-sm text-gray-700 mb-2">
            ✓ Include uppercase and lowercase letters
          </Text>
          <Text className="text-sm text-gray-700 mb-2">
            ✓ Add numbers and special characters
          </Text>
          <Text className="text-sm text-gray-700 mb-2">
            ✓ Avoid common words or personal information
          </Text>
          <Text className="text-sm text-gray-700 mb-4">
            ✓ Don't reuse passwords from other accounts
          </Text>
        </Section>

        <Text className="text-sm text-gray-600">
          Consider using a password manager to generate and store strong, unique passwords.
        </Text>
      </EmailCard>

      {/* Warning Section */}
      <EmailCard>
        <Section className="bg-red-50 border border-red-200 rounded-lg p-4">
          <Row>
            <Column width="40">
              <Img
                src={`${baseUrl}/icons/warning.png`}
                width="32"
                height="32"
                alt="Warning"
                className="mx-auto"
              />
            </Column>
            <Column>
              <Heading className="text-lg font-semibold text-red-800 mb-2">
                Didn't Request This?
              </Heading>
              <Text className="text-sm text-red-700 mb-4">
                If you didn't request a password reset, please ignore this email. 
                Your password will remain unchanged.
              </Text>
              <Text className="text-sm text-red-700">
                If you're concerned about your account security, please contact our support team immediately.
              </Text>
            </Column>
          </Row>
        </Section>
      </EmailCard>

      {/* Account Protection */}
      <EmailCard>
        <Heading className="text-xl font-semibold text-gray-900 mb-4">
          Protect Your Account
        </Heading>
        <Text className="text-gray-600 mb-4">
          Keep your account secure with these additional measures:
        </Text>
        
        <Row className="mb-4">
          <Column width="60">
            <Img
              src={`${baseUrl}/icons/2fa.png`}
              width="48"
              height="48"
              alt="Two-Factor Authentication"
              className="mx-auto"
            />
          </Column>
          <Column>
            <Heading className="text-lg font-semibold text-gray-900 mb-2">
              Enable Two-Factor Authentication
            </Heading>
            <Text className="text-gray-600 text-sm mb-2">
              Add an extra layer of security to your account.
            </Text>
            <EmailButton href={`${baseUrl}/profile/security`} variant="secondary">
              Enable 2FA
            </EmailButton>
          </Column>
        </Row>

        <Row className="mb-4">
          <Column width="60">
            <Img
              src={`${baseUrl}/icons/activity.png`}
              width="48"
              height="48"
              alt="Account Activity"
              className="mx-auto"
            />
          </Column>
          <Column>
            <Heading className="text-lg font-semibold text-gray-900 mb-2">
              Monitor Account Activity
            </Heading>
            <Text className="text-gray-600 text-sm mb-2">
              Review recent login activity and sessions.
            </Text>
            <EmailButton href={`${baseUrl}/profile/activity`} variant="secondary">
              View Activity
            </EmailButton>
          </Column>
        </Row>
      </EmailCard>

      {/* Support Section */}
      <Section className="text-center mt-8">
        <Text className="text-gray-600 mb-4">
          Need help with your account?
        </Text>
        <Row>
          <Column width="50%" className="pr-2">
            <EmailButton href={`${baseUrl}/help/password-reset`} variant="secondary">
              Password Help
            </EmailButton>
          </Column>
          <Column width="50%" className="pl-2">
            <EmailButton href={`${baseUrl}/support`} variant="secondary">
              Contact Support
            </EmailButton>
          </Column>
        </Row>
      </Section>

      {/* Footer Warning */}
      <Section className="text-center mt-8">
        <Text className="text-sm text-gray-500 mb-2">
          This password reset link will expire in {timeUntilExpiry} minutes.
        </Text>
        <Text className="text-xs text-gray-400">
          For security reasons, this email was sent from an automated system. 
          Please do not reply to this email.
        </Text>
      </Section>

      {/* Security Notice */}
      <Section className="bg-gray-50 rounded-lg p-4 mt-8">
        <Text className="text-xs text-gray-600 text-center">
          🔒 This email contains sensitive security information. 
          Please keep it confidential and delete it after use.
        </Text>
      </Section>
    </BaseEmailLayout>
  );
}