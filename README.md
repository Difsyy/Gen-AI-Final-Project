# Gemini Chat + Image (Next.js App Router)

Production-ready Next.js (App Router) demo with two free features powered by Google AI Studio (Gemini), using server-side API routes only:

- **Chat**: `/`
- **Text-to-Image**: `/image`

No database. No auth. Deployable on **Vercel free tier**.

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Google Gen AI SDK: `@google/genai`

## Get a Free Google AI Studio API Key

1. Go to **Google AI Studio**: https://aistudio.google.com/app/apikey
2. Create an API key.

Important: keep your key private. This app reads it **server-side only** via environment variables.

## Environment Variables

Create `.env.local` in the project root:

```bash
cp .env.example .env.local
```

Then set:

```bash
GEMINI_API_KEY=YOUR_KEY_HERE
```

The key is used only in server routes:

- `app/api/chat/route.ts`
- `app/api/image/route.ts`

## Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel (Free)

1. Push this repo to GitHub.
2. Import it in Vercel.
3. In **Vercel → Project → Settings → Environment Variables**, add:
	 - `GEMINI_API_KEY`
4. Deploy.

## API Routes

### `POST /api/chat`

Input JSON:

```json
{
	"messages": [
		{"role":"system","content":"..."},
		{"role":"user","content":"..."}
	],
	"temperature": 0.7,
	"model": "gemini-2.5-flash"
}
```

Success output:

```json
{ "text": "..." }
```

### `POST /api/image`

Input JSON:

```json
{
	"prompt": "a detailed prompt...",
	"model": "gemini-2.5-flash-image"
}
```

Success output:

```json
{
	"images": [
		{ "mimeType": "image/png", "dataUrl": "data:image/png;base64,..." }
	]
}
```

By default this returns **1 image** per request (free-friendly).

## Rate Limiting / Quota

To help avoid burning free quota, both routes include a lightweight in-memory rate limiter:

- **Max 10 requests per minute per IP per route**

When hit, the server responds with HTTP **429** and the UI shows a **Quota reached** state.

Note: This is intentionally simple and resets when serverless instances recycle.

## Project Structure

- `app/page.tsx`
- `app/image/page.tsx`
- `app/api/chat/route.ts`
- `app/api/image/route.ts`
- `components/Chat.tsx`
- `components/MessageBubble.tsx`
- `components/ImageGenerator.tsx`
- `components/ImageCard.tsx`
- `lib/genai.ts`
- `lib/rateLimit.ts`
- `types/chat.ts`
- `types/image.ts`
