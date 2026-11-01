import { useState, useEffect } from 'react'
import { Building2, Briefcase, FileBadge, Users, FileText, Plus, Trash2, ChevronLeft, Save, Pencil, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { tm } from '../lib/ui'
import { api } from '../lib/api'
import { useNavigate } from 'react-router-dom'

const TABS = [
  { id: 'info',           label: 'General Info',  icon: Building2 },
  { id: 'registrations',  label: 'Registrations', icon: FileText  },
  { id: 'experience',     label: 'Experience',    icon: Briefcase },
  { id: 'certifications', label: 'Certifications',icon: FileBadge },
  { id: 'team',           label: 'Team',          icon: Users     },
]

export function CompanyProfile() {
  const [activeTab, setActiveTab] = useState('info')
  const [company,   setCompany]   = useState<any>({
    name:'', company_type:'', industry:'', description:'',
    website:'', email:'', phone:'', city:'', state:'', country:''
  })
  const [saving,  setSaving]  = useState(false)
  const [isNew,   setIsNew]   = useState(true)
  const [editMode,setEditMode]= useState(false)
  const [toast,   setToast]   = useState('')
  const navigate = useNavigate()

  const [projects,       setProjects]       = useState<any[]>([])
  const [certifications, setCertifications] = useState<any[]>([])
  const [team,           setTeam]           = useState<any[]>([])

  useEffect(() => {
    api.get('/company').then(r => {
      setCompany(r.data); setIsNew(false)
      setProjects(r.data.projects || [])
      setCertifications(r.data.certifications || [])
      setTeam(r.data.team_members || [])
    }).catch(() => { setIsNew(true); setEditMode(true) })
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isNew) {
        await api.post('/company', company)
        setIsNew(false); setEditMode(false)
        showToast('Company profile created!')
        setTimeout(() => navigate('/'), 1500)
      } else {
        await api.put('/company', company)
        setEditMode(false); showToast('Profile saved.')
      }
    } catch { showToast('Failed to save profile.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4 max-w-5xl tm-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button onClick={() => navigate(-1)} className={cn(tm.btn, tm.btnGhost, tm.btnIcon)}>
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 className={tm.h1}>Company Profile</h1>
            <p className={tm.sub}>Manage your company details, experience and certifications</p>
          </div>
        </div>

        {activeTab === 'info' && (
          editMode ? (
            <div className="flex gap-2">
              {!isNew && (
                <button onClick={() => setEditMode(false)} className={cn(tm.btn, tm.btnSec, tm.btnSm)}>
                  <X size={13} /> Cancel
                </button>
              )}
              <button onClick={handleSave} disabled={saving} className={cn(tm.btn, tm.btnBrand, tm.btnSm, saving && 'opacity-70')}>
                <Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditMode(true)} className={cn(tm.btn, tm.btnOutline, tm.btnSm)}>
              <Pencil size={13} /> Edit Profile
            </button>
          )
        )}
      </div>

      {/* Card */}
      <div className={cn(tm.card, 'overflow-hidden')}>
        {/* Tabs */}
        <div className="flex border-b border-border px-3 overflow-x-auto gap-0.5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-all',
                activeTab === t.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-text2 hover:text-text hover:border-border'
              )}>
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'info'           && <GeneralInfoTab    company={company}       setCompany={setCompany}           editMode={editMode} />}
          {activeTab === 'registrations'  && <RegistrationsTab  company={company}       showToast={showToast} />}
          {activeTab === 'experience'     && <ExperienceTab     projects={projects}     setProjects={setProjects}         showToast={showToast} />}
          {activeTab === 'certifications' && <CertificationsTab certifications={certifications} setCertifications={setCertifications} showToast={showToast} />}
          {activeTab === 'team'           && <TeamTab           team={team}             setTeam={setTeam}                 showToast={showToast} />}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 bg-text text-bg text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-xl z-50 tm-pop">
          {toast}
        </div>
      )}
    </div>
  )
}

/* ── General Info ─────────────────────────────────────────────────────── */
function GeneralInfoTab({ company, setCompany, editMode }: any) {
  const s = (f: string, v: string) => setCompany((p: any) => ({ ...p, [f]: v }))
  const ro = !editMode

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <SecHead>Basic Information</SecHead>
          <Fld label="Company Name *"><input readOnly={ro} value={company.name||''} onChange={e=>s('name',e.target.value)} className={ro?roInp:edInp} placeholder="Acme Corp" /></Fld>
          <Fld label="Company Type"><input readOnly={ro} value={company.company_type||''} onChange={e=>s('company_type',e.target.value)} className={ro?roInp:edInp} placeholder="Private Limited" /></Fld>
          <Fld label="Industry"><input readOnly={ro} value={company.industry||''} onChange={e=>s('industry',e.target.value)} className={ro?roInp:edInp} placeholder="IT & Software" /></Fld>
          <Fld label="Description">
            <textarea readOnly={ro} value={company.description||''} onChange={e=>s('description',e.target.value)} rows={4} className={cn(ro?roInp:edInp,'resize-none')} placeholder="Brief description…" />
          </Fld>
        </div>
        <div className="space-y-4">
          <SecHead>Contact Details</SecHead>
          <Fld label="Website"><input readOnly={ro} value={company.website||''} onChange={e=>s('website',e.target.value)} className={ro?roInp:edInp} placeholder="https://company.com" /></Fld>
          <Fld label="Email"><input readOnly={ro} value={company.email||''} onChange={e=>s('email',e.target.value)} className={ro?roInp:edInp} placeholder="info@company.com" /></Fld>
          <Fld label="Phone"><input readOnly={ro} value={company.phone||''} onChange={e=>s('phone',e.target.value)} className={ro?roInp:edInp} placeholder="+91 98765 43210" /></Fld>
          <div className="grid grid-cols-2 gap-3">
            <Fld label="City"><input readOnly={ro} value={company.city||''} onChange={e=>s('city',e.target.value)} className={ro?roInp:edInp} /></Fld>
            <Fld label="State"><input readOnly={ro} value={company.state||''} onChange={e=>s('state',e.target.value)} className={ro?roInp:edInp} /></Fld>
          </div>
          <Fld label="Country"><input readOnly={ro} value={company.country||''} onChange={e=>s('country',e.target.value)} className={ro?roInp:edInp} /></Fld>
        </div>
      </div>

      {/* Financial section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <SecHead>Financial &amp; Eligibility Details</SecHead>
          <span className={cn(tm.badge, tm.bBrand, 'text-[10px]')}>Used for AI matching</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label:'Founded Year',            key:'founded_year',        type:'number', ph:'e.g. 2010',  hint:'Calculates years in business' },
            { label:'Annual Turnover (₹ Cr)',  key:'annual_turnover_cr',  type:'number', ph:'e.g. 5.25',  hint:'Average annual turnover (Crore INR)' },
            { label:'Net Worth (₹ Crore)',      key:'net_worth_cr',        type:'number', ph:'e.g. 2.50',  hint:'Per last audited balance sheet' },
            { label:'Bank Solvency (₹ Crore)',  key:'solvency_amount_cr',  type:'number', ph:'e.g. 5.0',   hint:'Solvency certificate amount' },
            { label:'Number of Employees',      key:'num_employees',        type:'number', ph:'e.g. 45',    hint:'Total full-time technical staff' },
          ].map(f => (
            <Fld key={f.key} label={f.label}>
              <input readOnly={ro} type={f.type} value={(company[f.key])||''} onChange={e=>s(f.key,e.target.value)}
                className={ro?roInp:edInp} placeholder={f.ph} />
              <p className="text-[10px] text-muted mt-1">{f.hint}</p>
            </Fld>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Registrations ────────────────────────────────────────────────────── */
function RegistrationsTab({ company, showToast }: any) {
  const existing = company.registrations?.[0]
  const [form, setForm] = useState({ gst:existing?.gst||'', pan:existing?.pan||'', registration_number:existing?.registration_number||'', other_details:existing?.other_details||'' })
  const [editMode, setEditMode] = useState(!existing)
  const [saving, setSaving] = useState(false)
  const s = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  const save = async () => {
    setSaving(true)
    try {
      existing ? await api.put(`/company/registrations/${existing.id}`, form) : await api.post('/company/registrations', form)
      setEditMode(false); showToast('Registration details saved.')
    } catch { showToast('Failed to save.') }
    finally { setSaving(false) }
  }

  const ro = !editMode
  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <SecHead>Government Registrations</SecHead>
        {!editMode && (
          <button onClick={() => setEditMode(true)} className={cn(tm.btn, tm.btnOutline, tm.btnSm)}>
            <Pencil size={12} /> Edit
          </button>
        )}
      </div>
      {[
        { label:'GST Number',                   key:'gst',                 ph:'22AAAAA0000A1Z5' },
        { label:'PAN Number',                   key:'pan',                 ph:'AAAAA0000A'      },
        { label:'Company Registration Number',  key:'registration_number', ph:''               },
      ].map(f => (
        <Fld key={f.key} label={f.label}>
          <input readOnly={ro} value={(form as any)[f.key]} onChange={e=>s(f.key,e.target.value)} className={ro?roInp:edInp} placeholder={f.ph} />
        </Fld>
      ))}
      <Fld label="Other Details (MSME / Udyam etc.)">
        <textarea readOnly={ro} value={form.other_details} onChange={e=>s('other_details',e.target.value)} rows={3} className={cn(ro?roInp:edInp,'resize-none')} />
      </Fld>
      {editMode && (
        <div className="flex gap-2 justify-end pt-2">
          {existing && <button onClick={()=>setEditMode(false)} className={cn(tm.btn, tm.btnSec, tm.btnSm)}>Cancel</button>}
          <button onClick={save} disabled={saving} className={cn(tm.btn, tm.btnBrand, tm.btnSm, saving&&'opacity-70')}>
            {saving?'Saving…':'Save Registration Details'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Experience ───────────────────────────────────────────────────────── */
function ExperienceTab({ projects, setProjects, showToast }: any) {
  const empty = { project_name:'', client:'', project_value:'', project_category:'', description:'' }
  const [form, setForm] = useState(empty)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  const add = async () => {
    if (!form.project_name.trim()) return; setSaving(true)
    try {
      const r = await api.post('/company/projects', { ...form, project_value: form.project_value ? parseFloat(form.project_value) : null })
      setProjects((p: any[]) => [...p, r.data]); setForm(empty); setAdding(false); showToast('Project added.')
    } catch { showToast('Failed to add project.') }
    finally { setSaving(false) }
  }

  const del = async (id: number) => {
    try { await api.delete(`/company/projects/${id}`); setProjects((p: any[])=>p.filter(x=>x.id!==id)); showToast('Removed.') }
    catch { showToast('Failed.') }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <SecHead>Project Experience ({projects.length})</SecHead>
        <button onClick={()=>setAdding(!adding)} className={cn(tm.btn, tm.btnOutline, tm.btnSm)}><Plus size={12}/> Add Project</button>
      </div>
      {adding && (
        <FormBox>
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Project Name *"><input value={form.project_name} onChange={e=>setForm(f=>({...f,project_name:e.target.value}))} className={edInp} /></Fld>
            <Fld label="Client"><input value={form.client} onChange={e=>setForm(f=>({...f,client:e.target.value}))} className={edInp} /></Fld>
            <Fld label="Value (₹)"><input type="number" value={form.project_value} onChange={e=>setForm(f=>({...f,project_value:e.target.value}))} className={edInp} /></Fld>
            <Fld label="Category"><input value={form.project_category} onChange={e=>setForm(f=>({...f,project_category:e.target.value}))} className={edInp} placeholder="IT, Construction…"/></Fld>
          </div>
          <Fld label="Description"><textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} className={cn(edInp,'resize-none')}/></Fld>
          <FormActions onCancel={()=>setAdding(false)} onSave={add} saving={saving} />
        </FormBox>
      )}
      {projects.length === 0 && !adding
        ? <Empty icon={Briefcase} title="No projects yet" desc="Add project experience to improve eligibility matching" />
        : <div className="space-y-2">
            {projects.map((p: any) => (
              <ItemCard key={p.id} onDelete={() => del(p.id)}>
                <p className="text-[13px] font-semibold text-text">{p.project_name}</p>
                <p className="text-[12px] text-text2 mt-0.5">{[p.client, p.project_category, p.project_value && `₹${Number(p.project_value).toLocaleString()}`].filter(Boolean).join(' · ')}</p>
                {p.description && <p className="text-[11px] text-muted mt-1 line-clamp-2">{p.description}</p>}
              </ItemCard>
            ))}
          </div>
      }
    </div>
  )
}

/* ── Certifications ───────────────────────────────────────────────────── */
function CertificationsTab({ certifications, setCertifications, showToast }: any) {
  const empty = { certification_name:'', issuing_organization:'', certificate_number:'', issue_date:'', expiry_date:'' }
  const [form, setForm] = useState(empty)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  const add = async () => {
    if (!form.certification_name.trim()) return; setSaving(true)
    try {
      const p: any = { ...form }; if (!p.issue_date) delete p.issue_date; if (!p.expiry_date) delete p.expiry_date
      const r = await api.post('/company/certifications', p)
      setCertifications((c: any[]) => [...c, r.data]); setForm(empty); setAdding(false); showToast('Certification added.')
    } catch { showToast('Failed.') }
    finally { setSaving(false) }
  }

  const del = async (id: number) => {
    try { await api.delete(`/company/certifications/${id}`); setCertifications((c: any[])=>c.filter((x:any)=>x.id!==id)); showToast('Removed.') }
    catch { showToast('Failed.') }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <SecHead>Certifications ({certifications.length})</SecHead>
        <button onClick={()=>setAdding(!adding)} className={cn(tm.btn, tm.btnOutline, tm.btnSm)}><Plus size={12}/> Add</button>
      </div>
      {adding && (
        <FormBox>
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Name *"><input value={form.certification_name} onChange={e=>setForm(f=>({...f,certification_name:e.target.value}))} className={edInp} placeholder="ISO 9001, CMMI…"/></Fld>
            <Fld label="Issuing Organisation"><input value={form.issuing_organization} onChange={e=>setForm(f=>({...f,issuing_organization:e.target.value}))} className={edInp} /></Fld>
            <Fld label="Certificate Number"><input value={form.certificate_number} onChange={e=>setForm(f=>({...f,certificate_number:e.target.value}))} className={edInp} /></Fld>
            <div />
            <Fld label="Issue Date"><input type="date" value={form.issue_date} onChange={e=>setForm(f=>({...f,issue_date:e.target.value}))} className={edInp} /></Fld>
            <Fld label="Expiry Date"><input type="date" value={form.expiry_date} onChange={e=>setForm(f=>({...f,expiry_date:e.target.value}))} className={edInp} /></Fld>
          </div>
          <FormActions onCancel={()=>setAdding(false)} onSave={add} saving={saving} />
        </FormBox>
      )}
      {certifications.length === 0 && !adding
        ? <Empty icon={FileBadge} title="No certifications yet" desc="Add ISO 9001, ISO 27001, CMMI etc. to improve eligibility match scores" />
        : <div className="space-y-2">
            {certifications.map((c: any) => (
              <ItemCard key={c.id} onDelete={()=>del(c.id)}>
                <div className="flex items-center gap-2">
                  <FileBadge size={13} className="text-brand shrink-0" />
                  <p className="text-[13px] font-semibold text-text">{c.certification_name}</p>
                </div>
                <p className="text-[12px] text-text2 mt-0.5 ml-5">{[c.issuing_organization, c.certificate_number].filter(Boolean).join(' · ')}</p>
                {(c.issue_date||c.expiry_date) && (
                  <p className="text-[11px] text-muted mt-0.5 ml-5">
                    {c.issue_date && `Issued: ${c.issue_date}`}{c.expiry_date && ` · Expires: ${c.expiry_date}`}
                  </p>
                )}
              </ItemCard>
            ))}
          </div>
      }
    </div>
  )
}

/* ── Team ─────────────────────────────────────────────────────────────── */
function TeamTab({ team, setTeam, showToast }: any) {
  const empty = { name:'', designation:'', qualification:'', experience_years:'', skills:'' }
  const [form, setForm] = useState(empty)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  const add = async () => {
    if (!form.name.trim()) return; setSaving(true)
    try {
      const r = await api.post('/company/team', { ...form, experience_years: form.experience_years ? parseFloat(form.experience_years) : null })
      setTeam((t: any[]) => [...t, r.data]); setForm(empty); setAdding(false); showToast('Team member added.')
    } catch { showToast('Failed.') }
    finally { setSaving(false) }
  }

  const del = async (id: number) => {
    try { await api.delete(`/company/team/${id}`); setTeam((t: any[])=>t.filter((x:any)=>x.id!==id)); showToast('Removed.') }
    catch { showToast('Failed.') }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <SecHead>Team Members ({team.length})</SecHead>
        <button onClick={()=>setAdding(!adding)} className={cn(tm.btn, tm.btnOutline, tm.btnSm)}><Plus size={12}/> Add Member</button>
      </div>
      {adding && (
        <FormBox>
          <div className="grid grid-cols-2 gap-3">
            <Fld label="Name *"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className={edInp} /></Fld>
            <Fld label="Designation"><input value={form.designation} onChange={e=>setForm(f=>({...f,designation:e.target.value}))} className={edInp} placeholder="Project Manager" /></Fld>
            <Fld label="Qualification"><input value={form.qualification} onChange={e=>setForm(f=>({...f,qualification:e.target.value}))} className={edInp} placeholder="B.Tech, MBA…" /></Fld>
            <Fld label="Experience (years)"><input type="number" value={form.experience_years} onChange={e=>setForm(f=>({...f,experience_years:e.target.value}))} className={edInp} /></Fld>
          </div>
          <Fld label="Skills (comma-separated)"><input value={form.skills} onChange={e=>setForm(f=>({...f,skills:e.target.value}))} className={edInp} placeholder="Java, Python, AWS…"/></Fld>
          <FormActions onCancel={()=>setAdding(false)} onSave={add} saving={saving} />
        </FormBox>
      )}
      {team.length === 0 && !adding
        ? <Empty icon={Users} title="No team members yet" desc="Add key personnel to help AI match qualification requirements" />
        : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {team.map((m: any) => (
              <ItemCard key={m.id} onDelete={()=>del(m.id)}>
                <p className="text-[13px] font-semibold text-text">{m.name}</p>
                <p className="text-[12px] text-brand mt-0.5">{m.designation}</p>
                <p className="text-[11px] text-text2 mt-0.5">{[m.qualification, m.experience_years && `${m.experience_years}y exp`].filter(Boolean).join(' · ')}</p>
                {m.skills && <p className="text-[11px] text-muted mt-1 line-clamp-1">{m.skills}</p>}
              </ItemCard>
            ))}
          </div>
      }
    </div>
  )
}

/* ── Shared primitives ────────────────────────────────────────────────── */

/* Input classes using CSS vars — work in both light and dark */
const edInp = 'w-full bg-surface border border-border rounded-lg px-3 py-2 text-[13px] text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50 transition-all'
const roInp = 'w-full bg-subtle border border-border rounded-lg px-3 py-2 text-[13px] text-text2 cursor-default'

function SecHead({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">{children}</h3>
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-text2 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function FormBox({ children }: { children: React.ReactNode }) {
  return <div className="border border-brand/20 bg-brand-subtle/20 rounded-xl p-4 space-y-3">{children}</div>
}

function FormActions({ onCancel, onSave, saving }: { onCancel: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="flex gap-2 justify-end">
      <button onClick={onCancel} className={cn(tm.btn, tm.btnSec, tm.btnSm)}>Cancel</button>
      <button onClick={onSave} disabled={saving} className={cn(tm.btn, tm.btnBrand, tm.btnSm, saving && 'opacity-70')}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

function ItemCard({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  return (
    <div className="flex items-start justify-between p-4 bg-surface2 border border-border rounded-xl hover:border-brand/20 transition-colors">
      <div className="flex-1 min-w-0">{children}</div>
      <button onClick={onDelete} className={cn(tm.btn, tm.btnGhost, tm.btnIconSm, 'hover:text-bad hover:bg-bad-subtle shrink-0 ml-2')}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function Empty({ icon: Icon, title, desc }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-14 border-2 border-dashed border-border rounded-xl">
      <Icon size={26} className="text-muted mb-2 opacity-40" />
      <p className="text-[13px] font-medium text-text">{title}</p>
      <p className="text-[12px] text-muted mt-1 text-center max-w-xs">{desc}</p>
    </div>
  )
}
