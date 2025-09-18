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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LESSON_SCOPE, LESSON_TYPE } from "@/constants";
import { Label } from "@radix-ui/react-dropdown-menu";
import { Header } from "@/components/layout/header";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { lessonService } from "@/services/lessonService";

const CreateLessonPage = () => {
    const [lesson, setLesson] = useState({
        title: "",
        type: LESSON_TYPE.SLIDE_DECK,
        description: "",
        embedUrl: "",
        durationSeconds: 0,
        scope: LESSON_SCOPE.APP
    });

    const navigate = useNavigate();

    const handleFieldChange = (field: string, value: any) => {
        const exclusiveFields = ["embedUrl", "assignmentID", "quizID"];
        if (exclusiveFields.includes(field)) {
            const cleared = exclusiveFields.reduce((acc, f) => ({ ...acc, [f]: "" }), {});
            setLesson({ ...lesson, ...cleared, [field]: value });
        } else {
            setLesson({ ...lesson, [field]: value });
        }
    };

    const isQuizOrAssignment = () => {
        return lesson.type === LESSON_TYPE.QUIZ || lesson.type === LESSON_TYPE.ASSIGNMENT;
    };

    const handleSaveLesson = async () => {
        try {
            if (!lesson.title.trim()) {
                toast.error("Lesson title is required");
                return;
            }
            if (!lesson.description.trim()) {
                toast.error("Lesson description is required");
                return;
            }
            if (!lesson.type) {
                toast.error("Lesson type is required");
                return;
            }
            if (!lesson.embedUrl.trim()) {
                toast.error("Embed URL is required");
                return;
            }
            if (lesson.durationSeconds <= 0) {
                toast.error("Duration must be greater than 0 seconds");
                return;
            }
            
            await lessonService.createLesson(lesson);
            toast.success("Lesson created successfully!");

            // Reset form
            setLesson({
                title: "",
                type: LESSON_TYPE.SLIDE_DECK,
                description: "",
                embedUrl: "",
                durationSeconds: 0,
                scope: LESSON_SCOPE.APP
            });
        } catch (error) {
            console.error("Error creating lesson:", error);
            toast.error("Failed to create lesson");
        }
    };

    return (
        <div className="min-h-screen">
            <Header />
            <div className="max-w-4xl mx-auto py-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center w-full justify-between">
                            <CardTitle>Create Lesson</CardTitle>
                            <Button variant="outline" onClick={() => navigate('/admin')}>
                                Back to Dashboard
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="details">
                            <TabsList className="mb-4">
                                <TabsTrigger value="details">Lesson Details</TabsTrigger>
                            </TabsList>

                            <TabsContent value="details" className="p-6 bg-white rounded-lg shadow-sm">
                                <div className="space-y-6">
                                    {/* Title */}
                                    <div className="space-y-2">
                                        <Label>Lesson Title</Label>
                                        <Input
                                            placeholder="e.g. Introduction to Algebra"
                                            value={lesson.title}
                                            onChange={(e) => handleFieldChange("title", e.target.value)}
                                        />
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea
                                            placeholder="Describe what this lesson covers..."
                                            value={lesson.description}
                                            onChange={(e) => handleFieldChange("description", e.target.value)}
                                        />
                                    </div>

                                    {/* Type */}
                                    <div className="space-y-2">
                                        <Label>Lesson Type</Label>
                                        <Select
                                            value={lesson.type}
                                            onValueChange={(val) => handleFieldChange("type", val)}
                                        >
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(LESSON_TYPE).map(([key, val]) => (
                                                    <SelectItem key={key} value={val}>
                                                        {val}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Embed URL</Label>
                                        <Input
                                            placeholder="Enter embed URL for the lesson content"
                                            value={lesson.embedUrl}
                                            onChange={(e) => handleFieldChange("embedUrl", e.target.value)}
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
                                            onChange={(e) => handleFieldChange("durationSeconds", parseInt(e.target.value))}
                                            className="w-[120px]"
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {/* Save button */}
                        <div className="flex justify-end mt-6">
                            <Button onClick={handleSaveLesson} className="w-full md:w-auto">
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
