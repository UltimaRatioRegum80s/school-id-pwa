import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { X, Printer, FileDown, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  useGetStudentsForPrint,
  getGetStudentsForPrintQueryKey,
} from "@workspace/api-client-react";
import type { PrintCardStudent, PrintCardBranding } from "@workspace/api-client-react";

const PALETTE_COLORS: Record<string, string> = {
  "navy-gold": "#1e40af",
  "forest-green-white": "#166534",
  "deep-red-silver": "#991b1b",
  "deep-purple": "#6b21a8",
  "teal-white": "#0f766e",
  "slate-grey": "#374151",
};

function getCardColor(palette: string): string {
  return PALETTE_COLORS[palette] ?? PALETTE_COLORS["navy-gold"];
}

type Orientation = "portrait" | "landscape";

const CARD_DIMS: Record<Orientation, { w: number; h: number }> = {
  landscape: { w: 85, h: 54 },
  portrait: { w: 54, h: 85 },
};

const PAGE_DIMS: Record<Orientation, { w: number; h: number }> = {
  portrait: { w: 210, h: 297 },
  landscape: { w: 297, h: 210 },
};

const PAGE_PADDING_MM = 6;
const GRID_GAP_MM = 3;

type GridConfig = { cols: number; rows: number };

// Derive the grid from the actual usable A4 area so cards always render at true
// physical size and never overflow (and therefore never get clipped). Using
// floor((usable + gap) / (card + gap)) guarantees
//   cols * cardW + (cols - 1) * gap <= usableW   (same for rows/height),
// so every card on the page fits within the printable area by construction.
// With PAGE_PADDING_MM = 6 and GRID_GAP_MM = 3 this yields the standardized
// grids: landscape/portrait 2x5, landscape/landscape 3x3,
// portrait/portrait 3x3, portrait/landscape 5x2.
function getGridConfig(card: Orientation, page: Orientation): GridConfig {
  const cardDims = CARD_DIMS[card];
  const pageDims = PAGE_DIMS[page];
  const usableW = pageDims.w - PAGE_PADDING_MM * 2;
  const usableH = pageDims.h - PAGE_PADDING_MM * 2;
  const cols = Math.max(
    1,
    Math.floor((usableW + GRID_GAP_MM) / (cardDims.w + GRID_GAP_MM))
  );
  const rows = Math.max(
    1,
    Math.floor((usableH + GRID_GAP_MM) / (cardDims.h + GRID_GAP_MM))
  );
  return { cols, rows };
}

function SchoolLogoMark({ branding, size = 36 }: { branding: PrintCardBranding; size?: number }) {
  const initials = branding.schoolName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  if (branding.logoUrl) {
    return (
      <img
        src={branding.logoUrl}
        alt={branding.schoolName}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }

  const color = getCardColor(branding.colorPalette);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ color: color, fontWeight: 700, fontSize: size * 0.35 }}>
        {initials}
      </span>
    </div>
  );
}

function gradeClassLabel(student: PrintCardStudent): string {
  const grade = /^\d+$/.test(student.grade) ? `Grade ${student.grade}` : student.grade;
  return `${grade} \u2022 ${student.className}`;
}

function LandscapeCard({ student, branding, color }: { student: PrintCardStudent; branding: PrintCardBranding; color: string }) {
  return (
    <>
      <div
        style={{
          background: color,
          padding: "6px 8px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexShrink: 0,
        }}
      >
        <SchoolLogoMark branding={branding} size={22} />
        <span
          style={{
            color: "#fff",
            fontSize: "7px",
            fontWeight: 700,
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {branding.schoolName}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          gap: "8px",
          alignItems: "flex-start",
          minHeight: 0,
        }}
      >
        <div
          style={{
            width: "3px",
            alignSelf: "stretch",
            background: color,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0, padding: "6px 0 6px 0" }}>
          <p
            style={{
              margin: 0,
              fontSize: "11px",
              fontWeight: 800,
              color: "#111",
              lineHeight: 1.2,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {student.firstName} {student.lastName}
          </p>
          <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "3px" }}>
            <span
              style={{
                fontSize: "6px",
                fontWeight: 600,
                color: color,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              ID
            </span>
            <p
              style={{
                margin: 0,
                fontSize: "8px",
                color: "#444",
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            >
              {student.studentId}
            </p>
          </div>
          <div
            style={{
              marginTop: "4px",
              display: "inline-flex",
              background: color,
              color: "#fff",
              borderRadius: "3px",
              padding: "1px 5px",
              fontSize: "6.5px",
              fontWeight: 700,
            }}
          >
            {gradeClassLabel(student)}
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            background: "#fff",
            border: `1.5px solid ${color}33`,
            borderRadius: "4px",
            padding: "3px",
            alignSelf: "center",
            marginRight: "8px",
          }}
        >
          <QRCodeSVG value={student.qrCode} size={64} level="M" style={{ display: "block" }} />
        </div>
      </div>

      <div
        style={{
          background: "#f9fafb",
          borderTop: "1px solid #e5e7eb",
          padding: "2px 8px",
          flexShrink: 0,
        }}
      >
        <p style={{ margin: 0, fontSize: "7px", color: "#9ca3af", textAlign: "center" }}>
          STUDENT IDENTIFICATION CARD &bull; {branding.schoolCode}
        </p>
      </div>
    </>
  );
}

function PortraitCard({ student, branding, color }: { student: PrintCardStudent; branding: PrintCardBranding; color: string }) {
  return (
    <>
      <div
        style={{
          background: color,
          padding: "6px 8px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexShrink: 0,
        }}
      >
        <SchoolLogoMark branding={branding} size={20} />
        <span
          style={{
            color: "#fff",
            fontSize: "7px",
            fontWeight: 700,
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {branding.schoolName}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          minHeight: 0,
          padding: "6px 8px",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            background: "#fff",
            border: `1.5px solid ${color}33`,
            borderRadius: "4px",
            padding: "4px",
          }}
        >
          <QRCodeSVG value={student.qrCode} size={88} level="M" style={{ display: "block" }} />
        </div>

        <p
          style={{
            margin: 0,
            fontSize: "11px",
            fontWeight: 800,
            color: "#111",
            lineHeight: 1.2,
            textAlign: "center",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
            maxWidth: "100%",
          }}
        >
          {student.firstName} {student.lastName}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <span
            style={{
              fontSize: "6px",
              fontWeight: 600,
              color: color,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            ID
          </span>
          <p
            style={{
              margin: 0,
              fontSize: "8px",
              color: "#444",
              fontFamily: "monospace",
              fontWeight: 600,
            }}
          >
            {student.studentId}
          </p>
        </div>

        <div
          style={{
            display: "inline-flex",
            background: color,
            color: "#fff",
            borderRadius: "3px",
            padding: "1px 6px",
            fontSize: "6.5px",
            fontWeight: 700,
          }}
        >
          {gradeClassLabel(student)}
        </div>
      </div>

      <div
        style={{
          background: "#f9fafb",
          borderTop: "1px solid #e5e7eb",
          padding: "2px 8px",
          flexShrink: 0,
        }}
      >
        <p style={{ margin: 0, fontSize: "6.5px", color: "#9ca3af", textAlign: "center" }}>
          STUDENT ID &bull; {branding.schoolCode}
        </p>
      </div>
    </>
  );
}

function StudentCard({
  student,
  branding,
  orientation,
}: {
  student: PrintCardStudent;
  branding: PrintCardBranding;
  orientation: Orientation;
}) {
  const color = getCardColor(branding.colorPalette);
  const dims = CARD_DIMS[orientation];

  return (
    <div
      className="student-id-card"
      style={{
        width: `${dims.w}mm`,
        height: `${dims.h}mm`,
        border: "1px dashed #aaa",
        borderRadius: "4px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        background: "#fff",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        fontFamily: "system-ui, sans-serif",
        flexShrink: 0,
      }}
    >
      {orientation === "landscape" ? (
        <LandscapeCard student={student} branding={branding} color={color} />
      ) : (
        <PortraitCard student={student} branding={branding} color={color} />
      )}
    </div>
  );
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function A4DocumentPreview({
  students,
  branding,
  pagesRef,
  cardOrientation,
  pageOrientation,
}: {
  students: PrintCardStudent[];
  branding: PrintCardBranding;
  pagesRef: React.MutableRefObject<HTMLDivElement[]>;
  cardOrientation: Orientation;
  pageOrientation: Orientation;
}) {
  const grid = getGridConfig(cardOrientation, pageOrientation);
  const cardsPerPage = grid.cols * grid.rows;
  const pageDims = PAGE_DIMS[pageOrientation];
  const cardDims = CARD_DIMS[cardOrientation];
  const pages = chunkArray(students, cardsPerPage);

  return (
    <div
      className="a4-document-preview-inner"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "24px",
        padding: "24px 0",
      }}
      data-testid="a4-document-preview"
    >
      {pages.map((pageStudents, pageIndex) => (
        <div
          key={pageIndex}
          className="a4-page"
          ref={(el) => {
            if (el) pagesRef.current[pageIndex] = el;
          }}
          style={{
            width: `${pageDims.w}mm`,
            height: `${pageDims.h}mm`,
            background: "#fff",
            boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
            borderRadius: "2px",
            padding: `${PAGE_PADDING_MM}mm`,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
          data-testid={`a4-page-${pageIndex}`}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${grid.cols}, ${cardDims.w}mm)`,
                gridAutoRows: `${cardDims.h}mm`,
                gap: `${GRID_GAP_MM}mm`,
                justifyContent: "center",
              }}
            >
              {pageStudents.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  branding={branding}
                  orientation={cardOrientation}
                />
              ))}
            </div>
          </div>
          <div
            style={{
              marginTop: "auto",
              paddingTop: "3mm",
              borderTop: "1px solid #e5e7eb",
              fontSize: "8px",
              color: "#9ca3af",
              textAlign: "right",
            }}
          >
            Page {pageIndex + 1} of {pages.length}
          </div>
        </div>
      ))}
    </div>
  );
}

function buildFileName(grade: string | null, cls: string | null, ext: string): string {
  const gradeClass = grade ? `Grade-${grade}${cls ?? ""}` : null;
  const parts = ["ID-Cards"];
  if (gradeClass) parts.unshift(gradeClass);
  return parts.join("-") + "." + ext;
}

const SAMPLE_STUDENT: PrintCardStudent = {
  id: -1,
  studentId: "STU1001",
  firstName: "Jane",
  lastName: "Doe",
  grade: "10",
  className: "10A",
  qrCode: "SCID-STU1001",
};

export default function PrintCardsPage({ onBack }: { onBack: () => void }) {
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [cardOrientation, setCardOrientation] = useState<Orientation>("landscape");
  const [pageOrientation, setPageOrientation] = useState<Orientation>("landscape");
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const pagesRef = useRef<HTMLDivElement[]>([]);

  const grid = getGridConfig(cardOrientation, pageOrientation);
  const cardsPerPage = grid.cols * grid.rows;

  const { data, isLoading } = useGetStudentsForPrint(
    {},
    {
      query: {
        queryKey: getGetStudentsForPrintQueryKey({}),
      },
    }
  );

  const availableGrades = useMemo(() => {
    if (!data?.students) return [];
    const gradeSet = new Set(data.students.map((s) => s.grade));
    return Array.from(gradeSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10);
      const numB = parseInt(b.replace(/\D/g, ""), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [data?.students]);

  const availableClasses = useMemo(() => {
    if (!data?.students || !selectedGrade) return [];
    const classSet = new Set(
      data.students.filter((s) => s.grade === selectedGrade).map((s) => s.className)
    );
    return Array.from(classSet).sort();
  }, [data?.students, selectedGrade]);

  const displayedStudents = useMemo(() => {
    if (!data?.students || !selectedGrade) return [];
    return data.students.filter((s) => {
      if (s.grade !== selectedGrade) return false;
      if (selectedClass && s.className !== selectedClass) return false;
      return true;
    });
  }, [data?.students, selectedGrade, selectedClass]);

  useEffect(() => {
    pagesRef.current = [];
  }, [displayedStudents, cardOrientation, pageOrientation]);

  function handleGradeSelect(grade: string) {
    setSelectedGrade((prev) => (prev === grade ? null : grade));
    setSelectedClass(null);
  }

  function handleClassSelect(cls: string) {
    setSelectedClass((prev) => (prev === cls ? null : cls));
  }

  const handleDownloadPdf = useCallback(async () => {
    if (pagesRef.current.length === 0) return;
    setIsExportingPdf(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const pageDims = PAGE_DIMS[pageOrientation];

      const pdf = new jsPDF({
        orientation: pageOrientation,
        unit: "mm",
        format: "a4",
      });

      for (let i = 0; i < pagesRef.current.length; i++) {
        const pageEl = pagesRef.current[i];
        if (!pageEl) continue;

        const canvas = await html2canvas(pageEl, {
          scale: 3,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
          width: pageEl.offsetWidth,
          height: pageEl.offsetHeight,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.97);

        if (i > 0) pdf.addPage("a4", pageOrientation);
        pdf.addImage(imgData, "JPEG", 0, 0, pageDims.w, pageDims.h);
      }

      const fileName = buildFileName(selectedGrade, selectedClass, "pdf");
      pdf.save(fileName);
    } finally {
      setIsExportingPdf(false);
    }
  }, [selectedGrade, selectedClass, pageOrientation]);

  const handleDownloadWord = useCallback(async () => {
    if (displayedStudents.length === 0 || !data?.branding) return;
    setIsExportingWord(true);
    try {
      const {
        Document,
        Packer,
        Paragraph,
        Table,
        TableRow,
        TableCell,
        TextRun,
        WidthType,
        HeightRule,
        BorderStyle,
        AlignmentType,
        ShadingType,
      } = await import("docx");

      const color = getCardColor(data.branding.colorPalette).replace("#", "");

      const cols = grid.cols;
      const cellWidthPct = Math.floor(100 / cols);
      const cardDims = CARD_DIMS[cardOrientation];
      const rowHeightTwips = Math.round(cardDims.h * 56.7);

      const pages = chunkArray(displayedStudents, cardsPerPage);

      const docSections: InstanceType<typeof Paragraph | typeof Table>[] = [];

      for (let p = 0; p < pages.length; p++) {
        const pageStudents = pages[p];
        const rows = chunkArray(pageStudents, cols);

        if (p > 0) {
          docSections.push(new Paragraph({ text: "", pageBreakBefore: true }));
        }

        for (const rowStudents of rows) {
          const cells = rowStudents.map((student) =>
            new TableCell({
              width: { size: cellWidthPct, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
              },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: data.branding.schoolName,
                      bold: true,
                      size: 14,
                      color: "FFFFFF",
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  shading: { type: ShadingType.CLEAR, color: color, fill: color },
                  spacing: { before: 60, after: 60 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${student.firstName} ${student.lastName}`,
                      bold: true,
                      size: 22,
                    }),
                  ],
                  alignment: AlignmentType.LEFT,
                  spacing: { before: 80, after: 20 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `ID: ${student.studentId}`,
                      size: 14,
                      color: "666666",
                    }),
                  ],
                  alignment: AlignmentType.LEFT,
                  spacing: { before: 20, after: 20 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Grade ${student.grade} \u2022 ${student.className}`,
                      size: 14,
                      bold: true,
                      color: color,
                    }),
                  ],
                  alignment: AlignmentType.LEFT,
                  spacing: { before: 20, after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `STUDENT IDENTIFICATION CARD \u2022 ${data.branding.schoolCode}`,
                      size: 10,
                      color: "9CA3AF",
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40, after: 40 },
                }),
              ],
            })
          );

          while (cells.length < cols) {
            cells.push(
              new TableCell({
                width: { size: cellWidthPct, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                },
                children: [new Paragraph({ text: "" })],
              })
            );
          }

          docSections.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  height: { value: rowHeightTwips, rule: HeightRule.ATLEAST },
                  children: cells,
                }),
              ],
            })
          );
          docSections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        }
      }

      const pageSize =
        pageOrientation === "portrait"
          ? { width: 11906, height: 16838 }
          : { width: 16838, height: 11906 };

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                size: pageSize,
                margin: { top: 720, right: 720, bottom: 720, left: 720 },
              },
            },
            children: docSections,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildFileName(selectedGrade, selectedClass, "docx");
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingWord(false);
    }
  }, [displayedStudents, data?.branding, selectedGrade, selectedClass, cardOrientation, pageOrientation, grid.cols, cardsPerPage]);

  const previewStudent = displayedStudents[0] ?? SAMPLE_STUDENT;
  const previewCardDims = CARD_DIMS[cardOrientation];

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <style>{`
        @page { size: A4 ${pageOrientation}; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .print-container {
            padding: 0 !important;
            max-width: none !important;
          }
          .a4-preview-outer {
            overflow: visible !important;
            padding: 0 !important;
          }
          .a4-document-preview-inner {
            gap: 0 !important;
            padding: 0 !important;
          }
          .a4-page {
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .student-id-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
        .a4-preview-outer {
          overflow-x: auto;
          padding: 0 16px 24px;
        }
      `}</style>

      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-7 z-40 no-print">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            data-testid="button-print-back"
          >
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">Print ID Cards</h1>
          {displayedStudents.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadWord}
                disabled={isExportingWord}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                data-testid="button-download-word"
              >
                <FileText className="w-3.5 h-3.5" />
                {isExportingWord ? "Generating..." : "Download Word"}
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                data-testid="button-download-pdf"
              >
                <FileDown className="w-3.5 h-3.5" />
                {isExportingPdf ? "Generating..." : "Download PDF"}
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg"
                data-testid="button-trigger-print"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-4 py-4 space-y-4 print-container">
        <div className="no-print space-y-4">

          {isLoading && (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading students...</div>
          )}

          {!isLoading && availableGrades.length === 0 && (
            <div className="bg-muted/30 border border-border rounded-xl px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No students found. Import students first.</p>
            </div>
          )}

          {!isLoading && availableGrades.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Select Grade
              </p>
              <div className="flex flex-wrap gap-2" data-testid="grade-filter-chips">
                {availableGrades.map((grade) => (
                  <button
                    key={grade}
                    onClick={() => handleGradeSelect(grade)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                      selectedGrade === grade
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-foreground hover:bg-muted/50"
                    }`}
                    data-testid={`chip-grade-${grade}`}
                  >
                    {/^\d+$/.test(grade) ? `Grade ${grade}` : grade}
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableClasses.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Filter by Class (optional)
              </p>
              <div className="flex flex-wrap gap-2" data-testid="class-filter-chips">
                {availableClasses.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => handleClassSelect(cls)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                      selectedClass === cls
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-foreground hover:bg-muted/50"
                    }`}
                    data-testid={`chip-class-${cls}`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isLoading && availableGrades.length > 0 && (
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  ID Card Layout
                </p>
                <div className="inline-flex rounded-lg border border-border overflow-hidden" data-testid="card-orientation-toggle">
                  {(["landscape", "portrait"] as Orientation[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setCardOrientation(opt)}
                      className={`px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                        cardOrientation === opt
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-foreground hover:bg-muted/50"
                      }`}
                      data-testid={`button-card-${opt}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  A4 Page View
                </p>
                <div className="inline-flex rounded-lg border border-border overflow-hidden" data-testid="page-orientation-toggle">
                  {(["portrait", "landscape"] as Orientation[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setPageOrientation(opt)}
                      className={`px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                        pageOrientation === opt
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-foreground hover:bg-muted/50"
                      }`}
                      data-testid={`button-page-${opt}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {data?.branding && !isLoading && availableGrades.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setPreviewExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors"
                data-testid="button-toggle-preview"
              >
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Card Preview ({cardOrientation})
                </span>
                {previewExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {previewExpanded && (
                <div
                  className="flex items-center justify-center bg-muted/10 py-6 overflow-auto"
                  data-testid="single-card-preview"
                >
                  <div
                    style={{
                      transform: "scale(2)",
                      transformOrigin: "center",
                      margin: `${(previewCardDims.h * 3.78) / 2}px ${(previewCardDims.w * 3.78) / 2}px`,
                    }}
                  >
                    <StudentCard
                      student={previewStudent}
                      branding={data.branding}
                      orientation={cardOrientation}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {!selectedGrade && !isLoading && availableGrades.length > 0 && (
            <div className="bg-muted/30 border border-border rounded-xl px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">Select a grade to preview ID cards</p>
            </div>
          )}

          {selectedGrade && displayedStudents.length === 0 && (
            <div className="bg-muted/30 border border-border rounded-xl px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No students found for this selection</p>
            </div>
          )}

          {selectedGrade && displayedStudents.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {displayedStudents.length} card{displayedStudents.length !== 1 ? "s" : ""} &mdash;{" "}
                {Math.ceil(displayedStudents.length / cardsPerPage)} page{Math.ceil(displayedStudents.length / cardsPerPage) !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>

        {data?.branding && displayedStudents.length > 0 && (
          <div className="a4-preview-outer" data-testid="print-cards-grid">
            <A4DocumentPreview
              students={displayedStudents}
              branding={data.branding}
              pagesRef={pagesRef}
              cardOrientation={cardOrientation}
              pageOrientation={pageOrientation}
            />
          </div>
        )}
      </div>
    </div>
  );
}
