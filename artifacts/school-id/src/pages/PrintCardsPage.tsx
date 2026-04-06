import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { X, Printer, FileDown, FileText } from "lucide-react";
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

function StudentCard({ student, branding }: { student: PrintCardStudent; branding: PrintCardBranding }) {
  const color = getCardColor(branding.colorPalette);

  return (
    <div
      className="student-id-card"
      style={{
        width: "85mm",
        height: "54mm",
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
              lineHeight: 1.15,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
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
            {/^\d+$/.test(student.grade) ? `Grade ${student.grade}` : student.grade} &bull; {student.className}
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
          <QRCodeSVG
            value={student.qrCode}
            size={64}
            level="M"
            style={{ display: "block" }}
          />
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
    </div>
  );
}

const CARDS_PER_ROW = 3;
const ROWS_PER_PAGE = 5;
const CARDS_PER_PAGE = CARDS_PER_ROW * ROWS_PER_PAGE;

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
}: {
  students: PrintCardStudent[];
  branding: PrintCardBranding;
  pagesRef: React.MutableRefObject<HTMLDivElement[]>;
}) {
  const pages = chunkArray(students, CARDS_PER_PAGE);

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
            width: "297mm",
            height: "210mm",
            background: "#fff",
            boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
            borderRadius: "2px",
            padding: "10mm",
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
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${CARDS_PER_ROW}, 85mm)`,
                gap: "4mm",
                transformOrigin: "top left",
                transform: "scale(0.635)",
              }}
            >
              {pageStudents.map((student) => (
                <StudentCard key={student.id} student={student} branding={branding} />
              ))}
            </div>
          </div>
          <div
            style={{
              marginTop: "auto",
              paddingTop: "4mm",
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

export default function PrintCardsPage({ onBack }: { onBack: () => void }) {
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const pagesRef = useRef<HTMLDivElement[]>([]);

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
  }, [displayedStudents]);

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

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      for (let i = 0; i < pagesRef.current.length; i++) {
        const pageEl = pagesRef.current[i];
        if (!pageEl) continue;

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        if (i > 0) pdf.addPage("a4", "landscape");
        pdf.addImage(imgData, "JPEG", 0, 0, 297, 210);
      }

      const fileName = buildFileName(selectedGrade, selectedClass, "pdf");
      pdf.save(fileName);
    } finally {
      setIsExportingPdf(false);
    }
  }, [selectedGrade, selectedClass]);

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

      const pages = chunkArray(displayedStudents, CARDS_PER_PAGE);

      const docSections: InstanceType<typeof Paragraph | typeof Table>[] = [];

      for (let p = 0; p < pages.length; p++) {
        const pageStudents = pages[p];
        const rows = chunkArray(pageStudents, CARDS_PER_ROW);

        if (p > 0) {
          docSections.push(new Paragraph({ text: "", pageBreakBefore: true }));
        }

        for (const rowStudents of rows) {
          const cells = rowStudents.map((student) =>
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
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
                      text: `Grade ${student.grade} • ${student.className}`,
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
                      text: `STUDENT IDENTIFICATION CARD • ${data.branding.schoolCode}`,
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

          while (cells.length < CARDS_PER_ROW) {
            cells.push(
              new TableCell({
                width: { size: 33, type: WidthType.PERCENTAGE },
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
                  height: { value: 1400, rule: HeightRule.EXACT },
                  children: cells,
                }),
              ],
            })
          );
          docSections.push(new Paragraph({ text: "", spacing: { after: 120 } }));
        }
      }

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                size: { width: 16838, height: 11906 },
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
  }, [displayedStudents, data?.branding, selectedGrade, selectedClass]);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <style>{`
        @page { size: A4 landscape; margin: 8mm; }
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

      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40 no-print">
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
                {Math.ceil(displayedStudents.length / CARDS_PER_PAGE)} page{Math.ceil(displayedStudents.length / CARDS_PER_PAGE) !== 1 ? "s" : ""}
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
            />
          </div>
        )}
      </div>
    </div>
  );
}
