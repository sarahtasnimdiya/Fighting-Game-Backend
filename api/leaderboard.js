// api/leaderboard.js

import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    ),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
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
      console.error(error);
      return res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  }

  if (req.method === "POST") {
    const { winner, loser } = req.body;
    if (!winner || !loser) {
      return res.status(400).json({ error: "Winner and loser are required" });
    }
    try {
      const newDoc = await db.collection("matches").add({
        winner,
        loser,
        time: admin.firestore.Timestamp.now(),
      });
      return res.status(201).json({ message: "Match saved", id: newDoc.id });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to save match" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
