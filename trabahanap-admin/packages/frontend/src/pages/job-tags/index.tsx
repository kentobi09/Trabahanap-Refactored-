import React, { useState, useEffect } from "react";
import { MainLayout } from "../../components/layout/MainLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Search, Plus, Tag, Layers, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";

export interface JobTagData {
  id: string;
  tagId: string;
  label: string;
  category: string;
  description: string;
  isActive: boolean;
  usageCount: number;
  isCustom?: boolean;
}

export const JobTagsPage: React.FC = () => {
  const [tags, setTags] = useState<JobTagData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Add/Edit Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTag, setEditingTag] = useState<JobTagData | null>(null);
  const [formTagId, setFormTagId] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Floating Delete Confirmation Modal State
  const [tagToDelete, setTagToDelete] = useState<JobTagData | null>(null);

  const fetchTags = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("authToken") || "";
      let res = await fetch("http://localhost:8000/admin/api/job_tags", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        res = await fetch("http://localhost:8000/api/job_tags", {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (!res.ok) throw new Error("Failed to fetch job tags.");
      const data = await res.json();
      setTags(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error fetching job tags:", err);
      setError("Failed to load job tags. Please check connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const categoriesList = Array.from(
    new Set(["General", ...tags.map((t) => t.category).filter(Boolean)])
  );

  const filteredTags = tags.filter((t) => {
    const matchesCategory =
      categoryFilter === "all" ||
      t.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesQuery =
      !searchQuery ||
      t.tagId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const handleOpenAdd = () => {
    setEditingTag(null);
    setFormTagId("");
    setFormLabel("");
    setFormCategory("General");
    setFormDescription("");
    setFormIsActive(true);
    setFormError(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (tag: JobTagData) => {
    setEditingTag(tag);
    setFormTagId(tag.tagId);
    setFormLabel(tag.label);
    setFormCategory(tag.category || "General");
    setFormDescription(tag.description || "");
    setFormIsActive(tag.isActive);
    setFormError(null);
    setShowAddModal(true);
  };

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formTagId.trim() || !formLabel.trim()) {
      setFormError("Tag ID and Display Label are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("authToken") || "";
      const isEdit = !!editingTag && !editingTag.isCustom;
      const url = isEdit
        ? `http://localhost:8000/admin/api/job_tags/${editingTag.tagId}`
        : `http://localhost:8000/admin/api/job_tags`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tagId: formTagId.trim(),
          label: formLabel.trim(),
          category: formCategory,
          description: formDescription,
          isActive: formIsActive,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to save tag.");
      }

      setShowAddModal(false);
      await fetchTags();
    } catch (err: any) {
      setFormError(err.message || "Failed to save job tag.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteTag = async () => {
    if (!tagToDelete) return;
    try {
      const token = localStorage.getItem("authToken") || "";
      const res = await fetch(`http://localhost:8000/admin/api/job_tags/${tagToDelete.tagId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete tag.");
      setTagToDelete(null);
      await fetchTags();
    } catch (err: any) {
      alert("Failed to delete tag.");
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Tag className="h-8 w-8 text-indigo-600" />
              Job Categories & Tags Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Add, modify, or convert custom job tags submitted by job seekers into official marketplace skills.
            </p>
          </div>
          <Button
            onClick={handleOpenAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 font-semibold shadow-sm px-4 py-2"
          >
            <Plus className="h-4 w-4" /> Add New Job Tag
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search tag name or category..."
              className="pl-9 w-full bg-white text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-bold text-gray-700 uppercase whitespace-nowrap">Filter Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 font-medium">Loading job tags...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 font-medium">{error}</div>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700 w-16 text-center">#</TableHead>
                    <TableHead className="font-semibold text-gray-700">Display Label</TableHead>
                    <TableHead className="font-semibold text-gray-700">Category</TableHead>
                    <TableHead className="font-semibold text-gray-700">Usage (# Seekers)</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTags.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                        No job tags found matching criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTags
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((t, index) => (
                        <TableRow key={t.id} className="hover:bg-gray-50">
                          <TableCell className="text-center text-xs font-bold text-gray-500">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900">{t.label}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Layers className="h-3 w-3" />
                              {t.category}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-gray-700">{t.usageCount} active workers</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(t)}
                              className="bg-white hover:bg-gray-100 text-xs"
                            >
                              {t.isCustom ? "Promote to Official" : "Edit"}
                            </Button>
                            {!t.isCustom && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setTagToDelete(t)}
                                className="text-xs"
                              >
                                Delete
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {filteredTags.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 gap-4">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                    <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredTags.length)}</span> of{" "}
                    <span className="font-semibold">{filteredTags.length}</span> job tags
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="bg-white border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-medium text-gray-700 px-2">
                      Page {currentPage} of {Math.ceil(filteredTags.length / itemsPerPage) || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(filteredTags.length / itemsPerPage)))}
                      disabled={currentPage >= Math.ceil(filteredTags.length / itemsPerPage)}
                      className="bg-white border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md bg-white p-6 rounded-lg shadow-xl border border-gray-100 z-50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {editingTag
                ? editingTag.isCustom
                  ? "Promote Custom Skill to Official Category"
                  : "Edit Job Tag"
                : "Add New Job Tag"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveTag} className="space-y-4 mt-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tag Key / ID</label>
              <Input
                type="text"
                placeholder="e.g. bagger, solarPanelRepair"
                value={formTagId}
                onChange={(e) => setFormTagId(e.target.value)}
                disabled={!!editingTag && !editingTag.isCustom}
                required
                className="bg-gray-50 border-gray-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Display Label</label>
              <Input
                type="text"
                placeholder="e.g. Bagger, Solar Panel Repair"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                required
                className="bg-white border-gray-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 bg-white"
              >
                <option value="General">General</option>
                <option value="Home Repairs & Construction">Home Repairs & Construction</option>
                <option value="Appliance & HVAC">Appliance & HVAC</option>
                <option value="Automotive Services">Automotive Services</option>
                <option value="Personal & Care Services">Personal & Care Services</option>
                <option value="Cleaning & Maintenance">Cleaning & Maintenance</option>
                <option value="Retail & Customer Service">Retail & Customer Service</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
              <textarea
                placeholder="Brief description of skills required for this job tag..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 bg-white"
              />
            </div>

            <DialogFooter className="pt-4 flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isSubmitting ? "Saving..." : "Save Job Tag"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Floating Center Delete Confirmation Modal */}
      {tagToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Delete Tag
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete job tag <span className="font-semibold text-gray-900">"{tagToDelete.label}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => setTagToDelete(null)}
                className="bg-white border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteTag}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Tag
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default JobTagsPage;
