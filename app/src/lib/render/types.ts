export interface CandidateContact {
  name: string
  location: string
  phone: string
  email: string
  linkedin?: string
}

export interface ExperienceItem {
  role: string
  company: string
  period: string
  location: string
  bullets: string[]
}

export interface EducationItem {
  degree: string
  institution: string
  location: string
  period: string
  achievement?: string
}

export interface ResumeData {
  candidate: CandidateContact
  summary: string
  key_skills: string[]
  experience: ExperienceItem[]
  education: EducationItem[]
  certifications: string
  technical_skills: string[]
  additional_info: string[]
}

export interface CoverLetterData {
  candidate: CandidateContact
  date: string
  recipient_name: string
  company: string
  address: string
  salutation: string
  paragraphs: string[]
  closing: string
}
