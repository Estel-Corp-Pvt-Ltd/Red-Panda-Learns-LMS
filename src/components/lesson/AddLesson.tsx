import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { LESSON_TYPE } from "@/constants";
import { useToast } from "@/hooks/use-toast";
import { fileService } from "@/services/fileService";
import { lessonService } from "@/services/lessonService";
import { Lesson } from "@/types/lesson";
import { logError } from "@/utils/logger";
import { Upload, X, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import MarkdownEditor from "../markdownEditor/MarkdownEditorComponent";
import VideoPlayer from "../VideoPlayer";
import { authService } from "@/services/authService";
import {
  createZoomMeetingService,
  ZoomMeetingResponseData,
} from "@/services/zoom/createZoomMeetingService";

// Predefined hosts - you can modify these
const PREDEFINED_HOSTS = [
  { id: "host1", name: "Arbaaz Khan", email: "arbukhan2016@gmail.com" },
  { id: "host2", name: "TREX", email: "blacktrex099@gmail.com" },
];

const CUSTOM_HOST_VALUE = "custom";

type ZoomMeetingConfig = {
  topic: string;
  agenda: string;
  start_time: string;
  duration: number; // in minutes
  default_password: string;
  request_permission_to_unmute_participants: boolean;
  invitees: string[];
  host_email: string;
};

type CreateLessonModalProps = {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
  onLessonCreated?: (lesson: Lesson) => void;
};

export const CreateLessonModal = ({
  courseId,
  isOpen,
  onClose,
  onLessonCreated,
}: CreateLessonModalProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [selectedHostOption, setSelectedHostOption] = useState("");
  const [isCustomHost, setIsCustomHost] = useState(false);
  const [lesson, setLesson] = useState({
    title: "",
    type: LESSON_TYPE.SLIDE_DECK as Lesson["type"],
    description: "",
    embedUrl: "",
    duration: { hours: 0, minutes: 0 },
    karmaBoostExpiresAfter: { hours: 0, minutes: 0 },
    durationAddedtoLearningProgress: false,
  });

  const [zoomConfig, setZoomConfig] = useState<ZoomMeetingConfig>({
    topic: "",
    agenda: "",
    start_time: "",
    duration: 60,
    default_password: "",
    request_permission_to_unmute_participants: false,
    invitees: [],
    host_email: "",
  });

  // Add scroll management
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const colorMode =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";

  const handleFieldChange = (field: string, value: any) => {
    if (field === "duration-hours") {
      setLesson((prev) => ({
        ...prev,
        duration: { ...prev.duration, hours: value },
      }));
    } else if (field === "duration-minutes") {
      setLesson((prev) => ({
        ...prev,
        duration: { ...prev.duration, minutes: value },
      }));
    } else if (field === "karmaBoost-hours") {
      setLesson((prev) => ({
        ...prev,
        karmaBoostExpiresAfter: {
          ...prev.karmaBoostExpiresAfter,
          hours: value,
        },
      }));
    } else if (field === "karmaBoost-minutes") {
      setLesson((prev) => ({
        ...prev,
        karmaBoostExpiresAfter: {
          ...prev.karmaBoostExpiresAfter,
          minutes: value,
        },
      }));
    } else {
      setLesson((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleZoomConfigChange = (field: keyof ZoomMeetingConfig, value: any) => {
    setZoomConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleHostSelection = (value: string) => {
    setSelectedHostOption(value);

    if (value === CUSTOM_HOST_VALUE) {
      setIsCustomHost(true);
      setZoomConfig((prev) => ({ ...prev, host_email: "" }));
    } else {
      setIsCustomHost(false);
      const selectedHost = PREDEFINED_HOSTS.find((host) => host.id === value);
      if (selectedHost) {
        setZoomConfig((prev) => ({ ...prev, host_email: selectedHost.email }));
      }
    }
  };

  const handleCustomHostChange = (email: string) => {
    setZoomConfig((prev) => ({ ...prev, host_email: email }));
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addEmail = () => {
    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail) return;

    if (!validateEmail(trimmedEmail)) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }

    if (zoomConfig.invitees.includes(trimmedEmail)) {
      toast({ title: "Email already added", variant: "destructive" });
      return;
    }

    setZoomConfig((prev) => ({
      ...prev,
      invitees: [...prev.invitees, trimmedEmail],
    }));
    setEmailInput("");
  };

  const removeEmail = (emailToRemove: string) => {
    setZoomConfig((prev) => ({
      ...prev,
      invitees: prev.invitees.filter((email) => email !== emailToRemove),
    }));
  };

  const handleEmailKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  };

  const fetchVideoDuration = async (url: string) => {
    try {
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        let videoId = "";

        if (url.includes("youtube.com/watch")) {
          const urlParams = new URLSearchParams(new URL(url).search);
          videoId = urlParams.get("v") || "";
        } else if (url.includes("youtube.com/embed/")) {
          videoId = url.split("embed/")[1]?.split("?")[0] || "";
        } else if (url.includes("youtu.be/")) {
          videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
        }

        if (videoId) {
          const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

          if (apiKey) {
            try {
              const response = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${apiKey}`
              );

              if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                  const duration = data.items[0].contentDetails.duration;
                  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                  if (match) {
                    const hours = parseInt(match[1] || "0");
                    const minutes = parseInt(match[2] || "0");
                    const seconds = parseInt(match[3] || "0");

                    const totalMinutes = minutes + Math.ceil(seconds / 60);
                    const finalHours = hours + Math.floor(totalMinutes / 60);
                    const finalMinutes = totalMinutes % 60;

                    setLesson((prev) => ({
                      ...prev,
                      duration: { hours: finalHours, minutes: finalMinutes },
                    }));

                    toast({
                      title: "Duration detected",
                      description: `Video duration: ${finalHours}h ${finalMinutes}m`,
                    });
                    return;
                  }
                }
              }
            } catch (apiError) {
              console.error("YouTube API error:", apiError);
            }
          } else {
            console.warn("YouTube API key not configured. Set VITE_YOUTUBE_API_KEY in .env file");
          }
        }
      } else if (url.includes("vimeo.com")) {
        let videoId = "";

        if (url.includes("vimeo.com/video/")) {
          videoId = url.split("video/")[1]?.split("?")[0] || "";
        } else if (url.includes("player.vimeo.com/video/")) {
          videoId = url.split("video/")[1]?.split("?")[0] || "";
        } else {
          const matches = url.match(/vimeo\.com\/(\d+)/);
          videoId = matches ? matches[1] : "";
        }

        if (videoId) {
          const response = await fetch(
            `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.duration) {
              const hours = Math.floor(data.duration / 3600);
              const minutes = Math.floor((data.duration % 3600) / 60);

              setLesson((prev) => ({
                ...prev,
                duration: { hours, minutes },
              }));

              toast({
                title: "Duration detected",
                description: `Video duration: ${hours}h ${minutes}m`,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching video duration:", error);
    }
  };

  const handlePdfUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      if (file.type !== "application/pdf") {
        toast({ title: "Please upload a valid PDF file", variant: "destructive" });
        setUploading(false);
        return;
      }
      const fileUrl = await fileService.uploadAttachment(`/courses/${courseId}/lessons`, file);
      if (!fileUrl.success) {
        toast({ title: "Failed to upload PDF", variant: "destructive" });
        setUploading(false);
        return;
      }
      setLesson({ ...lesson, embedUrl: fileUrl.data });
    } catch (error) {
      toast({ title: "Failed to upload PDF", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const createZoomMeeting = async (): Promise<ZoomMeetingResponseData | null> => {
    // Validate zoom config
    if (!zoomConfig.topic.trim()) {
      toast({ title: "Meeting topic is required", variant: "destructive" });
      return null;
    }

    if (zoomConfig.topic.length > 200) {
      toast({ title: "Topic must be 200 characters or less", variant: "destructive" });
      return null;
    }

    if (!zoomConfig.host_email.trim()) {
      toast({ title: "Host email is required", variant: "destructive" });
      return null;
    }

    if (!validateEmail(zoomConfig.host_email)) {
      toast({ title: "Please enter a valid host email address", variant: "destructive" });
      return null;
    }

    if (!zoomConfig.start_time) {
      toast({ title: "Start time is required", variant: "destructive" });
      return null;
    }

    if (zoomConfig.duration <= 0) {
      toast({ title: "Duration must be greater than 0", variant: "destructive" });
      return null;
    }

    // Format start_time to ISO format
    const startTime = new Date(zoomConfig.start_time).toISOString();

    let idToken: string;
    try {
      idToken = await authService.getToken();
    } catch (error) {
      console.error("Error fetching ID token", error);
      toast({ title: "Authentication failed", variant: "destructive" });
      return null;
    }

    const zoomMeetingData = {
      topic: zoomConfig.topic.trim(),
      agenda: zoomConfig.agenda.trim(),
      start_time: startTime,
      duration: zoomConfig.duration,
      default_password: zoomConfig.default_password,
      request_permission_to_unmute_participants:
        zoomConfig.request_permission_to_unmute_participants,
      invitees: zoomConfig.invitees.map((email) => ({ email })),
      host_email: zoomConfig.host_email,
    };

    try {
      const response = await createZoomMeetingService.createZoomMeet(zoomMeetingData, idToken);

      if (response.success && response.data) {
        toast({
          title: "Zoom meeting created successfully",
          description: `Meeting ID: ${response.data.id}`,
        });
        return response.data;
      }

      toast({ title: "Failed to create Zoom meeting", variant: "destructive" });
      return null;
    } catch (error) {
      console.error("Error creating Zoom meeting:", error);
      toast({ title: "Failed to create Zoom meeting", variant: "destructive" });
      return null;
    }
  };

  const resetForm = () => {
    setLesson({
      title: "",
      type: LESSON_TYPE.SLIDE_DECK,
      description: "",
      embedUrl: "",
      duration: { hours: 0, minutes: 0 },
      karmaBoostExpiresAfter: { hours: 0, minutes: 0 },
      durationAddedtoLearningProgress: false,
    });
    setZoomConfig({
      topic: "",
      agenda: "",
      start_time: "",
      duration: 60,
      default_password: "",
      request_permission_to_unmute_participants: false,
      invitees: [],
      host_email: "",
    });
    setEmailInput("");
    setSelectedHostOption("");
    setIsCustomHost(false);
  };

  const handleSave = async () => {
    try {
      if (!lesson.title.trim()) {
        toast({ title: "Lesson title is required", variant: "destructive" });
        return;
      }

      setSaving(true);

      // Handle Zoom Meeting type
      if (lesson.type === LESSON_TYPE.ZOOM_MEETING) {
        // Create Zoom meeting first
        const zoomResponse = await createZoomMeeting();
        console.log("the zoom response in add lesson");
        if (!zoomResponse) {
          setSaving(false);
          return;
        }

        // Create lesson with Zoom data - pass values or null for optional fields
        const newLesson = await lessonService.createLessonWithZoom(
          {
            ...lesson,
            courseId,
            embedUrl: zoomResponse.join_url || "",
          },
          {
            meetingId: String(zoomResponse.id),
            hostUserId: zoomResponse.host_id || null,
            passcode: zoomResponse.password || null,
            encryptedPasscode: zoomResponse.encrypted_password || null,
            startTime: new Date(zoomResponse.start_time),
            duration: zoomResponse.duration,
          }
        );

        toast({
          title: "Lesson with Zoom meeting created successfully!",
          description: `Join URL: ${zoomResponse.join_url}`,
        });

        onLessonCreated?.(newLesson);
        resetForm();
        onClose();
        return;
      }

      // Regular lesson validation
      if (!lesson.description.trim() && !lesson.embedUrl.trim()) {
        toast({ title: "Fill description or embedUrl.", variant: "destructive" });
        setSaving(false);
        return;
      }
      if (lesson.duration.hours < 0 || lesson.duration.minutes < 0) {
        toast({ title: "Hours and minutes cannot be negative", variant: "destructive" });
        setSaving(false);
        return;
      }
      if (lesson.karmaBoostExpiresAfter.hours < 0 || lesson.karmaBoostExpiresAfter.minutes < 0) {
        toast({ title: "Hours and minutes cannot be negative", variant: "destructive" });
        setSaving(false);
        return;
      }
      if (lesson.type === LESSON_TYPE.PDF && !lesson.embedUrl.trim()) {
        toast({ title: "Please upload a PDF file.", variant: "destructive" });
        setSaving(false);
        return;
      }
      if (lesson.type === LESSON_TYPE.VIDEO_LECTURE && !lesson.embedUrl.trim()) {
        toast({ title: "Please enter a video embed URL.", variant: "destructive" });
        setSaving(false);
        return;
      }

      const newLesson = await lessonService.createLesson({ ...lesson, courseId });
      toast({ title: "Lesson created successfully!" });

      onLessonCreated?.(newLesson);
      resetForm();
      onClose();
    } catch (err) {
      logError("Error creating lesson:", err);
      toast({ title: "Failed to create lesson", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Get minimum datetime for the date picker (current time)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // Get the display name for the selected host
  const getSelectedHostDisplay = () => {
    if (isCustomHost) {
      return zoomConfig.host_email || "Enter custom email";
    }
    const host = PREDEFINED_HOSTS.find((h) => h.id === selectedHostOption);
    return host ? `${host.name} (${host.email})` : "Select a host";
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[90%] sm:max-w-5xl bg-card text-card-foreground overflow-y-scroll max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create Lesson</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Add a new lesson for your course.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="pt-2">
            {/* Two-column layout with weighted widths */}
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8">
              {/* Left Column - Title + Description */}
              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <Label>Lesson Title</Label>
                  <Input
                    placeholder="e.g. Introduction to Algebra"
                    value={lesson.title}
                    onChange={(e) => handleFieldChange("title", e.target.value)}
                    className="dark:bg-neutral-800 dark:border-neutral-700"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <Label>Description</Label>
                  <div
                    data-color-mode={colorMode}
                    className="border rounded-lg dark:border-neutral-700"
                  >
                    <MarkdownEditor
                      value={lesson.description}
                      onChange={(value) => handleFieldChange("description", value || "")}
                      height={250}
                      uploadPath="/courses/lessons/attachments"
                    />
                  </div>
                </div>

                {/* Zoom Meeting Configuration - Only show when Zoom Meeting is selected */}
                {lesson.type === LESSON_TYPE.ZOOM_MEETING && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30 dark:border-neutral-700">
                    <h3 className="font-semibold text-lg">Zoom Meeting Configuration</h3>

                    {/* Host Selection */}
                    <div className="space-y-2">
                      <Label>Meeting Host *</Label>
                      <Select value={selectedHostOption} onValueChange={handleHostSelection}>
                        <SelectTrigger className="dark:bg-neutral-800 dark:border-neutral-700">
                          <SelectValue placeholder="Select a host" />
                        </SelectTrigger>
                        <SelectContent>
                          {PREDEFINED_HOSTS.map((host) => (
                            <SelectItem key={host.id} value={host.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{host.name}</span>
                                <span className="text-xs text-muted-foreground">{host.email}</span>
                              </div>
                            </SelectItem>
                          ))}
                          <SelectItem value={CUSTOM_HOST_VALUE}>
                            <div className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              <span>Enter custom host email</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Custom Host Email Input */}
                      {isCustomHost && (
                        <div className="mt-2">
                          <Input
                            type="email"
                            placeholder="Enter host email address"
                            value={zoomConfig.host_email}
                            onChange={(e) => handleCustomHostChange(e.target.value)}
                            className="dark:bg-neutral-800 dark:border-neutral-700"
                          />
                        </div>
                      )}

                      {/* Show selected host info */}
                      {selectedHostOption && !isCustomHost && (
                        <div className="mt-2 p-2 bg-muted rounded-md">
                          <p className="text-sm">
                            <span className="font-medium">Selected Host: </span>
                            {getSelectedHostDisplay()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Topic */}
                    <div className="space-y-1">
                      <Label>Meeting Topic *</Label>
                      <Input
                        placeholder="Enter meeting topic (max 200 characters)"
                        value={zoomConfig.topic}
                        onChange={(e) => handleZoomConfigChange("topic", e.target.value)}
                        maxLength={200}
                        className="dark:bg-neutral-800 dark:border-neutral-700"
                      />
                      <p className="text-xs text-muted-foreground">
                        {zoomConfig.topic.length}/200 characters
                      </p>
                    </div>

                    {/* Agenda */}
                    <div className="space-y-1">
                      <Label>Agenda</Label>
                      <Input
                        placeholder="Enter meeting agenda"
                        value={zoomConfig.agenda}
                        onChange={(e) => handleZoomConfigChange("agenda", e.target.value)}
                        className="dark:bg-neutral-800 dark:border-neutral-700"
                      />
                    </div>

                    {/* Start Time and Duration */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Start Time *</Label>
                        <Input
                          type="datetime-local"
                          value={zoomConfig.start_time}
                          onChange={(e) => handleZoomConfigChange("start_time", e.target.value)}
                          min={getMinDateTime()}
                          className="dark:bg-neutral-800 dark:border-neutral-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Duration (minutes) *</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="60"
                          value={zoomConfig.duration}
                          onChange={(e) =>
                            handleZoomConfigChange("duration", parseInt(e.target.value) || 0)
                          }
                          className="dark:bg-neutral-800 dark:border-neutral-700"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <Label>Meeting Password</Label>
                      <Input
                        type="text"
                        placeholder="Enter meeting password (optional)"
                        value={zoomConfig.default_password}
                        onChange={(e) => handleZoomConfigChange("default_password", e.target.value)}
                        className="dark:bg-neutral-800 dark:border-neutral-700"
                      />
                    </div>

                    {/* Request Permission to Unmute */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Request Permission to Unmute Participants</Label>
                        <p className="text-xs text-muted-foreground">
                          Enable this to require permission before unmuting participants
                        </p>
                      </div>
                      <Switch
                        checked={zoomConfig.request_permission_to_unmute_participants}
                        onCheckedChange={(checked) =>
                          handleZoomConfigChange(
                            "request_permission_to_unmute_participants",
                            checked
                          )
                        }
                      />
                    </div>

                    {/* Invitees */}
                    <div className="space-y-2">
                      <Label>Invitees</Label>
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          placeholder="Enter email address"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          onKeyPress={handleEmailKeyPress}
                          className="dark:bg-neutral-800 dark:border-neutral-700"
                        />
                        <Button type="button" onClick={addEmail} size="icon" variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Press Enter or click + to add email
                      </p>

                      {/* Email List */}
                      {zoomConfig.invitees.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {zoomConfig.invitees.map((email) => (
                            <Badge
                              key={email}
                              variant="secondary"
                              className="flex items-center gap-1 py-1 px-2"
                            >
                              {email}
                              <button
                                type="button"
                                onClick={() => removeEmail(email)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {zoomConfig.invitees.length} invitee(s) added
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Type, Embed URL, Duration */}
              <div className="space-y-5">
                {/* Lesson Type */}
                <div className="space-y-1">
                  <Label>Lesson Type</Label>
                  <Select
                    value={lesson.type}
                    onValueChange={(val) => handleFieldChange("type", val)}
                  >
                    <SelectTrigger className="dark:bg-neutral-800 dark:border-neutral-700">
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

                {lesson.type === LESSON_TYPE.TEXT || lesson.type === LESSON_TYPE.ZOOM_MEETING ? (
                  <></>
                ) : lesson.type === LESSON_TYPE.PDF ? (
                  <div className="space-y-1">
                    <Label>PDF Resource *</Label>
                    <label
                      htmlFor="pdf-upload"
                      className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg cursor-pointer w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading
                        ? "Uploading..."
                        : lesson.embedUrl
                          ? `File Uploaded`
                          : "No PDF uploaded yet."}
                    </label>
                    <Input
                      id="pdf-upload"
                      type="file"
                      accept="application/pdf"
                      placeholder="Upload PDF resource"
                      onChange={(e) => handlePdfUpload(e.target.files![0])}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label>
                      {lesson.type === LESSON_TYPE.VIDEO_LECTURE
                        ? "Video Embed URL (YouTube/Vimeo) *"
                        : "Embed URL"}
                    </Label>
                    <Input
                      placeholder="Enter embed URL or resource link"
                      value={lesson.embedUrl}
                      onChange={(e) => handleFieldChange("embedUrl", e.target.value)}
                      className="dark:bg-neutral-800 dark:border-neutral-700"
                    />
                    {lesson.type === LESSON_TYPE.VIDEO_LECTURE && lesson.embedUrl && (
                      <div className="mt-3 border rounded-lg overflow-hidden dark:border-neutral-700">
                        <VideoPlayer url={lesson.embedUrl} />
                        {(lesson.duration.hours > 0 || lesson.duration.minutes > 0) && (
                          <div className="p-2 bg-muted text-sm">
                            <span className="font-medium">Duration:</span> {lesson.duration.hours}h{" "}
                            {lesson.duration.minutes}m
                          </div>
                        )}
                        {(lesson.karmaBoostExpiresAfter.hours > 0 ||
                          lesson.karmaBoostExpiresAfter.minutes > 0) && (
                          <div className="p-2 bg-muted text-sm">
                            <span className="font-medium">Karma Boost Expires After:</span>{" "}
                            {lesson.karmaBoostExpiresAfter.hours}h{" "}
                            {lesson.karmaBoostExpiresAfter.minutes}m
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Only show duration fields for non-Zoom meetings */}
                {lesson.type !== LESSON_TYPE.ZOOM_MEETING && (
                  <div className="space-y-1">
                    <Label>Duration (Hours and Minutes)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Hours"
                        value={lesson.duration.hours}
                        onChange={(e) =>
                          handleFieldChange("duration-hours", parseInt(e.target.value) || 0)
                        }
                        className="dark:bg-neutral-800 dark:border-neutral-700"
                      />
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Minutes"
                        value={lesson.duration.minutes}
                        onChange={(e) =>
                          handleFieldChange("duration-minutes", parseInt(e.target.value) || 0)
                        }
                        className="dark:bg-neutral-800 dark:border-neutral-700"
                      />
                    </div>
                    <Label>Karma Boost Expires After (Hours and Minutes)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={lesson.karmaBoostExpiresAfter.hours}
                        onChange={(e) =>
                          handleFieldChange("karmaBoost-hours", parseInt(e.target.value) || 0)
                        }
                      />

                      <Input
                        type="number"
                        value={lesson.karmaBoostExpiresAfter.minutes}
                        onChange={(e) =>
                          handleFieldChange("karmaBoost-minutes", parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 mt-8 border-t pt-4 dark:border-neutral-700">
              <Button variant="outline" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving
                  ? "Saving..."
                  : lesson.type === LESSON_TYPE.ZOOM_MEETING
                    ? "Create Zoom Meeting & Save"
                    : "Save Lesson"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
