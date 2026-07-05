"""Telemetry adapters: the pluggable seam that keeps Beacon stack-agnostic.

v1 ships file-based logs, git-subprocess history, and a stub metrics source;
Loki/Prometheus adapters slot in behind the same functions later.
"""
