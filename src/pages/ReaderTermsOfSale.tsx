import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export default function ReaderTermsOfSale() {
  useDocumentMeta({
    title: "Reader Terms of Sale | Authors Bureau",
    description:
      "The terms governing purchases made on the Authors Bureau platform — refunds, delivery, and dispute resolution.",
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 container max-w-3xl py-16 space-y-8">
        <h1 className="font-heading text-3xl md:text-4xl font-bold">Reader Terms of Sale</h1>
        <p className="text-sm text-muted-foreground">Last updated: April 23, 2026</p>

        <section className="space-y-4 text-sm leading-relaxed text-foreground/80">
          <p>
            These Reader Terms of Sale ("Terms of Sale") apply to every purchase made through the Authors Bureau
            platform at <a href="https://authorsbureau.com" className="text-secondary hover:underline">authorsbureau.com</a>{" "}
            ("Platform"). By completing a purchase, you confirm you have read, understood, and agreed to these
            Terms of Sale, our{" "}
            <a href="/terms" className="text-secondary hover:underline">Terms of Service</a> and{" "}
            <a href="/privacy" className="text-secondary hover:underline">Privacy Policy</a>.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">1. Merchant of Record</h2>
          <p>
            Authors Bureau acts as the Merchant of Record for all purchases processed on the Platform via Stripe.
            This means Authors Bureau collects payment, issues your receipt, handles applicable taxes, and is
            responsible for processing eligible refunds. The author whose product you purchased ("Author") is the
            content provider and is responsible for delivering the goods or services described.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">2. Pricing & Currency</h2>
          <p>
            All prices are listed in U.S. dollars (USD) unless otherwise stated. Your card issuer may apply
            currency conversion fees if you pay from a non-USD account. Prices are set by the Author and may
            change without notice; the price displayed at checkout is the price you pay.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">3. Delivery</h2>
          <p>Delivery method depends on the product purchased:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Digital downloads (PDFs, workbooks):</strong> a secure download link is emailed to you immediately after payment.</li>
            <li><strong>Online courses & memberships:</strong> access is granted instantly to your Readers Bureau account using the email you provided at checkout.</li>
            <li><strong>Live events (webinars, coaching, retreats):</strong> joining details are sent by email; you are responsible for attending at the scheduled time.</li>
            <li><strong>Physical goods (Amazon KDP):</strong> fulfilled directly by Amazon under Amazon's terms — Authors Bureau is not the seller for those orders.</li>
          </ul>
          <p>
            If you have not received delivery within 24 hours of payment, please contact{" "}
            <a href="mailto:support@authorsbureau.com" className="text-secondary hover:underline">support@authorsbureau.com</a>.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">4. Refund Policy</h2>
          <p>
            We want you to be satisfied with your purchase. The default refund window for digital products and
            courses is <strong>14 days from the date of purchase</strong>, provided you have not consumed more than
            25% of the course content (where applicable). Authors may set a longer refund window for specific
            products; the policy displayed on the product page at the time of purchase governs.
          </p>
          <p>The following are non-refundable except as required by law:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Live events that have already taken place</li>
            <li>1-on-1 coaching sessions that have been delivered</li>
            <li>Custom or personalised work that has been started</li>
            <li>Retreat deposits within 60 days of the event</li>
          </ul>
          <p>
            To request a refund, email{" "}
            <a href="mailto:support@authorsbureau.com" className="text-secondary hover:underline">support@authorsbureau.com</a>{" "}
            with your order ID. Approved refunds are returned to the original payment method within 5–10 business
            days.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">5. Chargebacks</h2>
          <p>
            Please contact us before initiating a chargeback with your card issuer — we can almost always resolve
            issues directly and faster. Chargebacks filed without first contacting support may be disputed with
            evidence of delivery and consent.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">6. Intellectual Property & Licence</h2>
          <p>
            On purchase you receive a non-exclusive, non-transferable, personal-use licence to the digital content.
            You may not redistribute, resell, publish, or use the content for commercial purposes. All intellectual
            property rights remain with the Author.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">7. Account & Access</h2>
          <p>
            Digital products and courses are tied to the email address you used at checkout. Access through your
            Readers Bureau account is for your personal use only — please do not share login credentials.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">8. External Sales (Amazon, Donations)</h2>
          <p>
            Some product pages link out to third-party sites such as Amazon (KDP paperback / Kindle) or external
            charity donation pages. Purchases or donations made on those external sites are governed by the terms
            of those third parties; Authors Bureau is not a party to those transactions and does not collect or
            process those funds.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">9. Author Responsibilities</h2>
          <p>
            The Author is solely responsible for the accuracy of product descriptions, the quality of the goods
            and services delivered, and any communications outside the Platform. Authors Bureau facilitates the
            transaction and provides delivery infrastructure but does not warrant outcomes from any course,
            coaching, or programme.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">10. Disclaimer & Limitation of Liability</h2>
          <p>
            All products are provided "as is". To the maximum extent permitted by law, Authors Bureau's total
            liability for any purchase is limited to the amount you paid for that purchase. We are not liable for
            indirect, incidental, or consequential damages arising from your use of any product.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">11. Consumer Rights</h2>
          <p>
            Nothing in these Terms of Sale limits your statutory consumer rights under the laws of your country of
            residence (including, where applicable, the EU Consumer Rights Directive, the UK Consumer Rights Act,
            and Australian Consumer Law).
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">12. Changes</h2>
          <p>
            We may update these Terms of Sale from time to time. The version in effect at the time of your
            purchase governs that purchase.
          </p>

          <h2 className="font-heading text-xl font-semibold text-foreground">13. Contact</h2>
          <p>
            Questions about an order? Email{" "}
            <a href="mailto:support@authorsbureau.com" className="text-secondary hover:underline">
              support@authorsbureau.com
            </a>{" "}
            and we'll get back to you within one business day.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
