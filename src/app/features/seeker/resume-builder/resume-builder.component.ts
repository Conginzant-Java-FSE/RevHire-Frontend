import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileService } from '../../../core/services/profile.service';
import { ThemeService } from '../../../core/services/theme.service';
import Swal from 'sweetalert2';

interface ExperienceItem {
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  summary: string;
}

interface EducationItem {
  degree: string;
  institution: string;
  year: string;
}

interface ProjectItem {
  title: string;
  tech: string;
  summary: string;
  link: string;
}

interface CertificationItem {
  name: string;
  issuer: string;
  year: string;
}

interface ResumeBuilderData {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
}

type ResumeVersionKey = 'IT' | 'GOVT' | 'STARTUP';
type ResumeTemplate = 'MODERN' | 'PROFESSIONAL' | 'MINIMAL';

interface ResumeBuilderStorage {
  activeVersion: ResumeVersionKey;
  selectedTemplate: ResumeTemplate;
  selectedRole: string;
  customRole?: string;
  versions: Partial<Record<ResumeVersionKey, ResumeBuilderData>>;
}

@Component({
  selector: 'app-resume-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './resume-builder.component.html',
  styleUrl: './resume-builder.component.css'
})
export class ResumeBuilderComponent implements OnInit, OnDestroy {
  fullName = '';
  title = '';
  email = '';
  phone = '';
  location = '';
  summary = '';

  skillInput = '';
  skills: string[] = [];

  experience: ExperienceItem[] = [this.newExperience()];
  education: EducationItem[] = [this.newEducation()];
  projects: ProjectItem[] = [this.newProject()];
  certifications: CertificationItem[] = [this.newCertification()];

  activeVersion: ResumeVersionKey = 'IT';
  selectedTemplate: ResumeTemplate = 'PROFESSIONAL';
  selectedRole = 'Software Engineer';
  customRole = '';

  readonly versionKeys: ResumeVersionKey[] = ['IT', 'GOVT', 'STARTUP'];
  readonly templateKeys: ResumeTemplate[] = ['MODERN', 'PROFESSIONAL', 'MINIMAL'];
  readonly roleOptions: string[] = [
    'Software Engineer',
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'Government Job',
    'Startup Role',
    'Others'
  ];
  readonly keywordCatalog: Record<string, string[]> = {
    'Software Engineer': ['TypeScript', 'Angular', 'REST API', 'Spring Boot', 'Microservices', 'Git', 'SQL', 'Problem Solving'],
    'Frontend Developer': ['Angular', 'React', 'JavaScript', 'TypeScript', 'CSS', 'Responsive Design', 'Performance', 'Accessibility'],
    'Backend Developer': ['Java', 'Spring Boot', 'Node.js', 'REST API', 'Database Design', 'JWT', 'Caching', 'Testing'],
    'Full Stack Developer': ['Angular', 'Java', 'Spring Boot', 'Node.js', 'SQL', 'NoSQL', 'CI/CD', 'Docker'],
    'Government Job': ['Policy', 'Documentation', 'Administration', 'Public Service', 'Compliance', 'Data Handling', 'MS Office', 'Communication'],
    'Startup Role': ['Ownership', 'Fast Learning', 'Product Thinking', 'Execution', 'Collaboration', 'Adaptability', 'Automation', 'Customer Focus'],
    'Others': ['Communication', 'Problem Solving', 'Collaboration', 'Time Management', 'Documentation', 'MS Office']
  };

  private autosaveHandle: ReturnType<typeof setInterval> | null = null;
  private lastSnapshot = '';
  collapsedSections: Record<'basic' | 'skills' | 'experience' | 'education' | 'projects' | 'certifications', boolean> = {
    basic: false,
    skills: false,
    experience: false,
    education: true,
    projects: true,
    certifications: true
  };

  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  themeService = inject(ThemeService);

  ngOnInit() {
    this.prefillFromProfile();
    this.loadDraft();
    this.startAutoSave();
  }

  ngOnDestroy() {
    if (this.autosaveHandle) {
      clearInterval(this.autosaveHandle);
      this.autosaveHandle = null;
    }
  }

  addSkill() {
    const trimmed = this.skillInput.trim();
    if (!trimmed) return;
    if (!this.skills.includes(trimmed)) {
      this.skills.push(trimmed);
    }
    this.skillInput = '';
    this.saveDraft(false);
  }

  removeSkill(index: number) {
    this.skills.splice(index, 1);
    this.saveDraft(false);
  }

  addExperience() {
    this.experience.push(this.newExperience());
    this.saveDraft(false);
  }

  removeExperience(index: number) {
    this.experience.splice(index, 1);
    if (this.experience.length === 0) this.experience.push(this.newExperience());
    this.saveDraft(false);
  }

  addEducation() {
    this.education.push(this.newEducation());
    this.saveDraft(false);
  }

  removeEducation(index: number) {
    this.education.splice(index, 1);
    if (this.education.length === 0) this.education.push(this.newEducation());
    this.saveDraft(false);
  }

  addProject() {
    this.projects.push(this.newProject());
    this.saveDraft(false);
  }

  removeProject(index: number) {
    this.projects.splice(index, 1);
    if (this.projects.length === 0) this.projects.push(this.newProject());
    this.saveDraft(false);
  }

  addCertification() {
    this.certifications.push(this.newCertification());
    this.saveDraft(false);
  }

  removeCertification(index: number) {
    this.certifications.splice(index, 1);
    if (this.certifications.length === 0) this.certifications.push(this.newCertification());
    this.saveDraft(false);
  }

  switchVersion(version: ResumeVersionKey) {
    if (version === this.activeVersion) return;
    this.saveDraft(false);
    this.activeVersion = version;
    this.loadDraftForActiveVersion();
  }

  onTemplateChange(template: ResumeTemplate) {
    this.selectedTemplate = template;
    this.saveDraft(false);
  }

  toggleSection(section: 'basic' | 'skills' | 'experience' | 'education' | 'projects' | 'certifications') {
    this.collapsedSections[section] = !this.collapsedSections[section];
  }

  get versionLabel(): string {
    if (this.activeVersion === 'GOVT') return 'Govt Resume';
    if (this.activeVersion === 'STARTUP') return 'Startup Resume';
    return 'IT Resume';
  }

  templateLabel(template: ResumeTemplate): string {
    return template.charAt(0) + template.slice(1).toLowerCase();
  }

  get completenessPercentage(): number {
    const checks = [
      !!this.fullName.trim(),
      !!this.title.trim(),
      !!this.email.trim(),
      !!this.phone.trim(),
      !!this.location.trim(),
      !!this.summary.trim(),
      this.skills.length >= 5,
      this.experience.some(e => e.role || e.company || e.summary),
      this.education.some(e => e.degree || e.institution),
      this.projects.some(p => p.title || p.summary),
      this.certifications.some(c => c.name)
    ];

    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }

  get atsResumeScore(): number {
    const keywordList = this.suggestedKeywords;
    const skillSet = new Set(this.skills.map(s => s.toLowerCase()));
    const matchedKeywords = keywordList.filter(k => skillSet.has(k.toLowerCase())).length;
    const keywordScore = keywordList.length ? Math.round((matchedKeywords / keywordList.length) * 100) : 0;

    const strongExperience = this.experience.filter(e => (e.summary || '').trim().length >= 40).length;
    const experienceScore = Math.min(100, strongExperience * 35);

    const score = Math.round(this.completenessPercentage * 0.6 + keywordScore * 0.25 + experienceScore * 0.15);
    return Math.min(100, Math.max(0, score));
  }

  get suggestedKeywords(): string[] {
    return this.keywordCatalog[this.selectedRole] || this.keywordCatalog['Others'];
  }

  get missingKeywords(): string[] {
    const skillSet = new Set(this.skills.map(s => s.toLowerCase()));
    return this.suggestedKeywords.filter(k => !skillSet.has(k.toLowerCase()));
  }

  get selectedRoleLabel(): string {
    if (this.selectedRole !== 'Others') return this.selectedRole;
    return this.customRole.trim() || 'custom role';
  }

  saveDraft(showToast = true) {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    const existing = this.readStorage(userId);
    const next: ResumeBuilderStorage = {
      activeVersion: this.activeVersion,
      selectedTemplate: this.selectedTemplate,
      selectedRole: this.selectedRole,
      customRole: this.customRole,
      versions: {
        ...(existing?.versions || {}),
        [this.activeVersion]: this.exportData()
      }
    };

    localStorage.setItem(this.storageKey(userId), JSON.stringify(next));
    this.lastSnapshot = this.currentSnapshot();

    if (showToast) {
      Swal.fire({ icon: 'success', title: 'Saved', text: 'Resume draft saved locally.', timer: 1200, showConfirmButton: false });
    }
  }

  loadDraft() {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    const parsed = this.readStorage(userId);
    if (!parsed) return;

    this.activeVersion = parsed.activeVersion || 'IT';
    this.selectedTemplate = parsed.selectedTemplate || 'PROFESSIONAL';
    this.customRole = parsed.customRole || '';

    if (parsed.selectedRole && this.roleOptions.includes(parsed.selectedRole)) {
      this.selectedRole = parsed.selectedRole;
    } else if (parsed.selectedRole) {
      this.selectedRole = 'Others';
      this.customRole = parsed.selectedRole;
    } else {
      this.selectedRole = 'Software Engineer';
    }

    const versionData = parsed.versions?.[this.activeVersion];
    if (versionData) {
      this.applyData(versionData);
    }

    this.lastSnapshot = this.currentSnapshot();
  }

  clearDraft() {
    Swal.fire({
      title: 'Clear Resume Draft?',
      text: 'This clears your local resume builder data.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545'
    }).then(result => {
      if (!result.isConfirmed) return;

      const userId = this.authService.currentUser()?.id;
      if (userId) {
        localStorage.removeItem(this.storageKey(userId));
      }
      this.resetData();
      this.activeVersion = 'IT';
      this.selectedTemplate = 'PROFESSIONAL';
      this.selectedRole = 'Software Engineer';
      this.customRole = '';
      Swal.fire({ icon: 'success', title: 'Cleared', timer: 1000, showConfirmButton: false });
    });
  }

  onRoleChange(role: string) {
    this.selectedRole = role;
    if (role !== 'Others') {
      this.customRole = '';
    }
    this.saveDraft(false);
  }

  importFromParsedResume() {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.profileService.getResume(userId).subscribe({
      next: (res) => {
        const resume: any = res.data || {};

        // Append unique skills
        const importedSkills = this.toTextArray(resume.skillsList);
        importedSkills.forEach(s => {
          if (!this.skills.includes(s)) this.skills.push(s);
        });

        // Append experience
        const importedExp = this.toExperienceArray(resume.experienceList);
        if (importedExp.length > 0) {
          this.experience = this.experience.filter(e => e.role || e.company || e.summary).concat(importedExp);
        }

        // Append education
        const importedEdu = this.toEducationArray(resume.educationList);
        if (importedEdu.length > 0) {
          this.education = this.education.filter(e => e.degree || e.institution).concat(importedEdu);
        }

        // Append projects
        const importedProj = this.toProjectArray(resume.projectsList);
        if (importedProj.length > 0) {
          this.projects = this.projects.filter(p => p.title || p.summary).concat(importedProj);
        }

        // Append Certifications
        const importedCerts = this.toCertificationArray(resume.certificationsList);
        if (importedCerts.length > 0) {
          this.certifications = this.certifications.filter(c => c.name).concat(importedCerts);
        }

        if (!this.summary && resume.objective) {
          this.summary = typeof resume.objective === 'string' ? resume.objective : JSON.stringify(resume.objective);
        }

        if (this.experience.length === 0) this.experience = [this.newExperience()];
        if (this.education.length === 0) this.education = [this.newEducation()];
        if (this.projects.length === 0) this.projects = [this.newProject()];
        if (this.certifications.length === 0) this.certifications = [this.newCertification()];

        this.saveDraft(false);
        Swal.fire({ icon: 'success', title: 'Imported', text: 'Parsed resume data loaded into builder.', timer: 1400, showConfirmButton: false });
      },
      error: () => {
        Swal.fire('Not Available', 'No parsed resume data found to import.', 'info');
      }
    });
  }

  printResume() {
    this.saveDraft(false);
    window.print();
  }

  exportPdf() {
    this.printResume();
  }

  downloadAsText() {
    this.saveDraft(false);

    const text = this.generatePlainText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(this.fullName || 'resume').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private prefillFromProfile() {
    this.profileService.getCurrentProfile().subscribe({
      next: (res) => {
        const profile = res.data;
        if (!profile) return;

        this.fullName = this.fullName || profile.name || '';
        this.email = this.email || profile.email || '';
        this.phone = this.phone || profile.phone || '';
        this.location = this.location || profile.location || '';
      }
    });
  }

  private storageKey(userId: number): string {
    return `resume_builder_${userId}`;
  }

  private exportData(): ResumeBuilderData {
    return {
      fullName: this.fullName,
      title: this.title,
      email: this.email,
      phone: this.phone,
      location: this.location,
      summary: this.summary,
      skills: this.skills,
      experience: this.experience,
      education: this.education,
      projects: this.projects,
      certifications: this.certifications
    };
  }

  private applyData(data: ResumeBuilderData) {
    this.fullName = data.fullName || '';
    this.title = data.title || '';
    this.email = data.email || '';
    this.phone = data.phone || '';
    this.location = data.location || '';
    this.summary = data.summary || '';
    this.skills = Array.isArray(data.skills) ? data.skills : [];
    this.experience = Array.isArray(data.experience) && data.experience.length ? data.experience : [this.newExperience()];
    this.education = Array.isArray(data.education) && data.education.length ? data.education : [this.newEducation()];
    this.projects = Array.isArray(data.projects) && data.projects.length ? data.projects : [this.newProject()];
    this.certifications = Array.isArray(data.certifications) && data.certifications.length ? data.certifications : [this.newCertification()];
  }

  private resetData() {
    this.fullName = '';
    this.title = '';
    this.email = '';
    this.phone = '';
    this.location = '';
    this.summary = '';
    this.skillInput = '';
    this.skills = [];
    this.experience = [this.newExperience()];
    this.education = [this.newEducation()];
    this.projects = [this.newProject()];
    this.certifications = [this.newCertification()];
    this.prefillFromProfile();
  }

  private readStorage(userId: number): ResumeBuilderStorage | null {
    const raw = localStorage.getItem(this.storageKey(userId));
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.versions) {
        return parsed as ResumeBuilderStorage;
      }

      // Backward compatibility with older single-version drafts.
      return {
        activeVersion: 'IT',
        selectedTemplate: 'PROFESSIONAL',
        selectedRole: 'Software Engineer',
        customRole: '',
        versions: { IT: parsed as ResumeBuilderData }
      };
    } catch {
      return null;
    }
  }

  private loadDraftForActiveVersion() {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    const parsed = this.readStorage(userId);
    const data = parsed?.versions?.[this.activeVersion];
    if (data) {
      this.applyData(data);
      this.lastSnapshot = this.currentSnapshot();
      return;
    }

    this.resetData();
    this.lastSnapshot = this.currentSnapshot();
  }

  private startAutoSave() {
    this.autosaveHandle = setInterval(() => {
      const userId = this.authService.currentUser()?.id;
      if (!userId) return;

      const snapshot = this.currentSnapshot();
      if (snapshot === this.lastSnapshot) return;

      this.saveDraft(false);
    }, 7000);
  }

  private currentSnapshot(): string {
    return JSON.stringify({
      version: this.activeVersion,
      template: this.selectedTemplate,
      role: this.selectedRole,
      customRole: this.customRole,
      data: this.exportData()
    });
  }

  private newExperience(): ExperienceItem {
    return { role: '', company: '', startDate: '', endDate: '', summary: '' };
  }

  private newEducation(): EducationItem {
    return { degree: '', institution: '', year: '' };
  }

  private newProject(): ProjectItem {
    return { title: '', tech: '', summary: '', link: '' };
  }

  private newCertification(): CertificationItem {
    return { name: '', issuer: '', year: '' };
  }

  private toTextArray(list: unknown): string[] {
    if (!Array.isArray(list)) return [];
    return list
      .map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const maybe = (item as any).name || (item as any).skill || (item as any).title;
          return maybe ? String(maybe) : '';
        }
        return '';
      })
      .filter(Boolean);
  }

  private toExperienceArray(list: unknown): ExperienceItem[] {
    if (!Array.isArray(list)) return [];
    return list.map((item: any) => ({
      role: item?.role || item?.title || '',
      company: item?.company || item?.organization || '',
      startDate: item?.startDate || '',
      endDate: item?.endDate || '',
      summary: item?.summary || item?.description || (typeof item === 'string' ? item : '')
    }));
  }

  private toEducationArray(list: unknown): EducationItem[] {
    if (!Array.isArray(list)) return [];
    return list.map((item: any) => ({
      degree: item?.degree || item?.title || (typeof item === 'string' ? item : ''),
      institution: item?.institution || item?.school || '',
      year: item?.year || item?.endYear || ''
    }));
  }

  private toProjectArray(list: unknown): ProjectItem[] {
    if (!Array.isArray(list)) return [];
    return list.map((item: any) => ({
      title: item?.title || item?.name || (typeof item === 'string' ? item : ''),
      tech: item?.tech || item?.technology || '',
      summary: item?.summary || item?.description || '',
      link: item?.link || item?.url || ''
    }));
  }

  private toCertificationArray(list: unknown): CertificationItem[] {
    if (!Array.isArray(list)) return [];
    return list.map((item: any) => ({
      name: item?.name || item?.title || (typeof item === 'string' ? item : ''),
      issuer: item?.issuer || item?.organization || '',
      year: item?.year || ''
    }));
  }

  private generatePlainText(): string {
    const lines: string[] = [];

    lines.push(`${this.fullName}`);
    if (this.title) lines.push(this.title);
    lines.push([this.email, this.phone, this.location].filter(Boolean).join(' | '));
    lines.push('');

    if (this.summary) {
      lines.push('SUMMARY');
      lines.push(this.summary);
      lines.push('');
    }

    if (this.skills.length) {
      lines.push('SKILLS');
      lines.push(this.skills.join(', '));
      lines.push('');
    }

    const validExperience = this.experience.filter(e => e.role || e.company || e.summary);
    if (validExperience.length) {
      lines.push('EXPERIENCE');
      for (const exp of validExperience) {
        lines.push(`${exp.role}${exp.company ? ` - ${exp.company}` : ''}`);
        lines.push(`${exp.startDate || ''}${exp.endDate ? ` to ${exp.endDate}` : ''}`.trim());
        if (exp.summary) lines.push(exp.summary);
        lines.push('');
      }
    }

    const validEducation = this.education.filter(e => e.degree || e.institution);
    if (validEducation.length) {
      lines.push('EDUCATION');
      for (const edu of validEducation) {
        lines.push(`${edu.degree}${edu.institution ? ` - ${edu.institution}` : ''}${edu.year ? ` (${edu.year})` : ''}`);
      }
      lines.push('');
    }

    const validProjects = this.projects.filter(p => p.title || p.summary);
    if (validProjects.length) {
      lines.push('PROJECTS');
      for (const p of validProjects) {
        lines.push(`${p.title}${p.tech ? ` (${p.tech})` : ''}`);
        if (p.summary) lines.push(p.summary);
        if (p.link) lines.push(p.link);
        lines.push('');
      }
    }

    const validCerts = this.certifications.filter(c => c.name);
    if (validCerts.length) {
      lines.push('CERTIFICATIONS');
      for (const cert of validCerts) {
        lines.push(`${cert.name}${cert.issuer ? ` - ${cert.issuer}` : ''}${cert.year ? ` (${cert.year})` : ''}`);
      }
    }

    return lines.join('\n').trim();
  }
}
