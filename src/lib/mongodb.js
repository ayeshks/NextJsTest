import { MongoClient } from "mongodb";

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://ayeshsenavirathne_db_user:QtXJNCatzLVSHzZZ@cluster0.cluchci.mongodb.net";

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 4000,
  socketTimeoutMS: 10000,
};

let client;
let clientPromise;

if (typeof window === "undefined") {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect().catch((err) => {
        console.warn("MongoDB Atlas connection warning:", err.message);
        return null;
      });
    }
    clientPromise = global._mongoClientPromise;
  } else {
    client = new MongoClient(uri, options);
    clientPromise = client.connect().catch((err) => {
      console.warn("MongoDB Atlas connection warning:", err.message);
      return null;
    });
  }
}

export default clientPromise;

export async function getDb() {
  try {
    if (!clientPromise) return null;
    const connectedClient = await clientPromise;
    if (!connectedClient) return null;
    return connectedClient.db("lontha_party");
  } catch (error) {
    console.warn("MongoDB getDb error:", error.message);
    return null;
  }
}
