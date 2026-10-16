# Current EC2 deployment

Deployed on 2026-10-16 to `i-092300e6eeabdb8e2` (`face-access`),
region `eu-central-1`, Ubuntu 26.04 x86_64, SSH user `ubuntu`.
Current public IP: `63.187.49.239`. This address may change after a stop/start
unless a stable address is configured.

- Swagger: http://63.187.49.239/docs
- ESP32: `ws://63.187.49.239/ws/esp32`
- Frontend: `ws://63.187.49.239/ws/frontend`

Applications live under `/home/ubuntu/apps/`:
`face-access-gateway`, `face-presence-service`, `face-recognition-service`.
Node.js 24 is installed under `/usr/local`; each Python service has its own
`.venv`. Production gateway dependencies were installed with `npm ci --omit=dev`;
the gateway was built locally and uploaded. The gateway Git checkout includes
uncommitted deployment changes; commit and push those before using Git-based
updates. Building on the server requires `npm ci` including dev dependencies.

PM2 names: `face-access-gateway`, `face-presence`, `face-recognition`.
`pm2-ubuntu.service` and Nginx are enabled and active. `pm2 save` completed, and
restoration was verified by stopping PM2 and starting it through systemd.
Run PM2 commands as `ubuntu`, without sudo. Log rotation keeps seven 10 MB files.

Nginx site: `/etc/nginx/sites-available/face-access-gateway`, enabled by symlink.
All application ports (3000, 8000, 8001) bind to localhost; only Nginx exposes
the API. Existing EC2 security-group rules were left unchanged.
This deployment uses HTTP/WS without TLS or client authentication.

Verified after restoring PM2:

- Swagger and protocol endpoints respond through the public IP.
- Both WebSocket paths work through Nginx.
- A generated blank PNG returns `no_face` through the gateway and real presence service.
- Invalid image payloads and nonexistent decision IDs are rejected.
- Presence backend is `yunet`; recognition backend is `yunet+sface`, with
  `recognition_ready: true`. Direct recognition of the blank PNG returns unknown
  with a null face ID.

Real camera images and frontend enrollment decisions remain to be tested.
Preserve recognition `data/faces.db` and the service `models/` directories.
Each Python service records installed versions in `deployment-requirements.lock`
and its source revision in `deployment-source-commit.txt` on the instance.
