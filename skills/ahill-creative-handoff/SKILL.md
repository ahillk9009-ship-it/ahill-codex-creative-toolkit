---
name: ahill-creative-handoff
description: Plan and verify editable design, motion and audio handoffs across Adobe applications. Use for multi-app creative deliverables, not simple text or code-only tasks.
---

# Creative handoffs

Create a clean folder scaffold when needed:

    python "{{TOOLKIT_ROOT}}/toolkit.py" new-project "<output-directory>"

Use the existing project structure if one already exists. Read its brief and
confirm the required aspect ratio, frame rate, duration and output formats from
available source information. Fill handoff.json with measured values; unresolved
values stay null and must not be presented as verified.

Use Bridge for source organization, Lightroom for photo adjustments, Photoshop
for raster/layered artwork, Illustrator for vectors, After Effects for motion,
Premiere for final assembly, Audition for audio and Media Encoder for exports
when those apps and routes are available. App presence does not establish MCP
support; use a supported tool or disclose a manual step.

Separate independently animated elements into layers. Use alpha-capable formats
for transparent graphics. Preserve a layered/editable master and a review copy.
Compare reference and output by reading actual rendered images and frames.
Check text legibility, audio timing and export metadata. Listen to audio when
available; numeric loudness measurements are not a listening review.

Apply design/typography/motion skills only when their scope fits the deliverable.
Record source attribution and asset licensing in the project brief.
