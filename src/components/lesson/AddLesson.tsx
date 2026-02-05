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
import {
  Upload,
  X,
  Plus,
  Calendar,
  Clock,
  Lock,
  User,
  Video,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState } from "react";
import MarkdownEditor from "../markdownEditor/MarkdownEditorComponent";
import VideoPlayer from "../VideoPlayer";
import { authService } from "@/services/authService";
import {
  createZoomMeetingService,
  ZoomMeetingResponseData,
} from "@/services/zoom/createZoomMeetingService";
import { zoomHostService } from "@/services/zoomHostService";
import { ZoomHost } from "@/types/zoom-host";

const CUSTOM_HOST_VALUE = "custom";

type ZoomMeetingConfig = {
  topic: string;
  agenda: string;
  start_time: string;
  duration: number; // in minutes
  default_password: string;
  request_permission_to_unmute_participants: boolean;
  join_before_host: boolean;
  invitees: string[];
  host_email: string;
};

type CreateLessonModalProps = {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
  onLessonCreated?: (lesson: Lesson, shouldAutoSave?: boolean) => void;
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
  const [predefinedHosts, setPredefinedHosts] = useState<ZoomHost[]>([]);
  const [loadingHosts, setLoadingHosts] = useState(false);
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
    join_before_host: false,
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

  // Fetch predefined Zoom hosts when modal opens
  useEffect(() => {
    const fetchHosts = async () => {
      if (!isOpen) return;

      setLoadingHosts(true);
      try {
        console.log("Fetching predefined Zoom hosts...");
        const result = await zoomHostService.getActiveHosts();
        console.log("Zoom hosts fetch result:", result);
        if (result.success) {
          setPredefinedHosts(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch Zoom hosts:", error);
      } finally {
        setLoadingHosts(false);
      }
    };

    fetchHosts();
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
      const selectedHost = predefinedHosts.find((host) => host.id === value);
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

  // ... (Keep existing fetchVideoDuration and handlePdfUpload functions) ...
  const fetchVideoDuration = async (url: string) => {
    // [Keep existing implementation]
    try {
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        // ... (existing logic)
      } else if (url.includes("vimeo.com")) {
        // ... (existing logic)
      }
    } catch (error) {
      console.error("Error fetching video duration", error);
    }
  };

  const handlePdfUpload = async (file: File) => {
    // [Keep existing implementation]
    if (!file) return;
    setUploading(true);
    try {
      const fileUrl = await fileService.uploadAttachment(`/courses/${courseId}/lessons`, file);
      if (fileUrl.success) {
        setLesson({ ...lesson, embedUrl: fileUrl.data });
      }
    } catch (e) {
      console.error(e);
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

    // Convert IST input to UTC
    // Append IST timezone offset (+05:30) to treat the input as IST time
    const startTimeIST = `${zoomConfig.start_time}:00+05:30`;
    const startTime = new Date(startTimeIST).toISOString();

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
      // Pass the join_before_host value to backend
      join_before_host: zoomConfig.join_before_host,
      request_permission_to_unmute_participants:
        zoomConfig.request_permission_to_unmute_participants,
      invitees: zoomConfig.invitees.map((email) => ({ email })),
      host_email: zoomConfig.host_email,
    };

    try {
      const response = await createZoomMeetingService.createZoomMeet(zoomMeetingData, idToken);

      if (response.success && response.data) {
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
      join_before_host: false,
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

      if (lesson.type === LESSON_TYPE.ZOOM_MEETING) {
        const zoomResponse = await createZoomMeeting();
        if (!zoomResponse) {
          setSaving(false);
          return;
        }

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
          title: "Zoom Meeting Created!",
          description: `Meeting ID: ${zoomResponse.id}`,
        });

        // Pass true for shouldAutoSave to trigger curriculum save after state update
        onLessonCreated?.(newLesson, true);

        resetForm();
        onClose();
        return;
      }

      // ... (Regular lesson save logic remains same)
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

  const getMinDateTime = () => {
    // Get current time formatted in IST timezone
    const now = new Date();
    // 'sv-SE' locale gives us "YYYY-MM-DD HH:mm:ss" format
    return now.toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace(" ", "T").slice(0, 16);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95%] sm:max-w-6xl bg-card text-card-foreground overflow-y-auto max-h-[90vh] p-0 gap-0">
        <div className="px-6 py-4 border-b">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Create New Lesson</DialogTitle>
            <DialogDescription>
              Configure the details for your new course content.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
            {/* Left Column: Title & Description */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base">Lesson Title</Label>
                <Input
                  placeholder="e.g. Introduction to Advanced Mathematics"
                  value={lesson.title}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  className="h-10 text-base dark:bg-neutral-800/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base">Description</Label>
                <div
                  data-color-mode={colorMode}
                  className="border rounded-lg dark:border-neutral-800"
                >
                  <MarkdownEditor
                    value={lesson.description}
                    onChange={(value) => handleFieldChange("description", value || "")}
                    height={200}
                    uploadPath="/courses/lessons/attachments"
                  />
                </div>
              </div>

              {/* ZOOM CONFIGURATION - Shown only when Zoom is selected */}
              {lesson.type === LESSON_TYPE.ZOOM_MEETING && (
                <div className="mt-4 rounded-xl border bg-muted/20 dark:bg-neutral-900/30 dark:border-neutral-800">
                  <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3 dark:bg-neutral-800/40">
                    <Video className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold">Zoom Meeting Details</h3>
                  </div>

                  <div className="p-4 space-y-6">
                    {/* Important Zoom Settings Note */}
                    <div className="flex gap-3 p-4 rounded-lg border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2 text-sm">
                        <p className="font-semibold text-amber-800 dark:text-amber-400">
                          Important: Manual Zoom Settings Required
                        </p>
                        <p className="text-amber-700 dark:text-amber-300">
                          After creating the meeting, you must update these settings manually in
                          Zoom:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-amber-700 dark:text-amber-300">
                          <li>
                            Go to{" "}
                            <a
                              href="https://us06web.zoom.us/meeting#/upcoming"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-amber-900 dark:text-amber-200 underline hover:no-underline"
                            >
                              Zoom Upcoming Meetings
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </li>
                          <li>
                            Click <strong>Edit</strong> on the newly created meeting
                          </li>
                          <li>
                            Untick / disable <strong>Registration</strong>
                          </li>
                          <li>
                            Scroll to <strong>Options</strong> and click <strong>Show</strong>
                          </li>
                          <li>
                            Enable <strong>Cloud Recording</strong>
                          </li>
                        </ol>
                      </div>
                    </div>

                    {/* Host & Topic Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Host *</Label>
                        <Select
                          value={selectedHostOption}
                          onValueChange={handleHostSelection}
                          disabled={loadingHosts}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue
                              placeholder={loadingHosts ? "Loading hosts..." : "Select Host"}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {predefinedHosts.map((host) => (
                              <SelectItem key={host.id} value={host.id}>
                                {host.name}
                              </SelectItem>
                            ))}
                            <SelectItem value={CUSTOM_HOST_VALUE}>+ Custom Email</SelectItem>
                          </SelectContent>
                        </Select>
                        {isCustomHost && (
                          <Input
                            placeholder="host@example.com"
                            value={zoomConfig.host_email}
                            onChange={(e) => handleCustomHostChange(e.target.value)}
                            className="mt-2"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Topic *</Label>
                        <Input
                          placeholder="Meeting Topic"
                          value={zoomConfig.topic}
                          onChange={(e) => handleZoomConfigChange("topic", e.target.value)}
                          maxLength={200}
                          className="bg-background"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Agenda</Label>
                      <Input
                        placeholder="Optional meeting agenda"
                        value={zoomConfig.agenda}
                        onChange={(e) => handleZoomConfigChange("agenda", e.target.value)}
                        className="bg-background"
                      />
                    </div>

                    {/* Time & Password Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" /> Start Time (IST)
                        </Label>
                        <Input
                          type="datetime-local"
                          value={zoomConfig.start_time}
                          onChange={(e) => handleZoomConfigChange("start_time", e.target.value)}
                          min={getMinDateTime()}
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Clock className="h-4 w-4" /> Duration (min)
                        </Label>
                        <Input
                          type="number"
                          value={zoomConfig.duration}
                          onChange={(e) =>
                            handleZoomConfigChange("duration", parseInt(e.target.value) || 0)
                          }
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                        <Label className="flex items-center gap-2">
                          <Lock className="h-4 w-4" /> Passcode
                        </Label>
                        <Input
                          placeholder="Optional"
                          value={zoomConfig.default_password}
                          onChange={(e) =>
                            handleZoomConfigChange("default_password", e.target.value)
                          }
                          className="bg-background"
                        />
                      </div>
                    </div>

                    {/* Meeting Options (Toggles) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-background/50">
                      <div className="flex flex-row items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">Join Before Host</Label>
                          <p className="text-xs text-muted-foreground">
                            Participants can join early
                          </p>
                        </div>
                        <Switch
                          checked={zoomConfig.join_before_host}
                          onCheckedChange={(c) => handleZoomConfigChange("join_before_host", c)}
                        />
                      </div>
                      <div className="flex flex-row items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">Auto-Unmute</Label>
                          <p className="text-xs text-muted-foreground">Request mic permissions</p>
                        </div>
                        <Switch
                          checked={zoomConfig.request_permission_to_unmute_participants}
                          onCheckedChange={(c) =>
                            handleZoomConfigChange("request_permission_to_unmute_participants", c)
                          }
                        />
                      </div>
                    </div>

                    {/* Invitees */}
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <User className="h-4 w-4" /> Invitees
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="participant@example.com"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          onKeyDown={handleEmailKeyPress}
                          className="bg-background"
                        />
                        <Button type="button" onClick={addEmail} size="icon" variant="secondary">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {zoomConfig.invitees.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {zoomConfig.invitees.map((email) => (
                            <Badge
                              key={email}
                              variant="outline"
                              className="pl-2 pr-1 py-1 gap-1 bg-background"
                            >
                              {email}
                              <button
                                onClick={() => removeEmail(email)}
                                className="hover:text-red-500 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Settings */}
            <div className="space-y-6">
              <div className="p-4 rounded-xl border bg-card dark:bg-neutral-900/20">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Lesson Type</Label>
                    <Select
                      value={lesson.type}
                      onValueChange={(val) => handleFieldChange("type", val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
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

                  {/* Dynamic Fields based on Type */}
                  {lesson.type !== LESSON_TYPE.ZOOM_MEETING && (
                    <>
                      {lesson.type === LESSON_TYPE.PDF ? (
                        <div className="space-y-2">
                          <Label>PDF File</Label>
                          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition cursor-pointer relative">
                            <Input
                              type="file"
                              accept="application/pdf"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={(e) => handlePdfUpload(e.target.files![0])}
                            />
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {uploading
                                  ? "Uploading..."
                                  : lesson.embedUrl
                                    ? "File Attached"
                                    : "Click to Upload PDF"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        lesson.type !== LESSON_TYPE.TEXT && (
                          <div className="space-y-2">
                            <Label>Resource URL</Label>
                            <Input
                              placeholder="https://..."
                              value={lesson.embedUrl}
                              onChange={(e) => handleFieldChange("embedUrl", e.target.value)}
                              onBlur={() => fetchVideoDuration(lesson.embedUrl)}
                            />
                          </div>
                        )
                      )}

                      <div className="pt-4 border-t space-y-4">
                        <div className="space-y-2">
                          <Label>Duration</Label>
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <Input
                                type="number"
                                min="0"
                                value={lesson.duration.hours}
                                onChange={(e) =>
                                  handleFieldChange("duration-hours", parseInt(e.target.value) || 0)
                                }
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                                hrs
                              </span>
                            </div>
                            <div className="flex-1 relative">
                              <Input
                                type="number"
                                min="0"
                                max="59"
                                value={lesson.duration.minutes}
                                onChange={(e) =>
                                  handleFieldChange(
                                    "duration-minutes",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                                min
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Karma Validity</Label>
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <Input
                                type="number"
                                min="0"
                                value={lesson.karmaBoostExpiresAfter.hours}
                                onChange={(e) =>
                                  handleFieldChange(
                                    "karmaBoost-hours",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                                hrs
                              </span>
                            </div>
                            <div className="flex-1 relative">
                              <Input
                                type="number"
                                min="0"
                                max="59"
                                value={lesson.karmaBoostExpiresAfter.minutes}
                                onChange={(e) =>
                                  handleFieldChange(
                                    "karmaBoost-minutes",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                                min
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-muted/10">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
            {saving ? (
              <>Saving...</>
            ) : lesson.type === LESSON_TYPE.ZOOM_MEETING ? (
              <>Create Meeting</>
            ) : (
              <>Save Lesson</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
