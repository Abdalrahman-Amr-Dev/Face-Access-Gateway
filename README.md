# Face Access Gateway

Small API connecting an ESP32 camera, face presence and recognition
services, and a frontend. No database is required; pending decisions live in memory.

## Setup

```sh
npm install
cp .env.example .env
npm run start:dev
```

Set `FACE_PRESENCE_URL` and `FACE_RECOGNITION_URL` to the running services' base
URLs. Both are required. `PORT` defaults to 3000. For production, run
`npm run build` followed by `npm run start:prod`.

Swagger: `http://localhost:3000/docs` (JSON: `/docs-json`). Protocol endpoints:
`GET /esp32/protocol` and `GET /frontend/protocol`. Replace localhost with the
API host when connecting from another device. Use this demo on a trusted local
network; WebSocket connections do not currently require authentication.

## ESP32 protocol

Connect a plain WebSocket (not Socket.IO) to `ws://localhost:3000/ws/esp32`.
Send a padded base64 JPEG or PNG without a data-URL prefix:

```json
{"event":"image","data":{"imageBase64":"<base64 image>","mimeType":"image/jpeg"}}
```

`mimeType` defaults to `image/jpeg`. Images must be nonempty and at most 5 MiB.
Send roughly every two seconds while motion is detected; wait for the previous
response before sending another image. Overlapping images on the same connection
are rejected. Frames exceeding the transport limit close the connection.

The API uploads multipart field `file` to presence `POST /detect`, then to
recognition `POST /verify` only when `has_face` is true. Each HTTP request has a
10-second timeout. The response is one of:

```json
{"event":"image.result","data":{"status":"no_face"}}
{"event":"image.result","data":{"status":"trusted"}}
{"event":"image.result","data":{"status":"blocked"}}
{"event":"image.result","data":{"status":"unknown","eventId":"<uuid>","decisionAvailable":true}}
{"event":"image.result","data":{"status":"unknown","decisionAvailable":false}}
{"event":"image.rejected","data":{"reason":"Face presence service unavailable"}}
```

An unknown result without a usable `face_id` cannot be enrolled. The API reports
recognition status; physical lock control remains the ESP32's responsibility.
Malformed JSON and unrecognized event names are ignored by the WebSocket adapter.

## Frontend protocol

Connect to `ws://localhost:3000/ws/frontend`. Unknown faces are broadcast as:

```json
{"event":"face.unknown","data":{"eventId":"<uuid>","face_id":"<service face id>","imageBase64":"<base64 image>","mimeType":"image/jpeg","expiresAt":1800000000000}}
```

`expiresAt` is a Unix timestamp in milliseconds. Pending events are replayed to
new frontend connections. They expire after five minutes, are limited to 20,
and disappear when the API restarts. At capacity, new unknown images are rejected;
resolve pending decisions or wait for expiration. Each image is a separate event.

Reply using the notification's `eventId`:

```json
{"event":"decision","data":{"eventId":"<uuid>","action":"allow","name":"Alice"}}
{"event":"decision","data":{"eventId":"<uuid>","action":"prevent","name":"Visitor","reason":"Access denied"}}
```

`name` is required (1–100 characters, whitespace-only rejected). `reason` is
optional and at most 500 characters; prevent defaults to `Prevented by operator`.
The server looks up the event's stored face ID, then sends JSON to recognition
`POST /trust` or `POST /block`. Client-supplied face IDs are not used.

Successful decisions broadcast `decision.applied` to all frontends and return
`decision.accepted` to the sender, both with `data: {eventId, action}`.
Failures return `decision.rejected` with `data: {eventId, reason}`. Expired,
completed, unknown, and concurrently processing IDs are rejected. Upstream
failures leave the decision available for retry until expiration. A timeout can
leave the upstream outcome uncertain; verify that service before retrying.

## Checks

```sh
npm run build
npm run lint
```
