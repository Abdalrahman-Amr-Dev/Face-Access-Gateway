# Codex project memory

## Project goal

Build a small NestJS API named `face-access-gateway` for an ESP32 camera, the existing face presence and face recognition services, and a frontend. This is a college project: keep it understandable and avoid databases, queues, microservices, and unnecessary abstractions. Do not implement face detection or recognition in this repository.

The user asked to make memory and a plan first. Do not begin implementation until the user resumes that work.

## Verified external API contracts

- Face presence repository: <https://github.com/HelmyIsMad/face-presence-service>
  - `POST /detect`
  - Multipart form field: `file`
  - JSON response includes `has_face` (boolean), `face_count`, `time_ms`, and `backend`.
  - Continue to recognition only when `has_face` is `true`.
- Face recognition repository: <https://github.com/HelmyIsMad/face-recognition-service>
  - `POST /verify`
  - Multipart form field: `file`
  - Response `status` is `trusted`, `blocked`, or `unknown`.
  - Unknown responses include `face_id` (or `null` when no face); pass the returned face ID to enrollment decisions.
  - Trust an unknown face with `POST /trust` JSON `{ "face_id": "...", "name": "..." }`.
  - Block an unknown face with `POST /block` JSON `{ "face_id": "...", "name": "...", "reason": "..." }`.

## Planned implementation

1. Inspect the existing NestJS starter and dependency configuration.
2. Add the minimum NestJS modules/services and use `HttpModule` for multipart HTTP requests to the verified endpoints.
3. Receive ESP32 images over WebSocket. Keep the message format simple, validate payloads and size, and document the format. A JSON object containing a base64 image and optional MIME type is a straightforward proposal; confirm it against project needs during implementation.
4. Process each image through face presence first, then recognition only when a face is present.
5. Notify frontend WebSocket clients when recognition returns `unknown`, including an event ID, image or image reference, and the recognition service's `face_id`.
6. Accept frontend `allow`, `prevent`, `trust`, or `block` decisions tied to the pending event ID. Only trust/block call the matching enrollment endpoint; allow/prevent resolve the event once without enrollment.
7. Configure both service base URLs using environment variables, add basic error handling, and replace the starter README with setup and example WebSocket messages.

## Constraints

- Keep the implementation small and readable.
- Never create or modify `.spec.ts` files in this project unless the user explicitly requests tests.
- Every new HTTP endpoint must be documented with NestJS Swagger decorators and included in the generated Swagger document.
- For every WebSocket gateway, document the event protocol in the README and expose a small Swagger-documented HTTP protocol endpoint.
- Do not assume undocumented endpoint paths or response fields. If implementation needs a detail not verified above, inspect the linked repositories again or document the assumption.
- The ESP32 sends an image roughly every two seconds when motion is detected.
- Frontend decisions must be associated with the correct event ID.

## Current implementation conventions

- Service clients live under `src/face-services/clients/` and are registered by `FaceServicesModule`.
- Service URLs are required configuration values read through `ConfigService`: `FACE_PRESENCE_URL` and `FACE_RECOGNITION_URL`.
- The shared upload limit is `MAX_IMAGE_SIZE` in `src/face-services/consts/max-image-size.const.ts`.
- The face-presence client calls `POST /detect` and returns the service's `has_face` boolean.
- The face-recognition client calls `POST /verify` and provides `/trust` and `/block` decision methods.
- Keep shared constants centralized instead of duplicating values in individual clients.

## Completed gateway flow

- `AccessService` processes presence before recognition and stores unknown events by UUID with the recognition service's face ID.
- ESP32 replies now use `image.result`; overlapping images on one connection are rejected.
- Frontend gateway: `/ws/frontend`, receives `decision` and broadcasts `face.unknown` / `decision.applied`; pending notifications replay on connection.
- Pending events expire after five minutes, are capped at 20, and are lost on restart. Concurrent decisions for one event are rejected.
- Both gateways have Swagger-documented protocol HTTP endpoints. README documents all message formats and setup.
- Build, lint, and a temporary mock-service WebSocket smoke check passed. No `.spec.ts` files were created or modified.

- Four decision actions: allow/prevent resolve once without upstream enrollment; trust/block call /trust or /block and require a name. This one-time interpretation is a documented gateway protocol assumption. All decisions broadcast to frontends; ESP32 sockets do not receive later decisions.
