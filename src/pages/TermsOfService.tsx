import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export default function TermsOfService() {
  useDocumentMeta({
    title: "Terms of Service | Authors Bureau",
    description: "Terms of Service governing your use of the Authors Bureau platform.",
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 container max-w-3xl py-16 space-y-8">
        <h1 className="font-heading text-3xl md:text-4xl font-bold">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: March 21, 2026</p>

        <section className="space-y-4 text-sm leading-relaxed text-foreground/80">
          <h2 className="font-heading text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Authors Bureau platform ("Platform"), including any related services, features,
            content, or applications offered by Authors Bureau ("we," "us," or "our"), you agree to be bound by these
            Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Platform.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">2. Platform Description</h2>
          <p>
            Authors Bureau is an AI-powered platform that helps published authors monetize their books through 28
            revenue streams, including courses, audiobooks, coaching packages, special editions, podcasts, email
            marketing, and more. The Platform also provides microsites, CRM tools, and reader engagement features.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">3. Account Registration</h2>
          <p>
            To access certain features, you must create an account. You agree to provide accurate, current, and
            complete information during registration and to update such information to keep it accurate. You are
            responsible for safeguarding your password and for all activities that occur under your account.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">4. Author Obligations</h2>
          <p>
            As an author on the Platform, you represent and warrant that: (a) you are the rightful author or
            rights-holder of the books you list; (b) all content you upload does not infringe any third-party
            intellectual property rights; (c) you will comply with all applicable laws regarding your products and
            services.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">5. Intellectual Property</h2>
          <p>
            You retain ownership of all content you create and upload to the Platform. By using the Platform, you
            grant us a non-exclusive, worldwide, royalty-free license to display, distribute, and promote your
            content solely in connection with the operation of the Platform and related marketing.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">6. AI-Generated Content</h2>
          <p>
            The Platform uses artificial intelligence to generate marketing copy, course outlines, social media
            content, and other materials. AI-generated content is provided as suggestions and drafts. You are
            solely responsible for reviewing, editing, and approving any AI-generated content before publishing.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">7. Payments & Fees</h2>
          <p>
            Authors Bureau acts as Merchant of Record on every sale. We retain an 8% platform fee on gross sales
            to cover all payment-processing costs (Stripe checkout fees and Stripe Connect transfer fees), so no
            extra processing fees are ever deducted from your share. You keep 92% of every sale, paid out monthly
            to your connected Stripe Express account according to the payout schedule you configure in your account
            settings. All fees are subject to change with reasonable notice.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">8. Refund Policy</h2>
          <p>
            Refund policies for products sold through the Platform are configured by each author. Authors Bureau
            facilitates refund processing but is not responsible for individual author refund decisions beyond the
            platform's standard refund window.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">9. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use the Platform for any unlawful purpose</li>
            <li>Upload content that is defamatory, obscene, or infringes on others' rights</li>
            <li>Attempt to gain unauthorized access to any part of the Platform</li>
            <li>Interfere with the proper operation of the Platform</li>
            <li>Collect user information without consent</li>
            <li>Resell or redistribute Platform features without authorization</li>
          </ul>

          <h2 className="font-heading text-xl font-semibold text-foreground">10. Marketing & Communications</h2>
          <p>
            By creating an account or subscribing to an author's newsletter, you consent to receiving marketing
            communications from Authors Bureau and the respective author. You may unsubscribe from these
            communications at any time using the unsubscribe link provided in each email.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">11. Termination</h2>
          <p>
            We may suspend or terminate your account at any time for violation of these Terms or for any other
            reason at our discretion. Upon termination, your right to use the Platform ceases immediately. You
            may also delete your account at any time through your account settings.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">12. Disclaimer of Warranties</h2>
          <p>
            The Platform is provided "as is" and "as available" without warranties of any kind, either express or
            implied. We do not guarantee that the Platform will be uninterrupted, secure, or error-free.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">13. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Authors Bureau shall not be liable for any indirect, incidental,
            special, consequential, or punitive damages arising out of your use of the Platform.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">14. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify you of material changes via
            email or through the Platform. Your continued use of the Platform after such changes constitutes
            acceptance of the updated Terms.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">15. Contact</h2>
          <p>
            If you have questions about these Terms, please contact us at{" "}
            <a href="mailto:support@authorsbureau.com" className="text-secondary hover:underline">
              support@authorsbureau.com
            </a>.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
