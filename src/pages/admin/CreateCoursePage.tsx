import { useState, useRef, useEffect } from "react";
import { Form, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { courseService } from "@/services/courseService";
import { authorService } from "@/services/authorService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CourseFormData {
  title: string;
  description: string;
  authorName: string;
  authorId: string;
};

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
    authorId: ""
  });
  const [authors, setAuthors] = useState<AuthorOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: keyof CourseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateCourse = async () => {
    // Trimmed values to avoid whitespace-only input passing validation
    const requiredFields: { field: keyof CourseFormData; label: string }[] = [
      { field: "title", label: "Course Title" },
      { field: "description", label: "Course Description" },
    ];

    // Check for empty required fields
    for (const { field, label } of requiredFields) {
      if (!formData[field] || String(formData[field]).trim() === "") {
        toast({
          title: "Missing Required Field",
          description: `${label} is required before creating the course.`,
          variant: "destructive",
        });
        return; // Stop execution if any field is missing
      }
    }

    setIsLoading(true);
    try {
      const courseData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        authorId: formData.authorId,
        authorName: formData.authorName
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
    const selected = authors.find(a => a.id === authorId);
    setFormData(prev => ({
      ...prev,
      authorId: selected?.id || "",
      authorName: selected?.name || "",
    }));
  };

  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const data = await authorService.getAllAuthors();
        setAuthors(data.map(author => ({ name: author.firstName + " " + author.middleName + " " + author.lastName, id: author.id })));
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Create New Course</h1>
            <Button variant="outline" onClick={() => navigate('/admin')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Course Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter course title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>

              {/* Course Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Course Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter a brief overview of the course"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>

              {/* Author Selection */}
              <div className="space-y-2">
                <Label>Author *</Label>
                <Select
                  value={formData.authorId}
                  onValueChange={handleAuthorSelect}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an author" />
                  </SelectTrigger>
                  <SelectContent>
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
                  onClick={() => {
                    handleCreateCourse();
                  }}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Save & Build Curriculum
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
