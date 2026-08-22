# ==========================================
# Stage 1: Build Frontend
# ==========================================
FROM docker.io/oven/bun:1-alpine AS build-frontend
WORKDIR /app/frontend
COPY Frontend/package.json Frontend/bun.lock ./
RUN bun install --frozen-lockfile
COPY Frontend/ .
RUN bun run build 

# ==========================================
# Stage 2: Final Runtime (รวม Backend + Frontend Dist)
# ==========================================
FROM docker.io/oven/bun:1-alpine

WORKDIR /app

# 1. ติดตั้ง Backend Dependencies
COPY Backend/package.json Backend/bun.lock ./
RUN bun install --frozen-lockfile --production

# 2. ก๊อปปี้ Backend Source Code ทั้งหมด
COPY Backend/ .

# 3. ก๊อปปี้ไฟล์หน้าเว็บที่ Build เสร็จแล้ว (dist) จาก Stage 1 มาที่โฟลเดอร์ public
COPY --from=build-frontend /app/frontend/dist ./public

# 4. สิทธิ์ความปลอดภัย
RUN chown -R bun:bun /app
#USER bun

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]