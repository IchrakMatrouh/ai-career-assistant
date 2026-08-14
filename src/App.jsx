const profile = {
  name: 'Ichrak Matrouh',
  title: 'AI Engineer & Frontend Developer',
  email: 'ichrak.matrouh@example.com',
  location: 'Tunis, Tunisia',
  website: 'https://ichrak-portfolio.dev'
}

const accentOptions = ['Sky', 'Violet', 'Emerald', 'Amber', 'Rose']

function App() {
  return (
    <div className="page-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">IM</div>
          <div>
            <p className="eyebrow">Portfolio</p>
            <h1>Settings</h1>
          </div>
        </div>

        <nav className="side-nav" aria-label="Settings sections">
          <button className="nav-item active" type="button">
            <span>Profile</span>
            <span className="nav-dot" />
          </button>
          <button className="nav-item" type="button">
            <span>Appearance</span>
          </button>
          <button className="nav-item" type="button">
            <span>Projects</span>
          </button>
          <button className="nav-item" type="button">
            <span>Connect</span>
          </button>
          <button className="nav-item" type="button">
            <span>Privacy</span>
          </button>
        </nav>

        <div className="status-card">
          <p className="status-label">Profile status</p>
          <strong>91% complete</strong>
          <div className="progress-bar" aria-label="Profile completion progress">
            <span />
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2>Portfolio preferences</h2>
          </div>
          <button className="primary-btn" type="button">
            Save changes
          </button>
        </header>

        <section className="card hero-card">
          <div className="avatar-panel">
            <div className="avatar">IM</div>
            <div>
              <h3>{profile.name}</h3>
              <p>{profile.title}</p>
            </div>
          </div>
          <label className="upload-box" htmlFor="profile-photo">
            <input id="profile-photo" type="file" />
            <span>Upload new photo</span>
          </label>
        </section>

        <section className="card form-card">
          <div className="section-heading">
            <h3>Profile details</h3>
            <span>Public information</span>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Full name</span>
              <input type="text" defaultValue={profile.name} />
            </label>

            <label className="field">
              <span>Professional title</span>
              <input type="text" defaultValue={profile.title} />
            </label>

            <label className="field field-full">
              <span>Email address</span>
              <input type="email" defaultValue={profile.email} />
            </label>

            <label className="field">
              <span>Location</span>
              <input type="text" defaultValue={profile.location} />
            </label>

            <label className="field">
              <span>Website</span>
              <input type="url" defaultValue={profile.website} />
            </label>
          </div>
        </section>

        <section className="card form-card two-column-card">
          <div className="section-heading compact">
            <h3>Appearance</h3>
            <span>Theme & accent</span>
          </div>

          <div className="setting-block">
            <div className="toggle-row">
              <div>
                <strong>Dark mode</strong>
                <p>Use a darker palette for a premium look.</p>
              </div>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="slider" />
              </label>
            </div>

            <div className="toggle-row">
              <div>
                <strong>Animated background</strong>
                <p>Enable subtle motion effects on the hero section.</p>
              </div>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="slider" />
              </label>
            </div>
          </div>

          <div className="accent-panel">
            <p>Accent color</p>
            <div className="swatches" aria-label="Accent color options">
              {accentOptions.map((option, index) => (
                <button
                  key={option}
                  className={`swatch ${index === 0 ? 'selected' : ''}`}
                  type="button"
                  aria-label={`${option} accent color`}
                >
                  <span />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card form-card">
          <div className="section-heading">
            <h3>Social & contact</h3>
            <span>Portfolio connections</span>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>LinkedIn</span>
              <input type="text" defaultValue="linkedin.com/in/ichrak-matrouh" />
            </label>

            <label className="field">
              <span>GitHub</span>
              <input type="text" defaultValue="github.com/ichrak-matrouh" />
            </label>

            <label className="field field-full">
              <span>Contact message</span>
              <textarea rows="4" defaultValue="I’m currently available for AI product design and frontend engineering opportunities." />
            </label>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
