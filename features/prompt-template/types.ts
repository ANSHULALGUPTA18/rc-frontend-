export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  usedInCampaigns: number;
  editedAt: Date;
}
