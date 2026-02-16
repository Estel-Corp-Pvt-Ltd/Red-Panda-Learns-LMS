import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { USER_ROLE, USER_STATUS } from "@/constants";
import { toast } from "@/hooks/use-toast";
import { firebaseConfig } from "@/firebaseConfig";
import { userService } from "@/services/userService";
import { organizationService } from "@/services/organizationService";
import { Organization } from "@/types/organization";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  UserPlus,
  Upload,
  Download,
  FileSpreadsheet,
  Loader2,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx/xlsx.mjs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedTeacher {
  rowNumber: number;
  fullName: string;
  email: string;
  password: string;
  organizationId: string;
  errors: string[];
}

interface UploadResult {
  rowNumber: number;
  fullName: string;
  email: string;
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AdminBulkTeacherAdd = () => {
  // Organizations
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);

  // File & parsing
  const [file, setFile] = useState<File | null>(null);
  const [parsedTeachers, setParsedTeachers] = useState<ParsedTeacher[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search in preview table
  const [searchQuery, setSearchQuery] = useState("");

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);

  // ---------- Fetch all organizations on mount ----------
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const orgs = await organizationService.getAllOrganizations();
        setOrganizations(orgs);
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
        toast({
          title: "Error",
          description: "Failed to fetch organizations. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setOrgsLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  // ---------- Helper: resolve org name from ID ----------
  const getOrgName = useCallback(
    (orgId: string): string => {
      const org = organizations.find((o) => o.id === orgId);
      return org ? org.name : "Unknown Org";
    },
    [organizations]
  );

  // ---------- Helper: check if org ID is valid ----------
  const isValidOrgId = useCallback(
    (orgId: string): boolean => {
      return organizations.some((o) => o.id === orgId);
    },
    [organizations]
  );

  // ---------- Parse file ----------
  const parseFile = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile);
      setParsedTeachers([]);
      setParseErrors([]);
      setUploadResults([]);

      try {
        const data = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          setParseErrors(["The file is empty or has no data rows."]);
          return;
        }

        const teachers: ParsedTeacher[] = [];
        const errors: string[] = [];

        rows.forEach((row, index) => {
          const rowNumber = index + 2; // header is row 1
          const fullName = String(row["Full Name"] ?? "").trim();
          const email = String(row["Email"] ?? "").trim();
          const password = String(row["Password"] ?? "").trim();
          const organizationId = String(row["Organization ID"] ?? "").trim();

          // Skip entirely empty rows
          if (!fullName && !email && !password && !organizationId) {
            return;
          }

          const rowErrors: string[] = [];

          if (!fullName) {
            rowErrors.push("Full Name is required");
          }
          if (!email) {
            rowErrors.push("Email is required");
          } else if (!EMAIL_REGEX.test(email)) {
            rowErrors.push("Invalid email format");
          }
          if (!password) {
            rowErrors.push("Password is required");
          } else if (password.length < 6) {
            rowErrors.push("Password must be at least 6 characters");
          }
          if (!organizationId) {
            rowErrors.push("Organization ID is required");
          } else if (!isValidOrgId(organizationId)) {
            rowErrors.push(`Invalid Organization ID: ${organizationId}`);
          }

          if (rowErrors.length > 0) {
            errors.push(`Row ${rowNumber}: ${rowErrors.join(", ")}`);
          }

          teachers.push({
            rowNumber,
            fullName,
            email,
            password,
            organizationId,
            errors: rowErrors,
          });
        });

        setParsedTeachers(teachers);
        setParseErrors(errors);
      } catch (err: any) {
        console.error("File parsing error:", err);
        setParseErrors([`Failed to parse file: ${err.message || "Unknown error"}`]);
      }
    },
    [isValidOrgId]
  );

  // ---------- File input change ----------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    parseFile(e.target.files[0]);
  };

  // ---------- Drag & drop handlers ----------
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.split(".").pop()?.toLowerCase();
      if (ext === "csv" || ext === "xlsx" || ext === "xls") {
        parseFile(droppedFile);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a .csv, .xlsx, or .xls file.",
          variant: "destructive",
        });
      }
    }
  };

  // ---------- Download sample CSV ----------
  const handleDownloadSample = () => {
    const sampleData = [
      ["Full Name", "Email", "Password", "Organization ID"],
      ["John Doe", "john.doe@example.com", "pass123", "org_10000005"],
      ["Jane Smith", "jane.smith@example.com", "pass456", "org_10000010"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teachers");
    XLSX.writeFile(wb, "teacher_upload_template.csv");
  };

  // ---------- Upload / Create teachers ----------
  const handleUpload = async () => {
    const validTeachers = parsedTeachers.filter((t) => t.errors.length === 0);

    if (validTeachers.length === 0) {
      toast({
        title: "No valid teachers",
        description:
          "All rows have validation errors. Please fix the file and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadTotal(validTeachers.length);
    setUploadResults([]);

    const results: UploadResult[] = [];

    // Create a secondary Firebase app so we don't sign out the current admin
    const secondaryApp = initializeApp(
      firebaseConfig,
      `BulkUpload_${Date.now()}`
    );
    const secondaryAuth = getAuth(secondaryApp);

    try {
      for (let i = 0; i < validTeachers.length; i++) {
        const teacher = validTeachers[i];
        const { firstName, lastName } = splitFullName(teacher.fullName);

        try {
          // 1. Create Firebase Auth user on secondary app
          const cred = await createUserWithEmailAndPassword(
            secondaryAuth,
            teacher.email,
            teacher.password
          );

          // Sign out from secondary auth after each creation
          await signOut(secondaryAuth);

          // 2. Create Firestore user document
          const createResult = await userService.createUser(cred.user.uid, {
            id: cred.user.uid,
            firstName,
            lastName,
            email: teacher.email,
            role: USER_ROLE.TEACHER,
            status: USER_STATUS.ACTIVE,
            organizationId: teacher.organizationId,
          });

          if (createResult.success) {
            results.push({
              rowNumber: teacher.rowNumber,
              fullName: teacher.fullName,
              email: teacher.email,
              success: true,
            });
          } else {
            results.push({
              rowNumber: teacher.rowNumber,
              fullName: teacher.fullName,
              email: teacher.email,
              success: false,
              error: createResult.error?.message || "Failed to create user document",
            });
          }
        } catch (err: any) {
          // Sign out secondary auth in case of partial failure
          try {
            await signOut(secondaryAuth);
          } catch {
            // ignore
          }

          let errorMsg = err.message || "Unknown error";
          if (err.code === "auth/email-already-in-use") {
            errorMsg = "Email already in use";
          } else if (err.code === "auth/invalid-email") {
            errorMsg = "Invalid email address";
          } else if (err.code === "auth/weak-password") {
            errorMsg = "Password is too weak";
          }

          results.push({
            rowNumber: teacher.rowNumber,
            fullName: teacher.fullName,
            email: teacher.email,
            success: false,
            error: errorMsg,
          });
        }

        setUploadProgress(i + 1);
        setUploadResults([...results]);
      }
    } finally {
      // Clean up secondary app
      try {
        await signOut(secondaryAuth);
      } catch {
        // ignore
      }
      try {
        await deleteApp(secondaryApp);
      } catch {
        // ignore
      }
      setIsUploading(false);
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (failCount === 0) {
      toast({
        title: "All teachers created successfully",
        description: `${successCount} teacher account${successCount !== 1 ? "s" : ""} created and assigned to their organizations.`,
      });
    } else if (successCount === 0) {
      toast({
        title: "Upload failed",
        description: `All ${failCount} teacher account${failCount !== 1 ? "s" : ""} failed to create. Check the results below.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Upload partially completed",
        description: `${successCount} succeeded, ${failCount} failed. Check the results below.`,
        variant: "destructive",
      });
    }

    setUploadResults(results);
  };

  // ---------- Reset ----------
  const handleReset = () => {
    setFile(null);
    setParsedTeachers([]);
    setParseErrors([]);
    setUploadResults([]);
    setUploadProgress(0);
    setUploadTotal(0);
    setSearchQuery("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ---------- Filtered preview ----------
  const filteredTeachers = parsedTeachers.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.fullName.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.organizationId.toLowerCase().includes(q)
    );
  });

  const validCount = parsedTeachers.filter((t) => t.errors.length === 0).length;
  const invalidCount = parsedTeachers.filter(
    (t) => t.errors.length > 0
  ).length;

  const successCount = uploadResults.filter((r) => r.success).length;
  const failCount = uploadResults.filter((r) => !r.success).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Bulk Add Teachers</h1>
              <p className="text-muted-foreground">
                Create teacher accounts and assign them to organizations
              </p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p>
                Upload a CSV file to create teacher accounts and assign them to
                organizations
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Loading orgs indicator */}
        {orgsLoading && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Loading Organizations</AlertTitle>
            <AlertDescription>
              Fetching organization data for validation...
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Upload Teacher File
            </CardTitle>
            <CardDescription>
              Upload a CSV or Excel file with the following columns:{" "}
              <strong>Full Name</strong>, <strong>Email</strong>,{" "}
              <strong>Password</strong>, <strong>Organization ID</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drag & Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drag and drop your file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports .csv, .xlsx, .xls files
              </p>
            </div>

            {file && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {parsedTeachers.length} row{parsedTeachers.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Clear
                </Button>
              </div>
            )}

            {/* Download Template */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSample}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Sample Template
            </Button>
          </CardContent>
        </Card>

        {/* Parse Errors Summary */}
        {parseErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Validation Errors Found</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                {parseErrors.slice(0, 10).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {parseErrors.length > 10 && (
                  <li className="text-muted-foreground">
                    ...and {parseErrors.length - 10} more error
                    {parseErrors.length - 10 !== 1 ? "s" : ""}
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview Table */}
        {parsedTeachers.length > 0 && uploadResults.length === 0 && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>
                    {validCount} valid, {invalidCount} with errors out of{" "}
                    {parsedTeachers.length} total row
                    {parsedTeachers.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Password</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeachers.map((teacher) => (
                      <TableRow
                        key={teacher.rowNumber}
                        className={
                          teacher.errors.length > 0 ? "bg-red-50 dark:bg-red-950/20" : ""
                        }
                      >
                        <TableCell className="text-muted-foreground">
                          {teacher.rowNumber}
                        </TableCell>
                        <TableCell className="font-medium">
                          {teacher.fullName || (
                            <span className="text-red-500 italic">Missing</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {teacher.email || (
                            <span className="text-red-500 italic">Missing</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {teacher.password ? "******" : (
                            <span className="text-red-500 italic">Missing</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {teacher.organizationId ? (
                            getOrgName(teacher.organizationId)
                          ) : (
                            <span className="text-red-500 italic">Missing</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {teacher.errors.length === 0 ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Valid
                            </Badge>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="destructive" className="cursor-help">
                                  {teacher.errors.length} error
                                  {teacher.errors.length !== 1 ? "s" : ""}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent
                                side="left"
                                className="max-w-xs"
                              >
                                <ul className="list-disc list-inside text-xs">
                                  {teacher.errors.map((e, i) => (
                                    <li key={i}>{e}</li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Upload Button */}
              <div className="flex items-center justify-end gap-3 mt-4">
                <Button variant="outline" onClick={handleReset}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={validCount === 0 || isUploading}
                  className="flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating accounts...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload {validCount} Teacher{validCount !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Bar */}
        {isUploading && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Creating teacher accounts...
                  </span>
                  <span className="font-medium">
                    {uploadProgress} / {uploadTotal}
                  </span>
                </div>
                <Progress
                  value={
                    uploadTotal > 0
                      ? (uploadProgress / uploadTotal) * 100
                      : 0
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Please do not close this page while the upload is in progress.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {uploadResults.length > 0 && !isUploading && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Results</CardTitle>
              <CardDescription>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {successCount} succeeded
                </span>
                {failCount > 0 && (
                  <span className="inline-flex items-center gap-1 ml-4">
                    <XCircle className="h-4 w-4 text-red-600" />
                    {failCount} failed
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadResults.map((result) => (
                      <TableRow
                        key={result.rowNumber}
                        className={
                          !result.success ? "bg-red-50 dark:bg-red-950/20" : ""
                        }
                      >
                        <TableCell className="text-muted-foreground">
                          {result.rowNumber}
                        </TableCell>
                        <TableCell className="font-medium">
                          {result.fullName}
                        </TableCell>
                        <TableCell>{result.email}</TableCell>
                        <TableCell>
                          {result.success ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Created
                            </Badge>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="destructive"
                                  className="cursor-help"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Failed
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent
                                side="left"
                                className="max-w-xs"
                              >
                                <p className="text-xs">{result.error}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-end mt-4">
                <Button variant="outline" onClick={handleReset}>
                  Upload Another File
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBulkTeacherAdd;
