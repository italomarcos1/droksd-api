import { prisma } from "./lib/prisma";

async function main() {
  await prisma.room.createMany({
    data: [
      { name: 'teste' },
      { name: 'lobby' },
      { name: 'abacate' },
    ],
  });
}

main()
  .then(() => {
    console.log('Seed data created');
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
