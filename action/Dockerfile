FROM python:3.11-slim

# The entrypoint uses only the standard library so the action starts fast
# and works in air-gapped runners. When the beacon agent-core package is
# published, installing it here upgrades the action from the bundled mock
# to real triage with no other changes:
#   RUN pip install --no-cache-dir beacon-agent

WORKDIR /beacon-action
COPY entrypoint.py mock_beacon.py ./

ENTRYPOINT ["python", "/beacon-action/entrypoint.py"]
