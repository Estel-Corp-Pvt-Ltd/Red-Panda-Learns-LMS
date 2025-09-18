import { ATTACHMENT_TYPE, LESSON_SCOPE, LESSON_TYPE, VIDEO_SOURCE } from "@/constants";

export type Attachment = typeof ATTACHMENT_TYPE[keyof typeof ATTACHMENT_TYPE];
export type LessonType = typeof LESSON_TYPE[keyof typeof LESSON_TYPE];
export type VideoSource = typeof VIDEO_SOURCE[keyof typeof VIDEO_SOURCE];
export type LessonScope = typeof LESSON_SCOPE[keyof typeof LESSON_SCOPE];

export type Lesson = {
    id: string;
    title: string;
    type: LessonType;
    description: string;
    embedUrl: string;
    durationSeconds: number;
    scope: LessonScope;
    createdAt: Date;
    updatedAt: Date;
};

export type LessonAttachment = {
    id: string;
    name: string;
    url: string;
    type: Attachment;
    durationSeconds?: number;
    videoSource?: VideoSource;
    size?: number;
    createdAt: Date;
    updatedAt: Date;
};
