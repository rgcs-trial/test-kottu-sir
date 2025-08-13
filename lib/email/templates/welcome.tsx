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
import { WelcomeEmailData } from "../react-email-config";

export interface WelcomeEmailProps extends WelcomeEmailData {
  verificationUrl?: string;
  featuredRestaurants?: Array<{
    id: string;
    name: string;
    cuisine: string;
    image: string;
    rating: number;
    deliveryTime: string;
  }>;
  promoCode?: string;
  promoDiscount?: number;
}

export default function WelcomeEmail({
  userName,
  loginUrl,
  supportUrl,
  verificationUrl,
  featuredRestaurants = [],
  promoCode,
  promoDiscount,
}: WelcomeEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <BaseEmailLayout
      preview={`Welcome to Restaurant Platform, ${userName}!`}
      title="Welcome to Restaurant Platform!"
    >
      {/* Welcome Header */}
      <Section className="text-center mb-8">
        <Img
          src={`${baseUrl}/icons/welcome.png`}
          width="80"
          height="80"
          alt="Welcome"
          className="mx-auto mb-4"
        />
        <Heading className="text-3xl font-bold text-blue-600 mb-2">
          Welcome to Restaurant Platform!
        </Heading>
        <Text className="text-lg text-gray-600">
          Hi {userName}, we're excited to have you join our community of food lovers!
        </Text>
      </Section>

      {/* Email Verification */}
      {verificationUrl && (
        <EmailCard>
          <Section className="text-center">
            <Heading className="text-xl font-semibold text-gray-900 mb-4">
              Verify Your Email Address
            </Heading>
            <Text className="text-gray-600 mb-6">
              To get started, please verify your email address by clicking the button below:
            </Text>
            <EmailButton href={verificationUrl} variant="primary">
              Verify Email Address
            </EmailButton>
          </Section>
        </EmailCard>
      )}

      {/* Welcome Offer */}
      {promoCode && promoDiscount && (
        <EmailCard>
          <Section className="text-center">
            <Img
              src={`${baseUrl}/icons/gift.png`}
              width="48"
              height="48"
              alt="Gift"
              className="mx-auto mb-4"
            />
            <Heading className="text-xl font-semibold text-gray-900 mb-4">
              Welcome Offer: {promoDiscount}% Off Your First Order!
            </Heading>
            <Text className="text-gray-600 mb-4">
              As a welcome gift, enjoy {promoDiscount}% off your first order with code:
            </Text>
            <Section 
              className="inline-block bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg px-6 py-4 mb-6"
            >
              <Text className="text-2xl font-bold text-blue-600 letter-spacing-wide">
                {promoCode}
              </Text>
            </Section>
            <Text className="text-sm text-gray-500 mb-6">
              Valid for 30 days on orders over $15. Cannot be combined with other offers.
            </Text>
            <EmailButton href={`${baseUrl}/restaurants`} variant="primary">
              Start Ordering Now
            </EmailButton>
          </Section>
        </EmailCard>
      )}

      {/* Getting Started Guide */}
      <EmailCard>
        <Heading className="text-xl font-semibold text-gray-900 mb-6">
          Getting Started
        </Heading>
        
        <Row className="mb-6">
          <Column width="60">
            <Img
              src={`${baseUrl}/icons/browse.png`}
              width="48"
              height="48"
              alt="Browse"
              className="mx-auto"
            />
          </Column>
          <Column>
            <Heading className="text-lg font-semibold text-gray-900 mb-2">
              1. Browse Restaurants
            </Heading>
            <Text className="text-gray-600 text-sm">
              Discover amazing local restaurants and cuisines in your area.
            </Text>
          </Column>
        </Row>

        <Row className="mb-6">
          <Column width="60">
            <Img
              src={`${baseUrl}/icons/order.png`}
              width="48"
              height="48"
              alt="Order"
              className="mx-auto"
            />
          </Column>
          <Column>
            <Heading className="text-lg font-semibold text-gray-900 mb-2">
              2. Place Your Order
            </Heading>
            <Text className="text-gray-600 text-sm">
              Add items to your cart and checkout securely with multiple payment options.
            </Text>
          </Column>
        </Row>

        <Row className="mb-6">
          <Column width="60">
            <Img
              src={`${baseUrl}/icons/track.png`}
              width="48"
              height="48"
              alt="Track"
              className="mx-auto"
            />
          </Column>
          <Column>
            <Heading className="text-lg font-semibold text-gray-900 mb-2">
              3. Track & Enjoy
            </Heading>
            <Text className="text-gray-600 text-sm">
              Follow your order in real-time and enjoy your delicious meal!
            </Text>
          </Column>
        </Row>
      </EmailCard>

      {/* Featured Restaurants */}
      {featuredRestaurants.length > 0 && (
        <EmailCard>
          <Heading className="text-xl font-semibold text-gray-900 mb-6">
            Popular Restaurants Near You
          </Heading>
          
          {featuredRestaurants.slice(0, 3).map((restaurant, index) => (
            <Section key={restaurant.id} className={index < 2 ? "mb-6" : ""}>
              <Row>
                <Column width="80">
                  <Img
                    src={restaurant.image}
                    width="70"
                    height="70"
                    alt={restaurant.name}
                    className="rounded-lg"
                  />
                </Column>
                <Column>
                  <Heading className="text-lg font-semibold text-gray-900 mb-1">
                    {restaurant.name}
                  </Heading>
                  <Text className="text-sm text-gray-600 mb-1">
                    {restaurant.cuisine}
                  </Text>
                  <Row>
                    <Column width="50%">
                      <Text className="text-sm text-gray-500">
                        ⭐ {restaurant.rating}
                      </Text>
                    </Column>
                    <Column width="50%">
                      <Text className="text-sm text-gray-500">
                        🕒 {restaurant.deliveryTime}
                      </Text>
                    </Column>
                  </Row>
                </Column>
              </Row>
              {index < featuredRestaurants.length - 1 && <EmailDivider />}
            </Section>
          ))}
          
          <Section className="text-center mt-6">
            <EmailButton href={`${baseUrl}/restaurants`} variant="secondary">
              View All Restaurants
            </EmailButton>
          </Section>
        </EmailCard>
      )}

      {/* Account Management */}
      <EmailCard>
        <Heading className="text-xl font-semibold text-gray-900 mb-4">
          Manage Your Account
        </Heading>
        <Text className="text-gray-600 mb-6">
          Your account gives you access to order history, saved addresses, payment methods, and more.
        </Text>
        
        <Row>
          <Column width="50%" className="pr-4">
            <EmailButton href={loginUrl} variant="secondary">
              Access Your Account
            </EmailButton>
          </Column>
          <Column width="50%" className="pl-4">
            <EmailButton href={`${baseUrl}/profile`} variant="secondary">
              Update Profile
            </EmailButton>
          </Column>
        </Row>
      </EmailCard>

      {/* App Download */}
      <EmailCard>
        <Section className="text-center">
          <Heading className="text-xl font-semibold text-gray-900 mb-4">
            Get Our Mobile App
          </Heading>
          <Text className="text-gray-600 mb-6">
            Order faster and get exclusive mobile-only deals with our app.
          </Text>
          
          <Row>
            <Column width="50%" className="pr-2">
              <Link href="#" className="block">
                <Img
                  src={`${baseUrl}/images/app-store.png`}
                  width="140"
                  height="40"
                  alt="Download on App Store"
                  className="mx-auto"
                />
              </Link>
            </Column>
            <Column width="50%" className="pl-2">
              <Link href="#" className="block">
                <Img
                  src={`${baseUrl}/images/google-play.png`}
                  width="140"
                  height="40"
                  alt="Get it on Google Play"
                  className="mx-auto"
                />
              </Link>
            </Column>
          </Row>
        </Section>
      </EmailCard>

      {/* Social Media */}
      <Section className="text-center mt-8 mb-8">
        <Text className="text-gray-600 mb-4">
          Follow us for the latest updates and deals:
        </Text>
        <Row>
          <Column width="25%">
            <Link href="#" className="block">
              <Img
                src={`${baseUrl}/icons/facebook.png`}
                width="32"
                height="32"
                alt="Facebook"
                className="mx-auto"
              />
            </Link>
          </Column>
          <Column width="25%">
            <Link href="#" className="block">
              <Img
                src={`${baseUrl}/icons/twitter.png`}
                width="32"
                height="32"
                alt="Twitter"
                className="mx-auto"
              />
            </Link>
          </Column>
          <Column width="25%">
            <Link href="#" className="block">
              <Img
                src={`${baseUrl}/icons/instagram.png`}
                width="32"
                height="32"
                alt="Instagram"
                className="mx-auto"
              />
            </Link>
          </Column>
          <Column width="25%">
            <Link href="#" className="block">
              <Img
                src={`${baseUrl}/icons/youtube.png`}
                width="32"
                height="32"
                alt="YouTube"
                className="mx-auto"
              />
            </Link>
          </Column>
        </Row>
      </Section>

      {/* Help and Support */}
      <Section className="text-center mt-8">
        <Text className="text-gray-600 mb-4">
          Need help getting started?
        </Text>
        <Row>
          <Column width="50%" className="pr-2">
            <EmailButton href={`${baseUrl}/help`} variant="secondary">
              Help Center
            </EmailButton>
          </Column>
          <Column width="50%" className="pl-2">
            <EmailButton href={supportUrl} variant="secondary">
              Contact Support
            </EmailButton>
          </Column>
        </Row>
      </Section>

      {/* Final CTA */}
      <Section className="text-center mt-8 mb-8">
        <Text className="text-lg text-gray-700 mb-6">
          Ready to order some delicious food?
        </Text>
        <EmailButton href={`${baseUrl}/restaurants`} variant="primary">
          Explore Restaurants
        </EmailButton>
      </Section>
    </BaseEmailLayout>
  );
}