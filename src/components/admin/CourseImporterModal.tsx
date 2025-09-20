import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, BookOpen } from "lucide-react";
import { Course, Topic } from "@/types/course";
import { courseService } from "@/services/courseService";
import { useToast } from "@/hooks/use-toast";
import { LearningUnit } from "@/types/general";

interface CourseSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentCourseId: string;
    currentCurriculum: Omit<SelectableTopicOrLesson, 'isSelected'>[];
    onConfirm: (selectedItems: Omit<SelectableTopicOrLesson, 'isSelected'>[]) => void;
};

type SelectableTopicOrLesson = {
    id: string;
    title: string;
    type: LearningUnit;
    isSelected: boolean;
};

export const CourseImporterModal = ({
    isOpen,
    onClose,
    currentCourseId,
    currentCurriculum,
    onConfirm
}: CourseSelectorModalProps) => {
    const { toast } = useToast();

    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [step, setStep] = useState<"courses" | "content">("courses");
    const [curriculum, setCurriculum] = useState<SelectableTopicOrLesson[]>([]);

    // Fetch courses on modal open
    useEffect(() => {
        const fetchCourses = async () => {
            if (!isOpen) return;
            setStep("courses");
            setCurriculum(null);
            setSearchTerm("");
            setLoading(true);
            try {
                const allCourses = await courseService.getFilteredCourses([
                    { field: 'id', op: '!=', value: currentCourseId }
                ]);
                setCourses(allCourses);
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to fetch courses.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [isOpen, toast]);

    const selectCurriculum = (course: Course) => {
        const currentIds = new Set(currentCurriculum.map(item => item.id));

        const filtered = getFlatCurriculum(course.topics)
            .filter(item => !currentIds.has(item.id));

        setCurriculum(filtered);
        setStep("content");
    };

    const getFlatCurriculum = (topics: Topic[]): SelectableTopicOrLesson[] => {
        return topics.flatMap(topic => [
            {
                id: topic.id,
                type: "Topic" as const,
                title: topic.title,
                isSelected: false
            },
            ...topic.items.map(lesson => ({
                id: lesson.id,
                type: "Lesson" as const,
                title: lesson.title,
                isSelected: false
            }))
        ]);
    };

    // Filter courses
    const filteredCourses =
        searchTerm.trim() === ""
            ? courses
            : courses.filter((course) =>
                course.title.toLowerCase().includes(searchTerm.toLowerCase())
            );

    const handleConfirm = () => {
        const selectedItems = curriculum.filter(item => item.isSelected);
        onConfirm(selectedItems);
        onClose();
    };

    const isAnyItemSelected = () => {
        for (const item of curriculum) {
            if (item.isSelected) {
                return true;
            }
        }
        return false;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {step === "courses" ? "Select a Course" : "Select Topics & Lessons"}
                    </DialogTitle>
                </DialogHeader>

                {/* Search bar */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={
                                step === "courses"
                                    ? "Search courses by title..."
                                    : "Search in this course..."
                            }
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : step === "courses" ? (
                    // COURSE LIST
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredCourses.map((course) => (
                           
                            <Card
                                key={course.id}
                                className="cursor-pointer border-2 border-transparent hover:border-muted"
                                onClick={() => {
                                    selectCurriculum(course);
                                }}
                            >
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        {course.title}
                                        
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {course.description || "No description"} 
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : curriculum ?  (
                    <div className="flex flex-col gap-2">
                        {curriculum.map((item, idx) => (
                            <div
                                key={item.id}
                                className={`flex items-center gap-2 py-1 ${item.type === "Lesson" ? "pl-6" : ""}`}
                            >
                                <Checkbox
                                    checked={item.isSelected} 
                                   onCheckedChange={() => {
    setCurriculum(prev => {
        const updated = [...prev];

        const clickedItem = updated[idx];

        // If the item is a topic
        if (clickedItem.type === "Topic") {
            const newSelectedState = !clickedItem.isSelected;
            updated[idx] = { ...clickedItem, isSelected: newSelectedState };

            // Select/Deselect lessons under this topic
            let i = idx + 1;
            while (i < updated.length && updated[i].type === "Lesson") {
                updated[i] = { ...updated[i], isSelected: newSelectedState };
                i++;
            }
        } else {
            // It's a lesson - toggle individually
            updated[idx] = { ...clickedItem, isSelected: !clickedItem.isSelected };
        }

        return updated;
    });
}}

                                />
                         
                                {item.type === "Lesson" && <BookOpen className="h-4 w-4 text-primary" />} 
                                <span className={item.type === "Topic" ? "font-medium" : ""}>
                                {item.title} 
                                </span>
                              
                            </div>
                        ))}
                    </div>

                ) : null}

                {/* Action buttons */}
                <div className="flex justify-end gap-4 mt-6">
                    {step === "content" && (
                        <Button variant="outline" onClick={() => setStep("courses")}>
                            Back
                        </Button>
                    )}
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    {step === "content" && (
                        <Button
                            onClick={handleConfirm}
                            disabled={!isAnyItemSelected()}
                        >
                            Add Selected
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};