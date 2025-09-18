import { CourseStatus, PricingModel } from "./general";

export interface TopicItem {
    id: string;
    title: string;
};

export interface Topic {
    id: string;
    title: string;
    items: TopicItem[];
};

export interface Course {
    id: string;
    title: string;
    url: string;
    description: string;
    regularPrice: number;
    salePrice: number;
    pricingModel: PricingModel;
    tags: string[];
    categories: string[];
    authorId: string;
    authorName: string;
    status: CourseStatus;
    certificateTemplateId?: string;
    topics: Topic[];
    isEnrollmentPaused: boolean;
    createdAt: Date;
    updatedAt: Date;
};
