# Lives at the repo root on purpose: a container action builds with the
# Dockerfile's own directory as the build context, so this must sit beside
# beacon/ and action/ for the COPY lines below to resolve. (When it lived in
# action/, the runner's context was action/ and `COPY beacon/` 404'd, even
# though a root-context build passed locally and in CI.) The agent core ships
# in the image; git is required by the collector/investigator to read the
# triaged repo's recent commits.
#
# Base image comes from AWS's ECR public mirror, not Docker Hub: GitHub-hosted
# runners share IP pools that Docker Hub anonymously rate-limits. The mirror
# serves the identical image with no such limit and no auth.
FROM public.ecr.aws/docker/library/python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/beacon-action

RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# agent-core runtime deps only (no dev/test extras). langchain provides
# init_chat_model; the provider integrations shipped here cover google_genai,
# openai and anthropic out of the box (add more packages for others).
RUN pip install --no-cache-dir \
    "langgraph>=0.2" \
    "langchain>=0.3" \
    "langchain-google-genai>=2.0" \
    "langchain-openai>=0.2" \
    "langchain-anthropic>=0.2" \
    "drain3>=0.9.11" \
    "PyYAML>=6.0" \
    "python-dotenv>=1.0"

WORKDIR /beacon-action
COPY beacon/ ./beacon/
COPY action/entrypoint.py action/mock_beacon.py ./

ENTRYPOINT ["python", "/beacon-action/entrypoint.py"]
