// import AdminLayout from "@/components/AdminLayout";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { ENVIRONMENT } from "@/constants";
// import { toast } from "@/hooks/use-toast";
// import { authService } from "@/services/authService";
// import { Loader2, Upload } from "lucide-react";
// import React, { useState } from "react";
// import * as XLSX from "xlsx/xlsx.mjs";

// const backendUrl = import.meta.env.VITE_APP_ENVIRONMENT === ENVIRONMENT.DEVELOPMENT
//     ? import.meta.env.VITE_DEV_BACKEND_URL
//     : import.meta.env.VITE_PROD_BACKEND_URL;

// const AdminBulkStudentEnroll: React.FC = () => {
//     const [file, setFile] = useState<File | null>(null);
//     const [isEnrolling, setIsEnrolling] = useState(false);

//     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         if (!e.target.files || e.target.files.length === 0) return;
//         setFile(e.target.files[0]);
//     };

//     const handleEnrollment = async () => {
//         if (!file) {
//             toast({ title: "No file selected", description: "Please choose an Excel sheet.", variant: "destructive" });
//             return;
//         }

//         setIsEnrolling(true);

//         try {
//             const idToken = await authService.getToken();

//             const data = await file.arrayBuffer();
//             const workbook = XLSX.read(data);
//             const sheet = workbook.Sheets[workbook.SheetNames[0]];

//             const rows = XLSX.utils.sheet_to_json(sheet);

//             let successCount = 0;
//             let failCount = 0;

//             for (const row of rows) {
//                 try {
//                     const res = await fetch(`${backendUrl}/enrollSingleStudent`, {
//                         method: "POST",
//                         headers: {
//                             "Content-Type": "application/json",
//                             "Authorization": `Bearer ${idToken}`
//                         },
//                         body: JSON.stringify({
//                             fullName: row["Full Name"],
//                             email: row["Email"],
//                             password: row["Password"],
//                             courseId: row["Course ID"],
//                             courseName: row["Course Name"]
//                         })
//                     });

//                     const result = await res.json();
//                     if (result.success) successCount++;
//                     else failCount++;
//                 } catch {
//                     failCount++;
//                 }
//             }

//             toast({
//                 title: "Bulk Enrollment Finished",
//                 description: `${successCount} success, ${failCount} failed.`,
//             });

//             setFile(null);
//         } catch (error: any) {
//             toast({
//                 title: "Bulk Enrollment Failed",
//                 description: error.message || "Something went wrong.",
//                 variant: "destructive",
//             });
//         } finally {
//             setIsEnrolling(false);
//         }
//     };

//     return (
//         <AdminLayout>
//             <Card className="max-w-xl mx-auto mt-6">
//                 <CardHeader>
//                     <CardTitle>Bulk Student Enrollment</CardTitle>
//                     <CardDescription>Upload an Excel file to enroll students into courses.</CardDescription>
//                 </CardHeader>

//                 <CardContent className="space-y-4">
//                     <input
//                         type="file"
//                         accept=".xlsx,.xls,.csv"
//                         onChange={handleFileChange}
//                         className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 
//               file:rounded-md file:border file:border-gray-300 file:text-sm file:bg-white 
//               file:hover:bg-gray-50"
//                     />

//                     {file && (
//                         <p className="text-sm text-muted-foreground">
//                             Selected: <strong>{file.name}</strong>
//                         </p>
//                     )}

//                     <Button
//                         onClick={handleEnrollment}
//                         disabled={!file || isEnrolling}
//                         className="flex items-center gap-2 w-full"
//                     >
//                         {isEnrolling ? (
//                             <>
//                                 <Loader2 className="h-4 w-4 animate-spin" />
//                                 Uploading...
//                             </>
//                         ) : (
//                             <>
//                                 <Upload className="h-4 w-4" />
//                                 Upload & Enroll
//                             </>
//                         )}
//                     </Button>
//                 </CardContent>
//             </Card>
//         </AdminLayout>
//     );
// };

// export default AdminBulkStudentEnroll;
