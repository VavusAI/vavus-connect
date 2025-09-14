## Development

```bash
npm install
npm run dev
```

## Streaming vs. Non‑Streaming API

- `/api/ai-stream` streams tokens using Server Sent Events (SSE). The React UI reads this stream to render tokens as they arrive.
- `/api/ai` is a traditional JSON endpoint. The UI calls it for non‑streaming tasks such as the internal reasoning step in **thinking** mode and to persist messages.

## Chat UI

![Chat interface screenshot](public/images/chat-interface.png)

A GIF preview is also available:

![Chat interface animation](public/images/chat-interface.gif)

## Troubleshooting

- **CORS errors** – Ensure your deployment domain is allowed by the Runpod endpoint and Supabase project.
- **Missing environment variables** – Check that all variables listed in the prerequisites are defined in your deployment environment. Missing values will result in runtime 500 errors.

## Streaming API

The `/api/ai-stream` endpoint returns a Server-Sent Events (SSE) stream and accepts both `GET` and `POST` requests. Send prompt data in the request body for `POST`, or as URL query parameters for `GET` (for example, `/api/ai-stream?model=...&messages=[...]`).
Clients should register handlers for the following events:

- `onmessage` receives incremental data frames from the model.
- `onerror` fires when the server emits an `event: error` payload or the
  connection drops. Reconnect or surface the error to users as needed.
- Listen for the custom `end` event to know when the stream has finished:

```ts
const es = new EventSource('/api/ai-stream');
es.onmessage = (ev) => {
  // handle model tokens here
};
es.onerror = (ev) => {
  // handle errors or reconnect
};
es.addEventListener('end', () => {
  es.close();
});
```