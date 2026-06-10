const { getAIReply } = require("./aiAgent");
const api = require("./metaApi");

const AUTO_REPLY = process.env.AUTO_REPLY_ENABLED === "true";
const DELAY_MS = parseInt(process.env.AUTO_REPLY_DELAY_MS || "3000", 10);

// ─────────────────────────────────────────────────────────────────
// DEDUPLICATION CACHE — TTL-based Map (replaces unbounded Set)
// Prevents duplicate replies within a 24-hour window.
// The old Set() grew forever and reset on every Render restart,
// allowing replays. This version prunes stale entries automatically.
// ─────────────────────────────────────────────────────────────────
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const repliedIds = new Map();

function hasSeen(id) {
  const now = Date.now();
  if (repliedIds.has(id)) return true;

  repliedIds.set(id, now);

  // Prune entries older than TTL to prevent unbounded memory growth
  for (const [key, timestamp] of repliedIds) {
    if (now - timestamp > TTL_MS) repliedIds.delete(key);
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────
// DELAY HELPER
// ─────────────────────────────────────────────────────────────────
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─────────────────────────────────────────────────────────────────
// LOG HELPER
// ─────────────────────────────────────────────────────────────────
function log(platform, type, from, message, action) {
  const ts = new Date().toISOString();
  console.log(`\n[${ts}] [${platform}] [${type}]`);
  console.log(`  From    : ${from}`);
  console.log(`  Message : ${message}`);
  console.log(`  Action  : ${action}`);
}

// ═════════════════════════════════════════════════════════════════
// FACEBOOK MESSAGE HANDLER
// ═════════════════════════════════════════════════════════════════
async function handleFBMessage(messagingEvent) {
  try {
    const senderId = messagingEvent.sender?.id;
    const pageId = messagingEvent.recipient?.id;
    const messageText = messagingEvent.message?.text;
    const messageId = messagingEvent.message?.mid;

    // Ignore messages sent by the page itself
    if (senderId === pageId || senderId === process.env.PAGE_ID) return;
    if (!messageText || !messageId) return;
    if (hasSeen(messageId)) return;

    const replyText = getAIReply(messageText);

    log("FACEBOOK", "DM", senderId, messageText,
      AUTO_REPLY ? `Auto-replying...` : `Auto-reply DISABLED — logged only`);

    if (AUTO_REPLY) {
      await delay(DELAY_MS);
      const result = await api.replyFBMessage(senderId, replyText);
      if (result.success) {
        console.log(`  ✅ Reply sent to FB user ${senderId}`);
      } else {
        console.error(`  ❌ Failed to reply:`, result.error);
      }
    }
  } catch (err) {
    console.error("[handleFBMessage] Error:", err.message);
  }
}

// ═════════════════════════════════════════════════════════════════
// FACEBOOK COMMENT HANDLER
// ═════════════════════════════════════════════════════════════════
async function handleFBComment(changeValue) {
  try {
    const commentId = changeValue.value?.comment_id;
    const message = changeValue.value?.message;
    const from = changeValue.value?.from?.name || changeValue.value?.from?.id;
    const postId = changeValue.value?.post_id;
    const senderId = changeValue.value?.from?.id;

    // Ignore comments made by the page itself
    if (senderId === process.env.PAGE_ID) return;
    if (!commentId || !message) return;
    if (hasSeen(commentId)) return;

    const replyText = getAIReply(message);

    log("FACEBOOK", "COMMENT", from, message,
      AUTO_REPLY ? `Auto-replying to comment on post ${postId}...` : `Auto-reply DISABLED — logged only`);

    if (AUTO_REPLY) {
      await delay(DELAY_MS);
      const result = await api.replyFBComment(commentId, replyText);
      if (result.success) {
        console.log(`  ✅ Comment reply posted (comment ID: ${commentId})`);
      } else {
        console.error(`  ❌ Failed to reply to comment:`, result.error);
      }
    }
  } catch (err) {
    console.error("[handleFBComment] Error:", err.message);
  }
}

// ═════════════════════════════════════════════════════════════════
// INSTAGRAM MESSAGE HANDLER
// ═════════════════════════════════════════════════════════════════
async function handleIGMessage(messagingEvent) {
  try {
    const senderId = messagingEvent.sender?.id;
    const recipientId = messagingEvent.recipient?.id;
    const messageText = messagingEvent.message?.text;
    const messageId = messagingEvent.message?.mid;

    // Ignore messages sent by the page/account itself
    if (senderId === recipientId || senderId === process.env.INSTAGRAM_ACCOUNT_ID) return;
    if (!messageText || !messageId) return;
    if (hasSeen(messageId)) return;

    const replyText = getAIReply(messageText);

    log("INSTAGRAM", "DM", senderId, messageText,
      AUTO_REPLY ? `Auto-replying...` : `Auto-reply DISABLED — logged only`);

    if (AUTO_REPLY) {
      await delay(DELAY_MS);
      const result = await api.replyIGMessage(senderId, replyText);
      if (result.success) {
        console.log(`  ✅ Reply sent to IG user ${senderId}`);
      } else {
        console.error(`  ❌ Failed to reply:`, result.error);
      }
    }
  } catch (err) {
    console.error("[handleIGMessage] Error:", err.message);
  }
}

// ═════════════════════════════════════════════════════════════════
// INSTAGRAM COMMENT HANDLER
// ═════════════════════════════════════════════════════════════════
async function handleIGComment(changeValue) {
  try {
    const commentId = changeValue.value?.id;
    const message = changeValue.value?.text;
    const from = changeValue.value?.from?.username || changeValue.value?.from?.id;
    const senderId = changeValue.value?.from?.id;
    const mediaId = changeValue.value?.media?.id;

    // Ignore own comments
    if (senderId === process.env.INSTAGRAM_ACCOUNT_ID) return;
    if (!commentId || !message) return;
    if (hasSeen(commentId)) return;

    const replyText = getAIReply(message);

    log("INSTAGRAM", "COMMENT", from, message,
      AUTO_REPLY ? `Auto-replying to comment on media ${mediaId}...` : `Auto-reply DISABLED — logged only`);

    if (AUTO_REPLY) {
      await delay(DELAY_MS);
      const result = await api.replyIGComment(commentId, replyText);
      if (result.success) {
        console.log(`  ✅ IG comment reply posted (comment ID: ${commentId})`);
      } else {
        console.error(`  ❌ Failed to reply to IG comment:`, result.error);
      }
    }
  } catch (err) {
    console.error("[handleIGComment] Error:", err.message);
  }
}

// ═════════════════════════════════════════════════════════════════
// MAIN WEBHOOK DISPATCHER
// Parses the full webhook payload and routes to the right handler
// ═════════════════════════════════════════════════════════════════
async function handleWebhookEvent(body) {
  try {
    const object = body.object;

    if (!body.entry || !Array.isArray(body.entry)) return;

    for (const entry of body.entry) {

      // ── Facebook Messages ──
      if (object === "page" && entry.messaging) {
        for (const messagingEvent of entry.messaging) {
          if (messagingEvent.message) {
            await handleFBMessage(messagingEvent);
          }
        }
      }

      // ── Facebook Comments (via feed changes) ──
      if (object === "page" && entry.changes) {
        for (const change of entry.changes) {
          if (change.field === "feed" && change.value?.item === "comment") {
            await handleFBComment(change);
          }
        }
      }

      // ── Instagram Messages ──
      if (object === "instagram" && entry.messaging) {
        for (const messagingEvent of entry.messaging) {
          if (messagingEvent.message) {
            await handleIGMessage(messagingEvent);
          }
        }
      }

      // ── Instagram Comments ──
      if (object === "instagram" && entry.changes) {
        for (const change of entry.changes) {
          if (change.field === "comments") {
            await handleIGComment(change);
          }
        }
      }
    }
  } catch (err) {
    console.error("[handleWebhookEvent] Error:", err.message);
  }
}

module.exports = { handleWebhookEvent };



