import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

// Event schema
const eventSchema = new mongoose.Schema({
  title: String,
  date: String,
  description: String,
  icon: String,
});
const Event = mongoose.model("Event", eventSchema);

// Routes
app.get("/events", async (req,res) => {
  const events = await Event.find();
  res.json(events);
});

app.post("/events", async (req,res) => {
  const event = new Event(req.body);
  await event.save();
  res.json(event);
});

app.put("/events/:id", async (req,res) => {
  const updated = await Event.findByIdAndUpdate(req.params.id, req.body, {new:true});
  res.json(updated);
});

app.delete("/events/:id", async (req,res) => {
  await Event.findByIdAndDelete(req.params.id);
  res.json({success:true});
});

app.get("/", (req,res)=>res.send("Backend Working"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>console.log(`Server running on ${PORT}`));
