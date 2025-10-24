import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LESSON_SCOPE, LESSON_TYPE } from "@/constants";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { lessonService } from "@/services/lessonService";
import { Lesson } from "@/types/lesson";
import MDEditor from "@uiw/react-md-editor";

const EditLessonPage = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const [loading, setLoading] = useState(true);
    const [lesson, setLesson] = useState<Partial<Lesson>>({
        title: "",
        type: LESSON_TYPE.SLIDE_DECK,
        description: "",
        embedUrl: "",
        durationSeconds: 0,
        scope: LESSON_SCOPE.APP,
    });

    const navigate = useNavigate();

    // Detect dark/light mode for MDEditor
    const colorMode =
        typeof document !== "undefined" &&
            document.documentElement.classList.contains("dark")
            ? "dark"
            : "light";

    // Load lesson data
    useEffect(() => {
        const fetchLesson = async () => {
            try {
                if (!lessonId) return;
                const data = await lessonService.getLessonById(lessonId);
                if (!data) {
                    toast.error("Lesson not found");
                    navigate("/admin");
                    return;
                }
                setLesson(data);
            } catch (error) {
                console.error("Error loading lesson:", error);
                toast.error("Failed to load lesson");
            } finally {
                setLoading(false);
            }
        };

        fetchLesson();
    }, [lessonId, navigate]);

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

    const handleUpdateLesson = async () => {
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

            await lessonService.updateLesson(lessonId!, lesson);
            toast.success("Lesson updated successfully!");
            navigate("/admin");
        } catch (error) {
            console.error("Error updating lesson:", error);
            toast.error("Failed to update lesson");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Loading lesson...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Header />
            <div className="max-w-6xl mx-auto py-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center w-full justify-between">
                            <CardTitle>Edit Lesson</CardTitle>
                            <Button variant="outline" onClick={() => navigate("/admin")}>
                                Back to Dashboard
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {/* Two-column layout */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* LEFT COLUMN */}
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
                                        className="dark:bg-neutral-800 dark:border-neutral-700"
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <div
                                        data-color-mode={colorMode}
                                        className="border rounded-lg dark:border-neutral-700"
                                    >
                                        <MDEditor
                                            value={lesson.description}
                                            onChange={(value) =>
                                                handleFieldChange("description", value || "")
                                            }
                                            height={350}
                                            preview="live"
                                            className="!bg-transparent dark:!bg-neutral-900"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN */}
                            <div className="space-y-6">
                                {/* Lesson Type */}
                                <div className="space-y-2">
                                    <Label>Lesson Type</Label>
                                    <Select
                                        value={lesson.type}
                                        onValueChange={(val) =>
                                            handleFieldChange("type", val)
                                        }
                                    >
                                        <SelectTrigger className="w-[200px] dark:bg-neutral-800 dark:border-neutral-700">
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

                                {/* Embed URL */}
                                <div className="space-y-2">
                                    <Label>Embed URL</Label>
                                    <Input
                                        placeholder="Enter embed URL for the lesson content"
                                        value={lesson.embedUrl}
                                        onChange={(e) =>
                                            handleFieldChange("embedUrl", e.target.value)
                                        }
                                        className="dark:bg-neutral-800 dark:border-neutral-700"
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
                                        className="w-[160px] dark:bg-neutral-800 dark:border-neutral-700"
                                    />
                                </div>

                                {/* Scope */}
                                <div className="space-y-2">
                                    <Label>Lesson Scope</Label>
                                    <Select
                                        value={lesson.scope}
                                        onValueChange={(val) =>
                                            handleFieldChange("scope", val)
                                        }
                                    >
                                        <SelectTrigger className="w-[200px] dark:bg-neutral-800 dark:border-neutral-700">
                                            <SelectValue placeholder="Select scope" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(LESSON_SCOPE).map(([key, val]) => (
                                                <SelectItem key={key} value={val}>
                                                    {val}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Update Button moved to bottom */}
                        <div className="pt-8 flex justify-end">
                            <Button onClick={handleUpdateLesson}>
                                Update Lesson
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default EditLessonPage;
