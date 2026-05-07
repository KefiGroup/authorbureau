/**
 * Dynamic copy helpers for product pages.
 * Used for CTA text, taglines, section headings, persona generation,
 * trust signals, trust bar, and quick stats.
 */

/* ===== CTA Text (Hero) ===== */
export function getProductCTAText(type: string, authorFirstName: string): string {
  const map: Record<string, string> = {
    workbook: "Get the Workbook",
    onlinecourse: "Enroll Now",
    homestudy: "Start the Program",
    audiobook: "Listen Now",
    coaching: "Book a Session",
    group_coaching: "Join the Group",
    membership: "Become a Member",
    coaching_membership: "Become a Member",
    webinar: "Register Now",
    workshop: "Reserve Your Spot",
    speaking: `Book ${authorFirstName}`,
    keynote: `Book ${authorFirstName}`,
    consulting: "Schedule a Consultation",
    mastermind: "Apply Now",
    retreat: "Reserve Your Spot",
    bootcamp: "Reserve Your Spot",
    training: "Enroll Your Team",
    certification: "Get Certified",
    convention: "Get Tickets",
    special_edition: "Order Now",
    podcast: "Listen Now",
    big_ticket: "Get Access",
    companion_journal: "Get the Journal",
    assessment: "Take the Assessment",
    templates: "Get the Toolkit",
    book_club_kit: "Get the Kit",
    media_kit: "Download Media Kit",
    affiliate: "Become an Affiliate",
    corporate: "Request a Quote",
    licensing: "Request Licensing Info",
    franchise: "Apply for Partnership",
  };
  return map[type] || "Get Access";
}

/* ===== CTA Text (Book Page Card) ===== */
export function getProductCardCTAText(type: string): string {
  const map: Record<string, string> = {
    workbook: "Get the Workbook →",
    onlinecourse: "Start Learning →",
    homestudy: "Start Studying →",
    audiobook: "Get the Audiobook →",
    coaching: "Book Coaching →",
    group_coaching: "Join the Group →",
    membership: "Join Now →",
    coaching_membership: "Join Now →",
    webinar: "Register →",
    workshop: "Join the Workshop →",
    speaking: "Book for Your Event →",
    keynote: "Book for Your Event →",
    consulting: "Get Started →",
    mastermind: "Apply Now →",
    retreat: "Reserve Your Spot →",
    bootcamp: "Reserve Your Spot →",
    training: "Learn More →",
    certification: "Get Certified →",
    convention: "Get Tickets →",
    special_edition: "Order Now →",
    podcast: "Listen Now →",
    big_ticket: "Learn More →",
    companion_journal: "Get the Journal →",
    assessment: "Take the Quiz →",
    templates: "Get the Toolkit →",
    book_club_kit: "Get the Kit →",
    media_kit: "Get Media Kit →",
    affiliate: "Join the Program →",
    corporate: "Get Bulk Pricing →",
    licensing: "Learn More →",
    franchise: "Learn More →",
  };
  return map[type] || "Learn More →";
}

/* ===== Product Hero Tagline ===== */
export function getProductTagline(type: string, bookTitle: string, authorFirstName: string): string {
  const map: Record<string, string> = {
    workbook: `Turn the ideas from ${bookTitle} into action - one exercise at a time.`,
    onlinecourse: `Master the principles of ${bookTitle} with step-by-step video lessons.`,
    homestudy: `A structured, self-paced program to deeply absorb every lesson from ${bookTitle}.`,
    audiobook: `The complete ${bookTitle} experience - narrated for your ears.`,
    coaching: `Personal, one-on-one guidance from ${authorFirstName} to apply ${bookTitle} to your life.`,
    group_coaching: `Learn alongside a community of action-takers, guided by ${authorFirstName}.`,
    membership: `Your ongoing connection to ${authorFirstName}'s latest thinking, tools, and community.`,
    coaching_membership: `Your ongoing connection to ${authorFirstName}'s latest thinking, tools, and community.`,
    webinar: `A live, interactive deep-dive into the most powerful ideas from ${bookTitle}.`,
    workshop: `A hands-on, intensive session to apply ${bookTitle}'s frameworks to your situation.`,
    speaking: `Bring ${authorFirstName}'s transformative message to your audience.`,
    keynote: `Bring ${authorFirstName}'s transformative message to your audience.`,
    consulting: `Strategic, high-impact consulting based on ${authorFirstName}'s proven frameworks.`,
    mastermind: `An exclusive circle of ambitious individuals applying ${bookTitle}'s principles at the highest level.`,
    retreat: `An immersive, transformational experience that brings ${bookTitle} to life.`,
    bootcamp: `An immersive, transformational experience that brings ${bookTitle} to life.`,
    training: `Equip your team with actionable skills from ${bookTitle}.`,
    certification: `Become a certified practitioner of ${authorFirstName}'s ${bookTitle} methodology.`,
    podcast: `Hear ${authorFirstName} discuss the key ideas from ${bookTitle} across top podcasts.`,
    special_edition: `The definitive edition of ${bookTitle} - with exclusive bonus content.`,
    companion_journal: `Reflect, plan, and grow with this guided journal inspired by ${bookTitle}.`,
    assessment: `Discover where you stand - a personalized assessment based on ${bookTitle}.`,
    templates: `Ready-to-use templates and tools to implement ${bookTitle}'s strategies immediately.`,
    book_club_kit: `Everything you need to lead a powerful ${bookTitle} book club discussion.`,
    media_kit: `Press resources, interview topics, and media assets for ${bookTitle}.`,
    affiliate: `Earn commissions by sharing ${bookTitle} and its resources with your audience.`,
    corporate: `Equip your entire team with copies of ${bookTitle} at volume pricing.`,
    licensing: `License ${authorFirstName}'s proven ${bookTitle} framework for your organization.`,
    convention: `Join ${authorFirstName} and fellow readers at the ${bookTitle} experience.`,
    franchise: `Partner with ${authorFirstName} to bring ${bookTitle}'s impact to your market.`,
  };
  return map[type] || `A powerful resource from ${authorFirstName}, built on the foundation of ${bookTitle}.`;
}

/* ===== What's Included Heading ===== */
export function getWhatsIncludedHeading(type: string): string {
  const map: Record<string, string> = {
    workbook: "What's Inside the Workbook",
    onlinecourse: "What You'll Learn",
    homestudy: "What You'll Learn",
    coaching: "What You'll Get",
    consulting: "What You'll Get",
    group_coaching: "What You'll Get",
    membership: "What's Included in Your Membership",
    coaching_membership: "What's Included in Your Membership",
    webinar: "What We'll Cover",
    workshop: "What We'll Cover",
    speaking: "What Your Audience Will Experience",
    keynote: "What Your Audience Will Experience",
    mastermind: "The Experience Includes",
    retreat: "The Experience Includes",
    bootcamp: "The Experience Includes",
    training: "Program Curriculum",
    certification: "Program Curriculum",
    assessment: "What You'll Discover",
    templates: "What's in the Toolkit",
    companion_journal: "Inside the Journal",
    book_club_kit: "What's in the Kit",
    media_kit: "What's Included",
    audiobook: "The Listening Experience",
    special_edition: "What Makes This Edition Special",
  };
  return map[type] || "What's Included";
}

/* ===== Trust Signal (below CTA) ===== */
export function getTrustSignal(type: string): string {
  if (["workbook", "homestudy", "onlinecourse", "special_edition", "audiobook", "companion_journal", "assessment", "templates"].includes(type))
    return "Secure checkout · 30-day money-back guarantee · Instant access";
  if (["coaching", "consulting"].includes(type))
    return "Free discovery call · No commitment required · 100% confidential";
  if (["group_coaching", "membership", "coaching_membership"].includes(type))
    return "Cancel anytime · Private community";
  if (["webinar", "workshop"].includes(type))
    return "Limited spots · Replay included · Certificate of attendance";
  if (["mastermind", "retreat", "bootcamp"].includes(type))
    return "Application required · Limited spots · Premium experience";
  if (["training", "certification"].includes(type))
    return "Accredited program · Team discounts available · Certificate included";
  if (["speaking", "keynote"].includes(type))
    return "Customized for your event · Professional speaker";
  if (["affiliate"].includes(type))
    return "Generous commissions · Real-time tracking · Monthly payouts";
  if (["corporate"].includes(type))
    return "Volume discounts · Custom packaging · Dedicated account manager";
  return "Secure checkout · Satisfaction guaranteed";
}

/* ===== Trust Bar (when no reviews exist) ===== */
export function getTrustBarItems(type: string): string[] {
  const digital = ["workbook", "onlinecourse", "homestudy", "audiobook", "companion_journal", "templates", "assessment", "special_edition"];
  const services = ["coaching", "consulting", "speaking", "keynote"];
  const group = ["group_coaching", "membership", "coaching_membership", "mastermind"];
  const events = ["webinar", "workshop", "retreat", "bootcamp", "convention"];
  const business = ["corporate", "licensing", "franchise", "affiliate"];

  if (digital.includes(type)) return ["Self-Paced Learning", "Expert-Designed Content", "Instant Access"];
  if (services.includes(type)) return ["Personalized Guidance", "Proven Methodology", "Flexible Scheduling"];
  if (group.includes(type)) return ["Supportive Community", "Expert Facilitation", "Ongoing Support"];
  if (events.includes(type)) return ["Live Experience", "Interactive Format", "Networking Opportunities"];
  if (business.includes(type)) return ["Proven Framework", "Scalable Solution", "Dedicated Support"];
  return ["Expert-Designed", "Proven Framework", "Instant Access"];
}

/* ===== Quick Stats Metadata ===== */
export function getQuickStats(type: string, product: any): { label: string; value: string }[] {
  const stats: { label: string; value: string }[] = [];

  if (type === "homestudy") {
    if (product.duration_days) stats.push({ label: "Duration", value: `${product.duration_days} days` });
    const schedule = product.study_schedule_json;
    if (Array.isArray(schedule) && schedule.length > 0) stats.push({ label: "Lessons", value: `${schedule.length} days` });
  }
  if (type === "onlinecourse") {
    // Would need module count from separate query
  }
  if (type === "audiobook") {
    if (product.duration_minutes) {
      const h = Math.floor(product.duration_minutes / 60);
      const m = product.duration_minutes % 60;
      stats.push({ label: "Length", value: `${h}h ${m}m` });
    }
    if (product.narrator_credit) stats.push({ label: "Narrator", value: product.narrator_credit });
  }
  if (["coaching"].includes(type)) {
    if (product.sessions_count) stats.push({ label: "Sessions", value: `${product.sessions_count} sessions` });
    if (product.duration_minutes) stats.push({ label: "Duration", value: `${product.duration_minutes} min each` });
  }
  if (["group_coaching"].includes(type)) {
    if (product.sessions_count) stats.push({ label: "Sessions", value: `${product.sessions_count} sessions` });
  }
  if (["webinar", "workshop"].includes(type)) {
    if (product.duration_minutes) stats.push({ label: "Duration", value: `${product.duration_minutes} min` });
  }

  return stats;
}

/* ===== Go Deeper Section Copy ===== */
export function getGoDeeperCopy(
  products: { type: string }[],
  bookTitle: string,
  authorFirstName: string
): { heading: string; subheading: string } {
  if (products.length === 0) return { heading: "", subheading: "" };

  const types = products.map((p) => p.type);
  const isDigitalOnly = types.every((t) => ["workbook", "onlinecourse", "homestudy", "audiobook", "podcast", "special_edition"].includes(t));
  const isServiceOnly = types.every((t) => ["coaching", "group_coaching", "consulting", "speaking", "keynote", "mastermind", "retreat", "bootcamp", "training", "certification", "webinar", "membership"].includes(t));

  if (products.length === 1) {
    const type = products[0].type;
    const oneLinerMap: Record<string, string> = {
      workbook: `Apply every lesson from ${bookTitle} with this guided workbook - exercises, templates, and action plans included.`,
      onlinecourse: `Go from reading to mastery. This self-paced course walks you through every concept in ${bookTitle} with video lessons and assignments.`,
      homestudy: `Study ${bookTitle} at your own pace with this structured home study program - complete with worksheets and progress tracking.`,
      audiobook: `Listen to ${bookTitle} anywhere. Perfect for your commute, workout, or downtime.`,
      coaching: `Get personalized guidance from ${authorFirstName}. Apply the principles of ${bookTitle} directly to your situation.`,
      group_coaching: `Join a community of readers putting ${bookTitle} into action - with live group sessions led by ${authorFirstName}.`,
      membership: `Get ongoing access to ${authorFirstName}'s latest insights, exclusive content, and a community of like-minded readers.`,
      webinar: `Join ${authorFirstName} live for a deep dive into the key ideas from ${bookTitle} - with live Q&A.`,
      speaking: `Bring ${authorFirstName} to your event. A powerful keynote based on the principles of ${bookTitle}.`,
      consulting: `Bring ${authorFirstName}'s expertise to your organization. Strategic consulting based on the frameworks in ${bookTitle}.`,
      mastermind: `Join an exclusive group of high-performers applying ${bookTitle}'s principles - facilitated by ${authorFirstName}.`,
      retreat: `Immerse yourself in ${bookTitle}'s teachings. An intensive, transformational experience with ${authorFirstName}.`,
      training: `Equip your team with the skills from ${bookTitle}. A structured training program designed for organizations.`,
      certification: `Become a certified practitioner of ${authorFirstName}'s methodology from ${bookTitle}.`,
    };
    return {
      heading: "Take the Next Step",
      subheading: oneLinerMap[type] || `Continue your journey with ${bookTitle} - ${authorFirstName} has created this resource to help you go further.`,
    };
  }

  if (isDigitalOnly) {
    return {
      heading: `Put ${bookTitle} Into Practice`,
      subheading: "Transform what you've read into real results with these hands-on resources.",
    };
  }

  if (isServiceOnly) {
    return {
      heading: `Work Directly with ${authorFirstName}`,
      subheading: "Take your journey further with personalized guidance from the author.",
    };
  }

  return {
    heading: `Go Deeper with ${bookTitle}`,
    subheading: `Reading the book is just the beginning. ${authorFirstName} has created these resources to help you put the ideas into action.`,
  };
}

/* ===== Who Is This For Personas ===== */
export function getAutoPersonas(genre: string | null, productType: string, bookTitle: string): string[] {
  const g = (genre || "").toLowerCase();
  const t = productType;

  if (g.includes("business") && ["workbook", "homestudy", "onlinecourse", "templates"].includes(t)) {
    return [
      "Entrepreneurs who want a structured plan to implement these strategies",
      "Professionals looking to level up their skills with proven frameworks",
      "Teams implementing new strategies and need a shared resource",
    ];
  }
  if (g.includes("business") && ["coaching", "consulting", "mastermind"].includes(t)) {
    return [
      "Leaders who want personalized guidance applying these principles",
      "Executives seeking a trusted advisor for strategic decisions",
      "Organizations ready to transform their approach",
    ];
  }
  if ((g.includes("self-help") || g.includes("personal")) && ["workbook", "onlinecourse", "homestudy"].includes(t)) {
    return [
      "Anyone feeling stuck and ready for a structured path forward",
      "Lifelong learners who want guided, step-by-step growth",
      `People who loved the book and want to go deeper`,
    ];
  }
  if ((g.includes("self-help") || g.includes("personal")) && ["coaching", "consulting"].includes(t)) {
    return [
      "Individuals ready for personalized transformation",
      "Professionals seeking accountability and faster results",
      "Anyone who wants expert guidance, not just information",
    ];
  }
  if ((g.includes("memoir") || g.includes("biography"))) {
    return [
      "Readers inspired by the story who want to apply its lessons",
      "Anyone facing similar challenges who wants practical guidance",
      "People who believe in learning from real-life experiences",
    ];
  }
  if ((g.includes("fiction") || g.includes("literary") || g.includes("poetry"))) {
    return [
      `Fans who want to immerse deeper in the world of ${bookTitle}`,
      "Aspiring writers who want to learn from the craft",
      "Book clubs looking for rich discussion material",
    ];
  }
  if ((g.includes("health") || g.includes("wellness"))) {
    return [
      "Anyone ready to prioritize their wellbeing with expert guidance",
      "People who want a structured, evidence-based approach to health",
      "Those who've tried generic advice and want something personalized",
    ];
  }
  if ((g.includes("tech") || g.includes("science"))) {
    return [
      "Professionals who want to stay ahead of industry trends",
      "Teams looking to implement cutting-edge practices",
      "Curious minds who want deeper understanding beyond the book",
    ];
  }

  const formatLabel: Record<string, string> = {
    workbook: "hands-on exercises",
    onlinecourse: "structured video lessons",
    homestudy: "self-paced study",
    coaching: "one-on-one guidance",
    audiobook: "audio",
    podcast: "podcast episodes",
    webinar: "live interactive sessions",
    workshop: "intensive workshops",
    membership: "ongoing community access",
  };

  return [
    `Readers who loved ${bookTitle} and want more`,
    "Anyone ready to put these ideas into practice",
    `People who learn best through ${formatLabel[t] || "interactive formats"}`,
  ];
}

/* ===== Product Type Label ===== */
export function getProductTypeLabel(type: string): string {
  const map: Record<string, string> = {
    workbook: "Workbook",
    onlinecourse: "Online Course",
    homestudy: "Home Study Course",
    audiobook: "Audiobook",
    coaching: "1-on-1 Coaching",
    group_coaching: "Group Coaching",
    membership: "Membership",
    coaching_membership: "Membership",
    webinar: "Webinar",
    workshop: "Workshop",
    speaking: "Speaking / Keynote",
    keynote: "Keynote",
    consulting: "Consulting",
    mastermind: "Mastermind",
    retreat: "Retreat",
    bootcamp: "Bootcamp",
    training: "Training Program",
    certification: "Certification",
    convention: "Convention",
    special_edition: "Special Edition",
    podcast: "Podcast",
    big_ticket: "Premium Program",
    companion_journal: "Companion Journal",
    assessment: "Assessment",
    templates: "Templates & Toolkit",
    book_club_kit: "Book Club Kit",
    media_kit: "Media Kit",
    affiliate: "Affiliate Program",
    corporate: "Corporate Bulk Sales",
    licensing: "Licensing",
    franchise: "Partnership",
  };
  return map[type] || "Product";
}
