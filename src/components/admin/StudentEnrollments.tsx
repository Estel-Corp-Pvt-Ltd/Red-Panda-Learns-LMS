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

      console.log('Fetching enrollments with filters:', filters, { cursor, direction, pageLimit });

      const response = await enrollmentService.getEnrollments(filters, {
        limit: pageLimit,
        orderBy: { field: 'enrollmentDate', direction: 'desc' },
        cursor,
        pageDirection: direction
      })

      if (response.success && response.data) {
        setEnrollments(response.data)
        // Clear selection when data changes
        setSelectedEnrollments(new Set())
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error)
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
    if (selectedEnrollments.size === 0) return

    setBulkActionLoading(true)
    try {
      const updatePromises = Array.from(selectedEnrollments).map(enrollmentId =>
        enrollmentService.updateEnrollmentStatus(enrollmentId, newStatus)
      )

      await Promise.all(updatePromises)

      // Refresh the data
      await fetchEnrollments(undefined, undefined, searchTerm, searchField, startDate, endDate)
      setSelectedEnrollments(new Set())

      console.log(`Successfully ${newStatus === ENROLLMENT_STATUS.ACTIVE ? 'activated' : 'deactivated'} ${selectedEnrollments.size} enrollments`)
    } catch (error) {
      console.error(`Error ${newStatus === ENROLLMENT_STATUS.ACTIVE ? 'activating' : 'deactivating'} enrollments:`, error)
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Single enrollment status update
  const handleUpdateEnrollmentStatus = async (enrollmentId: string, newStatus: EnrollmentStatus) => {
    try {
      await enrollmentService.updateEnrollmentStatus(enrollmentId, newStatus)
      // Refresh the data
      await fetchEnrollments(undefined, undefined, searchTerm, searchField, startDate, endDate)
      console.log(`Successfully ${newStatus === ENROLLMENT_STATUS.ACTIVE ? 'activated' : 'deactivated'} enrollment ${enrollmentId}`)
    } catch (error) {
      console.error(`Error ${newStatus === ENROLLMENT_STATUS.ACTIVE ? 'activating' : 'deactivating'} enrollment:`, error)
    }
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

  const handleIssueCertificates = async () => {
    if (selectedEnrollments.size === 0) return;
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
      .filter(e => selectedEnrollments.has(e.id))
      .map(e => ({
        userId: e.userId,
        courseId: e.courseId
      }));

    try {
      const idToken = await authService.getToken();

      const response = await fetch(
        `${BACKEND_URL}/bulkIssueCertificates`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            enrollments: progressIdentifiers,
            remark: certificateRemark
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        toast({
          title: "Failed Bulk Certificate Issue",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Certificates Issued",
        });
      }

      await fetchEnrollments(undefined, undefined, searchTerm, searchField, startDate, endDate);
      setSelectedEnrollments(new Set());
      setCertificateRemark('');
    } catch (err) {
      console.error('Error issuing certificates:', err);
    } finally {
      setBulkActionLoading(false);
      setIsIssuingCertificates(false);
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
                      onClick={() => handleBulkStatusUpdate(ENROLLMENT_STATUS.ACTIVE)}
                      disabled={bulkActionLoading}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                    >
                      {bulkActionLoading && !isIssuingCertificates ? 'Activating...' : 'Activate Selected'}
                    </button>
                  )}

                  {/* Deactivate Button */}
                  {canDeactivateSelected() && (
                    <button
                      onClick={() => handleBulkStatusUpdate(ENROLLMENT_STATUS.DROPPED)}
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

                  {/* Certificate Remark */}
                  {canIssueCertificates() && (
                    <>
                      <input
                        type="text"
                        placeholder="Certificate Remark"
                        value={certificateRemark}
                        onChange={(e) => setCertificateRemark(e.target.value)}
                        className="px-3 py-2 text-sm border rounded-md
                     border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-700
                     text-gray-900 dark:text-white
                     focus:ring-blue-500 focus:border-blue-500"
                      />

                      <button
                        onClick={handleIssueCertificates}
                        disabled={bulkActionLoading}
                        className="inline-flex items-center px-4 py-2
                     text-sm font-medium rounded-md
                     text-white bg-blue-600 hover:bg-blue-700
                     disabled:opacity-50"
                      >
                        {bulkActionLoading ? 'Issuing...' : 'Issue Certificates'}
                      </button>
                    </>
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              {enrollment.status === ENROLLMENT_STATUS.ACTIVE && (
                                <button
                                  onClick={() => handleUpdateEnrollmentStatus(enrollment.id, ENROLLMENT_STATUS.DROPPED)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                                  disabled={bulkActionLoading}
                                >
                                  Deactivate
                                </button>
                              )}
                              {enrollment.status === ENROLLMENT_STATUS.DROPPED && (
                                <button
                                  onClick={() => handleUpdateEnrollmentStatus(enrollment.id, ENROLLMENT_STATUS.ACTIVE)}
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
      </div>
    </AdminLayout>
  )
}

export default StudentEnrollments
