import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { Loader2, Upload } from "lucide-react";
import React, { useState } from "react";
import * as XLSX from "xlsx/xlsx.mjs";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const AdminBulkStudentEnroll: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isEnrolling, setIsEnrolling] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setFile(e.target.files[0]);
    };

    const handleEnrollment = async () => {
        if (!file) {
            toast({
                title: "No file selected",
                description: "Please choose an Excel sheet before continuing.",
                variant: "destructive",
            });
            return;
        }

        setIsEnrolling(true);

        try {
            const idToken = await authService.getToken();

            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);

            const requiredFields = ["Full Name", "Email", "Password", "Course ID", "Course Name"];
            const students: any[] = [];
            const invalidRows: string[] = [];

            rows.forEach((row: any, index: number) => {
                const rowNumber = index + 2; // Header at row 1
                const missingFields = requiredFields.filter((f) => !row[f] || String(row[f]).trim() === "");

                // Check for missing fields
                if (missingFields.length > 0) {
                    invalidRows.push(`Row ${rowNumber}: Missing ${missingFields.join(", ")}`);
                    return;
                }

                const password = String(row["Password"]).trim();

                // Password must be exactly 6 digits (numbers only)
                if (!/^\d{6}$/.test(password)) {
                    invalidRows.push(`Row ${rowNumber}: Password must be a 6-digit number`);
                    return;
                }

                // Add valid student
                students.push({
                    fullName: String(row["Full Name"]).trim(),
                    email: String(row["Email"]).trim(),
                    password,
                    courseId: String(row["Course ID"]).trim(),
                    courseName: String(row["Course Name"]).trim(),
                });
            });

            if (invalidRows.length > 0) {
                toast({
                    title: "Invalid data found in sheet",
                    description: invalidRows.slice(0, 5).join("; ") + (invalidRows.length > 5 ? "..." : ""),
                    variant: "destructive",
                });
                setIsEnrolling(false);
                return;
            }

            if (students.length === 0) {
                toast({
                    title: "No valid data found",
                    description: "All rows contain errors or missing fields.",
                    variant: "destructive",
                });
                setIsEnrolling(false);
                return;
            }

            // ✅ Send all valid students in one batch
            const res = await fetch(`${backendUrl}/enrollStudentsInBulk`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ students }),
            });

            const result = await res.json();

            setFile(null);

            toast({
                title: "Bulk Enrollment Started",
                description: result.message || `${students.length} valid tasks queued.`,
            });

            setFile(null);
        } catch (error: any) {
            toast({
                title: "Bulk Enrollment Failed",
                description: error.message || "Something went wrong while processing the file.",
                variant: "destructive",
            });
        } finally {
            setIsEnrolling(false);
        }
    };

    return (
        <AdminLayout>
            <Card className="max-w-xl mx-auto mt-6">
                <CardHeader>
                    <CardTitle>Bulk Student Enrollment</CardTitle>
                    <CardDescription>
                        Upload an Excel file to enroll students into courses. It should contain the following fields.
                        <br />
                        <strong>Full Name</strong><br />
                        <strong>Email</strong><br />
                        <strong>Password</strong><br />
                        <strong>Course ID</strong><br />
                        <strong>Course Name</strong>
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 
              file:rounded-md file:border file:border-gray-300 file:text-sm file:bg-white 
              file:hover:bg-gray-50"
                    />

                    {file && (
                        <p className="text-sm text-muted-foreground">
                            Selected: <strong>{file.name}</strong>
                        </p>
                    )}

                    <Button
                        onClick={handleEnrollment}
                        disabled={!file || isEnrolling}
                        className="flex items-center gap-2 w-full"
                    >
                        {isEnrolling ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4" />
                                Upload & Enroll
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </AdminLayout>
    );
};

export default AdminBulkStudentEnroll;
