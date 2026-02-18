import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";

export const deleteBannerSchema = {
  bannerId: z.string().describe("The banner ID to delete"),
};

export async function deleteBanner(params: { bannerId: string }) {
  const ref = db.collection(COLLECTION.BANNERS).doc(params.bannerId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new Error(`Banner not found: ${params.bannerId}`);
  }

  const data = doc.data()!;
  await ref.delete();

  return {
    bannerId: params.bannerId,
    title: data.title,
    message: `Banner "${data.title}" deleted successfully`,
  };
}
