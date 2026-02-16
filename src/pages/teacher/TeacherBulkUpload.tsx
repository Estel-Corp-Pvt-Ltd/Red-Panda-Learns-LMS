import TeacherLayout from "@/components/TeacherLayout";
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
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { firebaseConfig } from "@/firebaseConfig";
import { userService } from "@/services/userService";
import { organizationService } from "@/services/organizationService";
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

interface ParsedStudent {
  rowNumber: number;
  fullName: string;
  email: string;
  password: string;
  class?: string;
  division?: string;
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

const TeacherBulkUpload = () => {
  const { user } = useAuth();

  // Organisation name
  const [orgName, setOrgName] = useState<string>("");
  const [orgLoading, setOrgLoading] = useState(true);

  // File & parsing
  const [file, setFile] = useState<File | null>(null);
  const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([]);
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

  // ---------- Fetch organization name ----------
  useEffect(() => {
    const fetchOrg = async () => {
      if (!user?.organizationId) {
        setOrgLoading(false);
        return;
      }
      try {
        const org = await organizationService.getOrganizationById(
          user.organizationId
        );
        if (org) {
          setOrgName(org.name);
        }
      } catch (error) {
        console.error("Failed to fetch organization:", error);
      } finally {
        setOrgLoading(false);
      }
    };
    fetchOrg();
  }, [user?.organizationId]);

  // ---------- Parse file ----------
  const parseFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setParsedStudents([]);
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

      const students: ParsedStudent[] = [];
      const errors: string[] = [];

      rows.forEach((row, index) => {
        const rowNumber = index + 2; // header is row 1
        const fullName = String(row["Full Name"] ?? "").trim();
        const email = String(row["Email"] ?? "").trim();
        const password = String(row["Password"] ?? "").trim();
        const studentClass = String(row["Class"] ?? "").trim();
        const division = String(row["Division"] ?? "").trim();

        // Skip entirely empty rows
        if (!fullName && !email && !password) {
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

        if (rowErrors.length > 0) {
          errors.push(`Row ${rowNumber}: ${rowErrors.join(", ")}`);
        }

        students.push({
          rowNumber,
          fullName,
          email,
          password,
          class: studentClass || undefined,
          division: division || undefined,
          errors: rowErrors,
        });
      });

      setParsedStudents(students);
      setParseErrors(errors);
    } catch (err: any) {
      console.error("File parsing error:", err);
      setParseErrors([`Failed to parse file: ${err.message || "Unknown error"}`]);
    }
  }, []);

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
      ["Full Name", "Email", "Password", "Class", "Division"],
      ["John Doe", "john.doe@example.com", "pass123", "Class 10", "A"],
      ["Jane Smith", "jane.smith@example.com", "pass456", "Class 10", "B"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "student_upload_template.csv");
  };

  // ---------- Upload / Create students ----------
  const handleUpload = async () => {
    const validStudents = parsedStudents.filter((s) => s.errors.length === 0);

    if (validStudents.length === 0) {
      toast({
        title: "No valid students",
        description:
          "All rows have validation errors. Please fix the file and try again.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.organizationId) {
      toast({
        title: "No organization",
        description: "You are not assigned to an organization.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadTotal(validStudents.length);
    setUploadResults([]);

    const results: UploadResult[] = [];

    // Create a secondary Firebase app so we don't sign out the current teacher
    const secondaryApp = initializeApp(
      firebaseConfig,
      `BulkUpload_${Date.now()}`
    );
    const secondaryAuth = getAuth(secondaryApp);

    try {
      for (let i = 0; i < validStudents.length; i++) {
        const student = validStudents[i];
        const { firstName, lastName } = splitFullName(student.fullName);

        try {
          // 1. Create Firebase Auth user on secondary app
          const cred = await createUserWithEmailAndPassword(
            secondaryAuth,
            student.email,
            student.password
          );

          // Sign out from secondary auth after each creation
          await signOut(secondaryAuth);

          // 2. Create Firestore user document
          const createResult = await userService.createUser(cred.user.uid, {
            id: cred.user.uid,
            firstName,
            lastName,
            email: student.email,
            role: USER_ROLE.STUDENT,
            status: USER_STATUS.ACTIVE,
            organizationId: user.organizationId,
            class: student.class,
            division: student.division,
          });

          if (createResult.success) {
            results.push({
              rowNumber: student.rowNumber,
              fullName: student.fullName,
              email: student.email,
              success: true,
            });
          } else {
            results.push({
              rowNumber: student.rowNumber,
              fullName: student.fullName,
              email: student.email,
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
            rowNumber: student.rowNumber,
            fullName: student.fullName,
            email: student.email,
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
        title: "All students created successfully",
        description: `${successCount} student account${successCount !== 1 ? "s" : ""} created and assigned to your organization.`,
      });
    } else if (successCount === 0) {
      toast({
        title: "Upload failed",
        description: `All ${failCount} student account${failCount !== 1 ? "s" : ""} failed to create. Check the results below.`,
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
    setParsedStudents([]);
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
  const filteredStudents = parsedStudents.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  const validCount = parsedStudents.filter((s) => s.errors.length === 0).length;
  const invalidCount = parsedStudents.filter(
    (s) => s.errors.length > 0
  ).length;

  const successCount = uploadResults.filter((r) => r.success).length;
  const failCount = uploadResults.filter((r) => !r.success).length;

  // ---------- No organization guard ----------
  if (!user?.organizationId) {
    return (
      <TeacherLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertTriangle className="h-16 w-16 text-yellow-500" />
          <h2 className="text-2xl font-bold">Not Assigned to an Organization</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Please contact your administrator to get assigned to an organization
            before uploading students.
          </p>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Bulk Student Upload</h1>
              <p className="text-muted-foreground">
                Create student accounts and assign them to{" "}
                {orgLoading ? (
                  <Loader2 className="inline h-3 w-3 animate-spin" />
                ) : (
                  <span className="font-medium text-foreground">
                    {orgName || "your organization"}
                  </span>
                )}
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
                Upload a CSV file to create student accounts and assign them to
                your organization.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Upload Student File
            </CardTitle>
            <CardDescription>
              Upload a CSV or Excel file with the following columns:{" "}
              <strong>Full Name</strong>, <strong>Email</strong>,{" "}
              <strong>Password</strong>, <strong>Class</strong> (optional),{" "}
              <strong>Division</strong> (optional)
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
                    {parsedStudents.length} row{parsedStudents.length !== 1 ? "s" : ""}
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
        {parsedStudents.length > 0 && uploadResults.length === 0 && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>
                    {validCount} valid, {invalidCount} with errors out of{" "}
                    {parsedStudents.length} total row
                    {parsedStudents.length !== 1 ? "s" : ""}
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
                      <TableHead>Class</TableHead>
                      <TableHead>Division</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow
                        key={student.rowNumber}
                        className={
                          student.errors.length > 0 ? "bg-red-50 dark:bg-red-950/20" : ""
                        }
                      >
                        <TableCell className="text-muted-foreground">
                          {student.rowNumber}
                        </TableCell>
                        <TableCell className="font-medium">
                          {student.fullName || (
                            <span className="text-red-500 italic">Missing</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {student.email || (
                            <span className="text-red-500 italic">Missing</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {student.password ? "******" : (
                            <span className="text-red-500 italic">Missing</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {student.class || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {student.division || "-"}
                        </TableCell>
                        <TableCell>
                          {student.errors.length === 0 ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Valid
                            </Badge>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="destructive" className="cursor-help">
                                  {student.errors.length} error
                                  {student.errors.length !== 1 ? "s" : ""}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent
                                side="left"
                                className="max-w-xs"
                              >
                                <ul className="list-disc list-inside text-xs">
                                  {student.errors.map((e, i) => (
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
                      Upload {validCount} Student{validCount !== 1 ? "s" : ""}
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
                    Creating student accounts...
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
    </TeacherLayout>
  );
};

export default TeacherBulkUpload;
