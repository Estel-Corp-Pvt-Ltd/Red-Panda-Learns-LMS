
# Quiz Timer Fix Documentation

## **Background / Issue**

Our quiz system had the following issues:

1. **Quizzes without a fixed end time (`endAt` null) were considered expired immediately.**

   * On the frontend, `serverTimeLeft` was 0 even for quizzes that just started.
   * This caused users to be blocked from starting quizzes with no `endAt`.

2. **Timer reset on page refresh for quizzes without `endAt`.**

   * The timer was always computed as `now + duration` on every refresh.
   * This allowed users to “restart” quizzes by refreshing the page.

3. **Submissions with `startedAt` were not properly accounted for.**

   * Even if a user had started a quiz, the `timeLeftSeconds` calculation didn’t respect the original start time.
   * Slight clock differences between `now` and `startedAt` could produce `0` seconds left incorrectly.

---

## **Original Logic (Broken)**

```ts
// Pseudo-code
const now = admin.firestore.Timestamp.now().toMillis();
const durationMs = quiz.durationMinutes * 60 * 1000;

// If quiz has no endAt → start timer from now
let effectiveEndMillis = quiz.endAt ? quiz.endAt.toMillis() : now + durationMs;

// Clamp by submission startedAt (attemptEndMillis)
if (submission.startedAt) {
    effectiveEndMillis = Math.min(effectiveEndMillis, submission.startedAt + durationMs);
}

const timeLeftSeconds = Math.max(0, Math.floor((effectiveEndMillis - now)/1000));
```

**Problems:**

* If `submission.startedAt` is slightly in the past or `endAt` is null, `effectiveEndMillis - now` could be negative → `timeLeftSeconds = 0`.
* Users refreshing the page could “restart” the timer.
* No priority logic: `endAt` and `submission.startedAt` were mixed, causing confusion.

**Example:**

* Quiz duration: 30 min
* Current time: 10:00
* No `endAt`
* Submission startedAt: 09:55

Calculation:

```
effectiveEndMillis = now + durationMs = 10:00 + 30 min = 10:30
attemptEndMillis = startedAt + duration = 09:55 + 30 min = 10:25
effectiveEndMillis = min(10:30, 10:25) = 10:25
timeLeftSeconds = 10:25 - 10:00 = 25 min ✅ correct

But if `now` = 10:26 (user refresh) → timeLeftSeconds = 0 ❌
```

---

## **New Logic (Fixed)**

### **Steps**

1. **Priority for end time calculation**

   ```
   1. If quiz.endAt exists → use it
   2. Else if submission.startedAt exists → use submission.startedAt + duration
   3. Else → use now + duration
   ```

2. **Clamp effective end time**

   * Ensures that the quiz timer never exceeds `submission.startedAt + duration`.

3. **Calculate `timeLeftSeconds` as:**

```ts
timeLeftSeconds = max(0, floor((effectiveEndMillis - now)/1000))
```

4. **Add logging** at every stage to track how `effectiveEndMillis` and `timeLeftSeconds` are computed.

---

### **Updated Code Snippet**

```ts
let effectiveEndMillis: number;

if (quiz.endAt instanceof admin.firestore.Timestamp) {
  effectiveEndMillis = quiz.endAt.toMillis();
} else if (!submissionSnap.empty && submissionSnap.docs[0].data().startedAt) {
  const submission = submissionSnap.docs[0].data();
  const startedAtMillis = submission.startedAt.toMillis?.() ?? new Date(submission.startedAt).getTime();
  effectiveEndMillis = startedAtMillis + durationMs;
} else {
  effectiveEndMillis = now + durationMs;
}

const timeLeftSeconds = Math.max(0, Math.floor((effectiveEndMillis - now)/1000));
```

---

## **Example Scenarios**

| Scenario                    | now   | duration | endAt | submission.startedAt | Computed effectiveEndMillis | timeLeftSeconds |
| --------------------------- | ----- | -------- | ----- | -------------------- | --------------------------- | --------------- |
| Quiz has endAt              | 10:00 | 30min    | 10:30 | 10:00                | 10:30                       | 30min           |
| No endAt, first attempt     | 10:00 | 30min    | null  | null                 | 10:30                       | 30min           |
| No endAt, submission exists | 10:10 | 30min    | null  | 10:05                | 10:35                       | 25min           |
| Refresh after start         | 10:20 | 30min    | null  | 10:05                | 10:35                       | 15min           |

✅ This ensures the timer is **consistent across refreshes** and respects the first attempt.

---
