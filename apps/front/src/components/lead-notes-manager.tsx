"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Edit, Trash, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Note {
  id: string;
  content: string;
  createdAt: string;
  createdBy: {
    name: string;
    initials: string;
  };
}

interface LeadNotesManagerProps {
  leadId: string;
}

export function LeadNotesManager({ leadId }: LeadNotesManagerProps) {
  // In a real app, you would fetch this data from an API
  const [notes, setNotes] = useState<Note[]>([
    {
      id: "note-1",
      content:
        "Client mentioned they're looking to sell within the next 3 months. They're relocating for work and need to move quickly.",
      createdAt: "2025-05-01T14:30:00Z",
      createdBy: {
        name: "Sarah Johnson",
        initials: "SJ",
      },
    },
    {
      id: "note-2",
      content:
        "Follow-up call scheduled for next week. Client wants to discuss pricing strategy and potential renovations before listing.",
      createdAt: "2025-04-28T11:15:00Z",
      createdBy: {
        name: "Michael Chen",
        initials: "MC",
      },
    },
  ]);

  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");

  const handleAddNote = () => {
    if (newNoteContent.trim()) {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        content: newNoteContent,
        createdAt: new Date().toISOString(),
        createdBy: {
          name: "Current User", // In a real app, this would be the current user
          initials: "CU",
        },
      };
      setNotes([newNote, ...notes]);
      setNewNoteContent("");
      setIsAddingNote(false);
      toast({
        title: "Note added",
        description: "Your note has been added successfully.",
      });
    }
  };

  const handleEditNote = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      setEditingNote(noteId);
      setEditedContent(note.content);
    }
  };

  const handleSaveEdit = (noteId: string) => {
    if (editedContent.trim()) {
      setNotes(
        notes.map((note) =>
          note.id === noteId
            ? {
                ...note,
                content: editedContent,
              }
            : note,
        ),
      );
      setEditingNote(null);
      setEditedContent("");
      toast({
        title: "Note updated",
        description: "Your note has been updated successfully.",
      });
    }
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter((note) => note.id !== noteId));
    toast({
      title: "Note deleted",
      description: "Your note has been deleted successfully.",
    });
  };

  const handleCancelAdd = () => {
    setIsAddingNote(false);
    setNewNoteContent("");
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setEditedContent("");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Notes</h3>
        {!isAddingNote && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setIsAddingNote(true)}
          >
            <Plus className="h-4 w-4" />
            Add Note
          </Button>
        )}
      </div>

      {isAddingNote && (
        <Card className="p-4 space-y-4">
          <Textarea
            placeholder="Enter your note here..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCancelAdd}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddNote}>
              Save Note
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No notes yet</p>
          </div>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="p-4">
              {editingNote === note.id ? (
                <div className="space-y-4">
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => handleSaveEdit(note.id)}>
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm whitespace-pre-line">{note.content}</p>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          {note.createdBy.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-xs text-muted-foreground">
                        {note.createdBy.name} •{" "}
                        {format(
                          new Date(note.createdAt),
                          "MMM d, yyyy 'at' h:mm a",
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditNote(note.id)}
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit note</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Trash className="h-4 w-4" />
                            <span className="sr-only">Delete note</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete note</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this note? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteNote(note.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
