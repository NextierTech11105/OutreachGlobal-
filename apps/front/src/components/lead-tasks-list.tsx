"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  assignedTo?: string;
}

interface LeadTasksListProps {
  leadId: string;
}

export function LeadTasksList({ leadId }: LeadTasksListProps) {
  // In a real app, you would fetch this data from an API
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "task-1",
      title: "Schedule property viewing",
      completed: false,
      dueDate: "2025-05-15T14:00:00Z",
      assignedTo: "Michael Chen",
    },
    {
      id: "task-2",
      title: "Send market analysis report",
      completed: false,
      dueDate: "2025-05-18T09:00:00Z",
      assignedTo: "Sarah Johnson",
    },
    {
      id: "task-3",
      title: "Follow up on mortgage pre-approval",
      completed: true,
      dueDate: "2025-05-10T11:00:00Z",
      assignedTo: "Michael Chen",
    },
  ]);

  const [newTask, setNewTask] = useState({
    title: "",
    dueDate: undefined as Date | undefined,
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleTaskToggle = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  const handleAddTask = () => {
    if (newTask.title.trim()) {
      const task: Task = {
        id: `task-${Date.now()}`,
        title: newTask.title,
        completed: false,
        dueDate: newTask.dueDate?.toISOString(),
        assignedTo: "Michael Chen", // In a real app, this would be the current user or selected user
      };
      setTasks([task, ...tasks]);
      setNewTask({ title: "", dueDate: undefined });
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Tasks</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
              <DialogDescription>
                Create a new task for this lead.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">Task Title</Label>
                <Input
                  id="task-title"
                  placeholder="Enter task title"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newTask.dueDate && "text-muted-foreground",
                      )}
                    >
                      {newTask.dueDate
                        ? format(newTask.dueDate, "PPP")
                        : "Select a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newTask.dueDate}
                      onSelect={(date) =>
                        setNewTask({ ...newTask, dueDate: date || undefined })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTask}>Add Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No tasks yet</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-start gap-2 p-3 rounded-lg",
                task.completed ? "bg-muted/50" : "bg-background border",
              )}
            >
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => handleTaskToggle(task.id)}
                className="mt-1"
              />
              <div className="space-y-1 flex-1">
                <p
                  className={cn(
                    "text-sm",
                    task.completed && "line-through text-muted-foreground",
                  )}
                >
                  {task.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {task.dueDate && (
                    <>
                      <span>
                        Due {format(new Date(task.dueDate), "MMM d, yyyy")}
                      </span>
                      <span>•</span>
                    </>
                  )}
                  {task.assignedTo && (
                    <span>Assigned to {task.assignedTo}</span>
                  )}
                </div>
              </div>
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  task.completed
                    ? "bg-green-500"
                    : new Date(task.dueDate || "") < new Date()
                      ? "bg-red-500"
                      : "bg-yellow-500",
                )}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
