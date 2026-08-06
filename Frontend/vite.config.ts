import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc' // ใช้ SWC เร็วกว่า Babel ถือว่าเลือกเครื่องมือได้ดีมากครับ!

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: true, // 👈 เปิดให้รับ Traffic แบบ 0.0.0.0 เพื่อให้ทะลุ WSL ไปหา Zen Browser ได้ทันที
      port: 5173, // 👈 ล็อกพอร์ตไว้เลย ป้องกันการสุ่มพอร์ตใหม่ถ้า 5173 ชน
      proxy: {
        '/api': {
          target: env.VITE_API_ENDPOINT, 
          changeOrigin: true,
          secure: false,
          
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('❌ Proxy Error:', err);
            });
            proxy.on('proxyReq', (_proxyReq, req, _res) => {
              console.log('➡️ Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('✅ Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
      },
    },
  }
})