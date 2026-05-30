import app from './api-server';
import path from 'path';
import fs from 'fs';
import express from 'express';

const PORT = 3000;

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || 
                 process.argv.join(' ').includes('server.cjs') ||
                 !fs.existsSync(path.join(process.cwd(), 'server.ts'));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on port ${PORT} inside ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} container`);
  });
}

startServer();
