import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/api";
import { PALETTES, applyPalette } from "@/lib/palettes";
import { School, ChevronLeft, ChevronRight, Check } from "lucide-react";

type Step = "school-info" | "admin-info" | "branding";

export default function RegisterSchoolPage() {
  const { login, refreshBranding } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("school-info");

  const [schoolName, setSchoolName] = useState("");
  const [schoolSlug, setSchoolSlug] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedPalette, setSelectedPalette] = useState("navy-gold");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleSchoolNameChange(name: string) {
    setSchoolName(name);
    setSchoolSlug(slugify(name));
    setSchoolCode(
      name
        .split(/\s+/)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 6)
    );
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  }

  function handlePaletteSelect(paletteName: string) {
    setSelectedPalette(paletteName);
    applyPalette(paletteName);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${getApiUrl()}/auth/register-school`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName,
          schoolSlug,
          schoolCode: schoolCode.toUpperCase(),
          adminUsername,
          adminPassword,
          adminFirstName,
          adminLastName,
          contactEmail: contactEmail || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Registration failed");
      }

      const data = await res.json();
      login(data.token, data.user);

      if (logoFile || selectedPalette !== "navy-gold") {
        const brandingUpdate: { colorPalette?: string; logoObjectPath?: string } = {};

        if (selectedPalette !== "navy-gold") {
          brandingUpdate.colorPalette = selectedPalette;
        }

        if (logoFile) {
          const urlRes = await fetch(`${getApiUrl()}/school/branding/logo`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.token}`,
            },
            body: JSON.stringify({ name: logoFile.name, size: logoFile.size, contentType: logoFile.type }),
          });

          if (urlRes.ok) {
            const { uploadURL, objectPath } = await urlRes.json();
            await fetch(uploadURL, {
              method: "PUT",
              headers: { "Content-Type": logoFile.type },
              body: logoFile,
            });
            brandingUpdate.logoObjectPath = objectPath;
          }
        }

        if (Object.keys(brandingUpdate).length > 0) {
          await fetch(`${getApiUrl()}/school/branding`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.token}`,
            },
            body: JSON.stringify(brandingUpdate),
          });
        }

        await refreshBranding();
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setSubmitting(false);
    }
  }

  const schoolInitials = schoolName
    ? schoolName.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
    : "SC";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-3 shadow-md">
            <School className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Register Your School</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Set up your school on School ID
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {(["school-info", "admin-info", "branding"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : ["school-info", "admin-info", "branding"].indexOf(step) > i
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {["school-info", "admin-info", "branding"].indexOf(step) > i ? (
                  <Check className="w-3 h-3" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && <div className="w-8 h-0.5 bg-border" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg" data-testid="text-register-error">
            {error}
          </div>
        )}

        {step === "school-info" && (
          <div className="space-y-4" data-testid="form-register-school-info">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">School Name</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => handleSchoolNameChange(e.target.value)}
                placeholder="e.g. Westbrook Academy"
                required
                className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                data-testid="input-school-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">School Slug</label>
              <input
                type="text"
                value={schoolSlug}
                onChange={(e) => setSchoolSlug(e.target.value)}
                placeholder="westbrook-academy"
                required
                className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                data-testid="input-school-slug"
              />
              <p className="text-xs text-muted-foreground mt-1">URL-friendly identifier, lowercase with hyphens</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">School Code</label>
              <input
                type="text"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                placeholder="WBA"
                maxLength={8}
                required
                className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm font-mono"
                data-testid="input-school-code"
              />
              <p className="text-xs text-muted-foreground mt-1">Short unique code students use to join</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Contact Email (optional)</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="admin@school.edu"
                className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                data-testid="input-contact-email"
              />
            </div>
            <button
              onClick={() => setStep("admin-info")}
              disabled={!schoolName || !schoolSlug || !schoolCode}
              className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="button-next-admin-info"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full text-muted-foreground text-sm py-2"
              data-testid="button-back-to-login"
            >
              Back to Login
            </button>
          </div>
        )}

        {step === "admin-info" && (
          <div className="space-y-4" data-testid="form-register-admin-info">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">First Name</label>
                <input
                  type="text"
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  placeholder="Jane"
                  required
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  data-testid="input-admin-firstname"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  placeholder="Smith"
                  required
                  className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  data-testid="input-admin-lastname"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Username</label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="jsmith"
                required
                className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                data-testid="input-admin-username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                minLength={6}
                required
                className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                data-testid="input-admin-password"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep("school-info")}
                className="flex items-center gap-1 px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
                data-testid="button-back-school-info"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep("branding")}
                disabled={!adminFirstName || !adminLastName || !adminUsername || adminPassword.length < 6}
                className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-next-branding"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === "branding" && (
          <div className="space-y-5" data-testid="form-register-branding">
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-xs text-primary font-medium">
              Optional — you can change these any time in your Admin settings
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">School Logo (optional)</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-sm font-bold text-primary-foreground">{schoolInitials}</span>
                  )}
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                    data-testid="input-logo-file"
                  />
                  <span className="inline-flex items-center gap-1.5 bg-muted border border-border text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-muted/70 transition-colors text-foreground">
                    {logoPreview ? "Change Logo" : "Upload Logo"}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Colour Palette (optional)</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(PALETTES).map((palette) => {
                  const isSelected = selectedPalette === palette.name;
                  return (
                    <button
                      key={palette.name}
                      onClick={() => handlePaletteSelect(palette.name)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-muted/20 hover:border-primary/30"
                      }`}
                      data-testid={`palette-${palette.name}`}
                    >
                      <div className="flex gap-1 flex-shrink-0">
                        <div className="w-4 h-4 rounded" style={{ background: `hsl(${palette.primary})` }} />
                        <div className="w-4 h-4 rounded" style={{ background: `hsl(${palette.accent})` }} />
                      </div>
                      <span className="text-xs font-medium text-foreground truncate">{palette.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-primary ml-auto flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep("admin-info")}
                className="flex items-center gap-1 px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
                data-testid="button-back-admin-info"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg disabled:opacity-60"
                data-testid="button-submit-register"
              >
                {submitting ? "Creating your school..." : "Create School"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
