# MinCoach Beta Deploy

## What This Version Needs

- A Vercel project connected to this repo.
- `OPENAI_API_KEY` added as a Vercel environment variable.
- Optional: `OPENAI_MODEL`, default is `gpt-5-mini`.

## Vercel Setup

1. Push this project to GitHub.
2. Open Vercel and create a new project from the GitHub repo.
3. Use the default Next.js settings.
4. Add environment variables:

```txt
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-5-mini
```

5. Deploy.
6. Send the Vercel URL to beta testers.

## Important

- Never commit `.env.local`.
- Never send the OpenAI key to testers.
- The current beta stores each tester's data in their own browser with `localStorage`.
- If a tester clears browser data, their MinCoach data disappears.
- For early beta this is fine. For a larger beta, add login and a database.

## Quick Reset

During testing, open:

```txt
https://your-beta-url.vercel.app/?reset=1
```

That clears the app data in that browser and starts from setup again.
