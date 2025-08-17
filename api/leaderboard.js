// api/leaderboard.js (Vercel serverless function with CORS)

import admin from "firebase-admin";

// Ensure Firebase Admin is initialized only once
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      ),
    });
  } catch (error) {
    console.error("Firebase admin initialization error:", error);
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  // --- 🔥 Add CORS headers ---
  res.setHeader("Access-Control-Allow-Origin", "https://fighting-game-4d09a.web.app");
  // For debugging you can temporarily allow all origins:
  // res.setHeader("Access-Control-Allow-Origin", "*");

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight (OPTIONS request)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // --- 🔥 End CORS setup ---

    // --- GET Leaderboard ---
  if (req.method === "GET") {
    try {
      const { sessionId } = req.query;

      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      let snapshot;
      try {
        snapshot = await db
          .collection("matches")
          .where("sessionId", "==", sessionId)
          .orderBy("createdAt", "desc") // ✅ use createdAt for sorting
          .get();

      } catch (orderErr) {
        console.warn("⚠️ orderBy failed (likely because some docs have string times). Falling back without orderBy.");
        snapshot = await db
          .collection("matches")
          .where("sessionId", "==", sessionId)
          .get();
      }

      let leaderboard = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          player1: data.player1,
          player2: data.player2,
          winner: data.winner,
          loser: data.loser,
          matchTime: data.matchTime,   // ⏱ only send this to frontend
          _createdAt: data.createdAt?.toDate?.() || null // keep for internal sort only
        };
      });

      // Fallback sort (newest first)
      leaderboard.sort((a, b) => {
        if (!a._createdAt || !b._createdAt) return 0;
        return b._createdAt - a._createdAt;
      });

      // Strip out _createdAt before sending to frontend
      leaderboard = leaderboard.map(({ _createdAt, ...rest }) => rest);

      return res.status(200).json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      return res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  }

      // --- POST Match Result ---
      if (req.method === "POST") {
        try {
          const { winner, loser, player1, player2, sessionId, matchTime } = req.body;

          if (!winner || !loser || !player1 || !player2 || !sessionId || matchTime == null) {
            return res
              .status(400)
              .json({ error: "Winner, loser, player1, player2, sessionId, and matchTime are required" });
          }

          const matchData = {
            player1,
            player2,
            winner,
            loser,
            sessionId,
            matchTime, // ⏱ from frontend
            createdAt: admin.firestore.Timestamp.now(), // for sorting
          };

          // Save new match
          const newDoc = await db.collection("matches").add(matchData);
          return res.status(201).json({ message: "Match saved", id: newDoc.id });

        } catch (error) {
          console.error("Error saving match:", error);
          return res.status(500).json({ error: "Failed to save match" });
        }
      }

        // --- Method not allowed ---
        return res.status(405).json({ error: "Method not allowed" });
      }
