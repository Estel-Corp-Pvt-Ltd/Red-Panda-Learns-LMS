// src/pages/admin/AssignStudent.tsx
import AdminLayout from '@/components/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Users, Loader2 } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { COLLECTION } from '@/constants';
import { Card, CardContent } from '@/components/ui/card';
import AssignStudentsTab from '@/components/admin/AssignStudentsTab ';
import ViewAssignedStudentsTab from '@/components/admin/ViewAssignedStudentsTab';

const AssignStudent: React.FC = () => {
  const { user: adminUser } = useAuth();
  const adminId = adminUser?.id;

  const [activeTab, setActiveTab] = useState('assign');
  const [assignedStudentIds, setAssignedStudentIds] = useState<Set<string>>(new Set());
  const [isLoadingAssignedIds, setIsLoadingAssignedIds] = useState(true);

  // Fetch assigned student IDs once - shared between both tabs
  const fetchAssignedStudentIds = useCallback(async (): Promise<Set<string>> => {
    if (!adminId) return new Set();

    try {
      setIsLoadingAssignedIds(true);
      const assignmentsRef = collection(db, COLLECTION.ADMIN_ASSIGNED_STUDENTS);
      const q = query(
        assignmentsRef,
        where('adminId', '==', adminId),
        where('active', '==', true)
      );

      const snapshot = await getDocs(q);
      const studentIds = new Set<string>();

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.studentId) {
          studentIds.add(data.studentId);
        }
      });

      setAssignedStudentIds(studentIds);
      return studentIds;
    } catch (error) {
      console.error('Error fetching assigned student IDs:', error);
      return new Set();
    } finally {
      setIsLoadingAssignedIds(false);
    }
  }, [adminId]);

  // Function to update assigned IDs after assignment/unassignment
  const handleStudentAssigned = useCallback((studentIds: string[]) => {
    setAssignedStudentIds(prev => {
      const newSet = new Set(prev);
      studentIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, []);

  const handleStudentUnassigned = useCallback((studentId: string) => {
    setAssignedStudentIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(studentId);
      return newSet;
    });
  }, []);

  useEffect(() => {
    if (adminId) {
      fetchAssignedStudentIds();
    }
  }, [adminId, fetchAssignedStudentIds]);

  // Show loading state while fetching assigned IDs
  if (isLoadingAssignedIds) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="flex justify-center items-center py-12">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin" />
              <p className="mt-2 text-muted-foreground">Loading student data...</p>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Student Management</h1>
          <p className="text-muted-foreground">
            Assign new students or manage your currently assigned students.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="assign" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Assign Students
            </TabsTrigger>
            <TabsTrigger value="view" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assigned ({assignedStudentIds.size})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assign" className="mt-6">
            <AssignStudentsTab
              assignedStudentIds={assignedStudentIds}
              onStudentsAssigned={handleStudentAssigned}
            />
          </TabsContent>

          <TabsContent value="view" className="mt-6">
            <ViewAssignedStudentsTab
              assignedStudentIds={assignedStudentIds}
              onStudentUnassigned={handleStudentUnassigned}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AssignStudent;