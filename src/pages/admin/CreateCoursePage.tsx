import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { courseService } from "@/services/courseService";
import { authorService } from "@/services/authorService";
import { Header } from "@/components/Header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

interface CourseFormData {
  title: string;
  description: string;
  authorName: string;
  authorId: string;
}

type AuthorOption = {
  id: string;
  name: string;
};

const CreateCoursePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    description: "",
    authorName: "",
    authorId: "",
  });

  const [authors, setAuthors] = useState<AuthorOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: keyof CourseFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateCourse = async () => {
    // Required field checks
    const requiredFields: { field: keyof CourseFormData; label: string }[] = [
      { field: "title", label: "Course Title" },
      { field: "description", label: "Course Description" },
      { field: "authorId", label: "Author" },
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
        authorId: formData.authorId,
        authorName: formData.authorName,
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

  const handleAuthorSelect = (authorId: string) => {
    const selected = authors.find((a) => a.id === authorId);
    setFormData((prev) => ({
      ...prev,
      authorId: selected?.id || "",
      authorName: selected?.name || "",
    }));
  };

  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const data = await authorService.getAllAuthors();
        setAuthors(
          data.map((author) => ({
            id: author.id,
            name: [author.firstName, author.middleName, author.lastName]
              .filter(Boolean)
              .join(" "),
          }))
        );
      } catch (error) {
        console.error("Failed to fetch authors:", error);
        toast({
          title: "Error",
          description: "Could not load authors list.",
          variant: "destructive",
        });
      }
    };
    fetchAuthors();
  }, [toast]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ✅ Shared Header */}
      <Header />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-card shadow-md rounded-xl">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-xl font-bold">
                  Create New Course
                </CardTitle>
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin")}
                  className="w-full sm:w-auto"
                >
                  Back to Dashboard
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Course Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter course title"
                  value={formData.title}
                  onChange={(e) =>
                    handleInputChange("title", e.target.value)
                  }
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

              {/* Author Selection */}
              <div className="space-y-2">
                <Label>Author *</Label>
                <Select
                  value={formData.authorId}
                  onValueChange={handleAuthorSelect}
                >
                  <SelectTrigger className="w-full bg-background text-foreground">
                    <SelectValue placeholder="Select an author" />
                  </SelectTrigger>
                  <SelectContent className="bg-card text-card-foreground">
                    {authors.map((author) => (
                      <SelectItem key={author.id} value={author.id}>
                        {author.name}
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