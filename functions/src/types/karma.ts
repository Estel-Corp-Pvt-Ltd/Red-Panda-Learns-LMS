import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  CommunityAction,
  KarmaBreakdown,
  KarmaCategory,
  LearningAction,
  SocialAction,
} from "./general";
import { KARMA_CATEGORY } from "../constants";

export interface KarmaDaily {
  id: string;
  userId: string;
  userName: string;
  courseId: string;
  date: Timestamp | FieldValue;
  karmaEarned: number;
  breakdown: KarmaBreakdown;
}

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
