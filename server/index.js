const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
app.use(cors());
app.use(express.json());

// Create student accounts from CSV import
app.post("/api/create-students", async (req, res) => {
  const { students } = req.body;
  const results = [];

  for (const student of students) {
    const email = `${student.rollNo.toLowerCase()}@college.com`;
    const password = student.rollNo;
    console.log(`Processing: ${email}`);

    try {
      let uid;
      try {
        const existing = await admin.auth().getUserByEmail(email);
        uid = existing.uid;
        console.log(`Already exists: ${email} uid: ${uid}`);
      } catch (e) {
        const userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: student.name,
        });
        uid = userRecord.uid;
        console.log(`✅ Created Auth: ${email} uid: ${uid}`);
      }

      await db.collection("users").doc(uid).set({
        role: "student",
        name: student.name,
        email,
        rollNo: student.rollNo,
        department: student.department,
        year: student.year,
      });

      console.log(`✅ Firestore updated for: ${email}`);
      results.push({ rollNo: student.rollNo, status: "created", email });
    } catch (err) {
      console.log(`❌ Failed: ${email} - ${err.message}`);
      results.push({ rollNo: student.rollNo, status: "skipped", reason: err.message });
    }
  }

  res.json({ success: true, results });
});

// Fix missing role field
app.post("/api/fix-roles", async (req, res) => {
  const snapshot = await db.collection("users").get();
  let fixed = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (!data.role) {
      await db.collection("users").doc(docSnap.id).update({
        role: "student"
      });
      console.log(`Fixed role for: ${data.email}`);
      fixed++;
    }
  }

  res.json({ success: true, fixed });
});

// Fix all student documents - add role field to all @college.com users
app.post("/api/fix-all-students", async (req, res) => {
  const snapshot = await db.collection("users").get();
  let fixed = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.email && data.email.includes("@college.com")) {
      await db.collection("users").doc(docSnap.id).set({
        ...data,
        role: "student",
      }, { merge: true });
      console.log(`Fixed: ${data.email}`);
      fixed++;
    }
  }

  res.json({ success: true, fixed });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));