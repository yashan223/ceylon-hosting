import { MongoClient, type Db } from "mongodb";

const dbName = process.env.MONGODB_DB || "ceylonhosting";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

let cachedClientPromise: Promise<MongoClient> | undefined;

function getClientPromise(uri: string): Promise<MongoClient> {
  if (process.env.NODE_ENV !== "production") {
    if (!globalForMongo.mongoClientPromise) {
      globalForMongo.mongoClientPromise = new MongoClient(uri).connect();
    }
    return globalForMongo.mongoClientPromise;
  }

  cachedClientPromise ??= new MongoClient(uri).connect();
  return cachedClientPromise;
}

export async function getDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured.");

  const client = await getClientPromise(uri);
  return client.db(dbName);
}
