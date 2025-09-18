
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Video,
  Upload,
  X,
  Link,
  Save,
  Loader2,
  Youtube,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UnifiedLesson, LessonFormData, AttachmentItem, VideoItem } from '@/types/enhancedLms';

// Form validation schema
const lessonFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  post_name: z.string().min(1, 'Lesson name is required'),
  thumbnail: z.boolean().default(false),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['pdf', 'image', 'document', 'link']),
    url: z.string(),
    size: z.number().optional(),
    uploadedAt: z.date().optional(),
  })).default([]),
  video: z.array(z.object({
    source: z.enum(['youtube', 'vimeo', 'external', 'embedded']),
    source_youtube: z.string().optional(),
    source_vimeo: z.string().optional(),
    source_external_url: z.string().optional(),
    source_embedded: z.string().optional(),
    source_shortcode: z.string().optional(),
    source_video_id: z.string().optional(),
    duration_sec: z.string().optional(),
    playtime: z.string().optional(),
    poster: z.string().optional(),
    runtime: z.object({
      hours: z.string(),
      minutes: z.string(),
      seconds: z.string(),
    }).optional(),
  })).default([]),
  isPreview: z.boolean().default(false),
  isPublished: z.boolean().default(true),
});

type LessonFormValues = z.infer<typeof lessonFormSchema>;

interface LessonEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: UnifiedLesson | null;
  onSave: (lessonData: LessonFormData) => void;
  loading?: boolean;
}

export const LessonEditModal = ({
  isOpen,
  onClose,
  lesson,
  onSave,
  loading = false,
}: LessonEditModalProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('basic');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: '',
      content: '',
      post_name: '',
      thumbnail: false,
      attachments: [],
      video: [],
      isPreview: false,
      isPublished: true,
    },
  });

  // Load lesson data when modal opens
  useEffect(() => {
    if (lesson && isOpen) {
      const title = lesson.title || lesson.post_title || '';
      const content = lesson.content || lesson.post_content || '';
      const postName = lesson.post_name || title.toLowerCase().replace(/\s+/g, '-');
      
      form.reset({
        title,
        content,
        post_name: postName,
        thumbnail: Boolean(lesson.thumbnail),
        attachments: lesson.attachments || [],
        video: lesson.video || [],
        isPreview: lesson.isPreview || false,
        isPublished: lesson.isPublished !== false,
      });
    }
  }, [lesson, isOpen, form]);

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Handle title change to auto-generate slug
  const handleTitleChange = (value: string) => {
    form.setValue('title', value);
    if (!form.getValues('post_name')) {
      form.setValue('post_name', generateSlug(value));
    }
  };

  // Parse YouTube URL to extract video ID
  const parseYouTubeUrl = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Parse Vimeo URL to extract video ID
  const parseVimeoUrl = (url: string) => {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : null;
  };

  // Add video source
  const addVideo = () => {
    if (!newVideoUrl.trim()) return;

    let videoSource: VideoItem['source'] = 'external';
    let videoData: Partial<VideoItem> = {
      source: 'external',
      source_external_url: newVideoUrl,
    };

    if (newVideoUrl.includes('youtube.com') || newVideoUrl.includes('youtu.be')) {
      const videoId = parseYouTubeUrl(newVideoUrl);
      videoSource = 'youtube';
      videoData = {
        source: 'youtube',
        source_youtube: newVideoUrl,
        source_video_id: videoId || '',
      };
    } else if (newVideoUrl.includes('vimeo.com')) {
      const videoId = parseVimeoUrl(newVideoUrl);
      videoSource = 'vimeo';
      videoData = {
        source: 'vimeo',
        source_vimeo: newVideoUrl,
        source_video_id: videoId || '',
      };
    }

    const currentVideos = form.getValues('video');
    form.setValue('video', [...currentVideos, videoData as VideoItem]);
    setNewVideoUrl('');
  };

  // Remove video
  const removeVideo = (index: number) => {
    const currentVideos = form.getValues('video');
    form.setValue('video', currentVideos.filter((_, i) => i !== index));
  };

  // Add attachment
  const addAttachment = () => {
    if (!newAttachmentUrl.trim() || !newAttachmentName.trim()) return;

    const attachment: AttachmentItem = {
      id: Date.now().toString(),
      name: newAttachmentName,
      type: newAttachmentUrl.endsWith('.pdf') ? 'pdf' : 'link',
      url: newAttachmentUrl,
      uploadedAt: new Date(),
    };

    const currentAttachments = form.getValues('attachments');
    form.setValue('attachments', [...currentAttachments, attachment]);
    setNewAttachmentUrl('');
    setNewAttachmentName('');
  };

  // Remove attachment
  const removeAttachment = (id: string) => {
    const currentAttachments = form.getValues('attachments');
    form.setValue('attachments', currentAttachments.filter(att => att.id !== id));
  };

  // Handle form submission
  const onSubmit = (data: LessonFormValues) => {
    // console.log(data)
    const lessonData: LessonFormData = {
      title: data.title,
      content: data.content,
      post_name: data.post_name,
      thumbnail: data.thumbnail,
      attachments: data.attachments as AttachmentItem[],
      video: data.video as VideoItem[],
      isPreview: data.isPreview,
      isPublished: data.isPublished,
    };

    onSave(lessonData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lesson ? 'Edit Lesson Details' : 'Add New Lesson'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="video">Video</TabsTrigger>
                <TabsTrigger value="attachments">Attachments</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lesson Title</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => handleTitleChange(e.target.value)}
                          placeholder="Enter lesson title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="post_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lesson Name/Slug</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="lesson-name-slug" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lesson Content</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter lesson content"
                          rows={10}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="video" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      Video Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                        placeholder="Enter YouTube, Vimeo, or external video URL"
                        className="flex-1"
                      />
                      <Button type="button" onClick={addVideo}>
                        <Upload className="h-4 w-4 mr-2" />
                        Add Video
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {form.watch('video').map((video, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {video.source === 'youtube' && <Youtube className="h-4 w-4 text-red-500" />}
                              {video.source === 'vimeo' && <Video className="h-4 w-4 text-blue-500" />}
                              {video.source === 'external' && <ExternalLink className="h-4 w-4 text-gray-500" />}
                              <Badge variant="outline">{video.source}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {video.source_youtube || video.source_vimeo || video.source_external_url}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVideo(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attachments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Attachments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input
                        value={newAttachmentName}
                        onChange={(e) => setNewAttachmentName(e.target.value)}
                        placeholder="Attachment name"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={newAttachmentUrl}
                          onChange={(e) => setNewAttachmentUrl(e.target.value)}
                          placeholder="URL or upload file"
                          className="flex-1"
                        />
                        <Button type="button" onClick={addAttachment}>
                          <Upload className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {form.watch('attachments').map((attachment) => (
                        <div key={attachment.id} className="flex items-center gap-2 p-3 border rounded-lg">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <div className="flex-1">
                            <p className="font-medium">{attachment.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{attachment.url}</p>
                          </div>
                          <Badge variant="outline">{attachment.type}</Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(attachment.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Lesson Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="thumbnail"
                      render={({ field }) => (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="thumbnail"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <label htmlFor="thumbnail" className="font-medium">
                            Enable Thumbnail
                          </label>
                        </div>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isPreview"
                      render={({ field }) => (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isPreview"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <label htmlFor="isPreview" className="font-medium">
                            Preview Lesson (Free to view)
                          </label>
                        </div>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isPublished"
                      render={({ field }) => (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isPublished"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <label htmlFor="isPublished" className="font-medium">
                            Published
                          </label>
                        </div>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Lesson
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
