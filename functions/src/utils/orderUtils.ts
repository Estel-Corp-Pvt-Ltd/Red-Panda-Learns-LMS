import { OrderItem } from "./validators";
import * as functions from "firebase-functions";
import { courseService } from "../services/courseService";
import { bundleService } from "../services/bundleService";
import { couponService } from "../services/couponService";
import { fail, ok } from "./response";
import { ItemsDetails } from "./types";

export const getItemsDetails = async (items: OrderItem[]) => {
  const itemsDetails: ItemsDetails[] = [];

  await Promise.all(items.map(async (item) => {
    if (item.itemType === "COURSE") {
      const result = await courseService.getCourseById(item.itemId);
      if (result.success && result.data) {
        itemsDetails.push({
          name: result.data.title,
          amount: result.data.salePrice,
          itemType: "COURSE",
          itemId: item.itemId,
        });
      } else {
        functions.logger.warn("Course not found for item ID:", item.itemId, result.error);
      }
    } else if (item.itemType === "BUNDLE") {
      const result = await bundleService.getBundleById(item.itemId);
      if (result.success && result.data) {
        itemsDetails.push({
          name: result.data.title,
          amount: result.data.salePrice,
          itemType: "BUNDLE",
          itemId: item.itemId,
        });
      } else {
        functions.logger.warn("Bundle not found for item ID:", item.itemId, result.error);
      }
    }
  }));

  const originalAmount = itemsDetails.reduce((sum, item) => sum + item.amount, 0);

  return { itemsDetails, originalAmount };
};


export const getCouponDiscount = async (items: ItemsDetails[], couponCode: string) => {
  const couponResult = await couponService.getCouponByCode(couponCode);

  if (couponResult.success && couponResult.data) {
    const { discountPercentage, linkedCourseIds, linkedBundleIds } = couponResult.data;

    const totalDiscount = items.reduce((acc, item) => {
      const { itemType, itemId, amount } = item;

      if (itemType === "COURSE" && linkedCourseIds.includes(itemId)) {
        return acc + (amount * (discountPercentage ?? 0)) / 100;
      }
      if (itemType === "BUNDLE" && linkedBundleIds.includes(itemId)) {
        return acc + (amount * (discountPercentage ?? 0)) / 100;
      }
      return 0;
    }, 0);

    return ok(totalDiscount);
  }
  return fail("Invalid coupon code");
};
