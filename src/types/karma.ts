import { FieldValue, Timestamp } from "firebase/firestore";
import {
  CommunityAction,
  KarmaBreakdown,
  KarmaCategory,
  LearningAction,
  SocialAction,
} from "./general";
import { KARMA_CATEGORY } from "@/constants";

export interface KarmaDaily {
  id: string;
  userId: string;
  userName: string;
  courseId: string;
  date: Timestamp | FieldValue;
  karmaEarned: number;
  breakdown: KarmaBreakdown;
}

// We are using Karma Action Map so that we dont assign incorrect action types to a category
// Example KARMA_CATEGORY.LEARNING cannot have CommunityAction or SocialAction
export interface KarmaActionMap {
  [KARMA_CATEGORY.LEARNING]: LearningAction;
  [KARMA_CATEGORY.COMMUNITY]: CommunityAction;
  [KARMA_CATEGORY.SOCIAL]: SocialAction;
}

export interface KarmaRule<C extends KarmaCategory = KarmaCategory> {
  id: string;
  category: C;
  action: KarmaActionMap[C];
  points: number;
  enabled: boolean;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}
