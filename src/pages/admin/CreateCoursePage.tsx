import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { courseService } from "@/services/courseService";
import { instructorService } from "@/services/instructorService";
import { getFullName } from "@/utils/name";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type CourseFormData = {
  title: string;
  description: string;
  instructorName: string;
  instructorId: string;
};

type InstructorOption = {
  id: string;
  name: string;
};

const CreateCoursePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    description: "",
    instructorName: "",
    instructorId: "",
  });

  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: keyof CourseFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateCourse = async () => {
    const requiredFields: { field: keyof CourseFormData; label: string }[] = [
      { field: "title", label: "Course Title" },
      { field: "description", label: "Course Description" },
      { field: "instructorId", label: "Instructor" },
    ];

    for (const { field, label } of requiredFields) {
      if (!formData[field] || String(formData[field]).trim() === "") {
        toast({
          title: "Missing Required Field",
          description: `${label} is required before creating the course.`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const courseData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        instructorId: formData.instructorId,
        instructorName: formData.instructorName,
      };

      const courseId = await courseService.createCourse(courseData);

      toast({
        title: "Success",
        description: "Course created successfully!",
      });

      navigate(`/admin/edit-course/${courseId}`);
    } catch (error) {
      console.error("Error creating course:", error);
      toast({
        title: "Error",
        description: "Failed to create course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstructorSelect = (instructorId: string) => {
    const selected = instructors.find(
      (instructor) => instructor.id === instructorId
    );
    setFormData((prev) => ({
      ...prev,
      instructorId: selected?.id || "",
      instructorName: selected?.name || "",
    }));
  };

  useEffect(() => {
    const fetchInstructors = async () => {
      const result = await instructorService.getAllInstructors();

      if (result.success) {
        const formattedInstructors = result.data.map((instructor) => ({
          id: instructor.id,
          name: getFullName(
            instructor.firstName,
            instructor.middleName,
            instructor.lastName
          ),
        }));

        setInstructors(formattedInstructors);
      } else {
        console.error("Failed to fetch instructors:", result.error);
        toast({
          title: "Error",
          description: "Could not load instructors' list.",
          variant: "destructive",
        });
      }
    };
    fetchInstructors();
  }, [toast]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      {/* Top bar: Back + Title */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin")}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>

            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                Create Course
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-card shadow-md rounded-xl pt-4">
           

            <CardContent className="space-y-6">
              {/* Course Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter course title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="bg-background text-foreground"
                />
              </div>

              {/* Course Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Course Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Enter a brief overview of the course"
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  className="bg-background text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label>Instructor *</Label>
                <Select
                  value={formData.instructorId}
                  onValueChange={handleInstructorSelect}
                >
                  <SelectTrigger className="w-full bg-background text-foreground">
                    <SelectValue placeholder="Select an instructor" />
                  </SelectTrigger>
                  <SelectContent className="bg-card text-card-foreground">
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id}>
                        {instructor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  variant="secondary"
                  onClick={handleCreateCourse}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Creating..." : "Save & Build Curriculum"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CreateCoursePage;
