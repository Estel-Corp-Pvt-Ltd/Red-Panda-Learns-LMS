export interface CoursePageHeading {
  id: string;
  title: string;
  items: CoursePageContentItem[];
}

export interface CoursePageContentItem {
  type: "COURSE" | "BUNDLE";
  refId: string;
  title?: string;
}

export interface CourseArrangement {
  id: string;
  headings: CoursePageHeading[];
  createdAt: Date;
  updatedAt: Date;
}
