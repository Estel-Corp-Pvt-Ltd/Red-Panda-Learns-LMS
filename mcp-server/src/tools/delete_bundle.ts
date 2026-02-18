import { db } from "../firebase.js";
import { COLLECTION } from "../constants.js";
import { z } from "zod";

export const deleteBundleSchema = {
  bundleId: z.string().describe("The bundle ID to delete (e.g. bundle_10001234)"),
};

export async function deleteBundle(params: { bundleId: string }) {
  const bundleRef = db.collection(COLLECTION.BUNDLES).doc(params.bundleId);
  const bundleDoc = await bundleRef.get();

  if (!bundleDoc.exists) {
    throw new Error(`Bundle not found: ${params.bundleId}`);
  }

  const data = bundleDoc.data()!;
  await bundleRef.delete();

  return {
    bundleId: params.bundleId,
    title: data.title,
    message: `Bundle "${data.title}" deleted successfully`,
  };
}
