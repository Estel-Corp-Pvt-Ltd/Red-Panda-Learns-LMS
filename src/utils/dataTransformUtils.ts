
import { UnifiedLesson, UnifiedTopic, DataFormat } from '@/types/enhancedLms';
import { Lesson, Topic } from '@/types/lms';
import { serverTimestamp } from 'firebase/firestore';

export const dataTransformUtils = {
  // Detect data format
  detectLessonFormat: (data: any): DataFormat => {
    if (data.ID && data.post_title && data.post_content) {
      return { type: 'tutorLMS' };
    }
    return { type: 'firebase' };
  },

  detectTopicFormat: (data: any): DataFormat => {
    if (data.ID && data.post_title) {
      return { type: 'tutorLMS' };
    }
    return { type: 'firebase' };
  },

  // Transform TutorLMS lesson to Firebase format
  transformTutorLMSLessonToFirebase: (tutorLesson: any): Lesson => {
    return {
      id: tutorLesson.ID?.toString() || '',
      title: tutorLesson.post_title || '',
      content: tutorLesson.post_content || '',
      topicId: tutorLesson.topicId || tutorLesson.topic_id?.toString() || '',
      courseId: tutorLesson.courseId || tutorLesson.course_id?.toString() || '',
      order: tutorLesson.order || 0,
      type: tutorLesson.video && tutorLesson.video.length > 0 ? 'video' : 'text',
      duration: tutorLesson.duration || 10,
      isPublished: tutorLesson.post_status === 'publish',
      isPreview: tutorLesson.is_preview || false,
      video: tutorLesson.video && tutorLesson.video.length > 0 ? tutorLesson.video[0] : undefined,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  },

  // Transform Firebase lesson to TutorLMS format
  transformFirebaseLessonToTutorLMS: (firebaseLesson: Lesson, originalTutorData?: any): any => {
    const baseData = {
      ID: originalTutorData?.ID || parseInt(firebaseLesson.id?.replace(/\D/g, '') || '1'),
      post_title: firebaseLesson.title,
      post_content: firebaseLesson.content,
      post_name: firebaseLesson.title?.toLowerCase().replace(/\s+/g, '-') || '',
      topicId: firebaseLesson.topicId,
      topic_id: parseInt(firebaseLesson.topicId?.replace(/\D/g, '') || '1'),
      courseId: firebaseLesson.courseId,
      course_id: parseInt(firebaseLesson.courseId?.replace(/\D/g, '') || '1'),
      thumbnail: originalTutorData?.thumbnail || false,
      attachments: originalTutorData?.attachments || [],
      video: firebaseLesson.video ? [firebaseLesson.video] : [],
      order: firebaseLesson.order || 0,
      duration: firebaseLesson.duration || 10,
      post_status: firebaseLesson.isPublished ? 'publish' : 'draft',
      is_preview: firebaseLesson.isPreview || false,
    };

    // Preserve original TutorLMS fields if they exist
    if (originalTutorData) {
      return {
        ...originalTutorData,
        ...baseData,
      };
    }

    return baseData;
  },

  // Transform TutorLMS topic to Firebase format
  transformTutorLMSTopicToFirebase: (tutorTopic: any): Topic => {
    return {
      id: tutorTopic.ID?.toString() || '',
      title: tutorTopic.post_title || '',
      description: tutorTopic.post_content || '',
      courseId: tutorTopic.courseId || tutorTopic.course_id?.toString() || '',
      order: tutorTopic.topic_order || 0,
      isPublished: tutorTopic.post_status === 'publish',
      estimatedDuration: 0,
      totalLessons: tutorTopic.lessons?.length || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  },

  // Transform Firebase topic to TutorLMS format
  transformFirebaseTopicToTutorLMS: (firebaseTopic: Topic, originalTutorData?: any): any => {
    const baseData = {
      ID: originalTutorData?.ID || parseInt(firebaseTopic.id?.replace(/\D/g, '') || '1'),
      post_title: firebaseTopic.title,
      post_content: firebaseTopic.description || '',
      post_name: firebaseTopic.title?.toLowerCase().replace(/\s+/g, '-') || '',
      courseId: firebaseTopic.courseId,
      course_id: parseInt(firebaseTopic.courseId?.replace(/\D/g, '') || '1'),
      topic_order: firebaseTopic.order || 0,
      post_status: firebaseTopic.isPublished ? 'publish' : 'draft',
      lessons_count: firebaseTopic.totalLessons || 0,
    };

    // Preserve original TutorLMS fields if they exist
    if (originalTutorData) {
      return {
        ...originalTutorData,
        ...baseData,
      };
    }

    return baseData;
  },

  // Create unified lesson from either format
  createUnifiedLesson: (data: any): UnifiedLesson => {
    console.log('Creating unified lesson from data:', data);
    
    const format = dataTransformUtils.detectLessonFormat(data);
    console.log('Detected format:', format);
    
    if (format.type === 'tutorLMS') {
      return {
        // TutorLMS fields
        ID: data.ID,
        post_title: data.post_title || '',
        post_content: data.post_content || '',
        post_name: data.post_name || '',
        topic_id: data.topicId || data.topic_id,
        course_id: data.courseId || data.course_id,
        thumbnail: data.thumbnail || false,
        attachments: data.attachments || [],
        video: data.video || [],
        
        // Firebase equivalent fields
        id: data.ID?.toString() || data.id,
        title: data.post_title || data.title || '',
        content: data.post_content || data.content || '',
        topicId: (data.topicId || data.topic_id)?.toString() || '',
        courseId: (data.courseId || data.course_id)?.toString() || '',
        order: data.order || 0,
        type: (data.video && data.video.length > 0) ? 'video' : 'text',
        duration: data.duration || 10,
        isPublished: data.post_status === 'publish' || data.isPublished === true,
        isPreview: data.is_preview || data.isPreview || false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    } else {
      return {
        // Firebase fields
        id: data.id || '',
        title: data.title || '',
        content: data.content || '',
        topicId: data.topicId || '',
        courseId: data.courseId || '',
        order: data.order || 0,
        type: data.type || 'text',
        duration: data.duration || 10,
        isPublished: data.isPublished !== false,
        isPreview: data.isPreview || false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        
        // TutorLMS equivalent fields
        ID: data.ID || parseInt(data.id?.replace(/\D/g, '') || '1'),
        post_title: data.post_title || data.title || '',
        post_content: data.post_content || data.content || '',
        post_name: data.post_name || data.title?.toLowerCase().replace(/\s+/g, '-') || '',
        topic_id: data.topic_id || parseInt(data.topicId?.replace(/\D/g, '') || '1'),
        course_id: data.course_id || parseInt(data.courseId?.replace(/\D/g, '') || '1'),
        thumbnail: data.thumbnail || false,
        attachments: data.attachments || [],
        video: data.video ? (Array.isArray(data.video) ? data.video : [data.video]) : [],
      };
    }
  },

  // Create unified topic from either format
  createUnifiedTopic: (data: any): UnifiedTopic => {
    console.log('Creating unified topic from data:', data);
    
    const format = dataTransformUtils.detectTopicFormat(data);
    console.log('Detected format:', format);
    
    if (format.type === 'tutorLMS') {
      return {
        // TutorLMS fields
        ID: data.ID,
        post_title: data.post_title || '',
        post_content: data.post_content || '',
        post_name: data.post_name || '',
        course_id: data.courseId || data.course_id,
        topic_order: data.topic_order || data.order || 0,
        lessons: data.lessons || [],
        
        // Firebase equivalent fields
        id: data.ID?.toString() || data.id,
        title: data.post_title || data.title || '',
        description: data.post_content || data.description || '',
        courseId: (data.courseId || data.course_id)?.toString() || '',
        order: data.topic_order || data.order || 0,
        isPublished: data.post_status === 'publish' || data.isPublished === true,
        estimatedDuration: data.estimatedDuration || 0,
        totalLessons: data.lessons?.length || data.totalLessons || 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    } else {
      return {
        // Firebase fields
        id: data.id || '',
        title: data.title || '',
        description: data.description || '',
        courseId: data.courseId || '',
        order: data.order || 0,
        isPublished: data.isPublished !== false,
        estimatedDuration: data.estimatedDuration || 0,
        totalLessons: data.totalLessons || 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        
        // TutorLMS equivalent fields
        ID: data.ID || parseInt(data.id?.replace(/\D/g, '') || '1'),
        post_title: data.post_title || data.title || '',
        post_content: data.post_content || data.description || '',
        post_name: data.post_name || data.title?.toLowerCase().replace(/\s+/g, '-') || '',
        course_id: data.course_id || parseInt(data.courseId?.replace(/\D/g, '') || '1'),
        topic_order: data.topic_order || data.order || 0,
        lessons: data.lessons || [],
      };
    }
  },
};
