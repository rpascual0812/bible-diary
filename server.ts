import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  BAKED_XENDIT_SECRET_KEY,
  BAKED_XENDIT_TEST_SECRET_KEY,
} from "./src/config/apiKey";

function readSecret(value: string | undefined): string {
  return value?.trim() ?? "";
}

function isXenditTestKey(key: string): boolean {
  return key.startsWith("xnd_development_");
}

function resolveXenditSecretKey(useSandbox: boolean): string {
  const liveKey =
    readSecret(process.env.XENDIT_SECRET_KEY) || BAKED_XENDIT_SECRET_KEY.trim();
  const testKey =
    readSecret(process.env.XENDIT_TEST_SECRET_KEY) ||
    BAKED_XENDIT_TEST_SECRET_KEY.trim();

  if (useSandbox) {
    if (testKey) return testKey;
    if (liveKey && isXenditTestKey(liveKey)) return liveKey;
    return "";
  }

  if (liveKey && !isXenditTestKey(liveKey)) return liveKey;
  return liveKey;
}

function formatPhilippineMobile(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("63")) return `+${digits}`;
  if (digits.startsWith("0")) return `+63${digits.slice(1)}`;
  return `+63${digits}`;
}

function splitContributorName(name: string): {
  givenNames: string;
  surname: string;
} {
  const trimmed = name.trim();
  if (!trimmed) {
    return { givenNames: "Anonymous", surname: "Member" };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { givenNames: parts[0], surname: "Member" };
  }
  return {
    givenNames: parts.slice(0, -1).join(" "),
    surname: parts[parts.length - 1],
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const liveSecret =
    readSecret(process.env.XENDIT_SECRET_KEY) || BAKED_XENDIT_SECRET_KEY.trim();
  const testSecret =
    readSecret(process.env.XENDIT_TEST_SECRET_KEY) ||
    BAKED_XENDIT_TEST_SECRET_KEY.trim();

  console.log(
    "XENDIT CONFIGURATION CHECK - Live Secret Key Loaded:",
    liveSecret && !isXenditTestKey(liveSecret)
      ? `YES (Starts with ${liveSecret.substring(0, 16)}...)`
      : "NO",
  );
  console.log(
    "XENDIT CONFIGURATION CHECK - Test Secret Key Loaded:",
    testSecret || (liveSecret && isXenditTestKey(liveSecret))
      ? "YES"
      : "NO",
  );

  app.get("/api/xendit/status", (req, res) => {
    const hasLiveKey = !!liveSecret && !isXenditTestKey(liveSecret);
    const hasTestKey = !!testSecret || (liveSecret && isXenditTestKey(liveSecret));
    res.json({
      configured: hasLiveKey || hasTestKey,
      hasLiveKey,
      hasTestKey,
    });
  });

  app.post("/api/xendit/create-session", async (req, res) => {
    try {
      const { amount, purpose, name, email, phone, isSandbox, isDebug } =
        req.body;

      const useSandbox =
        isSandbox === true ||
        isDebug === true ||
        isXenditTestKey(liveSecret);

      const secretKey = resolveXenditSecretKey(useSandbox);
      if (!secretKey) {
        return res.status(400).json({
          error: "XENDIT_SECRET_KEY_MISSING",
          message: useSandbox
            ? "Xendit test secret key is not configured. Set XENDIT_TEST_SECRET_KEY in your environment."
            : "Xendit secret key is not configured. Set XENDIT_SECRET_KEY in your environment.",
        });
      }

      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount < 20) {
        return res.status(400).json({
          error: "INVALID_AMOUNT",
          message: "The minimum offering amount supported is PHP 20.00.",
        });
      }

      const amountInCentavos = Math.round(numericAmount * 100);
      const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;

      let baseUrl = "";
      if (process.env.APP_URL?.trim()) {
        baseUrl = process.env.APP_URL.trim();
        if (!baseUrl.endsWith("/")) {
          baseUrl += "/";
        }
      } else {
        const protocol =
          (req.headers["x-forwarded-proto"] as string) ||
          (req.headers.host?.includes("localhost") ? "http" : "https");
        const host = req.headers.host || "localhost:3000";
        baseUrl = `${protocol}://${host}/`;
      }

      const referenceId = `dhw-${Date.now()}`;
      const contributor = splitContributorName(name || "");
      const mobileNumber = phone ? formatPhilippineMobile(phone) : undefined;

      const xenditApiBase =
        process.env.XENDIT_API_URL?.replace(/\/$/, "") ||
        "https://api.xendit.co";

      const sessionPayload: Record<string, unknown> = {
        reference_id: referenceId,
        session_type: "PAY",
        mode: "PAYMENT_LINK",
        amount: amountInCentavos,
        currency: "PHP",
        country: "PH",
        description: `Daily Healing Word Church Support - ${purpose}`,
        success_return_url: `${baseUrl}?donation_status=success&amount=${numericAmount}&purpose=${encodeURIComponent(purpose)}`,
        cancel_return_url: baseUrl,
        items: [
          {
            reference_id: `${referenceId}-item`,
            type: "DIGITAL_PRODUCT",
            name: `Church Offering (${purpose})`,
            net_unit_amount: amountInCentavos,
            quantity: 1,
            currency: "PHP",
          },
        ],
        metadata: {
          contributor_name: name || "Anonymous Member",
          contributor_email: email || "anonymous@example.com",
          contributor_phone: phone || "N/A",
          purpose,
        },
      };

      if (email || mobileNumber || name) {
        sessionPayload.customer = {
          reference_id: `${referenceId}-customer`,
          type: "INDIVIDUAL",
          ...(email ? { email } : {}),
          ...(mobileNumber ? { mobile_number: mobileNumber } : {}),
          individual_detail: {
            given_names: contributor.givenNames,
            surname: contributor.surname,
          },
        };
      }

      const xenditResponse = await fetch(`${xenditApiBase}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(sessionPayload),
      });

      const responseBody: any = await xenditResponse.json();

      if (!xenditResponse.ok) {
        console.error("Xendit Error Details:", responseBody);
        const errMsg =
          responseBody?.message ||
          responseBody?.errors?.[0]?.message ||
          "The payment gateway rejected the request. Please verify your Xendit API key.";
        return res.status(xenditResponse.status).json({
          error: "XENDIT_GATEWAY_ERROR",
          message: errMsg,
        });
      }

      const checkoutUrl = responseBody?.payment_link_url;
      if (!checkoutUrl) {
        return res.status(500).json({
          error: "SESSION_CREATION_FAILED",
          message:
            "Did not receive a valid checkout URL from the payment gateway.",
        });
      }

      return res.json({ checkoutUrl });
    } catch (e: any) {
      console.error("Fatal checkout API error:", e);
      return res.status(500).json({
        error: "INTERNAL_SERVER_ERROR",
        message:
          e.message ||
          "An internal error occurred while reaching the church treasury gateway.",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted successfully.");
  } else {
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
