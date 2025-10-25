import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LESSON_SCOPE, LESSON_TYPE } from "@/constants";
import { Label } from "@/components/ui/label"; // instead of @radix-ui/react-dropdown-menu
import { Header } from "@/components/Header";
import { useNavigate } from "react-router-dom";
import { lessonService } from "@/services/lessonService";
import { useToast } from "@/hooks/use-toast";
import { logError } from "@/utils/logger";

const CreateLessonPage = () => {
  const { toast } = useToast();
  const [lesson, setLesson] = useState({
    title: "",
    type: LESSON_TYPE.SLIDE_DECK,
    description: "",
    embedUrl: "",
    durationSeconds: 0,
    scope: LESSON_SCOPE.APP,
  });

  const navigate = useNavigate();

  const handleFieldChange = (field: string, value: any) => {
    const exclusiveFields = ["embedUrl", "assignmentID", "quizID"];
    if (exclusiveFields.includes(field)) {
      const cleared = exclusiveFields.reduce(
        (acc, f) => ({ ...acc, [f]: "" }),
        {}
      );
      setLesson({ ...lesson, ...cleared, [field]: value });
    } else {
      setLesson({ ...lesson, [field]: value });
    }
  };

  const handleSaveLesson = async () => {
    try {
      if (!lesson.title.trim()) {
        toast({ title: "Lesson title is required", variant: "destructive" });
        return;
      }
      if (!lesson.description.trim()) {
        toast({ title: "Lesson description is required", variant: "destructive" });
        return;
      }
      if (!lesson.type) {
        toast({ title: "Lesson type is required", variant: "destructive" });
        return;
      }
      if (!lesson.embedUrl.trim()) {
        toast({ title: "Embed URL is required", variant: "destructive" });
        return;
      }
      if (lesson.durationSeconds <= 0) {
        toast({ title: "Duration must be greater than 0 seconds", variant: "destructive" });
        return;
      }

      await lessonService.createLesson(lesson);
      toast({ title: "Lesson created successfully!", variant: "default" });

      // Reset form
      setLesson({
        title: "",
        type: LESSON_TYPE.SLIDE_DECK,
        description: "",
        embedUrl: "",
        durationSeconds: 0,
        scope: LESSON_SCOPE.APP,
      });
    } catch (error) {
      logError("Error creating lesson:", error);
      toast({ title: "Failed to create lesson", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-card text-card-foreground shadow-lg rounded-xl">
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <CardTitle className="text-xl font-bold">
                Create Lesson
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => navigate("/admin")}
                className="w-full md:w-auto"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="details">
              <TabsList className="mb-4">
                <TabsTrigger value="details">Lesson Details</TabsTrigger>
              </TabsList>

              <TabsContent
                value="details"
                className="p-4 sm:p-6 bg-background rounded-lg border shadow-sm"
              >
                <div className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label>Lesson Title</Label>
                    <Input
                      placeholder="e.g. Introduction to Algebra"
                      value={lesson.title}
                      onChange={(e) =>
                        handleFieldChange("title", e.target.value)
                      }
                      className="bg-background text-foreground"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe what this lesson covers..."
                      value={lesson.description}
                      onChange={(e) =>
                        handleFieldChange("description", e.target.value)
                      }
                      className="bg-background text-foreground"
                    />
                  </div>

                  {/* Type */}
                  <div className="space-y-2">
                    <Label>Lesson Type</Label>
                    <Select
                      value={lesson.type}
                      onValueChange={(val) =>
                        handleFieldChange("type", val)
                      }
                    >
                      <SelectTrigger className="w-full sm:w-[200px] bg-background text-foreground">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-card text-card-foreground">
                        {Object.entries(LESSON_TYPE).map(([key, val]) => (
                          <SelectItem key={key} value={val}>
                            {val}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* URL */}
                  <div className="space-y-2">
                    <Label>Embed URL</Label>
                    <Input
                      placeholder="Enter embed URL for the lesson content"
                      value={lesson.embedUrl}
                      onChange={(e) =>
                        handleFieldChange("embedUrl", e.target.value)
                      }
                      className="bg-background text-foreground"
                    />
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label>Duration (seconds)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g. 300"
                      value={lesson.durationSeconds || 0}
                      onChange={(e) =>
                        handleFieldChange(
                          "durationSeconds",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-[120px] bg-background text-foreground"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Save button */}
            <div className="flex justify-end mt-6">
              <Button
                onClick={handleSaveLesson}
                className="w-full md:w-auto"
              >
                Save Lesson
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateLessonPage;
