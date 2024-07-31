import crypto from "node:crypto";
import { Socket } from "socket.io";

const rooms: Record<string, string[]> = {};

interface IRoomParams {
    roomId: string;
    peerId: string;
}

export function roomHandler(socket: Socket) {
  function joinRoom({ roomId, peerId }: IRoomParams) {
    if (rooms[roomId]) {
      //? console.log("user joined the room", roomId, peerId);
      rooms[roomId].push(peerId);
      
      socket.join(roomId);
      socket.to(roomId).emit("user-joined", { peerId });
    }

    socket.on("disconnect", () => {
      console.log("user left the room", peerId);
      leaveRoom({ roomId, peerId });
    });
  };

  function leaveRoom({ peerId, roomId }: IRoomParams) {
    rooms[roomId] = rooms[roomId]?.filter((id) => id !== peerId);
    
    socket.to(roomId).emit("user-disconnected", peerId);
  };

  socket.on("join-room", joinRoom);
};
