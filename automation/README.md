# Daily article automation

This pipeline generates a Bulgarian daily fuel-market article from recent `public.fuel_prices` data in Supabase, adds current international market context with OpenAI web search, renders the article in the site's newsroom layout, updates `pages/news.html`, `data/generated-news.json`, and `sitemap.xml`, then commits the result through GitHub Actions.

## Required GitHub Actions secrets

- `OPENAI_API_KEY` — OpenAI project API key.
- `SUPABASE_SERVICE_ROLE_KEY` — service-role key for the Supabase project that contains `public.fuel_prices`.
- `SUPABASE_URL` — optional. If omitted, the generator uses `https://eaqvhxfvozhatrnbkvx.supabase.co`.

Do not commit any secret key to the repository.

## First run

Open **Actions → Generate daily fuel article → Run workflow**. Leave `article_date` empty to use the latest day with enough observations, or enter a date in `YYYY-MM-DD` format.

The workflow is intentionally manual during the validation phase. After the generated articles are reviewed, a daily cron schedule can be enabled.

## Cost control

The default model is `gpt-5.6-luna` with low reasoning effort. Local fuel statistics are calculated in Python; the model is used for Bulgarian editorial text and current external market context.
