const https = require("https");

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

6. PTE COACHING
   - PTE Academic preparation classes
   - Mock tests and personal feedback

7. FRENCH LANGUAGE CLASSES
   - Required for Canada PR and Quebec immigration
   - Beginner to Advanced levels (TEF/TCF exam preparation)
   - Online and offline batches available

IELTS/PTE SCORE REQUIREMENTS (General guidance):
- Canada Study Visa: IELTS 6.0-6.5 overall (some colleges accept 5.5 with conditions)
- UK Study Visa: IELTS 5.5-6.5 depending on university
- Australia Study Visa: IELTS 5.5-6.5 depending on institution
- USA Study Visa: IELTS 6.0-7.0 or TOEFL
- Germany: IELTS 6.0+ or German language proficiency
- New Zealand: IELTS 5.5-6.5
- Canada PR (Express Entry): IELTS CLB 7+
- Exact requirements vary by college and program

FEES:
- Share detailed fees only after free consultation as costs vary by country and service

OFFICE DETAILS:
- Address: 4 Mand Complex, Near Kapurthala Chowk, Jalandhar, Punjab
- Hours: Monday to Saturday, 9:30 AM to 6:00 PM IST
- Closed on Sundays

YOUR PERSONALITY AND TONE:
- Friendly and warm like a trusted counsellor
- Simple clear language for students and parents
- Keep replies short — 3 to 6 sentences max for messaging
- Always end with a clear next step
- Use occasional emojis to keep tone warm
- NEVER guarantee visa approval
- If unsure, say a counsellor will respond shortly
- Respond in same language user writes in (Hindi/Punjabi/English)`;

const FALLBACK_MESSAGE = `Thank you for reaching out to Jain Overseas! 🙏

Our counsellor will get back to you shortly with a detailed response.

For urgent queries, please visit us at:
📍 4 Mand Complex, Near Kapurthala Chowk, Jalandhar
🕐 Mon–Sat, 9:30 AM to 6:00 PM`;

async function callGemini(userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("[AI Agent] GEMINI_API_KEY not set — using fallback");
    return FALLBACK_MESSAGE;
  }

  const body = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [{ 
          text: SYSTEM_PROMPT + "\n\nUser message: " + userMessage + "\n\nReply as the Jain Overseas counsellor:"
        }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 300,
    }
  });

  return new Promise((resolve) => {
    const encodedKey = encodeURIComponent(apiKey);
    const path = `/v1beta/models/gemini-2.0-flash:generateContent?key=${encodedKey}`;

    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: path,
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
          console.log("[AI Agent] Gemini status:", res.statusCode);
          const parsed = JSON.parse(data);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            console.log("[AI Agent] Gemini response received successfully");
            resolve(text.trim());
          } else {
            console.warn("[AI Agent] Gemini returned no text:", JSON.stringify(parsed).substring(0, 200));
            resolve(FALLBACK_MESSAGE);
          }
        } catch (err) {
          console.error("[AI Agent] Parse error:", err.message, data.substring(0, 200));
          resolve(FALLBACK_MESSAGE);
        }
      });
    });

    req.on("error", (err) => {
      console.error("[AI Agent] Request error:", err.message);
      resolve(FALLBACK_MESSAGE);
    });

    req.setTimeout(10000, () => {
      console.warn("[AI Agent] Gemini timeout — using fallback");
      req.destroy();
      resolve(FALLBACK_MESSAGE);
    });

    req.write(body);
    req.end();
  });
}

async function getAIReply(messageText) {
  try {
    const reply = await callGemini(messageText);
    return reply;
  } catch (err) {
    console.error("[AI Agent] Unexpected error:", err.message);
    return FALLBACK_MESSAGE;
  }
}

module.exports = { getAIReply };
