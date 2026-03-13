/**
 * Dynamic copy helpers for product pages.
 * Used for CTA text, taglines, section headings, and persona generation.
 */

/* ===== CTA Text ===== */
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
  };
  return map[type] || "Get Access";
}

export function getProductCardCTAText(type: string): string {
  const map: Record<string, string> = {
    workbook: "Get the Workbook →",
    onlinecourse: "Start Learning →",
    homestudy: "Start Studying →",
    audiobook: "Get the Audiobook →",
    coaching: "Book Coaching →",
    group_coaching: "Join the Group →",
    membership: "Join Now →",
    webinar: "Register →",
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
    webinar: `A live, interactive deep-dive into the most powerful ideas from ${bookTitle}.`,
    speaking: `Bring ${authorFirstName}'s transformative message to your audience.`,
    keynote: `Bring ${authorFirstName}'s transformative message to your audience.`,
    consulting: `Strategic, high-impact consulting based on ${authorFirstName}'s proven frameworks.`,
    mastermind: `An exclusive circle of ambitious individuals applying ${bookTitle}'s principles at the highest level.`,
    retreat: `An immersive, transformational experience that brings ${bookTitle} to life.`,
    bootcamp: `An immersive, transformational experience that brings ${bookTitle} to life.`,
    training: `Equip your team with actionable skills from ${bookTitle}.`,
    certification: `Become a certified practitioner of ${authorFirstName}'s ${bookTitle} methodology.`,
    podcast: `Listen to ${bookTitle} insights on the go.`,
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
    membership: "What's Included in Your Membership",
    webinar: "What We'll Cover",
    speaking: "What Your Audience Will Experience",
    keynote: "What Your Audience Will Experience",
    mastermind: "The Experience Includes",
    retreat: "The Experience Includes",
    bootcamp: "The Experience Includes",
    training: "Program Curriculum",
    certification: "Program Curriculum",
  };
  return map[type] || "What's Included";
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

  if (g.includes("business") && ["workbook", "homestudy"].includes(t)) {
    return ["Entrepreneurs who want a structured plan", "Professionals looking to level up", "Teams implementing new strategies"];
  }
  if ((g.includes("self-help") || g.includes("personal")) && ["onlinecourse", "homestudy"].includes(t)) {
    return ["Anyone feeling stuck and ready for change", "Lifelong learners who want guided growth", `People who loved ${bookTitle} and want to go deeper`];
  }
  if ((g.includes("self-help") || g.includes("personal")) && ["coaching"].includes(t)) {
    return ["Individuals ready for personalized transformation", "Professionals seeking accountability", "Anyone who wants faster results than going it alone"];
  }

  const formatLabel: Record<string, string> = {
    workbook: "hands-on exercises",
    onlinecourse: "structured video lessons",
    homestudy: "self-paced study",
    coaching: "one-on-one guidance",
    audiobook: "audio",
    podcast: "podcast episodes",
  };

  return [
    `Readers who loved ${bookTitle} and want more`,
    "Anyone ready to put these ideas into practice",
    `People who learn best through ${formatLabel[t] || "interactive formats"}`,
  ];
}
