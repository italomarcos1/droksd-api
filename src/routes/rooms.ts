import { Router } from "express";
import { prisma } from "~/lib/prisma";

const roomsRoutes = Router()

roomsRoutes.get("/", async (_, res) => {
  const rooms = await prisma.room.findMany();

  return res.status(200).json(rooms);
})

roomsRoutes.post("/", async (req, res) => {
  const { name } = req.body;

  const room = await prisma.room.create({
    data: { name }
  });

  return res.status(200).json(room);
})

export { roomsRoutes }

