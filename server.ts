import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { MongoClient, ObjectId, Db } from "mongodb";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import jwt from "jsonwebtoken";
import admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import { sendOrderToSaipos } from "./src/services/saipos.ts";

dotenv.config();

// --- Environment Variables ---
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || "amarena_db";
const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || "amarena_fallback_secret_2025";
const ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASS = process.env.ADMIN_PASSWORD || "admin123";

console.log("[Amarena] Starting startup sequence...");

// --- Lazy Initialization of Firebase Admin ---
let adminInitialized = false;

function initFirebaseAdmin() {
  if (!adminInitialized) {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      adminInitialized = true;
      console.log("[Amarena] Firebase Admin initialized.");
    } catch (err) {
      console.warn("[Amarena] Firebase Admin failed to initialize. Push notifications might not work.", err);
    }
  }
}

// --- Lazy Initialization of MongoDB ---
let dbClient: MongoClient | null = null;
let database: Db | null = null;
let dbConnectingPromise: Promise<Db> | null = null;

async function getDb() {
  if (database) return database;
  
  if (!dbConnectingPromise) {
    dbConnectingPromise = (async () => {
      try {
        if (!MONGO_URL) {
          throw new Error("MONGO_URL environment variable is not defined. Please set it in AI Studio Settings.");
        }
        console.log("[Amarena] Establishing MongoDB connection...");
        dbClient = new MongoClient(MONGO_URL, {
          maxPoolSize: 10,
          minPoolSize: 2,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 10000,
        });
        
        await dbClient.connect();
        const db = dbClient.db(DB_NAME);
        database = db;
        
        console.log(`[Amarena] Successfully connected to MongoDB: ${DB_NAME}`);
        return db;
      } catch (error) {
        dbConnectingPromise = null;
        console.error("[Amarena] MongoDB connection error:", error instanceof Error ? error.message : String(error));
        throw error;
      }
    })();
  }
  
  return dbConnectingPromise;
}

let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not defined");
    }
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
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
  const PORT = process.env.PORT || 3000;

  console.log("[Amarena] Initialization Info:");
  console.log("  - DB Status:", MONGO_URL ? "URL Provided" : "URL MISSING");
  console.log("  - MP Status:", MP_ACCESS_TOKEN ? "Token Provided" : "Token MISSING");
  console.log("  - ENV:", process.env.NODE_ENV || "development");

  // IMMEDIATELY START LISTENING to satisfy health checks
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Amarena] Listening on port ${PORT} (satisfying health checks)`);
  });

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // Pre-connect and ensure indexes in background
  getDb().then(async (db) => {
    try {
      console.log("[Amarena] Ensuring database indexes...");
      await db.collection("products").createIndex({ category: 1 });
      await db.collection("products").createIndex({ active: 1 });
      await db.collection("orders").createIndex({ "clientInfo.phone": 1, createdAt: -1 });
      await db.collection("orders").createIndex({ createdAt: -1 });
      await db.collection("orders").createIndex({ status: 1 });
      await db.collection("pushTokens").createIndex({ token: 1 }, { unique: true });
      console.log("[Amarena] Database indexes ensured.");
    } catch (idxErr) {
      console.warn("[Amarena] Index creation warning:", idxErr instanceof Error ? idxErr.message : String(idxErr));
    }
  }).catch(err => {
    console.warn("[Amarena] Background DB startup failed:", err.message);
  });

  app.get("/api/health", async (_req, res) => {
    try {
      if (database) {
        await database.command({ ping: 1 });
        return res.json({ status: "ok", database: "connected", mode: process.env.NODE_ENV || "development" });
      }
      res.json({ status: "ok", database: "not_connected_yet", mode: process.env.NODE_ENV || "development" });
    } catch (err: unknown) {
      res.status(500).json({ status: "error", error: String(err) });
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

// Helper function to send notification to a phone
async function sendNotificationToPhone(phone: string, title: string, body: string, db: Db) {
  try {
    initFirebaseAdmin();
    const tokens = await db.collection("pushTokens").find({ phone }).toArray();
    const registrationTokens = tokens.map(t => t.token);

    if (registrationTokens.length > 0) {
      await admin.messaging().sendEachForMulticast({
        tokens: registrationTokens,
        notification: { title, body },
      });
      console.log(`[Amarena] Push notification sent to phone ${phone}`);
    }
  } catch (err) {
    console.error("[Amarena] Error sending push notification:", err);
  }
}

  // Push Notifications
  app.post("/api/push-token", async (req, res) => {
    try {
      const db = await getDb();
      const { token, phone } = req.body;
      const updateData: any = { token, updatedAt: new Date() };
      if (phone) updateData.phone = phone;

      await db.collection("pushTokens").updateOne(
        { token },
        { $set: updateData },
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
      const orderDoc = {
        items: items || [],
        total: Number(total) || 0,
        deliveryFee: Number(deliveryFee) || 0,
        paymentMethod: paymentMethod || "Não informado",
        clientInfo: clientInfo || {},
        status: "pending",
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = await db.collection("orders").insertOne(orderDoc);
      
      console.log(`[Amarena] New order created in database with ID: ${result.insertedId.toString()}`);
      
      // Assincronamente envia para a Saipos
      sendOrderToSaipos({ ...orderDoc, _id: result.insertedId });
      
      res.status(201).json({ id: result.insertedId.toString() });
    } catch (err: unknown) {
      console.error("[Amarena] Error creating order:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // WhatsApp Webhook Integration
  app.post("/api/webhook/whatsapp", async (req, res) => {
    try {
      const db = await getDb();
      const { message, customerPhone, customerName, address } = req.body;
      
      let orderData: any = null;

      if (message) {
        // Parse unstructured message using Gemini
        const ai = getGemini();
        
        // Fetch current active products to give context to Gemini
        const products = await db.collection("products").find({ active: { $ne: false } }).toArray();
        const menuContext = products.map((p: any) => `- ${p.name} (Categoria: ${p.category}) - R$ ${p.price}`).join('\n');

        const prompt = `Você é um assistente de extração de pedidos para a sorveteria Amarena.
Abaixo está o cardápio atual:
${menuContext}

O cliente enviou a seguinte mensagem no WhatsApp:
"${message}"

Extraia os itens que ele pediu, cruzando com o nosso cardápio.
Responda APENAS com um JSON válido seguindo essa estrutura:
{
  "items": [
    {
      "id": "gerencie_um_id_aleatorio_ou_o_nome",
      "name": "Nome do Produto",
      "price": 10.00,
      "quantity": 2,
      "size": "Tamanho (se houver)",
      "options": ["Adicional 1"]
    }
  ],
  "total": 20.00,
  "deliveryType": "delivery ou pickup",
  "paymentMethod": "Dinheiro, PIX ou Cartão"
}`;

        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
             responseMimeType: 'application/json',
          }
        });
        
        try {
          orderData = JSON.parse(result.text || "{}");
        } catch (e) {
          console.error("Failed to parse Gemini response as JSON", e);
          orderData = { items: [] };
        }
      } else if (req.body.items) {
        // Structured data directly from a more advanced bot
        orderData = req.body;
      } else {
        return res.status(400).json({ error: "No message or order data provided" });
      }

      // Calculate final total based on items if not set
      let calculatedTotal = 0;
      const itemsToSave = (orderData.items || []).map((item: any) => {
        const itemTotal = (Number(item.price) * (Number(item.quantity) || 1));
        calculatedTotal += itemTotal;
        return {
          ...item,
          quantity: item.quantity || 1,
          id: item.id || Math.random().toString(36).substr(2, 9)
        };
      });

      const finalTotal = orderData.total || calculatedTotal;
      const finalDeliveryType = orderData.deliveryType || req.body.deliveryType || (address ? 'delivery' : 'pickup');
      const finalAddress = address || (finalDeliveryType === 'delivery' ? 'Endereço recebido via WhatsApp' : 'Retirada na Sorveteria');

      const orderDoc = {
        items: itemsToSave,
        total: Number(finalTotal) || 0,
        deliveryFee: finalDeliveryType === 'delivery' ? 5 : 0,
        paymentMethod: orderData.paymentMethod || "Acertar na Entrega / WhatsApp",
        clientInfo: {
          name: customerName || "Cliente do WhatsApp",
          phone: customerPhone || "Telefone não informado",
          deliveryType: finalDeliveryType,
          address: finalAddress
        },
        status: "pending",
        source: "whatsapp",
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const dbResult = await db.collection("orders").insertOne(orderDoc);

      console.log(`[Amarena] New WhatsApp order created with ID: ${dbResult.insertedId.toString()}`);
      
      // Assincronamente envia para a Saipos
      sendOrderToSaipos({ ...orderDoc, _id: dbResult.insertedId });

      res.status(201).json({ id: dbResult.insertedId.toString(), message: "Order processed successfully", orderData });
    } catch (err: unknown) {
      console.error("[Amarena] Error processing WhatsApp webhook:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Orders
  app.get("/api/orders/:id/track", async (req, res) => {
    try {
      const db = await getDb();
      const order = await db.collection("orders").findOne(
        { _id: new ObjectId(req.params.id) },
        { projection: { 
          status: 1, 
          deliveryLocation: 1, 
          clientInfo: 1,
          createdAt: 1
        }}
      );
      if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
      res.json(order);
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
      const order = await db.collection("orders").findOne({ _id: new ObjectId(req.params.id) });
      if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

      const updateFields: any = {};
      if (req.body.status !== undefined) updateFields.status = req.body.status;
      if (req.body.archived !== undefined) updateFields.archived = req.body.archived;
      updateFields.updatedAt = new Date();

      await db.collection("orders").updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: updateFields }
      );

      // Trigger push notification if status changed to 'shipped'
      if (req.body.status === 'shipped' && order.status !== 'shipped' && order.clientInfo?.phone) {
        await sendNotificationToPhone(
          order.clientInfo.phone,
          "Pedido a caminho! 🚚",
          `Seu pedido #${order._id.toString().slice(-4).toUpperCase()} saiu para entrega.`,
          db
        );
      }

      res.json({ message: "Pedido atualizado com sucesso" });
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/admin/orders/archive-completed", authenticateAdmin, async (req, res) => {
    try {
      const db = await getDb();
      const result = await db.collection("orders").updateMany(
        { 
          status: { $in: ["completed", "cancelled"] },
          archived: { $ne: true }
        },
        { $set: { archived: true, updatedAt: new Date() } }
      );
      res.json({ message: "Pedidos arquivados com sucesso", modifiedCount: result.modifiedCount });
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.patch("/api/admin/orders/:id/location", authenticateAdmin, async (req, res) => {
    try {
      const db = await getDb();
      const { lat, lng } = req.body;
      const order = await db.collection("orders").findOne({ _id: new ObjectId(req.params.id) });

      await db.collection("orders").updateOne(
        { _id: new ObjectId(req.params.id) },
        { 
          $set: { 
            deliveryLocation: { lat, lng, updatedAt: new Date() },
            status: "shipped" 
          } 
        }
      );

      // Trigger push notification if status changed to 'shipped'
      if (order && order.status !== 'shipped' && order.clientInfo?.phone) {
        await sendNotificationToPhone(
          order.clientInfo.phone,
          "Pedido a caminho! 🚚",
          `Seu pedido #${order._id.toString().slice(-4).toUpperCase()} saiu para entrega. Acompanhe no app!`,
          db
        );
      }

      res.json({ message: "Localização atualizada" });
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/orders/:id/location", async (req, res) => {
    try {
      const db = await getDb();
      const order = await db.collection("orders").findOne(
        { _id: new ObjectId(req.params.id) },
        { projection: { deliveryLocation: 1, status: 1 } }
      );
      if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
      res.json(order.deliveryLocation || null);
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

  // Daily Closings
  app.get("/api/daily-closings", authenticateAdmin, async (req, res) => {
    try {
      const db = await getDb();
      const closings = await db.collection("daily_closings").find().sort({ createdAt: -1 }).limit(30).toArray();
      res.json(closings);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/daily-closings", authenticateAdmin, async (req, res) => {
    try {
      const db = await getDb();
      const doc = { ...req.body, createdAt: new Date().toISOString() };
      await db.collection("daily_closings").insertOne(doc);
      res.json({ message: "Fechamento registrado com sucesso" });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Mercado Pago
  app.post("/api/payment/pix", async (req, res) => {
    try {
      const { transaction_amount, description, email } = req.body;
      const client = getMpClient();
      const payment = new Payment(client);
      
      const response = await payment.create({
        body: {
          transaction_amount: transaction_amount,
          description: description,
          payment_method_id: "pix",
          payer: {
            email: email || "cliente@amarena.com"
          }
        }
      });
      
      res.json({ 
        payment_id: response.id,
        qr_code: response.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: response.point_of_interaction?.transaction_data?.qr_code_base64
      });
    } catch (err: unknown) {
      console.error(err);
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/payment/pix/:id", async (req, res) => {
    try {
      const client = getMpClient();
      const payment = new Payment(client);
      const response = await payment.get({ id: req.params.id });
      res.json({ status: response.status });
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/payment/create-preference", async (req, res) => {
    try {
      const { items, external_reference } = req.body;
      const client = getMpClient();
      const preference = new Preference(client);
      
      const appUrl = process.env.APP_URL || (req.headers.origin ? String(req.headers.origin) : `${req.protocol}://${req.get('host')}`);
      
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
            success: `${appUrl}/success`,
            failure: `${appUrl}/failure`,
            pending: `${appUrl}/pending`
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
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      
      // Ensure 404s are handled as SPA fallback in dev too
      app.get("*", async (req, res, next) => {
        const url = req.originalUrl;
        if (url.startsWith("/api")) return next();
        
        try {
          let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
        }
      });
    } catch (viteError) {
      console.warn("Failed to load Vite dev server. This is expected in production if built correctly.", viteError);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  process.on("SIGINT", () => {
    console.log("[Amarena] Shutting down...");
    server.close(() => {
      if (dbClient) dbClient.close();
      process.exit(0);
    });
  });
}

startServer().catch(err => {
  console.error("Critical error starting server:", err);
  process.exit(1);
});
