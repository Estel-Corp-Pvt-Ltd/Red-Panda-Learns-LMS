import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';

function sanitizeVideoField(docData) {
  if (!docData?.additional_info?.video) return docData;

  const video = docData.additional_info.video;

  if (!Array.isArray(video)) return docData;

  if (video.length === 0) {
    docData.additional_info.video = [];
  } else {
    docData.additional_info.video = video.map((item) => {
      if (Array.isArray(item)) {
        return {};
      }
      return item;
    });
  }

  return docData;
}

// retry wrapper with exponential backoff
async function retry<T>(fn: () => Promise<T>, retries = 5, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;
    console.warn(`⚠️ Retrying… attempts left: ${retries}`);
    await new Promise(res => setTimeout(res, delay));
    return retry(fn, retries - 1, delay * 2);
  }
}

async function wpGet(path: string, params: Record<string, any> = {}) {
  const url = new URL(`https://vizuara.ai/wp-json/tutor/v1/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

  const headers = new Headers();
  const auth = btoa(`${import.meta.env.VITE_API_USERNAME}:${import.meta.env.VITE_API_PASSWORD}`);
  headers.append('Authorization', `Basic ${auth}`);

  const res = await retry(() => fetch(url, { headers }));
  if (!res.ok) throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
  const data = await res.json();
  return data;
}

async function saveDocToFirestore(collection: string, docData: any) {
  const id = docData.id || docData.ID;
  const ref = doc(db, collection, String(id));

  const existing = await getDoc(ref);
  if (existing.exists()) {
    console.log(`⏩ Skipped existing ${collection}/${id}`);
    return;
  }

  const cleanDoc = sanitizeVideoField(docData);
  await setDoc(ref, cleanDoc);
  console.log(`✅ Saved ${collection}/${id}`);
}

async function fetchAndSaveCourses() {
  console.log('📄 Fetching courses…');
  const res = await wpGet('courses', { order: 'desc', orderby: 'ID' });
  const courses = res.data?.posts || [];
  console.log(`→ Found ${courses.length} courses.`);

  for (const course of courses) {
    await saveDocToFirestore('courses', course);
    await fetchAndSaveTopics(course.ID);
  }
}

async function fetchAndSaveTopics(courseId: string) {
  console.log(`📄 Fetching topics for course ${courseId}…`);
  const res = await wpGet('topics', { course_id: courseId });
  const topics = res.data || [];
  console.log(`→ Found ${topics.length} topics.`);

  for (const topic of topics) {
    const topicId = topic.id || topic.ID;
    if (!topicId) {
      console.warn(`⚠️ Skipping topic with no ID in course ${courseId}`);
      continue;
    }
    topic.courseId = courseId;
    await saveDocToFirestore('topics', topic);
    await fetchAndSaveLessons(topicId);
  }
}

async function fetchAndSaveLessons(topicId: string) {
  console.log(`📄 Fetching lessons for topic ${topicId}…`);
  const res = await wpGet('lessons', { topic_id: topicId });
  const lessons = res.data || [];
  console.log(`→ Found ${lessons.length} lessons.`);

  for (const lesson of lessons) {
    lesson.topicId = topicId;
    await saveDocToFirestore('lessons', lesson);
  }
}

export async function migrateTutorLMS() {
  try {
    console.time('⏳ Migration');
    await fetchAndSaveCourses();
    console.timeEnd('⏳ Migration');
    console.log('🎉 Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
}
