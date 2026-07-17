import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authRoutes } from "./api/v2/auth";
import { deviceRoutes } from "./api/v2/device";
import { userRoutes } from "./api/v2/user";
import { stationRoutes } from "./api/v2/stations";
import { db, initialize } from "./db/database";
import { startMainStreamCorrectionSync, startMainStreamLatestSync } from "./services/mainStream";
import { staticPlugin } from "@elysiajs/static";

const port = Number(process.env.PORT) || 3000;

// 1. ลองดึงค่า URL ของเว็บ Frontend เราจาก .env (ถ้าไม่มีให้ยอมรับหมดแบบชั่วคราวไปก่อน)
const allowedOrigin = process.env.FRONTEND_URL ?? "*";

try {
  // 2. รอ DB พร้อมก่อน
  const database = await initialize();
  console.log("✅ Database connected successfully");

  // 3. แยกกั้นห้อง (Error Isolation) ให้ Service ย่อย
  // เพื่อป้องกันไม่ให้โปรแกรมหลักตายถ้า Service ย่อยมีปัญหา
  try {
    startMainStreamLatestSync(db);
    console.log("✅ MainStream Latest Sync started");
  } catch (err) {
    console.error("⚠️ MainStream Latest Sync failed, but proceeding...", err);
  }

  try {
    startMainStreamCorrectionSync(db);
    console.log("✅ MainStream Correction Sync started");
  } catch (err) {
    console.error("⚠️ MainStream Correction Sync failed, but proceeding...", err);
  }

  // 4. สร้าง App
  const app = new Elysia()
    
    // ใช้ CORS
    .use(cors({ origin: allowedOrigin }))
    
    .use(deviceRoutes)
    .use(authRoutes)
    .use(userRoutes)
    .use(stationRoutes)

    // 👇 SPA Fallback สำหรับ React/Vite (ต้องอยู่ล่างสุดของ Route เสมอ)
    .get("*", async ({ path }) => {
      // 1. ถ้า User เข้ามาที่หน้าแรก (/) ให้ส่ง index.html ทันที
      if (path === "/") {
        return Bun.file("./public/index.html");
      }

      // 2. ลองประกอบ Path เพื่อค้นหาไฟล์ (เช่น /assets/xxx.css จะกลายเป็น ./public/assets/xxx.css)
      const file = Bun.file(`./public${path}`);

      // 3. เช็คว่ามีไฟล์นี้อยู่จริงไหม? ถ้ามีให้ส่งไฟล์นั้นกลับไปเลย (Bun จะจัดการเรื่อง MIME Type ให้ถูกต้องเอง)
      if (await file.exists()) {
        return file;
      }

      // 4. ถ้าหาไฟล์ไม่เจอ (เช่น User พิมพ์ URL /dashboard) ให้ส่ง index.html ไปแทน 
      // เพื่อให้ React Router ฝั่งเบราว์เซอร์ทำงานต่อ (SPA Fallback)
      return Bun.file("./public/index.html");
    })
    
    // รับ Request (ผูก 0.0.0.0 สำหรับ Railway)
    .listen({ 
      port: port, 
      hostname: "0.0.0.0" 
    });
    
  console.log(`🦊 Elysia is running at port ${port}`);

} catch (error) {
  // 5. ถ้า DB ต่อไม่ได้จริงๆ ให้หยุดทำงานทันที (Fail-Fast)
  console.error("❌ Fatal Error: Failed to start server", error);
  process.exit(1);
}