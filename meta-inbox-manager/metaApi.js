const axios = require("axios");

const BASE = "https://graph.facebook.com/v19.0";
const TOKEN = process.env.PAGE_ACCESS_TOKEN;
const PAGE_ID = process.env.PAGE_ID;
const IG_ID = process.env.INSTAGRAM_ACCOUNT_ID;

// ─── Generic Graph API request ────────────────────────────────────
async function graphRequest(method, endpoint, params = {}, data = {}) {
  try {
    const config = {
      method,
      url: `${BASE}/${endpoint}`,
      params: { access_token: TOKEN, ...params },
      data,
    };
    const res = await axios(config);
    return { success: true, data: res.data };
  } catch (err) {
    const errData = err.response?.data?.error || err.message;
    console.error(`[Graph API Error] ${method.toUpperCase()} /${endpoint}:`, JSON.stringify(errData));
    return { success: false, error: errData };
  }
}

// ═══════════════════════════════════════════════════════════════════
// FACEBOOK — MESSAGES
// ═══════════════════════════════════════════════════════════════════

// Get all conversations on the Page
async function getFBConversations() {
  return graphRequest("get", `${PAGE_ID}/conversations`, {
    fields: "id,updated_time,messages{id,message,from,created_time}",
  });
}

// Send a reply to a Facebook DM (by recipient PSID)
async function replyFBMessage(recipientPSID, messageText) {
  return graphRequest(
    "post",
    `${PAGE_ID}/messages`,
    {},
    {
      recipient: { id: recipientPSID },
      message: { text: messageText },
      access_token: TOKEN,
    }
  );
}

// ═══════════════════════════════════════════════════════════════════
// FACEBOOK — COMMENTS
// ═══════════════════════════════════════════════════════════════════

// Get comments on a specific post
async function getFBPostComments(postId) {
  return graphRequest("get", `${postId}/comments`, {
    fields: "id,message,from,created_time,can_reply_privately",
  });
}

// Reply to a Facebook comment
async function replyFBComment(commentId, replyText) {
  return graphRequest("post", `${commentId}/replies`, { message: replyText });
}

// Get all recent posts on the page
async function getFBPosts() {
  return graphRequest("get", `${PAGE_ID}/posts`, {
    fields: "id,message,created_time",
    limit: 10,
  });
}

// ═══════════════════════════════════════════════════════════════════
// INSTAGRAM — MESSAGES
// ═══════════════════════════════════════════════════════════════════

// Get Instagram DM conversations
async function getIGConversations() {
  return graphRequest("get", `${IG_ID}/conversations`, {
    fields: "id,updated_time,messages{id,message,from,created_time}",
    platform: "instagram",
  });
}

// Send a reply to an Instagram DM
async function replyIGMessage(recipientIGSID, messageText) {
  return graphRequest(
    "post",
    `${IG_ID}/messages`,
    {},
    {
      recipient: { id: recipientIGSID },
      message: { text: messageText },
      access_token: TOKEN,
    }
  );
}

// ═══════════════════════════════════════════════════════════════════
// INSTAGRAM — COMMENTS
// ═══════════════════════════════════════════════════════════════════

// Get comments on a specific Instagram media
async function getIGMediaComments(mediaId) {
  return graphRequest("get", `${mediaId}/comments`, {
    fields: "id,text,username,timestamp,replies{id,text,username,timestamp}",
  });
}

// Reply to an Instagram comment
async function replyIGComment(commentId, replyText) {
  return graphRequest("post", `${commentId}/replies`, { message: replyText });
}

// Get recent Instagram media
async function getIGMedia() {
  return graphRequest("get", `${IG_ID}/media`, {
    fields: "id,caption,media_type,timestamp,comments_count",
    limit: 10,
  });
}

// ═══════════════════════════════════════════════════════════════════
// UTILITY — Get Instagram Account ID from Page
// ═══════════════════════════════════════════════════════════════════
async function getIGAccountId() {
  return graphRequest("get", PAGE_ID, {
    fields: "instagram_business_account",
  });
}

// ═══════════════════════════════════════════════════════════════════
// UTILITY — Verify token is valid
// ═══════════════════════════════════════════════════════════════════
async function verifyToken() {
  return graphRequest("get", "me", { fields: "id,name" });
}

module.exports = {
  getFBConversations,
  replyFBMessage,
  getFBPostComments,
  replyFBComment,
  getFBPosts,
  getIGConversations,
  replyIGMessage,
  getIGMediaComments,
  replyIGComment,
  getIGMedia,
  getIGAccountId,
  verifyToken,
};
