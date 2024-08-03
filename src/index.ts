import "dotenv/config"
import "./instrument";

import http from "node:http";
import crypto from "node:crypto";
import express from "express";
import * as Sentry from "@sentry/node";
import { ExpressPeerServer } from "peer";
import helmet from "helmet";

import cors from "cors";
import { IUser } from "./types";
import { roomsRoutes } from "./routes/rooms";
import { usersRoutes } from "./routes/users";
import { AppError } from "./errors";

const app = express();

app.use(express.json())
app.use(helmet())
app.use(cors({
  origin: ["http://localhost:3000", "https://droksd.vercel.app"],
  credentials: true,
}));

const httpServer = http.createServer(app);
const peerServer = ExpressPeerServer(httpServer);

app.use("/peerjs", peerServer);
app.use("/users", usersRoutes)
app.use("/rooms", roomsRoutes)

const clients = [];
let users: IUser[] = [];

app.get("/", (_, res) => res.send("up and running"))

app.get("/events", (req, res, next) => {
  try {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    })

    res.flushHeaders()

    let cookie = undefined;
    
    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split("; ")
      
      cookie = cookies.find(c => c.startsWith("droksd-user"))
    }

    // if (!cookie) {
    //   res.write("data: expired\n\n")
    //   return;
    // }

    clients.push(res);
    res.write("data: connected\n\n")

    const intervalId = setInterval(() => {
      res.write("data: ping\n\n");
    }, 15000)

    req.on("close", () => {
      clearInterval(intervalId);
      let userId = "";
    
      if (req.headers.cookie) {
        const cookies = req.headers.cookie.split("; ")
        const cookie = cookies.find(c => c.startsWith("droksd-user"))
        
        if (cookie)
          userId = cookie.split("=").at(-1) as string
      }
      
      users = users.map(u => u.id === userId ? ({...u, roomId: undefined }) : u)

      clients.splice(clients.indexOf(res), 1);
      broadcastMessage("user-disconnected", JSON.stringify({ userId }))
    });
  } catch (error) {
    next(new AppError("Failed to establish event stream", 500));
  }
});

app.post("/connected", (req, res, next) => {
  try {
    const { user } = req.body;
    console.log("req.body", req.body)
    users = !users.some(u => u.id === user.id) ? [user, ...users] : users
    
    broadcastMessage("user-connected", JSON.stringify(users));
    res.status(200).send("Joined room");
  } catch (error) {
    next(new AppError("Failed to connect user", 500));
  }
});

app.post("/camera-status", (req, res, next) => {
  try {
    const { roomId, userId, cameraOn } = req.body;
    console.log("req.body", req.body)
    users = users.map(u => u.id === userId ? ({ ...u, cameraOn }) : u)
    const data = { cameraOn }
    broadcastMessage(`user-camera-${roomId}`, JSON.stringify({ userId, data }));

    res.status(200).send("Joined room");
  } catch (error) {
    next(new AppError("Failed to update camera status", 500));
  }
});

app.post("/join-room", (req, res, next) => {
  try {
    const { roomId, userId } = req.body;
    console.log("join room req.body", req.body)
    users = users.map(u => u.id === userId ? ({...u, roomId, cameraOn: true}) : u)
      
    broadcastMessage(`user-connected-${roomId}`, JSON.stringify({ userId }));
    broadcastMessage("user-connected", JSON.stringify(users));

    res.status(200).send("Joined room");
  } catch (error) {
    next(new AppError("Failed to join room", 500));
  }
});

app.post("/leave-room", (req, res, next) => {
  try {
    const { roomId, userId } = req.body;
    console.log("req.body", req.body)

    users = users.map(u => u.id === userId ? ({...u, roomId: undefined }) : u)

    broadcastMessage(`user-disconnected-${roomId}`, JSON.stringify({ userId }));
    broadcastMessage("user-connected", JSON.stringify(users));
    broadcastMessage(`user-stop-share-screen-${roomId}`, JSON.stringify({ userId }));

    res.status(200).send("Left room");
  } catch (error) {
    next(new AppError("Failed to leave room", 500));
  }
});

app.post("/send-message", (req, res, next) => {
  try {
    const { roomId, userId, content, type } = req.body;

    const message = {
      id: crypto.randomUUID(),
      userId,
      type: type ?? "message",
      content,
      createdAt: new Date().toLocaleTimeString({ hourCycle:"h24" }, { timeStyle: "short" })
    }

    broadcastMessage(`new-message-${roomId}`, JSON.stringify(message));

    res.status(200).send("Message sent");
  } catch (error) {
    next(new AppError("Failed to send message", 500));
  }
});

function broadcastMessage(event, data) {
  console.log("event", event)
  console.log("data", data)

  clients.forEach(client => {
    client.write(`event: ${event}\n`);
    client.write(`data: ${data}\n\n`);
  });
}

Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

httpServer.listen(3333, () =>
  console.log("HTTP Server on ::3333")
)
