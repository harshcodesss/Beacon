# Built with the repository ROOT as context (see docker-compose.yml), so the
# real agent core (beacon/) ships inside the image and app.beacon_client
# auto-detects it — /healthz reports agent_core: "real". git is required by
# the agent adapters to read commit history.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# agent-core runtime deps (kept explicit: no dev/test extras in the image).
# langchain provides init_chat_model; google_genai + openai + anthropic shipped.
RUN pip install --no-cache-dir \
    "langgraph>=0.2" \
    "langchain>=0.3" \
    "langchain-google-genai>=2.0" \
    "langchain-openai>=0.2" \
    "langchain-anthropic>=0.2" \
    "drain3>=0.9.11" \
    "PyYAML>=6.0" \
    "python-dotenv>=1.0"

COPY backend/ .
COPY beacon/ ./beacon/
RUN chmod +x start-api.sh start-worker.sh

EXPOSE 8000

# Render's Docker Command UI field mangles quoted multi-command strings, so the
# real startup commands live here instead. API is the default; Render's worker
# service overrides via a plain "sh start-worker.sh" (no quotes/&& needed).
CMD ["sh", "start-api.sh"]
