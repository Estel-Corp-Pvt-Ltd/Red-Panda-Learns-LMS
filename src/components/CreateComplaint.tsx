import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { COMPLAINT_CATEGORY } from "@/constants";
import { useToast } from "@/hooks/use-toast";
import { complaintService } from "@/services/complaintService";
import { fileService } from "@/services/fileService";
import { CheckCircle, Loader2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export function CreateComplaint({
    userId,
    trigger,
}: {
    userId: string;
    trigger: React.ReactNode;
}) {
    const { toast } = useToast();
    const location = useLocation();

    const relatedEntityId =
        window.location.origin + location.pathname + location.search;

    const [userName, setUserName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [category, setCategory] = useState<string>();
    const [description, setDescription] = useState("");

    const [images, setImages] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [isSuccess, setIsSuccess] = useState(false);
    const [open, setOpen] = useState(false);

    const uploadImages = async (): Promise<string[]> => {
        const results = await Promise.all(
            images.map((file) =>
                fileService.uploadAttachment(`/complaints/attachments/${userId}`, file)
            )
        );

        if (results.some((r) => !r.success)) {
            throw new Error("Image upload failed");
        }

        return results.map((r) => r.data as string);
    };

    const resetForm = () => {
        previews.forEach((url) => URL.revokeObjectURL(url));
        setIsSuccess(false);
        setSubmitting(false);
        setUserName("");
        setUserEmail("");
        setCategory(undefined);
        setDescription("");
        setImages([]);
        setPreviews([]);
    };

    const handleImageUpload = (files: FileList | null) => {
        if (!files) return;

        if (images.length + files.length > 4) {
            toast({
                title: "You can upload up to 4 images only",
                variant: "destructive",
            });
            return;
        }

        const validFiles: File[] = [];
        const newPreviews: string[] = [];

        for (const file of Array.from(files)) {
            if (!file.type.startsWith("image/")) {
                toast({
                    title: "Only image files are allowed",
                    variant: "destructive",
                });
                continue;
            }

            validFiles.push(file);
            newPreviews.push(URL.createObjectURL(file));
        }

        setImages((prev) => [...prev, ...validFiles]);
        setPreviews((prev) => [...prev, ...newPreviews]);
    };

    const removeImage = (index: number) => {
        URL.revokeObjectURL(previews[index]);

        setImages((prev) => prev.filter((_, i) => i !== index));
        setPreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!userName || !userEmail || !category || !description) {
            toast({
                title: "Please fill all required fields",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);
        setUploading(true);

        try {
            if (!/\S+@\S+\.\S+/.test(userEmail)) {
                toast({ title: "Invalid email address", variant: "destructive" });
                return;
            }

            const imageUrls = await uploadImages();

            const complaintId = await complaintService.createComplaint({
                userName,
                userEmail,
                category,
                description,
                imageUrls,
                userId,
                relatedEntityId
            });

            if (complaintId) {
                setIsSuccess(true);
                return;
            }

            setIsSuccess(false);
        } catch (error) {
            toast({
                title: "Failed to submit complaint",
                description: "Please try again",
                variant: "destructive",
            });
        } finally {
            setUploading(false);
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (!isSuccess) return;

        const timer = setTimeout(() => {
            setOpen(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, [isSuccess]);

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                setOpen(value);
                if (!value) {
                    resetForm();
                }
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>

            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
                {
                    isSuccess ?
                        (
                            <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
                                <CheckCircle className="h-14 w-14 text-green-500" />

                                <h3 className="text-lg font-semibold">
                                    Issue Registered
                                </h3>

                                <p className="text-sm text-muted-foreground">
                                    Our team will review it shortly.
                                </p>

                                <p className="text-xs text-muted-foreground">
                                    Closing this window automatically…
                                </p>
                            </div>
                        )
                        :
                        (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Customer Support</DialogTitle>
                                    <DialogDescription>
                                        Submit an issue and we’ll help you resolve it.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-4 py-4">
                                    <Input
                                        placeholder="Your Name *"
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                    />

                                    <Input
                                        type="email"
                                        placeholder="Email Address *"
                                        value={userEmail}
                                        onChange={(e) => setUserEmail(e.target.value)}
                                    />

                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Category *" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.values(COMPLAINT_CATEGORY).map((c) => (
                                                <SelectItem key={c} value={c}>
                                                    {c}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Textarea
                                        placeholder="Describe the issue in detail *"
                                        rows={4}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />

                                    {/* Image Upload */}
                                    <div className="grid gap-2">
                                        <span className="text-sm text-muted-foreground">
                                            Screenshots (up to 4)
                                        </span>

                                        <label className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-6 cursor-pointer">
                                            <Upload className="h-5 w-5" />
                                            <span className="text-sm">
                                                {uploading ? "Uploading images..." : "Select images"}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                disabled={uploading}
                                                className="hidden"
                                                onChange={(e) => handleImageUpload(e.target.files)}
                                            />
                                        </label>

                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {previews.map((src, i) => (
                                        <div key={i} className="relative h-20 rounded-md overflow-hidden border">
                                            <img
                                                src={src}
                                                alt="preview"
                                                className="h-full w-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(i)}
                                                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <DialogFooter>
                                    <Button
                                        className="w-full"
                                        onClick={handleSubmit}
                                        disabled={uploading || submitting}
                                    >
                                        {(uploading || submitting) && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        Submit
                                    </Button>
                                </DialogFooter>
                            </>
                        )
                }
            </DialogContent>
        </Dialog>
    );
};
