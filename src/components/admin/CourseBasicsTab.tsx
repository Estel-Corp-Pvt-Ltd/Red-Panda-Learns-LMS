import {
  ArrowLeft,
  Check,
  ChevronDown,
  Save,
  X,
  Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ATTRIBUTE_TYPE, COURSE_STATUS } from "@/constants";
import { attributeService } from "@/services/attributeService";
import { Course } from "@/types/course";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { CourseStatus } from "@/types/general";
import { courseService } from "@/services/courseService";
const toNumberOrNull = (val: string) => (val === "" ? null : Number(val));
const isNum = (v: number | null): v is number => v !== null && Number.isFinite(v);
/** Parent sends all data + callbacks here */
export type DurationForm = { hours: number | null; minutes: number | null };

export type CourseBasicsTabProps = {
  course: Course | null;
  title: string;
  setTitle: (v: string) => void;
  courseId: string;
  setCourseId: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
  instructorId: string;
  setInstructorId: (id: string) => void;
  instructorName: string;
  setInstructorName: (name: string) => void;
  instructors: { id: string; name: string }[];
  regularPrice: number | null;
  setRegularPrice: (n: number | null) => void;
  salePrice: number | null;
  setSalePrice: (n: number | null) => void;
  duration: DurationForm;
  setDuration: (f: DurationForm) => void;
  status: CourseStatus;
  setStatus: (s: CourseStatus) => void;
  selectedCategories: string[];
  setSelectedCategories: (cats: string[]) => void;
  allCategories: string[];
  setAllCategories: (cats: string[]) => void;
  selectedTargetAudiences: string[];
  setSelectedTargetAudiences: (a: string[]) => void;
  allTargetAudiences: string[];
  setAllTargetAudiences: (a: string[]) => void;
  tags: string[];
  setTags: (t: string[]) => void;
  tagInput: string;
  setTagInput: (v: string) => void;
  thumbnailUrl: string;
  preview: string | null;
  uploadingThumbnail: boolean;
  progress: number;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCopyLink: () => void;
  onSave: () => void;
  canSaveBasics: boolean;
  copied: boolean;
  setCopied: (v: boolean) => void;
};

const CourseBasicsTab = ({
  course,
  title,
  setTitle,
  courseId,
  setCourseId,
  copied,
  setCopied,
  description,
  setDescription,
  slug,
  setSlug,
  instructorId,
  setInstructorId,
  instructorName,
  setInstructorName,
  instructors,
  regularPrice,
  setRegularPrice,
  salePrice,
  setSalePrice,
  duration,
  setDuration,
  status,
  setStatus,
  selectedCategories,
  setSelectedCategories,
  allCategories,
  setAllCategories,
  selectedTargetAudiences,
  setSelectedTargetAudiences,
  allTargetAudiences,
  setAllTargetAudiences,
  tags,
  setTags,
  tagInput,
  setTagInput,
  thumbnailUrl,
  preview,
  uploadingThumbnail,
  progress,
  handleFileChange,
  onSave,
  canSaveBasics,
  handleCopyLink,
}: CourseBasicsTabProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [slugTaken, setSlugTaken] = useState(true);
  const [checkingSlug, setCheckingSlug] = useState(true);

  {/* 🧠 Debounced check logic */ }
  useEffect(() => {
    if (!slug?.trim()) {
      setSlugTaken(false);
      return;
    }

    const handler = setTimeout(async () => {
      setCheckingSlug(true);
      const taken = await courseService.isCourseUrlTaken(slug, courseId);
      setSlugTaken(taken);
      setCheckingSlug(false);
    }, 600); // debounce delay (ms)

    return () => clearTimeout(handler);
  }, [slug, courseId]);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* LEFT SIDE ------------------------------------------------------ */}
      <div className="lg:col-span-2 space-y-6">
        {/* Title */}
        <Card className="rounded-xl border p-4">
          <CardHeader className="pb-2">
            <CardTitle>Course Title</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mastering React 18"
            />
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="rounded-xl border p-4">
          <CardHeader className="pb-2">
            <CardTitle>Description</CardTitle>
            <p className="text-sm text-muted-foreground">
              A short marketing paragraph – supports markdown.
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-32"
              placeholder="What will students learn?"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Course Slug</CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            <label className="text-sm font-medium">Custom Slug</label>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={slug ?? ""}
                onChange={(e) => {
                  const newSlug = e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, "-");
                  setSlug(newSlug);
                }}
                placeholder="react-for-beginners"
              />

              {/* Generate URL Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!title?.trim()) return;

                  const generatedUrl = title
                    .toLowerCase()
                    .trim()
                    .replace(/[^\w\s-]/g, "") // remove special chars
                    .replace(/\s+/g, "-"); // replace spaces with -

                  setSlug(generatedUrl);
                }}
              >
                Generate Slug
              </Button>
            </div>

            {/* Slug availability feedback */}
            {checkingSlug && (
              <p className="text-xs text-muted-foreground">
                Checking availability...
              </p>
            )}

            {!checkingSlug && slugTaken && (
              <p className="text-xs text-red-500">
                This slug is already in use.
              </p>
            )}

            {!checkingSlug && !slugTaken && slug && (
              <p className="text-xs text-green-500">This slug is available.</p>
            )}

            <p className="text-xs text-muted-foreground">
              Leave empty to use default: <code>course/{courseId}</code>
            </p>
          </CardContent>
        </Card>

        {/* Thumbnail */}
        <Card>
          <CardHeader>
            <CardTitle>Thumbnail</CardTitle>
          </CardHeader>
          <CardContent>
            {(preview || thumbnailUrl) && (
              <div className="mb-5">
                <img
                  src={preview || thumbnailUrl}
                  alt="Preview"
                  className="border rounded"
                />
              </div>
            )}
            {uploadingThumbnail && (
              <div className="mb-8">
                <div className="w-full h-2 rounded-sm bg-white border overflow-hidden">
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      backgroundColor: "#ff00ff",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
                <small>{progress}%</small>
              </div>
            )}
            <div className="flex justify-between items-center">
              <input type="file" accept="image/*" onChange={handleFileChange} />
            </div>
          </CardContent>
        </Card>

        {/* Instructor + Tags + Categories + Audience */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Instructor */}
          <Card className="rounded-xl border p-4">
            <CardHeader className="pb-2">
              <CardTitle>Instructor</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={instructorName}
                onValueChange={(val) => {
                  const a = instructors.find((x) => x.name === val);
                  setInstructorName(val);
                  setInstructorId(a?.id || "");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select instructor" />
                </SelectTrigger>
                <SelectContent>
                  {instructors.map((a) => (
                    <SelectItem key={a.id} value={a.name}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card className="rounded-xl border p-4">
            <CardHeader className="pb-2">
              <CardTitle>Tags</CardTitle>
              <p className="text-xs text-muted-foreground">
                Used for search. Press Enter to add.
              </p>
            </CardHeader>
            <CardContent>
              <Input
                value={tagInput}
                placeholder="add tag and press ↵"
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && tagInput.trim()) {
                    e.preventDefault();
                    if (!tags.includes(tagInput.trim()))
                      setTags([...tags, tagInput.trim()]);
                    setTagInput("");
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full flex items-center gap-1"
                  >
                    {t}
                    <button
                      className="hover:text-red-500"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card className="rounded-xl border p-4">
            <CardHeader className="pb-2">
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map((cat) => (
                    <Badge key={cat} variant="secondary">
                      {cat}
                      <button
                        onClick={() =>
                          setSelectedCategories(
                            selectedCategories.filter((c) => c !== cat)
                          )
                        }
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedCategories.length > 0
                      ? `${selectedCategories.length} selected`
                      : "Select categories"}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search categories..." />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        {allCategories.map((cat) => (
                          <CommandItem
                            key={cat}
                            onSelect={() =>
                              setSelectedCategories(
                                selectedCategories.includes(cat)
                                  ? selectedCategories.filter((c) => c !== cat)
                                  : [...selectedCategories, cat]
                              )
                            }
                            className="cursor-pointer"
                          >
                            <Checkbox
                              checked={selectedCategories.includes(cat)}
                              className="mr-2"
                            />
                            {cat}
                            {selectedCategories.includes(cat) && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                    <div className="p-2 border-t">
                      <Input
                        placeholder="Add new category"
                        onKeyDown={async (e) => {
                          e.stopPropagation();
                          if (
                            e.key === "Enter" &&
                            e.currentTarget.value.trim()
                          ) {
                            const newCat = e.currentTarget.value.trim();
                            if (!allCategories.includes(newCat)) {
                              await attributeService.addAttribute(
                                ATTRIBUTE_TYPE.CATEGORY,
                                newCat
                              );
                              setAllCategories([...allCategories, newCat]);
                              setSelectedCategories([
                                ...selectedCategories,
                                newCat,
                              ]);
                            }
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>
        </div>

        {/* Target Audience */}
        <Card className="rounded-xl border p-4">
          <CardHeader className="pb-2">
            <CardTitle>Target Audience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTargetAudiences.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTargetAudiences.map((aud) => (
                  <Badge key={aud} variant="secondary">
                    {aud}
                    <button
                      onClick={() =>
                        setSelectedTargetAudiences(
                          selectedTargetAudiences.filter((a) => a !== aud)
                        )
                      }
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedTargetAudiences.length > 0
                    ? `${selectedTargetAudiences.length} selected`
                    : "Select target audience"}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Search audiences..." />
                  <CommandList>
                    <CommandEmpty>No audience found.</CommandEmpty>
                    <CommandGroup>
                      {allTargetAudiences.map((aud) => (
                        <CommandItem
                          key={aud}
                          onSelect={() =>
                            setSelectedTargetAudiences(
                              selectedTargetAudiences.includes(aud)
                                ? selectedTargetAudiences.filter(
                                  (a) => a !== aud
                                )
                                : [...selectedTargetAudiences, aud]
                            )
                          }
                          className="cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedTargetAudiences.includes(aud)}
                            className="mr-2"
                          />
                          {aud}
                          {selectedTargetAudiences.includes(aud) && (
                            <Check className="ml-auto h-4 w-4" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                  <div className="p-2 border-t">
                    <Input
                      placeholder="Add new audience"
                      onKeyDown={async (e) => {
                        e.stopPropagation();
                        if (e.key === "Enter" && e.currentTarget.value.trim()) {
                          const newAud = e.currentTarget.value.trim();
                          if (!allTargetAudiences.includes(newAud)) {
                            await attributeService.addAttribute(
                              ATTRIBUTE_TYPE.TARGET_AUDIENCE,
                              newAud
                            );
                            setAllTargetAudiences([
                              ...allTargetAudiences,
                              newAud,
                            ]);
                            setSelectedTargetAudiences([
                              ...selectedTargetAudiences,
                              newAud,
                            ]);
                          }
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                  </div>
                </Command>
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT SIDE ------------------------------------------------------ */}
      <div className="space-y-6">
        {/* Actions + Pricing */}
        <Card className="rounded-xl border p-4">
          <div className="flex flex-wrap gap-4">
            <Button onClick={onSave} disabled={!canSaveBasics}>
              <Save className="mr-2 h-4 w-4" />
              Save Basics
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin")}>
              <ArrowLeft className="mr-2 h-4 w-3" />
              Back to Courses
            </Button>
            <Button variant="outline" onClick={handleCopyLink}>
              <Copy className="mr-2 h-4 w-3" />
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>

          <CardHeader className="pb-2">
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Regular price</label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">₹</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={regularPrice ?? ""}
                  onChange={(e) =>
                    setRegularPrice(toNumberOrNull(e.target.value))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Sale price</label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">₹</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={salePrice ?? ""}
                  onChange={(e) => setSalePrice(toNumberOrNull(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Duration */}
        <Card className="rounded-xl border p-4">
          <CardHeader className="pb-2">
            <CardTitle>Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <Label>Hours</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={duration.hours ?? ""}
              onChange={(e) =>
                setDuration({
                  ...duration,
                  hours: toNumberOrNull(e.target.value),
                })
              }
            />
            <Label>Minutes</Label>
            <Input
              type="number"
              min={0}
              max={59}
              step={1}
              value={duration.minutes ?? ""}
              onChange={(e) =>
                setDuration({
                  ...duration,
                  minutes: toNumberOrNull(e.target.value),
                })
              }
            />
          </CardContent>
        </Card>

        {/* Status */}
        <Card className="rounded-xl border p-4">
          <CardHeader className="pb-2">
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={status}
              onValueChange={(val) => setStatus(val as CourseStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(COURSE_STATUS).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CourseBasicsTab;
