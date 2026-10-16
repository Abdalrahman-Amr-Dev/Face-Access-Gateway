# Deploy to EC2 with PM2 and Nginx

This guide assumes an Ubuntu 24.04 x86_64 EC2 instance, an SSH user named
`ubuntu`, and the three repositories under `/home/ubuntu/apps`. Adjust paths
and usernames if yours differ. No AWS resources are created by these files.

Traffic flows through Nginx on port 80/443 to the gateway on localhost:3000.
The gateway calls presence on localhost:8000 and recognition on localhost:8001.
PM2 manages all three, with one process each. Keep the gateway at one instance:
its pending decisions and frontend connections are stored in memory.

## 1. EC2 and network

Use an x86_64 Ubuntu image. Size memory and CPU after measuring the three services
with real images; the model loaders and image decoding need additional memory
beyond the gateway. The Python models can run on CPU.

In the EC2 security group, allow:

- SSH (22) from your own public IP only.
- HTTP (80) and HTTPS (443) from the clients that need access.
- No inbound rules for 3000, 8000, or 8001.

The gateway currently has no client authentication, including for allow/prevent
decisions. Restrict HTTP/HTTPS to trusted client IPs for this demo, or add client
authentication before allowing unrestricted internet access. HTTPS encrypts the
connection but does not authorize who can make decisions.

Use a stable public address if devices need a fixed endpoint. If using a domain,
point its A record to the instance's public IPv4 address. Only add an AAAA record
if IPv6 is configured end to end. This Nginx template listens on IPv4.

## 2. Install prerequisites

SSH into the instance and run:

```sh
sudo apt-get update
sudo apt-get install -y git curl nginx python3-venv python3-pip libgl1 libglib2.0-0
```

Install Node.js 24 LTS using your preferred Node installation method. Confirm
`node --version` reports `v24.x` and `npm --version` works. If you use a per-user
Node installation, run all npm and PM2 commands as that same user, without sudo.

```sh
npm install -g pm2
mkdir -p /home/ubuntu/apps
cd /home/ubuntu/apps
git clone https://github.com/Abdalrahman-Amr-Dev/Face-Access-Gateway.git face-access-gateway
git clone https://github.com/HelmyIsMad/face-presence-service.git face-presence-service
git clone https://github.com/HelmyIsMad/face-recognition-service.git face-recognition-service
```

The gateway checkout must include this deployment directory. Until these changes
are pushed, transfer the updated checkout to the server instead. Do not copy
local `node_modules`, `.venv`, `.env`, or compiled output from another machine.

## 3. Install dependencies and build

```sh
cd /home/ubuntu/apps/face-presence-service
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt

cd /home/ubuntu/apps/face-recognition-service
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt

cd /home/ubuntu/apps/face-access-gateway
npm ci
npm run build
```

The PM2 file supplies the gateway's production URLs, host, and port. A `.env`
file is not required for this deployment. Each Python service uses its own virtual
environment. Keep the services' `models/` directories writable by `ubuntu`;
first startup downloads their models and requires outbound HTTPS connectivity.
Keep the recognition service's `data/` directory writable as well.

## 4. Start and verify all three services

```sh
cd /home/ubuntu/apps/face-access-gateway
pm2 start deploy/ecosystem.config.cjs
pm2 status
pm2 logs --lines 100
```

Exit the log stream with Ctrl+C; the services keep running. Wait for model downloads,
then check:

```sh
curl --fail http://127.0.0.1:8000/health
curl --fail http://127.0.0.1:8001/health
curl --fail http://127.0.0.1:3000/
curl --fail http://127.0.0.1:3000/frontend/protocol
```

Presence should report backend `yunet`; recognition should report `yunet+sface`.
A health response alone does not establish that recognition is available:
recognition can fall back to detection-only if SFace fails to load. Check logs
and fix downloads or OpenCV dependencies before relying on recognition.

After successful checks, enable restart on boot:

```sh
pm2 startup
```

Run the exact sudo command printed by PM2, then:

```sh
pm2 save
```

Run `pm2 save` again after changing the process list. Configure log rotation:

```sh
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 5. Enable Nginx

```sh
sudo cp /home/ubuntu/apps/face-access-gateway/deploy/nginx.conf /etc/nginx/sites-available/face-access-gateway
sudo nano /etc/nginx/sites-available/face-access-gateway
```

Replace `api.example.com` in `server_name` with your real domain or EC2 public IP.
Enable the site once (skip the symlink command if already enabled):

```sh
sudo ln -s /etc/nginx/sites-available/face-access-gateway /etc/nginx/sites-enabled/face-access-gateway
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx
```

Do not reload until `nginx -t` passes. Existing sites can stay enabled as long as
their `server_name` values do not conflict. Nginx forwards WebSocket upgrade headers
and permits up to one hour without upstream traffic. Clients should reconnect
when disconnected, including after a service restart.

From a permitted client, check `http://YOUR_HOST/docs`, then connect plain
WebSockets to `ws://YOUR_HOST/ws/esp32` and `ws://YOUR_HOST/ws/frontend`.
Use the message examples in the main README to test image processing and decisions.

## 6. Enable HTTPS for a domain

After DNS points to this instance, install Certbot and request a certificate:

```sh
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com
sudo certbot renew --dry-run
```

Replace the example domain. HTTP certificate validation needs public access to
port 80 for the domain; if port 80 is restricted to client IPs, use DNS validation
or deliberately allow validation traffic while obtaining and renewing certificates.
Choose HTTPS redirection when prompted. Use `https://YOUR_DOMAIN/docs` and
`wss://YOUR_DOMAIN/ws/esp32` / `wss://YOUR_DOMAIN/ws/frontend` afterward.
The ESP32 must trust the certificate authority and have its clock set correctly.
A frontend served over HTTPS should use WSS.

## 7. Updates and persistent data

For a gateway update:

```sh
cd /home/ubuntu/apps/face-access-gateway
git pull --ff-only
npm ci
npm run build
pm2 restart deploy/ecosystem.config.cjs --only face-access-gateway --update-env
```

For a Python service, enter its repository, pull with `git pull --ff-only`, install
its requirements using `.venv/bin/python -m pip install -r requirements.txt`, and
restart its PM2 name (`face-presence` or `face-recognition`). Recheck health and
backends afterward. Update one service at a time; these commands involve downtime.

The recognition repository stores enrolled faces in `data/faces.db`. Preserve
that directory and `models/` during updates. For a consistent simple backup, stop
`face-recognition`, copy its entire `data/` directory to a protected backup location,
and start it again. Protect backups because the database contains biometric
embeddings. Instance replacement needs restored data; gateway pending events are
always lost on gateway restart and require new images.

Useful diagnostics:

```sh
pm2 status
pm2 logs face-access-gateway --lines 100
pm2 logs face-recognition --lines 100
sudo nginx -t
sudo journalctl -u nginx --no-pager -n 50
ss -lntp
```

Ports 3000, 8000, and 8001 should listen only on 127.0.0.1. A 502 usually means
the gateway is not running; upstream-service failures appear in gateway responses.
PM2 showing `online` does not guarantee model loading succeeded.

References: [PM2 startup](https://pm2.keymetrics.io/docs/usage/startup/),
[Nginx WebSocket proxying](https://nginx.org/en/docs/http/websocket.html),
[AWS security group rules](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html),
[Node.js releases](https://nodejs.org/en/about/previous-releases),
[presence service](https://github.com/HelmyIsMad/face-presence-service),
[recognition service](https://github.com/HelmyIsMad/face-recognition-service).
