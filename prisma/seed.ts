import "dotenv/config";
import bcrypt from "bcryptjs";
import { buatAdapter } from "../src/lib/adapter";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: buatAdapter(1),
});

// Same default admin as the old Laravel UsersSeeder. Change the password after first login.
async function main() {
  await prisma.user.upsert({
    where: { email: "admin@mail.io" },
    update: {},
    create: {
      name: "admin",
      email: "admin@mail.io",
      role: "ADMIN",
      passwordHash: await bcrypt.hash("admin123", 10),
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
