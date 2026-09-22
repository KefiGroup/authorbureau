import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export default function PrivacyPolicy() {
  useDocumentMeta({
    title: "Privacy Policy | Authors Bureau",
    description: "Privacy Policy for the Authors Bureau platform — how we collect, use, and protect your data.",
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <div className="flex-1 container max-w-3xl py-16 space-y-8">
        <h1 className="font-heading text-3xl md:text-4xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: March 21, 2026</p>

        <section className="space-y-4 text-sm leading-relaxed text-foreground/80">
          <h2 className="font-heading text-xl font-semibold text-foreground">1. Introduction</h2>
          <p>
            Authors Bureau ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your information when you use our platform,
            including our website, dashboard, author microsites, and related services.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">2. Information We Collect</h2>
          <p><strong>Information you provide directly:</strong></p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Account information (name, email address, password)</li>
            <li>Author profile data (bio, photo, social media links, credentials)</li>
            <li>Book and product information</li>
            <li>Payment information (processed securely via Stripe)</li>
            <li>Contact form submissions and messages</li>
            <li>Newsletter signup email addresses</li>
            <li>CRM contact data (names, emails, phone numbers, companies, notes)</li>
          </ul>
          <p className="mt-3"><strong>Information collected automatically:</strong></p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Usage data (pages visited, features used, time spent)</li>
            <li>Device information (browser type, operating system)</li>
            <li>IP address and approximate location</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>

          <h2 className="font-heading text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To provide and maintain the Platform</li>
            <li>To process transactions and send related information</li>
            <li>To send promotional communications from Authors Bureau, including platform updates, featured author spotlights, new features, and marketing materials</li>
            <li>To enable authors to communicate with their subscribers and contacts via newsletters and email campaigns</li>
            <li>To populate and maintain CRM records for authors</li>
            <li>To improve our Platform through analytics and AI model training (anonymized)</li>
            <li>To detect and prevent fraud or abuse</li>
          </ul>

          <h2 className="font-heading text-xl font-semibold text-foreground">4. Marketing Communications</h2>
          <p>
            By subscribing to an author's newsletter, submitting a contact form, or creating an account, you
            consent to receiving marketing communications from both the respective author and Authors Bureau.
            These may include:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Author-specific newsletters and book updates</li>
            <li>Authors Bureau promotional materials, featured content, and platform news</li>
            <li>Product announcements and special offers from authors on the Platform</li>
          </ul>
          <p>
            You may opt out of marketing communications at any time by clicking the "unsubscribe" link in any
            email or by contacting us directly.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">5. CRM & Contact Data</h2>
          <p>
            Authors on the Platform use built-in CRM tools to manage their contacts. When you interact with an
            author (e.g., subscribe to their newsletter, send a message, or purchase a product), your contact
            information may be stored in that author's CRM. This data is shared with Authors Bureau for
            consolidated marketing purposes. Each author is responsible for their own communication practices
            with their contacts.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">6. Data Sharing</h2>
          <p>We may share your information with:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Authors:</strong> Contact information is shared with the author whose content or services you interact with</li>
            <li><strong>Service providers:</strong> Third-party services that help us operate (e.g., Stripe for payments, Resend for email delivery)</li>
            <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
          </ul>
          <p>We do not sell your personal information to third parties.</p>

          <h2 className="font-heading text-xl font-semibold text-foreground">7. Data Security</h2>
          <p>
            We implement industry-standard security measures including encryption, secure data storage, and
            access controls. However, no method of transmission over the internet is 100% secure, and we cannot
            guarantee absolute security.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">8. Data Retention</h2>
          <p>
            We retain your information for as long as your account is active or as needed to provide services.
            You may request deletion of your data by contacting us. Some information may be retained as required
            by law or for legitimate business purposes.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">9. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to processing of your data</li>
            <li>Data portability</li>
            <li>Withdraw consent at any time</li>
          </ul>

          <h2 className="font-heading text-xl font-semibold text-foreground">10. Cookies</h2>
          <p>
            We use essential cookies to maintain your session and preferences. We may also use analytics cookies
            to understand how the Platform is used. You can control cookie preferences through your browser settings.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">11. Children's Privacy</h2>
          <p>
            The Platform is not intended for children under 13. We do not knowingly collect information from
            children under 13. If we learn we have collected such information, we will delete it promptly.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes via email
            or through the Platform. Your continued use after changes constitutes acceptance of the updated policy.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">13. Contact Us</h2>
          <p>
            For privacy-related inquiries, contact us at{" "}
            <a href="mailto:support@authorsbureau.com" className="text-secondary hover:underline">
              support@authorsbureau.com
            </a>.
          </p>
        </section>
      </div>
      <Footer />
    </div>
  );
}
