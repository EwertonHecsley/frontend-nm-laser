import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  apiRequest,
  APPOINTMENT_STATUSES,
  clearAccessToken,
  getAccessTokenClaims,
  isUuid,
  isoToLocalDateTime,
  localDateTimeToIso,
  queryString,
  setAccessToken,
  setUnauthorizedHandler,
  STATUS_LABELS,
} from './api.mjs'

const ROLES = {
  manager: 'gestora',
  sales: 'vendas',
  applicator: 'aplicadora',
}

function getRoute() {
  return window.location.pathname.replace(/\/+$/, '') || '/'
}

function useRoute() {
  const [route, setRoute] = useState(getRoute)
  useEffect(() => {
    const change = () => setRoute(getRoute())
    window.addEventListener('popstate', change)
    return () => window.removeEventListener('popstate', change)
  }, [])
  const navigate = useCallback((path, replace = false) => {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', path)
    setRoute(getRoute())
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  return [route, navigate]
}

function InternalLink({ to, navigate, children, className, ...props }) {
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        navigate(to)
      }}
      {...props}
    >
      {children}
    </a>
  )
}

function Alert({ children, kind = 'error' }) {
  if (!children) return null
  return <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>
}

function Loading({ label = 'Carregando…' }) {
  return <p className="state-message" role="status">{label}</p>
}

function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action}
    </div>
  )
}

function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status || 'unknown'}`}>
      <span aria-hidden="true">●</span> {STATUS_LABELS[status] || status || 'Status não informado'}
    </span>
  )
}

function formatDateOnly(value) {
  if (!value) return '—'
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return '—'
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR')
}

function FormActions({ busy, onCancel, submitLabel }) {
  return (
    <div className="form-actions">
      {onCancel && <button className="button button-secondary" type="button" onClick={onCancel} disabled={busy}>Cancelar</button>}
      <button className="button button-primary" type="submit" disabled={busy}>
        {busy ? 'Salvando…' : submitLabel}
      </button>
    </div>
  )
}

function LoginPage({ navigate, onAuthenticated, authMessage }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      if (!result?.accessToken || typeof result.accessToken !== 'string') {
        throw new Error('A resposta de autenticação não contém uma sessão válida.')
      }
      setAccessToken(result.accessToken)
      await onAuthenticated()
      navigate('/', true)
    } catch (caught) {
      clearAccessToken()
      setError(caught.message || 'Não foi possível iniciar a sessão.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <BrandMark />
        <p className="eyebrow">Acesso à equipe</p>
        <h1 id="login-title">Entre no CRM</h1>
        <p className="muted">Use seu e-mail e senha de acesso.</p>
        <Alert>{authMessage}</Alert>
        <Alert>{error}</Alert>
        <form onSubmit={submit} className="form-stack">
          <label>
            E-mail
            <input
              type="email"
              autoComplete="username"
              required
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          <button className="button button-primary button-full" type="submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="fine-print">A sessão fica somente na memória desta aba. Ao atualizar a página, será necessário entrar novamente.</p>
      </section>
    </main>
  )
}

function BrandMark() {
  return <div className="brand-mark" aria-label="NM Laser">NM<span>LASER</span></div>
}

function AppShell({ user, navigate, onLogout, children }) {
  const role = user?.role
  const navItems = [
    ['/', 'Início'],
    ['/appointments', 'Agenda'],
    ['/patients', 'Pacientes'],
    ['/cities', 'Cidades'],
  ]
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <header className="topbar">
        <InternalLink to="/" navigate={navigate} className="brand-link"><BrandMark /></InternalLink>
        <nav aria-label="Navegação principal" className="main-nav">
          {navItems.map(([path, label]) => (
            <InternalLink key={path} to={path} navigate={navigate} className={getRoute() === path ? 'nav-link active' : 'nav-link'}>
              {label}
            </InternalLink>
          ))}
        </nav>
        <div className="profile-area">
          <div className="profile-copy">
            <strong>{user?.name || user?.email || user?.sub || 'Conta'}</strong>
            <span>{role || 'Perfil não informado'}</span>
          </div>
          <button className="button button-quiet" type="button" onClick={onLogout}>Sair</button>
        </div>
      </header>
      <main className="main-content" id="main-content">{children}</main>
      <footer className="footer">NM Laser · CRM</footer>
    </div>
  )
}

function HomePage({ user, navigate }) {
  return (
    <>
      <PageHeading eyebrow="Bem-vinda ao espaço de trabalho" title={`Olá${user?.name ? `, ${user.name}` : ''}`} description="Acesse os módulos disponíveis para consultar e manter os registros do atendimento." />
      <section className="welcome-grid" aria-label="Módulos disponíveis">
        <InternalLink to="/appointments" navigate={navigate} className="module-card">
          <span className="module-icon" aria-hidden="true">01</span>
          <h2>Agenda</h2><p>Consulte agendamentos e aplique filtros de período e cidade.</p><span className="text-link">Abrir agenda →</span>
        </InternalLink>
        <InternalLink to="/patients" navigate={navigate} className="module-card">
          <span className="module-icon" aria-hidden="true">02</span>
          <h2>Pacientes</h2><p>Pesquise registros, atualize cadastros e consulte sessões.</p><span className="text-link">Abrir pacientes →</span>
        </InternalLink>
        <InternalLink to="/cities" navigate={navigate} className="module-card">
          <span className="module-icon" aria-hidden="true">03</span>
          <h2>Cidades</h2><p>Consulte as cidades disponíveis para os cadastros.</p><span className="text-link">Abrir cidades →</span>
        </InternalLink>
      </section>
      <p className="helper-note">O contrato atual não oferece endpoint de perfil. A interface usa apenas o identificador e o papel presentes no token; a API continua sendo a autoridade de acesso.</p>
    </>
  )
}

function CityForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSave({ name: name.trim() })
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="card form-card">
      <h2>{initial ? 'Editar cidade' : 'Nova cidade'}</h2>
      <Alert>{error}</Alert>
      <label>Nome da cidade<input required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <FormActions busy={busy} onCancel={onCancel} submitLabel={initial ? 'Salvar alterações' : 'Cadastrar cidade'} />
    </form>
  )
}

function CitiesPage({ user }) {
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')
  const canManage = user?.role === ROLES.manager

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await apiRequest('/cities')
      setCities(Array.isArray(result) ? result : [])
    } catch (caught) {
      setError(caught.message)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function save(values) {
    const path = editing ? `/cities/${encodeURIComponent(editing.id)}` : '/cities'
    await apiRequest(path, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(values) })
    setEditing(null)
    setShowForm(false)
    setNotice(editing ? 'Cidade atualizada pela API.' : 'Cidade cadastrada pela API.')
    await load()
  }
  async function remove(city) {
    if (!window.confirm(`Remover a cidade “${city.name}”?`)) return
    setNotice('')
    try {
      await apiRequest(`/cities/${encodeURIComponent(city.id)}`, { method: 'DELETE' })
      setNotice('Cidade removida pela API.')
      await load()
    } catch (caught) {
      setError(caught.message)
    }
  }

  return (
    <>
      <PageHeading eyebrow="Cadastros" title="Cidades" description="Cidades retornadas pela API e usadas nos registros." action={canManage && <button className="button button-primary" onClick={() => { setEditing(null); setShowForm(true) }}>Nova cidade</button>} />
      {notice && <Alert kind="success">{notice}</Alert>}
      {!canManage && <p className="helper-note">Ações de cadastro e remoção estão disponíveis apenas para o perfil gestora.</p>}
      {(showForm || editing) && <CityForm key={editing?.id || 'new'} initial={editing} onSave={save} onCancel={() => { setEditing(null); setShowForm(false) }} />}
      <section className="card">
        <div className="section-heading"><h2>Cidades cadastradas</h2><button className="button button-secondary" onClick={load} disabled={loading}>Atualizar</button></div>
        {loading ? <Loading /> : error ? <><Alert>{error}</Alert><button className="button button-secondary" onClick={load}>Tentar novamente</button></> : cities.length === 0 ? <p className="empty-state">Nenhuma cidade foi retornada pela API.</p> : (
          <div className="table-wrap"><table><thead><tr><th scope="col">Cidade</th><th scope="col">Identificador</th>{canManage && <th scope="col">Ações</th>}</tr></thead>
            <tbody>{cities.map((city) => <tr key={city.id}><td>{city.name || 'Nome não informado'}</td><td className="mono">{city.id}</td>{canManage && <td className="row-actions"><button className="button button-small button-secondary" onClick={async () => { try { const result = await apiRequest(`/cities/${encodeURIComponent(city.id)}`); setEditing(result); setShowForm(false) } catch (caught) { setError(caught.message) } }}>Editar</button><button className="button button-small button-danger" onClick={() => remove(city)}>Remover</button></td>}</tr>)}</tbody>
          </table></div>
        )}
      </section>
    </>
  )
}

function PatientForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    fullName: initial?.fullName || '',
    birthDate: initial?.birthDate ? String(initial.birthDate).slice(0, 10) : '',
    cpf: '',
    address: initial?.address || '',
    cityId: initial?.cityId || '',
    whatsapp: initial?.whatsapp || '',
  })
  const [cities, setCities] = useState([])
  const [citiesError, setCitiesError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const loadCities = useCallback(async () => {
    setCitiesError('')
    try {
      const result = await apiRequest('/cities')
      setCities(Array.isArray(result) ? result : [])
    } catch (caught) {
      setCitiesError(caught.message)
    }
  }, [])
  useEffect(() => { loadCities() }, [loadCities])
  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const payload = {
      fullName: form.fullName.trim(),
      birthDate: form.birthDate,
      address: form.address.trim(),
      cityId: form.cityId,
      ...(!initial ? { cpf: form.cpf.replace(/\D/g, '') } : {}),
      ...(form.whatsapp.trim() ? { whatsapp: form.whatsapp.replace(/\D/g, '') } : {}),
    }
    try {
      await onSave(payload)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="card form-card">
      <h2>{initial ? 'Editar paciente' : 'Novo cadastro'}</h2>
      <p className="muted">{initial ? 'O contrato não permite alterar o CPF. Edite somente os demais campos.' : 'Os campos seguem o contrato de pacientes. CPF é enviado somente na solicitação à API e não é exibido na lista.'}</p>
      <Alert>{error}</Alert>
      <Alert>{citiesError}</Alert>
      {citiesError && <button className="button button-secondary" type="button" onClick={loadCities}>Tentar carregar cidades novamente</button>}
      <div className="form-grid">
        <label>Nome completo<input autoComplete="name" required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
        <label>Data de nascimento<input type="date" required value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} /></label>
        {!initial && <label>CPF<input inputMode="numeric" autoComplete="off" required value={form.cpf} onChange={(event) => setForm({ ...form, cpf: event.target.value })} aria-describedby="cpf-help" /><span className="field-help" id="cpf-help">O valor é transmitido para validação do servidor; evite compartilhamento de tela.</span></label>}
        <label>WhatsApp <span className="optional">(opcional)</span><input type="tel" autoComplete="tel" value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} /></label>
        <label className="field-span">Endereço<input autoComplete="street-address" required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
        <label>Cidade<select required value={form.cityId} onChange={(event) => setForm({ ...form, cityId: event.target.value })}><option value="">Selecione uma cidade</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label>
      </div>
      <FormActions busy={busy} onCancel={onCancel} submitLabel={initial ? 'Salvar alterações' : 'Cadastrar paciente'} />
    </form>
  )
}

function PatientsPage({ user, navigate }) {
  const [data, setData] = useState([])
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [notice, setNotice] = useState('')
  const canManage = [ROLES.manager, ROLES.sales].includes(user?.role)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await apiRequest(`/patients${queryString({ page, limit: 20, search: query })}`)
      setData(Array.isArray(result?.data) ? result.data : [])
      setMeta(result?.meta || { page, limit: 20, total: 0, totalPages: 0 })
    } catch (caught) {
      setError(caught.message)
    } finally {
      setLoading(false)
    }
  }, [page, query])
  useEffect(() => { load() }, [load])

  async function save(values) {
    await apiRequest('/patients', { method: 'POST', body: JSON.stringify(values) })
    setShowForm(false)
    setPage(1)
    setQuery('')
    setSearch('')
    setNotice('Paciente cadastrado pela API.')
  }
  function searchSubmit(event) {
    event.preventDefault()
    setPage(1)
    setQuery(search.trim())
  }

  return (
    <>
      <PageHeading eyebrow="Cadastros" title="Pacientes" description="Pesquise por nome. Os registros e a paginação são fornecidos pela API." action={canManage && <button className="button button-primary" onClick={() => setShowForm((value) => !value)}>{showForm ? 'Fechar cadastro' : 'Novo paciente'}</button>} />
      {notice && <Alert kind="success">{notice}</Alert>}
      {!canManage && <p className="helper-note">Este perfil pode consultar pacientes, mas não cadastrar ou editar.</p>}
      {showForm && <PatientForm onSave={save} onCancel={() => setShowForm(false)} />}
      <section className="card">
        <form className="search-form" onSubmit={searchSubmit}>
          <label htmlFor="patient-search">Buscar por nome</label>
          <div className="search-row"><input id="patient-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome" /><button className="button button-primary" type="submit">Buscar</button></div>
        </form>
        {loading ? <Loading /> : error ? <><Alert>{error}</Alert><button className="button button-secondary" onClick={load}>Tentar novamente</button></> : data.length === 0 ? <p className="empty-state">Nenhum paciente encontrado para esta busca.</p> : (
          <>
            <div className="table-wrap"><table><thead><tr><th scope="col">Nome</th><th scope="col">Nascimento</th><th scope="col">Cidade</th><th scope="col">Ação</th></tr></thead>
                <tbody>{data.map((patient) => <tr key={patient.id}><td>{patient.fullName}</td><td>{formatDateOnly(patient.birthDate)}</td><td className="mono">{patient.cityId || '—'}</td><td><InternalLink to={`/patients/${encodeURIComponent(patient.id)}`} navigate={navigate} className="text-link">Ver cadastro</InternalLink></td></tr>)}</tbody>
            </table></div>
            <div className="pagination"><span>Página {meta.page || page} de {meta.totalPages || 1} · {meta.total ?? data.length} registros</span><div><button className="button button-secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Anterior</button><button className="button button-secondary" disabled={loading || !meta.totalPages || page >= meta.totalPages} onClick={() => setPage((value) => value + 1)}>Próxima</button></div></div>
          </>
        )}
      </section>
    </>
  )
}

function PatientDetail({ patientId, user, navigate }) {
  const [patient, setPatient] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessionError, setSessionError] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [notice, setNotice] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const canEdit = [ROLES.manager, ROLES.sales].includes(user?.role)
  const canDelete = user?.role === ROLES.manager
  const canRecord = [ROLES.manager, ROLES.applicator].includes(user?.role)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setSessionError('')
    try {
      const result = await apiRequest(`/patients/${encodeURIComponent(patientId)}`)
      setPatient(result)
    } catch (caught) {
      setError(caught.message)
      setLoading(false)
      return
    }
    try {
      const history = await apiRequest(`/sessions${queryString({ patientId })}`)
      setSessions(Array.isArray(history) ? history : [])
    } catch (caught) {
      setSessionError(caught.message)
    }
    setLoading(false)
  }, [patientId])
  useEffect(() => { load() }, [load])

  async function savePatient(values) {
    await apiRequest(`/patients/${encodeURIComponent(patientId)}`, { method: 'PATCH', body: JSON.stringify(values) })
    setShowEdit(false)
    setNotice('Cadastro atualizado pela API.')
    await load()
  }
  async function removePatient() {
    if (!window.confirm('Remover este cadastro de paciente? Esta ação será enviada à API.')) return
    setDeleteBusy(true)
    try {
      await apiRequest(`/patients/${encodeURIComponent(patientId)}`, { method: 'DELETE' })
      navigate('/patients')
    } catch (caught) {
      setError(caught.message)
      setDeleteBusy(false)
    }
  }
  async function recordSession(values) {
    await apiRequest('/sessions', { method: 'POST', body: JSON.stringify({ patientId, ...values }) })
    setShowSessionForm(false)
    setNotice('Sessão registrada pela API.')
    setSessionError('')
    try {
      const result = await apiRequest(`/sessions${queryString({ patientId })}`)
      setSessions(Array.isArray(result) ? result : [])
    } catch (caught) {
      setSessionError(caught.message)
    }
  }

  if (loading) return <Loading label="Carregando cadastro e histórico…" />
  if (error) return <><PageHeading eyebrow="Pacientes" title="Cadastro do paciente" /><Alert>{error}</Alert><button className="button button-secondary" onClick={load}>Tentar novamente</button></>
  if (!patient) return <Alert>O registro solicitado não foi encontrado ou não está mais disponível.</Alert>
  return (
    <>
      <button className="back-link" onClick={() => navigate('/patients')}>← Voltar para pacientes</button>
      <PageHeading eyebrow="Cadastro de paciente" title={patient.fullName || 'Paciente'} description={`Identificador: ${patient.id}`} action={<div className="heading-actions">{canEdit && <button className="button button-secondary" onClick={() => setShowEdit((value) => !value)}>{showEdit ? 'Fechar edição' : 'Editar'}</button>}{canDelete && <button className="button button-danger" disabled={deleteBusy} onClick={removePatient}>{deleteBusy ? 'Removendo…' : 'Remover'}</button>}</div>} />
      {notice && <Alert kind="success">{notice}</Alert>}
      {showEdit && <PatientForm key={patient.id} initial={patient} onSave={savePatient} onCancel={() => setShowEdit(false)} />}
      <section className="card">
        <h2>Dados do cadastro</h2>
        <dl className="details-grid">
          <div><dt>Data de nascimento</dt><dd>{formatDateOnly(patient.birthDate)}</dd></div>
          <div><dt>Cidade</dt><dd className="mono">{patient.cityId || '—'}</dd></div>
          <div><dt>Endereço</dt><dd>{patient.address || '—'}</dd></div>
          <div><dt>WhatsApp</dt><dd>{patient.whatsapp || '—'}</dd></div>
        </dl>
        <p className="helper-note">CPF não é exibido nesta tela.</p>
      </section>
      <section className="card">
        <div className="section-heading"><div><p className="eyebrow">Atendimento</p><h2>Histórico de sessões</h2></div>{canRecord && <button className="button button-primary" onClick={() => setShowSessionForm((value) => !value)}>{showSessionForm ? 'Fechar registro' : 'Registrar sessão'}</button>}</div>
        {!canRecord && <p className="helper-note">Registro de sessão disponível para gestora e aplicadora.</p>}
        {showSessionForm && <SessionForm patientId={patientId} onSave={recordSession} onCancel={() => setShowSessionForm(false)} />}
        {sessionError ? <><Alert>{sessionError}</Alert><button className="button button-secondary" onClick={async () => { setSessionError(''); try { const result = await apiRequest(`/sessions${queryString({ patientId })}`); setSessions(Array.isArray(result) ? result : []) } catch (caught) { setSessionError(caught.message) } }}>Tentar novamente</button></> : sessions.length === 0 ? <p className="empty-state">Nenhuma sessão foi retornada pela API.</p> : (
          <div className="session-list">{sessions.map((session) => <article className="session-item" key={session.id}><div><h3>Sessão {session.sessionNumber || '—'}</h3><p>{session.performedAt ? new Date(session.performedAt).toLocaleString('pt-BR') : 'Data não informada'}</p></div><div className="session-copy">{session.technique && <p><strong>Técnica:</strong> {session.technique}</p>}{session.potency && <p><strong>Potência:</strong> {session.potency}</p>}{session.frequency && <p><strong>Frequência:</strong> {session.frequency}</p>}{session.energyAccumulated && <p><strong>Energia acumulada:</strong> {session.energyAccumulated}</p>}{session.observations && <p><strong>Observações:</strong> {session.observations}</p>}</div></article>)}</div>
        )}
      </section>
    </>
  )
}

function SessionForm({ patientId, onSave, onCancel }) {
  const [form, setForm] = useState({ sessionNumber: '', performedAt: '', appointmentId: '', potency: '', frequency: '', technique: '', energyAccumulated: '', observations: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault()
    setError('')
    const performedAt = localDateTimeToIso(form.performedAt)
    if (!performedAt) {
      setError('Informe uma data e hora válidas.')
      return
    }
    if (form.appointmentId.trim() && !isUuid(form.appointmentId.trim())) {
      setError('O identificador do agendamento deve ser um UUID.')
      return
    }
    setBusy(true)
    const payload = {
      sessionNumber: form.sessionNumber,
      performedAt,
      ...(form.appointmentId.trim() ? { appointmentId: form.appointmentId.trim() } : {}),
      ...Object.fromEntries(['potency', 'frequency', 'technique', 'energyAccumulated', 'observations'].filter((key) => form[key].trim()).map((key) => [key, form[key].trim()])),
    }
    try {
      await onSave(payload)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="inset-form">
      <h3>Nova sessão realizada</h3>
      <p className="helper-note">A assinatura foi omitida: a captura e o tratamento dessa informação dependem de uma definição operacional.</p>
      <Alert>{error}</Alert>
      <div className="form-grid">
        <label>Número da sessão<input required value={form.sessionNumber} onChange={(event) => setForm({ ...form, sessionNumber: event.target.value })} /></label>
        <label>Data e hora da realização<input type="datetime-local" required value={form.performedAt} onChange={(event) => setForm({ ...form, performedAt: event.target.value })} /></label>
        <label className="field-span">Agendamento relacionado <span className="optional">(opcional)</span><input value={form.appointmentId} onChange={(event) => setForm({ ...form, appointmentId: event.target.value })} aria-describedby="session-appointment-help" /><span className="field-help" id="session-appointment-help">Informe o identificador somente se tiver uma fonte confiável.</span></label>
        <label>Potência<input value={form.potency} onChange={(event) => setForm({ ...form, potency: event.target.value })} /></label>
        <label>Frequência<input value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })} /></label>
        <label>Técnica<input value={form.technique} onChange={(event) => setForm({ ...form, technique: event.target.value })} /></label>
        <label>Energia acumulada<input value={form.energyAccumulated} onChange={(event) => setForm({ ...form, energyAccumulated: event.target.value })} /></label>
        <label className="field-span">Observações<textarea rows="3" value={form.observations} onChange={(event) => setForm({ ...form, observations: event.target.value })} /></label>
      </div>
      <FormActions busy={busy} onCancel={onCancel} submitLabel="Registrar sessão" />
    </form>
  )
}

function AppointmentForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    patientId: initial?.patientId || '',
    cityId: initial?.cityId || '',
    scheduledAt: isoToLocalDateTime(initial?.scheduledAt),
    professionalId: initial?.professionalId || '',
    status: initial?.status || '',
  })
  const [cities, setCities] = useState([])
  const [citiesError, setCitiesError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const loadCities = useCallback(async () => {
    setCitiesError('')
    try {
      const result = await apiRequest('/cities')
      setCities(Array.isArray(result) ? result : [])
    } catch (caught) {
      setCitiesError(caught.message)
    }
  }, [])
  useEffect(() => { loadCities() }, [loadCities])
  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!isUuid(form.patientId) || !isUuid(form.cityId) || (form.professionalId && !isUuid(form.professionalId))) {
      setError('Confira os identificadores UUID. O profissional é opcional e não há lista de profissionais disponível.')
      return
    }
    const scheduledAt = localDateTimeToIso(form.scheduledAt)
    if (!scheduledAt) {
      setError('Informe uma data e hora válidas.')
      return
    }
    setBusy(true)
    const payload = {
      patientId: form.patientId.trim(),
      cityId: form.cityId,
      scheduledAt,
      ...(form.professionalId.trim() ? { professionalId: form.professionalId.trim() } : {}),
      ...(form.status ? { status: form.status } : {}),
    }
    try {
      await onSave(payload)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="card form-card">
      <h2>{initial ? 'Editar agendamento' : 'Novo agendamento'}</h2>
      <p className="muted">A API não oferece lista de pacientes/profissionais neste fluxo. Use identificadores obtidos de uma fonte autorizada.</p>
      <Alert>{citiesError}</Alert>{citiesError && <button className="button button-secondary" type="button" onClick={loadCities}>Tentar carregar cidades novamente</button>}<Alert>{error}</Alert>
      <div className="form-grid">
        <label>Identificador do paciente (UUID)<input required value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })} /></label>
        <label>Cidade<select required value={form.cityId} onChange={(event) => setForm({ ...form, cityId: event.target.value })}><option value="">Selecione uma cidade</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label>
        <label>Data e hora<input type="datetime-local" required value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} /></label>
        <label>Identificador do profissional <span className="optional">(opcional)</span><input value={form.professionalId} onChange={(event) => setForm({ ...form, professionalId: event.target.value })} aria-describedby="professional-help" /><span className="field-help" id="professional-help">UUID somente se obtido de uma fonte confiável. Não há listagem de profissionais.</span></label>
        <label>{initial ? 'Status' : 'Status inicial'} <span className="optional">(opcional)</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="">Não especificar</option>{APPOINTMENT_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
      </div>
      <FormActions busy={busy} onCancel={onCancel} submitLabel={initial ? 'Salvar alterações' : 'Criar agendamento'} />
    </form>
  )
}

function AppointmentsPage({ user }) {
  const [appointments, setAppointments] = useState([])
  const [filters, setFilters] = useState({ from: '', to: '', cityId: '', professionalId: '' })
  const [appliedFilters, setAppliedFilters] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingSelected, setEditingSelected] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [notice, setNotice] = useState('')
  const canEdit = [ROLES.manager, ROLES.sales, ROLES.applicator].includes(user?.role)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = {
      from: appliedFilters.from ? localDateTimeToIso(appliedFilters.from) : '',
      to: appliedFilters.to ? localDateTimeToIso(appliedFilters.to) : '',
      cityId: appliedFilters.cityId,
      professionalId: appliedFilters.professionalId,
    }
    try {
      const result = await apiRequest(`/appointments${queryString(params)}`)
      setAppointments(Array.isArray(result) ? result : [])
    } catch (caught) {
      setError(caught.message)
    } finally {
      setLoading(false)
    }
  }, [appliedFilters])
  useEffect(() => { load() }, [load])

  async function create(payload) {
    await apiRequest('/appointments', { method: 'POST', body: JSON.stringify(payload) })
    setShowForm(false)
    setNotice('Agendamento criado pela API.')
    await load()
  }
  async function updateAppointment(payload) {
    const result = await apiRequest(`/appointments/${encodeURIComponent(selectedId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    if (result && typeof result === 'object') setSelected(result)
    setEditingSelected(false)
    setNotice('Agendamento atualizado pela API.')
    await load()
  }
  async function openDetail(id) {
    setSelectedId(id)
    setSelected(null)
    setEditingSelected(false)
    setDetailLoading(true)
    setDetailError('')
    try {
      const result = await apiRequest(`/appointments/${encodeURIComponent(id)}`)
      setSelected(result)
    } catch (caught) {
      setDetailError(caught.message)
    } finally {
      setDetailLoading(false)
    }
  }
  return (
    <>
      <PageHeading eyebrow="Atendimentos" title="Agenda" description="Agendamentos retornados pela API. A lista não inclui nomes expandidos de paciente ou profissional." action={canEdit && <button className="button button-primary" onClick={() => setShowForm((value) => !value)}>{showForm ? 'Fechar formulário' : 'Novo agendamento'}</button>} />
      {notice && <Alert kind="success">{notice}</Alert>}
      {showForm && <AppointmentForm onSave={create} onCancel={() => setShowForm(false)} />}
      <section className="card">
        <form className="filter-grid" onSubmit={(event) => { event.preventDefault(); setAppliedFilters(filters) }}>
          <label>De<input type="datetime-local" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
          <label>Até<input type="datetime-local" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
          <label>Cidade (UUID)<input value={filters.cityId} onChange={(event) => setFilters({ ...filters, cityId: event.target.value })} /></label>
          <label>Profissional (UUID)<input value={filters.professionalId} onChange={(event) => setFilters({ ...filters, professionalId: event.target.value })} /></label>
          <div className="filter-actions"><button className="button button-primary" type="submit">Aplicar filtros</button><button className="button button-secondary" type="button" onClick={() => { const empty = { from: '', to: '', cityId: '', professionalId: '' }; setFilters(empty); setAppliedFilters(empty) }}>Limpar</button></div>
        </form>
        {loading ? <Loading /> : error ? <><Alert>{error}</Alert><button className="button button-secondary" onClick={load}>Tentar novamente</button></> : appointments.length === 0 ? <p className="empty-state">Nenhum agendamento foi retornado para estes filtros.</p> : (
          <div className="table-wrap"><table><thead><tr><th scope="col">Data e hora</th><th scope="col">Paciente (ID)</th><th scope="col">Cidade (ID)</th><th scope="col">Profissional (ID)</th><th scope="col">Status</th><th scope="col">Detalhes</th></tr></thead>
            <tbody>{appointments.map((appointment) => <tr key={appointment.id}><td>{appointment.scheduledAt ? new Date(appointment.scheduledAt).toLocaleString('pt-BR') : '—'}</td><td className="mono">{appointment.patientId || '—'}</td><td className="mono">{appointment.cityId || '—'}</td><td className="mono">{appointment.professionalId || '—'}</td><td><StatusBadge status={appointment.status} /></td><td><button className="text-button" onClick={() => openDetail(appointment.id)}>Consultar</button></td></tr>)}</tbody>
          </table></div>
        )}
      </section>
      {selectedId && <section className="card detail-card">
        <div className="section-heading"><h2>Detalhes do agendamento</h2><div className="heading-actions">{canEdit && selected && !editingSelected && <button className="button button-secondary" onClick={() => setEditingSelected(true)}>Editar</button>}<button className="button button-quiet" onClick={() => { setSelectedId(null); setSelected(null); setEditingSelected(false) }}>Fechar</button></div></div>
        {detailLoading ? <Loading /> : detailError ? <><Alert>{detailError}</Alert><button className="button button-secondary" onClick={() => openDetail(selectedId)}>Tentar novamente</button></> : selected && <>
          <dl className="details-grid">
            <div><dt>Identificador</dt><dd className="mono">{selected.id}</dd></div>
            <div><dt>Agendado para</dt><dd>{selected.scheduledAt ? new Date(selected.scheduledAt).toLocaleString('pt-BR') : '—'}</dd></div>
            <div><dt>Paciente (ID)</dt><dd className="mono">{selected.patientId || '—'}</dd></div>
            <div><dt>Cidade (ID)</dt><dd className="mono">{selected.cityId || '—'}</dd></div>
            <div><dt>Profissional (ID)</dt><dd className="mono">{selected.professionalId || '—'}</dd></div>
            <div><dt>Status</dt><dd><StatusBadge status={selected.status} /></dd></div>
          </dl>
          {editingSelected && <AppointmentForm initial={selected} onSave={updateAppointment} onCancel={() => setEditingSelected(false)} />}
        </>}
      </section>}
    </>
  )
}

export default function App() {
  const [route, navigate] = useRoute()
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(false)
  const [authError, setAuthError] = useState('')

  const logout = useCallback(() => {
    clearAccessToken()
    setUser(null)
    setAuthError('')
    navigate('/login', true)
  }, [navigate])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setAuthError('Sua sessão expirou. Entre novamente.')
      navigate('/login', true)
    })
    return () => setUnauthorizedHandler(() => {})
  }, [navigate])

  async function loadCurrentUser() {
    setChecking(true)
    try {
      const claims = getAccessTokenClaims()
      if (!claims?.sub || !claims?.role) {
        throw new Error('A API não retornou claims de identidade válidos no token.')
      }
      setUser({ sub: claims.sub, role: claims.role })
      setAuthError('')
    } catch (caught) {
      clearAccessToken()
      setUser(null)
      throw caught
    } finally {
      setChecking(false)
    }
  }

  const detailMatch = useMemo(() => route.match(/^\/patients\/([^/]+)$/), [route])
  if (route === '/login' || !user) {
    if (checking) return <main className="login-shell"><Loading label="Verificando sessão…" /></main>
    return <LoginPage key={authError} authMessage={authError} navigate={navigate} onAuthenticated={loadCurrentUser} />
  }
  if (detailMatch) {
    let patientId = detailMatch[1]
    try { patientId = decodeURIComponent(patientId) } catch { /* keep URL value; API will validate it */ }
    return <AppShell user={user} navigate={navigate} onLogout={logout}><PatientDetail patientId={patientId} user={user} navigate={navigate} /></AppShell>
  }
  let page
  if (route === '/') page = <HomePage user={user} navigate={navigate} />
  else if (route === '/cities') page = <CitiesPage user={user} />
  else if (route === '/patients') page = <PatientsPage user={user} navigate={navigate} />
  else if (route === '/appointments') page = <AppointmentsPage user={user} />
  else page = <><PageHeading title="Página não encontrada" description="O endereço informado não corresponde a uma tela disponível." /><button className="button button-primary" onClick={() => navigate('/')}>Ir para início</button></>
  return <AppShell user={user} navigate={navigate} onLogout={logout}>{authError && <Alert>{authError}</Alert>}{page}</AppShell>
}
