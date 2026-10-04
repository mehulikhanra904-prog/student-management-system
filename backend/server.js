const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-in-production";
const DB_READY = () => mongoose.connection.readyState === 1;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    rollNumber: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1, max: 6 },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    attendance: { type: Number, min: 0, max: 100, default: 0 },
    marks: {
      dsa: { type: Number, min: 0, max: 100, default: 0 },
      dbms: { type: Number, min: 0, max: 100, default: 0 },
      os: { type: Number, min: 0, max: 100, default: 0 },
      ai: { type: Number, min: 0, max: 100, default: 0 },
    },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);
studentSchema.index({ rollNumber: 1 }, { unique: true });
studentSchema.index({ email: 1 }, { unique: true });

const userSchema = new mongoose.Schema(
  { name: String, email: { type: String, unique: true }, password: String, role: { type: String, default: "admin" } },
  { timestamps: true }
);

const Student = mongoose.model("Student", studentSchema);
const User = mongoose.model("User", userSchema);

function auth(req, res, next) {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", service: "student-management-system-api", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" })
);

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!DB_READY()) return res.status(503).json({ message: "Database is not connected. Set MONGODB_URI in Render Environment and redeploy." });
    if (!name || !email || !password || password.length < 6)
      return res.status(400).json({ message: "Name, email and a password of at least 6 characters are required" });
    const normalized = email.toLowerCase().trim();
    if (await User.findOne({ email: normalized })) return res.status(409).json({ message: "An account with this email already exists" });
    const user = await User.create({ name: name.trim(), email: normalized, password: await bcrypt.hash(password, 12) });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    if (!DB_READY()) return res.status(503).json({ message: "Database is not connected. Set MONGODB_URI in Render Environment and redeploy." });
    const email = req.body.email?.toLowerCase().trim();
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(req.body.password || "", user.password)))
      return res.status(401).json({ message: "Invalid email or password" });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user });
});

app.get("/api/students", auth, async (req, res) => {
  try {
    const { search = "", course = "", status = "" } = req.query;
    const query = {};
    if (search) query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { rollNumber: { $regex: search, $options: "i" } },
    ];
    if (course) query.course = course;
    if (status) query.status = status;
    const students = await Student.find(query).sort({ createdAt: -1 });
    res.json({ students });
  } catch (error) { res.status(500).json({ message: "Could not fetch students", error: error.message }); }
});

app.post("/api/students", auth, async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.status(201).json({ student, message: "Student added successfully" });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 400).json({ message: error.code === 11000 ? "Email or roll number already exists" : error.message });
  }
});

app.put("/api/students/:id", auth, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json({ student, message: "Student updated successfully" });
  } catch (error) { res.status(error.code === 11000 ? 409 : 400).json({ message: error.code === 11000 ? "Email or roll number already exists" : error.message }); }
});

app.delete("/api/students/:id", auth, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Student deleted successfully" });
  } catch (error) { res.status(500).json({ message: "Could not delete student" }); }
});

app.get("/api/dashboard", auth, async (req, res) => {
  const students = await Student.find();
  const total = students.length;
  const active = students.filter(s => s.status === "Active").length;
  const averageAttendance = total ? Math.round(students.reduce((a, s) => a + s.attendance, 0) / total) : 0;
  const averageMarks = total ? Math.round(students.reduce((a, s) => a + Object.values(s.marks || {}).reduce((x, v) => x + v, 0) / 4, 0) / total) : 0;
  const courses = [...new Set(students.map(s => s.course))].length;
  res.json({ total, active, inactive: total - active, averageAttendance, averageMarks, courses });
});

app.get("/api/students/:id", auth, async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: "Student not found" });
  res.json({ student });
});

const frontendDist = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendDist));
app.get("/{*splat}", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(frontendDist, "index.html"), err => err && res.status(404).json({ message: "Frontend build not found" }));
});

async function start() {
  try {
    if (process.env.MONGODB_URI) await mongoose.connect(process.env.MONGODB_URI);
    else console.warn("MONGODB_URI is not configured. API will start, but data persistence is unavailable.");
    app.listen(PORT, () => console.log("Student Management System running on port " + PORT));
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}
start();
