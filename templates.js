// ─────────────────────────────────────────────────────────────────
// AUTO-REPLY TEMPLATES
// Edit these messages to match your brand voice.
// Keywords are matched case-insensitively against incoming messages.
// First matching rule wins. "default" fires if nothing else matches.
// ─────────────────────────────────────────────────────────────────

const TEMPLATES = {

  // ── Facebook & Instagram DM Auto-Replies ──────────────────────
  messages: [
    {
      keywords: ["spousal", "spouse", "spouse pr", "spousal pr", "partner visa"],
      reply: `Thank you for reaching out about our Spousal PR services! 🙏

We help families reunite through the Spousal Permanent Residency process.

To get started, please share:
1. Which country is the PR application for?
2. Are you currently in India or abroad?
3. Have you started any paperwork yet?

Our counsellor will respond within 2 hours. You can also call us directly at [YOUR_PHONE_NUMBER].`,
    },
    {
      keywords: ["french", "france", "french class", "french language", "learn french"],
      reply: `Bonjour! 👋 Thank you for your interest in our French language classes!

We offer:
• Beginner to Advanced levels
• Online & Offline batches
• Flexible timings

To enroll or get a free demo class, please share your preferred timing and we'll connect you with our French faculty right away.`,
    },
    {
      keywords: ["canada", "canadian pr", "canada immigration", "express entry", "study in canada"],
      reply: `Thank you for your interest in Canada Immigration! 🍁

Canada offers excellent opportunities through Express Entry, PNP, and Student Visa pathways.

Please tell us:
1. What is your purpose — Work, Study, or PR?
2. What is your highest qualification?
3. Do you have any work experience abroad?

Our Canada immigration expert will assess your profile within 2 hours.`,
    },
    {
      keywords: ["fee", "fees", "cost", "price", "charges", "how much"],
      reply: `Thank you for your query! Our consultation fees vary by service and case complexity.

For an accurate fee estimate, we'd love to understand your specific requirement first.

Please share what service you're interested in (Spousal PR / French Classes / Canada Immigration) and our counsellor will provide a detailed breakdown within 2 hours. 📞`,
    },
    {
      keywords: ["appointment", "meet", "meeting", "consult", "consultation", "call", "talk"],
      reply: `We'd love to schedule a consultation with you! 📅

Please share:
• Your preferred date & time
• Your preferred mode — Phone call / Video call / In-person visit

Our office hours are Monday–Saturday, 10 AM to 6 PM (IST).

We'll confirm your slot within 30 minutes.`,
    },
    {
      keywords: ["hi", "hello", "helo", "hey", "good morning", "good afternoon", "good evening", "namaste"],
      reply: `Hello! 👋 Welcome to Jain Overseas Services!

We specialize in:
🇨🇦 Canada Immigration & PR
💑 Spousal PR Applications
🇫🇷 French Language Classes
✈️ Study Abroad Counselling

How can we help you today? Please tell us what you're looking for and we'll connect you with the right expert right away.`,
    },
    {
      keywords: ["default"],
      reply: `Thank you for reaching out to Jain Overseas Services! 🙏

We've received your message and our counsellor will get back to you within 2 hours.

For urgent queries, please call us at [YOUR_PHONE_NUMBER] (Mon–Sat, 10 AM–6 PM IST).`,
    },
  ],

  // ── Facebook & Instagram Comment Auto-Replies ─────────────────
  comments: [
    {
      keywords: ["price", "fees", "cost", "charges", "how much", "rate"],
      reply: `Thank you for your comment! 😊 Please send us a DM for detailed pricing — we'll respond within 2 hours.`,
    },
    {
      keywords: ["interested", "info", "information", "details", "more info", "tell me more"],
      reply: `Thank you for your interest! 🙏 Please send us a direct message with your requirements and our counsellor will get back to you shortly.`,
    },
    {
      keywords: ["contact", "number", "phone", "whatsapp", "call"],
      reply: `Please DM us directly or WhatsApp us at [YOUR_PHONE_NUMBER] — we're available Mon–Sat, 10 AM to 6 PM IST. 📞`,
    },
    {
      keywords: ["default"],
      reply: `Thank you for your comment! 😊 For detailed information, please send us a direct message and our team will assist you right away.`,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────
// MATCHER — finds the right reply for a given message/comment text
// ─────────────────────────────────────────────────────────────────
function getReply(text, type = "messages") {
  const lower = (text || "").toLowerCase();
  const templates = TEMPLATES[type] || TEMPLATES.messages;

  for (const template of templates) {
    if (template.keywords.includes("default")) continue;
    for (const keyword of template.keywords) {
      if (lower.includes(keyword)) {
        return template.reply;
      }
    }
  }

  // Return default
  const defaultTemplate = templates.find(t => t.keywords.includes("default"));
  return defaultTemplate ? defaultTemplate.reply : "Thank you for reaching out! We'll get back to you shortly.";
}

module.exports = { TEMPLATES, getReply };
