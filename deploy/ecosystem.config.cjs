const path = require('node:path');

// Keep the three repositories beside one another. This file lives in gateway/deploy/.
const gateway = path.resolve(__dirname, '..');
const root = path.dirname(gateway);
const presence = path.join(root, 'face-presence-service');
const recognition = path.join(root, 'face-recognition-service');
const common = {
  instances: 1,
  exec_mode: 'fork',
  autorestart: true,
  watch: false,
  restart_delay: 5000,
  time: true,
  kill_timeout: 10000,
};

module.exports = {
  apps: [
    {
      ...common,
      name: 'face-presence',
      cwd: presence,
      script: path.join(presence, '.venv/bin/python'),
      interpreter: 'none',
      args: '-m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1',
      env: { PYTHONUNBUFFERED: '1' },
    },
    {
      ...common,
      name: 'face-recognition',
      cwd: recognition,
      script: path.join(recognition, '.venv/bin/python'),
      interpreter: 'none',
      args: '-m uvicorn app.main:app --host 127.0.0.1 --port 8001 --workers 1',
      env: { PYTHONUNBUFFERED: '1' },
    },
    {
      ...common,
      name: 'face-access-gateway',
      cwd: gateway,
      script: path.join(gateway, 'dist/main.js'),
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3000',
        FACE_PRESENCE_URL: 'http://127.0.0.1:8000',
        FACE_RECOGNITION_URL: 'http://127.0.0.1:8001',
      },
    },
  ],
};
