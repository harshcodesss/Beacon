# Built with the repository root as context (action.yml lives at the repo
# root), so the real agent core ships inside the image. git is required by
# the collector/investigator to read the triaged repo's recent commits.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/beacon-action

RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# agent-core runtime deps only (no dev/test extras)
RUN pip install --no-cache-dir \
    "langgraph>=0.2" \
    "langchain-google-genai>=2.0" \
    "drain3>=0.9.11" \
    "PyYAML>=6.0" \
    "python-dotenv>=1.0"

WORKDIR /beacon-action
COPY beacon/ ./beacon/
COPY action/entrypoint.py action/mock_beacon.py ./

ENTRYPOINT ["python", "/beacon-action/entrypoint.py"]
