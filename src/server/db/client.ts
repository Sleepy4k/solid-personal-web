"use server";

import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const g = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl =
  process.env.DATABASE_URL ??
  "mysql://root:password@localhost:3306/portfolio_db";

export const db =
  g.prisma ??
  new PrismaClient({
    adapter: new PrismaMariaDb(databaseUrl),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") g.prisma = db;
