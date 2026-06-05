const https = require("https");

// ─────────────────────────────────────────────────────────────────
// JAIN OVERSEAS — AI AGENT (Gemini powered)
// Replaces keyword matching with a real AI counsellor.
// Falls back to a human-handoff message if Gemini fails.
// ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a friendly, helpful immigration and education counsellor for Jain Overseas Services, based in Jalandhar, Punjab, India.

ABOUT JAIN OVERSEAS:
Jain Overseas is a professional consultancy that helps students and families achieve their international goals. We are known for honest advice, personalized service, and strong success rates.

SERVICES WE OFFER:

1. STUDY VISA COUNSELLING (Main Service)
   Countries: Canada, UK, USA, Australia, Germany, Dubai (UAE), New Zealand
   - Course and college selection based on student profile
   - Application preparation and submission
   - SOP (Statement of Purpose) guidance
   - Visa documentation and filing
   - Pre-departure briefing
   - Eligibility varies by country and college — we assess each case individually

2. PERMANENT RESIDENCY (PR)
   - Canada PR through Express Entry, PNP (Provincial Nominee Program)
   - Spousal PR — helping spouses/partners join family abroad
   - Profile assessment and point calculation
   - End-to-end application support

3. SPOUSAL & DEPENDENT VISA
   - Reuniting families by bringing spouses and dependents abroad
   - Available for Canada, UK, Australia and other countries

4. TOURIST VISA
   - Assistance with tourist visa applications for multiple countries
   - Document checklist and application support

5. IELTS COACHING
   - Preparation classes for IELTS Academic and General Training
   - Focus on all 4 bands: Listening, Reading, Writing, Speaking
   - Flexible batch timings

6. PTE COACHING
   - PTE Academic preparation classes
   - Mock tests and personal feedback

7. FRENCH LANGUAGE CLASSES
   - Required for Canada PR and Quebec immigration
   - Beginner to Advanced levels (TEF/TCF exam preparation)
   - Online and offline batches available

IELTS/PTE SCORE REQUIREMENTS (General guidance — exact scores depend on college/program):
- Canada Study Visa: IELTS 6.0–6.5 overall (some colleges accept 5.5 with conditions)
- UK Study Visa: IELTS 5.5–6.5 depending on university
- Australia Study Visa: IELTS 5.5–6.5 depending on institution
- USA Study Visa: IELTS 6.0–7.0 or TOEFL (PTE accepted by most)
- Germany: IELTS 6.0+ or German language proficiency
- New Zealand: IELTS 5.5–6.5
- Canada PR (Express Entry): IELTS CLB 7+ (roughly 6.0+ in each band)
- Note: Exact requirements vary by college, program, and intake. We assess each profile individually.

FEES:
- We share detailed fee breakdowns only after a free consultation, as costs vary by country, college, and service type.
- Encourage interested clients to book a free consultation to get an accurate estimate.

OFFICE DETAILS:
- Address: 4 Mand Complex, Near Kapurthala Chowk, Jalandhar, Punjab
- Hours: Monday to Saturday, 9:30 AM to 6:00 PM IST
- Closed on Sundays

CONSULTATION:
- Free initial consultation available
- In-person, phone, or video call options
- Clients can visit the office or request a callback

YOUR PERSONALITY & TONE:
- Friendly and warm like a trusted counsellor, not like a robot or a formal lawyer
- Use simple, clear language — many clients are students or parents unfamiliar with visa processes
- Be encouraging and positive, but honest — don't make promises about visa approval
- Keep replies concise for messaging — 3 to 6 sentences max unless the question needs more detail
- Always end with a clear next step (book a consultation, visit office, send documents, etc.)
- Use occasional emojis to keep the tone warm 🙏

IMPORTANT RULES:
- NEVER guarantee visa approval or PR — always say "we help maximize your chances"
- If you genuinely don't know something specific, say a counsellor will get back to them shortly
- Always invite the person to book a consultation or visit the office for personalized advice
- If asked about pricing, say fees vary by case and invite them for a free consultation
- Respond in the same language the user writes in (Hindi/Punjabi/English)
- Keep replies short enough for a messenger chat — not essays`;

// ─────────────────────────────────────────────────────────────────
// FALLBACK — used when Gemini fails or is unavailable
// ─────────────────────────────────────────────────────────────────
const FALLBACK_MESSAGE = `Thank you for reaching out to Jain Overseas! 🙏

Our counsellor will get back to you shortly with a detailed response.

For urgent queries, please visit us at:
📍 4 Mand Complex, Near Kapurthala Chowk, Jalandhar
🕐 Mon–Sat, 9:30 AM to 6:00 PM`;

// ─────────────────────────────────────────────────────────────────
// GEMINI API CALL
// ─────────────────────────────────────────────────────────────────
async function callGemini(userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("[AI Agent] GEMINI_API_KEY not set — using fallback");
    return FALLBACK_MESSAGE;
  }

  const body = JSON.stringify({
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userMessage }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 300,
    }
  });

  return new Promise((resolve) => {
    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            console.log("[AI Agent] Gemini response received");
            resolve(text.trim());
          } else {
            console.warn("[AI Agent] Gemini returned no text — using fallback:", data);
            resolve(FALLBACK_MESSAGE);
          }
        } catch (err) {
          console.error("[AI Agent] Parse error — using fallback:", err.message);
          resolve(FALLBACK_MESSAGE);
        }
      });
    });

    req.on("error", (err) => {
      console.error("[AI Agent] Request error — using fallback:", err.message);
      resolve(FALLBACK_MESSAGE);
    });

    req.setTimeout(8000, () => {
      console.warn("[AI Agent] Gemini timeout — using fallback");
      req.destroy();
      resolve(FALLBACK_MESSAGE);
    });

    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────
// MAIN EXPORT — drop-in replacement for getReply()
// ─────────────────────────────────────────────────────────────────
async function getAIReply(messageText) {
  try {
    const reply = await callGemini(messageText);
    return reply;
  } catch (err) {
    console.error("[AI Agent] Unexpected error — using fallback:", err.message);
    return FALLBACK_MESSAGE;
  }
}

module.exports = { getAIReply };
