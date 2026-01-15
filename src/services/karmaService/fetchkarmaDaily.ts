import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { COLLECTION } from "@/constants";
import { KarmaDaily } from "@/types/karma";
import { Result, ok, fail } from "@/utils/response";
import { logError } from "@/utils/logger";
import { getYesterdayTimestamp } from "@/utils/date-time";

class fetchDailyKarma {
  async getUserKarmaHistory(userId: string, courseId?: string): Promise<Result<KarmaDaily[]>> {
    try {
      if (!userId) {
        return fail("Missing userId");
      }
      console.log("got course id here ", courseId);
      const yesterdayTs = getYesterdayTimestamp();

      const constraints = [
        where("userId", "==", userId),
        where("date", "<=", yesterdayTs),
        orderBy("date", "desc"),
      ];

      if (courseId) {
        constraints.splice(1, 0, where("courseId", "==", courseId));
      }

      const karmaQuery = query(collection(db, COLLECTION.KARMA_DAILY), ...constraints);
      const snapshot = await getDocs(karmaQuery);
      console.log("log of the snapshot", snapshot.docs);
      if (snapshot.empty) {
        return ok([]);
      }

      const karmaList: KarmaDaily[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as KarmaDaily),
      }));
      return ok(karmaList);
    } catch (error: any) {
      logError("KarmaDailyService.getUserKarmaHistory", error);
      return fail("Failed to fetch karma history.", error.code || error.message);
    }
  }
}

export const fetchDailyKarmaService = new fetchDailyKarma();
