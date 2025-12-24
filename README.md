## First Startup

On first run, the server needs to download and load AI models (~2-3 minutes).
Wait until you see `application_started` in the server logs before using the app.

```bash
# Watch server logs
docker logs -f searchlight-server

# Or in monorepo dev
# Look for: "ml_models_loaded" and "application_started"
```