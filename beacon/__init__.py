"""Beacon agent core.

Public entry point is the compiled graph only:

    from beacon.graph.build import app
    result = app.invoke({"incident_id": ..., "budget": {...}})

This module must stay import-side-effect free — in particular it must never
import beacon.agents, so the backend can import beacon.graph.build without
dragging in anything else.
"""
