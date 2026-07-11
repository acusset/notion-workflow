# Recipe Crawler → Notion

A Cloudflare Workflow that turns a link into a saved recipe. Point it at a web page or a video (YouTube, Instagram, TikTok, etc.), and it crawls the content, extracts the recipe, and writes it into a Notion database.

## How it works

1. **Crawl** — fetch the source content from the given URL. For web pages this means the page content; for video platforms this means metadata, captions/transcript, and/or description text.
2. **Extract** — use an LLM to parse the crawled content into a structured recipe: title, ingredients, steps, servings, timing, source URL, etc.
3. **Save** — upsert the recipe into a Notion database, so it can be found and cooked from later.

Each stage runs as a durable step in a Cloudflare Workflow, so the pipeline can retry failed steps (e.g. a flaky crawl or a rate-limited API call) without re-running the whole thing.

## Stack

- **Cloudflare Workflows** — durable, multi-step execution
- **Vercel AI SDK** (`ai`) — LLM-based recipe extraction
- **Notion API** — recipe storage

## Development

```sh
pnpm install
pnpm start    # wrangler dev — run the workflow locally
pnpm deploy   # wrangler deploy
```

Workflow bindings live in `wrangler.jsonc`; run `npx wrangler types` after changing them.

## CI/CD deployment

This Worker is connected to Cloudflare Workers Builds, which deploys automatically on pushes to the main branch. No GitHub Actions or API token secret required.

## License

Copyright 2024, Cloudflare. Apache 2.0 licensed. See the LICENSE file for details.
