// api/leaderboard.js  (Vercel serverless function with CORS)

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
  // if you want to allow *all* origins while testing, replace above with: "*"
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight (OPTIONS request)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // --- 🔥 End CORS setup ---

  if (req.method === "GET") {
    try {
      const snapshot = await db
        .collection("matches")
        .orderBy("time", "desc")
        .get();

      const leaderboard = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return res.status(200).json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      return res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  }

  if (req.method === "POST") {
    const { winner, loser } = req.body;

    if (!winner || !loser) {
      return res.status(400).json({ error: "Winner and loser are required" });
    }

    try {
      const matchData = {
        winner,
        loser,
        time: admin.firestore.Timestamp.now(),
      };

      const newDoc = await db.collection("matches").add(matchData);

      return res.status(201).json({ message: "Match saved", id: newDoc.id });
    } catch (error) {
      console.error("Error saving match:", error);
      return res.status(500).json({ error: "Failed to save match" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
