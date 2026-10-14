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
  - Allow an unknown face with `POST /trust` JSON `{ "face_id": "...", "name": "..." }`.
  - Prevent an unknown face with `POST /block` JSON `{ "face_id": "...", "name": "...", "reason": "..." }`.

## Planned implementation

1. Inspect the existing NestJS starter and dependency configuration.
2. Add the minimum NestJS modules/services and use `HttpModule` for multipart HTTP requests to the verified endpoints.
3. Receive ESP32 images over WebSocket. Keep the message format simple, validate payloads and size, and document the format. A JSON object containing a base64 image and optional MIME type is a straightforward proposal; confirm it against project needs during implementation.
4. Process each image through face presence first, then recognition only when a face is present.
5. Notify frontend WebSocket clients when recognition returns `unknown`, including an event ID, image or image reference, and the recognition service's `face_id`.
6. Accept frontend `allow` or `prevent` decisions tied to the pending event ID, and call `/trust` or `/block` with its associated face ID.
7. Configure both service base URLs using environment variables, add basic error handling, and replace the starter README with setup and example WebSocket messages.

## Constraints

- Keep the implementation small and readable.
- Never create or modify `.spec.ts` files in this project unless the user explicitly requests tests.
- Every new HTTP endpoint must be documented with NestJS Swagger decorators and included in the generated Swagger document.
- Do not assume undocumented endpoint paths or response fields. If implementation needs a detail not verified above, inspect the linked repositories again or document the assumption.
- The ESP32 sends an image roughly every two seconds when motion is detected.
- Frontend decisions must be associated with the correct event ID.
