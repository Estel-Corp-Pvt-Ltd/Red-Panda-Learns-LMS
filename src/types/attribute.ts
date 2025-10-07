// Single attribute item
 export interface AttributeItem {
  id: string;    // unique identifier
  name: string;  // display name
}

// Document structure
export interface AttributeDocument {
  items: AttributeItem[];
}

// Attribute collection schema (just types, not a const)
export interface AttributeCollection {
  Category: AttributeDocument;
  TargetAudience: AttributeDocument;
}
