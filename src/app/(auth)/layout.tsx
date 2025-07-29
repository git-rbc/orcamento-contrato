import { Logo } from "@/components/ui/logo"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 dark:from-blue-800 dark:via-purple-800 dark:to-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 w-full">
          <div className="text-center space-y-8 max-w-md mx-auto">
            <div className="flex justify-center">
              <Logo width={240} height={80} variant="dark" />
            </div>
            <h1 className="text-4xl font-bold text-center">
              Gestão de Contratos
            </h1>
            <p className="text-xl text-blue-100 text-center leading-relaxed">
              Simplifique seu processo de criação e gestão de contratos com nossa plataforma moderna e intuitiva.
            </p>
            <div className="flex items-center justify-center space-x-8 text-sm text-blue-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Seguro</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Rápido</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Confiável</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Elementos decorativos */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
      </div>

      {/* Lado direito - Formulário */}
      <div className="flex-1 flex flex-col justify-center px-6 lg:px-12 xl:px-24">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>
        
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Logo width={200} height={60} className="mx-auto" />
          </div>
          
          {children}
        </div>
      </div>
    </div>
  )
} 