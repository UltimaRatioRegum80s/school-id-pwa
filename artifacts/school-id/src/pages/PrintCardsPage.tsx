import { useState, useMemo } from "react";
import { X, Printer } from "lucide-react";
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
            {student.grade} &bull; {student.className}
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

export default function PrintCardsPage({ onBack }: { onBack: () => void }) {
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

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

  function handleGradeSelect(grade: string) {
    setSelectedGrade((prev) => (prev === grade ? null : grade));
    setSelectedClass(null);
  }

  function handleClassSelect(cls: string) {
    setSelectedClass((prev) => (prev === cls ? null : cls));
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <style>{`
        @page { size: A4 landscape; margin: 8mm; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 85mm) !important;
            gap: 4mm !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .student-id-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-container {
            padding: 0 !important;
            max-width: none !important;
          }
        }
      `}</style>

      <div className="bg-card border-b border-border px-4 pt-4 pb-3 sticky top-0 z-40 no-print">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            data-testid="button-print-back"
          >
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-base font-bold text-foreground flex-1">Print ID Cards</h1>
          {displayedStudents.length > 0 && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg"
              data-testid="button-trigger-print"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 py-4 space-y-4 print-container">
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
                    Grade {grade}
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
                {displayedStudents.length} card{displayedStudents.length !== 1 ? "s" : ""} ready to print
              </p>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg"
                data-testid="button-trigger-print-bottom"
              >
                <Printer className="w-4 h-4" />
                Print All
              </button>
            </div>
          )}
        </div>

        {data?.branding && displayedStudents.length > 0 && (
          <div
            className="print-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, 85mm)",
              gap: "4mm",
            }}
            data-testid="print-cards-grid"
          >
            {displayedStudents.map((student) => (
              <StudentCard key={student.id} student={student} branding={data.branding} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
