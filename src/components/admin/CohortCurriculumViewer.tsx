import React from "react";
import { FolderOpen, BookOpen } from "lucide-react";
import { Topic, TopicItem } from "@/types/course"; // Adjust path as needed

interface CohortCurriculumViewerProps {
  topics: Topic[];
}

interface TopicComponentProps {
  topic: Topic;
}

const TopicItemComponent: React.FC<{ item: TopicItem }> = ({ item }) => {
  return (
    <div className="flex items-center gap-2 py-1 ml-6 text-sm text-muted-foreground">
      <BookOpen className="h-4 w-4 text-red-500 flex-shrink-0" />
      <span>{item.title}</span>
    </div>
  );
};

const TopicComponent: React.FC<TopicComponentProps> = ({ topic }) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 font-semibold text-base py-1">
        <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
        <span>{topic.title}</span>
      </div>
      <div className="space-y-1 pl-4">
        {topic.items.map((item) => (
          <TopicItemComponent key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

const CohortCurriculumViewer: React.FC<CohortCurriculumViewerProps> = ({ topics }) => {
  if (!topics || topics.length === 0) {
    return <p className="text-muted-foreground text-sm">No curriculum defined.</p>;
  }

  return (
    <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
      {topics.map((topic) => (
        <TopicComponent key={topic.id} topic={topic} />
      ))}
    </div>
  );
};

export default CohortCurriculumViewer;