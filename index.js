import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

dotenv.config();
const app = express();

// Middleware
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ------------------------- MULTER SETUP ------------------------- */
const upload = multer({ dest: "uploads/" });

/* ------------------------- CLOUDINARY CONFIG ------------------------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ------------------------- MONGODB CONNECTION ------------------------- */
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

/* ------------------------- EVENT SCHEMA ------------------------- */
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, default: "🎉" },
  imageUrl: { type: String },
  imagePublicId: { type: String },
});
const Event = mongoose.model("Event", eventSchema);

/* ------------------------- UPDATE SCHEMA ------------------------- */
const updateSchema = new mongoose.Schema({
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Update = mongoose.model("Update", updateSchema);

/* ------------------------- MESSAGE SCHEMA ------------------------- */
const messageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

/* ------------------------- BASIC ROUTE ------------------------- */
app.get("/", (req, res) => res.send("✅ BCWD Hostel Backend Working"));

/* ------------------------- EVENT ROUTES ------------------------- */
// Fetch all events
app.get("/events", async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Create new event
app.post("/events", upload.single("image"), async (req, res) => {
  try {
    let imageUrl = "";
    let imagePublicId = "";

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "bcwd_events",
      });
      imageUrl = result.secure_url;
      imagePublicId = result.public_id;
      fs.unlinkSync(req.file.path);
    }

    const event = new Event({
      title: req.body.title,
      date: req.body.date,
      description: req.body.description,
      icon: req.body.icon,
      imageUrl,
      imagePublicId,
    });

    await event.save();
    res.status(201).json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// Update event
app.put("/events/:id", upload.single("image"), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const updateData = {
      title: req.body.title,
      date: req.body.date,
      description: req.body.description,
      icon: req.body.icon,
    };

    if (req.file) {
      if (event.imagePublicId) {
        await cloudinary.uploader.destroy(event.imagePublicId);
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "bcwd_events",
      });
      updateData.imageUrl = result.secure_url;
      updateData.imagePublicId = result.public_id;
      fs.unlinkSync(req.file.path);
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    res.json(updatedEvent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// Delete event
app.delete("/events/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    if (event.imagePublicId) {
      await cloudinary.uploader.destroy(event.imagePublicId);
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Event deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

/* ------------------------- UPDATE ROUTES ------------------------- */
app.get("/updates", async (req, res) => {
  try {
    const updates = await Update.find().sort({ createdAt: -1 });
    res.json(updates);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch updates" });
  }
});

app.post("/updates", async (req, res) => {
  try {
    const update = new Update({ message: req.body.message });
    await update.save();
    res.status(201).json(update);
  } catch (err) {
    res.status(500).json({ error: "Failed to create update" });
  }
});

app.delete("/updates/:id", async (req, res) => {
  try {
    await Update.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete update" });
  }
});

/* ------------------------- MESSAGE ROUTES ------------------------- */
app.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/messages", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message)
      return res.status(400).json({ error: "All fields are required" });

    const newMsg = new Message({ name, email, message });
    await newMsg.save();
    res.status(201).json(newMsg);
  } catch (err) {
    res.status(500).json({ error: "Failed to save message" });
  }
});

app.delete("/messages/:id", async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete message" });
  }
});

/* ------------------------- SERVER START ------------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
