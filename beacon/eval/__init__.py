"""Agent 5 — the Judge and the fault-injection harness.

Eval only. Nothing here is imported by the runtime graph or the product — it
exists to answer the one question an interviewer asks: does it work? Each fault
breaks the demo target in a known way; the Judge scores whether Beacon's
accepted hypothesis matches the known ground truth (top-1 / top-3 accuracy).
"""
