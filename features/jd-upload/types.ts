export type WorkshopStageId = "upload" | "prompt-selection" | "pricing";

export type WorkshopStageStatus = "active" | "upcoming" | "complete";

export type WorkshopActiveStage = WorkshopStageId;

export interface WorkshopStage {
  id: WorkshopStageId;
  label: string;
  status: WorkshopStageStatus;
}

export interface SelectedJdFile {
  id: string;
  file: File;
}

export const ACCEPTED_JD_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;
export const ACCEPTED_JD_MIME =
  "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
export const MAX_JD_FILE_BYTES = 10 * 1024 * 1024;
