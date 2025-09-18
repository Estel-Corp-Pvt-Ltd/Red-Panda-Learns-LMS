// Import Firestore functions and your db instance
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebaseConfig"; // Adjust the path to your config file

// An async function to add all the dummy data
export const addDummyData = async () => {
  try {
    // console.log("Starting to add dummy data...");

    // 1. Add an Instructor User
    const instructorId = "user_instructor_jane";
    await setDoc(doc(db, "users", instructorId), {
      email: "jane.doe@instructor.com",
      passwordHash: "dummy_hash_123", // In a real app, this would be a real hash
      firstName: "Jane",
      lastName: "Doe",
      role: "INSTRUCTOR",
      enrolledCourses: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    console.log("Added Instructor Jane Doe");

    // 2. Add a Student User
    const studentId = "user_student_john";
    await setDoc(doc(db, "users", studentId), {
        email: "john.smith@student.com",
        passwordHash: "dummy_hash_456",
        firstName: "John",
        lastName: "Smith",
        role: "STUDENT",
        enrolledCourses: [
            { courseId: "course_react_101", paymentMade: true, enrolledAt: Timestamp.now() }
        ],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    });
    console.log("Added Student John Smith");

    // 3. Add Lessons
    const lesson1Id = "lesson_jsx_intro";
    const lesson2Id = "lesson_components_basics";
    const courseId = "course_react_101";

    await setDoc(doc(db, "lessons", lesson1Id), {
      title: "Introduction to JSX",
      mediaType: "video",
      mediaUrl: "path/to/video1.mp4",
      durationSeconds: 720,
      courseId: courseId, // Link lesson to the course
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    await setDoc(doc(db, "lessons", lesson2Id), {
      title: "React Components Basics",
      mediaType: "video",
      mediaUrl: "path/to/video2.mp4",
      durationSeconds: 950,
      courseId: courseId, // Link lesson to the course
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    console.log("Added two lessons");

    // 4. Add a Course
    await setDoc(doc(db, "courses", courseId), {
      title: "Mastering React in 2025",
      url: "mastering-react-2025",
      description: "A comprehensive course on React.",
      regularPrice: 199,
      salePrice: 99,
      pricingModel: "PAID",
      thumbnail: "path/to/thumbnail.jpg",
      tags: ["react", "frontend", "javascript"],
      categories: ["Web Development"],
      authorId: instructorId, // Link to the instructor
      isPublished: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    console.log("Added React course");

    // 5. Add a Topic (as a subcollection of the course)
    const topicId = "topic_module_1";
    await setDoc(doc(db, "courses", courseId, "topics", topicId), {
        name: "Module 1: The Basics",
        contentIds: [lesson1Id, lesson2Id], // Reference the lesson IDs
        lockedFor: []
    });
    console.log("Added a topic to the course");

    console.log("✅ Dummy data added successfully!");

  } catch (error) {
    console.error("Error adding dummy data: ", error);
  }
};

