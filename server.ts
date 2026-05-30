import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { MongoClient, ObjectId, Db } from "mongodb";
import { MercadoPagoConfig, Preference } from "mercadopago";
import jwt from "jsonwebtoken";
import admin from "firebase-admin";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Environment Variables ---
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || "amarena_db";
const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || "amarena_fallback_secret_2025";
const ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASS = process.env.ADMIN_PASSWORD || "admin123";

// --- Lazy Initialization of Firebase Admin ---
let adminInitialized = false;

function initFirebaseAdmin() {
  if (!adminInitialized) {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      adminInitialized = true;
    } catch (err) {
      console.warn("Firebase Admin failed to initialize. Push notifications might not work.", err);
    }
  }
}

// --- Lazy Initialization of MongoDB ---
let dbClient: MongoClient | null = null;
let database: Db | null = null;

async function getDb() {
  if (!database) {
    if (!MONGO_URL) {
      throw new Error("MONGO_URL environment variable is not defined");
    }
    dbClient = new MongoClient(MONGO_URL, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    await dbClient.connect();
    database = dbClient.db(DB_NAME);
    console.log(`Connected to MongoDB: ${DB_NAME}`);
  }
  return database;
}

// --- Mercado Pago Setup ---
let mpClient: MercadoPagoConfig | null = null;

function getMpClient() {
  if (!mpClient) {
    if (!MP_ACCESS_TOKEN) {
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN environment variable is not defined");
    }
    mpClient = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
  }
  return mpClient;
}

// --- Middleware ---
const authenticateAdmin = (req: express.Request & { user?: { username: string; role: string } }, res: express.Response, next: express.NextFunction) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string; role: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // API Routes ---
  
  // Pre-connect to DB
  try {
    console.log("Pre-connecting to MongoDB...");
    const db = await getDb();
    // Ensure indexes for better performance
    await db.collection("products").createIndex({ category: 1 });
    await db.collection("orders").createIndex({ "clientInfo.phone": 1, createdAt: -1 });
    await db.collection("orders").createIndex({ createdAt: -1 });
    console.log("Database pre-connected and indexes ensured.");
  } catch (err) {
    console.warn("Failed to pre-connect to MongoDB or create indexes. This might cause slowness on first request.", err);
  }

  app.get("/api/health", async (_req, res) => {
    try {
      const db = await getDb();
      await db.command({ ping: 1 });
      res.json({ status: "ok", database: "connected", message: "Amarena Backend is operational" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ status: "error", error: message });
    }
  });

  // Auth
  app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const token = jwt.sign({ username, role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
      return res.json({ token, username });
    }
    res.status(401).json({ error: "Credenciais inválidas" });
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const db = await getDb();
      const products = await db.collection("products").find().toArray();
      res.json(products.map(p => ({ ...p, id: p._id.toString() })));
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/products", authenticateAdmin, async (req, res) => {
    try {
      const db = await getDb();
      const { name, category, subcategory, price, description, image, active } = req.body;
      const result = await db.collection("products").insertOne({ 
        name, 
        category, 
        subcategory,
        price: parseFloat(price), 
        description, 
        image,
        active: active !== undefined ? active : true,
        createdAt: new Date() 
      });
      res.status(201).json({ id: result.insertedId });
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.put("/api/products/:id", authenticateAdmin, async (req, res) => {
    try {
      const db = await getDb();
      const { name, category, subcategory, price, description, image, active } = req.body;
      await db.collection("products").updateOne(
        { _id: new ObjectId(req.params.id) },
        { 
          $set: { 
            name, 
            category, 
            subcategory,
            price: parseFloat(price), 
            description, 
            image,
            active: active !== undefined ? active : true,
            updatedAt: new Date() 
          } 
        }
      );
      res.json({ message: "Produto atualizado" });
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.delete("/api/products/:id", authenticateAdmin, async (req, res) => {
    try {
      const db = await getDb();
      await db.collection("products").deleteOne({ _id: new ObjectId(req.params.id) });
      res.json({ message: "Produto removido" });
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Push Notifications
  app.post("/api/push-token", async (req, res) => {
    try {
      const db = await getDb();
      const { token } = req.body;
      await db.collection("pushTokens").updateOne(
        { token },
        { $set: { token, updatedAt: new Date() } },
        { upsert: true }
      );
      res.json({ message: "Token registered" });
    } catch(err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/admin/push-notification", authenticateAdmin, async (req, res) => {
    try {
      initFirebaseAdmin();
      const db = await getDb();
      const { title, body } = req.body;
      
      const tokens = await db.collection("pushTokens").find().toArray();
      const registrationTokens = tokens.map(t => t.token);

      if (registrationTokens.length > 0) {
        await admin.messaging().sendEachForMulticast({
          tokens: registrationTokens,
          notification: { title, body },
        });
      }
      res.json({ message: "Notificações enviadas" });
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/orders/user/:phone", async (req, res) => {
    try {
      const db = await getDb();
      const phone = req.params.phone;
      const orders = await db.collection("orders").find({ "clientInfo.phone": phone }).sort({ createdAt: -1 }).toArray();
      res.json(orders.map(o => ({ ...o, id: o._id.toString() })));
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const db = await getDb();
      const { items, total, deliveryFee, paymentMethod, clientInfo } = req.body;
      const result = await db.collection("orders").insertOne({
        items,
        total,
        deliveryFee,
        paymentMethod,
        clientInfo,
        status: "pending",
        createdAt: new Date()
      });
      res.status(201).json({ id: result.insertedId });
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/admin/orders", authenticateAdmin, async (req, res) => {
    try {
      const db = await getDb();
      const orders = await db.collection("orders").find().sort({ createdAt: -1 }).toArray();
      res.json(orders.map(o => ({ ...o, id: o._id.toString() })));
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.patch("/api/admin/orders/:id", authenticateAdmin, async (req, res) => {
    try {
      const db = await getDb();
      await db.collection("orders").updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { status: req.body.status, updatedAt: new Date() } }
      );
      res.json({ message: "Status atualizado" });
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const db = await getDb();
      console.log("Fetching settings from DB...");
      const settings = await db.collection("settings").findOne({ _id: new ObjectId("000000000000000000000001") });
      console.log("Settings found:", settings);
      if (settings) {
        const rest = { ...settings };
        delete rest._id;
        res.json(rest);
      } else {
        res.json({});
      }
    } catch (err: unknown) {
      console.error("Error fetching settings:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.put("/api/settings", authenticateAdmin, async (req, res) => {
    try {
      const db = await getDb();
      const data = { ...req.body };
      delete data._id;
      await db.collection("settings").updateOne(
        { _id: new ObjectId("000000000000000000000001") },
        { $set: data },
        { upsert: true }
      );
      res.json({ message: "Configurações salvas" });
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Mercado Pago
  app.post("/api/payment/create-preference", async (req, res) => {
    try {
      const { items, external_reference } = req.body;
      const client = getMpClient();
      const preference = new Preference(client);
      
      const response = await preference.create({
        body: {
          items: items.map((item: { name: string; quantity: number; price: number }) => ({
            title: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            currency_id: "BRL"
          })),
          external_reference,
          back_urls: {
            success: `${process.env.APP_URL}/success`,
            failure: `${process.env.APP_URL}/failure`,
            pending: `${process.env.APP_URL}/pending`
          },
          auto_return: "approved",
          payment_methods: {
            excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }],
            installments: 12
          }
        }
      });
      res.json({ id: response.id, init_point: response.init_point });
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Vite
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
