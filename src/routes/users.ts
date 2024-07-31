import { Router } from "express";
import { prisma } from "~/lib/prisma";

const usersRoutes = Router()

usersRoutes.post("/sign-in", async (req, res) => {
  const { name, email } = req.body;

  let user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    user = await prisma.user.create({
      data: { name, email }
    })
  }

  console.log("prisma user", user)

  return res.status(200).json(user);
})

export { usersRoutes }

