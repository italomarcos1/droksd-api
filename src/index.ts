import http from "node:http";
import express from "express";
import { ExpressPeerServer } from "peer";

import cors from "cors";
import { IUser } from "./types";
import { roomsRoutes } from "./routes/rooms";
import { usersRoutes } from "./routes/users";

const app = express();
app.use(express.json())

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

app.get("/events", (req, res) => {
  console.log("aaa")
  res.writeHead(200, {
    // "Access-Control-Allow-Origin": "https://droksd.vercel.app",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  })
  console.log("bbb")

  res.flushHeaders()

  console.log("ccc")

  let cookie = undefined;
  
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split("; ")
    console.log("ddd")
    
    cookie = cookies.find(c => c.startsWith("droksd-user"))
  }

  console.log("eee")

  if (!cookie) {
    res.write("data: expired\n\n")
    return;
  }

  console.log("fff")

  clients.push(res);
  res.write("data: connected\n\n")

  req.on("close", () => {
    const cookies = req.headers.cookie.split("; ")
    const userId = cookies.find(c => c.startsWith("droksd-user")).split("=").at(-1)
    users = users.map(u => u.id === userId ? ({...u, roomId: undefined }) : u)

    clients.splice(clients.indexOf(res), 1);
    broadcastMessage("user-disconnected", JSON.stringify({ userId }))
  });
});

app.post("/connected", (req, res) => {
  const { user } = req.body;
  console.log("req.body", req.body)
  users = !users.some(u => u.id === user.id) ? [user, ...users] : users
  
  broadcastMessage("user-connected", JSON.stringify(users));
  res.status(200).send("Joined room");
});

app.post("/camera-status", (req, res) => {
  const { roomId, userId, cameraOn } = req.body;
  console.log("req.body", req.body)
  users = users.map(u => u.id === userId ? ({ ...u, cameraOn }) : u)
  const data = { cameraOn }
  broadcastMessage(`user-camera-${roomId}`, JSON.stringify({ userId, data }));

  res.status(200).send("Joined room");
});

app.post("/join-room", (req, res) => {
  const { roomId, userId } = req.body;
  console.log("join room req.body", req.body)
  users = users.map(u => u.id === userId ? ({...u, roomId, cameraOn: true}) : u)
    
  broadcastMessage(`user-connected-${roomId}`, JSON.stringify({ userId }));
  broadcastMessage("user-connected", JSON.stringify(users));

  res.status(200).send("Joined room");
});

app.post("/leave-room", (req, res) => {
  const { roomId, userId } = req.body;
  console.log("req.body", req.body)

  users = users.map(u => u.id === userId ? ({...u, roomId: undefined }) : u)

  broadcastMessage(`user-disconnected-${roomId}`, JSON.stringify({ userId }));
  broadcastMessage("user-connected", JSON.stringify(users));
  broadcastMessage(`user-stop-share-screen-${roomId}`, JSON.stringify({ userId }));

  res.status(200).send("Left room");
});

// app.post("/share-screen", (req, res) => {
//   const { roomId, userId } = req.body;
//   console.log("share screen req.body", req.body)
//   users = users.map(u => u.id === userId ? ({...u, isSharingScreen: userId }) : u)
    
//   broadcastMessage(`user-share-screen-${roomId}`, JSON.stringify({ userId }));

//   res.status(200).send("Joined room");
// });

function broadcastMessage(event, data) {
  console.log("event", event)
  console.log("data", data)

  clients.forEach(client => {
    client.write(`event: ${event}\n`);
    client.write(`data: ${data}\n\n`);
  });
}

httpServer.listen(3333, () =>
  console.log("HTTP Server on ::3333")
)
