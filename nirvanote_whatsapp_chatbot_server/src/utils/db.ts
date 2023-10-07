import { Db, MongoClient } from "mongodb";
import logger from "./logger";

let db: Db | null = null;

export async function connectToDatabase() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not found");
    }
    const client = await new MongoClient(process.env.MONGO_URI, {
      minPoolSize: 10,
      maxPoolSize: 25,
    });
    await client
      .connect()
      .then(async (clientConnection) => {
        db = clientConnection.db();
        logger.info("Connected to database");
      })
      .catch((err) => {
        throw err;
      });
  } catch (error) {
    console.error(error);
  }
}

export function getDb(): Db {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}
