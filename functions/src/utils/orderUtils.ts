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
  const discountItems: ItemsDetails[] = [];
  const couponResult = await couponService.getCouponByCode(couponCode);

  let restUsages = 0;

  if (couponResult.success && couponResult.data) {
    restUsages = couponResult.data.usageLimit - couponResult.data.totalUsed;
    const { discountPercentage, linkedCourseIds, linkedBundleIds } = couponResult.data;

    items.forEach((item) => {
      if (restUsages <= 0) return;
      if (item.itemType === "COURSE" && linkedCourseIds.includes(item.itemId)) {
        discountItems.push(item);
        restUsages--;
      } else if (item.itemType === "BUNDLE" && linkedBundleIds.includes(item.itemId)) {
        discountItems.push(item);
        restUsages--;
      }
    });

    const totalDiscount = discountItems.reduce((acc, item) => {
      return acc + (item.amount * (discountPercentage ?? 0)) / 100;
    }, 0);

    return ok({ couponId: couponResult.data.id, discountItems, totalDiscount });
  }
  return fail("Invalid coupon code");
};
