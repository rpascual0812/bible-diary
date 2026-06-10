import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { 
  BAKED_PAYMONGO_SECRET_KEY, 
  BAKED_PAYMONGO_PUBLIC_KEY,
  BAKED_PAYMONGO_TEST_SECRET_KEY,
  BAKED_PAYMONGO_TEST_PUBLIC_KEY
} from "./src/config/apiKey";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse incoming request payloads securely
  app.use(express.json());

  // Show status logs on configuration
  const initialSecret = (process.env.PAYMONGO_SECRET_KEY && process.env.PAYMONGO_SECRET_KEY.trim()) || 
                        (typeof BAKED_PAYMONGO_SECRET_KEY !== "undefined" ? BAKED_PAYMONGO_SECRET_KEY.trim() : "");
  const testSecret = (process.env.PAYMONGO_TEST_SECRET_KEY && process.env.PAYMONGO_TEST_SECRET_KEY.trim()) || 
                     (typeof BAKED_PAYMONGO_TEST_SECRET_KEY !== "undefined" ? BAKED_PAYMONGO_TEST_SECRET_KEY.trim() : "");
  console.log("PAYMONGO CONFIGURATION CHECK - Live Secret Key Loaded:", initialSecret ? "YES (Starts with " + initialSecret.substring(0, 7) + "...)" : "NO");
  console.log("PAYMONGO CONFIGURATION CHECK - Sandbox Secret Key Loaded:", testSecret ? "YES (Starts with " + testSecret.substring(0, 7) + "...)" : "NO");

  // Check if system environment is equipped with PayMongo configuration
  app.get("/api/paymongo/status", (req, res) => {
    const hasLiveKey = !!process.env.PAYMONGO_SECRET_KEY || 
                       (typeof BAKED_PAYMONGO_SECRET_KEY !== "undefined" && !!BAKED_PAYMONGO_SECRET_KEY.trim());
    const hasTestKey = !!process.env.PAYMONGO_TEST_SECRET_KEY || 
                       (typeof BAKED_PAYMONGO_TEST_SECRET_KEY !== "undefined" && !!BAKED_PAYMONGO_TEST_SECRET_KEY.trim());
    const pubKey = process.env.PAYMONGO_PUBLIC_KEY || 
                   (typeof BAKED_PAYMONGO_PUBLIC_KEY !== "undefined" ? BAKED_PAYMONGO_PUBLIC_KEY.trim() : null);
    const testPubKey = process.env.PAYMONGO_TEST_PUBLIC_KEY || 
                       (typeof BAKED_PAYMONGO_TEST_PUBLIC_KEY !== "undefined" ? BAKED_PAYMONGO_TEST_PUBLIC_KEY.trim() : null);
    res.json({
      configured: hasLiveKey || hasTestKey,
      hasLiveKey,
      hasTestKey,
      publicKey: pubKey || null,
      testPublicKey: testPubKey || null
    });
  });

  // Secure Server-to-Server PayMongo Checkout Session creation endpoint
  app.post("/api/paymongo/create-session", async (req, res) => {
    try {
      const { amount, purpose, name, email, phone, isSandbox, isDebug } = req.body;
      
      // Determine if sandbox/test environment should be utilized (default to sandbox if requested by debug APK or client flag)
      const useSandbox = isSandbox === true || 
                         isDebug === true || 
                         process.env.PAYMONGO_SECRET_KEY?.startsWith("sk_test") ||
                         (typeof BAKED_PAYMONGO_SECRET_KEY === "string" && BAKED_PAYMONGO_SECRET_KEY.startsWith("sk_test"));

      let secretKey = "";
      if (useSandbox) {
        secretKey = (process.env.PAYMONGO_TEST_SECRET_KEY && process.env.PAYMONGO_TEST_SECRET_KEY.trim()) || 
                    (process.env.PAYMONGO_SECRET_KEY && process.env.PAYMONGO_SECRET_KEY.startsWith("sk_test") ? process.env.PAYMONGO_SECRET_KEY.trim() : "") ||
                    (typeof BAKED_PAYMONGO_TEST_SECRET_KEY !== "undefined" ? BAKED_PAYMONGO_TEST_SECRET_KEY.trim() : "");
      } else {
        secretKey = (process.env.PAYMONGO_SECRET_KEY && process.env.PAYMONGO_SECRET_KEY.trim()) || 
                    (typeof BAKED_PAYMONGO_SECRET_KEY !== "undefined" ? BAKED_PAYMONGO_SECRET_KEY.trim() : "");
      }

      if (!secretKey) {
        return res.status(400).json({
          error: "PAYMONGO_SECRET_KEY_MISSING",
          message: useSandbox 
            ? "PayMongo sandbox key is not configured. Please define BAKED_PAYMONGO_TEST_SECRET_KEY inside 'apiKey.ts'."
            : "PayMongo secret key is not configured. Please define BAKED_PAYMONGO_SECRET_KEY inside 'apiKey.ts'."
        });
      }

      // Check amount validity. PayMongo expects amount in Philippine Centavos (e.g., ₱100.00 = 10000 centavos)
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount < 20) {
        return res.status(400).json({
          error: "INVALID_AMOUNT",
          message: "The minimum offering amount supported by PayMongo is ₱20.00 (PHP)."
        });
      }

      const amountInCentavos = Math.round(numericAmount * 100);
      const authHeader = `Basic ${Buffer.from(secretKey + ":").toString("base64")}`; // Key with a trailing colon

      // Compute dynamic, robust back-reference URLs matching the client's ingress (resolving referer parsing and proxy issues)
      let baseUrl = "";
      if (process.env.APP_URL && process.env.APP_URL.trim()) {
        baseUrl = process.env.APP_URL.trim();
        if (!baseUrl.endsWith("/")) {
          baseUrl += "/";
        }
      } else {
        const protocol = (req.headers["x-forwarded-proto"] as string) || (req.headers.host?.includes("localhost") ? "http" : "https");
        const host = req.headers.host || "localhost:3000";
        baseUrl = `${protocol}://${host}/`;
      }

      // Send payment session initiation request to official PayMongo REST API
      const paymongoApiBase = process.env.PAYMONGO_API_URL || "https://api.paymongo.com";
      const pmResponse = await fetch(`${paymongoApiBase}/v1/checkout_sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader
        },
        body: JSON.stringify({
          data: {
            attributes: {
              send_email_receipt: true,
              show_description: true,
              show_line_items: true,
              cancel_url: baseUrl,
              success_url: `${baseUrl}?donation_status=success&amount=${numericAmount}&purpose=${encodeURIComponent(purpose)}`,
              description: `bible-diary Church Support - Gift of ${purpose}`,
              line_items: [
                {
                  amount: amountInCentavos,
                  currency: "PHP",
                  name: `Church Offering (${purpose})`,
                  quantity: 1
                }
              ],
              payment_method_types: [
                "gcash",
                "paymaya",
                "grab_pay",
                "card",
                "dob_ubp"
              ],
              metadata: {
                contributor_name: name || "Anonymous Member",
                contributor_email: email || "anonymous@example.com",
                contributor_phone: phone || "N/A"
              }
            }
          }
        })
      });

      const responseBody: any = await pmResponse.json();

      if (!pmResponse.ok) {
        console.error("PayMongo Error Details:", responseBody);
        const errMsg = responseBody?.errors?.[0]?.detail || "The payment gateway rejected the request. Please verify your API key.";
        return res.status(pmResponse.status).json({
          error: "PAYMONGO_GATEWAY_ERROR",
          message: errMsg
        });
      }

      const checkoutUrl = responseBody?.data?.attributes?.checkout_url;
      if (!checkoutUrl) {
        return res.status(500).json({
          error: "SESSION_CREATION_FAILED",
          message: "Did not receive a valid checkout URL from the payment gateway."
        });
      }

      return res.json({ checkoutUrl });
    } catch (e: any) {
      console.error("Fatal checkout API error:", e);
      return res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        message: e.message || "An internal error occurred while reaching the church treasury gateway."
      });
    }
  });

  // Load Vite as middleware in Development mode to handle asset rendering & HM-Reloading
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted successfully.");
  } else {
    // In production modes, directly mount compiled SPA folders
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static server route configured.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Church App Server listening at http://localhost:${PORT}`);
  });
}

startServer();
