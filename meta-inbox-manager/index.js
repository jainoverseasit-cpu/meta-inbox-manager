require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const { handleWebhookEvent } = require("./webhookHandler");
const api = require("./metaApi");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════
// WEBHOOK — GET (Meta verification handshake)
// Meta calls this once when you register the webhook URL
// ═══════════════════════════════════════════════════════════════════
app.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log("✅ Webhook verified by Meta");
    return res.status(200).send(challenge);
  }

  console.warn("❌ Webhook verification failed — token mismatch");
  return res.sendStatus(403);
});

// ═══════════════════════════════════════════════════════════════════
// WEBHOOK — POST (incoming events from Meta)
// All Facebook & Instagram events arrive here
// ═══════════════════════════════════════════════════════════════════
app.post("/webhook", async (req, res) => {
  // Respond immediately so Meta doesn't retry
  res.sendStatus(200);

  // Process the event asynchronously
  try {
    await handleWebhookEvent(req.body);
  } catch (err) {
    console.error("[POST /webhook] Unhandled error:", err.message);
  }
});

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD — GET /inbox
// Shows recent messages and comments fetched from the Graph API
// Visit this in your browser: https://your-app.onrender.com/inbox
// ═══════════════════════════════════════════════════════════════════
app.get("/inbox", async (req, res) => {
  try {
    const [fbConvos, igConvos, fbPosts, igMedia] = await Promise.all([
      api.getFBConversations(),
      api.getIGConversations(),
      api.getFBPosts(),
      api.getIGMedia(),
    ]);

    const html = buildDashboard(fbConvos, igConvos, fbPosts, igMedia);
    res.send(html);
  } catch (err) {
    res.status(500).send(`<pre>Error loading inbox: ${err.message}</pre>`);
  }
});

// ═══════════════════════════════════════════════════════════════════
// MANUAL REPLY — POST /reply/message
// Send a manual reply to a specific user
// Body: { platform: "facebook"|"instagram", recipientId: "...", message: "..." }
// ═══════════════════════════════════════════════════════════════════
app.post("/reply/message", async (req, res) => {
  const { platform, recipientId, message } = req.body;

  if (!platform || !recipientId || !message) {
    return res.status(400).json({ error: "platform, recipientId, and message are required" });
  }

  let result;
  if (platform === "facebook") {
    result = await api.replyFBMessage(recipientId, message);
  } else if (platform === "instagram") {
    result = await api.replyIGMessage(recipientId, message);
  } else {
    return res.status(400).json({ error: "platform must be 'facebook' or 'instagram'" });
  }

  return res.json(result);
});

// ═══════════════════════════════════════════════════════════════════
// MANUAL REPLY — POST /reply/comment
// Reply to a specific comment by ID
// Body: { platform: "facebook"|"instagram", commentId: "...", message: "..." }
// ═══════════════════════════════════════════════════════════════════
app.post("/reply/comment", async (req, res) => {
  const { platform, commentId, message } = req.body;

  if (!platform || !commentId || !message) {
    return res.status(400).json({ error: "platform, commentId, and message are required" });
  }

  let result;
  if (platform === "facebook") {
    result = await api.replyFBComment(commentId, message);
  } else if (platform === "instagram") {
    result = await api.replyIGComment(commentId, message);
  } else {
    return res.status(400).json({ error: "platform must be 'facebook' or 'instagram'" });
  }

  return res.json(result);
});

// ═══════════════════════════════════════════════════════════════════
// HEALTH CHECK — GET /
// ═══════════════════════════════════════════════════════════════════
app.get("/", (req, res) => {
  res.json({
    status: "running",
    service: "Jain Overseas — Meta Inbox Manager",
    version: "1.0.0",
    autoReply: process.env.AUTO_REPLY_ENABLED === "true" ? "ENABLED" : "DISABLED",
    endpoints: {
      webhook: "GET|POST /webhook",
      inbox:   "GET /inbox",
      replyMessage: "POST /reply/message",
      replyComment: "POST /reply/comment",
    },
  });
});

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD HTML BUILDER
// ═══════════════════════════════════════════════════════════════════
function buildDashboard(fbConvos, igConvos, fbPosts, igMedia) {
  const fbMessages = fbConvos.success
    ? (fbConvos.data?.data || []).slice(0, 10)
    : [];
  const igMessages = igConvos.success
    ? (igConvos.data?.data || []).slice(0, 10)
    : [];
  const posts = fbPosts.success
    ? (fbPosts.data?.data || []).slice(0, 5)
    : [];
  const media = igMedia.success
    ? (igMedia.data?.data || []).slice(0, 5)
    : [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Jain Overseas — Inbox Manager</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F0F2F8; color: #1A1F4E; }
    header { background: #1A1F4E; color: white; padding: 18px 32px; display: flex; align-items: center; justify-content: space-between; }
    header h1 { font-size: 20px; }
    .badge { background: #2DC96E; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .badge.off { background: #FF6B6B; }
    main { max-width: 1100px; margin: 28px auto; padding: 0 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-bottom: 28px; }
    .card { background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 20px; }
    .card h2 { font-size: 15px; font-weight: 700; color: #1A1F4E; margin-bottom: 14px; border-bottom: 2px solid #F0F2F8; padding-bottom: 10px; }
    .card h2 span { font-size: 11px; color: #7B87A8; font-weight: normal; margin-left: 8px; }
    .item { padding: 10px 0; border-bottom: 1px solid #F0F2F8; }
    .item:last-child { border-bottom: none; }
    .item .meta { font-size: 11px; color: #7B87A8; margin-bottom: 4px; }
    .item .msg { font-size: 13px; color: #1A1F4E; line-height: 1.5; }
    .empty { color: #7B87A8; font-size: 13px; padding: 12px 0; }
    .platform { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-right: 6px; }
    .fb { background: #E7F0FF; color: #1877F2; }
    .ig { background: #FFF0F7; color: #E1306C; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
    .stat { background: white; border-radius: 10px; padding: 18px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
    .stat .num { font-size: 28px; font-weight: 800; color: #1A1F4E; }
    .stat .lbl { font-size: 11px; color: #7B87A8; margin-top: 4px; }
    footer { text-align: center; color: #7B87A8; font-size: 11px; padding: 24px; }
  </style>
</head>
<body>
<header>
  <h1>🌐 Jain Overseas — Meta Inbox Manager</h1>
  <span class="badge ${process.env.AUTO_REPLY_ENABLED === 'true' ? '' : 'off'}">
    Auto-Reply ${process.env.AUTO_REPLY_ENABLED === 'true' ? 'ON' : 'OFF'}
  </span>
</header>
<main>
  <div class="stats">
    <div class="stat"><div class="num">${fbMessages.length}</div><div class="lbl">FB Conversations</div></div>
    <div class="stat"><div class="num">${igMessages.length}</div><div class="lbl">IG Conversations</div></div>
    <div class="stat"><div class="num">${posts.length}</div><div class="lbl">Recent FB Posts</div></div>
    <div class="stat"><div class="num">${media.length}</div><div class="lbl">Recent IG Media</div></div>
  </div>

  <div class="grid">
    <div class="card">
      <h2><span class="platform fb">FB</span>Facebook Messages <span>Last 10 conversations</span></h2>
      ${fbMessages.length === 0
        ? `<p class="empty">${fbConvos.success ? "No conversations found" : "Error: " + JSON.stringify(fbConvos.error)}</p>`
        : fbMessages.map(c => {
            const msgs = c.messages?.data || [];
            const last = msgs[0];
            return `<div class="item">
              <div class="meta">Updated: ${new Date(c.updated_time).toLocaleString()}</div>
              <div class="msg">${last ? last.message || "(media/attachment)" : "(no messages)"}</div>
            </div>`;
          }).join("")
      }
    </div>

    <div class="card">
      <h2><span class="platform ig">IG</span>Instagram Messages <span>Last 10 conversations</span></h2>
      ${igMessages.length === 0
        ? `<p class="empty">${igConvos.success ? "No conversations found" : "Error: " + JSON.stringify(igConvos.error)}</p>`
        : igMessages.map(c => {
            const msgs = c.messages?.data || [];
            const last = msgs[0];
            return `<div class="item">
              <div class="meta">Updated: ${new Date(c.updated_time).toLocaleString()}</div>
              <div class="msg">${last ? last.message || "(media/attachment)" : "(no messages)"}</div>
            </div>`;
          }).join("")
      }
    </div>

    <div class="card">
      <h2><span class="platform fb">FB</span>Recent Facebook Posts</h2>
      ${posts.length === 0
        ? `<p class="empty">No posts found</p>`
        : posts.map(p => `<div class="item">
            <div class="meta">${new Date(p.created_time).toLocaleString()}</div>
            <div class="msg">${(p.message || "(no caption)").substring(0, 120)}...</div>
          </div>`).join("")
      }
    </div>

    <div class="card">
      <h2><span class="platform ig">IG</span>Recent Instagram Media</h2>
      ${media.length === 0
        ? `<p class="empty">No media found</p>`
        : media.map(m => `<div class="item">
            <div class="meta">${m.media_type} — ${new Date(m.timestamp).toLocaleString()} — 💬 ${m.comments_count || 0} comments</div>
            <div class="msg">${(m.caption || "(no caption)").substring(0, 120)}...</div>
          </div>`).join("")
      }
    </div>
  </div>
</main>
<footer>Jain Overseas Meta Inbox Manager • Auto-refreshes every 5 mins •
  <a href="/" style="color:#1A1F4E">API Status</a>
</footer>
<script>setTimeout(() => location.reload(), 300000);</script>
</body>
</html>`;
}

// ─── Start Server ──────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🚀 Meta Inbox Manager running on port ${PORT}`);
  console.log(`   Auto-Reply : ${process.env.AUTO_REPLY_ENABLED === "true" ? "✅ ENABLED" : "❌ DISABLED"}`);
  console.log(`   Page ID    : ${process.env.PAGE_ID}`);
  console.log(`   Webhook    : /webhook`);
  console.log(`   Dashboard  : /inbox\n`);

  // Verify token on startup
  const check = await api.verifyToken();
  if (check.success) {
    console.log(`✅ Page Access Token valid — connected as: ${check.data.name} (${check.data.id})\n`);
  } else {
    console.warn(`⚠️  Page Access Token check failed:`, check.error);
    console.warn(`   Set a valid PAGE_ACCESS_TOKEN in your environment variables.\n`);
  }
});
