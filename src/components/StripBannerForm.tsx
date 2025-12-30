import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { stripBannerService } from "@/services/stripBannerService";
import { StripBanner } from "@/types/strip-banner";
import { useToast } from "@/hooks/use-toast";

interface StripBannerFormProps {
  banner?: StripBanner;
  onSuccess: () => void;
  onCancel: () => void;
}

const defaultGradients = [
  { start: "#4F46E5", end: "#7C3AED", name: "Purple" },
  { start: "#059669", end: "#10B981", name: "Green" },
  { start: "#DC2626", end: "#EA580C", name: "Red/Orange" },
  { start: "#2563EB", end: "#1D4ED8", name: "Blue" },
  { start: "#7C3AED", end: "#EC4899", name: "Purple/Pink" },
  { start: "#F59E0B", end: "#D97706", name: "Amber" },
  { start: "#8B5CF6", end: "#A78BFA", name: "Violet" },
  { start: "#0EA5E9", end: "#38BDF8", name: "Sky" },
];

const StripBannerForm: React.FC<StripBannerFormProps> = ({ banner, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    title: banner?.title || "",
    subtitle: banner?.subtitle || "",
    ctaText: banner?.ctaText || "",
    ctaLink: banner?.ctaLink || "",
    ctaActive: banner?.ctaActive || false,
    gradientStart: banner?.gradientStart || "#4F46E5",
    gradientEnd: banner?.gradientEnd || "#7C3AED",
    gradientAngle: banner?.gradientAngle || 90,
    textColor: banner?.textColor || "#FFFFFF",
    delaySeconds: banner?.delaySeconds || 0,
    slideDuration: banner?.slideDuration || 5000,
    dismissalHours: banner?.dismissalHours || 12,
    active: banner?.active || false,
    showOnDashboard: banner?.showOnDashboard ?? true,
    showOnLanding: banner?.showOnLanding ?? true,
    showOnCoursePages: banner?.showOnCoursePages ?? true,
    displayOrder: banner?.displayOrder || 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (banner) {
        await stripBannerService.updateStripBanner(banner.id, formData);
        toast({
          title: "Success",
          description: "Banner updated successfully",
        });
      } else {
        await stripBannerService.createStripBanner(formData);
        toast({
          title: "Success",
          description: "Banner created successfully",
        });
      }
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save banner",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const applyGradient = (gradient: (typeof defaultGradients)[0]) => {
    setFormData((prev) => ({
      ...prev,
      gradientStart: gradient.start,
      gradientEnd: gradient.end,
    }));
  };

  const previewStyle = {
    background: `linear-gradient(${formData.gradientAngle}deg, ${formData.gradientStart}, ${formData.gradientEnd})`,
    color: formData.textColor,
  };

  return (
    <div
      className="flex flex-col bg-background rounded-lg shadow-lg overflow-hidden"
      style={{
        width: "900px",
        height: "700px",
        maxWidth: "95vw",
        maxHeight: "90vh",
      }}
    >
      {/* Fixed Header */}
      <div className="flex-shrink-0 flex justify-between items-center p-6 border-b">
        <h2 className="text-2xl font-bold">{banner ? "Edit Banner" : "Create New Banner"}</h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
            {/* Left Column - Form */}
            <div className="space-y-6">
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="design">Design</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                {/* Fixed height tab content container */}
                <div className="min-h-[380px]">
                  <TabsContent value="content" className="space-y-4 pt-4 mt-0">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleChange("title", e.target.value)}
                        placeholder="Banner title"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subtitle">Subtitle (Optional)</Label>
                      <Textarea
                        id="subtitle"
                        value={formData.subtitle}
                        onChange={(e) => handleChange("subtitle", e.target.value)}
                        placeholder="Optional subtitle"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-4 pt-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="ctaActive"
                          checked={formData.ctaActive}
                          onCheckedChange={(checked) => handleChange("ctaActive", checked)}
                        />
                        <Label htmlFor="ctaActive">Enable Call-to-Action Button</Label>
                      </div>

                      <div
                        className={`grid grid-cols-2 gap-4 transition-opacity ${
                          formData.ctaActive ? "opacity-100" : "opacity-50 pointer-events-none"
                        }`}
                      >
                        <div className="space-y-2">
                          <Label htmlFor="ctaText">Button Text</Label>
                          <Input
                            id="ctaText"
                            value={formData.ctaText}
                            onChange={(e) => handleChange("ctaText", e.target.value)}
                            placeholder="Learn More"
                            disabled={!formData.ctaActive}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ctaLink">Button Link</Label>
                          <Input
                            id="ctaLink"
                            value={formData.ctaLink}
                            onChange={(e) => handleChange("ctaLink", e.target.value)}
                            placeholder="https://example.com"
                            type="url"
                            disabled={!formData.ctaActive}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="design" className="space-y-4 pt-4 mt-0">
                    <div className="space-y-2">
                      <Label>Gradient Presets</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {defaultGradients.map((gradient) => (
                          <button
                            key={gradient.name}
                            type="button"
                            className="h-10 rounded-md border hover:border-primary transition-colors"
                            style={{
                              background: `linear-gradient(90deg, ${gradient.start}, ${gradient.end})`,
                            }}
                            onClick={() => applyGradient(gradient)}
                            title={gradient.name}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gradientStart">Start Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="gradientStart"
                            value={formData.gradientStart}
                            onChange={(e) => handleChange("gradientStart", e.target.value)}
                            className="font-mono"
                          />
                          <input
                            type="color"
                            value={formData.gradientStart}
                            onChange={(e) => handleChange("gradientStart", e.target.value)}
                            className="w-10 h-10 cursor-pointer rounded border flex-shrink-0"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gradientEnd">End Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="gradientEnd"
                            value={formData.gradientEnd}
                            onChange={(e) => handleChange("gradientEnd", e.target.value)}
                            className="font-mono"
                          />
                          <input
                            type="color"
                            value={formData.gradientEnd}
                            onChange={(e) => handleChange("gradientEnd", e.target.value)}
                            className="w-10 h-10 cursor-pointer rounded border flex-shrink-0"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gradientAngle">
                        Gradient Angle: {formData.gradientAngle}°
                      </Label>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={formData.gradientAngle}
                        onChange={(e) => handleChange("gradientAngle", parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="textColor">Text Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="textColor"
                          value={formData.textColor}
                          onChange={(e) => handleChange("textColor", e.target.value)}
                          className="font-mono"
                        />
                        <input
                          type="color"
                          value={formData.textColor}
                          onChange={(e) => handleChange("textColor", e.target.value)}
                          className="w-10 h-10 cursor-pointer rounded border flex-shrink-0"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="settings" className="space-y-4 pt-4 mt-0">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="delaySeconds">Delay (seconds)</Label>
                        <Input
                          id="delaySeconds"
                          type="number"
                          min="0"
                          max="60"
                          value={formData.delaySeconds}
                          onChange={(e) =>
                            handleChange("delaySeconds", parseInt(e.target.value) || 0)
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Time before showing after page load
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="slideDuration">Slide Duration (ms)</Label>
                        <Input
                          id="slideDuration"
                          type="number"
                          min="1000"
                          max="30000"
                          step="1000"
                          value={formData.slideDuration}
                          onChange={(e) =>
                            handleChange("slideDuration", parseInt(e.target.value) || 5000)
                          }
                        />
                        <p className="text-xs text-muted-foreground">How long each banner shows</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dismissalHours">Dismissal Duration (hours)</Label>
                      <Input
                        id="dismissalHours"
                        type="number"
                        min="1"
                        max="720"
                        value={formData.dismissalHours}
                        onChange={(e) =>
                          handleChange("dismissalHours", parseInt(e.target.value) || 12)
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        How long to hide after user closes (stored in localStorage)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="displayOrder">Display Order</Label>
                      <Input
                        id="displayOrder"
                        type="number"
                        min="0"
                        value={formData.displayOrder}
                        onChange={(e) =>
                          handleChange("displayOrder", parseInt(e.target.value) || 0)
                        }
                      />
                      <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
                    </div>

                    <div className="space-y-4 pt-4">
                      <h3 className="font-medium">Display On Pages</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showOnDashboard">Dashboard</Label>
                          <Switch
                            id="showOnDashboard"
                            checked={formData.showOnDashboard}
                            onCheckedChange={(checked) => handleChange("showOnDashboard", checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showOnLanding">Landing Page</Label>
                          <Switch
                            id="showOnLanding"
                            checked={formData.showOnLanding}
                            onCheckedChange={(checked) => handleChange("showOnLanding", checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showOnCoursePages">Course Pages</Label>
                          <Switch
                            id="showOnCoursePages"
                            checked={formData.showOnCoursePages}
                            onCheckedChange={(checked) =>
                              handleChange("showOnCoursePages", checked)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Right Column - Preview */}
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-4">Live Preview</h3>
                  <div className="rounded-lg p-4 transition-all duration-300" style={previewStyle}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">
                          {formData.title || "Banner Title"}
                        </h4>
                        {formData.subtitle && (
                          <p className="text-sm opacity-90 mt-1 truncate">{formData.subtitle}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                        {formData.ctaActive && (
                          <button
                            type="button"
                            className="px-3 py-1.5 text-sm font-medium rounded-md border border-current hover:opacity-90 transition-opacity whitespace-nowrap"
                            style={{ color: formData.textColor }}
                          >
                            {formData.ctaText || "Learn More"}
                          </button>
                        )}
                        <button
                          type="button"
                          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                          style={{ color: formData.textColor }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="active">Active Status</Label>
                      <Switch
                        id="active"
                        checked={formData.active}
                        onCheckedChange={(checked) => handleChange("active", checked)}
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2">Preview Settings</h4>
                      <div className="text-sm space-y-1 text-muted-foreground">
                        <div>Delay: {formData.delaySeconds} seconds</div>
                        <div>Duration: {formData.slideDuration}ms</div>
                        <div>Dismissal: {formData.dismissalHours} hours</div>
                        <div>Display Order: {formData.displayOrder}</div>
                        <div>CTA: {formData.ctaActive ? "Enabled" : "Disabled"}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>

      {/* Fixed Footer */}
      <div className="flex-shrink-0 flex justify-end space-x-3 p-6 border-t bg-background">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : banner ? "Update Banner" : "Create Banner"}
        </Button>
      </div>
    </div>
  );
};

export default StripBannerForm;
