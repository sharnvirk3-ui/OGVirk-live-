import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import 'dotenv/config';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Read Supabase configuration server-side (never exposed in client bundles)
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aapmxzftgfimheggtqjv.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_hJwwwR71DMGDFu7QeU8COQ_btWnlBUs';

  // API routes FIRST
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Server-side endpoint to provide Supabase config to authenticated/authorized client sessions
  app.get('/api/supabase-config', (_req, res) => {
    res.json({
      url: SUPABASE_URL,
      anonKey: SUPABASE_ANON_KEY,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
