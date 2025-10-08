
// import React, { useState, useEffect } from "react";
// import { AttributeService } from "@/services/attributeService";
// import { AttributeItem } from "@/types/attribute";

// export const AttributeManager: React.FC = () => {
//   const attributeService = new AttributeService();

//   const [categories, setCategories] = useState<AttributeItem[]>([]);
//   const [targetAudiences, setTargetAudiences] = useState<AttributeItem[]>([]);
//   const [newCategory, setNewCategory] = useState("");
//   const [newTargetAudience, setNewTargetAudience] = useState("");

//   const [editingItem, setEditingItem] = useState<{
//     type: "Category" | "TargetAudience" | null;
//     id: string;
//     name: string;
//   }>({ type: null, id: "", name: "" });

//   useEffect(() => {
//     loadData();
//   }, []);

//   const loadData = async () => {
//     const [cat, aud] = await Promise.all([
//       attributeService.getItems("Category"),
//       attributeService.getItems("TargetAudience"),
//     ]);
//     setCategories(cat);
//     setTargetAudiences(aud);
//   };

//   // ---- CATEGORY CRUD ----
//   const addCategory = async () => {
//     if (!newCategory.trim()) return;
//     const newItem: AttributeItem = { id: crypto.randomUUID(), name: newCategory.trim() };
//     await attributeService.addItem("Category", newItem);
//     setNewCategory("");
//     loadData();
//   };

//   const updateCategory = async () => {
//     if (!editingItem.name.trim()) return;
//     await attributeService.updateItem("Category", {
//       id: editingItem.id,
//       name: editingItem.name.trim(),
//     });
//     setEditingItem({ type: null, id: "", name: "" });
//     loadData();
//   };

//   const deleteCategory = async (id: string) => {
//     await attributeService.deleteItem("Category", id);
//     loadData();
//   };

//   // ---- TARGET AUDIENCE CRUD ----
//   const addTargetAudience = async () => {
//     if (!newTargetAudience.trim()) return;
//     const newItem: AttributeItem = { id: crypto.randomUUID(), name: newTargetAudience.trim() };
//     await attributeService.addItem("TargetAudience", newItem);
//     setNewTargetAudience("");
//     loadData();
//   };

//   const updateTargetAudience = async () => {
//     if (!editingItem.name.trim()) return;
//     await attributeService.updateItem("TargetAudience", {
//       id: editingItem.id,
//       name: editingItem.name.trim(),
//     });
//     setEditingItem({ type: null, id: "", name: "" });
//     loadData();
//   };

//   const deleteTargetAudience = async (id: string) => {
//     await attributeService.deleteItem("TargetAudience", id);
//     loadData();
//   };

//   // ---- UI ----
//   return (
//     <div className="p-6 border rounded-md space-y-8">
//       <h2 className="text-xl font-bold mb-4">Manage Attributes</h2>

//       {/* --- Categories --- */}
//       <section>
//         <h3 className="font-semibold mb-2">Categories</h3>
//         <ul className="mb-3 space-y-1">
//           {categories.map((cat) => (
//             <li key={cat.id} className="flex justify-between items-center border p-2 rounded">
//               {editingItem.type === "Category" && editingItem.id === cat.id ? (
//                 <input
//                   value={editingItem.name}
//                   onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
//                   onBlur={updateCategory}
//                   className="border p-1 flex-1 mr-2"
//                   autoFocus
//                 />
//               ) : (
//                 <span>{cat.name}</span>
//               )}
//               <div className="flex gap-2">
//                 <button
//                   onClick={() => setEditingItem({ type: "Category", id: cat.id, name: cat.name })}
//                   className="text-blue-600"
//                 >
//                   Edit
//                 </button>
//                 <button onClick={() => deleteCategory(cat.id)} className="text-red-600">
//                   Delete
//                 </button>
//               </div>
//             </li>
//           ))}
//         </ul>
//         <div className="flex gap-2">
//           <input
//             type="text"
//             placeholder="Add new category"
//             value={newCategory}
//             onChange={(e) => setNewCategory(e.target.value)}
//             className="border p-2 flex-1"
//           />
//           <button onClick={addCategory} className="bg-green-500 text-white px-3 py-2 rounded">
//             Add
//           </button>
//         </div>
//       </section>

//       {/* --- Target Audience --- */}
//       <section>
//         <h3 className="font-semibold mb-2">Target Audiences</h3>
//         <ul className="mb-3 space-y-1">
//           {targetAudiences.map((aud) => (
//             <li key={aud.id} className="flex justify-between items-center border p-2 rounded">
//               {editingItem.type === "TargetAudience" && editingItem.id === aud.id ? (
//                 <input
//                   value={editingItem.name}
//                   onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
//                   onBlur={updateTargetAudience}
//                   className="border p-1 flex-1 mr-2"
//                   autoFocus
//                 />
//               ) : (
//                 <span>{aud.name}</span>
//               )}
//               <div className="flex gap-2">
//                 <button
//                   onClick={() =>
//                     setEditingItem({ type: "TargetAudience", id: aud.id, name: aud.name })
//                   }
//                   className="text-blue-600"
//                 >
//                   Edit
//                 </button>
//                 <button onClick={() => deleteTargetAudience(aud.id)} className="text-red-600">
//                   Delete
//                 </button>
//               </div>
//             </li>
//           ))}
//         </ul>
//         <div className="flex gap-2">
//           <input
//             type="text"
//             placeholder="Add new audience"
//             value={newTargetAudience}
//             onChange={(e) => setNewTargetAudience(e.target.value)}
//             className="border p-2 flex-1"
//           />
//           <button onClick={addTargetAudience} className="bg-green-500 text-white px-3 py-2 rounded">
//             Add
//           </button>
//         </div>
//       </section>
//     </div>
//   );
// };
