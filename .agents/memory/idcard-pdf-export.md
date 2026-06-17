---
name: ID card PDF export rendering
description: Why student ID-card PDF export renders natively with jsPDF instead of html2canvas.
---

# Student ID card PDF export

Render ID cards for PDF export by drawing **natively with jsPDF** vector text/shapes (one draw function per orientation), NOT by rasterizing the DOM with html2canvas.

**Why:** html2canvas clips the bottom of small-font text (descenders / lower half of each line) when rasterizing the tiny card layout. Cards looked correct in the live web preview but names, the school-name header, and the grade badge were vertically cropped in the downloaded PDF. Multiple html2canvas-era fixes (CSS line-clamp, scroll/window offsets, scale bumps) all failed — it is a fundamental rasterization failure mode for tiny fonts, not a CSS bug.

**How to apply:**
- QR codes: generate deterministically with the `qrcode` package (`QRCode.toDataURL`, level "M") inside the export handler and `addImage` them. Do NOT capture QR from off-screen DOM `<canvas>` refs — that path has ref timing/staleness risk.
- Bound every text element against the card width before drawing (`fitOrTruncate` for single-line labels like the school header and grade badge; `splitTextToSize(...).slice(0,2)` for names) so nothing overflows or overlaps the QR.
- The on-screen preview can still use SVG/DOM components; only the export path must avoid html2canvas.
