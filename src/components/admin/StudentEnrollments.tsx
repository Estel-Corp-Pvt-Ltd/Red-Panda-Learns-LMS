import { ENROLLMENT_STATUS } from '@/constants'
import { enrollmentService } from '@/services/enrollmentService'
import { Enrollment } from '@/types/enrollment'
import { EnrollmentStatus } from '@/types/general'
import { PaginatedResult } from '@/utils/pagination'
import { DocumentSnapshot } from 'firebase/firestore'
import React, { useCallback, useEffect, useState } from 'react'
import AdminLayout from '../AdminLayout'
import { BACKEND_URL } from '@/config'
import { authService } from '@/services/authService'
import { toast } from '@/hooks/use-toast'
import { learningProgressService } from '@/services/learningProgressService'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Clock, BookOpen, Loader2, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, XCircle, Award, Edit } from 'lucide-react'
import { Link } from 'react-router-dom'
import { logError } from '@/utils/logger'

const StudentEnrollments: React.FC = () => {

  const [enrollments, setEnrollments] = useState<PaginatedResult<Enrollment>>({
    data: [],
    hasNextPage: false,
    hasPreviousPage: false,
    nextCursor: null,
    previousCursor: null,
    totalCount: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'courseName' | 'userName' | 'userEmail'>('courseName');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pageLimit, setPageLimit] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEnrollments, setSelectedEnrollments] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [isIssuingCertificates, setIsIssuingCertificates] = useState(false);
  const [certificateRemark, setCertificateRemark] = useState('');
  const [showBulkCertificateModal, setShowBulkCertificateModal] = useState(false);
  const [bulkCertificateData, setBulkCertificateData] = useState<Array<{
    enrollment: Enrollment;
    timeSpent: number;
    completedLessons: number;
    totalLessons: number;
  }>>([]);
  const [loadingProgressData, setLoadingProgressData] = useState(false);
  const [selectedModalEnrollments, setSelectedModalEnrollments] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{
    key: 'timeSpent' | 'completedLessons' | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [bulkResults, setBulkResults] = useState<{
    issued: number;
    skipped: number;
    issuedCertificates: string[];
    skippedEnrollments: string[];
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => { } });

  // Edit Certificate Modal State
  const [showEditCertificateModal, setShowEditCertificateModal] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);
  const [editPreferredName, setEditPreferredName] = useState('');
  const [editCompletionDate, setEditCompletionDate] = useState('');
  const [editCertificateLoading, setEditCertificateLoading] = useState(false);

  const fetchEnrollments = useCallback(async (
    cursor?: DocumentSnapshot | null,
    direction?: 'next' | 'previous',
    searchQuery: string = '',
    searchField: 'courseName' | 'userName' | 'userEmail' = 'courseName',
    startDateFilter: string = '',
    endDateFilter: string = ''
  ) => {
    setLoading(true)
    try {
      let filters = [];

      // Add search filters if search term exists - convert to lowercase for case-insensitive search
      if (searchQuery.trim()) {
        const searchValue = searchQuery;
        filters.push(
          {
            field: searchField as keyof Enrollment,
            op: '>=',
            value: searchValue
          },
          {
            field: searchField as keyof Enrollment,
            op: '<=',
            value: searchValue + '\uf8ff'
          }
        );
      }

      // Add date filters if provided
      if (startDateFilter) {
        const startDateObj = new Date(startDateFilter);
        filters.push({
          field: 'enrollmentDate',
          op: '>=',
          value: startDateObj
        });
      }

      if (endDateFilter) {
        const endDateObj = new Date(endDateFilter);
        endDateObj.setHours(23, 59, 59, 999); // End of the day
        filters.push({
          field: 'enrollmentDate',
          op: '<=',
          value: endDateObj
        });
      }

      const response = await enrollmentService.getEnrollments(filters, {
        limit: pageLimit,
        orderBy: { field: 'enrollmentDate', direction: 'desc' },
        cursor,
        pageDirection: direction
      })

      if (response.success && response.data) {
        setEnrollments(response.data);
      }
    } catch (error) {
      logError('Error fetching enrollments:', error)
    } finally {
      setLoading(false)
    }
  }, [pageLimit])

  // Initial load and when page limit changes
  useEffect(() => {
    fetchEnrollments(undefined, undefined, searchTerm, searchField, startDate, endDate)
    setCurrentPage(1)
  }, [fetchEnrollments, pageLimit])

  // Handle search with debouncing
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchEnrollments(undefined, undefined, searchTerm, searchField, startDate, endDate)
      setCurrentPage(1)
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, searchField, startDate, endDate, fetchEnrollments])

  const handleNextPage = () => {
    if (enrollments.hasNextPage && enrollments.nextCursor) {
      fetchEnrollments(enrollments.nextCursor, 'next', searchTerm, searchField, startDate, endDate)
      setCurrentPage(prev => prev + 1)
    }
  }

  const handlePreviousPage = () => {
    if (enrollments.hasPreviousPage && enrollments.previousCursor) {
      fetchEnrollments(enrollments.previousCursor, 'previous', searchTerm, searchField, startDate, endDate)
      setCurrentPage(prev => prev - 1)
    }
  }

  const handlePageLimitChange = (newLimit: number) => {
    setPageLimit(newLimit)
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setSearchField('courseName')
    setStartDate('')
    setEndDate('')
    setCurrentPage(1)
  }

  // Selection handlers
  const handleSelectEnrollment = (enrollmentId: string) => {
    setSelectedEnrollments(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(enrollmentId)) {
        newSelection.delete(enrollmentId)
      } else {
        newSelection.add(enrollmentId)
      }
      return newSelection
    })
  };

  const handleSelectAll = () => {
    if (selectedEnrollments.size === enrollments.data.length) {
      setSelectedEnrollments(new Set())
    } else {
      setSelectedEnrollments(new Set(enrollments.data.map(e => e.id)))
    }
  };

  // Get selected enrollments with their current status
  const getSelectedEnrollments = () => {
    return enrollments.data.filter(enrollment => selectedEnrollments.has(enrollment.id));
  };

  const canIssueCertificates = () => {
    const selected = getSelectedEnrollments();
    return (
      selected.length > 0 &&
      selected.every(e => e.status !== ENROLLMENT_STATUS.DROPPED)
    );
  };

  // Bulk status update
  const handleBulkStatusUpdate = async (newStatus: EnrollmentStatus) => {
    if (selectedEnrollments.size === 0) return;

    setBulkActionLoading(true)
    try {
      const updatePromises = Array.from(selectedEnrollments).map(enrollmentId =>
        enrollmentService.updateEnrollmentStatus(enrollmentId, newStatus)
      );

      await Promise.all(updatePromises)

      toast({
        title: `Enrollments ${newStatus === ENROLLMENT_STATUS.ACTIVE ? 'Activated' : 'Deactivated'}`,
        description: `Successfully updated ${selectedEnrollments.size} enrollment(s).`,
      });

      // Refresh the data
      await fetchEnrollments(undefined, undefined, searchTerm, searchField, startDate, endDate)
      setSelectedEnrollments(new Set())

    } catch (error) {
      logError(`Error ${newStatus === ENROLLMENT_STATUS.ACTIVE ? 'activating' : 'deactivating'} enrollments:`, error)
      toast({
        title: "Error",
        description: `Failed to ${newStatus === ENROLLMENT_STATUS.ACTIVE ? 'activate' : 'deactivate'} enrollments.`,
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Show confirmation for bulk status update
  const confirmBulkStatusUpdate = (newStatus: EnrollmentStatus) => {
    const action = newStatus === ENROLLMENT_STATUS.ACTIVE ? 'activate' : 'deactivate';
    const selected = getSelectedEnrollments();

    setConfirmDialog({
      open: true,
      title: `Confirm Bulk ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      message: `Are you sure you want to ${action} ${selected.length} enrollment(s)?`,
      onConfirm: () => {
        handleBulkStatusUpdate(newStatus);
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
  }

  // Single enrollment status update
  const handleUpdateEnrollmentStatus = async (enrollmentId: string, newStatus: EnrollmentStatus) => {
    try {
      await enrollmentService.updateEnrollmentStatus(enrollmentId, newStatus)
      toast({
        title: `Enrollment ${newStatus === ENROLLMENT_STATUS.ACTIVE ? 'Activated' : 'Deactivated'}`,
        description: "Successfully updated enrollment status.",
      });
      await fetchEnrollments(undefined, undefined, searchTerm, searchField, startDate, endDate)
    } catch (error) {
      logError(`Error ${newStatus === ENROLLMENT_STATUS.ACTIVE ? 'activating' : 'deactivating'} enrollment:`, error)
      toast({
        title: "Error",
        description: `Failed to ${newStatus === ENROLLMENT_STATUS.ACTIVE ? 'activate' : 'deactivate'} enrollment.`,
        variant: "destructive",
      });
    }
  }

  // Show confirmation for single enrollment status update
  const confirmUpdateEnrollmentStatus = (enrollment: Enrollment, newStatus: EnrollmentStatus) => {
    const action = newStatus === ENROLLMENT_STATUS.ACTIVE ? 'activate' : 'deactivate';

    setConfirmDialog({
      open: true,
      title: `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      message: `Are you sure you want to ${action} the enrollment for "${enrollment.userName || enrollment.userId}" in "${enrollment.courseName}"?`,
      onConfirm: () => {
        handleUpdateEnrollmentStatus(enrollment.id, newStatus);
        setConfirmDialog({ ...confirmDialog, open: false });
      }
    });
  }

  // Check if selected enrollments can be activated (all are DROPPED)
  const canActivateSelected = () => {
    const selected = getSelectedEnrollments();
    return selected.length > 0 && selected.every(e => e.status === ENROLLMENT_STATUS.DROPPED);
  }

  // Check if selected enrollments can be deactivated (all are ACTIVE)
  const canDeactivateSelected = () => {
    const selected = getSelectedEnrollments();
    return selected.length > 0 && selected.every(e => e.status === ENROLLMENT_STATUS.ACTIVE);
  }

  // Check if selected enrollments have mixed statuses
  const hasMixedStatusSelection = () => {
    const selected = getSelectedEnrollments();
    if (selected.length === 0) return false;
    const statuses = new Set(selected.map(e => e.status));
    return statuses.size > 1;
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid Date'
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      DROPPED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
        {status}
      </span>
    )
  }

  const isAllSelected = enrollments.data.length > 0 && selectedEnrollments.size === enrollments.data.length
  const isIndeterminate = selectedEnrollments.size > 0 && selectedEnrollments.size < enrollments.data.length

  const hasActiveFilters = searchTerm || startDate || endDate

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const handleSort = (key: 'timeSpent' | 'completedLessons') => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortedData = () => {
    if (!sortConfig.key) return bulkCertificateData;

    return [...bulkCertificateData].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      if (sortConfig.key === 'timeSpent') {
        aValue = a.timeSpent;
        bValue = b.timeSpent;
      } else {
        aValue = a.completedLessons;
        bValue = b.completedLessons;
      }

      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  };

  const handleOpenBulkCertificateModal = async () => {
    if (selectedEnrollments.size === 0) return;

    setLoadingProgressData(true);
    setShowBulkCertificateModal(true);
    setSortConfig({ key: null, direction: 'asc' }); // Reset sort when opening modal

    try {
      const selectedEnrollmentsList = enrollments.data.filter(e => selectedEnrollments.has(e.id));

      const progressDataPromises = selectedEnrollmentsList.map(async (enrollment) => {
        // const timeSpentResponse = await learningProgressService.getCourseTimeSpent(
        //   enrollment.userId,
        //   enrollment.courseId
        // );
        //
        // if (timeSpentResponse.success && timeSpentResponse.data) {
        //   const lessonHistory = timeSpentResponse.data.lessonHistory || {};
        //   const completedLessons = Object.values(lessonHistory).filter(
        //     (lesson: any) => lesson.completed
        //   ).length;
        //   const totalLessons = Object.keys(lessonHistory).length;
        //
        //   return {
        //     enrollment,
        //     timeSpent: timeSpentResponse.data.totalTimeSpentSec || 0,
        //     completedLessons,
        //     totalLessons,
        //   };
        // }
        console.warn("getCourseTimeSpent call is disabled");

        return {
          enrollment,
          timeSpent: 0,
          completedLessons: 0,
          totalLessons: 0,
        };
      });

      const progressData = await Promise.all(progressDataPromises);
      setBulkCertificateData(progressData);

      // Initialize modal selections with enrollment IDs that don't have certificates yet
      const enrollmentsWithoutCertificates = selectedEnrollmentsList.filter(e => !e.certification?.issued);
      setSelectedModalEnrollments(new Set(enrollmentsWithoutCertificates.map(e => e.id)));
    } catch (error) {
      logError('Error fetching progress data:', error);
      toast({
        title: "Failed to load progress data",
        variant: "destructive"
      });
    } finally {
      setLoadingProgressData(false);
    }
  };

  const handleIssueCertificates = async () => {
    if (selectedModalEnrollments.size === 0) {
      toast({
        title: "No enrollments selected"
      });
      return;
    }
    if (!certificateRemark) {
      toast({
        title: "Remark is required"
      });
      return;
    }

    setBulkActionLoading(true);
    setIsIssuingCertificates(true);

    const progressIdentifiers = enrollments
      .data
      .filter(e => selectedModalEnrollments.has(e.id))
      .map(e => e.id);

    try {
      // const idToken = await authService.getToken();
      //
      // const response = await fetch(
      //   `${BACKEND_URL}/bulkIssueCertificates`,
      //   {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //       Authorization: `Bearer ${idToken}`,
      //     },
      //     body: JSON.stringify({
      //       enrollments: progressIdentifiers,
      //       remark: certificateRemark
      //     }),
      //   }
      // );
      //
      // const data = await response.json();
      //
      // if (!data.success) {
      //   toast({
      //     title: "Failed Bulk Certificate Issue",
      //     variant: "destructive"
      //   });
      // } else {
      //   setBulkResults({
      //     issued: data.issued || 0,
      //     skipped: data.skipped || 0,
      //     issuedCertificates: data.issuedCertificates || [],
      //     skippedEnrollments: data.skippedEnrollments || []
      //   });
      //   setShowResultsModal(true);
      //   toast({
      //     title: "Certificates Issued",
      //   });
      // }
      //
      // await fetchEnrollments(undefined, undefined, searchTerm, searchField, startDate, endDate);
      // setSelectedEnrollments(new Set());
      // setCertificateRemark('');
      // setShowBulkCertificateModal(false);
      // setBulkCertificateData([]);
      // setSelectedModalEnrollments(new Set());
      console.warn("bulkIssueCertificates fetch call is disabled");
      toast({
        title: "Temporarily Disabled",
        description: "Bulk certificate issuance is temporarily disabled.",
        variant: "destructive",
      });
    } catch (err) {
      logError('Error issuing certificates:', err);
    } finally {
      setBulkActionLoading(false);
      setIsIssuingCertificates(false);
    }
  };

  // Edit Certificate Handlers
  const handleOpenEditCertificate = (enrollment: Enrollment) => {
    setEditingEnrollment(enrollment);
    setEditPreferredName(enrollment.certification?.preferredName || '');

    // Format completionDate for the date input
    if (enrollment.completionDate && typeof enrollment.completionDate !== 'symbol') {
      const date = (enrollment.completionDate as any).toDate ?
        (enrollment.completionDate as any).toDate() :
        new Date(enrollment.completionDate as any);
      setEditCompletionDate(date.toISOString().split('T')[0]);
    } else {
      setEditCompletionDate('');
    }

    setShowEditCertificateModal(true);
  };

  const handleSaveEditCertificate = async () => {
    if (!editingEnrollment) return;

    setEditCertificateLoading(true);
    try {
      const completionDate = editCompletionDate ? new Date(editCompletionDate) : null;

      const result = await enrollmentService.updateCertificateDetails(
        editingEnrollment.id,
        editPreferredName || null,
        completionDate
      );

      if (result.success) {
        toast({
          title: "Certificate Updated",
          description: "Certificate details have been updated successfully.",
        });

        // Refresh the enrollments list
        await fetchEnrollments(undefined, undefined, searchTerm, searchField, startDate, endDate);

        // Close modal and reset state
        setShowEditCertificateModal(false);
        setEditingEnrollment(null);
        setEditPreferredName('');
        setEditCompletionDate('');
      } else {
        toast({
          title: "Update Failed",
          description: typeof result.error === 'string' ? result.error : result.error?.message || "Failed to update certificate details.",
          variant: "destructive",
        });
      }
    } catch (error) {
      logError('Error updating certificate:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setEditCertificateLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Student Enrollments</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage and view all student course enrollments</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col gap-4">
              {/* Search Row */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Search Field Selector */}
                <div className="w-full sm:w-48">
                  <select
                    value={searchField}
                    onChange={(e) => setSearchField(e.target.value as 'courseName' | 'userName' | 'userEmail')}
                    className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="courseName">Course Name</option>
                    <option value="userName">Student Name</option>
                    <option value="userEmail">Student Email</option>
                  </select>
                </div>

                {/* Search Input */}
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder={`Search by ${searchField === 'courseName' ? 'course name' : searchField === 'userName' ? 'student name' : 'student email'}...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Date Filters Row */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    Enrollment Date:
                  </label>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">From:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="block px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">To:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="block px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions and Page Controls */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              {/* Bulk Actions */}
              {selectedEnrollments.size > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {selectedEnrollments.size} selected
                    {hasMixedStatusSelection() && (
                      <span className="text-orange-600 dark:text-orange-400 ml-2">(Mixed statuses)</span>
                    )}
                  </span>

                  {/* Activate Button */}
                  {canActivateSelected() && (
                    <button
                      onClick={() => confirmBulkStatusUpdate(ENROLLMENT_STATUS.ACTIVE)}
                      disabled={bulkActionLoading}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                    >
                      {bulkActionLoading && !isIssuingCertificates ? 'Activating...' : 'Activate Selected'}
                    </button>
                  )}

                  {/* Deactivate Button */}
                  {canDeactivateSelected() && (
                    <button
                      onClick={() => confirmBulkStatusUpdate(ENROLLMENT_STATUS.DROPPED)}
                      disabled={bulkActionLoading}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                    >
                      {bulkActionLoading && !isIssuingCertificates ? 'Deactivating...' : 'Deactivate Selected'}
                    </button>
                  )}

                  {/* Mixed Selection Message */}
                  {hasMixedStatusSelection() && (
                    <span className="text-sm text-orange-600 dark:text-orange-400">
                      Select enrollments with same status to perform bulk actions
                    </span>
                  )}

                  {/* Issue Certificates Button */}
                  {canIssueCertificates() && (
                    <button
                      onClick={handleOpenBulkCertificateModal}
                      disabled={bulkActionLoading}
                      className="inline-flex items-center px-4 py-2
                   text-sm font-medium rounded-md
                   text-white bg-blue-600 hover:bg-blue-700
                   disabled:opacity-50"
                    >
                      Issue Certificates
                    </button>
                  )}
                </div>
              )}

              {/* Page Limit Selector */}
              <div className="flex items-center gap-4 ml-auto">
                <div className="flex items-center gap-2">
                  <label htmlFor="pageLimit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Show:
                  </label>
                  <select
                    id="pageLimit"
                    value={pageLimit}
                    onChange={(e) => handlePageLimitChange(Number(e.target.value))}
                    className="block pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enrollments Table */}
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="relative px-6 py-3 w-12">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                          checked={isAllSelected}
                          ref={input => {
                            if (input) {
                              input.indeterminate = isIndeterminate
                            }
                          }}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Student & Course
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Enrollment Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Remark
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {enrollments.data.length > 0 ? (
                      enrollments.data.map((enrollment) => (
                        <tr key={enrollment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
                              checked={selectedEnrollments.has(enrollment.id)}
                              onChange={() => handleSelectEnrollment(enrollment.id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {enrollment.userName || enrollment.userId}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {enrollment.userEmail || 'No email'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {enrollment.courseName}
                                </div>
                                {enrollment.bundleId && (
                                  <div className="text-xs text-blue-600 dark:text-blue-400">
                                    Bundle: {enrollment.bundleId}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(enrollment.enrollmentDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(enrollment.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {enrollment.orderId || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {enrollment.certification?.remark || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              {enrollment.certification?.issued ? (
                                <>
                                  <Link to={`/certificate/public/view/${enrollment.certification.certificateId}`} target="_blank" rel="noopener noreferrer" title="View Certificate">
                                    <Award className="text-primary" />
                                  </Link>
                                  <button
                                    onClick={() => handleOpenEditCertificate(enrollment)}
                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                    title="Edit Certificate"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <Award className="text-gray-400" />
                              )}
                              {enrollment.status === ENROLLMENT_STATUS.ACTIVE && (
                                <button
                                  onClick={() => confirmUpdateEnrollmentStatus(enrollment, ENROLLMENT_STATUS.DROPPED)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                                  disabled={bulkActionLoading}
                                >
                                  Deactivate
                                </button>
                              )}
                              {enrollment.status === ENROLLMENT_STATUS.DROPPED && (
                                <button
                                  onClick={() => confirmUpdateEnrollmentStatus(enrollment, ENROLLMENT_STATUS.ACTIVE)}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                                  disabled={bulkActionLoading}
                                >
                                  Activate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="text-gray-500 dark:text-gray-400">
                            <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No enrollments found</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {hasActiveFilters ? 'Try adjusting your search filters' : 'Get started by creating your first enrollment'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {enrollments.data.length > 0 && (
                <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                  <div className="flex-1 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Showing <span className="font-medium">{(currentPage - 1) * pageLimit + 1}</span> to{' '}
                        <span className="font-medium">{(currentPage - 1) * pageLimit + enrollments.data.length}</span>
                        {enrollments.totalCount && (
                          <> of <span className="font-medium">{enrollments.totalCount}</span> results</>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handlePreviousPage}
                        disabled={!enrollments.hasPreviousPage || currentPage === 1 || loading}
                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${!enrollments.hasPreviousPage || currentPage === 1 || loading
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={handleNextPage}
                        disabled={!enrollments.hasNextPage || loading}
                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${!enrollments.hasNextPage
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bulk Certificate Issuance Modal */}
        <Dialog open={showBulkCertificateModal} onOpenChange={setShowBulkCertificateModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Issue Certificates - {selectedModalEnrollments.size} of {selectedEnrollments.size} Selected
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Certificate Remark Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Certificate Remark *
                </label>
                <Input
                  type="text"
                  placeholder="Enter certificate remark..."
                  value={certificateRemark}
                  onChange={(e) => setCertificateRemark(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Progress Data Table */}
              {loadingProgressData ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Loading progress data...</span>
                </div>
              ) : (
                <>
                  {/* Info Message */}
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-pink-200 dark:bg-pink-900/40 rounded border border-pink-300 dark:border-pink-800"></div>
                      <span className="text-gray-700 dark:text-gray-300">
                        Pink highlighted rows already have certificates issued
                      </span>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-3 w-12">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                              checked={selectedModalEnrollments.size === bulkCertificateData.length && bulkCertificateData.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedModalEnrollments(new Set(bulkCertificateData.map(d => d.enrollment.id)));
                                } else {
                                  setSelectedModalEnrollments(new Set());
                                }
                              }}
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Student
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                            Course
                          </th>
                          <th
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => handleSort('timeSpent')}
                          >
                            <div className="flex items-center gap-2">
                              Time Spent
                              {sortConfig.key === 'timeSpent' ? (
                                sortConfig.direction === 'asc' ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : (
                                  <ArrowDown className="h-4 w-4" />
                                )
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </div>
                          </th>
                          <th
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => handleSort('completedLessons')}
                          >
                            <div className="flex items-center gap-2">
                              Lessons Completed
                              {sortConfig.key === 'completedLessons' ? (
                                sortConfig.direction === 'asc' ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : (
                                  <ArrowDown className="h-4 w-4" />
                                )
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {getSortedData().map((data, index) => {
                          const hasCertificate = data.enrollment.certification?.issued;

                          return (
                            <tr
                              key={index}
                              className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${hasCertificate ? 'bg-pink-50 dark:bg-pink-900/20' : ''
                                }`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                                  checked={selectedModalEnrollments.has(data.enrollment.id)}
                                  onChange={() => {
                                    setSelectedModalEnrollments(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(data.enrollment.id)) {
                                        newSet.delete(data.enrollment.id);
                                      } else {
                                        newSet.add(data.enrollment.id);
                                      }
                                      return newSet;
                                    });
                                  }}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm">
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {data.enrollment.userName || 'N/A'}
                                  </div>
                                  <div className="text-gray-500 dark:text-gray-400">
                                    {data.enrollment.userEmail || 'N/A'}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {data.enrollment.courseName}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <span className="text-gray-900 dark:text-white font-medium">
                                    {formatTime(data.timeSpent)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded">
                                    <BookOpen className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  </div>
                                  <span className="text-gray-900 dark:text-white font-medium">
                                    {data.completedLessons} / {data.totalLessons}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkCertificateModal(false);
                  setCertificateRemark('');
                  setSelectedModalEnrollments(new Set());
                }}
                disabled={bulkActionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleIssueCertificates}
                disabled={bulkActionLoading || !certificateRemark || loadingProgressData || selectedModalEnrollments.size === 0}
              >
                {bulkActionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Issuing...
                  </>
                ) : (
                  `Issue ${selectedModalEnrollments.size} Certificate${selectedModalEnrollments.size !== 1 ? 's' : ''}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Results Modal */}
        <Dialog open={showResultsModal} onOpenChange={setShowResultsModal}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bulk Certificate Issuance Results</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-green-900 dark:text-green-100">Issued</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {bulkResults?.issued || 0}
                  </p>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <span className="font-semibold text-orange-900 dark:text-orange-100">Skipped</span>
                  </div>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {bulkResults?.skipped || 0}
                  </p>
                </div>
              </div>

              {/* Issued Certificates List */}
              {bulkResults && bulkResults.issuedCertificates.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 px-4 py-3">
                    <h3 className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Successfully Issued Certificates ({bulkResults.issuedCertificates.length})
                    </h3>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {bulkResults.issuedCertificates.map((cert, index) => {
                        const [userId, courseId] = cert.split('_', 2);
                        const enrollment = enrollments.data.find(
                          e => e.id === cert || (e.userId === userId && e.courseId === courseId)
                        );
                        return (
                          <li key={index} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {enrollment?.userName || userId}
                              </div>
                              <div className="text-gray-500 dark:text-gray-400">
                                {enrollment?.courseName || courseId}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}

              {/* Skipped Enrollments List */}
              {bulkResults && bulkResults.skippedEnrollments.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800 px-4 py-3">
                    <h3 className="font-semibold text-orange-900 dark:text-orange-100 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Skipped Enrollments ({bulkResults.skippedEnrollments.length})
                    </h3>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                      Either 90% course not completed or no learning progress found
                    </p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                      {bulkResults.skippedEnrollments.map((skip, index) => {
                        const [userId, courseId] = skip.split('_', 2);
                        const enrollment = enrollments.data.find(
                          e => e.id === skip || (e.userId === userId && e.courseId === courseId)
                        );
                        return (
                          <li key={index} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {enrollment?.userName || userId}
                              </div>
                              <div className="text-gray-500 dark:text-gray-400">
                                {enrollment?.courseName || courseId}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setShowResultsModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{confirmDialog.title}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {confirmDialog.message}
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDialog.onConfirm}
                variant="default"
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Certificate Modal */}
        <Dialog open={showEditCertificateModal} onOpenChange={setShowEditCertificateModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Certificate Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Student and Course Info */}
              {editingEnrollment && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {editingEnrollment.userName || editingEnrollment.userId}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {editingEnrollment.courseName}
                    </div>
                  </div>
                </div>
              )}

              {/* Preferred Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preferred Name on Certificate
                </label>
                <Input
                  type="text"
                  placeholder="Enter preferred name..."
                  value={editPreferredName}
                  onChange={(e) => setEditPreferredName(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Completion Date Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Completion Date
                </label>
                <Input
                  type="date"
                  value={editCompletionDate}
                  onChange={(e) => setEditCompletionDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditCertificateModal(false);
                  setEditingEnrollment(null);
                  setEditPreferredName('');
                  setEditCompletionDate('');
                }}
                disabled={editCertificateLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEditCertificate}
                disabled={editCertificateLoading}
              >
                {editCertificateLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}

export default StudentEnrollments
