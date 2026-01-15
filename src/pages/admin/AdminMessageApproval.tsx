import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { channelMessageService, forumChannelService } from "@/services/forumService";
import { courseService } from "@/services/courseService";
import { ChannelMessage, MESSAGE_STATUS, MessageStatus } from "@/types/forum";
import { Course } from "@/types/course";
import { ForumChannel } from "@/types/forum";
import { formatDistanceToNow } from "date-fns";
import { Timestamp, DocumentSnapshot, WhereFilterOp } from "firebase/firestore";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ChevronsUpDown,
  Search,
  Eye,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calculatekarmaForComments } from "@/services/karmaService/calculatekarmaForApprovedComment";
import { calculateKarmaForUpvotes } from "@/services/karmaService/calculatekarmaForUpvote";
import { calculatekarmaForForumComments } from "@/services/karmaService/calculatekarmaForApprovedForumComments";
import { authService } from "@/services/authService";

const AdminMessageApproval: React.FC = () => {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<MessageStatus>(MESSAGE_STATUS.HIDDEN);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<ChannelMessage | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Course and Channel filters
  const [courses, setCourses] = useState<Course[]>([]);
  const [channels, setChannels] = useState<ForumChannel[]>([]);
  const [allChannels, setAllChannels] = useState<ForumChannel[]>([]);
  const [courseFilter, setCourseFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [courseOpen, setCourseOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<DocumentSnapshot | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const itemsPerPage = 50;

  // Load courses and channels on mount
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const coursesData = await courseService.getAllCourses();
        setCourses(coursesData);

        // Load all channels from all courses
        const channelsPromises = coursesData.map((course) =>
          forumChannelService.getChannelsByCourse(course.id)
        );
        const channelsResults = await Promise.all(channelsPromises);
        const allChannelsData = channelsResults
          .filter((result) => result.success)
          .flatMap((result) => result.data || []);

        setAllChannels(allChannelsData);
        setChannels(allChannelsData);
      } catch (error) {
        console.error("Error loading dropdown data:", error);
      }
    };

    loadDropdownData();
  }, []);

  // Filter channels based on selected course
  useEffect(() => {
    if (courseFilter === "all") {
      setChannels(allChannels);
    } else {
      const filteredChannels = allChannels.filter((channel) => channel.courseId === courseFilter);
      setChannels(filteredChannels);

      // Reset channel filter if current selection is not in filtered list
      if (channelFilter !== "all" && !filteredChannels.some((c) => c.id === channelFilter)) {
        setChannelFilter("all");
      }
    }
  }, [courseFilter, allChannels, channelFilter]);

  // Load messages
  const loadMessages = useCallback(
    async (resetPagination = true) => {
      setLoading(true);
      setError(null);
      setSelectedMessages(new Set());

      try {
        const filters: {
          field: keyof ChannelMessage;
          op: WhereFilterOp;
          value: any;
        }[] = [{ field: "status", op: "==", value: selectedTab }];

        // Add course filter
        if (courseFilter !== "all") {
          filters.push({ field: "courseId", op: "==", value: courseFilter });
        }

        // Add channel filter
        if (channelFilter !== "all") {
          filters.push({ field: "channelId", op: "==", value: channelFilter });
        }

        const result = await channelMessageService.getMessagesWithFilters(filters, {
          limit: itemsPerPage,
          orderBy: { field: "createdAt", direction: "desc" },
          cursor: resetPagination ? undefined : nextCursor || undefined,
        });

        if (result.success && result.data) {
          setMessages(result.data.data);
          setTotalCount(result.data.totalCount);
          setHasNextPage(result.data.hasNextPage);
          setNextCursor(result.data.nextCursor);
          if (resetPagination) {
            setCurrentPage(1);
          }
        } else {
          setError(result.error?.message || "Failed to load messages");
        }
      } catch (err) {
        setError("Failed to load messages");
        console.error("Error loading messages:", err);
      } finally {
        setLoading(false);
      }
    },
    [selectedTab, courseFilter, channelFilter, nextCursor]
  );

  useEffect(() => {
    loadMessages(true);
  }, [selectedTab, courseFilter, channelFilter]);

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
      loadMessages(false);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      // Note: Going back requires keeping track of previous docs
      // For simplicity, we'll reload from start
      setNextCursor(null);
      loadMessages(true);
    }
  };

  // Filter messages
  const filteredMessages = useMemo(() => {
    if (!searchTerm.trim()) return messages;
    const searchLower = searchTerm.toLowerCase();
    return messages.filter(
      (message) =>
        message.text.toLowerCase().includes(searchLower) ||
        message.senderName.toLowerCase().includes(searchLower)
    );
  }, [messages, searchTerm]);

  // Actions
  const handleApproveMessage = async (
    messageId: string,
    messageSenderId: string,
    messageCourseId: string,
    messageSenderName: string
  ) => {
    try {
      const idToken = await authService.getToken();
      const result = await channelMessageService.unhideMessage(messageId);
      if (result.success) {
        calculatekarmaForForumComments.calculateKarmaForApprovedForumComment(
          messageSenderId,
          idToken,
          messageCourseId,
          messageSenderName
        );
        setMessages((prev) => prev.filter((message) => message.id !== messageId));
        // calculatekarmaForForumComments()
      } else {
        setError(result.error?.message || "Failed to approve message");
      }
    } catch (err) {
      setError("Failed to approve message");
    }
  };

  const handleDeleteMessage = async (
    messageId: string,
    messageSenderId: string,
    messageCourseId: string,
    messageSenderName: string
  ) => {
    try {
      const result = await channelMessageService.deleteMessage(messageId);
      const idToken = await authService.getToken();
      if (result.success) {
        calculatekarmaForForumComments.calculateKarmaForRejectedForumComment(
          messageSenderId,
          idToken,
          messageCourseId,
          messageSenderName
        );
        setMessages((prev) => prev.filter((message) => message.id !== messageId));
      } else {
        setError(result.error?.message || "Failed to delete message");
      }
    } catch (err) {
      setError("Failed to delete message");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedMessages.size === 0) return;

    setLoading(true);

    try {
      const idToken = await authService.getToken();

      const promises = Array.from(selectedMessages).map(async (messageId) => {
        const result = await channelMessageService.unhideMessage(messageId);

        if (result.success) {
          const message = messages.find((m) => m.id === messageId);
          if (!message) return;

          calculatekarmaForForumComments.calculateKarmaForApprovedForumComment(
            message.senderId,
            idToken,
            message.courseId,
            message.senderName
          );
        }
      });

      await Promise.all(promises);

      setMessages((prev) => prev.filter((message) => !selectedMessages.has(message.id)));
      setSelectedMessages(new Set());
    } catch (err) {
      setError("Failed to approve messages");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMessages.size === 0) return;

    setLoading(true);

    try {
      const idToken = await authService.getToken();

      const promises = Array.from(selectedMessages).map(async (messageId) => {
        const result = await channelMessageService.deleteMessage(messageId);

        if (result?.success) {
          const message = messages.find((m) => m.id === messageId);
          if (!message) return;

          calculatekarmaForForumComments.calculateKarmaForRejectedForumComment(
            message.senderId,
            idToken,
            message.courseId,
            message.senderName
          );
        }
      });

      await Promise.all(promises);

      setMessages((prev) => prev.filter((message) => !selectedMessages.has(message.id)));
      setSelectedMessages(new Set());
    } catch (err) {
      setError("Failed to delete messages");
    } finally {
      setLoading(false);
    }
  };

  // Selection
  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages((prev) => {
      const newSet = new Set(prev);
      newSet.has(messageId) ? newSet.delete(messageId) : newSet.add(messageId);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    setSelectedMessages((prev) =>
      prev.size === filteredMessages.length ? new Set() : new Set(filteredMessages.map((m) => m.id))
    );
  };

  const viewMessage = (message: ChannelMessage) => {
    setSelectedMessage(message);
    setIsViewModalOpen(true);
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const getChannelName = (channelId: string) => {
    const channel = allChannels.find((c) => c.id === channelId);
    return channel?.name || "Unknown";
  };

  const getCourseName = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    return course?.title || "Unknown";
  };

  if (loading && messages.length === 0) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Message Moderation</h1>
          <p className="text-muted-foreground">Manage and moderate forum messages</p>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-destructive">
                <span>{error}</span>
                <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className={`cursor-pointer transition-colors ${
              selectedTab === MESSAGE_STATUS.HIDDEN ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => setSelectedTab(MESSAGE_STATUS.HIDDEN)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hidden Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mt-1">Pending approval</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${
              selectedTab === MESSAGE_STATUS.ACTIVE ? "border-green-500 bg-green-500/5" : ""
            }`}
            onClick={() => setSelectedTab(MESSAGE_STATUS.ACTIVE)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mt-1">Approved and visible</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${
              selectedTab === MESSAGE_STATUS.DELETED ? "border-destructive bg-destructive/5" : ""
            }`}
            onClick={() => setSelectedTab(MESSAGE_STATUS.DELETED)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deleted Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mt-1">Removed messages</p>
            </CardContent>
          </Card>
        </div>

        {/* Controls Card */}
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>Manage {selectedTab} messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Course Combobox */}
              <Popover open={courseOpen} onOpenChange={setCourseOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={courseOpen}
                    className="w-full sm:w-[250px] justify-between"
                  >
                    <span className="truncate">
                      {courseFilter === "all"
                        ? "All Courses"
                        : courses.find((c) => c.id === courseFilter)?.title || "Select course"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full sm:w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search courses..." />
                    <CommandList>
                      <CommandEmpty>No courses found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setCourseFilter("all");
                            setCourseOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              courseFilter === "all" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          All Courses
                        </CommandItem>
                        {courses.map((course) => (
                          <CommandItem
                            key={course.id}
                            value={course.id}
                            onSelect={(currentValue) => {
                              setCourseFilter(currentValue);
                              setCourseOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                courseFilter === course.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {course.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Channel Combobox */}
              <Popover open={channelOpen} onOpenChange={setChannelOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={channelOpen}
                    className="w-full sm:w-[250px] justify-between"
                    disabled={channels.length === 0}
                  >
                    <span className="truncate">
                      {channelFilter === "all"
                        ? "All Channels"
                        : channels.find((c) => c.id === channelFilter)?.name || "Select channel"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full sm:w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search channels..." />
                    <CommandList>
                      <CommandEmpty>No channels found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setChannelFilter("all");
                            setChannelOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              channelFilter === "all" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          All Channels
                        </CommandItem>
                        {channels.map((channel) => (
                          <CommandItem
                            key={channel.id}
                            value={channel.id}
                            onSelect={(currentValue) => {
                              setChannelFilter(currentValue);
                              setChannelOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                channelFilter === channel.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {channel.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>

              {/* Clear Filters */}
              {(courseFilter !== "all" || channelFilter !== "all" || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCourseFilter("all");
                    setChannelFilter("all");
                    setSearchTerm("");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Bulk Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex-1" />

              {selectedMessages.size > 0 && (
                <div className="flex gap-2">
                  {selectedTab === MESSAGE_STATUS.HIDDEN && (
                    <Button onClick={handleBulkApprove} disabled={loading}>
                      Approve Selected ({selectedMessages.size})
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleBulkDelete} disabled={loading}>
                    Delete Selected ({selectedMessages.size})
                  </Button>
                </div>
              )}
            </div>

            {/* Messages Table */}
            {filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No {selectedTab} messages found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedMessages.size === filteredMessages.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-32">Date</TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedMessages.has(message.id)}
                          onCheckedChange={() => toggleMessageSelection(message.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{message.senderName}</div>
                          <div className="text-sm text-muted-foreground">
                            {message.upvoteCount} upvotes
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="text-sm truncate">{getCourseName(message.courseId)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="text-sm truncate">{getChannelName(message.channelId)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="line-clamp-2">{message.text}</p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {message.attachments.length} attachment(s)
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatMessageTime(message.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 items-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => viewMessage(message)}
                            className="h-8 px-2"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Link to={`/courses/${message.courseId}/forum`}>
                            <Button size="sm" variant="ghost" className="h-8 px-2">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </Link>
                          {selectedTab === MESSAGE_STATUS.HIDDEN && (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleApproveMessage(
                                  message.id,
                                  message.senderId,
                                  message.courseId,
                                  message.senderName
                                )
                              }
                              className="h-8 px-2"
                            >
                              Approve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDeleteMessage(
                                message.id,
                                message.senderId,
                                message.courseId,
                                message.senderName
                              )
                            }
                            className="h-8 px-2"
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {filteredMessages.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing page {currentPage} of {Math.ceil(totalCount / itemsPerPage)}({totalCount}{" "}
                  total messages)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!hasNextPage || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* View Message Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Message Details</DialogTitle>
            </DialogHeader>
            {selectedMessage && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">User</div>
                  <div className="font-medium">{selectedMessage.senderName}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Course</div>
                  <div>{getCourseName(selectedMessage.courseId)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Channel</div>
                  <div>{getChannelName(selectedMessage.channelId)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Message</div>
                  <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap">
                    {selectedMessage.text}
                  </div>
                </div>
                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Attachments</div>
                    <div className="space-y-2">
                      {selectedMessage.attachments.map((attachment, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded"
                        >
                          <span className="text-sm">{attachment.name}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(attachment.url, "_blank")}
                          >
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-muted-foreground">Posted</div>
                  <div>{formatMessageTime(selectedMessage.createdAt)}</div>
                </div>
                <div className="flex gap-2 pt-4">
                  {selectedTab === MESSAGE_STATUS.HIDDEN && (
                    <Button
                      onClick={() => {
                        handleApproveMessage(
                          selectedMessage.id,
                          selectedMessage.senderId,
                          selectedMessage.courseId,
                          selectedMessage.senderName
                        );
                        setIsViewModalOpen(false);
                      }}
                    >
                      Approve Message
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleDeleteMessage(
                        selectedMessage.id,
                        selectedMessage.senderId,
                        selectedMessage.courseId,
                        selectedMessage.senderName
                      );
                      setIsViewModalOpen(false);
                    }}
                  >
                    Delete Message
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminMessageApproval;
