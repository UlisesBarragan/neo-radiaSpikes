
export interface Study {
  id: string;
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: string;
  description: string;
  doctorComments: {
    text: string;
    replies: { text: string; date: string }[];
    date: string;
  }[];
  files: {
    pdf: string;
    jpg: string[];
  };
  sharedWith?: string[];
  images?: string[];
}

export interface SharedHistory {
  id: string;
  sharedWith: { name: string; email: string }[];
  date: string;
  description: string;
}
