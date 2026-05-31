import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { WorkflowPage } from './pages/WorkflowPage'
import { WarehousePage } from './pages/WarehousePage'
import { StyleSkillPage } from './pages/StyleSkillPage'
import { ArticleDetail } from './components/warehouse/ArticleDetail'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { Sparkles, FileText, Wand2, PenLine } from 'lucide-react'

const navItems = [
  { key: '/workflow', label: '创作工作流', icon: PenLine },
  { key: '/warehouse', label: '文章仓库', icon: FileText },
  { key: '/style-skill', label: '风格Skill', icon: Wand2 },
]

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeKey = '/' + location.pathname.split('/')[1]

  return (
    <ConfigProvider locale={zhCN}>
      <div className="min-h-screen bg-[var(--bg-secondary)]">
        {/* Header */}
        <header className="sticky top-0 z-50 glass border-b border-[var(--border-light)]">
          <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center">
            {/* Logo */}
            <div className="flex items-center gap-3 mr-10 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-[var(--text-primary)] tracking-tight">
                AI深度创作引擎
              </span>
            </div>

            {/* Navigation */}
            <nav className="flex gap-1">
              {navItems.map((item) => {
                const isActive = activeKey === item.key
                const Icon = item.icon
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.key)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                      transition-all duration-200 cursor-pointer
                      ${isActive
                        ? 'bg-[var(--brand-50)] text-[var(--brand-600)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--slate-100)] hover:text-[var(--text-primary)]'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>

            {/* Right Side */}
            <div className="ml-auto flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-400)] to-[var(--brand-600)] flex items-center justify-center text-white text-sm font-medium shadow-sm">
                U
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="animate-fade-in">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Navigate to="/workflow" replace />} />
              <Route path="/workflow" element={<WorkflowPage />} />
              <Route path="/warehouse" element={<WarehousePage />} />
              <Route path="/warehouse/:id" element={<ArticleDetail />} />
              <Route path="/style-skill" element={<StyleSkillPage />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </ConfigProvider>
  )
}

export default App
