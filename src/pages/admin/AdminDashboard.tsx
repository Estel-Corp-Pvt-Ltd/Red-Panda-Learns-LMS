import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Calendar,
  Edit,
  Eye,
  Check,
  ShoppingCart,
  Gift,
  Loader2,
  Plus,
  PlusCircle,
  Trash2,
  Users,
} from "lucide-react";
import {
  inputBase,
  selectContentBase,
  selectItemBase,
  selectTriggerBase,
} from "../../components/ui/styles";

import { useToast } from "@/hooks/use-toast";
import { ORDER_STATUS } from "@/constants";
import { formatDate } from "@/utils/date-time";

import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { bundleService } from "@/services/bundleService";
import { cohortService } from "@/services/cohortService";
import { couponService } from "@/services/couponService";
import { courseService } from "@/services/courseService";
import { instructorService } from "@/services/instructorService";
import { lessonService } from "@/services/lessonService";
import { organizationService } from "@/services/organizationService";
import { userService } from "@/services/userService";
import { orderService } from "@/services/orderService";
import { Bundle } from "@/types/bundle";
import { Coupon } from "@/types/coupon";
import { Cohort, Course } from "@/types/course";
import { OrganizationType, PopUpCourseType } from "@/types/general";
import { Lesson } from "@/types/lesson";
import { Organization } from "@/types/organization";
import { User } from "@/types/user";
import { OrderStatus } from "@/types/general";
import {
  BUNDLE_STATUS,
  COUPON_STATUS,
  COURSE_STATUS,
  CURRENCY,
  ORGANIZATION,
  POPUP_COURSE_TYPE,
  USER_ROLE,
  USER_STATUS,
} from "@/constants";
import { popUpService } from "@/services/popupService";
import { Order } from "@/types/order";
import { PopUp } from "@/types/pop-up";

const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
        active
          ? "bg-[#ff00ff] text-white" // bright magenta pill for ACTIVE
          : "border border-slate-300 text-slate-700 bg-white/80 dark:border-slate-700 dark:text-slate-300 dark:bg-transparent", // outlined pill for INACTIVE
      ].join(" ")}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
};

const PopUpTab = () => {
  const [popUps, setPopUps] = useState<PopUp[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [type, setType] = useState<PopUpCourseType>(POPUP_COURSE_TYPE.LIVE);
  const [autoClose, setAutoClose] = useState(false);
  const [duration, setDuration] = useState(5000);
  const [active, setActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();



  useEffect(() => {
    loadPopUps();
  }, []);

  const loadPopUps = async () => {
    const res = await popUpService.getAllPopUps();
    if (res) setPopUps(res.data);
    else
      toast({
        title: "Error",
        description: "Failed to load pop-ups",
        variant: "destructive",
      });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast({
        title: "Validation",
        description: "Title and description are required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (isEditing && editingId) {
        await popUpService.updatePopUp(editingId, {
          title,
          description,
          type,
          ctaText,
          ctaLink,
          active,
          autoClose,
          duration,
        });
        toast({
          title: "Updated",
          description: "Pop-up updated successfully.",
        });
      } else {
        await popUpService.createPopUp({
          title,
          description,
          type,
          ctaText,
          ctaLink,
          autoClose,
          duration,
          active,
        });
        toast({
          title: "Created",
          description: "Pop-up created successfully.",
        });
      }

      resetForm();
      await loadPopUps();
    } catch {
      toast({
        title: "Error",
        description: "Failed to save pop-up",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this pop-up?")) return;
    const res = await popUpService.deletePopUp(id);
    if (res) {
      toast({ title: "Deleted", description: "Pop-up deleted successfully." });
      await loadPopUps();
    } else {
      toast({
        title: "Error",
        description: "Failed to delete pop-up.",
        variant: "destructive",
      });
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setCtaText("");
    setCtaLink("");
    setType(POPUP_COURSE_TYPE.LIVE);
    setActive(false);
    setAutoClose(false);
    setDuration(5000);
    setIsEditing(false);
    setEditingId(null);
  }

  return (
    <div className="space-y-4">
      {/* Form wrapper */}
      <div className="rounded-2xl bg-white/70 p-3 sm:p-4 backdrop-blur dark:bg-slate-900/40">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 items-end"
        >
          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pop-up title"
              className={`${inputBase} h-11 w-full`}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className={`${inputBase} h-11 w-full`}
            />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Type
            </label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as PopUpCourseType)}
            >
              <SelectTrigger className={`${selectTriggerBase} h-11 w-full`}>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent
                side="bottom"
                align="start"
                className={selectContentBase}
              >
                {Object.values(POPUP_COURSE_TYPE).map((val) => (
                  <SelectItem
                    key={val}
                    value={val}
                    className={`${selectItemBase} pl-9 hover:bg-sky-500 hover:text-white data-[highlighted]:bg-sky-500 data-[highlighted]:text-white`}
                  >
                    {val}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CTA Text */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              CTA Text
            </label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="CTA text"
              className={`${inputBase} h-11 w-full`}
            />
          </div>

          {/* CTA Link */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              CTA Link
            </label>
            <input
              type="text"
              value={ctaLink}
              onChange={(e) => setCtaLink(e.target.value)}
              placeholder="https://..."
              className={`${inputBase} h-11 w-full`}
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Status
            </label>
            <div className="flex items-center gap-2">
              <Select
                value={active ? "true" : "false"}
                onValueChange={(v) => setActive(v === "true")}
              >
                <SelectTrigger className={`${selectTriggerBase} h-11 w-full`}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent
                  side="bottom"
                  align="start"
                  className={selectContentBase}
                >
                  {[
                    { label: "Active", value: "true" },
                    { label: "Inactive", value: "false" },
                  ].map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className={`${selectItemBase} pl-9 hover:bg-sky-500 hover:text-white data-[highlighted]:bg-sky-500 data-[highlighted]:text-white`}
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Live badge preview */}
              <StatusBadge active={active} />
            </div>
          </div>

          {/* Auto-close */}
          <div className="flex items-center gap-2 h-11">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={autoClose}
                onChange={(e) => setAutoClose(e.target.checked)}
                className="mr-1 accent-purple-600 dark:accent-purple-500"
              />
              Auto-close
            </label>
          </div>

          {/* Duration (ms) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Duration (ms)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              placeholder="5000"
              className={`${inputBase} h-11 w-full`}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 col-span-full sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <Button
              type="submit"
              disabled={saving}
              className="h-10 rounded-xl px-5 bg-[#ff00ff] text-white hover:bg-[#e600e6] focus-visible:ring-2 focus-visible:ring-[#ff00ff]/50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isEditing ? "Update Pop-up" : "Add Pop-up"}
            </Button>

            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
                className="h-10 rounded-xl px-5 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Table */}
      {popUps.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No pop-ups found.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white/70 backdrop-blur dark:bg-slate-900/40">
          <Table className="min-w-[720px]">
            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/60">
              <TableRow>
                <TableHead className="text-slate-600 dark:text-slate-300">
                  Title
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300">
                  Description
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300">
                  Type
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300">
                  CTA
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300">
                  Status
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300">
                  Auto Close
                </TableHead>
                <TableHead className="text-slate-600 dark:text-slate-300">
                  Duration
                </TableHead>
                <TableHead className="text-right text-slate-600 dark:text-slate-300">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {popUps.map((pop) => (
                <TableRow
                  key={pop.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-white/5"
                >
                  <TableCell className="max-w-[200px] truncate">
                    {pop.title}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate">
                    {pop.description}
                  </TableCell>
                  <TableCell className="capitalize">{pop.type}</TableCell>
                  <TableCell>
                    {pop.ctaText ? (
                      <a
                        href={pop.ctaLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-600 hover:underline dark:text-purple-400"
                      >
                        {pop.ctaText}
                      </a>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">
                        -
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={pop.active} />
                  </TableCell>
                  <TableCell>{pop.autoClose ? "Yes" : "No"}</TableCell>
                  <TableCell>{pop.duration ?? 5000}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                        onClick={() => {
                          setIsEditing(true);
                          setEditingId(pop.id);
                          setTitle(pop.title);
                          setDescription(pop.description);
                          setType(pop.type);
                          setCtaText(pop.ctaText);
                          setActive(pop.active);
                          setCtaLink(pop.ctaLink);
                          setAutoClose(pop.autoClose ?? false);
                          setDuration(pop.duration ?? 5000);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                        onClick={() => handleDelete(pop.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [cohortsLoading, setCohortsLoading] = useState(true);
  const [bundlesLoading, setBundlesLoading] = useState(true);
  type StatusFilter = "ALL" | OrderStatus;

  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  useEffect(() => {
    if (location.pathname === "/admin") {
      loadCourses();
      loadCohorts();
      loadBundles();
      loadLessons();
      loadInstructors();
      loadUsers();
      loadCoupons();

    }
  }, [location.pathname]);

  useEffect(() => {
    loadOrders();
  }, []);


  async function loadOrders() {
    try {
      const result = await orderService.getAllOrders();

      if (result.success && result.data) {
        setOrders(result.data);
      } else {
        console.error("Failed to fetch orders:", result.error?.message);
        toast({
          title: "Error",
          description: "Failed to load orders from server.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Error",
        description: "Something went wrong while loading orders.",
        variant: "destructive",
      });
    }
  }


  const filteredOrders = useMemo(() => {
    if (!orders?.length) return [];
    return statusFilter === "ALL"
      ? orders
      : orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);
  const loadUsers = async () => {
    const response = await userService.getAllUsers();
    if (response.success) {
      setUsers(response.data);
    } else {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    const response = await userService.deleteUser(userId);
    if (response.success) {
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  // 🔹 Load COURSES
  const loadCourses = async () => {
    try {
      const coursesList = await courseService.getAllCourses();
      setCourses(coursesList);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Load COHORTS
  const loadCohorts = async () => {
    try {
      const cohortsList = await cohortService.getAllCohorts();
      setCohorts(cohortsList);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load cohorts",
        variant: "destructive",
      });
    } finally {
      setCohortsLoading(false);
    }
  };

  // 🔹 Load BUNDLES
  const loadBundles = async () => {
    try {
      const bundlesList = await bundleService.getAllBundles();
      setBundles(bundlesList);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load bundles",
        variant: "destructive",
      });
    } finally {
      setBundlesLoading(false);
    }
  };

  const loadCoupons = async () => {
    try {
      const couponsList = await couponService.getAllCoupons();
      setCoupons(couponsList.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load coupons",
        variant: "destructive",
      });
    }
  };

  const loadLessons = async () => {
    try {
      const lessonsList = await lessonService.getAllLessons();
      setLessons(lessonsList);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load lessons",
        variant: "destructive",
      });
    } finally {
      setLessonsLoading(false);
    }
  };

  const loadInstructors = async () => {
    const result = await instructorService.getAllInstructors();
    if (result.success) {
      setInstructors(result.data);
      return;
    }
    toast({
      title: "Error",
      description: "Failed to load instructors",
      variant: "destructive",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const deleteCourse = async (courseId: string) => {
    try {
      await courseService.deleteCourse(courseId);
      setCourses((prev) => prev.filter((course) => course.id !== courseId));
      toast({
        title: "Success",
        description: "Course deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete course",
        variant: "destructive",
      });
    }
  };

  const deleteCoupon = async (couponId: string) => {
    try {
      await couponService.deleteCoupon(couponId);
      setCoupons((prev) => prev.filter((coupon) => coupon.id !== couponId));
      toast({
        title: "Success",
        description: "Coupon Deleted Successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete Coupon",
        variant: "destructive",
      });
    }
  };

  const deleteCohort = async (cohortId: string) => {
    try {
      await cohortService.deleteCohort(cohortId);
      setCohorts((prev) => prev.filter((cohort) => cohort.id !== cohortId));
      toast({
        title: "Success",
        description: "Cohort deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete cohort",
        variant: "destructive",
      });
    }
  };

  const deleteBundle = async (bundleId: string) => {
    try {
      await bundleService.deleteBundle(bundleId);
      setBundles((prev) => prev.filter((bundle) => bundle.id !== bundleId));
      toast({
        title: "Success",
        description: "Bundle deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete bundle",
        variant: "destructive",
      });
    }
  };

  const deleteLesson = async (lessonId: string) => {
    try {
      await lessonService.deleteLesson(lessonId);
      setLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId));
      toast({
        title: "Success",
        description: "Lesson deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete lesson",
        variant: "destructive",
      });
    }
  };

  const OrganizationTab = () => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [name, setName] = useState("");
    const [type, setType] = useState<OrganizationType>(ORGANIZATION.INDUSTRY);
    const [isEditing, setIsEditing] = useState(false);
    const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();


    useEffect(() => {
      loadOrganizations();
    }, []);

    async function loadOrganizations() {
      try {
        const data = await organizationService.getAllOrganizations();
        setOrganizations(data);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load organizations",
          variant: "destructive",
        });
      }
    }

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!name.trim()) {
        toast({
          title: "Validation",
          description: "Name cannot be empty.",
          variant: "destructive",
        });
        return;
      }

      setSaving(true);
      try {
        if (isEditing && editingOrgId) {
          await organizationService.updateOrganization(editingOrgId, {
            name,
            type,
          });
          toast({
            title: "Updated",
            description: "Organization updated successfully.",
          });
        } else {
          await organizationService.createOrganization({ name, type });
          toast({
            title: "Created",
            description: "Organization created successfully.",
          });
        }

        setName("");
        setType(ORGANIZATION.INDUSTRY);
        setIsEditing(false);
        setEditingOrgId(null);
        await loadOrganizations();
      } catch {
        toast({
          title: "Error",
          description: "Failed to save organization",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    }

    async function handleDelete(id: string) {
      if (!confirm("Are you sure you want to delete this organization?"))
        return;
      try {
        await organizationService.deleteOrganization(id);
        toast({
          title: "Deleted",
          description: "Organization deleted successfully.",
        });
        await loadOrganizations();
      } catch (error) {
        console.error("Error deleting organization:", error);
        toast({
          title: "Error",
          description: "Failed to delete organization.",
          variant: "destructive",
        });
      }
    }

    return (
      <div className="space-y-3">
        {/* Add / Edit form */}
        <form
          onSubmit={handleSubmit}
          className="
          grid grid-cols-1
          sm:grid-cols-[max-content_max-content_max-content]
          items-end
          gap-1.5 sm:gap-2
        "
        >
          {/* Organization Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Organization Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Organization name"
              className={`${inputBase} h-11 w-full sm:w-64`}
            />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Type
            </label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as OrganizationType)}
            >
              <SelectTrigger
                className={`${selectTriggerBase} h-11 w-full sm:w-64`}
              >
                <SelectValue placeholder="Select type" />
              </SelectTrigger>

              <SelectContent
                side="bottom"
                align="start"
                className={selectContentBase}
              >
                {Object.values(ORGANIZATION).map((val) => (
                  <SelectItem
                    key={val}
                    value={val}
                    className={`${selectItemBase} pl-9 hover:bg-sky-500 hover:text-white data-[state=checked]:bg-transparent data-[state=checked]:text-slate-700 dark:data-[state=checked]:text-slate-200`}
                  >
                    {val}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex items-end gap-1.5">
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl h-10 py-2 px-5"
            >
              {isEditing ? "Update Organization" : "Add Organization"}
            </Button>

            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                className="rounded-full h-10 px-5"
                onClick={() => {
                  setIsEditing(false);
                  setEditingOrgId(null);
                  setName("");
                  setType(ORGANIZATION.INDUSTRY);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>

        {/* Table List */}
        {organizations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No organizations found.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>{org.name}</TableCell>
                  <TableCell>{org.type}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                          setIsEditing(true);
                          setEditingOrgId(org.id);
                          setName(org.name);
                          setType(org.type);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full"
                        onClick={() => handleDelete(org.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    );
  };

  if (loading || cohortsLoading || bundlesLoading || lessonsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <div className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your courses, cohorts, and students
            </p>
          </div>

          {/*  Buttons stack on mobile, row on larger screens */}
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={() => navigate("/admin/create-course")}
              size="sm"
              className="text-xs sm:text-sm"
            >
              <PlusCircle className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">New</span> Course
            </Button>

            <Button
              onClick={() => navigate("/admin/create-bundle")}
              size="sm"
              className="text-xs sm:text-sm"
            >
              <PlusCircle className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Course</span> Bundle
            </Button>

            {/* <Button
    onClick={() => navigate("/admin/create-cohort")}
    size="sm"
    className="text-xs sm:text-sm"
  >
    <PlusCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
    <span className="hidden xs:inline">New</span> Cohort
  </Button> */}

            <Button
              onClick={() => navigate("/admin/create-coupon")}
              size="sm"
              className="text-xs sm:text-sm"
            >
              <PlusCircle className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">New</span> Coupon
            </Button>

            <Button
              onClick={() => navigate("/admin/submissions")}
              size="sm"
              className="text-xs sm:text-sm"
            >
              <Eye className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              Submissions
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          <Tabs defaultValue="courses" className="space-y-4">
            <TabsList
              className="
    grid grid-cols-2
    sm:flex sm:flex-wrap
    h-auto w-full
    gap-2 md:gap-3
    justify-center md:justify-start
    p-2
    rounded-xl
    border border-primary/10 bg-primary/5
  "
            >
              <TabsTrigger
                value="courses"
                className="w-full sm:w-auto text-center rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Courses
              </TabsTrigger>
              <TabsTrigger
                value="lessons"
                className="w-full sm:w-auto text-center rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Lessons
              </TabsTrigger>
              <TabsTrigger
                value="bundles"
                className="w-full sm:w-auto text-center rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Bundles
              </TabsTrigger>
              <TabsTrigger
                value="cohorts"
                className="w-full sm:w-auto text-center rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Cohorts
              </TabsTrigger>
              <TabsTrigger
                value="instructors"
                className="w-full sm:w-auto text-center rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Instructors
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="w-full sm:w-auto text-center rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Users
              </TabsTrigger>
              <TabsTrigger
                value="coupons"
                className="w-full sm:w-auto text-center rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Coupon
              </TabsTrigger>
              <TabsTrigger
                value="organizations"
                className="w-full sm:w-auto text-center rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Organizations
              </TabsTrigger>
              <TabsTrigger
                value="pop-ups"
                className="w-full sm:w-auto text-center rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Pop-Ups
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="w-full sm:w-auto text-center rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Orders
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lessons">
              <Card>
                <CardHeader>
                  <CardTitle>Lessons</CardTitle>
                  <CardDescription>
                    Manage all your individual lessons here.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lessons.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">
                        No lessons
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating your first lesson.
                      </p>
                      <div className="mt-6">
                        <Button
                          onClick={() => navigate("/admin/create-lesson")}
                        >
                          <PlusCircle className="mr-1 h-4 w-4" />
                          Create Lesson
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lessons.map((lesson) => (
                          <TableRow key={lesson.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {lesson.title}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {lesson.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{lesson.type}</TableCell>
                            <TableCell>
                              {lesson.duration
                                ? `${lesson.duration.hours} hours ${lesson.duration.minutes} min`
                                : "N/A"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {/* <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const course = courses.find(course =>
                                      course.topics?.some(topic =>
                                        topic.items?.some(item => item.id === lesson.id)
                                      )
                                    );

                                    if (!course) {
                                      toast({
                                        title: "Course not found",
                                        description: `No course found for lesson "${lesson.title}"`,
                                        variant: "destructive",
                                      });
                                      return;
                                    }

                                    navigate(`/admin/course/${course.id}/lesson/${lesson.id}`);
                                  }}
                                  title="View Lesson"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button> */}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    navigate(`/admin/edit-lesson/${lesson.id}`)
                                  }
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteLesson(lesson.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
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
            </TabsContent>

            <TabsContent value="courses">
              <Card>
                <CardHeader>
                  <CardTitle>Courses</CardTitle>
                  <CardDescription>
                    Manage your courses and their settings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {courses.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">
                        No courses
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating your first course.
                      </p>
                      <div className="mt-6">
                        <Button
                          onClick={() => navigate("/admin/create-course")}
                        >
                          <PlusCircle className="mr-1 h-4 w-4" />
                          Create Course
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Course</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {courses.map((course) => (
                          <TableRow key={course.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {course.title}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {course.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  course.status === COURSE_STATUS.PUBLISHED
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {course.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatCurrency(course.regularPrice)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  // onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
                                  onClick={() =>
                                    navigate(`/admin/edit-course/${course.id}`)
                                  }
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteCourse(course.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
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
            </TabsContent>

            <TabsContent value="bundles">
              <Card>
                <CardHeader>
                  <CardTitle>Course Bundles</CardTitle>
                  <CardDescription>
                    Manage your course bundles and bundle enrollments.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bundles.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">
                        No bundles
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating your first course bundle.
                      </p>
                      <div className="mt-6">
                        <Button
                          onClick={() => navigate("/admin/create-bundle")}
                        >
                          <PlusCircle className="mr-1 h-4 w-4" />
                          Create Bundle
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bundle</TableHead>
                          <TableHead>Courses</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bundles.map((bundle) => (
                          <TableRow key={bundle.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {bundle.title}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {bundle.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {bundle.courses
                                    .map((c) => c.title)
                                    .join(" | ")}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {formatCurrency(bundle.salePrice)}
                                <div className="text-xs text-muted-foreground">
                                  Original:{" "}
                                  {formatCurrency(bundle.regularPrice)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  bundle.status === BUNDLE_STATUS.PUBLISHED
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {bundle.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    navigate(`edit-bundle/${bundle.id}`)
                                  }
                                  title="Edit Bundle"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    navigate(`/bundle/${bundle.id}`)
                                  }
                                  title="View Bundle"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteBundle(bundle.id)}
                                  title="Delete Bundle"
                                >
                                  <Trash2 className="h-4 w-4" />
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
            </TabsContent>

            <TabsContent value="cohorts">
              <Card>
                <CardHeader>
                  <CardTitle>Cohorts</CardTitle>
                  <CardDescription>
                    Manage your cohort-based learning programs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {cohorts.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">
                        No cohorts
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating your first cohort.
                      </p>
                      <div className="mt-6">
                        <Button
                          onClick={() => navigate("/admin/create-cohort")}
                        >
                          <PlusCircle className="mr-1 h-4 w-4" />
                          Create Cohort
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cohort</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cohorts.map((cohort) => (
                          <TableRow key={cohort.id}>
                            {/* Cohort title & description */}
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {cohort.title}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {cohort.description || "-"}
                                </div>
                              </div>
                            </TableCell>

                            {/* Actions: view, edit, delete */}
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteCohort(cohort.id)}
                                  title="Delete Cohort"
                                >
                                  <Trash2 className="h-4 w-4" />
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
            </TabsContent>

            <TabsContent value="instructors">
              <Card>
                <CardHeader>
                  <CardTitle>Instructors</CardTitle>
                  <CardDescription>Manage all instructors.</CardDescription>
                </CardHeader>
                <CardContent>
                  {instructors.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">
                        No Instructors
                      </h3>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {instructors.map((instructor) => (
                          <TableRow key={instructor.id}>
                            <TableCell>
                              {instructor.firstName} {instructor.middleName}{" "}
                              {instructor.lastName}
                            </TableCell>
                            <TableCell>{instructor.email}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  instructor.role === USER_ROLE.ADMIN
                                    ? "destructive"
                                    : "default"
                                }
                              >
                                {instructor.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  instructor.status === USER_STATUS.ACTIVE
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {instructor.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                No actions available
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>
                    Manage platform users, their roles, and statuses.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">
                        No users
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by inviting or creating a user.
                      </p>
                      <div className="mt-6">
                        <Button onClick={() => navigate("/admin/create-user")}>
                          <PlusCircle className="mr-1 h-4 w-4" />
                          Add User
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              {user.firstName} {user.middleName} {user.lastName}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  user.role === USER_ROLE.ADMIN
                                    ? "destructive"
                                    : user.role === USER_ROLE.STUDENT
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  user.status === USER_STATUS.ACTIVE
                                    ? "default"
                                    : user.status === USER_STATUS.INACTIVE
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {user.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    navigate(`/admin/edit-user/${user.id}`)
                                  }
                                  title="Edit User"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteUser(user.id)}
                                  title="Delete User"
                                >
                                  <Trash2 className="h-4 w-4" />
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
            </TabsContent>

            <TabsContent value="coupons">
              <Card>
                <CardHeader>
                  <CardTitle>Coupons</CardTitle>
                  <CardDescription>
                    Manage discount codes, their usage, and validity.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {coupons.length === 0 && !loading ? (
                    <div className="text-center py-8">
                      <Gift className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">
                        No coupons
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating a coupon code.
                      </p>
                      <div className="mt-6">
                        <Button
                          onClick={() => navigate("/admin/create-coupon")}
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Create Coupon
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Usage</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {coupons.map((coupon) => (
                          <TableRow key={coupon.id}>
                            <TableCell className="font-medium">
                              {coupon.code}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  coupon.status === COUPON_STATUS.ACTIVE
                                    ? "default"
                                    : coupon.status === COUPON_STATUS.EXPIRED
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {coupon.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{coupon.discountPercentage}</TableCell>
                            <TableCell>
                              {coupon.usageLimit === 0
                                ? "Unlimited (∞)"
                                : coupon.usageLimit}
                            </TableCell>
                            <TableCell>
                              {formatDate(coupon.expiryDate)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    navigate(`/admin/edit-coupon/${coupon.id}`)
                                  }
                                  title="Edit Coupon"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    deleteCoupon(coupon.id);
                                  }}
                                  title="Delete Coupon"
                                >
                                  <Trash2 className="h-4 w-4" />
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
            </TabsContent>

            <TabsContent value="organizations">
              <Card>
                <CardHeader>
                  <CardTitle>Organizations</CardTitle>
                  <CardDescription>Manage all organizations.</CardDescription>
                </CardHeader>
                <CardContent>
                  <OrganizationTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pop-ups">
              <Card>
                <CardHeader>
                  <CardTitle>Pop-Ups</CardTitle>
                  <CardDescription>Manage all pop-ups.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PopUpTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Orders</CardTitle>
                  <CardDescription>View orders, item types, amounts, and statuses.</CardDescription>
                </CardHeader>

                <CardContent>
                  {/* Status Filter */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Filter by status:</span>
                      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All</SelectItem>
                          <SelectItem value={ORDER_STATUS.PENDING}>Pending</SelectItem>
                          <SelectItem value={ORDER_STATUS.COMPLETED}>Completed</SelectItem>
                          <SelectItem value={ORDER_STATUS.FAILED}>Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {orders.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">No orders</h3>
                      <p className="mt-1 text-sm text-gray-500">Orders will appear here once placed.</p>
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">No orders match this status</h3>
                      <p className="mt-1 text-sm text-gray-500">Try a different status filter.</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Item Types</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => {
                          const fullName =
                            order.billingAddress?.fullName
                          "—";

                          const uniqueTypes = Array.from(
                            new Set(order.items.map((i) => i.itemType))
                          );
                          const city = order.billingAddress?.city
                          return (
                            <TableRow key={order.orderId}>
                              <TableCell>{fullName}</TableCell>

                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {uniqueTypes.map((t) => (
                                    <Badge key={t} variant="secondary">
                                      {t}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>

                              <TableCell>
                                {formatCurrency(order.amount)}
                              </TableCell>

                              <TableCell>
                                {city}
                              </TableCell>

                              <TableCell>
                                <Badge
                                  variant={
                                    order.status === ORDER_STATUS.COMPLETED
                                      ? "default"
                                      : order.status === ORDER_STATUS.PENDING
                                        ? "secondary"
                                        : "destructive"
                                  }
                                >
                                  {order.status}
                                </Badge>
                              </TableCell>

                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    // onClick={() => navigate(`/admin/orders/${order.orderId}`)}
                                    title="View Order"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
